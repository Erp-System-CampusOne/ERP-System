-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "campusId" TEXT;

-- Update existing rows if any with unique fallback before applying unique constraint
UPDATE "User" SET "campusId" = 'COID' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0') WHERE "campusId" IS NULL;

-- AlterTable to make it NOT NULL
ALTER TABLE "User" ALTER COLUMN "campusId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_campusId_key" ON "User"("campusId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_campusId_idx" ON "User"("campusId");
