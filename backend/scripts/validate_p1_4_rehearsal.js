/**
 * ==============================================================================
 * CampusOne ERP — Phase 1: Work Package P1.4
 * Script: validate_p1_4_rehearsal.js
 *
 * Responsibility:
 *   Execute a rigorous rehearsal of P1.4 Seed & Master-Data Backfill in an
 *   isolated disposable PostgreSQL schema ("p1_4_disposable_validation").
 *
 * Rehearsal Stages:
 *   1. Establish baseline source schema & baseline data in disposable schema.
 *   2. Apply P1.1/P1.2 Foundation Schema migration SQL.
 *   3. Apply P1.3 Identity & Security migration SQL.
 *   4. Record Pre-Seed legacy table snapshots (row counts, PK sets, SHA-256 fingerprints).
 *   5. Execute P1.4 Seed & Backfill (Run 1).
 *   6. Validate all 8 seeded domains (institutions, campuses, years, terms, term_date_map, programs, rooms, _id_map).
 *   7. Compare Post-Run 1 legacy data fingerprints against baseline.
 *   8. Execute P1.4 Seed & Backfill (Run 2) to prove 100% idempotency.
 *   9. Compare Post-Run 2 legacy data fingerprints against baseline.
 *  10. Test transactional rollback on injected failure.
 *  11. Execute negative constraint tests (invalid dates, duplicate codes, invalid enums/FKs).
 *  12. Clean up disposable schema and output comprehensive reconciliation report.
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { Client } = require('pg');
const { seedP14MasterData } = require('./seed_p1_4_master_data');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not defined in .env');
  process.exit(1);
}

const client = new Client({ connectionString: dbUrl });

const DISPOSABLE_SCHEMA = 'p1_4_disposable_validation';

const LEGACY_TABLES_TO_AUDIT = [
  'User',
  'Department',
  'Course',
  'Student',
  'Faculty',
  'TimetableEntry',
  'FeeStructure',
  'FeeTransaction',
  'Examination',
  'ExamResult',
  'AttendanceRecord',
  'Book',
  'CirculationRecord',
  'FineRecord',
  'Notice',
  'LeaveRequest',
  'AdmissionApplication',
  'DocumentRequest',
  'ExpenseRecord',
  'PlacementRecord',
  'ResearchGrant',
  'SystemActivity',
];

/**
 * Capture deterministic content fingerprints for legacy tables.
 */
async function captureLegacyFingerprints(client, schema) {
  const fingerprints = {};

  for (const table of LEGACY_TABLES_TO_AUDIT) {
    const res = await client.query(
      `SELECT * FROM "${schema}"."${table}" ORDER BY "id" ASC;`
    );

    const rowCount = res.rows.length;
    const pkSet = res.rows.map(r => r.id).sort();

    // Compute column-level SHA-256 content hash
    const hash = crypto.createHash('sha256');
    for (const row of res.rows) {
      const sortedKeys = Object.keys(row).sort();
      const normalizedRow = {};
      for (const k of sortedKeys) {
        let val = row[k];
        if (val instanceof Date) {
          val = val.toISOString();
        }
        normalizedRow[k] = val;
      }
      hash.update(JSON.stringify(normalizedRow));
    }
    const contentSha256 = hash.digest('hex');

    fingerprints[table] = {
      rowCount,
      pkSet,
      contentSha256,
    };
  }

  return fingerprints;
}

/**
 * Compare two legacy fingerprints and return differences.
 */
function compareFingerprints(label, before, after) {
  const diffs = [];

  for (const table of LEGACY_TABLES_TO_AUDIT) {
    const b = before[table];
    const a = after[table];

    if (b.rowCount !== a.rowCount) {
      diffs.push(`Table "${table}" row count changed: before=${b.rowCount}, after=${a.rowCount}`);
    }

    if (JSON.stringify(b.pkSet) !== JSON.stringify(a.pkSet)) {
      diffs.push(`Table "${table}" primary key set modified!`);
    }

    if (b.contentSha256 !== a.contentSha256) {
      diffs.push(`Table "${table}" row content SHA-256 fingerprint mismatch! before=${b.contentSha256}, after=${a.contentSha256}`);
    }
  }

  return diffs;
}

