import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notificarTodos, notificarUsuario } from "@/lib/notificaciones";

const TIPO_LABELS: Record<string, string> = {
  REPORTE_INTERVENCION: "reporte de intervención",
  ORDEN_TRABAJO: "orden de trabajo",
  CIERRE_TURNO: "cierre de turno",
  DESCARGA_REPUESTOS: "descarga de repuestos",
  MEJORA_MODIFICACION: "mejora/modificación",
  GENERICO: "documento",
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
  const esModoTablero = searchParams.get("tablero") === "true"; // bypasses archivado/carpeta filters
  const userId = session.user.id as string;
  const sectorId = searchParams.get("sectorId");
  const subsectorId = searchParams.get("subsectorId");
  const lineaId = searchParams.get("lineaId");

  // Accent + case insensitive search via PostgreSQL unaccent — also searches machine name
  let searchIds: string[] | null = null;
  if (search?.trim()) {
    try {
      const raw = await prisma.$queryRaw<{ id: string }[]>`
        SELECT d.id FROM documentos d
        LEFT JOIN maquinas m ON d."maquinaId" = m.id
        LEFT JOIN lineas l ON m."lineaId" = l.id
        WHERE unaccent(LOWER(d.titulo)) LIKE unaccent(LOWER(${`%${search.trim()}%`}))
           OR unaccent(LOWER(m.nombre)) LIKE unaccent(LOWER(${`%${search.trim()}%`}))
           OR unaccent(LOWER(l.nombre)) LIKE unaccent(LOWER(${`%${search.trim()}%`}))
      `;
      searchIds = raw.map((r) => r.id);
    } catch {
      // Fallback if unaccent not available
      searchIds = null;
    }
  }

  const [documentos, totalUsuariosActivos] = await Promise.all([
    prisma.documento.findMany({
      where: {
        ...(tipo ? { tipo } : {}),
        ...(maquinaId ? { maquinaId } : {}),
        ...(searchIds !== null ? { id: { in: searchIds } } : search ? { titulo: { contains: search, mode: "insensitive" } } : {}),
        // Per-user visibility: merge archivado + carpeta into a single AND to avoid key conflicts
        AND: esModoTablero
          // Tablero mode: show all OTs regardless of archivado/carpeta
          // Only hide OTs in final states (completada, etc.) — handled client-side via estado filter
          ? []
          : soloArchivados
          // Archivados view: must have archivado=true for this user
          ? [{ documentoUsuarios: { some: { userId, archivado: true } } }]
          : carpetaId
            // Specific folder: must be in that folder AND not archived
            ? [
                { documentoUsuarios: { some: { userId, carpetaId } } },
                { NOT: { documentoUsuarios: { some: { userId, archivado: true } } } },
              ]
            // General / type filter: not archived AND not in any folder
            : [
                { NOT: { documentoUsuarios: { some: { userId, OR: [{ archivado: true }, { carpetaId: { not: null } }] } } } },
              ],
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
        ordenTrabajo: { select: { estado: true, prioridad: true, fechaVencimiento: true, descripcion: true, tecnicosIds: true, tecnico: { select: { id: true, name: true } } } },
        reporteIntervencion: { select: { fechaInicio: true, tipoFalla: true } },
        cierreTurno: { select: { turno: true, fecha: true } },
        descargaRepuestos: { select: { fecha: true, items: true } },
        lecturas: { select: { userId: true, user: { select: { name: true } } } },
        mejoraModificacion: { select: { fechaInicio: true } },
        documentoUsuarios: {
          where: { userId },
          select: { archivado: true, carpetaId: true, carpeta: { select: { id: true, nombre: true } } },
        },
        documentoGenerico: { select: { contenido: true } },
      },
    }),
    prisma.user.count({ where: { activo: true } }),
  ]);

  // Resolve tecnicosIds for OT items (for tablero)
  const otWithTecnicos = documentos.filter(d => d.ordenTrabajo?.tecnicosIds);
  const allTecIds = new Set<string>();
  otWithTecnicos.forEach(d => {
    try { JSON.parse((d.ordenTrabajo?.tecnicosIds as string) || "[]").forEach((id: string) => allTecIds.add(id)); } catch { /* */ }
  });
  const tecUsers = allTecIds.size > 0
    ? await prisma.user.findMany({ where: { id: { in: [...allTecIds] } }, select: { id: true, name: true, color: true } })
    : [];
  const tecMap = Object.fromEntries(tecUsers.map(t => [t.id, t]));

  // Flatten per-user state into each document
  const docs = documentos.map((d) => {
    const userState = d.documentoUsuarios?.[0];
    const ot = d.ordenTrabajo;
    const tecnicosResueltos = (() => {
      try { return (JSON.parse((ot?.tecnicosIds as string) || "[]") as string[]).map((id: string) => tecMap[id]).filter(Boolean); }
      catch { return []; }
    })();
    return {
      ...d,
      archivado: userState?.archivado ?? false,
      carpetaId: userState?.carpetaId ?? null,
      carpeta: userState?.carpeta ?? null,
      documentoUsuarios: undefined,
      ordenTrabajo: ot ? { ...ot, tecnicosResueltos } : d.ordenTrabajo,
    };
  });

  return NextResponse.json({ docs, totalUsuariosActivos });
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
        tecnicosIds: JSON.stringify(datos.tecnicosIds ?? []),
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
  } else if (tipo === "GENERICO" && datos) {
    await prisma.documentoGenerico.create({
      data: {
        documentoId: documento.id,
        contenido: datos.contenido || "",
        tecnicosIds: JSON.stringify((datos.tecnicosIds ?? []).filter((id: string) => id !== session.user.id)),
      },
    });
  } else if (tipo === "MEJORA_MODIFICACION" && datos) {
    await prisma.mejoraModificacion.create({
      data: {
        documentoId: documento.id,
        fechaInicio: new Date(datos.fechaInicio),
        fechaFin: datos.fechaFin ? new Date(datos.fechaFin) : null,
        descripcion: datos.descripcion,
        trabajoRealizado: datos.trabajoRealizado,
        observaciones: datos.observaciones || null,
        tecnicosIds: JSON.stringify((datos.tecnicosIds ?? []).filter((id: string) => id !== session.user.id)),
      },
    });
    if (datos.repuestos?.length) {
      await crearDescargaLinkada(datos, documento.id, maquinaId, session.user.id as string, titulo, "reporte");
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
