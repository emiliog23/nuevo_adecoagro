-- Add documentoOrigenId to descargas_repuestos
ALTER TABLE "descargas_repuestos" ADD COLUMN "documentoOrigenId" TEXT REFERENCES "documentos"("id") ON DELETE SET NULL;

-- Create carpetas table
CREATE TABLE "carpetas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "carpetas_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "carpetas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add carpetaId to documentos
ALTER TABLE "documentos" ADD COLUMN "carpetaId" TEXT REFERENCES "carpetas"("id") ON DELETE SET NULL;

CREATE INDEX "carpetas_parentId_idx" ON "carpetas"("parentId");
CREATE INDEX "documentos_carpetaId_idx" ON "documentos"("carpetaId");
