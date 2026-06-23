import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notificarUsuario, notificarTodos } from "@/lib/notificaciones";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: documentoId } = await params;

  const comentarios = await prisma.comentario.findMany({
    where: { documentoId },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, color: true } },
      imagenes: { select: { id: true, url: true, nombre: true }, orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json(comentarios);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: documentoId } = await params;
  const { contenido } = await req.json();

  if (!contenido?.trim()) return NextResponse.json({ error: "Comentario vacío" }, { status: 400 });

  const comentario = await prisma.comentario.create({
    data: { documentoId, userId: session.user.id as string, contenido: contenido.trim() },
    include: { user: { select: { id: true, name: true, color: true } } },
  });

  // Notify: creator of doc + previous commenters (except self)
  const doc = await prisma.documento.findUnique({
    where: { id: documentoId },
    select: { titulo: true, creadoPorId: true },
  });
  if (doc) {
    const prevCommenters = await prisma.comentario.findMany({
      where: { documentoId, NOT: { userId: session.user.id as string } },
      select: { userId: true },
      distinct: ["userId"],
    });

    const toNotify = new Set<string>();
    if (doc.creadoPorId !== (session.user.id as string)) toNotify.add(doc.creadoPorId);
    prevCommenters.forEach((c) => toNotify.add(c.userId));

    const msg = `${session.user.name} comentó en "${doc.titulo}"`;
    for (const uid of toNotify) {
      await notificarUsuario(uid, msg, "COMENTARIO_NUEVO", documentoId);
    }
  }

  return NextResponse.json(comentario, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: documentoId } = await params;
  const { searchParams } = new URL(req.url);
  const comentarioId = searchParams.get("cid");
  if (!comentarioId) return NextResponse.json({ error: "Falta cid" }, { status: 400 });

  const comentario = await prisma.comentario.findUnique({ where: { id: comentarioId } });
  if (!comentario || comentario.documentoId !== documentoId)
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const isOwner = comentario.userId === (session.user.id as string);
  const isAdmin = ["ADMIN", "SUPERVISOR"].includes(session.user.role as string);
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  await prisma.comentario.delete({ where: { id: comentarioId } });
  return NextResponse.json({ ok: true });
}
