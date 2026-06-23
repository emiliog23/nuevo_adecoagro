import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const maquina = await prisma.maquina.findUnique({
    where: { id },
    include: {
      linea: { include: { subsector: { include: { sector: true } } } },
      documentos: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          creadoPor: { select: { name: true } },
          ordenTrabajo: { select: { estado: true, prioridad: true } },
          reporteIntervencion: { select: { fechaInicio: true, tipoFalla: true } },
        },
      },
    },
  });

  if (!maquina) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(maquina);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["ADMIN", "SUPERVISOR"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const maquina = await prisma.maquina.update({
    where: { id },
    data: {
      nombre: body.nombre,
      descripcion: body.descripcion || null,
      codigo: body.codigo || null,
    },
  });
  return NextResponse.json(maquina);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["ADMIN","SUPERVISOR"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.maquina.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
