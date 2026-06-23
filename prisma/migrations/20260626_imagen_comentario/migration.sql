ALTER TABLE "imagenes_documentos" ADD COLUMN "comentarioId" TEXT REFERENCES "comentarios"("id") ON DELETE CASCADE;
CREATE INDEX "imagenes_documentos_comentarioId_idx" ON "imagenes_documentos"("comentarioId");
