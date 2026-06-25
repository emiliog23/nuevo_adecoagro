import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { ids, action, carpetaId } = await req.json();
  if (!Array.isArray(ids) || !ids.length) return NextResponse.json({ error: "Sin ids" }, { status: 400 });

  const userId = session.user.id as string;

  if (action === "archive" || action === "unarchive") {
    const archivado = action === "archive";
    await Promise.all(ids.map((documentoId: string) =>
      prisma.documentoUsuario.upsert({
        where: { documentoId_userId: { documentoId, userId } },
        update: { archivado },
        create: { documentoId, userId, archivado },
      })
    ));
  } else if (action === "move") {
    await Promise.all(ids.map((documentoId: string) =>
      prisma.documentoUsuario.upsert({
        where: { documentoId_userId: { documentoId, userId } },
        update: { carpetaId: carpetaId || null },
        create: { documentoId, userId, carpetaId: carpetaId || null },
      })
    ));
  } else {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, count: ids.length });
}
