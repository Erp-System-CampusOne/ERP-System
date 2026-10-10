-- ==============================================================================
-- Migration: 202610100003_p2_student_faculty_lifecycle
-- Work package: P2.7 (Phase 2 Student & Faculty Lifecycle Schema)
--
-- Invariants:
--   1. 100% Additive: No existing legacy or Phase 1 tables/columns modified or dropped.
--   2. Native UUIDs generated via gen_random_uuid() for all new Phase 2 entities.
--   3. Foreign Keys:
--      - employee_profiles -> User (TEXT), institutions (UUID)
--      - faculty_profiles -> employee_profiles (UUID)
--      - department_appointments -> employee_profiles (UUID), Department (TEXT), campuses (UUID)
--      - student_profiles -> User (TEXT), institutions (UUID)
--      - student_program_enrollments -> student_profiles (UUID), programs (UUID),
--        institutions (UUID), academic_terms (UUID), AdmissionApplication (TEXT via TD-1)
--      - student_term_registrations -> student_program_enrollments (UUID), academic_terms (UUID)
--   4. Triggers enforce institutional boundaries and HOD primary membership.
--   5. Snapshot guard trigger & SECURITY DEFINER procedure enforce result immutability.
-- ==============================================================================

-- ─── Stage 1: Employee, Faculty & Department Appointments ─────────────────────

-- CreateTable: employee_profiles
CREATE TABLE "employee_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "institution_id" UUID NOT NULL,
    "employee_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "employment_type" TEXT NOT NULL DEFAULT 'permanent',
    "employment_status" TEXT NOT NULL DEFAULT 'active',
    "joined_on" DATE NOT NULL DEFAULT CURRENT_DATE,
    "exited_on" DATE,
    "emergency_contact_phone" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "employee_profiles_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "employee_profiles_inst_emp_num_key" UNIQUE ("institution_id", "employee_number"),
    CONSTRAINT "employee_profiles_employment_type_check" CHECK ("employment_type" IN ('permanent', 'contract', 'adjunct', 'visiting')),
    CONSTRAINT "employee_profiles_employment_status_check" CHECK ("employment_status" IN ('active', 'on_leave', 'suspended', 'terminated', 'retired')),
    CONSTRAINT "employee_profiles_dates_check" CHECK ("exited_on" IS NULL OR "joined_on" <= "exited_on")
);

-- CreateTable: faculty_profiles
CREATE TABLE "faculty_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_profile_id" UUID NOT NULL,
    "designation" TEXT NOT NULL,
    "qualification" TEXT,
    "specialization" TEXT,
    "weekly_workload_hours" DECIMAL(4, 1) NOT NULL DEFAULT 0.0,
    "leave_balance" DECIMAL(4, 1) NOT NULL DEFAULT 0.0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faculty_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "faculty_profiles_employee_profile_id_key" UNIQUE ("employee_profile_id"),
    CONSTRAINT "faculty_profiles_workload_check" CHECK ("weekly_workload_hours" >= 0.0 AND "weekly_workload_hours" <= 80.0),
    CONSTRAINT "faculty_profiles_leave_check" CHECK ("leave_balance" >= 0.0)
);

-- CreateTable: department_appointments
CREATE TABLE "department_appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_profile_id" UUID NOT NULL,
    "department_id" TEXT NOT NULL,
    "campus_id" UUID NOT NULL,
    "appointment_role" TEXT NOT NULL DEFAULT 'primary_member',
    "starts_on" DATE NOT NULL DEFAULT CURRENT_DATE,
    "ends_on" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_appointments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "department_appointments_role_check" CHECK ("appointment_role" IN ('primary_member', 'secondary_member', 'head_of_department', 'program_coordinator')),
    CONSTRAINT "department_appointments_dates_check" CHECK ("ends_on" IS NULL OR "starts_on" <= "ends_on")
);

-- Partial Unique Indexes for department_appointments
CREATE UNIQUE INDEX "uq_dept_active_hod" ON "department_appointments"("department_id")
    WHERE "is_active" = true AND "appointment_role" = 'head_of_department';

CREATE UNIQUE INDEX "uq_emp_active_primary_appointment" ON "department_appointments"("employee_profile_id")
    WHERE "is_active" = true AND "appointment_role" = 'primary_member';

