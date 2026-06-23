import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lineaId = searchParams.get("lineaId");

  const maquinas = await prisma.maquina.findMany({
    where: lineaId ? { lineaId } : undefined,
    orderBy: { nombre: "asc" },
    include: {
      linea: { include: { subsector: { include: { sector: { select: { id: true, nombre: true } } } } } },
    },
  });

  return NextResponse.json(maquinas);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["ADMIN", "SUPERVISOR"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.lineaId) return NextResponse.json({ error: "lineaId requerido" }, { status: 400 });

  const maquina = await prisma.maquina.create({
    data: {
      nombre: body.nombre,
      descripcion: body.descripcion || null,
      codigo: body.codigo || null,

      lineaId: body.lineaId,
    },
  });

  return NextResponse.json(maquina, { status: 201 });
}
