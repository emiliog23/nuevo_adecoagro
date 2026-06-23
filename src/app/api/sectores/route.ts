import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const includeLineas = searchParams.get("includeLineas") === "true";

  const sectores = await prisma.sector.findMany({
    orderBy: { nombre: "asc" },
    include: includeLineas
      ? {
          subsectores: {
            orderBy: { nombre: "asc" },
            include: {
              lineas: {
                orderBy: { nombre: "asc" },
                include: {
                  maquinas: {
                    orderBy: { nombre: "asc" },
                    select: { id: true, nombre: true, codigo: true },
                  },
                },
              },
            },
          },
        }
      : undefined,
  });

  return NextResponse.json(sectores);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["ADMIN", "SUPERVISOR"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.fabricaId) return NextResponse.json({ error: "fabricaId requerido" }, { status: 400 });
  const sector = await prisma.sector.create({
    data: { nombre: body.nombre, descripcion: body.descripcion || null, fabricaId: body.fabricaId },
  });

  return NextResponse.json(sector, { status: 201 });
}
