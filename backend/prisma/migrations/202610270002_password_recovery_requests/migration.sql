-- CreateTable
CREATE TABLE IF NOT EXISTS "password_recovery_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "target_user_id" TEXT NOT NULL,
    "campus_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "approver_user_id" TEXT,
    "reason" TEXT,
    "review_notes" TEXT,
    "reviewed_at" TIMESTAMPTZ,
    "reset_token_hash" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_recovery_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "password_recovery_requests_reset_token_hash_key" ON "password_recovery_requests"("reset_token_hash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "password_recovery_requests_target_user_id_idx" ON "password_recovery_requests"("target_user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "password_recovery_requests_campus_id_idx" ON "password_recovery_requests"("campus_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "password_recovery_requests_approver_user_id_idx" ON "password_recovery_requests"("approver_user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "password_recovery_requests_status_idx" ON "password_recovery_requests"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "password_recovery_requests_expires_at_idx" ON "password_recovery_requests"("expires_at");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'password_recovery_requests_target_user_id_fkey'
    ) THEN
        ALTER TABLE "password_recovery_requests" ADD CONSTRAINT "password_recovery_requests_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'password_recovery_requests_approver_user_id_fkey'
    ) THEN
        ALTER TABLE "password_recovery_requests" ADD CONSTRAINT "password_recovery_requests_approver_user_id_fkey" FOREIGN KEY ("approver_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
