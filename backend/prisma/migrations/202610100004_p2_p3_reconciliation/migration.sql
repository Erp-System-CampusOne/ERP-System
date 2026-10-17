-- ==============================================================================
-- Migration: 202610100004_p2_p3_reconciliation
-- Description: Phase 2 & 3 Schema Reconciliation (RBAC, Examiner, Single HOD, Workflow Audit)
-- ==============================================================================

-- 1. Add examiner to Role enum if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE typname = 'Role' AND enumlabel = 'examiner'
    ) THEN
        ALTER TYPE "Role" ADD VALUE 'examiner';
    END IF;
END$$;

-- 2. Create Phase 2 Auth Tables if not exist
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    module TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_role UNIQUE (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    credential_type TEXT NOT NULL DEFAULT 'password',
    password_hash TEXT NOT NULL,
    algorithm TEXT NOT NULL DEFAULT 'bcrypt',
    requires_change BOOLEAN NOT NULL DEFAULT false,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_cred_type UNIQUE (user_id, credential_type)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    session_token_hash TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Canonical roles seed
INSERT INTO roles (id, code, name, description, is_system, created_at, updated_at) VALUES
    (gen_random_uuid(), 'admin', 'System Administrator', 'Highest application-level authority', true, now(), now()),
    (gen_random_uuid(), 'hod', 'Institution Head of Department', 'Sole institution-wide academic authority', true, now(), now()),
    (gen_random_uuid(), 'finance_officer', 'Finance Officer', 'Financial operations and fee management', true, now(), now()),
    (gen_random_uuid(), 'librarian', 'Librarian', 'Library catalog and circulation management', true, now(), now()),
    (gen_random_uuid(), 'analytics', 'Institutional Analytics', 'Read-only reporting and institutional analysis', true, now(), now()),
    (gen_random_uuid(), 'management', 'Management (Legacy Analytics)', 'Legacy alias for institutional analytics', true, now(), now()),
    (gen_random_uuid(), 'faculty', 'Teaching Faculty', 'Course instruction, attendance, and coursework', true, now(), now()),
    (gen_random_uuid(), 'examiner', 'Examination Officer', 'Assigned examinations and marks entry', true, now(), now()),
    (gen_random_uuid(), 'student', 'Enrolled Student', 'Student self-service portal', true, now(), now())
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 4. Create examiner_assignments table
CREATE TABLE IF NOT EXISTS examiner_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    examiner_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    examination_id TEXT NOT NULL REFERENCES "Examination"(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'assigned',
    CONSTRAINT uq_examiner_exam_course UNIQUE (examiner_id, examination_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_ea_examiner ON examiner_assignments(examiner_id);
CREATE INDEX IF NOT EXISTS idx_ea_exam ON examiner_assignments(examination_id);
CREATE INDEX IF NOT EXISTS idx_ea_course ON examiner_assignments(course_id);

-- 5. Create institution_hod_assignments table
CREATE TABLE IF NOT EXISTS institution_hod_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
    appointed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    relieved_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_single_active_institution_hod 
ON institution_hod_assignments (institution_id) WHERE is_active = true;

-- 6. Enforce single active institution HOD trigger
CREATE OR REPLACE FUNCTION fn_enforce_single_active_hod()
RETURNS TRIGGER AS $$
DECLARE
    v_hod_role_id UUID;
    v_existing_active_count INT;
BEGIN
    SELECT id INTO v_hod_role_id FROM roles WHERE code = 'hod';
    IF NEW.role_id = v_hod_role_id AND NEW.is_active = true THEN
        SELECT count(*) INTO v_existing_active_count
        FROM user_role_assignments
        WHERE role_id = v_hod_role_id AND is_active = true AND user_id != NEW.user_id;

        IF v_existing_active_count > 0 THEN
            RAISE EXCEPTION 'Rule 2 Violation: Exactly one active institution-wide HOD is permitted.'
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_single_active_hod ON user_role_assignments;
CREATE TRIGGER trg_enforce_single_active_hod
    BEFORE INSERT OR UPDATE ON user_role_assignments
    FOR EACH ROW
    EXECUTE FUNCTION fn_enforce_single_active_hod();

ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- 7. Add workflow fields to DocumentRequest and ExamResult
ALTER TABLE "DocumentRequest" ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE "DocumentRequest" ADD COLUMN IF NOT EXISTS "reviewerId" TEXT REFERENCES "User"(id) ON DELETE SET NULL;
ALTER TABLE "DocumentRequest" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMPTZ;
ALTER TABLE "DocumentRequest" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
CREATE INDEX IF NOT EXISTS idx_docreq_reviewer ON "DocumentRequest"("reviewerId");

ALTER TABLE "ExamResult" ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE "ExamResult" ADD COLUMN IF NOT EXISTS "submittedBy" TEXT;
ALTER TABLE "ExamResult" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMPTZ;
ALTER TABLE "ExamResult" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "ExamResult" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_examresult_status ON "ExamResult"(status);
