/**
 * ==============================================================================
 * CampusOne ERP — Phase 2: Work Package P2.7C
 * Script: validate_p2_rehearsal.js
 *
 * Full Disposable PostgreSQL Rehearsal Runner:
 *   Suite 0: Environment isolation & safety assertion (Strictly non-Neon).
 *   Suite 1: Baseline restoration, Phase 1 & Phase 2 schema migration DDL.
 *   Suite 2: Deterministic backfill execution & 100% idempotency validation.
 *   Suite 3: Legacy source data SHA-256 fingerprint invariants.
 *   Suite 4: Institutional boundary & integrity rule enforcement (TD-1, TD-2, TD-3).
 *   Suite 5: Grade-correction security architecture (DAC, session isolation, atomic audit).
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { Client } = require('pg');

const { seedP14MasterData } = require('./seed_p1_4_master_data');
const { seedP2Backfill } = require('./seed_p2_backfill');

// Dedicated disposable test target configuration
const DISPOSABLE_DB_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres@127.0.0.1:5433/postgres';
const TEST_SCHEMA = 'p2_disposable_validation';

/**
 * Compute SHA-256 hash of table contents
 */
async function computeTableFingerprint(client, schema, tableName) {
  try {
    const res = await client.query(`
      SELECT encode(sha256(string_agg(t.*::text, '' ORDER BY t.*::text)::bytea), 'hex') AS hash,
             count(*) AS row_count
      FROM "${schema}"."${tableName}" t;
    `);
    return {
      hash: res.rows[0].hash || 'empty',
      rowCount: parseInt(res.rows[0].row_count, 10),
    };
  } catch (err) {
    return { hash: 'error', rowCount: -1, error: err.message };
  }
}

