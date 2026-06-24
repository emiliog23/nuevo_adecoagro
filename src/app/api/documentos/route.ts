import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notificarTodos, notificarUsuario } from "@/lib/notificaciones";

const TIPO_LABELS: Record<string, string> = {
  REPORTE_INTERVENCION: "reporte de intervención",
  ORDEN_TRABAJO: "orden de trabajo",
  CIERRE_TURNO: "cierre de turno",
  DESCARGA_REPUESTOS: "descarga de repuestos",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  const maquinaId = searchParams.get("maquinaId");
  const search = searchParams.get("search");
  const carpetaId = searchParams.get("carpetaId");
  const soloArchivados = searchParams.get("archivado") === "true";
  const sectorId = searchParams.get("sectorId");
  const subsectorId = searchParams.get("subsectorId");
  const lineaId = searchParams.get("lineaId");

  const [documentos, totalUsuariosActivos] = await Promise.all([
    prisma.documento.findMany({
      where: {
        ...(tipo ? { tipo } : {}),
        ...(maquinaId ? { maquinaId } : {}),
        ...(search ? { titulo: { contains: search } } : {}),
        ...(carpetaId === "sin-carpeta" ? { carpetaId: null } : carpetaId ? { carpetaId } : {}),
        archivado: soloArchivados ? true : false,
        // Plant hierarchy filters (mutually exclusive, only one active at a time)
        ...(lineaId
          ? { maquina: { lineaId } }
          : subsectorId
          ? { maquina: { linea: { subsectorId } } }
          : sectorId
          ? { maquina: { linea: { subsector: { sectorId } } } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        creadoPor: { select: { id: true, name: true, color: true } },
        maquina: {
          include: {
            linea: { include: { subsector: { include: { sector: { select: { id: true, nombre: true } } } } } },
          },
        },
        ordenTrabajo: { select: { estado: true, prioridad: true, fechaVencimiento: true, descripcion: true, tecnico: { select: { name: true } } } },
        reporteIntervencion: { select: { fechaInicio: true, tipoFalla: true } },
        cierreTurno: { select: { turno: true, fecha: true } },
        descargaRepuestos: { select: { fecha: true, items: true } },
        lecturas: { select: { userId: true, user: { select: { name: true } } } },
        carpeta: { select: { id: true, nombre: true } },
      },
    }),
    prisma.user.count({ where: { activo: true } }),
  ]);

  return NextResponse.json({ docs: documentos, totalUsuariosActivos });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { titulo, tipo, maquinaId, datos } = body;

  const documento = await prisma.documento.create({
    data: {
      titulo,
      tipo,
      maquinaId: maquinaId || null,
      creadoPorId: session.user.id as string,
    },
  });

  if (tipo === "REPORTE_INTERVENCION" && datos) {
    await prisma.reporteIntervencion.create({
      data: {
        documentoId: documento.id,
        fechaInicio: new Date(datos.fechaInicio),
        fechaFin: datos.fechaFin ? new Date(datos.fechaFin) : null,
        tipoFalla: datos.tipoFalla,
        descripcionFalla: datos.descripcionFalla,
        trabajoRealizado: datos.trabajoRealizado,
        observaciones: datos.observaciones || null,
        tecnicoId: session.user.id as string,
        // tecnicosIds includes ALL participants; exclude creator (already in tecnicoId) for storage
        tecnicosIds: JSON.stringify((datos.tecnicosIds ?? []).filter((id: string) => id !== session.user.id)),
      },
    });
    // Auto-create linked descarga if repuestos provided
    if (datos.repuestos?.length) {
      await crearDescargaLinkada(datos, documento.id, maquinaId, session.user.id as string, titulo, "reporte");
    }
  } else if (tipo === "ORDEN_TRABAJO" && datos) {
    await prisma.ordenTrabajo.create({
      data: {
        documentoId: documento.id,
        descripcion: datos.descripcion,
        prioridad: datos.prioridad ?? "MEDIA",
        estado: datos.estado ?? "PENDIENTE",
        fechaVencimiento: datos.fechaVencimiento ? new Date(datos.fechaVencimiento) : null,
        tecnicoId: datos.tecnicoId || null,
        observaciones: datos.observaciones || null,
      },
    });
  } else if (tipo === "CIERRE_TURNO" && datos) {
    await prisma.cierreTurno.create({
      data: {
        documentoId: documento.id,
        fecha: new Date(datos.fecha),
        turno: datos.turno,
        novedades: datos.novedades,
        trabajosRealizados: datos.trabajosRealizados || null,
        pendientes: datos.pendientes || null,
        operadorId: session.user.id as string,
      },
    });
    if (datos.repuestos?.length) {
      await crearDescargaLinkada(datos, documento.id, maquinaId, session.user.id as string, titulo, "cierre");
    }
  } else if (tipo === "DESCARGA_REPUESTOS" && datos) {
    await prisma.descargaRepuestos.create({
      data: {
        documentoId: documento.id,
        fecha: new Date(datos.fecha),
        items: JSON.stringify(datos.items ?? []),
        observaciones: datos.observaciones || null,
      },
    });
  }

  // Notificar a todos los usuarios del nuevo documento
  const tipoLabel = TIPO_LABELS[tipo] ?? tipo;
  await notificarTodos(
    `${session.user.name} creó un nuevo ${tipoLabel}: "${titulo}"`,
    "DOCUMENTO_NUEVO",
    documento.id,
    session.user.id as string
  );

  // Si es OT con técnico asignado → notificación personal
  if (tipo === "ORDEN_TRABAJO" && datos?.tecnicoId && datos.tecnicoId !== session.user.id) {
    await notificarUsuario(
      datos.tecnicoId,
      `Te asignaron una nueva orden de trabajo: "${titulo}"`,
      "OT_ASIGNADA",
      documento.id
    );
  }

  return NextResponse.json(documento, { status: 201 });
}

async function crearDescargaLinkada(
  datos: any, documentoOrigenId: string, maquinaId: string | null,
  creadoPorId: string, tituloOrigen: string, tipo: "reporte" | "cierre"
) {
  const titulo = `Descarga repuestos — ${tipo === "reporte" ? "Reporte" : "Cierre"}: ${tituloOrigen}`;
  const docDescarga = await prisma.documento.create({
    data: { titulo, tipo: "DESCARGA_REPUESTOS", maquinaId: maquinaId || null, creadoPorId },
  });
  await prisma.descargaRepuestos.create({
    data: {
      documentoId: docDescarga.id,
      documentoOrigenId,
      fecha: new Date(datos.fecha ?? datos.fechaInicio ?? new Date()),
      items: JSON.stringify(datos.repuestos),
      observaciones: `Generado automáticamente desde ${tipo === "reporte" ? "reporte" : "cierre de turno"}.`,
    },
  });
}
