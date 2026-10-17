/**
 * CampusOne ERP — Phase 2 & 3 Schema Migration and RBAC Seed Script
 * Applies forward-only, additive migrations to disposable PostgreSQL port 5433:
 *   1. ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'examiner'
 *   2. Insert canonical roles: 'examiner', 'analytics'
 *   3. Seed granular permissions across all institutional domains
 *   4. Seed role_permissions mappings for all 8 roles
 *   5. Create examiner_assignments table
 *   6. Create institution_hod_assignments table with single active HOD unique partial index
 *   7. Create trg_enforce_single_active_hod trigger on user_role_assignments
 *   8. Add workflow fields to DocumentRequest and ExamResult
 */

const { Client } = require('pg');

const DISPOSABLE_DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5433/postgres';

async function migrate() {
  console.log('Connecting to disposable database on port 5433...');
  const client = new Client({ connectionString: DISPOSABLE_DB_URL });
  await client.connect();

  try {
    await client.query('BEGIN;');

    // 1. Add 'examiner' to Role enum if not present
    console.log('Checking Role enum...');
    const enumCheck = await client.query(`
      SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE typname = 'Role' AND enumlabel = 'examiner';
    `);
    if (enumCheck.rows.length === 0) {
      console.log('Adding examiner to Role enum...');
      await client.query(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'examiner';`);
    }

    // 2. Insert canonical roles
    console.log('Seeding canonical roles...');
    const rolesToSeed = [
      { code: 'admin', name: 'System Administrator', description: 'Highest application-level authority' },
      { code: 'hod', name: 'Institution Head of Department', description: 'Sole institution-wide academic authority' },
      { code: 'finance_officer', name: 'Finance Officer', description: 'Financial operations and fee management' },
      { code: 'librarian', name: 'Librarian', description: 'Library catalog and circulation management' },
      { code: 'analytics', name: 'Institutional Analytics', description: 'Read-only reporting and institutional analysis' },
      { code: 'management', name: 'Management (Legacy Analytics)', description: 'Legacy alias for institutional analytics' },
      { code: 'faculty', name: 'Teaching Faculty', description: 'Course instruction, attendance, and coursework' },
      { code: 'examiner', name: 'Examination Officer', description: 'Assigned examinations and marks entry' },
      { code: 'student', name: 'Enrolled Student', description: 'Student self-service portal' }
    ];

    for (const r of rolesToSeed) {
      await client.query(`
        INSERT INTO roles (id, code, name, description, is_system, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, true, now(), now())
        ON CONFLICT (code) DO UPDATE 
        SET name = EXCLUDED.name, description = EXCLUDED.description;
      `, [r.code, r.name, r.description]);
    }

    // 3. Seed granular permissions
    console.log('Seeding granular permissions...');
    const permissionsToSeed = [
      // Users & Roles
      { code: 'users.view', name: 'View Users', module: 'users', description: 'View user directory' },
      { code: 'users.create', name: 'Create Users', module: 'users', description: 'Create user accounts' },
      { code: 'users.update', name: 'Update Users', module: 'users', description: 'Update user profiles' },
      { code: 'users.deactivate', name: 'Deactivate Users', module: 'users', description: 'Deactivate user accounts' },
      { code: 'roles.assign', name: 'Assign Roles', module: 'roles', description: 'Assign roles to users' },
      { code: 'roles.manage', name: 'Manage Roles', module: 'roles', description: 'Configure role permissions' },

      // Academics & Faculty
      { code: 'students.view', name: 'View Students', module: 'students', description: 'View student records' },
      { code: 'students.create', name: 'Create Students', module: 'students', description: 'Enroll new students' },
      { code: 'students.update', name: 'Update Students', module: 'students', description: 'Update student details' },
      { code: 'students.view_own', name: 'View Own Student Profile', module: 'students', description: 'View own student profile' },
      { code: 'faculty.view', name: 'View Faculty', module: 'faculty', description: 'View faculty roster' },
      { code: 'faculty.create', name: 'Create Faculty', module: 'faculty', description: 'Onboard faculty members' },
      { code: 'faculty.update', name: 'Update Faculty', module: 'faculty', description: 'Update faculty details' },
      { code: 'courses.view', name: 'View Courses', module: 'courses', description: 'Browse curriculum courses' },
      { code: 'courses.manage', name: 'Manage Courses', module: 'courses', description: 'Create and update courses' },
      { code: 'attendance.mark', name: 'Mark Attendance', module: 'attendance', description: 'Record student attendance' },
      { code: 'attendance.view', name: 'View Attendance', module: 'attendance', description: 'View attendance statistics' },
      { code: 'attendance.view_own', name: 'View Own Attendance', module: 'attendance', description: 'View own attendance records' },
      { code: 'timetable.view', name: 'View Timetable', module: 'timetable', description: 'View academic timetable' },
      { code: 'timetable.manage', name: 'Manage Timetable', module: 'timetable', description: 'Build and export timetables' },

      // Examinations
      { code: 'examinations.view', name: 'View Examinations', module: 'examinations', description: 'View examination schedules' },
      { code: 'examinations.manage', name: 'Manage Examinations', module: 'examinations', description: 'Configure exams and hall tickets' },
      { code: 'examinations.assign', name: 'Assign Examiners', module: 'examinations', description: 'Assign examiners to courses' },
      { code: 'marks.enter', name: 'Enter Marks', module: 'examinations', description: 'Enter and draft exam scores' },
      { code: 'marks.submit', name: 'Submit Marks', module: 'examinations', description: 'Submit drafted marks for review' },
      { code: 'results.approve', name: 'Approve Results', module: 'examinations', description: 'HOD approval of submitted marks' },
      { code: 'results.publish', name: 'Publish Results', module: 'examinations', description: 'Official result publication' },
      { code: 'results.correct', name: 'Correct Results', module: 'examinations', description: 'Auditable grade correction' },
      { code: 'results.view_own', name: 'View Own Published Results', module: 'examinations', description: 'View own published results' },

      // Finance
      { code: 'fees.view', name: 'View Fees', module: 'finance', description: 'View fee structures and defaulters' },
      { code: 'fees.manage', name: 'Manage Fee Structures', module: 'finance', description: 'Create and configure fee quotas' },
      { code: 'payments.record', name: 'Record Payments', module: 'finance', description: 'Record and verify student fee payments' },
      { code: 'payments.adjust', name: 'Adjust Payments', module: 'finance', description: 'Process financial adjustments and refunds' },
      { code: 'fees.view_own', name: 'View Own Fees', module: 'finance', description: 'View own fee ledger and invoices' },
      { code: 'payments.record_own', name: 'Submit Own Payment', module: 'finance', description: 'Submit fee payment for self' },

      // Library
      { code: 'library.catalog.view', name: 'Browse Library Catalog', module: 'library', description: 'Search library book inventory' },
      { code: 'library.books.manage', name: 'Manage Library Books', module: 'library', description: 'Add and update books and rack locations' },
      { code: 'library.circulation.manage', name: 'Manage Circulation', module: 'library', description: 'Issue and return physical book copies' },
      { code: 'library.fines.manage', name: 'Manage Fines', module: 'library', description: 'Track overdue fines and accept payments' },
      { code: 'library.view_own', name: 'View Own Library Activity', module: 'library', description: 'View own borrowed books and fines' },

      // Documents
      { code: 'documents.request', name: 'Submit Document Request', module: 'documents', description: 'Request bonafide, transcript, etc.' },
      { code: 'documents.view_own', name: 'View Own Document Requests', module: 'documents', description: 'Track status of own document requests' },
      { code: 'documents.review', name: 'Review Document Requests', module: 'documents', description: 'View submitted document request queue' },
      { code: 'documents.approve', name: 'Approve Document Request', module: 'documents', description: 'Authorize issuance of student documents' },
      { code: 'documents.reject', name: 'Reject Document Request', module: 'documents', description: 'Reject document request with reason' },

      // Analytics & Governance
      { code: 'analytics.view', name: 'View Analytics', module: 'analytics', description: 'View institutional reporting dashboards' },
      { code: 'analytics.export', name: 'Export Analytics Reports', module: 'analytics', description: 'Export institutional data reports' },
      { code: 'notices.manage', name: 'Manage Notices', module: 'notices', description: 'Publish and pin institutional notices' },
      { code: 'audit_logs.view', name: 'View Audit Logs', module: 'audit', description: 'Inspect system activity and audit trail' }
    ];

    for (const p of permissionsToSeed) {
      await client.query(`
        INSERT INTO permissions (id, code, name, module, description, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, now(), now())
        ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name, module = EXCLUDED.module, description = EXCLUDED.description;
      `, [p.code, p.name, p.module, p.description]);
    }

    // 4. Map role permissions
    console.log('Mapping role permissions...');
    const rolePermissionMapping = {
      admin: permissionsToSeed.map(p => p.code),
      hod: [
        'users.view', 'students.view', 'students.create', 'students.update',
        'faculty.view', 'faculty.create', 'faculty.update',
        'courses.view', 'courses.manage', 'attendance.view',
        'timetable.view', 'timetable.manage',
        'examinations.view', 'examinations.assign', 'results.approve',
        'documents.review', 'documents.approve', 'documents.reject',
        'analytics.view', 'notices.manage'
      ],
      finance_officer: [
        'fees.view', 'fees.manage', 'payments.record', 'payments.adjust',
        'students.view', 'analytics.view'
      ],
      librarian: [
        'library.catalog.view', 'library.books.manage', 'library.circulation.manage',
        'library.fines.manage', 'students.view'
      ],
      analytics: [
        'analytics.view', 'analytics.export', 'students.view', 'faculty.view',
        'courses.view', 'attendance.view', 'examinations.view', 'fees.view',
        'library.catalog.view', 'timetable.view'
      ],
      management: [
        'analytics.view', 'analytics.export', 'students.view', 'faculty.view',
        'courses.view', 'attendance.view', 'examinations.view', 'fees.view',
        'library.catalog.view', 'timetable.view'
      ],
      faculty: [
        'courses.view', 'attendance.mark', 'attendance.view',
        'examinations.view', 'timetable.view', 'notices.manage'
      ],
      examiner: [
        'examinations.view', 'marks.enter', 'marks.submit'
      ],
      student: [
        'students.view_own', 'courses.view', 'attendance.view_own',
        'timetable.view', 'examinations.view', 'results.view_own',
        'fees.view_own', 'payments.record_own', 'library.catalog.view',
        'library.view_own', 'documents.request', 'documents.view_own'
      ]
    };

    // Clear existing role permissions and re-seed cleanly
    await client.query(`DELETE FROM role_permissions;`);

    for (const [roleCode, permCodes] of Object.entries(rolePermissionMapping)) {
      const roleRes = await client.query(`SELECT id FROM roles WHERE code = $1;`, [roleCode]);
      if (roleRes.rows.length === 0) continue;
      const roleId = roleRes.rows[0].id;

      for (const permCode of permCodes) {
        const permRes = await client.query(`SELECT id FROM permissions WHERE code = $1;`, [permCode]);
        if (permRes.rows.length === 0) continue;
        const permId = permRes.rows[0].id;

        await client.query(`
          INSERT INTO role_permissions (id, role_id, permission_id, created_at)
          VALUES (gen_random_uuid(), $1, $2, now())
          ON CONFLICT (role_id, permission_id) DO NOTHING;
        `, [roleId, permId]);
      }
    }

    // 5. Create examiner_assignments table
    console.log('Creating examiner_assignments table...');
    await client.query(`
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
    `);

    // 6. Create institution_hod_assignments table with single active HOD unique index
    console.log('Creating institution_hod_assignments table...');
    await client.query(`
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
    `);

    // 7. Enforce single active institution HOD trigger on user_role_assignments
    console.log('Creating single active HOD trigger on user_role_assignments...');
    await client.query(`
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
    `);

    // 8. Add workflow fields to DocumentRequest and ExamResult
    console.log('Adding workflow fields to DocumentRequest and ExamResult...');
    await client.query(`
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
    `);

    await client.query('COMMIT;');
    console.log('✅ Phase 2 & 3 schema reconciliation completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    await client.end();
  }
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
