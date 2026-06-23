import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: documentoId } = await params;
  const userId = session.user.id as string;

  await prisma.lecturaDocumento.upsert({
    where: { documentoId_userId: { documentoId, userId } },
    update: {},
    create: { documentoId, userId },
  });

  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: documentoId } = await params;

  const [lecturas, totalUsuarios] = await Promise.all([
    prisma.lecturaDocumento.findMany({
      where: { documentoId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.count({ where: { activo: true } }),
  ]);

  return NextResponse.json({
    lecturas: lecturas.map((l) => ({ userId: l.userId, name: l.user.name, createdAt: l.createdAt })),
    totalUsuarios,
    todos: lecturas.length >= totalUsuarios,
  });
}
