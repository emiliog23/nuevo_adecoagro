import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const subsectorId = searchParams.get("subsectorId");

  const lineas = await prisma.linea.findMany({
    where: subsectorId ? { subsectorId } : undefined,
    orderBy: { nombre: "asc" },
    include: {
      subsector: { include: { sector: { select: { id: true, nombre: true } } } },
    },
  });

  return NextResponse.json(lineas);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["ADMIN", "SUPERVISOR"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.subsectorId) return NextResponse.json({ error: "subsectorId requerido" }, { status: 400 });

  const linea = await prisma.linea.create({
    data: {
      nombre: body.nombre,
      descripcion: body.descripcion || null,
      subsectorId: body.subsectorId,
    },
  });

  return NextResponse.json(linea, { status: 201 });
}
