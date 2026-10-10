const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { Client } = require('pg');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not defined in .env');
  process.exit(1);
}

const client = new Client({ connectionString: dbUrl });

async function validateP13Migration() {
  await client.connect();
  console.log('Connected to PostgreSQL for P1.3 Identity & Security rehearsal...\n');

  const testSchema = 'p1_3_disposable_validation';

  try {
    // 1. Create clean disposable schema
    console.log(`[Check 1] Creating disposable test schema "${testSchema}"...`);
    await client.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE;`);
    await client.query(`CREATE SCHEMA "${testSchema}";`);

    // 2. Load and apply baseline source schema (legacy)
    console.log('[Check 2] Applying baseline source schema...');
    const sourceSchemaPath = path.resolve(__dirname, '..', '..', 'docs', 'source-schema.sql');
    let sourceSchemaSql = fs.readFileSync(sourceSchemaPath, 'utf8')
      .replace(/"public"/g, `"${testSchema}"`);
    
    await client.query(`SET search_path TO "${testSchema}";`);
    await client.query(sourceSchemaSql);

    // 3. Populate existing baseline data
    console.log('[Check 3] Populating baseline data from backup JSON...');
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
          `INSERT INTO "${testSchema}"."${table}" (${colNames}) VALUES (${placeholders})`,
          values
        );
      }
    }

    // 4. Apply P1.1 & P1.2 migration
    console.log('[Check 4] Applying P1.1 & P1.2 Foundation Schema migration...');
    const p1MigrationPath = path.resolve(
      __dirname, '..', 'prisma', 'migrations', '202610100001_p1_foundation_schema', 'migration.sql'
    );
    const p1MigrationSql = fs.readFileSync(p1MigrationPath, 'utf8');
    await client.query(`SET search_path TO "${testSchema}";`);
    await client.query(p1MigrationSql);

    // 5. Apply P1.3 Identity & Security migration
    console.log('[Check 5] Applying P1.3 Identity & Security migration SQL...');
    const p13MigrationPath = path.resolve(
      __dirname, '..', 'prisma', 'migrations', '202610100002_p1_identity_security', 'migration.sql'
    );
    const p13MigrationSql = fs.readFileSync(p13MigrationPath, 'utf8');
    await client.query(`SET search_path TO "${testSchema}";`);
    await client.query(p13MigrationSql);
    console.log('  -> P1.3 migration SQL applied cleanly with zero errors.');

    // 6. Verify presence of all 6 new tables
    console.log('\n[Check 6] Verifying presence of all 6 new security tables...');
    const newTables = [
      'roles', 'permissions', 'role_permissions',
      'user_role_assignments', 'user_credentials', 'auth_sessions'
    ];
    for (const t of newTables) {
      const res = await client.query(`
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = '${testSchema}' AND table_name = '${t}';
      `);
      if (parseInt(res.rows[0].count, 10) !== 1) {
        throw new Error(`Table "${t}" missing in schema "${testSchema}"!`);
      }
      console.log(`  ✅ Table "${testSchema}"."${t}" is present.`);
    }

    // 7. Seed canonical roles and permissions
    console.log('\n[Check 7] Seeding canonical roles, permissions, and test data...');
    const roleAdminRes = await client.query(`
      INSERT INTO "${testSchema}"."roles" ("code", "name", "description")
      VALUES ('admin', 'System Administrator', 'Full administrative authority')
      RETURNING "id";
    `);
    const adminRoleId = roleAdminRes.rows[0].id;

    const roleStudentRes = await client.query(`
      INSERT INTO "${testSchema}"."roles" ("code", "name", "description")
      VALUES ('student', 'Enrolled Student', 'Standard student access')
      RETURNING "id";
    `);
    const studentRoleId = roleStudentRes.rows[0].id;

    const roleFacultyRes = await client.query(`
      INSERT INTO "${testSchema}"."roles" ("code", "name", "description")
      VALUES ('faculty', 'Teaching Faculty', 'Course and grading access')
      RETURNING "id";
    `);
    const facultyRoleId = roleFacultyRes.rows[0].id;

    const perm1Res = await client.query(`
      INSERT INTO "${testSchema}"."permissions" ("code", "name", "module", "description")
      VALUES ('student.view', 'View Student Records', 'academic', 'Permission to view student profiles')
      RETURNING "id";
    `);
    const perm1Id = perm1Res.rows[0].id;

    const perm2Res = await client.query(`
      INSERT INTO "${testSchema}"."permissions" ("code", "name", "module", "description")
      VALUES ('student.manage', 'Manage Student Records', 'academic', 'Permission to create/edit student profiles')
      RETURNING "id";
    `);
    const perm2Id = perm2Res.rows[0].id;

    // Role-Permissions mapping
    await client.query(`
      INSERT INTO "${testSchema}"."role_permissions" ("role_id", "permission_id")
      VALUES ('${adminRoleId}', '${perm1Id}'), ('${adminRoleId}', '${perm2Id}'), ('${facultyRoleId}', '${perm1Id}');
    `);
    console.log('  -> Canonical roles, permissions, and role_permissions created successfully.');

    // 8. Test multi-role assignment for a single user
    console.log('\n[Check 8] Testing multi-role assignment for a single user...');
    // Grab an existing legacy user (e.g. first user in table)
    const userRes = await client.query(`SELECT "id", "email" FROM "${testSchema}"."User" LIMIT 1;`);
    const testUserId = userRes.rows[0].id;
    console.log(`  -> Selected user "${userRes.rows[0].email}" (id: ${testUserId})`);

    // Assign BOTH student and faculty roles to this user
    await client.query(`
      INSERT INTO "${testSchema}"."user_role_assignments" ("user_id", "role_id", "is_active")
      VALUES ('${testUserId}', '${studentRoleId}', true);
    `);
    await client.query(`
      INSERT INTO "${testSchema}"."user_role_assignments" ("user_id", "role_id", "is_active")
      VALUES ('${testUserId}', '${facultyRoleId}', true);
    `);
    const userRoleCountRes = await client.query(`
      SELECT COUNT(*)::int as cnt FROM "${testSchema}"."user_role_assignments"
      WHERE "user_id" = '${testUserId}';
    `);
    if (userRoleCountRes.rows[0].cnt !== 2) throw new Error('Multi-role assignment failed!');
    console.log('  ✅ PASSED: User successfully holds multiple active roles concurrently.');

    // 9. Test Decoupled User Credentials
    console.log('\n[Check 9] Testing decoupled user credentials...');
    await client.query(`
      INSERT INTO "${testSchema}"."user_credentials" 
        ("user_id", "credential_type", "password_hash", "algorithm", "requires_change")
      VALUES 
        ('${testUserId}', 'password', '$2b$10$e10adc3949ba59abbe56e057f20f883e', 'bcrypt', false);
    `);
    console.log('  ✅ PASSED: User credential record successfully stored.');

    // 10. Test Stateful Auth Session Lifecycle
    console.log('\n[Check 10] Testing auth sessions (issuance, lookup, revocation)...');
    const fakeTokenHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    const sessionRes = await client.query(`
      INSERT INTO "${testSchema}"."auth_sessions" 
        ("user_id", "session_token_hash", "ip_address", "user_agent", "is_active", "expires_at")
      VALUES 
        ('${testUserId}', '${fakeTokenHash}', '127.0.0.1', 'Mozilla/5.0 TestBrowser', true, '${expiresAt}')
      RETURNING "id";
    `);
    const sessionId = sessionRes.rows[0].id;

    // Revoke session
    await client.query(`
      UPDATE "${testSchema}"."auth_sessions"
      SET "is_active" = false, "revoked_at" = now(), "revocation_reason" = 'user_logout'
      WHERE "id" = '${sessionId}';
    `);

    const revokedSessionRes = await client.query(`
      SELECT "is_active", "revoked_at", "revocation_reason" 
      FROM "${testSchema}"."auth_sessions" WHERE "id" = '${sessionId}';
    `);
    const revRow = revokedSessionRes.rows[0];
    if (revRow.is_active !== false || !revRow.revoked_at || revRow.revocation_reason !== 'user_logout') {
      throw new Error('Session revocation state failed!');
    }
    console.log('  ✅ PASSED: Auth session created and revoked with explicit reason.');

    // 11. Negative Security & Integrity Tests (Violations MUST be rejected)
    console.log('\n[Check 11] Running negative integrity and constraint tests...');

    // Test 11a: Duplicate role code
    let dupRoleRejected = false;
    try {
      await client.query(`
        INSERT INTO "${testSchema}"."roles" ("code", "name")
        VALUES ('admin', 'Duplicate Admin');
      `);
    } catch { dupRoleRejected = true; }
    if (!dupRoleRejected) throw new Error('UNIQUE constraint failed: duplicate role code allowed!');
    console.log('  ✅ PASSED: Duplicate role code correctly rejected.');

    // Test 11b: Duplicate permission code
    let dupPermRejected = false;
    try {
      await client.query(`
        INSERT INTO "${testSchema}"."permissions" ("code", "name", "module")
        VALUES ('student.view', 'Duplicate Perm', 'academic');
      `);
    } catch { dupPermRejected = true; }
    if (!dupPermRejected) throw new Error('UNIQUE constraint failed: duplicate permission code allowed!');
    console.log('  ✅ PASSED: Duplicate permission code correctly rejected.');

    // Test 11c: Duplicate role-permission mapping
    let dupRolePermRejected = false;
    try {
      await client.query(`
        INSERT INTO "${testSchema}"."role_permissions" ("role_id", "permission_id")
        VALUES ('${adminRoleId}', '${perm1Id}');
      `);
    } catch { dupRolePermRejected = true; }
    if (!dupRolePermRejected) throw new Error('UNIQUE constraint failed: duplicate role_permission allowed!');
    console.log('  ✅ PASSED: Duplicate role_permission mapping correctly rejected.');

    // Test 11d: Duplicate user role assignment
    let dupUserRoleRejected = false;
    try {
      await client.query(`
        INSERT INTO "${testSchema}"."user_role_assignments" ("user_id", "role_id")
        VALUES ('${testUserId}', '${studentRoleId}');
      `);
    } catch { dupUserRoleRejected = true; }
    if (!dupUserRoleRejected) throw new Error('UNIQUE constraint failed: duplicate user_role_assignment allowed!');
    console.log('  ✅ PASSED: Duplicate user_role_assignment correctly rejected.');

    // Test 11e: Duplicate user credential type (one password per user)
    let dupCredRejected = false;
    try {
      await client.query(`
        INSERT INTO "${testSchema}"."user_credentials" ("user_id", "credential_type", "password_hash")
        VALUES ('${testUserId}', 'password', 'second_password_hash');
      `);
    } catch { dupCredRejected = true; }
    if (!dupCredRejected) throw new Error('UNIQUE constraint failed: duplicate credential type allowed!');
    console.log('  ✅ PASSED: Duplicate credential type correctly rejected.');

    // Test 11f: Invalid date check on user_role_assignments (valid_to <= valid_from)
    let invalidDatesRejected = false;
    try {
      await client.query(`
        INSERT INTO "${testSchema}"."user_role_assignments" 
          ("user_id", "role_id", "valid_from", "valid_to")
        VALUES ('${testUserId}', '${adminRoleId}', '2026-10-10 10:00:00', '2026-10-10 09:00:00');
      `);
    } catch { invalidDatesRejected = true; }
    if (!invalidDatesRejected) throw new Error('CHECK constraint failed: inverted dates allowed in role assignment!');
    console.log('  ✅ PASSED: Inverted valid_from/valid_to dates correctly rejected by CHECK constraint.');

    // Test 11g: Invalid foreign key (non-existent user)
    let invalidFkRejected = false;
    try {
      await client.query(`
        INSERT INTO "${testSchema}"."auth_sessions" 
          ("user_id", "session_token_hash", "expires_at")
        VALUES ('non-existent-user-cuid', 'some_token_hash_value', '${expiresAt}');
      `);
    } catch { invalidFkRejected = true; }
    if (!invalidFkRejected) throw new Error('FK constraint failed: non-existent user allowed in auth_sessions!');
    console.log('  ✅ PASSED: Non-existent user reference correctly rejected by FK constraint.');

    // 12. Verify Backward Compatibility (Legacy tables remain 100% intact)
    console.log('\n[Check 12] Verifying 100% backward compatibility of legacy data...');
    const legacyUserCount = await client.query(`SELECT COUNT(*)::int as cnt FROM "${testSchema}"."User"`);
    const legacyPermCount = await client.query(`SELECT COUNT(*)::int as cnt FROM "${testSchema}"."Permission"`);
    const legacyRolePermCount = await client.query(`SELECT COUNT(*)::int as cnt FROM "${testSchema}"."RolePermission"`);
    const legacyStudentCount = await client.query(`SELECT COUNT(*)::int as cnt FROM "${testSchema}"."Student"`);

    if (legacyUserCount.rows[0].cnt !== 12) throw new Error('Legacy User count changed!');
    if (legacyPermCount.rows[0].cnt !== 13) throw new Error('Legacy Permission count changed!');
    if (legacyRolePermCount.rows[0].cnt !== 4) throw new Error('Legacy RolePermission count changed!');
    if (legacyStudentCount.rows[0].cnt !== 5) throw new Error('Legacy Student count changed!');

    console.log(`  - Legacy "User" rows: ${legacyUserCount.rows[0].cnt} (intact)`);
    console.log(`  - Legacy "Permission" rows: ${legacyPermCount.rows[0].cnt} (intact)`);
    console.log(`  - Legacy "RolePermission" rows: ${legacyRolePermCount.rows[0].cnt} (intact)`);
    console.log(`  - Legacy "Student" rows: ${legacyStudentCount.rows[0].cnt} (intact)`);

    console.log('\n======================================================');
    console.log('  P1.3 IDENTITY & SECURITY REHEARSAL: 100% PASSED ✅');
    console.log('======================================================\n');

  } finally {
    console.log(`[Cleanup] Tearing down disposable test schema "${testSchema}"...`);
    await client.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE;`);
    console.log('Disposable test schema dropped. Verification complete.');
    await client.end();
  }
}

validateP13Migration().catch(err => {
  console.error('\n❌ P1.3 Rehearsal FAILED:', err);
  process.exit(1);
});
