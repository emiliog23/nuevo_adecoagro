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
        include: { tecnico: { select: { id: true, name: true } } },
      },
      ordenTrabajo: {
        include: { tecnico: { select: { id: true, name: true } } },
      },
      cierreTurno: {
        include: { operador: { select: { id: true, name: true } } },
      },
      descargaRepuestos: { include: { documentoOrigen: { select: { id: true, titulo: true } } } },
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
