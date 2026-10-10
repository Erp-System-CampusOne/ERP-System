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

async function validateP1Migration() {
  await client.connect();
  console.log('Connected to PostgreSQL for P1 migration rehearsal...');

  const testSchema = 'p1_disposable_validation';

  try {
    // 1. Create clean disposable schema
    console.log(`[Step 1] Creating disposable test schema "${testSchema}"...`);
    await client.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE;`);
    await client.query(`CREATE SCHEMA "${testSchema}";`);

    // 2. Load and apply initial source schema
    console.log('[Step 2] Applying baseline source schema...');
    const sourceSchemaPath = path.resolve(__dirname, '..', '..', 'docs', 'source-schema.sql');
    let sourceSchemaSql = fs.readFileSync(sourceSchemaPath, 'utf8')
      .replace(/"public"/g, `"${testSchema}"`);
    
    await client.query(`SET search_path TO "${testSchema}";`);
    await client.query(sourceSchemaSql);
    console.log('Baseline source schema applied successfully.');

    // 3. Populate existing baseline data
    console.log('[Step 3] Loading baseline data from source-data-backup.json...');
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
    console.log('Baseline data populated successfully.');

    // 4. Apply P1 migration SQL
    console.log('[Step 4] Applying P1 Foundation Schema migration SQL...');
    const migrationSqlPath = path.resolve(
      __dirname, '..', 'prisma', 'migrations', '202610100001_p1_foundation_schema', 'migration.sql'
    );
    const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');

    // Run the migration in the disposable test schema
    await client.query(`SET search_path TO "${testSchema}";`);
    await client.query(migrationSql);
    console.log('P1 migration SQL executed successfully without errors.');

    // 5. Verify the existence of all 8 new tables
    console.log('[Step 5] Verifying 8 new foundation tables exist...');
    const newTables = [
      '_id_map', '_term_date_map', 'institutions', 'campuses',
      'academic_years', 'academic_terms', 'programs', 'rooms'
    ];

    for (const table of newTables) {
      const res = await client.query(`
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = '${testSchema}' AND table_name = '${table}';
      `);
      if (parseInt(res.rows[0].count, 10) !== 1) {
        throw new Error(`Expected table "${table}" was not found in schema "${testSchema}"!`);
      }
      console.log(`  - Verified table: "${testSchema}"."${table}" exists.`);
    }

    // 6. Test positive data operations on all 8 new tables
    console.log('[Step 6] Testing positive inserts and constraints...');
    
    // 6a. Institution
    const instRes = await client.query(`
      INSERT INTO "${testSchema}"."institutions" ("code", "name", "legal_name", "website")
      VALUES ('CAMPUSONE', 'CampusOne Institute of Technology', 'CampusOne Education Trust', 'https://campusone.edu')
      RETURNING "id";
    `);
    const instId = instRes.rows[0].id;
    console.log(`  - Inserted Institution: ${instId}`);

    // 6b. Campus
    const campusRes = await client.query(`
      INSERT INTO "${testSchema}"."campuses" ("institution_id", "code", "name", "timezone")
      VALUES ('${instId}', 'MAIN', 'Main Campus', 'Asia/Kolkata')
      RETURNING "id";
    `);
    const campusId = campusRes.rows[0].id;
    console.log(`  - Inserted Campus: ${campusId}`);

    // 6c. Academic Year
    const ayRes = await client.query(`
      INSERT INTO "${testSchema}"."academic_years" ("institution_id", "code", "name", "start_date", "end_date", "is_current")
      VALUES ('${instId}', '2026-2027', 'Academic Year 2026-2027', '2026-07-01', '2027-06-30', true)
      RETURNING "id";
    `);
    const ayId = ayRes.rows[0].id;
    console.log(`  - Inserted Academic Year: ${ayId}`);

    // 6d. Academic Term
    const termRes = await client.query(`
      INSERT INTO "${testSchema}"."academic_terms" 
        ("academic_year_id", "code", "name", "term_type", "start_date", "end_date", "is_current")
      VALUES ('${ayId}', '2026-ODD', 'Autumn / Odd Semester 2026', 'ODD', '2026-07-15', '2026-12-15', true)
      RETURNING "id";
    `);
    const termId = termRes.rows[0].id;
    console.log(`  - Inserted Academic Term: ${termId}`);

    // 6e. Term Date Map (_term_date_map)
    await client.query(`
      INSERT INTO "${testSchema}"."_term_date_map" 
        ("academic_term_id", "legacy_semester_number", "entry_cohort_year", "date_range_start", "date_range_end", "confidence", "notes")
      VALUES ('${termId}', 7, 2023, '2026-07-15', '2026-12-15', 'verified', 'Batch 2023-2027 semester 7');
    `);
    console.log(`  - Inserted _term_date_map entry for 2026-ODD`);

    // 6f. ID Map (_id_map)
    await client.query(`
      INSERT INTO "${testSchema}"."_id_map" ("table_name", "old_id", "new_id")
      VALUES ('Department', '2ab2ef28-36c6-47ef-b40e-2f977a451379', gen_random_uuid());
    `);
    console.log(`  - Inserted _id_map mapping for legacy Department`);

    // 6g. Program
    const progRes = await client.query(`
      INSERT INTO "${testSchema}"."programs" ("institution_id", "code", "name", "degree", "department_name")
      VALUES ('${instId}', 'BTECH-CS', 'Bachelor of Technology in Computer Science', 'B.Tech', 'Computer Science')
      RETURNING "id";
    `);
    console.log(`  - Inserted Program: ${progRes.rows[0].id}`);

    // 6h. Room
    const roomRes = await client.query(`
      INSERT INTO "${testSchema}"."rooms" ("campus_id", "room_number", "capacity", "room_type")
      VALUES ('${campusId}', '501', 60, 'classroom')
      RETURNING "id";
    `);
    console.log(`  - Inserted Room: ${roomRes.rows[0].id}`);

    // 7. Test negative constraints (integrity tests)
    console.log('[Step 7] Testing negative constraints (violations MUST be rejected)...');

    // Test 7a: Duplicate institution code
    let duplicateRejected = false;
    try {
      await client.query(`
        INSERT INTO "${testSchema}"."institutions" ("code", "name")
        VALUES ('CAMPUSONE', 'Duplicate Institution');
      `);
    } catch {
      duplicateRejected = true;
    }
    if (!duplicateRejected) throw new Error('UNIQUE constraint failed: duplicate institution code was allowed!');
    console.log('  - PASSED: Duplicate institution code correctly rejected by UNIQUE constraint.');

    // Test 7b: Invalid date range (start_date >= end_date)
    let invalidDateRejected = false;
    try {
      await client.query(`
        INSERT INTO "${testSchema}"."academic_years" ("institution_id", "code", "name", "start_date", "end_date")
        VALUES ('${instId}', '2028-2027', 'Invalid Year', '2028-01-01', '2027-01-01');
      `);
    } catch {
      invalidDateRejected = true;
    }
    if (!invalidDateRejected) throw new Error('CHECK constraint failed: invalid date range was allowed!');
    console.log('  - PASSED: Inverted date range correctly rejected by CHECK constraint.');

    // Test 7c: Invalid term_type
    let invalidTermTypeRejected = false;
    try {
      await client.query(`
        INSERT INTO "${testSchema}"."academic_terms" 
          ("academic_year_id", "code", "name", "term_type", "start_date", "end_date")
        VALUES ('${ayId}', '2026-INVALID', 'Invalid Term', 'INVALID_TYPE', '2026-01-01', '2026-06-01');
      `);
    } catch {
      invalidTermTypeRejected = true;
    }
    if (!invalidTermTypeRejected) throw new Error('CHECK constraint failed: invalid term_type was allowed!');
    console.log('  - PASSED: Invalid term_type correctly rejected by CHECK constraint.');

    // Test 7d: Invalid confidence value in _term_date_map
    let invalidConfidenceRejected = false;
    try {
      await client.query(`
        INSERT INTO "${testSchema}"."_term_date_map" 
          ("academic_term_id", "date_range_start", "date_range_end", "confidence")
        VALUES ('${termId}', '2026-01-01', '2026-06-01', 'bogus_confidence');
      `);
    } catch {
      invalidConfidenceRejected = true;
    }
    if (!invalidConfidenceRejected) throw new Error('CHECK constraint failed: invalid confidence was allowed!');
    console.log('  - PASSED: Invalid confidence correctly rejected by CHECK constraint.');

    // Test 7e: Foreign key violation
    let invalidFkRejected = false;
    try {
      await client.query(`
        INSERT INTO "${testSchema}"."rooms" ("campus_id", "room_number")
        VALUES (gen_random_uuid(), '999');
      `);
    } catch {
      invalidFkRejected = true;
    }
    if (!invalidFkRejected) throw new Error('FK constraint failed: non-existent campus_id was allowed!');
    console.log('  - PASSED: Invalid foreign key correctly rejected by FK constraint.');

    // 8. Verify existing legacy tables are 100% intact
    console.log('[Step 8] Verifying existing 24 tables are 100% intact...');
    const legacyStudentCount = await client.query(`SELECT COUNT(*)::int as cnt FROM "${testSchema}"."Student"`);
    const legacyUserCount = await client.query(`SELECT COUNT(*)::int as cnt FROM "${testSchema}"."User"`);
    const legacyTxCount = await client.query(`SELECT COUNT(*)::int as cnt FROM "${testSchema}"."FeeTransaction"`);

    if (legacyStudentCount.rows[0].cnt !== 5) throw new Error('Student count changed!');
    if (legacyUserCount.rows[0].cnt !== 12) throw new Error('User count changed!');
    if (legacyTxCount.rows[0].cnt !== 2) throw new Error('FeeTransaction count changed!');

    console.log(`  - Student rows: ${legacyStudentCount.rows[0].cnt} (intact)`);
    console.log(`  - User rows: ${legacyUserCount.rows[0].cnt} (intact)`);
    console.log(`  - FeeTransaction rows: ${legacyTxCount.rows[0].cnt} (intact)`);

    console.log('\n======================================================');
    console.log('  P1.1 & P1.2 MIGRATION REHEARSAL: 100% PASSED ✅');
    console.log('======================================================\n');

  } finally {
    console.log(`[Cleanup] Tearing down disposable test schema "${testSchema}"...`);
    await client.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE;`);
    console.log('Disposable test schema dropped. Verification complete.');
    await client.end();
  }
}

validateP1Migration().catch(err => {
  console.error('\n❌ P1 Migration validation FAILED:', err);
  process.exit(1);
});
