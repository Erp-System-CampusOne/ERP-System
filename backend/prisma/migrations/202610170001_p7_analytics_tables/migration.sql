-- ==============================================================================
-- Migration: 202610170001_p7_analytics_tables
-- Description: Phase 7 Analytics tables (ExpenseRecord, ResearchGrant)
-- ==============================================================================

-- CreateTable ExpenseRecord
CREATE TABLE IF NOT EXISTS "ExpenseRecord" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable ResearchGrant
CREATE TABLE IF NOT EXISTS "ResearchGrant" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "awardedDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExpenseRecord_date_idx" ON "ExpenseRecord"("date");
CREATE INDEX IF NOT EXISTS "ExpenseRecord_category_idx" ON "ExpenseRecord"("category");
CREATE INDEX IF NOT EXISTS "ResearchGrant_awardedDate_idx" ON "ResearchGrant"("awardedDate");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ExpenseRecord_departmentId_fkey'
    ) THEN
        ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END$$;
