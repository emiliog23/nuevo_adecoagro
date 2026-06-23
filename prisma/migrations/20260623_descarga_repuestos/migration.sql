-- Drop old spare parts tables
DROP TABLE IF EXISTS "repuestos_usados";
DROP TABLE IF EXISTS "repuestos";

-- Create new DescargaRepuestos table
CREATE TABLE "descargas_repuestos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentoId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "items" TEXT NOT NULL,
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "descargas_repuestos_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "descargas_repuestos_documentoId_key" ON "descargas_repuestos"("documentoId");
