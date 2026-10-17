-- ==============================================================================
-- Migration: 202610170002_p7_analytics_role_alignment
-- Description: Add 'analytics' value to Role and NoticeTargetRole enums
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE typname = 'Role' AND enumlabel = 'analytics'
    ) THEN
        ALTER TYPE "Role" ADD VALUE 'analytics';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE typname = 'NoticeTargetRole' AND enumlabel = 'analytics'
    ) THEN
        ALTER TYPE "NoticeTargetRole" ADD VALUE 'analytics';
    END IF;
END$$;
