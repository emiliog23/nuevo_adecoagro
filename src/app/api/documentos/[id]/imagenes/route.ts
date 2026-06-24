import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // _req is used for searchParams below
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: documentoId } = await params;
  const { searchParams } = new URL(_req.url);
  const comentarioId = searchParams.get("cid");

  const imagenes = await prisma.imagenDocumento.findMany({
    where: {
      documentoId,
      ...(comentarioId ? { comentarioId } : { comentarioId: null }),
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(imagenes);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: documentoId } = await params;

  // Verify document exists
  const doc = await prisma.documento.findUnique({ where: { id: documentoId }, select: { id: true } });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];
  const comentarioId = formData.get("comentarioId") as string | null;

  if (!files.length) return NextResponse.json({ error: "Sin archivos" }, { status: 400 });

  const uploadDir = path.join(process.cwd(), "public", "uploads", documentoId);
  await mkdir(uploadDir, { recursive: true });

  const created = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    if (file.size > 10 * 1024 * 1024) continue; // 10 MB limit

    const rawExt = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const ext = ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(rawExt) ? rawExt : "jpg";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = path.join(uploadDir, safeName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const imagen = await prisma.imagenDocumento.create({
      data: {
        documentoId,
        comentarioId: comentarioId || null,
        nombre: file.name,
        url: `/uploads/${documentoId}/${safeName}`,
        size: file.size,
      },
    });
    created.push(imagen);
  }

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["ADMIN", "SUPERVISOR", "TECNICO"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id: documentoId } = await params;
  const { searchParams } = new URL(req.url);
  const imagenId = searchParams.get("iid");
  if (!imagenId) return NextResponse.json({ error: "Falta iid" }, { status: 400 });

  const imagen = await prisma.imagenDocumento.findUnique({ where: { id: imagenId } });
  if (!imagen || imagen.documentoId !== documentoId)
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // Delete file from disk
  try {
    const { unlink } = await import("fs/promises");
    await unlink(path.join(process.cwd(), "public", imagen.url));
  } catch { /* file may not exist */ }

  await prisma.imagenDocumento.delete({ where: { id: imagenId } });
  return NextResponse.json({ ok: true });
}
