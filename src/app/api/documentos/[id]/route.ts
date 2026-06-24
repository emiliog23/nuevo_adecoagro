import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notificarTodos } from "@/lib/notificaciones";

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente", EN_CURSO: "En Curso", COMPLETADA: "Completada", CANCELADA: "Cancelada",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.documento.findUnique({
    where: { id },
    include: {
      creadoPor: { select: { id: true, name: true, email: true, color: true } },
      maquina: {
        include: {
          linea: { include: { subsector: { include: { sector: true } } } },
        },
      },
      reporteIntervencion: {
        include: { tecnico: { select: { id: true, name: true, color: true } } },
      },
      ordenTrabajo: {
        include: { tecnico: { select: { id: true, name: true } } },
      },
      cierreTurno: {
        include: { operador: { select: { id: true, name: true } } },
      },
      descargaRepuestos: { include: { documentoOrigen: { select: { id: true, titulo: true } } } },
      mejoraModificacion: true,
      documentoGenerico: true,
      descargasOriginadas: { include: { documento: { select: { id: true, titulo: true } } } },
      carpeta: { select: { id: true, nombre: true } },
    },
  });

  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // If editing content (not just estado change), verify ownership and save history
  if (body.edicion) {
    const current = await prisma.documento.findUnique({
      where: { id },
      include: {
        reporteIntervencion: true, mejoraModificacion: true,
        documentoGenerico: true, cierreTurno: true,
      },
    });
    if (!current) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    if (current.creadoPorId !== (session.user.id as string)) {
      return NextResponse.json({ error: "Solo el creador puede editar" }, { status: 403 });
    }
    // Save snapshot before change — only relevant sub-document
    const subDoc =
      current.reporteIntervencion ??
      current.mejoraModificacion ??
      current.documentoGenerico ??
      current.cierreTurno ?? null;

    await prisma.historialDocumento.create({
      data: {
        documentoId: id,
        editadoPorId: session.user.id as string,
        resumen: body.resumen ?? "Editó el documento",
        snapshot: JSON.stringify({
          titulo: current.titulo,
          maquinaId: current.maquinaId,
          ...( subDoc ? { datos: subDoc } : {} ),
        }),
      },
    });
    // Increment version
    await prisma.documento.update({ where: { id }, data: { version: { increment: 1 } } });
  }

  const doc = await prisma.documento.update({
    where: { id },
    data: {
      titulo: body.titulo,
      maquinaId: body.maquinaId || null,
    },
  });

  if (body.tipo === "ORDEN_TRABAJO" && body.datos) {
    const prevOT = await prisma.ordenTrabajo.findUnique({ where: { documentoId: id }, select: { estado: true } });

    await prisma.ordenTrabajo.update({
      where: { documentoId: id },
      data: {
        descripcion: body.datos.descripcion,
        prioridad: body.datos.prioridad,
        estado: body.datos.estado,
        fechaVencimiento: body.datos.fechaVencimiento ? new Date(body.datos.fechaVencimiento) : null,
        tecnicoId: body.datos.tecnicoId || null,
        observaciones: body.datos.observaciones || null,
      },
    });

    // Notify on estado change
    if (prevOT && body.datos.estado && prevOT.estado !== body.datos.estado) {
      const docTitle = doc.titulo;
      await notificarTodos(
        `${session.user.name} cambió el estado de "${docTitle}" a ${ESTADO_LABELS[body.datos.estado] ?? body.datos.estado}`,
        "ESTADO_ACTUALIZADO",
        id,
        session.user.id as string
      );
    }
  }

  // Update specific sub-document content for edit mode
  if (body.tipo === "ORDEN_TRABAJO" && body.datos && body.edicion) {
    await prisma.ordenTrabajo.update({
      where: { documentoId: id },
      data: {
        descripcion: body.datos.descripcion,
        prioridad: body.datos.prioridad,
        observaciones: body.datos.observaciones || null,
        fechaVencimiento: body.datos.fechaVencimiento ? new Date(body.datos.fechaVencimiento) : null,
      },
    });
  } else if (body.tipo === "REPORTE_INTERVENCION" && body.datos && body.edicion) {
    await prisma.reporteIntervencion.update({
      where: { documentoId: id },
      data: {
        fechaInicio: body.datos.fechaInicio ? new Date(body.datos.fechaInicio) : undefined,
        fechaFin: body.datos.fechaFin ? new Date(body.datos.fechaFin) : null,
        tipoFalla: body.datos.tipoFalla,
        descripcionFalla: body.datos.descripcionFalla,
        trabajoRealizado: body.datos.trabajoRealizado,
        observaciones: body.datos.observaciones || null,
        tecnicosIds: body.datos.tecnicosIds ? JSON.stringify(body.datos.tecnicosIds) : undefined,
      },
    });
  } else if (body.tipo === "MEJORA_MODIFICACION" && body.datos && body.edicion) {
    await prisma.mejoraModificacion.update({
      where: { documentoId: id },
      data: {
        fechaInicio: body.datos.fechaInicio ? new Date(body.datos.fechaInicio) : undefined,
        fechaFin: body.datos.fechaFin ? new Date(body.datos.fechaFin) : null,
        descripcion: body.datos.descripcion,
        trabajoRealizado: body.datos.trabajoRealizado,
        observaciones: body.datos.observaciones || null,
        tecnicosIds: body.datos.tecnicosIds ? JSON.stringify(body.datos.tecnicosIds) : undefined,
      },
    });
  } else if (body.tipo === "GENERICO" && body.datos && body.edicion) {
    await prisma.documentoGenerico.update({
      where: { documentoId: id },
      data: { contenido: body.datos.contenido, tecnicosIds: JSON.stringify(body.datos.tecnicosIds ?? []) },
    });
  } else if (body.tipo === "CIERRE_TURNO" && body.datos && body.edicion) {
    await prisma.cierreTurno.update({
      where: { documentoId: id },
      data: {
        novedades: body.datos.novedades,
        trabajosRealizados: body.datos.trabajosRealizados || null,
        pendientes: body.datos.pendientes || null,
      },
    });
  }

  return NextResponse.json(doc);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.importante !== undefined) data.importante = body.importante;
  if (body.archivado !== undefined) data.archivado = body.archivado;
  if (body.maquinaId !== undefined) data.maquinaId = body.maquinaId || null;
  if (body.carpetaId !== undefined) data.carpetaId = body.carpetaId || null;

  const doc = await prisma.documento.update({ where: { id }, data });
  return NextResponse.json(doc);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["ADMIN", "SUPERVISOR"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.documento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
