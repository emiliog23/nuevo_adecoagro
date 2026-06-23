-- Recreate lineas table: remove old sectorId NOT NULL, make subsectorId NOT NULL
PRAGMA foreign_keys = OFF;

ALTER TABLE "lineas" RENAME TO "lineas_old";

CREATE TABLE "lineas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subsectorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lineas_subsectorId_fkey" FOREIGN KEY ("subsectorId") REFERENCES "subsectores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "lineas" ("id", "nombre", "descripcion", "subsectorId", "createdAt", "updatedAt")
SELECT "id", "nombre", "descripcion", "subsectorId", "createdAt", "updatedAt"
FROM "lineas_old"
WHERE "subsectorId" IS NOT NULL;

DROP TABLE "lineas_old";

PRAGMA foreign_keys = ON;