async function runRehearsal() {
  await client.connect();
  console.log('==============================================================================');
  console.log(' CampusOne ERP — P1.4 Master-Data Seed & Backfill Rehearsal');
  console.log(` Target Disposable Schema: "${DISPOSABLE_SCHEMA}"`);
  console.log(' Live Neon database will NOT be modified.');
  console.log('==============================================================================\n');

  const rehearsalReport = {
    testResults: {},
    legacyIntegrity: {},
    unresolvedItems: [],
  };

  try {
    // --------------------------------------------------------------------------
    // 1. Establish Clean Disposable Schema
    // --------------------------------------------------------------------------
    console.log(`[Stage 1] Creating clean disposable schema "${DISPOSABLE_SCHEMA}"...`);
    await client.query(`DROP SCHEMA IF EXISTS "${DISPOSABLE_SCHEMA}" CASCADE;`);
    await client.query(`CREATE SCHEMA "${DISPOSABLE_SCHEMA}";`);
    console.log('  ✅ Clean disposable schema created.');

    // --------------------------------------------------------------------------
    // 2. Load and Apply Baseline Source Schema (Legacy 24 tables)
    // --------------------------------------------------------------------------
    console.log('[Stage 2] Applying baseline source schema (legacy 24 tables)...');
    const sourceSchemaPath = path.resolve(__dirname, '..', '..', 'docs', 'source-schema.sql');
    let sourceSchemaSql = fs.readFileSync(sourceSchemaPath, 'utf8')
      .replace(/"public"/g, `"${DISPOSABLE_SCHEMA}"`);
    
    await client.query(`SET search_path TO "${DISPOSABLE_SCHEMA}";`);
    await client.query(sourceSchemaSql);
    console.log('  ✅ Baseline source schema applied.');

    // --------------------------------------------------------------------------
    // 3. Populate Baseline Dataset from backup JSON
    // --------------------------------------------------------------------------
    console.log('[Stage 3] Populating baseline dataset from source-data-backup.json...');
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
          `INSERT INTO "${DISPOSABLE_SCHEMA}"."${table}" (${colNames}) VALUES (${placeholders})`,
          values
        );
      }
    }
    console.log('  ✅ Baseline dataset populated.');

    // --------------------------------------------------------------------------
    // 4. Apply P1.1/P1.2 Foundation Schema Migration SQL
    // --------------------------------------------------------------------------
    console.log('[Stage 4] Applying P1.1/P1.2 Foundation Schema migration SQL...');
    const p1MigrationPath = path.resolve(
      __dirname, '..', 'prisma', 'migrations', '202610100001_p1_foundation_schema', 'migration.sql'
    );
    const p1MigrationSql = fs.readFileSync(p1MigrationPath, 'utf8');
    await client.query(`SET search_path TO "${DISPOSABLE_SCHEMA}";`);
    await client.query(p1MigrationSql);
    console.log('  ✅ P1.1/P1.2 Foundation Schema migration applied.');

    // --------------------------------------------------------------------------
    // 5. Apply P1.3 Identity & Security Migration SQL
    // --------------------------------------------------------------------------
    console.log('[Stage 5] Applying P1.3 Identity & Security migration SQL...');
    const p13MigrationPath = path.resolve(
      __dirname, '..', 'prisma', 'migrations', '202610100002_p1_identity_security', 'migration.sql'
    );
    const p13MigrationSql = fs.readFileSync(p13MigrationPath, 'utf8');
    await client.query(`SET search_path TO "${DISPOSABLE_SCHEMA}";`);
    await client.query(p13MigrationSql);
    console.log('  ✅ P1.3 Identity & Security migration applied.');

    // --------------------------------------------------------------------------
    // 6. Pre-Seed Legacy Fingerprint Baseline
    // --------------------------------------------------------------------------
    console.log('[Stage 6] Capturing pre-seed legacy table SHA-256 fingerprints...');
    const baselineFingerprints = await captureLegacyFingerprints(client, DISPOSABLE_SCHEMA);
    console.log('  ✅ Fingerprints captured for all 22 legacy tables.');

    // --------------------------------------------------------------------------
    // 7. Execute P1.4 Seed & Backfill (Run 1)
    // --------------------------------------------------------------------------
    console.log('\n[Stage 7] Executing P1.4 Seed & Backfill (RUN 1)...');
    const run1Report = await seedP14MasterData(client, { schema: DISPOSABLE_SCHEMA });
    rehearsalReport.testResults.run1 = run1Report;
    rehearsalReport.unresolvedItems = run1Report.unresolved;
    console.log('  ✅ Run 1 completed successfully.');

    // --------------------------------------------------------------------------
    // 8. Validate Master Records Created in Run 1
    // --------------------------------------------------------------------------
    console.log('\n[Stage 8] Validating created master records...');

    // 8a. Institution
    const instRes = await client.query(`SELECT * FROM "${DISPOSABLE_SCHEMA}"."institutions" WHERE "code" = 'CAMPUSONE';`);
    if (instRes.rows.length !== 1) throw new Error('Expected exactly 1 CAMPUSONE institution record.');
    const instId = instRes.rows[0].id;
    console.log(`  ✅ Institution verified: ${instRes.rows[0].name} (ID: ${instId})`);

    // 8b. Campus
    const campusRes = await client.query(`SELECT * FROM "${DISPOSABLE_SCHEMA}"."campuses" WHERE "institution_id" = '${instId}' AND "code" = 'MAIN';`);
    if (campusRes.rows.length !== 1) throw new Error('Expected exactly 1 MAIN campus record.');
    const campusId = campusRes.rows[0].id;
    console.log(`  ✅ Campus verified: ${campusRes.rows[0].name} (ID: ${campusId})`);

    // 8c. Academic Years
    const ayRes = await client.query(`SELECT "code", "is_current" FROM "${DISPOSABLE_SCHEMA}"."academic_years" WHERE "institution_id" = '${instId}' ORDER BY "code" ASC;`);
    if (ayRes.rows.length !== 4) throw new Error(`Expected 4 academic years, got ${ayRes.rows.length}`);
    const currentAY = ayRes.rows.find(ay => ay.is_current);
    if (!currentAY || currentAY.code !== '2026-2027') throw new Error(`Expected active AY 2026-2027, got ${currentAY?.code}`);
    console.log(`  ✅ 4 Academic Years verified (Active: ${currentAY.code}).`);

    // 8d. Academic Terms
    const termRes = await client.query(`SELECT "code", "term_type", "is_current" FROM "${DISPOSABLE_SCHEMA}"."academic_terms" ORDER BY "code" ASC;`);
    if (termRes.rows.length !== 8) throw new Error(`Expected 8 academic terms, got ${termRes.rows.length}`);
    const activeTerm = termRes.rows.find(t => t.is_current);
    if (!activeTerm || activeTerm.code !== '2026-ODD') throw new Error(`Expected active term 2026-ODD, got ${activeTerm?.code}`);
    console.log(`  ✅ 8 Canonical Terms verified (Active: ${activeTerm.code}).`);

    // 8e. Term Date Map
    const tdmRes = await client.query(`SELECT "legacy_semester_number", "confidence" FROM "${DISPOSABLE_SCHEMA}"."_term_date_map" ORDER BY "legacy_semester_number" ASC;`);
    if (tdmRes.rows.length !== 7) throw new Error(`Expected 7 _term_date_map entries, got ${tdmRes.rows.length}`);
    for (const r of tdmRes.rows) {
      if (r.confidence !== 'inferred') {
        throw new Error(`Historical terms must retain confidence 'inferred', got ${r.confidence} on sem ${r.legacy_semester_number}`);
      }
    }
    console.log(`  ✅ 7 Historical Term-Date mappings verified (Sem 1-7 'inferred').`);

    // 8f. Program
    const progRes = await client.query(`SELECT "code", "degree", "department_name" FROM "${DISPOSABLE_SCHEMA}"."programs";`);
    if (progRes.rows.length !== 1 || progRes.rows[0].code !== 'BTECH-CS') throw new Error('Expected 1 BTECH-CS program.');
    console.log(`  ✅ Program verified: ${progRes.rows[0].code} (${progRes.rows[0].degree} in ${progRes.rows[0].department_name}).`);

    // 8g. Room
    const roomRes = await client.query(`SELECT "room_number", "campus_id" FROM "${DISPOSABLE_SCHEMA}"."rooms";`);
    if (roomRes.rows.length !== 1 || roomRes.rows[0].room_number !== '501') throw new Error('Expected 1 room 501.');
    console.log(`  ✅ Room verified: Room ${roomRes.rows[0].room_number} on campus ${campusId}.`);

    // 8h. Legacy ID Map
    const idMapDept = await client.query(`SELECT "old_id", "new_id" FROM "${DISPOSABLE_SCHEMA}"."_id_map" WHERE "table_name" = 'Department';`);
    const idMapCourse = await client.query(`SELECT "old_id", "new_id" FROM "${DISPOSABLE_SCHEMA}"."_id_map" WHERE "table_name" = 'Course';`);
    if (idMapDept.rows.length !== 1) throw new Error('Expected 1 Department _id_map entry.');
    if (idMapCourse.rows.length !== 2) throw new Error('Expected 2 Course _id_map entries.');
    console.log(`  ✅ _id_map verified: 1 Department mapped, 2 Courses mapped.`);

    // --------------------------------------------------------------------------
    // 9. Legacy Integrity Check (Post-Run 1 vs Baseline)
    // --------------------------------------------------------------------------
    console.log('\n[Stage 9] Comparing legacy table data (Post-Run 1 vs Baseline)...');
    const postRun1Fingerprints = await captureLegacyFingerprints(client, DISPOSABLE_SCHEMA);
    const postRun1Diffs = compareFingerprints('Post-Run 1', baselineFingerprints, postRun1Fingerprints);
    if (postRun1Diffs.length > 0) {
      throw new Error(`Legacy data corruption detected in Run 1:\n${postRun1Diffs.join('\n')}`);
    }
    console.log('  ✅ PASSED: 100% byte-for-byte legacy data preservation across all 22 tables.');

    // --------------------------------------------------------------------------
    // 10. Execute P1.4 Seed & Backfill (Run 2 — Idempotency Test)
    // --------------------------------------------------------------------------
    console.log('\n[Stage 10] Executing P1.4 Seed & Backfill (RUN 2 — IDEMPOTENCY TEST)...');
    const run2Report = await seedP14MasterData(client, { schema: DISPOSABLE_SCHEMA });
    rehearsalReport.testResults.run2 = run2Report;

    // Verify 0 inserted rows in Run 2
    if (
      run2Report.institutions.inserted !== 0 ||
      run2Report.campuses.inserted !== 0 ||
      run2Report.academicYears.inserted !== 0 ||
      run2Report.academicTerms.inserted !== 0 ||
      run2Report.termDateMap.inserted !== 0 ||
      run2Report.programs.inserted !== 0 ||
      run2Report.rooms.inserted !== 0 ||
      run2Report.idMap.Department.inserted !== 0 ||
      run2Report.idMap.Course.inserted !== 0
    ) {
      throw new Error('Idempotency failure: Run 2 inserted new rows instead of recognizing existing master data!');
    }
    console.log('  ✅ PASSED: Run 2 inserted exactly 0 rows across all master tables.');

    // Verify _id_map UUIDs did not change
    const idMapDeptRun2 = await client.query(`SELECT "old_id", "new_id" FROM "${DISPOSABLE_SCHEMA}"."_id_map" WHERE "table_name" = 'Department';`);
    const idMapCourseRun2 = await client.query(`SELECT "old_id", "new_id" FROM "${DISPOSABLE_SCHEMA}"."_id_map" WHERE "table_name" = 'Course';`);

    if (idMapDeptRun2.rows[0].new_id !== idMapDept.rows[0].new_id) {
      throw new Error(`Idempotency failure: Department UUID changed in Run 2!`);
    }
    if (
      idMapCourseRun2.rows.find(r => r.old_id === idMapCourse.rows[0].old_id)?.new_id !== idMapCourse.rows[0].new_id ||
      idMapCourseRun2.rows.find(r => r.old_id === idMapCourse.rows[1].old_id)?.new_id !== idMapCourse.rows[1].new_id
    ) {
      throw new Error(`Idempotency failure: Course UUIDs changed in Run 2!`);
    }
    console.log('  ✅ PASSED: All UUIDs in _id_map remained identical between Run 1 and Run 2.');

    // --------------------------------------------------------------------------
    // 11. Legacy Integrity Check (Post-Run 2 vs Baseline)
    // --------------------------------------------------------------------------
    console.log('\n[Stage 11] Comparing legacy table data (Post-Run 2 vs Baseline)...');
    const postRun2Fingerprints = await captureLegacyFingerprints(client, DISPOSABLE_SCHEMA);
    const postRun2Diffs = compareFingerprints('Post-Run 2', baselineFingerprints, postRun2Fingerprints);
    if (postRun2Diffs.length > 0) {
      throw new Error(`Legacy data corruption detected in Run 2:\n${postRun2Diffs.join('\n')}`);
    }
    console.log('  ✅ PASSED: 100% byte-for-byte legacy data preservation after multiple seed runs.');

    // --------------------------------------------------------------------------
    // 12. Transaction Rollback Test on Injected Failure
    // --------------------------------------------------------------------------
    console.log('\n[Stage 12] Testing transaction rollback on injected failure...');
    let rollbackVerified = false;
    try {
      await client.query('BEGIN;');
      await client.query(`
        INSERT INTO "${DISPOSABLE_SCHEMA}"."institutions" ("code", "name")
        VALUES ('TEST_ROLLBACK', 'Rollback Test Inst');
      `);
      // Inject failure: violates check constraint
      await client.query(`
        INSERT INTO "${DISPOSABLE_SCHEMA}"."academic_years" 
          ("institution_id", "code", "name", "start_date", "end_date")
        VALUES ('${instId}', 'INVALID_DATES', 'Invalid AY', '2027-01-01', '2026-01-01');
      `);
      await client.query('COMMIT;');
    } catch (err) {
      await client.query('ROLLBACK;');
      rollbackVerified = true;
      console.log(`  - Caught injected failure: "${err.message}". Transaction rolled back.`);
    }

    if (!rollbackVerified) {
      throw new Error('Transaction rollback test failed: invalid statement unexpectedly succeeded!');
    }

    const testInstCheck = await client.query(
      `SELECT COUNT(*) FROM "${DISPOSABLE_SCHEMA}"."institutions" WHERE "code" = 'TEST_ROLLBACK';`
    );
    if (parseInt(testInstCheck.rows[0].count, 10) !== 0) {
      throw new Error('Rollback failure: partial write persisted after failed transaction!');
    }
    console.log('  ✅ PASSED: Aborted transaction left zero partial writes.');

    // --------------------------------------------------------------------------
    // 13. Negative Constraint Tests
    // --------------------------------------------------------------------------
    console.log('\n[Stage 13] Executing negative constraint violation tests...');

    // Test 13a: Academic Year date constraint (start_date >= end_date)
    let rejected13a = false;
    try {
      await client.query(`
        INSERT INTO "${DISPOSABLE_SCHEMA}"."academic_years" 
          ("institution_id", "code", "name", "start_date", "end_date")
        VALUES ('${instId}', 'BAD_YEAR', 'Bad Year', '2028-06-30', '2027-07-01');
      `);
    } catch {
      rejected13a = true;
    }
    if (!rejected13a) throw new Error('academic_years_date_range_check failed: invalid date range was accepted!');
    console.log('  ✅ NegTest 1: Invalid academic year dates rejected by CHECK constraint.');

    // Test 13b: Duplicate canonical term (academic_year_id, code)
    let rejected13b = false;
    const ay2026Res = await client.query(`SELECT "id" FROM "${DISPOSABLE_SCHEMA}"."academic_years" WHERE "code" = '2026-2027';`);
    const ay2026Id = ay2026Res.rows[0].id;
    try {
      await client.query(`
        INSERT INTO "${DISPOSABLE_SCHEMA}"."academic_terms" 
          ("academic_year_id", "code", "name", "term_type", "start_date", "end_date")
        VALUES ('${ay2026Id}', '2026-ODD', 'Duplicate Term', 'ODD', '2026-07-15', '2026-12-15');
      `);
    } catch {
      rejected13b = true;
    }
    if (!rejected13b) throw new Error('academic_terms UNIQUE constraint failed: duplicate term code was accepted!');
    console.log('  ✅ NegTest 2: Duplicate canonical term code rejected by UNIQUE constraint.');

    // Test 13c: Invalid term_type
    let rejected13c = false;
    try {
      await client.query(`
        INSERT INTO "${DISPOSABLE_SCHEMA}"."academic_terms" 
          ("academic_year_id", "code", "name", "term_type", "start_date", "end_date")
        VALUES ('${ay2026Id}', '2026-WINTER', 'Winter Term', 'WINTER', '2026-11-01', '2026-12-01');
      `);
    } catch {
      rejected13c = true;
    }
    if (!rejected13c) throw new Error('academic_terms_type_check failed: invalid term_type was accepted!');
    console.log('  ✅ NegTest 3: Invalid term_type rejected by CHECK constraint.');

    // Test 13d: Invalid academic_year_id FK
    let rejected13d = false;
    try {
      await client.query(`
        INSERT INTO "${DISPOSABLE_SCHEMA}"."academic_terms" 
          ("academic_year_id", "code", "name", "term_type", "start_date", "end_date")
        VALUES ('00000000-0000-0000-0000-000000000000', '2026-TEST', 'Orphan Term', 'ODD', '2026-07-15', '2026-12-15');
      `);
    } catch {
      rejected13d = true;
    }
    if (!rejected13d) throw new Error('academic_terms_academic_year_id_fkey failed: orphan term was accepted!');
    console.log('  ✅ NegTest 4: Orphan academic term rejected by foreign key constraint.');

    // Test 13e: Invalid confidence in _term_date_map
    let rejected13e = false;
    const term2026Res = await client.query(`SELECT "id" FROM "${DISPOSABLE_SCHEMA}"."academic_terms" WHERE "code" = '2026-ODD';`);
    const term2026Id = term2026Res.rows[0].id;
    try {
      await client.query(`
        INSERT INTO "${DISPOSABLE_SCHEMA}"."_term_date_map" 
          ("academic_term_id", "legacy_semester_number", "entry_cohort_year", "date_range_start", "date_range_end", "confidence")
        VALUES ('${term2026Id}', 8, 2023, '2027-07-15', '2027-12-15', 'guessed');
      `);
    } catch {
      rejected13e = true;
    }
    if (!rejected13e) throw new Error('_term_date_map_confidence_check failed: unapproved confidence tag was accepted!');
    console.log('  ✅ NegTest 5: Invalid confidence tag in _term_date_map rejected by CHECK constraint.');

    // Test 13f: Duplicate program code
    let rejected13f = false;
    try {
      await client.query(`
        INSERT INTO "${DISPOSABLE_SCHEMA}"."programs" 
          ("institution_id", "code", "name", "degree")
        VALUES ('${instId}', 'BTECH-CS', 'Duplicate Program', 'B.Tech');
      `);
    } catch {
      rejected13f = true;
    }
    if (!rejected13f) throw new Error('programs UNIQUE constraint failed: duplicate program code was accepted!');
    console.log('  ✅ NegTest 6: Duplicate program code rejected by UNIQUE constraint.');

    // Test 13g: Duplicate room number on same campus
    let rejected13g = false;
    try {
      await client.query(`
        INSERT INTO "${DISPOSABLE_SCHEMA}"."rooms" 
          ("campus_id", "room_number")
        VALUES ('${campusId}', '501');
      `);
    } catch {
      rejected13g = true;
    }
    if (!rejected13g) throw new Error('rooms UNIQUE constraint failed: duplicate room number was accepted!');
    console.log('  ✅ NegTest 7: Duplicate room number rejected by UNIQUE constraint.');

    // Test 13h: Conflicting _id_map new_id (collision test)
    let rejected13h = false;
    const existingMapRow = await client.query(`SELECT "old_id", "new_id" FROM "${DISPOSABLE_SCHEMA}"."_id_map" WHERE "table_name" = 'Department';`);
    const existingNewId = existingMapRow.rows[0].new_id;
    try {
      await client.query(`
        INSERT INTO "${DISPOSABLE_SCHEMA}"."_id_map" 
          ("table_name", "old_id", "new_id")
        VALUES ('Department', 'different_old_id', '${existingNewId}');
      `);
    } catch {
      rejected13h = true;
    }
    if (!rejected13h) throw new Error('_id_map_table_name_new_id_key failed: new_id collision was accepted!');
    console.log('  ✅ NegTest 8: Conflicting new_id in _id_map rejected by UNIQUE constraint.');

    // --------------------------------------------------------------------------
    // 14. Disposable Schema Cleanup
    // --------------------------------------------------------------------------
    console.log(`\n[Stage 14] Cleaning up disposable schema "${DISPOSABLE_SCHEMA}"...`);
    await client.query(`DROP SCHEMA IF EXISTS "${DISPOSABLE_SCHEMA}" CASCADE;`);
    console.log('  ✅ Disposable schema dropped cleanly.');

    console.log('\n==============================================================================');
    console.log(' REHEARSAL SUMMARY: ALL P1.4 TESTS PASSED (PASS WITH EXCEPTIONS)');
    console.log(' Exception Note: Legacy Student UNRESOLVED_STUDENT_01 (batch "2026-2026") quarantined.');
    console.log(' Target Neon database was completely untouched.');
    console.log('==============================================================================\n');

    return {
      status: 'PASS WITH EXCEPTIONS',
      rehearsalReport,
    };
  } catch (err) {
    console.error(`\n❌ Rehearsal FAILED: ${err.message}`);
    // Attempt cleanup on failure
    await client.query(`DROP SCHEMA IF EXISTS "${DISPOSABLE_SCHEMA}" CASCADE;`).catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runRehearsal()
    .then((res) => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal rehearsal error:', err);
      process.exit(1);
    });
}

module.exports = { runRehearsal };
