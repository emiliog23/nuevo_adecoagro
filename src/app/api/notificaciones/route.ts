import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const notificaciones = await prisma.notificacion.findMany({
    where: { userId: session.user.id as string },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { documento: { select: { id: true, titulo: true, tipo: true } } },
  });

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  return NextResponse.json({ notificaciones, noLeidas });
}

export async function PATCH(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await prisma.notificacion.updateMany({
    where: { userId: session.user.id as string, leida: false },
    data: { leida: true },
  });

  return NextResponse.json({ ok: true });
}
