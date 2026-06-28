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
        include: { tecnico: { select: { id: true, name: true, color: true } } },
      },
      cierreTurno: {
        include: { operador: { select: { id: true, name: true } } },
      },
      descargaRepuestos: { include: { documentoOrigen: { select: { id: true, titulo: true } } } },
      mejoraModificacion: true,
      documentoGenerico: true,
      descargasOriginadas: { include: { documento: { select: { id: true, titulo: true } } } },
      documentoUsuarios: {
        where: { userId: session.user.id as string },
        select: { archivado: true, carpetaId: true, carpeta: { select: { id: true, nombre: true } } },
      },
    },
  });

  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Resolve tecnicosIds to user objects server-side (avoids role-restricted client fetch)
  async function resolveTecnicos(idsJson: string | null) {
    if (!idsJson) return [];
    try {
      const ids: string[] = JSON.parse(idsJson);
      if (!ids.length) return [];
      return prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, color: true } });
    } catch { return []; }
  }

  const [tecnicosReporte, tecnicosMejora, tecnicosOT] = await Promise.all([
    doc.reporteIntervencion ? resolveTecnicos(doc.reporteIntervencion.tecnicosIds) : [],
    doc.mejoraModificacion  ? resolveTecnicos(doc.mejoraModificacion.tecnicosIds)  : [],
    doc.ordenTrabajo        ? resolveTecnicos(doc.ordenTrabajo.tecnicosIds)        : [],
  ]);

  return NextResponse.json({
    ...doc,
    reporteIntervencion: doc.reporteIntervencion
      ? { ...doc.reporteIntervencion, tecnicosResueltos: tecnicosReporte }
      : null,
    mejoraModificacion: doc.mejoraModificacion
      ? { ...doc.mejoraModificacion, tecnicosResueltos: tecnicosMejora }
      : null,
    ordenTrabajo: doc.ordenTrabajo
      ? { ...doc.ordenTrabajo, tecnicosResueltos: tecnicosOT }
      : null,
  });
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
        ...(body.datos.tecnicosIds !== undefined && { tecnicosIds: JSON.stringify(body.datos.tecnicosIds) }),
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
  if (body.tipo === "REPORTE_INTERVENCION" && body.datos && body.edicion) {
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
        ...(body.datos.fecha  && { fecha:  new Date(body.datos.fecha) }),
        ...(body.datos.turno  && { turno:  body.datos.turno }),
      },
    });
  } else if (body.tipo === "DESCARGA_REPUESTOS" && body.datos && body.edicion) {
    await prisma.descargaRepuestos.update({
      where: { documentoId: id },
      data: {
        ...(body.datos.fecha  && { fecha:  new Date(body.datos.fecha) }),
        ...(body.datos.items  !== undefined && { items: JSON.stringify(body.datos.items) }),
        observaciones: body.datos.observaciones || null,
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
  const userId = session.user.id as string;

  // importante and maquinaId are global
  if (body.importante !== undefined || body.maquinaId !== undefined) {
    const globalData: Record<string, unknown> = {};
    if (body.importante !== undefined) globalData.importante = body.importante;
    if (body.maquinaId !== undefined) globalData.maquinaId = body.maquinaId || null;
    await prisma.documento.update({ where: { id }, data: globalData });
  }

  // archivado and carpetaId are per-user via DocumentoUsuario
  if (body.archivado !== undefined || body.carpetaId !== undefined) {
    const upsertData: Record<string, unknown> = {};
    if (body.archivado !== undefined) upsertData.archivado = body.archivado;
    if (body.carpetaId !== undefined) upsertData.carpetaId = body.carpetaId || null;

    await prisma.documentoUsuario.upsert({
      where: { documentoId_userId: { documentoId: id, userId } },
      update: upsertData,
      create: { documentoId: id, userId, ...upsertData },
    });
  }

  const doc = await prisma.documento.findUnique({ where: { id } });
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