async function runP2DisposableRehearsal() {
  console.log('==============================================================================');
  console.log(' CampusOne ERP — P2.7 Disposable PostgreSQL Rehearsal Runner');
  console.log('==============================================================================\n');

  // ----------------------------------------------------------------------------
  // SUITE 0: Environment Isolation & Safety Verification
  // ----------------------------------------------------------------------------
  console.log('[Suite 0] Verifying Target Environment Isolation...');

  if (
    DISPOSABLE_DB_URL.includes('neon.tech') ||
    DISPOSABLE_DB_URL.includes('ep-green-pine-azr0z3ii') ||
    DISPOSABLE_DB_URL.includes('aws.neon.tech')
  ) {
    console.error('❌ CRITICAL SAFETY VIOLATION: Target connection string points to live Neon database!');
    process.exit(1);
  }

  const parsedUrl = new URL(DISPOSABLE_DB_URL);
  const host = parsedUrl.hostname;
  const port = parsedUrl.port;

  if (host !== '127.0.0.1' && host !== 'localhost') {
    console.error(`❌ CRITICAL SAFETY VIOLATION: Target host "${host}" is not local.`);
    process.exit(1);
  }

  if (port !== '5433') {
    console.error(`❌ SAFETY WARNING: Expected disposable port 5433, got "${port}". Aborting.`);
    process.exit(1);
  }

  console.log(`  🛡️ Safety Guard Active: Verified isolated target (${host}:${port}/${parsedUrl.pathname.slice(1)})`);
  console.log(`  🛡️ Live Neon PostgreSQL remains 100% untouched.\n`);

  const client = new Client({ connectionString: DISPOSABLE_DB_URL });
  await client.connect();

  const testStats = { total: 0, passed: 0, failed: 0 };
  const assert = (condition, testName, details = '') => {
    testStats.total++;
    if (condition) {
      testStats.passed++;
      console.log(`  ✅ PASSED: ${testName} ${details ? `(${details})` : ''}`);
    } else {
      testStats.failed++;
      console.error(`  ❌ FAILED: ${testName} ${details ? `(${details})` : ''}`);
    }
  };

  try {
    // ----------------------------------------------------------------------------
    // SUITE 1: Baseline Restoration & Schema Migration (P2.7A)
    // ----------------------------------------------------------------------------
    console.log('[Suite 1] Baseline Restoration & Schema Migration...');

    // 1.1 Create clean test schema
    await client.query(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE;`);
    await client.query(`CREATE SCHEMA "${TEST_SCHEMA}";`);
    await client.query(`SET search_path TO "${TEST_SCHEMA}";`);

    // 1.2 Load baseline legacy source schema
    const sourceSchemaPath = path.resolve(__dirname, '..', '..', 'docs', 'source-schema.sql');
    let sourceSchemaSql = fs.readFileSync(sourceSchemaPath, 'utf8')
      .replace(/"public"/g, `"${TEST_SCHEMA}"`);
    await client.query(sourceSchemaSql);

    // 1.3 Populate legacy data
    const jsonPath = path.resolve(__dirname, '..', '..', 'docs', 'source-data-backup.json');
    const backupData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    const TABLE_ORDER = [
      'User', 'Department', 'Permission', 'RolePermission', 'Faculty',
      'Course', 'Student', 'FeeStructure', 'FeeTransaction', 'Examination',
      'ExamResult', 'AttendanceRecord', 'Book', 'CirculationRecord', 'FineRecord',
      'Notice', 'LeaveRequest', 'TimetableEntry', 'AdmissionApplication',
      'DocumentRequest', 'ExpenseRecord', 'PlacementRecord', 'ResearchGrant',
      'SystemActivity', '_prisma_migrations'
    ];

    for (const table of TABLE_ORDER) {
      const rows = backupData[table] || [];
      for (const row of rows) {
        const cols = Object.keys(row);
        const colNames = cols.map(c => `"${c}"`).join(', ');
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const values = cols.map(c => row[c]);
        await client.query(
          `INSERT INTO "${TEST_SCHEMA}"."${table}" (${colNames}) VALUES (${placeholders})`,
          values
        );
      }
    }

    // Baseline fingerprints of legacy tables
    const baselineFingerprints = {};
    for (const table of TABLE_ORDER) {
      baselineFingerprints[table] = await computeTableFingerprint(client, TEST_SCHEMA, table);
    }
    console.log('  -> Baseline legacy data loaded and fingerprinted.');

    // 1.4 Apply P1.1 / P1.2 Foundation Schema Migration
    const p1MigrationPath = path.resolve(
      __dirname, '..', 'prisma', 'migrations', '202610100001_p1_foundation_schema', 'migration.sql'
    );
    await client.query(fs.readFileSync(p1MigrationPath, 'utf8'));

    // 1.5 Apply P1.3 Identity & Security Migration
    const p13MigrationPath = path.resolve(
      __dirname, '..', 'prisma', 'migrations', '202610100002_p1_identity_security', 'migration.sql'
    );
    await client.query(fs.readFileSync(p13MigrationPath, 'utf8'));

    // 1.6 Run P1.4 Master-Data Seed
    await seedP14MasterData(client, { schema: TEST_SCHEMA, silent: true });

    // 1.7 Seed Canonical Roles for P1.3 (admin, faculty, student)
    // Note: exam_controller is omitted as it does not exist in the ratified P1.3 role model.
    const roleAdminRes = await client.query(`
      INSERT INTO "${TEST_SCHEMA}"."roles" ("code", "name", "description")
      VALUES ('admin', 'System Administrator', 'Full administrative authority')
      RETURNING "id";
    `);
    const adminRoleId = roleAdminRes.rows[0].id;

    const roleFacultyRes = await client.query(`
      INSERT INTO "${TEST_SCHEMA}"."roles" ("code", "name", "description")
      VALUES ('faculty', 'Teaching Faculty', 'Course and instruction authority')
      RETURNING "id";
    `);
    const facultyRoleId = roleFacultyRes.rows[0].id;

    const roleStudentRes = await client.query(`
      INSERT INTO "${TEST_SCHEMA}"."roles" ("code", "name", "description")
      VALUES ('student', 'Student', 'Student access')
      RETURNING "id";
    `);
    const studentRoleId = roleStudentRes.rows[0].id;

    // Assign roles to legacy users
    const adminUser = '2f2441bb-8500-48c8-a23f-d6b38f22dfed'; // Legacy admin
    const studentUser = '9b5ebcb4-c010-44dd-bbbf-3261f42882a4'; // Legacy student

    await client.query(`
      INSERT INTO "${TEST_SCHEMA}"."user_role_assignments" ("user_id", "role_id", "is_active")
      VALUES ('${adminUser}', '${adminRoleId}', true), ('${studentUser}', '${studentRoleId}', true);
    `);

    // 1.8 Apply P2 Migration SQL (202610100003_p2_student_faculty_lifecycle)
    console.log('  -> Applying Phase 2 migration SQL (202610100003_p2_student_faculty_lifecycle)...');
    const p2MigrationPath = path.resolve(
      __dirname, '..', 'prisma', 'migrations', '202610100003_p2_student_faculty_lifecycle', 'migration.sql'
    );
    const p2MigrationSql = fs.readFileSync(p2MigrationPath, 'utf8')
      .replace(/search_path = pg_catalog, public/g, `search_path = pg_catalog, ${TEST_SCHEMA}, public`);
    await client.query(p2MigrationSql);

    // 1.9 Verify Schema DDL & Constraints
    const phase2Tables = [
      'employee_profiles',
      'faculty_profiles',
      'department_appointments',
      'student_profiles',
      'student_program_enrollments',
      'student_term_registrations'
    ];

    for (const t of phase2Tables) {
      const existsRes = await client.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2);`,
        [TEST_SCHEMA, t]
      );
      assert(existsRes.rows[0].exists, `Table exists: "${t}"`);
    }

    // Verify partial unique indexes on department_appointments
    const pidx1 = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = $1 AND tablename = 'department_appointments' AND indexname = 'uq_dept_active_hod';
    `, [TEST_SCHEMA]);
    assert(pidx1.rows.length === 1, 'Partial unique index "uq_dept_active_hod" exists');

    const pidx2 = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = $1 AND tablename = 'department_appointments' AND indexname = 'uq_emp_active_primary_appointment';
    `, [TEST_SCHEMA]);
    assert(pidx2.rows.length === 1, 'Partial unique index "uq_emp_active_primary_appointment" exists');

    // Verify stored procedure exists
    const procRes = await client.query(`
      SELECT routine_name FROM information_schema.routines
      WHERE routine_schema = $1 AND routine_name = 'sp_apply_grade_correction';
    `, [TEST_SCHEMA]);
    assert(procRes.rows.length === 1, 'Stored procedure "sp_apply_grade_correction" exists');

    // ----------------------------------------------------------------------------
    // SUITE 2: Backfill Execution & 100% Idempotency Validation (P2.7B)
    // ----------------------------------------------------------------------------
    console.log('\n[Suite 2] Backfill Execution & Idempotency Testing...');

    // Run 1: Initial Backfill
    const run1Report = await seedP2Backfill(client, { schema: TEST_SCHEMA, silent: true });
    assert(run1Report.success === true, 'Backfill Run 1 completed successfully');
    assert(run1Report.employeeProfiles.inserted === 7, 'Run 1 inserted 7 employee profiles (2 faculty + 5 staff)', `got ${run1Report.employeeProfiles.inserted}`);
    assert(run1Report.facultyProfiles.inserted === 2, 'Run 1 inserted 2 faculty profiles', `got ${run1Report.facultyProfiles.inserted}`);
    assert(run1Report.departmentAppointments.inserted === 2, 'Run 1 inserted 2 primary department appointments', `got ${run1Report.departmentAppointments.inserted}`);
    assert(run1Report.studentProfiles.inserted === 5, 'Run 1 inserted 5 student profiles', `got ${run1Report.studentProfiles.inserted}`);
    assert(run1Report.studentProgramEnrollments.inserted === 5, 'Run 1 inserted 5 program enrollments (4 active + 1 quarantined)', `got ${run1Report.studentProgramEnrollments.inserted}`);
    assert(run1Report.studentProgramEnrollments.quarantined === 1, 'Run 1 quarantined exactly 1 student enrollment', `got ${run1Report.studentProgramEnrollments.quarantined}`);
    assert(run1Report.studentTermRegistrations.inserted === 4, 'Run 1 staged 4 draft term registrations for active students', `got ${run1Report.studentTermRegistrations.inserted}`);
    assert(run1Report.studentTermRegistrations.historicalManufactured === 0, 'Zero historical terms manufactured (semesters 1-6 unrecorded)');

    // Run 2: Idempotency Check
    const run2Report = await seedP2Backfill(client, { schema: TEST_SCHEMA, silent: true });
    assert(run2Report.success === true, 'Backfill Run 2 completed successfully');
    assert(run2Report.employeeProfiles.inserted === 0, 'Run 2 inserted 0 employee profiles (idempotent)', `got ${run2Report.employeeProfiles.inserted}`);
    assert(run2Report.facultyProfiles.inserted === 0, 'Run 2 inserted 0 faculty profiles (idempotent)', `got ${run2Report.facultyProfiles.inserted}`);
    assert(run2Report.departmentAppointments.inserted === 0, 'Run 2 inserted 0 department appointments (idempotent)', `got ${run2Report.departmentAppointments.inserted}`);
    assert(run2Report.studentProfiles.inserted === 0, 'Run 2 inserted 0 student profiles (idempotent)', `got ${run2Report.studentProfiles.inserted}`);
    assert(run2Report.studentProgramEnrollments.inserted === 0, 'Run 2 inserted 0 program enrollments (idempotent)', `got ${run2Report.studentProgramEnrollments.inserted}`);
    assert(run2Report.studentTermRegistrations.inserted === 0, 'Run 2 inserted 0 term registrations (idempotent)', `got ${run2Report.studentTermRegistrations.inserted}`);

    // Verify Quarantined Student Isolation
    const qEnrollmentRes = await client.query(`
      SELECT spe."enrollment_status", spe."cohort_batch"
      FROM "${TEST_SCHEMA}"."student_program_enrollments" spe
      JOIN "${TEST_SCHEMA}"."student_profiles" sp ON spe."student_profile_id" = sp."id"
      JOIN "${TEST_SCHEMA}"."Student" s ON sp."student_number" = s."rollNumber"
      WHERE s."batch" = '2026-2026';
    `);
    assert(
      qEnrollmentRes.rows.length === 1 && qEnrollmentRes.rows[0].enrollment_status === 'quarantined',
      'Unresolved student is explicitly quarantined in student_program_enrollments'
    );

    const qTermRes = await client.query(`
      SELECT count(*)
      FROM "${TEST_SCHEMA}"."student_term_registrations" str
      JOIN "${TEST_SCHEMA}"."student_program_enrollments" spe ON str."program_enrollment_id" = spe."id"
      JOIN "${TEST_SCHEMA}"."student_profiles" sp ON spe."student_profile_id" = sp."id"
      JOIN "${TEST_SCHEMA}"."Student" s ON sp."student_number" = s."rollNumber"
      WHERE s."batch" = '2026-2026';
    `);
    assert(
      parseInt(qTermRes.rows[0].count, 10) === 0,
      'Unresolved student has ZERO term registrations (isolated from academic progression)'
    );

    // ----------------------------------------------------------------------------
    // SUITE 3: Legacy Source Data Fingerprint Verification
    // ----------------------------------------------------------------------------
    console.log('\n[Suite 3] Legacy Source Data SHA-256 Fingerprint Verification...');

    let fingerprintsMatch = true;
    for (const table of TABLE_ORDER) {
      if (table === '_prisma_migrations') continue;
      const currentFp = await computeTableFingerprint(client, TEST_SCHEMA, table);
      const baselineFp = baselineFingerprints[table];
      if (currentFp.hash !== baselineFp.hash || currentFp.rowCount !== baselineFp.rowCount) {
        fingerprintsMatch = false;
        console.error(`  ❌ Fingerprint mismatch on legacy table "${table}": expected ${baselineFp.hash}, got ${currentFp.hash}`);
      }
    }
    assert(fingerprintsMatch, 'All 22 legacy source tables have 100% identical SHA-256 fingerprints before and after backfill');

    // ----------------------------------------------------------------------------
    // SUITE 4: Institutional Boundary & Integrity Rules
    // ----------------------------------------------------------------------------
    console.log('\n[Suite 4] Institutional Boundary & Integrity Rule Enforcement...');

    // Setup second institution and campus for cross-tenant boundary negative tests
    const inst2Res = await client.query(`
      INSERT INTO "${TEST_SCHEMA}"."institutions" ("code", "name")
      VALUES ('INST_OTHER', 'Other Test University')
      RETURNING "id";
    `);
    const otherInstId = inst2Res.rows[0].id;

    const campus2Res = await client.query(`
      INSERT INTO "${TEST_SCHEMA}"."campuses" ("institution_id", "code", "name")
      VALUES ('${otherInstId}', 'CAMPUS_OTHER', 'Secondary Campus')
      RETURNING "id";
    `);
    const otherCampusId = campus2Res.rows[0].id;

    const ay2Res = await client.query(`
      INSERT INTO "${TEST_SCHEMA}"."academic_years" ("institution_id", "code", "name", "start_date", "end_date")
      VALUES ('${otherInstId}', '2026-2027', '2026-2027 Other', '2026-07-01', '2027-06-30')
      RETURNING "id";
    `);
    const otherAyId = ay2Res.rows[0].id;

    const term2Res = await client.query(`
      INSERT INTO "${TEST_SCHEMA}"."academic_terms" ("academic_year_id", "code", "name", "term_type", "start_date", "end_date")
      VALUES ('${otherAyId}', '2026-ODD', '2026 Fall Other', 'ODD', '2026-07-15', '2026-12-15')
      RETURNING "id";
    `);
    const otherTermId = term2Res.rows[0].id;

    const prog2Res = await client.query(`
      INSERT INTO "${TEST_SCHEMA}"."programs" ("institution_id", "code", "name", "degree")
      VALUES ('${otherInstId}', 'BTECH-EE', 'Electrical Engineering', 'B.Tech')
      RETURNING "id";
    `);
    const otherProgId = prog2Res.rows[0].id;

    // Test BND-01: Cross-institution program enrollment (TD-2)
    let bnd01Caught = false;
    try {
      const anyStudentRes = await client.query(`SELECT "id" FROM "${TEST_SCHEMA}"."student_profiles" LIMIT 1;`);
      const studentProfileId = anyStudentRes.rows[0].id;

      // Attempt to enroll student from CAMPUSONE into program from INST_OTHER with enrollment inst = CAMPUSONE
      await client.query(`
        INSERT INTO "${TEST_SCHEMA}"."student_program_enrollments"
          ("student_profile_id", "program_id", "institution_id", "entry_term_id", "cohort_batch", "enrolled_on")
        VALUES
          ($1, $2, (SELECT "institution_id" FROM "${TEST_SCHEMA}"."student_profiles" WHERE id = $1), $3, '2026-2030', '2026-08-01');
      `, [studentProfileId, otherProgId, otherTermId]);
    } catch (e) {
      bnd01Caught = e.code === '23514'; // check_violation
    }
    assert(bnd01Caught, 'BND-01: Cross-institution program enrollment rejected by trg_spe_institution_boundary (SQLSTATE 23514)');

    // Test BND-02: Cross-campus department appointment (TD-3)
    let bnd02Caught = false;
    try {
      const anyEmpRes = await client.query(`SELECT "id" FROM "${TEST_SCHEMA}"."employee_profiles" LIMIT 1;`);
      const empId = anyEmpRes.rows[0].id;
      const deptRes = await client.query(`SELECT "id" FROM "${TEST_SCHEMA}"."Department" LIMIT 1;`);
      const deptId = deptRes.rows[0].id;

      // Attempt to assign employee from CAMPUSONE to otherCampusId (INST_OTHER)
      await client.query(`
        INSERT INTO "${TEST_SCHEMA}"."department_appointments"
          ("employee_profile_id", "department_id", "campus_id", "appointment_role", "starts_on")
        VALUES
          ($1, $2, $3, 'secondary_member', '2026-08-01');
      `, [empId, deptId, otherCampusId]);
    } catch (e) {
      bnd02Caught = e.code === '23514';
    }
    assert(bnd02Caught, 'BND-02: Cross-institution department appointment rejected by trg_da_institution_boundary (SQLSTATE 23514)');

    // Test BND-03: HOD primary membership requirement
    let bnd03Caught = false;
    try {
      // Find an employee without primary appointment in department
      const staffEmpRes = await client.query(`
        SELECT ep."id" FROM "${TEST_SCHEMA}"."employee_profiles" ep
        WHERE NOT EXISTS (
          SELECT 1 FROM "${TEST_SCHEMA}"."department_appointments" da WHERE da."employee_profile_id" = ep."id"
        ) LIMIT 1;
      `);
      const staffEmpId = staffEmpRes.rows[0].id;
      const deptRes = await client.query(`SELECT "id" FROM "${TEST_SCHEMA}"."Department" LIMIT 1;`);
      const deptId = deptRes.rows[0].id;
      const campusRes = await client.query(`SELECT "id" FROM "${TEST_SCHEMA}"."campuses" WHERE "code" = 'MAIN' LIMIT 1;`);
      const campusId = campusRes.rows[0].id;

      // Attempt to appoint as HOD directly
      await client.query(`
        INSERT INTO "${TEST_SCHEMA}"."department_appointments"
          ("employee_profile_id", "department_id", "campus_id", "appointment_role", "starts_on")
        VALUES
          ($1, $2, $3, 'head_of_department', '2026-08-01');
      `, [staffEmpId, deptId, campusId]);
    } catch (e) {
      bnd03Caught = e.code === '23514';
    }
    assert(bnd03Caught, 'BND-03: Head of Department appointment without primary membership rejected by trg_da_hod_primary_membership (SQLSTATE 23514)');

    // Test TD-1: Admissions Foreign-Key Deletion Safety (ON DELETE RESTRICT)
    let td1RestrictCaught = false;
    const testAppRes = await client.query(`
      INSERT INTO "${TEST_SCHEMA}"."AdmissionApplication"
        ("id", "applicantName", "applicationId", "program", "department", "category", "quota", "status", "updatedAt")
      VALUES
        ('TEST-APP-UUID-01', 'Test Candidate', 'APP20260001', 'B.Tech', 'CS101', 'General', 'General', 'approved', CURRENT_TIMESTAMP)
      RETURNING "id";
    `);
    const testAppId = testAppRes.rows[0].id;

    // Link test admission application to an enrollment
    const testEnrollRes = await client.query(`
      SELECT "id" FROM "${TEST_SCHEMA}"."student_program_enrollments"
      WHERE "enrollment_status" = 'active' LIMIT 1;
    `);
    const testEnrollId = testEnrollRes.rows[0].id;

    await client.query(`
      UPDATE "${TEST_SCHEMA}"."student_program_enrollments"
      SET "admission_application_id" = $1
      WHERE "id" = $2;
    `, [testAppId, testEnrollId]);

    try {
      await client.query(`DELETE FROM "${TEST_SCHEMA}"."AdmissionApplication" WHERE "id" = $1;`, [testAppId]);
    } catch (e) {
      td1RestrictCaught = e.code === '23503'; // foreign_key_violation due to RESTRICT
    }
    assert(td1RestrictCaught, 'TD-1: Deleting referenced AdmissionApplication rejected via ON DELETE RESTRICT (SQLSTATE 23503)');

    // Clean up test link
    await client.query(`UPDATE "${TEST_SCHEMA}"."student_program_enrollments" SET "admission_application_id" = NULL WHERE "id" = $1;`, [testEnrollId]);
    await client.query(`DELETE FROM "${TEST_SCHEMA}"."AdmissionApplication" WHERE "id" = $1;`, [testAppId]);

    // Test BND-04: Cross-institution term registration
    let bnd04Caught = false;
    try {
      await client.query(`
        INSERT INTO "${TEST_SCHEMA}"."student_term_registrations"
          ("program_enrollment_id", "academic_term_id", "semester_number", "section", "registration_status")
        VALUES
          ($1, $2, 6, 'A', 'draft');
      `, [testEnrollId, otherTermId]);
    } catch (e) {
      bnd04Caught = e.code === '23514'; // check_violation from trg_str_institution_boundary
    }
    assert(bnd04Caught, 'BND-04: Cross-institution term registration rejected by trg_str_institution_boundary (SQLSTATE 23514)');

    // ----------------------------------------------------------------------------
    // SUITE 5: Grade-Correction Security Architecture (Guardrail A)
    // ----------------------------------------------------------------------------
    console.log('\n[Suite 5] Grade-Correction Security Architecture & Guardrails...');

    // 5.1 Create application role 'campusone_app'
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'campusone_app') THEN
          CREATE ROLE campusone_app WITH LOGIN PASSWORD 'test_disposable_password_only';
        END IF;
      END $$;
    `);

    // Grant usage and permissions to campusone_app
    await client.query(`GRANT USAGE ON SCHEMA "${TEST_SCHEMA}" TO campusone_app;`);
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "${TEST_SCHEMA}" TO campusone_app;`);

    // Layer 1: REVOKE table-level update and grant only unprivileged columns (notes, section)
    await client.query(`REVOKE UPDATE ON "${TEST_SCHEMA}"."student_term_registrations" FROM campusone_app;`);
    await client.query(`GRANT UPDATE ("notes", "section") ON "${TEST_SCHEMA}"."student_term_registrations" TO campusone_app;`);

    // Grant execute on procedure
    await client.query(`GRANT EXECUTE ON PROCEDURE "${TEST_SCHEMA}".sp_apply_grade_correction TO campusone_app;`);

    // 5.2 Setup a test completed registration using valid term in CAMPUSONE
    const validTermRes = await client.query(`
      SELECT t."id" FROM "${TEST_SCHEMA}"."academic_terms" t
      JOIN "${TEST_SCHEMA}"."academic_years" ay ON t."academic_year_id" = ay."id"
      JOIN "${TEST_SCHEMA}"."institutions" i ON ay."institution_id" = i."id"
      WHERE i."code" = 'CAMPUSONE' AND t."code" = '2026-EVEN' LIMIT 1;
    `);
    const validCompletedTermId = validTermRes.rows[0].id;

    const testRegRes = await client.query(`
      INSERT INTO "${TEST_SCHEMA}"."student_term_registrations"
        ("program_enrollment_id", "academic_term_id", "semester_number", "section",
         "registration_status", "registered_on", "completed_on", "term_gpa", "cumulative_cgpa",
         "credits_attempted", "credits_earned", "attendance_percentage", "academic_standing")
      VALUES
        ($1, $2, 6, 'A', 'completed', '2026-01-10', '2026-06-15', 7.50, 7.50, 20.0, 20.0, 85.0, 'good_standing')
      RETURNING "id";
    `, [testEnrollId, validCompletedTermId]);
    const completedRegId = testRegRes.rows[0].id;

    // SEC-00A: SECURITY DEFINER ownership and search_path verification
    const procDefRes = await client.query(`
      SELECT p.prosecdef, p.proconfig, r.rolname AS owner_name
      FROM pg_proc p
      JOIN pg_roles r ON p.proowner = r.oid
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = '${TEST_SCHEMA}' AND p.proname = 'sp_apply_grade_correction';
    `);
    const procDef = procDefRes.rows[0];
    assert(
      procDef && procDef.prosecdef === true && procDef.owner_name === 'postgres',
      'SEC-00A: sp_apply_grade_correction is owned by postgres with SECURITY DEFINER active'
    );

    // SEC-00B: Schema object creation isolation (untrusted roles cannot shadow objects)
    let shadowCreateBlocked = false;
    try {
      await client.query(`
        SET ROLE campusone_app;
        CREATE TABLE "${TEST_SCHEMA}".shadow_table (id int);
        RESET ROLE;
      `);
    } catch (e) {
      shadowCreateBlocked = e.code === '42501'; // permission denied for schema
      await client.query('RESET ROLE;');
    }
    assert(
      shadowCreateBlocked,
      'SEC-00B: Untrusted role campusone_app cannot create objects in schema (SQLSTATE 42501)'
    );

    // SEC-01: Direct update to term_gpa as campusone_app
    let sec01Caught = false;
    try {
      await client.query(`
        SET ROLE campusone_app;
        UPDATE "${TEST_SCHEMA}"."student_term_registrations" SET "term_gpa" = 9.50 WHERE "id" = '${completedRegId}';
        RESET ROLE;
      `);
    } catch (e) {
      sec01Caught = e.code === '42501'; // permission denied for column term_gpa
      await client.query('RESET ROLE;');
    }
    assert(sec01Caught, 'SEC-01: Direct column UPDATE on term_gpa denied for role campusone_app (SQLSTATE 42501)');

    // SEC-02: Session variable bypass attempt
    let sec02Caught = false;
    try {
      await client.query(`
        SET ROLE campusone_app;
        SET app.authorized_grade_correction = 'true';
        UPDATE "${TEST_SCHEMA}"."student_term_registrations" SET "term_gpa" = 9.50 WHERE "id" = '${completedRegId}';
        RESET ROLE;
      `);
    } catch (e) {
      sec02Caught = e.code === '42501'; // DAC layer denies UPDATE regardless of session variable!
      await client.query('RESET ROLE;');
    }
    assert(sec02Caught, 'SEC-02: Setting app.authorized_grade_correction cannot bypass DAC column revocation (SQLSTATE 42501)');

    // SEC-03: Unauthorized procedure call (caller possesses only student role)
    let sec03Caught = false;
    try {
      await client.query(`
        SET ROLE campusone_app;
        CALL "${TEST_SCHEMA}".sp_apply_grade_correction(
          '${completedRegId}', '${studentUser}', 8.80, 8.80, 20.0, 'Unauthorized attempt', 'MEMO-001'
        );
        RESET ROLE;
      `);
    } catch (e) {
      sec03Caught = e.code === '42501'; // insufficient_privilege: User does not possess administrative or exam controller role
      await client.query('RESET ROLE;');
    }
    assert(sec03Caught, 'SEC-03: sp_apply_grade_correction with non-admin caller denied (SQLSTATE 42501: insufficient_privilege)');

    // SEC-04: Authorized procedure execution & Atomic Audit
    await client.query(`
      SET ROLE campusone_app;
      CALL "${TEST_SCHEMA}".sp_apply_grade_correction(
        '${completedRegId}', '${adminUser}', 8.25, 8.25, 20.0, 'Grade correction ratified by academic council', 'SENATE-RES-2026-042'
      );
      RESET ROLE;
    `);

    const updatedRegRes = await client.query(
      `SELECT "term_gpa", "cumulative_cgpa" FROM "${TEST_SCHEMA}"."student_term_registrations" WHERE "id" = $1;`,
      [completedRegId]
    );
    const updatedGpa = parseFloat(updatedRegRes.rows[0].term_gpa);
    assert(updatedGpa === 8.25, 'SEC-04 (Part A): Authorized grade correction successfully updated term_gpa to 8.25');

    const auditRes = await client.query(`
      SELECT "action", "description" FROM "${TEST_SCHEMA}"."SystemActivity"
      WHERE "action" = 'GRADE_CORRECTION'
      ORDER BY "timestamp" DESC LIMIT 1;
    `);
    const auditRow = auditRes.rows[0];
    const auditDesc = JSON.parse(auditRow.description);
    assert(
      auditRow && auditDesc.registration_id === completedRegId && auditDesc.new_term_gpa === 8.25,
      'SEC-04 (Part B): Atomic audit row recorded in SystemActivity with full metadata payload'
    );

    // SEC-05: Atomic rollback on failure
    let sec05Caught = false;
    try {
      await client.query(`
        SET ROLE campusone_app;
        CALL "${TEST_SCHEMA}".sp_apply_grade_correction(
          '${completedRegId}', '${adminUser}', 9.00, 9.00, 25.0, 'Invalid credits exceed attempted', 'MEMO-BAD'
        );
        RESET ROLE;
      `);
    } catch (e) {
      sec05Caught = e.code === '23514'; // check_violation: credits earned exceeds attempted
      await client.query('RESET ROLE;');
    }
    assert(sec05Caught, 'SEC-05 (Part A): Procedure aborts on integrity constraint failure (SQLSTATE 23514)');

    const postErrorRegRes = await client.query(
      `SELECT "term_gpa" FROM "${TEST_SCHEMA}"."student_term_registrations" WHERE "id" = $1;`,
      [completedRegId]
    );
    assert(parseFloat(postErrorRegRes.rows[0].term_gpa) === 8.25, 'SEC-05 (Part B): Injected failure rolled back atomic work; term_gpa remains 8.25');

    console.log('\n==============================================================================');
    console.log(` Rehearsal Summary: ${testStats.passed}/${testStats.total} Tests Passed (${testStats.failed} Failed)`);
    console.log('==============================================================================\n');

    if (testStats.failed > 0) {
      throw new Error(`Rehearsal encountered ${testStats.failed} test failures.`);
    }

    return { success: true, stats: testStats };
  } finally {
    await client.end();
  }
}

module.exports = { runP2DisposableRehearsal };

if (require.main === module) {
  runP2DisposableRehearsal()
    .then(() => {
      console.log('✅ DISPOSABLE REHEARSAL COMPLETED WITH ZERO DEFECTS.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ DISPOSABLE REHEARSAL FAILED:', err);
      process.exit(1);
    });
}