-- Regular Indexes for Stage 1
CREATE INDEX "employee_profiles_institution_id_idx" ON "employee_profiles"("institution_id");
CREATE INDEX "employee_profiles_employment_status_idx" ON "employee_profiles"("employment_status");
CREATE INDEX "employee_profiles_employment_type_idx" ON "employee_profiles"("employment_type");

CREATE INDEX "faculty_profiles_designation_idx" ON "faculty_profiles"("designation");

CREATE INDEX "department_appointments_employee_profile_id_idx" ON "department_appointments"("employee_profile_id");
CREATE INDEX "department_appointments_department_id_idx" ON "department_appointments"("department_id");
CREATE INDEX "department_appointments_campus_id_idx" ON "department_appointments"("campus_id");
CREATE INDEX "department_appointments_appointment_role_is_active_idx" ON "department_appointments"("appointment_role", "is_active");

-- ─── Stage 2: Student Identity ────────────────────────────────────────────────

-- CreateTable: student_profiles
CREATE TABLE "student_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "institution_id" UUID NOT NULL,
    "student_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" DATE,
    "gender" TEXT DEFAULT 'unspecified',
    "blood_group" TEXT,
    "emergency_contact_phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "student_profiles_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "student_profiles_inst_student_num_key" UNIQUE ("institution_id", "student_number"),
    CONSTRAINT "student_profiles_status_check" CHECK ("status" IN ('active', 'inactive', 'graduated', 'suspended', 'withdrawn', 'deceased')),
    CONSTRAINT "student_profiles_gender_check" CHECK ("gender" IN ('male', 'female', 'non_binary', 'unspecified'))
);

CREATE INDEX "student_profiles_institution_id_idx" ON "student_profiles"("institution_id");
CREATE INDEX "student_profiles_status_idx" ON "student_profiles"("status");
CREATE INDEX "student_profiles_student_number_idx" ON "student_profiles"("student_number");

-- ─── Stage 3: Program Enrollment ──────────────────────────────────────────────

-- CreateTable: student_program_enrollments
CREATE TABLE "student_program_enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_profile_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "entry_term_id" UUID NOT NULL,
    "admission_application_id" TEXT,
    "cohort_batch" TEXT NOT NULL,
    "enrollment_type" TEXT NOT NULL DEFAULT 'regular',
    "enrollment_status" TEXT NOT NULL DEFAULT 'active',
    "enrolled_on" DATE NOT NULL,
    "expected_completion_date" DATE,
    "actual_completion_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "student_program_enrollments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "student_program_enrollments_enrollment_type_check" CHECK ("enrollment_type" IN ('regular', 'lateral_entry', 'transfer', 'exchange')),
    CONSTRAINT "student_program_enrollments_enrollment_status_check" CHECK ("enrollment_status" IN ('active', 'completed', 'discontinued', 'suspended', 'withdrawn', 'quarantined')),
    CONSTRAINT "student_program_enrollments_expected_completion_check" CHECK ("expected_completion_date" IS NULL OR "enrolled_on" <= "expected_completion_date"),
    CONSTRAINT "student_program_enrollments_actual_completion_check" CHECK ("actual_completion_date" IS NULL OR "enrolled_on" <= "actual_completion_date")
);

CREATE INDEX "student_program_enrollments_student_profile_id_idx" ON "student_program_enrollments"("student_profile_id");
CREATE INDEX "student_program_enrollments_program_id_idx" ON "student_program_enrollments"("program_id");
CREATE INDEX "student_program_enrollments_entry_term_id_idx" ON "student_program_enrollments"("entry_term_id");
CREATE INDEX "student_program_enrollments_enrollment_status_idx" ON "student_program_enrollments"("enrollment_status");
CREATE INDEX "student_program_enrollments_cohort_batch_idx" ON "student_program_enrollments"("cohort_batch");

-- ─── Stage 4: Term Progression ────────────────────────────────────────────────

