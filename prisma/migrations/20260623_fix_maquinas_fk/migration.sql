-- Fix maquinas FK: was pointing to lineas_old (dropped), fix to lineas
PRAGMA foreign_keys = OFF;

ALTER TABLE "maquinas" RENAME TO "maquinas_old";

CREATE TABLE "maquinas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "codigo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'OPERATIVA',
    "lineaId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "maquinas_lineaId_fkey" FOREIGN KEY ("lineaId") REFERENCES "lineas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "maquinas" SELECT * FROM "maquinas_old";

DROP TABLE "maquinas_old";

PRAGMA foreign_keys = ON;
