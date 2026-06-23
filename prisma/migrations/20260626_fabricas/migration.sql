-- Create fabricas table
CREATE TABLE "fabricas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert a default fabrica for existing sectors
INSERT INTO "fabricas" ("id", "nombre", "createdAt", "updatedAt")
VALUES ('fabrica-principal', 'Principal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add fabricaId column to sectores (nullable for migration)
ALTER TABLE "sectores" ADD COLUMN "fabricaId" TEXT REFERENCES "fabricas"("id") ON DELETE CASCADE;

-- Link all existing sectors to the default fabrica
UPDATE "sectores" SET "fabricaId" = 'fabrica-principal';
