import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const fabricas = await prisma.fabrica.findMany({
    orderBy: { nombre: "asc" },
    include: {
      sectores: {
        orderBy: { nombre: "asc" },
        include: {
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
        },
      },
    },
  });

  return NextResponse.json(fabricas);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["ADMIN", "SUPERVISOR"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const fabrica = await prisma.fabrica.create({
    data: { nombre: body.nombre.trim(), descripcion: body.descripcion || null },
  });
  return NextResponse.json(fabrica, { status: 201 });
}
