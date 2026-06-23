-- Create subsectores table
CREATE TABLE "subsectores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "sectorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subsectores_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create one default subsector per existing sector
INSERT INTO "subsectores" ("id", "nombre", "sectorId", "createdAt", "updatedAt")
SELECT 'sub-' || "id", 'General', "id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "sectores";

-- Add subsectorId column to lineas (nullable for migration)
ALTER TABLE "lineas" ADD COLUMN "subsectorId" TEXT;

-- Link existing lineas to their sector's default subsector
UPDATE "lineas" SET "subsectorId" = 'sub-' || "sectorId";

CREATE INDEX "subsectores_sectorId_idx" ON "subsectores"("sectorId");
