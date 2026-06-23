import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const sector = await prisma.sector.findUnique({
    where: { id },
    include: {
      subsectores: {
        orderBy: { nombre: "asc" },
        include: {
          lineas: {
            orderBy: { nombre: "asc" },
            include: { maquinas: { orderBy: { nombre: "asc" } } },
          },
        },
      },
    },
  });

  if (!sector) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(sector);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["ADMIN", "SUPERVISOR"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const sector = await prisma.sector.update({
    where: { id },
    data: { nombre: body.nombre, descripcion: body.descripcion },
  });

  return NextResponse.json(sector);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["ADMIN","SUPERVISOR"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.sector.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
