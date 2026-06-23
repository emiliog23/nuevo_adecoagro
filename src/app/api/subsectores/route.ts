import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sectorId = searchParams.get("sectorId");

  const subsectores = await prisma.subsector.findMany({
    where: sectorId ? { sectorId } : undefined,
    orderBy: { nombre: "asc" },
    include: { sector: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json(subsectores);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["ADMIN", "SUPERVISOR"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const subsector = await prisma.subsector.create({
    data: { nombre: body.nombre, descripcion: body.descripcion, sectorId: body.sectorId },
  });

  return NextResponse.json(subsector, { status: 201 });
}
