import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

const SELECT = { id: true, name: true, email: true, role: true, color: true, activo: true, createdAt: true } as const;

export async function GET() {
  const session = await auth();
  if (!session || !["ADMIN","SUPERVISOR"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const usuarios = await prisma.user.findMany({ select: SELECT, orderBy: { name: "asc" } });
  return NextResponse.json(usuarios);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["ADMIN","SUPERVISOR"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const hashedPassword = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      password: hashedPassword,
      role: body.role ?? "TECNICO",
      color: body.color ?? "AZUL",
    },
    select: SELECT,
  });

  return NextResponse.json(user, { status: 201 });
}
