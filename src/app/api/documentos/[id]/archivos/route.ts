import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";

const ALLOWED_MIME = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",       // .xlsx
  "application/msword",                                                        // .doc
  "application/vnd.ms-excel",                                                  // .xls
  "application/pdf",
  "text/plain",
];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id: documentoId } = await params;
  const archivos = await prisma.archivoDocumento.findMany({
    where: { documentoId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(archivos);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id: documentoId } = await params;

  const doc = await prisma.documento.findUnique({ where: { id: documentoId }, select: { id: true } });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];
  if (!files.length) return NextResponse.json({ error: "Sin archivos" }, { status: 400 });

  const created = [];
  for (const file of files) {
    if (!ALLOWED_MIME.includes(file.type) && !file.name.match(/\.(docx?|xlsx?|pdf|txt)$/i)) continue;
    if (file.size > 25 * 1024 * 1024) continue; // 25 MB

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: `adecoagro/${documentoId}/archivos`, resource_type: "raw", use_filename: true },
        (error, result) => { if (error || !result) reject(error); else resolve(result as any); }
      ).end(buffer);
    });

    const archivo = await prisma.archivoDocumento.create({
      data: { documentoId, nombre: file.name, url: result.secure_url, mimeType: file.type, size: file.size },
    });
    created.push(archivo);
  }
  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id: documentoId } = await params;
  const { searchParams } = new URL(_req.url);
  const aid = searchParams.get("aid");
  if (!aid) return NextResponse.json({ error: "Falta aid" }, { status: 400 });

  const archivo = await prisma.archivoDocumento.findUnique({ where: { id: aid } });
  if (!archivo || archivo.documentoId !== documentoId) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  try {
    const publicId = archivo.url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/)?.[1] ?? "";
    if (publicId) await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
  } catch { /* */ }

  await prisma.archivoDocumento.delete({ where: { id: aid } });
  return NextResponse.json({ ok: true });
}
