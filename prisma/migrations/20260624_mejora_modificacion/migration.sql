CREATE TABLE "mejoras_modificaciones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentoId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "descripcion" TEXT NOT NULL,
    "trabajoRealizado" TEXT NOT NULL,
    "observaciones" TEXT,
    "tecnicosIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mejoras_modificaciones_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "mejoras_modificaciones_documentoId_key" ON "mejoras_modificaciones"("documentoId");
