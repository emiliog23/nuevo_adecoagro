-- DocumentoGenerico
CREATE TABLE "documentos_genericos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentoId" TEXT NOT NULL,
    "contenido" TEXT NOT NULL DEFAULT '',
    "tecnicosIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documentos_genericos_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "documentos_genericos_documentoId_key" ON "documentos_genericos"("documentoId");

-- ArchivoDocumento
CREATE TABLE "archivos_documentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT '',
    "size" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "archivos_documentos_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "archivos_documentos_documentoId_idx" ON "archivos_documentos"("documentoId");

-- HistorialDocumento
CREATE TABLE "historial_documentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentoId" TEXT NOT NULL,
    "editadoPorId" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "historial_documentos_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "historial_documentos_editadoPorId_fkey" FOREIGN KEY ("editadoPorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "historial_documentos_documentoId_idx" ON "historial_documentos"("documentoId");
