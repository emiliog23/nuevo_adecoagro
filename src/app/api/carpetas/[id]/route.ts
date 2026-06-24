import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { nombre } = await req.json();

  const carpeta = await prisma.carpeta.update({
    where: { id },
    data: { nombre: nombre.trim() },
  });

  return NextResponse.json(carpeta);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // Unlink per-user document associations from this folder
  await prisma.documentoUsuario.updateMany({ where: { carpetaId: id }, data: { carpetaId: null } });
  await prisma.carpeta.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
