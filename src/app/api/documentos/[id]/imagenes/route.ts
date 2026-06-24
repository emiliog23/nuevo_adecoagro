import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cloudinary, getCloudinaryPublicId } from "@/lib/cloudinary";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(_req.url);
  const comentarioId = searchParams.get("cid");
  const { id: documentoId } = await params;

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

  const doc = await prisma.documento.findUnique({ where: { id: documentoId }, select: { id: true } });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];
  const comentarioId = formData.get("comentarioId") as string | null;

  if (!files.length) return NextResponse.json({ error: "Sin archivos" }, { status: 400 });

  const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

  const created = [];

  for (const file of files) {
    if (!ALLOWED.includes(file.type)) continue;
    if (file.size > MAX_SIZE) continue;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `adecoagro/${documentoId}`,
          resource_type: "image",
        },
        (error, result) => {
          if (error || !result) reject(error);
          else resolve(result as { secure_url: string; public_id: string });
        }
      ).end(buffer);
    });

    const imagen = await prisma.imagenDocumento.create({
      data: {
        documentoId,
        comentarioId: comentarioId || null,
        nombre: file.name,
        url: result.secure_url,
        size: file.size,
      },
    });
    created.push(imagen);
  }

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["ADMIN", "SUPERVISOR", "TECNICO"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id: documentoId } = await params;
  const { searchParams } = new URL(_req.url);
  const imagenId = searchParams.get("iid");
  if (!imagenId) return NextResponse.json({ error: "Falta iid" }, { status: 400 });

  const imagen = await prisma.imagenDocumento.findUnique({ where: { id: imagenId } });
  if (!imagen || imagen.documentoId !== documentoId)
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // Delete from Cloudinary
  const publicId = getCloudinaryPublicId(imagen.url);
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch { /* ignore if already deleted */ }
  }

  await prisma.imagenDocumento.delete({ where: { id: imagenId } });
  return NextResponse.json({ ok: true });
}
