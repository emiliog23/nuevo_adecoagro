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

  if (!body.name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  if (!body.email?.trim()) return NextResponse.json({ error: "Usuario requerido" }, { status: 400 });
  if (!body.password || body.password.length < 6) return NextResponse.json({ error: "Contraseña mínimo 6 caracteres" }, { status: 400 });
  const validRoles = ["ADMIN", "SUPERVISOR", "TECNICO", "VIEWER"];
  if (body.role && !validRoles.includes(body.role)) return NextResponse.json({ error: "Rol inválido" }, { status: 400 });

  const hashedPassword = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.create({
    data: {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      password: hashedPassword,
      role: body.role ?? "TECNICO",
      color: body.color ?? "AZUL",
    },
    select: SELECT,
  });

  return NextResponse.json(user, { status: 201 });
}
