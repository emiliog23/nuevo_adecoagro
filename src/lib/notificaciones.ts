import { prisma } from "@/lib/prisma";

export async function notificarTodos(
  mensaje: string,
  tipo: string,
  documentoId: string,
  exceptoUserId?: string
) {
  const users = await prisma.user.findMany({
    where: { activo: true, ...(exceptoUserId ? { NOT: { id: exceptoUserId } } : {}) },
    select: { id: true },
  });

  if (users.length === 0) return;

  await prisma.notificacion.createMany({
    data: users.map((u) => ({ userId: u.id, tipo, mensaje, documentoId })),
  });
}

export async function notificarUsuario(
  userId: string,
  mensaje: string,
  tipo: string,
  documentoId?: string
) {
  await prisma.notificacion.create({
    data: { userId, tipo, mensaje, documentoId: documentoId ?? null },
  });
}
