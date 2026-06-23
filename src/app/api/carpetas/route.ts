import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const carpetas = await prisma.carpeta.findMany({
    orderBy: { nombre: "asc" },
    include: {
      children: { orderBy: { nombre: "asc" } },
      _count: { select: { documentos: true } },
    },
    where: { parentId: null },
  });

  return NextResponse.json(carpetas);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { nombre, parentId } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const carpeta = await prisma.carpeta.create({
    data: { nombre: nombre.trim(), parentId: parentId || null },
  });

  return NextResponse.json(carpeta, { status: 201 });
}