-- CreateTable: student_term_registrations
CREATE TABLE "student_term_registrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "program_enrollment_id" UUID NOT NULL,
    "academic_term_id" UUID NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "section" TEXT,
    "registration_status" TEXT NOT NULL DEFAULT 'draft',
    "registered_on" DATE,
    "completed_on" DATE,
    "term_gpa" DECIMAL(4, 2),
    "cumulative_cgpa" DECIMAL(4, 2),
    "credits_attempted" DECIMAL(4, 1) NOT NULL DEFAULT 0.0,
    "credits_earned" DECIMAL(4, 1) NOT NULL DEFAULT 0.0,
    "attendance_percentage" DECIMAL(5, 2),
    "academic_standing" TEXT NOT NULL DEFAULT 'unspecified',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "student_term_registrations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "student_term_registrations_prog_term_key" UNIQUE ("program_enrollment_id", "academic_term_id"),
    CONSTRAINT "student_term_registrations_semester_check" CHECK ("semester_number" >= 1 AND "semester_number" <= 12),
    CONSTRAINT "student_term_registrations_status_check" CHECK ("registration_status" IN ('draft', 'pending_approval', 'registered', 'withdrawn', 'cancelled', 'completed')),
    CONSTRAINT "student_term_registrations_dates_check" CHECK ("completed_on" IS NULL OR "registered_on" IS NULL OR "registered_on" <= "completed_on"),
    CONSTRAINT "student_term_registrations_term_gpa_check" CHECK ("term_gpa" IS NULL OR ("term_gpa" >= 0.00 AND "term_gpa" <= 10.00)),
    CONSTRAINT "student_term_registrations_cumulative_cgpa_check" CHECK ("cumulative_cgpa" IS NULL OR ("cumulative_cgpa" >= 0.00 AND "cumulative_cgpa" <= 10.00)),
    CONSTRAINT "student_term_registrations_credits_attempted_check" CHECK ("credits_attempted" >= 0.0 AND "credits_attempted" <= 50.0),
    CONSTRAINT "student_term_registrations_credits_earned_check" CHECK ("credits_earned" >= 0.0 AND "credits_earned" <= "credits_attempted"),
    CONSTRAINT "student_term_registrations_attendance_check" CHECK ("attendance_percentage" IS NULL OR ("attendance_percentage" >= 0.00 AND "attendance_percentage" <= 100.00)),
    CONSTRAINT "student_term_registrations_standing_check" CHECK ("academic_standing" IN ('unspecified', 'good_standing', 'academic_probation', 'critical_probation', 'suspended', 'deans_list'))
);

CREATE INDEX "student_term_registrations_program_enrollment_id_idx" ON "student_term_registrations"("program_enrollment_id");
CREATE INDEX "student_term_registrations_academic_term_id_idx" ON "student_term_registrations"("academic_term_id");
CREATE INDEX "student_term_registrations_registration_status_idx" ON "student_term_registrations"("registration_status");
CREATE INDEX "student_term_registrations_term_sem_sec_idx" ON "student_term_registrations"("academic_term_id", "semester_number", "section");

