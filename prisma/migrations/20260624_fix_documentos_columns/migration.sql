-- Fix column swap in documentos caused by SELECT * in the v2 migration.
-- Current (wrong): importante=datetime, archivado=datetime, createdAt=0, updatedAt=0
-- Target (correct): importante=0, archivado=0, createdAt=datetime, updatedAt=datetime

-- 1. Save the real datetime values (they are currently in importante/archivado)
ALTER TABLE "documentos" ADD COLUMN "createdAt_fixed" DATETIME;
ALTER TABLE "documentos" ADD COLUMN "updatedAt_fixed" DATETIME;
UPDATE "documentos" SET "createdAt_fixed" = "importante", "updatedAt_fixed" = "archivado";

-- 2. Drop all four corrupted columns
ALTER TABLE "documentos" DROP COLUMN "importante";
ALTER TABLE "documentos" DROP COLUMN "archivado";
ALTER TABLE "documentos" DROP COLUMN "createdAt";
ALTER TABLE "documentos" DROP COLUMN "updatedAt";

-- 3. Add boolean columns (default 0 = false)
ALTER TABLE "documentos" ADD COLUMN "importante" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "documentos" ADD COLUMN "archivado"  INTEGER NOT NULL DEFAULT 0;

-- 4. Rename fixed datetime columns to their correct names
ALTER TABLE "documentos" RENAME COLUMN "createdAt_fixed" TO "createdAt";
ALTER TABLE "documentos" RENAME COLUMN "updatedAt_fixed" TO "updatedAt";
