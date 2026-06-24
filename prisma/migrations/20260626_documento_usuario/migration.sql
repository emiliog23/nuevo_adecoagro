-- Add userId to carpetas (personal folders)
ALTER TABLE "carpetas" ADD COLUMN "userId" TEXT REFERENCES "users"("id") ON DELETE CASCADE;

-- Create per-user document state table
CREATE TABLE "documento_usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "carpetaId" TEXT,
    "archivado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documento_usuario_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "documento_usuario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "documento_usuario_carpetaId_fkey" FOREIGN KEY ("carpetaId") REFERENCES "carpetas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "documento_usuario_documentoId_userId_key" ON "documento_usuario"("documentoId", "userId");
CREATE INDEX "documento_usuario_userId_idx" ON "documento_usuario"("userId");