-- ─── Foreign Key Constraints ──────────────────────────────────────────────────

ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "faculty_profiles" ADD CONSTRAINT "faculty_profiles_employee_profile_id_fkey"
    FOREIGN KEY ("employee_profile_id") REFERENCES "employee_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "department_appointments" ADD CONSTRAINT "department_appointments_employee_profile_id_fkey"
    FOREIGN KEY ("employee_profile_id") REFERENCES "employee_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "department_appointments" ADD CONSTRAINT "department_appointments_department_id_fkey"
    FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "department_appointments" ADD CONSTRAINT "department_appointments_campus_id_fkey"
    FOREIGN KEY ("campus_id") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_program_enrollments" ADD CONSTRAINT "student_program_enrollments_student_profile_id_fkey"
    FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_program_enrollments" ADD CONSTRAINT "student_program_enrollments_program_id_fkey"
    FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_program_enrollments" ADD CONSTRAINT "student_program_enrollments_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_program_enrollments" ADD CONSTRAINT "student_program_enrollments_entry_term_id_fkey"
    FOREIGN KEY ("entry_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_program_enrollments" ADD CONSTRAINT "student_program_enrollments_admission_application_id_fkey"
    FOREIGN KEY ("admission_application_id") REFERENCES "AdmissionApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_term_registrations" ADD CONSTRAINT "student_term_registrations_program_enrollment_id_fkey"
    FOREIGN KEY ("program_enrollment_id") REFERENCES "student_program_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_term_registrations" ADD CONSTRAINT "student_term_registrations_academic_term_id_fkey"
    FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Integrity Boundary & Guardrail Triggers ──────────────────────────────────

-- 1. HOD Primary Membership Trigger
CREATE OR REPLACE FUNCTION fn_enforce_hod_primary_membership()
RETURNS TRIGGER AS $$
DECLARE
    v_has_primary BOOLEAN;
BEGIN
    IF NEW.is_active = true AND NEW.appointment_role = 'head_of_department' THEN
        SELECT EXISTS(
            SELECT 1 FROM "department_appointments"
            WHERE employee_profile_id = NEW.employee_profile_id
              AND department_id = NEW.department_id
              AND appointment_role = 'primary_member'
              AND is_active = true
              AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ) INTO v_has_primary;

        IF NOT v_has_primary THEN
            RAISE EXCEPTION 'Head of Department requires an active primary membership in the department (employee: %, department: %)',
                NEW.employee_profile_id, NEW.department_id
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_da_hod_primary_membership
BEFORE INSERT OR UPDATE OF employee_profile_id, department_id, appointment_role, is_active
ON "department_appointments"
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_hod_primary_membership();

-- 2. Department Appointment Campus Institution Boundary Trigger (TD-3)
CREATE OR REPLACE FUNCTION fn_enforce_department_appointment_institution()
RETURNS TRIGGER AS $$
DECLARE
    v_emp_inst_id UUID;
    v_campus_inst_id UUID;
BEGIN
    SELECT institution_id INTO v_emp_inst_id
    FROM "employee_profiles"
    WHERE id = NEW.employee_profile_id;

    IF v_emp_inst_id IS NULL THEN
        RAISE EXCEPTION 'Referenced employee profile % does not exist.', NEW.employee_profile_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    SELECT institution_id INTO v_campus_inst_id
    FROM "campuses"
    WHERE id = NEW.campus_id;

    IF v_campus_inst_id IS NULL THEN
        RAISE EXCEPTION 'Referenced campus % does not exist.', NEW.campus_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF v_emp_inst_id IS DISTINCT FROM v_campus_inst_id THEN
        RAISE EXCEPTION 'Cross-Institution Appointment Violation: Employee institution % does not match campus institution %.',
            v_emp_inst_id, v_campus_inst_id
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_da_institution_boundary
BEFORE INSERT OR UPDATE OF employee_profile_id, campus_id
ON "department_appointments"
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_department_appointment_institution();

-- 3. Program Enrollment Institution Boundary Trigger (TD-2)
CREATE OR REPLACE FUNCTION fn_enforce_program_enrollment_institution()
RETURNS TRIGGER AS $$
DECLARE
    v_student_inst_id UUID;
    v_prog_inst_id UUID;
    v_term_inst_id UUID;
BEGIN
    SELECT institution_id INTO v_student_inst_id
    FROM "student_profiles"
    WHERE id = NEW.student_profile_id;

    IF v_student_inst_id IS NULL THEN
        RAISE EXCEPTION 'Referenced student profile % does not exist.', NEW.student_profile_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    SELECT institution_id INTO v_prog_inst_id
    FROM "programs"
    WHERE id = NEW.program_id;

    IF v_prog_inst_id IS NULL THEN
        RAISE EXCEPTION 'Referenced program % does not exist.', NEW.program_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    SELECT ay.institution_id INTO v_term_inst_id
    FROM "academic_terms" t
    JOIN "academic_years" ay ON t.academic_year_id = ay.id
    WHERE t.id = NEW.entry_term_id;

    IF v_term_inst_id IS NULL THEN
        RAISE EXCEPTION 'Referenced entry term % or its academic year does not exist.', NEW.entry_term_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF v_student_inst_id IS DISTINCT FROM NEW.institution_id OR
       v_prog_inst_id IS DISTINCT FROM NEW.institution_id OR
       v_term_inst_id IS DISTINCT FROM NEW.institution_id THEN
        RAISE EXCEPTION 'Cross-Institution Program Enrollment Violation: Mismatch among student (%), program (%), entry term (%), and enrollment (%) institutions.',
            v_student_inst_id, v_prog_inst_id, v_term_inst_id, NEW.institution_id
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_spe_institution_boundary
BEFORE INSERT OR UPDATE OF student_profile_id, program_id, entry_term_id, institution_id
ON "student_program_enrollments"
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_program_enrollment_institution();

-- 4. Term Registration Institution Boundary Trigger
CREATE OR REPLACE FUNCTION fn_enforce_term_registration_institution()
RETURNS TRIGGER AS $$
DECLARE
    v_spe_inst_id UUID;
    v_term_inst_id UUID;
BEGIN
    SELECT institution_id INTO v_spe_inst_id
    FROM "student_program_enrollments"
    WHERE id = NEW.program_enrollment_id;

    IF v_spe_inst_id IS NULL THEN
        RAISE EXCEPTION 'Referenced program enrollment % does not exist.', NEW.program_enrollment_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    SELECT ay.institution_id INTO v_term_inst_id
    FROM "academic_terms" t
    JOIN "academic_years" ay ON t.academic_year_id = ay.id
    WHERE t.id = NEW.academic_term_id;

    IF v_term_inst_id IS NULL THEN
        RAISE EXCEPTION 'Referenced academic term % does not exist.', NEW.academic_term_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF v_spe_inst_id IS DISTINCT FROM v_term_inst_id THEN
        RAISE EXCEPTION 'Cross-Institution Term Registration Violation: Enrollment institution % does not match term institution %.',
            v_spe_inst_id, v_term_inst_id
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_str_institution_boundary
BEFORE INSERT OR UPDATE OF program_enrollment_id, academic_term_id
ON "student_term_registrations"
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_term_registration_institution();

-- 5. Completed Registration Snapshot Guard Trigger (Guardrail A Layer 3)
CREATE OR REPLACE FUNCTION fn_guard_completed_registration_snapshots()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.registration_status = 'completed' THEN
        -- Check if any protected column changed or status moved away from completed
        IF NEW.term_gpa IS DISTINCT FROM OLD.term_gpa OR
           NEW.cumulative_cgpa IS DISTINCT FROM OLD.cumulative_cgpa OR
           NEW.credits_attempted IS DISTINCT FROM OLD.credits_attempted OR
           NEW.credits_earned IS DISTINCT FROM OLD.credits_earned OR
           NEW.attendance_percentage IS DISTINCT FROM OLD.attendance_percentage OR
           NEW.completed_on IS DISTINCT FROM OLD.completed_on OR
           NEW.academic_term_id IS DISTINCT FROM OLD.academic_term_id OR
           NEW.program_enrollment_id IS DISTINCT FROM OLD.program_enrollment_id OR
           NEW.semester_number IS DISTINCT FROM OLD.semester_number OR
           NEW.registration_status IS DISTINCT FROM 'completed' THEN

            IF current_setting('app.authorized_grade_correction', true) IS DISTINCT FROM 'true' THEN
                RAISE EXCEPTION 'Cannot modify completed term registration results without authorized grade correction procedure.'
                    USING ERRCODE = 'insufficient_privilege';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_str_snapshot_guard
BEFORE UPDATE ON "student_term_registrations"
FOR EACH ROW
EXECUTE FUNCTION fn_guard_completed_registration_snapshots();

-- ─── Grade Correction Stored Procedure (Guardrail A Layer 2) ──────────────────

CREATE OR REPLACE PROCEDURE sp_apply_grade_correction(
    p_registration_id UUID,
    p_modifying_user_id TEXT,
    p_new_term_gpa NUMERIC(4, 2),
    p_new_cumulative_cgpa NUMERIC(4, 2),
    p_new_credits_earned NUMERIC(4, 1),
    p_reason TEXT,
    p_memo_reference TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_reg RECORD;
    v_has_role BOOLEAN;
BEGIN
    -- Input parameter assertions
    IF p_registration_id IS NULL OR p_modifying_user_id IS NULL THEN
        RAISE EXCEPTION 'Registration ID and modifying user ID are required.'
            USING ERRCODE = 'null_value_not_allowed';
    END IF;

    IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
        RAISE EXCEPTION 'A valid correction reason of at least 5 characters is required.'
            USING ERRCODE = 'check_violation';
    END IF;

    IF p_memo_reference IS NULL OR length(trim(p_memo_reference)) < 3 THEN
        RAISE EXCEPTION 'A valid institutional approval memo reference is required.'
            USING ERRCODE = 'check_violation';
    END IF;

    IF p_new_term_gpa IS NOT NULL AND (p_new_term_gpa < 0.00 OR p_new_term_gpa > 10.00) THEN
        RAISE EXCEPTION 'Term GPA must be between 0.00 and 10.00.'
            USING ERRCODE = 'check_violation';
    END IF;

    IF p_new_cumulative_cgpa IS NOT NULL AND (p_new_cumulative_cgpa < 0.00 OR p_new_cumulative_cgpa > 10.00) THEN
        RAISE EXCEPTION 'Cumulative CGPA must be between 0.00 and 10.00.'
            USING ERRCODE = 'check_violation';
    END IF;

    -- RBAC validation against canonical user_role_assignments
    -- Only canonical role 'admin' currently exists in P1.3 role model.
    -- 'exam_controller' role is deferred pending statutory institutional governance policy.
    SELECT EXISTS (
        SELECT 1
        FROM "user_role_assignments" ura
        JOIN "roles" r ON ura.role_id = r.id
        WHERE ura.user_id = p_modifying_user_id
          AND ura.is_active = true
          AND (ura.valid_to IS NULL OR ura.valid_to > CURRENT_TIMESTAMP)
          AND r.code = 'admin'
    ) INTO v_has_role;

    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Grade Correction Unauthorized: User % does not possess administrative role.', p_modifying_user_id
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Lock and retrieve registration row
    SELECT registration_status, term_gpa, cumulative_cgpa, credits_earned, credits_attempted, notes
    INTO v_reg
    FROM "student_term_registrations"
    WHERE id = p_registration_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registration record % not found.', p_registration_id
            USING ERRCODE = 'no_data_found';
    END IF;

    IF v_reg.registration_status <> 'completed' THEN
        RAISE EXCEPTION 'Grade correction is only applicable to completed term registrations (current: %).', v_reg.registration_status
            USING ERRCODE = 'check_violation';
    END IF;

    IF p_new_credits_earned IS NOT NULL AND (p_new_credits_earned < 0.0 OR p_new_credits_earned > v_reg.credits_attempted) THEN
        RAISE EXCEPTION 'Credits earned must be between 0.0 and credits attempted (%).', v_reg.credits_attempted
            USING ERRCODE = 'check_violation';
    END IF;

    -- Set local session variable to bypass trigger guard within procedure scope
    PERFORM set_config('app.authorized_grade_correction', 'true', true);

    -- Perform atomic update
    UPDATE "student_term_registrations"
    SET term_gpa = COALESCE(p_new_term_gpa, term_gpa),
        cumulative_cgpa = COALESCE(p_new_cumulative_cgpa, cumulative_cgpa),
        credits_earned = COALESCE(p_new_credits_earned, credits_earned),
        notes = concat_ws('; ', notes, format('Grade corrected at %s by %s ref %s: %s', CURRENT_TIMESTAMP, p_modifying_user_id, p_memo_reference, p_reason)),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_registration_id;

    -- Record atomic audit row in SystemActivity
    INSERT INTO "SystemActivity" ("id", "action", "description", "type", "timestamp")
    VALUES (
        gen_random_uuid()::text,
        'GRADE_CORRECTION',
        json_build_object(
            'registration_id', p_registration_id,
            'actor_user_id', p_modifying_user_id,
            'memo_reference', p_memo_reference,
            'reason', p_reason,
            'old_term_gpa', v_reg.term_gpa,
            'new_term_gpa', COALESCE(p_new_term_gpa, v_reg.term_gpa),
            'old_cumulative_cgpa', v_reg.cumulative_cgpa,
            'new_cumulative_cgpa', COALESCE(p_new_cumulative_cgpa, v_reg.cumulative_cgpa),
            'old_credits_earned', v_reg.credits_earned,
            'new_credits_earned', COALESCE(p_new_credits_earned, v_reg.credits_earned)
        )::text,
        'audit',
        CURRENT_TIMESTAMP
    );

    -- Reset session variable
    PERFORM set_config('app.authorized_grade_correction', 'false', true);
END;
$$;

-- Revoke procedure execution from public
REVOKE EXECUTE ON PROCEDURE sp_apply_grade_correction(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT) FROM PUBLIC;

-- Conditional setup for application role if defined
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'campusone_app') THEN
        GRANT USAGE ON SCHEMA public TO campusone_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO campusone_app;
        REVOKE UPDATE ON "student_term_registrations" FROM campusone_app;
        GRANT UPDATE ("notes", "section") ON "student_term_registrations" TO campusone_app;
        GRANT EXECUTE ON PROCEDURE sp_apply_grade_correction(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT) TO campusone_app;
    END IF;
END $$;
