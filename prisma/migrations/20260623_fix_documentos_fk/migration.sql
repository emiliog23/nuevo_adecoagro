-- Fix documentos FK: was pointing to maquinas_old, fix to maquinas
-- Use a v2 name to avoid SQLite auto-updating child table FK references
PRAGMA foreign_keys = OFF;

CREATE TABLE "documentos_v2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "maquinaId" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "importante" INTEGER NOT NULL DEFAULT 0,
    "archivado" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documentos_maquinaId_fkey" FOREIGN KEY ("maquinaId") REFERENCES "maquinas" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "documentos_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "documentos_v2" SELECT * FROM "documentos";

DROP TABLE "documentos";

ALTER TABLE "documentos_v2" RENAME TO "documentos";

PRAGMA foreign_keys = ON;
