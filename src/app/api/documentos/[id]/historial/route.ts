import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id: documentoId } = await params;
  const historial = await prisma.historialDocumento.findMany({
    where: { documentoId },
    orderBy: { createdAt: "desc" },
    include: { editadoPor: { select: { id: true, name: true, color: true } } },
  });
  return NextResponse.json(historial);
}
