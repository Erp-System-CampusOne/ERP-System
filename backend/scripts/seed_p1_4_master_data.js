/**
 * ==============================================================================
 * CampusOne ERP — Phase 1: Work Package P1.4
 * Script: seed_p1_4_master_data.js
 *
 * Responsibility:
 *   1. Seed root institution ("CAMPUSONE") and campus ("MAIN").
 *   2. Seed canonical academic years ("2023-2024" through "2026-2027").
 *   3. Seed canonical academic terms ("2023-ODD" through "2027-EVEN").
 *   4. Seed historical cohort term-date mappings into "_term_date_map".
 *   5. Seed program master data ("programs") normalized from legacy Department/Student.
 *   6. Seed room master data ("rooms") normalized from legacy TimetableEntry.
 *   7. Initialize "_id_map" for legacy Department and Course records using stable UUIDs.
 *   8. Profile and quarantine unresolved legacy records without exposing personal data.
 *
 * Provenance & Verification Guarantees:
 *   - Strictly additive: No legacy tables or rows are updated or deleted.
 *   - 100% Idempotent: Can be run repeatedly without duplicating rows or re-assigning UUIDs.
 *   - Transactional: All writes occur in a single transaction with automatic rollback on error.
 *   - Auditable: Structured reconciliation counters with clear provenance tags.
 *   - Privacy Preserving: No student names, emails, phones, or roll numbers are logged or exposed.
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { Client } = require('pg');

// Fixed RFC 4122 UUID namespace for deterministic UUID v5 generation (CampusOne ERP namespace)
// Standard DNS namespace UUID: 6ba7b810-9dad-11d1-80b4-00c04fd430c8
const CAMPUSONE_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Generate a deterministic RFC 4122 v5 UUID from a table name and old legacy ID.
 * Format: "${tableName}:${oldId}"
 * This guarantees stable, reproducible UUID assignment across environments while preserving
 * existing mappings if already present in the database.
 */
function generateDeterministicUuid(tableName, oldId) {
  const hash = crypto.createHash('sha1');
  hash.update(Buffer.from(CAMPUSONE_NAMESPACE.replace(/-/g, ''), 'hex'));
  hash.update(`${tableName}:${oldId}`);
  const buf = hash.digest();

  // Set version 5 (bits 4-7 of time_hi_and_version)
  buf[6] = (buf[6] & 0x0f) | 0x50;
  // Set RFC 4122 variant (bits 6-7 of clock_seq_hi_and_reserved)
  buf[8] = (buf[8] & 0x3f) | 0x80;

  const hex = buf.toString('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Main seed and backfill execution function.
 *
 * @param {import('pg').Client} client - An active connected PostgreSQL client.
 * @param {object} options
 * @param {string} [options.schema='public'] - Target database schema.
 * @param {boolean} [options.dryRun=false] - If true, rolls back transaction after preview.
 * @param {boolean} [options.silent=false] - If true, suppresses console logging.
 * @returns {Promise<object>} Reconciliation and seed report.
 */
async function seedP14MasterData(client, options = {}) {
  const schema = options.schema || 'public';
  const dryRun = options.dryRun === true;
  const silent = options.silent === true;

  const log = (msg) => {
    if (!silent) console.log(msg);
  };

  const report = {
    schema,
    dryRun,
    timestamp: new Date().toISOString(),
    institutions: { inserted: 0, existing: 0, records: [] },
    campuses: { inserted: 0, existing: 0, records: [] },
    academicYears: { inserted: 0, existing: 0, records: [] },
    academicTerms: { inserted: 0, existing: 0, records: [] },
    termDateMap: { inserted: 0, existing: 0, records: [] },
    programs: { inserted: 0, existing: 0, records: [] },
    rooms: { inserted: 0, existing: 0, records: [] },
    idMap: {
      Department: { inserted: 0, existing: 0, totalMapped: 0 },
      Course: { inserted: 0, existing: 0, totalMapped: 0 },
    },
    provenanceAudit: {
      institutionLegalName: 'Unverified (left null pending statutory charter review)',
      institutionWebsite: 'Unverified (left null pending official domain ratification)',
      roomCapacity: 'Schema default (60); unverified physical architectural capacity',
      programCode: 'Derived normalization (BTECH-CS); pending formal Board of Studies endorsement',
      semester7Dates: 'Inferred calendar boundaries (2026-07-15..12-15); mid-term exams (09-04..09-09) corroborated live',
    },
    unresolved: [],
    success: false,
  };

  log(`\n==============================================================================`);
  log(` CampusOne ERP — P1.4 Master-Data Seed & Backfill`);
  log(` Target Schema: "${schema}" | Dry-Run: ${dryRun ? 'YES (Preview Only)' : 'NO (Applying Writes)'}`);
  log(`==============================================================================\n`);

  await client.query(`SET search_path TO "${schema}";`);
  await client.query('BEGIN;');

  try {
    // --------------------------------------------------------------------------
    // 1. Institutional Master Data (Single root institution & main campus)
    // --------------------------------------------------------------------------
    log('[Step 1] Seeding Institutional Master Data...');
    const instCode = 'CAMPUSONE';
    const instName = 'CampusOne Institute of Technology';
    // Provenance safeguard: Do not assert unverified legal names or websites as facts.
    // In schema.prisma, legal_name and website are nullable; we leave them null pending official charter.
    const instLegal = null;
    const instWebsite = null;

    // Check existing
    const existingInst = await client.query(
      `SELECT "id", "code", "name" FROM "${schema}"."institutions" WHERE "code" = $1;`,
      [instCode]
    );

    let institutionId;
    if (existingInst.rows.length > 0) {
      institutionId = existingInst.rows[0].id;
      report.institutions.existing++;
      report.institutions.records.push({ id: institutionId, code: instCode, status: 'existing' });
      log(`  - Institution "${instCode}" already exists (ID: ${institutionId}).`);
    } else {
      const insRes = await client.query(
        `INSERT INTO "${schema}"."institutions" ("code", "name", "legal_name", "website", "status")
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING "id";`,
        [instCode, instName, instLegal, instWebsite]
      );
      institutionId = insRes.rows[0].id;
      report.institutions.inserted++;
      report.institutions.records.push({ id: institutionId, code: instCode, status: 'inserted' });
      log(`  - Inserted root Institution "${instCode}" (ID: ${institutionId}, legal_name: [PENDING_CHARTER]).`);
    }

    // Campus
    const campusCode = 'MAIN';
    const campusName = 'Main Campus';
    const campusTimezone = 'Asia/Kolkata';

    const existingCampus = await client.query(
      `SELECT "id", "code", "name" FROM "${schema}"."campuses" 
       WHERE "institution_id" = $1 AND "code" = $2;`,
      [institutionId, campusCode]
    );

    let campusId;
    if (existingCampus.rows.length > 0) {
      campusId = existingCampus.rows[0].id;
      report.campuses.existing++;
      report.campuses.records.push({ id: campusId, code: campusCode, status: 'existing' });
      log(`  - Campus "${campusCode}" already exists (ID: ${campusId}).`);
    } else {
      const campRes = await client.query(
        `INSERT INTO "${schema}"."campuses" ("institution_id", "code", "name", "timezone", "status")
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING "id";`,
        [institutionId, campusCode, campusName, campusTimezone]
      );
      campusId = campRes.rows[0].id;
      report.campuses.inserted++;
      report.campuses.records.push({ id: campusId, code: campusCode, status: 'inserted' });
      log(`  - Inserted Campus "${campusCode}" (ID: ${campusId}).`);
    }

    // --------------------------------------------------------------------------
    // 2. Academic Years (Cohort 2023-2027 spanning 2023-2024 to 2026-2027)
    // --------------------------------------------------------------------------
    log('\n[Step 2] Seeding Academic Years...');
    const academicYearsData = [
      { code: '2023-2024', name: 'Academic Year 2023-2024', start: '2023-07-01', end: '2024-06-30', isCurrent: false },
      { code: '2024-2025', name: 'Academic Year 2024-2025', start: '2024-07-01', end: '2025-06-30', isCurrent: false },
      { code: '2025-2026', name: 'Academic Year 2025-2026', start: '2025-07-01', end: '2026-06-30', isCurrent: false },
      { code: '2026-2027', name: 'Academic Year 2026-2027', start: '2026-07-01', end: '2027-06-30', isCurrent: true },
    ];

    const academicYearIdMap = {};

    for (const ay of academicYearsData) {
      const existingAY = await client.query(
        `SELECT "id" FROM "${schema}"."academic_years" 
         WHERE "institution_id" = $1 AND "code" = $2;`,
        [institutionId, ay.code]
      );

      if (existingAY.rows.length > 0) {
        academicYearIdMap[ay.code] = existingAY.rows[0].id;
        report.academicYears.existing++;
        report.academicYears.records.push({ id: existingAY.rows[0].id, code: ay.code, status: 'existing' });
        log(`  - Academic Year "${ay.code}" already exists.`);
      } else {
        const insRes = await client.query(
          `INSERT INTO "${schema}"."academic_years" 
             ("institution_id", "code", "name", "start_date", "end_date", "is_current")
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING "id";`,
          [institutionId, ay.code, ay.name, ay.start, ay.end, ay.isCurrent]
        );
        academicYearIdMap[ay.code] = insRes.rows[0].id;
        report.academicYears.inserted++;
        report.academicYears.records.push({ id: insRes.rows[0].id, code: ay.code, status: 'inserted' });
        log(`  - Inserted Academic Year "${ay.code}" (isCurrent: ${ay.isCurrent}).`);
      }
    }

    // --------------------------------------------------------------------------
    // 3. Canonical Academic Terms
    // --------------------------------------------------------------------------
    log('\n[Step 3] Seeding Canonical Academic Terms...');
    const academicTermsData = [
      // AY 2023-2024
      { ayCode: '2023-2024', code: '2023-ODD', name: 'Autumn Semester 2023', type: 'ODD', start: '2023-07-15', end: '2023-12-15', examStart: null, examEnd: null, isCurrent: false },
      { ayCode: '2023-2024', code: '2024-EVEN', name: 'Spring Semester 2024', type: 'EVEN', start: '2024-01-05', end: '2024-05-30', examStart: null, examEnd: null, isCurrent: false },
      // AY 2024-2025
      { ayCode: '2024-2025', code: '2024-ODD', name: 'Autumn Semester 2024', type: 'ODD', start: '2024-07-15', end: '2024-12-15', examStart: null, examEnd: null, isCurrent: false },
      { ayCode: '2024-2025', code: '2025-EVEN', name: 'Spring Semester 2025', type: 'EVEN', start: '2025-01-05', end: '2025-05-30', examStart: null, examEnd: null, isCurrent: false },
      // AY 2025-2026
      { ayCode: '2025-2026', code: '2025-ODD', name: 'Autumn Semester 2025', type: 'ODD', start: '2025-07-15', end: '2025-12-15', examStart: null, examEnd: null, isCurrent: false },
      { ayCode: '2025-2026', code: '2026-EVEN', name: 'Spring Semester 2026', type: 'EVEN', start: '2026-01-05', end: '2026-05-30', examStart: null, examEnd: null, isCurrent: false },
      // AY 2026-2027 (Active Term: 2026-ODD; Upcoming: 2027-EVEN)
      { ayCode: '2026-2027', code: '2026-ODD', name: 'Autumn Semester 2026', type: 'ODD', start: '2026-07-15', end: '2026-12-15', examStart: '2026-09-04', examEnd: '2026-09-09', isCurrent: true },
      { ayCode: '2026-2027', code: '2027-EVEN', name: 'Spring Semester 2027', type: 'EVEN', start: '2027-01-05', end: '2027-05-30', examStart: '2027-05-02', examEnd: '2027-05-20', isCurrent: false },
    ];

    const academicTermIdMap = {};

    for (const term of academicTermsData) {
      const ayId = academicYearIdMap[term.ayCode];
      const existingTerm = await client.query(
        `SELECT "id" FROM "${schema}"."academic_terms" 
         WHERE "academic_year_id" = $1 AND "code" = $2;`,
        [ayId, term.code]
      );

      if (existingTerm.rows.length > 0) {
        academicTermIdMap[term.code] = existingTerm.rows[0].id;
        report.academicTerms.existing++;
        report.academicTerms.records.push({ id: existingTerm.rows[0].id, code: term.code, status: 'existing' });
        log(`  - Academic Term "${term.code}" already exists.`);
      } else {
        const insRes = await client.query(
          `INSERT INTO "${schema}"."academic_terms" 
             ("academic_year_id", "code", "name", "term_type", "start_date", "end_date", "exam_start_date", "exam_end_date", "is_current")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING "id";`,
          [ayId, term.code, term.name, term.type, term.start, term.end, term.examStart, term.examEnd, term.isCurrent]
        );
        academicTermIdMap[term.code] = insRes.rows[0].id;
        report.academicTerms.inserted++;
        report.academicTerms.records.push({ id: insRes.rows[0].id, code: term.code, status: 'inserted' });
        log(`  - Inserted Academic Term "${term.code}" (type: ${term.type}, isCurrent: ${term.isCurrent}).`);
      }
    }

    // --------------------------------------------------------------------------
    // 4. Historical Term-Date Mapping (_term_date_map)
    // --------------------------------------------------------------------------
    log('\n[Step 4] Seeding Historical Term-Date Mappings (_term_date_map)...');
    // Rigorous provenance:
    // Semesters 1-6 are inferred historical cohort dates.
    // Semester 7 (2026-ODD): While mid-term exam dates (2026-09-04..09-09) are corroborated by the live
    // Examination table, the full semester start (2026-07-15) and end (2026-12-15) dates are stakeholder
    // calendar decisions rather than independently proven transactional facts. We retain confidence='inferred'
    // with detailed notes to prevent over-claiming verification without an official gazetted calendar.
    const termDateMappings = [
      { termCode: '2023-ODD', sem: 1, cohort: 2023, start: '2023-07-15', end: '2023-12-15', confidence: 'inferred', notes: 'Cohort 2023-2027 Semester 1 (inferred historical semester)' },
      { termCode: '2024-EVEN', sem: 2, cohort: 2023, start: '2024-01-05', end: '2024-05-30', confidence: 'inferred', notes: 'Cohort 2023-2027 Semester 2 (inferred historical semester)' },
      { termCode: '2024-ODD', sem: 3, cohort: 2023, start: '2024-07-15', end: '2024-12-15', confidence: 'inferred', notes: 'Cohort 2023-2027 Semester 3 (inferred historical semester)' },
      { termCode: '2025-EVEN', sem: 4, cohort: 2023, start: '2025-01-05', end: '2025-05-30', confidence: 'inferred', notes: 'Cohort 2023-2027 Semester 4 (inferred historical semester)' },
      { termCode: '2025-ODD', sem: 5, cohort: 2023, start: '2025-07-15', end: '2025-12-15', confidence: 'inferred', notes: 'Cohort 2023-2027 Semester 5 (inferred historical semester)' },
      { termCode: '2026-EVEN', sem: 6, cohort: 2023, start: '2026-01-05', end: '2026-05-30', confidence: 'inferred', notes: 'Cohort 2023-2027 Semester 6 (inferred historical semester)' },
      { termCode: '2026-ODD', sem: 7, cohort: 2023, start: '2026-07-15', end: '2026-12-15', confidence: 'inferred', notes: 'Cohort 2023-2027 Semester 7 (Calendar dates approved in Decision Register P0; mid-term examination window 2026-09-04 to 2026-09-09 corroborated live, full term boundaries inferred pending official academic gazette)' },
    ];

    for (const mapping of termDateMappings) {
      const termId = academicTermIdMap[mapping.termCode];
      const existingMap = await client.query(
        `SELECT "academic_term_id" FROM "${schema}"."_term_date_map" 
         WHERE "academic_term_id" = $1 AND "date_range_start" = $2;`,
        [termId, mapping.start]
      );

      if (existingMap.rows.length > 0) {
        report.termDateMap.existing++;
        report.termDateMap.records.push({ termCode: mapping.termCode, sem: mapping.sem, status: 'existing' });
        log(`  - _term_date_map entry for Term ${mapping.termCode} (Sem ${mapping.sem}) already exists.`);
      } else {
        await client.query(
          `INSERT INTO "${schema}"."_term_date_map" 
             ("academic_term_id", "legacy_semester_number", "entry_cohort_year", "date_range_start", "date_range_end", "confidence", "notes")
           VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          [termId, mapping.sem, mapping.cohort, mapping.start, mapping.end, mapping.confidence, mapping.notes]
        );
        report.termDateMap.inserted++;
        report.termDateMap.records.push({ termCode: mapping.termCode, sem: mapping.sem, status: 'inserted' });
        log(`  - Inserted _term_date_map entry for Term ${mapping.termCode} (Sem ${mapping.sem}, confidence: ${mapping.confidence}).`);
      }
    }

    // Inspect legacy students for unmapped cohorts (privacy preserving: generic aliases only)
    log('  - Scanning legacy students for unmapped cohorts or semesters...');
    const studentsRes = await client.query(
      `SELECT "id", "batch", "semester", "degree" FROM "${schema}"."Student";`
    );
    let unresolvedCounter = 1;
    for (const stu of studentsRes.rows) {
      // Check if student's (batch, semester) matches any approved mapping
      const isApprovedCohort = stu.batch === '2023-2027' && stu.semester >= 1 && stu.semester <= 7;
      if (!isApprovedCohort) {
        const studentAlias = `UNRESOLVED_STUDENT_0${unresolvedCounter++}`;
        report.unresolved.push({
          type: 'UNRESOLVED_HISTORICAL_COHORT',
          entity: 'Student',
          referenceAlias: studentAlias,
          batch: stu.batch,
          semester: stu.semester,
          degree: stu.degree,
          reason: `Legacy student has batch "${stu.batch}" and semester ${stu.semester}, which lacks an approved canonical term mapping in the Phase 0 Decision Register. Quarantined pending academic cohort confirmation.`,
        });
        log(`  ⚠️ UNRESOLVED: Student ${studentAlias} (batch: "${stu.batch}", sem: ${stu.semester}) has no approved mapping.`);
      }
    }

    // --------------------------------------------------------------------------
    // 5. Program Master-Data Seeding (Normalized from legacy Department & Student)
    // --------------------------------------------------------------------------
    log('\n[Step 5] Seeding Program Master Data (programs)...');
    // Inspect distinct (Student.degree, Department)
    const progQuery = await client.query(`
      SELECT DISTINCT 
        s."degree", 
        d."id" AS "dept_id", 
        d."code" AS "dept_code", 
        d."name" AS "dept_name"
      FROM "${schema}"."Student" s
      JOIN "${schema}"."Department" d ON s."departmentId" = d."id"
      WHERE s."degree" IS NOT NULL;
    `);

    for (const p of progQuery.rows) {
      // Normalization rules:
      // - Clean double spaces: "Computer  Science" -> "Computer Science"
      const normalizedDeptName = p.dept_name.replace(/\s+/g, ' ').trim();
      let progCode;
      let progName;
      let durationYears = 4;
      let totalSemesters = 8;

      if (p.degree === 'B.Tech' && (p.dept_code === 'CS101' || normalizedDeptName.toLowerCase().includes('computer science'))) {
        progCode = 'BTECH-CS';
        progName = 'Bachelor of Technology in Computer Science';
      } else {
        // Deterministic fallback convention: <DEGREE>-<DEPT_CODE>
        const cleanDeg = p.degree.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const cleanDept = p.dept_code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        progCode = `${cleanDeg}-${cleanDept}`;
        progName = `${p.degree} in ${normalizedDeptName}`;
      }

      const existingProg = await client.query(
        `SELECT "id" FROM "${schema}"."programs" 
         WHERE "institution_id" = $1 AND "code" = $2;`,
        [institutionId, progCode]
      );

      if (existingProg.rows.length > 0) {
        report.programs.existing++;
        report.programs.records.push({ id: existingProg.rows[0].id, code: progCode, status: 'existing' });
        log(`  - Program "${progCode}" already exists.`);
      } else {
        const insRes = await client.query(
          `INSERT INTO "${schema}"."programs" 
             ("institution_id", "code", "name", "degree", "department_name", "duration_years", "total_semesters", "status")
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
           RETURNING "id";`,
          [institutionId, progCode, progName, p.degree, normalizedDeptName, durationYears, totalSemesters]
        );
        report.programs.inserted++;
        report.programs.records.push({ id: insRes.rows[0].id, code: progCode, status: 'inserted' });
        log(`  - Inserted Program "${progCode}" ("${progName}" [DERIVED_NORMALIZATION]).`);
      }
    }

    // --------------------------------------------------------------------------
    // 6. Room Master-Data Seeding (Normalized from legacy TimetableEntry)
    // --------------------------------------------------------------------------
    log('\n[Step 6] Seeding Room Master Data (rooms)...');
    const roomsQuery = await client.query(`
      SELECT DISTINCT "roomNumber" 
      FROM "${schema}"."TimetableEntry"
      ORDER BY "roomNumber" ASC;
    `);

    for (const r of roomsQuery.rows) {
      const rawRoom = r.roomNumber;
      if (!rawRoom || rawRoom.trim() === '') {
        report.unresolved.push({
          type: 'BLANK_ROOM_NUMBER',
          entity: 'TimetableEntry',
          value: rawRoom,
          reason: 'TimetableEntry contains a blank or null roomNumber that cannot be seeded as a master room.',
        });
        log(`  ⚠️ QUARANTINED: Blank or null roomNumber in TimetableEntry.`);
        continue;
      }

      const normalizedRoom = rawRoom.trim();
      const existingRoom = await client.query(
        `SELECT "id" FROM "${schema}"."rooms" 
         WHERE "campus_id" = $1 AND "room_number" = $2;`,
        [campusId, normalizedRoom]
      );

      if (existingRoom.rows.length > 0) {
        report.rooms.existing++;
        report.rooms.records.push({ id: existingRoom.rows[0].id, roomNumber: normalizedRoom, status: 'existing' });
        log(`  - Room "${normalizedRoom}" already exists.`);
      } else {
        // Note: capacity defaults to 60 per schema default (unverified physical survey)
        const insRes = await client.query(
          `INSERT INTO "${schema}"."rooms" 
             ("campus_id", "room_number", "capacity", "room_type", "status")
           VALUES ($1, $2, 60, 'classroom', 'active')
           RETURNING "id";`,
          [campusId, normalizedRoom]
        );
        report.rooms.inserted++;
        report.rooms.records.push({ id: insRes.rows[0].id, roomNumber: normalizedRoom, status: 'inserted' });
        log(`  - Inserted Room "${normalizedRoom}" into Campus "${campusCode}" (Capacity: 60 [SCHEMA_DEFAULT]).`);
      }
    }

    // --------------------------------------------------------------------------
    // 7. Legacy ID Mapping (_id_map) for Department & Course
    // --------------------------------------------------------------------------
    log('\n[Step 7] Initializing Legacy ID Map (_id_map) for Department and Course...');

    const tablesToMap = ['Department', 'Course'];

    for (const table of tablesToMap) {
      const sourceRows = await client.query(
        `SELECT "id" FROM "${schema}"."${table}" ORDER BY "id" ASC;`
      );

      for (const row of sourceRows.rows) {
        const oldId = row.id;

        // Check if mapping already exists in _id_map
        const existingMap = await client.query(
          `SELECT "new_id" FROM "${schema}"."_id_map" 
           WHERE "table_name" = $1 AND "old_id" = $2;`,
          [table, oldId]
        );

        if (existingMap.rows.length > 0) {
          report.idMap[table].existing++;
          log(`  - _id_map for ${table} ("${oldId}") already mapped to UUID ${existingMap.rows[0].new_id}.`);
        } else {
          // Generate stable deterministic UUID v5
          const newUuid = generateDeterministicUuid(table, oldId);

          await client.query(
            `INSERT INTO "${schema}"."_id_map" ("table_name", "old_id", "new_id")
             VALUES ($1, $2, $3)
             ON CONFLICT ("table_name", "old_id") DO NOTHING;`,
            [table, oldId, newUuid]
          );
          report.idMap[table].inserted++;
          log(`  - Inserted _id_map: ${table} ("${oldId}") -> UUID ${newUuid}.`);
        }
      }

      // Total mapped count check
      const totalRes = await client.query(
        `SELECT COUNT(*) FROM "${schema}"."_id_map" WHERE "table_name" = $1;`,
        [table]
      );
      report.idMap[table].totalMapped = parseInt(totalRes.rows[0].count, 10);
    }

    // --------------------------------------------------------------------------
    // Verification of _id_map Bidirectional Uniqueness & Completeness
    // --------------------------------------------------------------------------
    log('\n[Step 8] Verifying _id_map integrity constraints...');
    for (const table of tablesToMap) {
      const sourceCountRes = await client.query(`SELECT COUNT(*) FROM "${schema}"."${table}";`);
      const sourceCount = parseInt(sourceCountRes.rows[0].count, 10);

      const mapCountsRes = await client.query(`
        SELECT 
          COUNT(*) AS total_rows,
          COUNT(DISTINCT "old_id") AS unique_old,
          COUNT(DISTINCT "new_id") AS unique_new
        FROM "${schema}"."_id_map"
        WHERE "table_name" = $1;
      `, [table]);

      const { total_rows, unique_old, unique_new } = mapCountsRes.rows[0];
      const totalRowsInt = parseInt(total_rows, 10);
      const uniqueOldInt = parseInt(unique_old, 10);
      const uniqueNewInt = parseInt(unique_new, 10);

      if (totalRowsInt !== sourceCount) {
        throw new Error(
          `Mapping completeness mismatch on table "${table}": expected ${sourceCount} mappings, found ${totalRowsInt}.`
        );
      }
      if (totalRowsInt !== uniqueOldInt || totalRowsInt !== uniqueNewInt) {
        throw new Error(
          `Bidirectional uniqueness violation on _id_map for table "${table}": total=${totalRowsInt}, unique_old=${uniqueOldInt}, unique_new=${uniqueNewInt}.`
        );
      }
      log(`  ✅ ${table}: ${totalRowsInt}/${sourceCount} rows mapped with strict bidirectional uniqueness.`);
    }

    if (dryRun) {
      log('\n[Dry-Run] Rolling back transaction (no changes persisted)...');
      await client.query('ROLLBACK;');
      log('  - Transaction cleanly rolled back.');
    } else {
      await client.query('COMMIT;');
      log('\n[Commit] Transaction successfully committed.');
    }

    report.success = true;
    return report;
  } catch (err) {
    await client.query('ROLLBACK;').catch(() => {});
    log(`\n❌ Error during P1.4 master-data seed: ${err.message}`);
    report.success = false;
    report.error = err.message;
    throw err;
  }
}

// CLI entrypoint
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const schemaArgIdx = args.indexOf('--schema');
  const schema = schemaArgIdx !== -1 && args[schemaArgIdx + 1] ? args[schemaArgIdx + 1] : 'public';

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not defined in .env');
    process.exit(1);
  }

  // Safety guard: Prevent accidental execution against live Neon database public schema
  if (dbUrl.includes('neon.tech') && schema === 'public' && !args.includes('--allow-live-neon')) {
    console.error('\n🛑 SAFETY GUARD: Direct write to live Neon public schema is prohibited during Phase 1.4 rehearsal!');
    console.error('Run against an isolated disposable schema (--schema <disposable_schema>) or provide explicit --allow-live-neon.\n');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });

  client.connect()
    .then(async () => {
      const result = await seedP14MasterData(client, { schema, dryRun });
      console.log('\nFinal P1.4 Master-Data Report Summary:');
      console.log(JSON.stringify(result, null, 2));
      await client.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Fatal execution error:', err);
      await client.end().catch(() => {});
      process.exit(1);
    });
}

module.exports = {
  seedP14MasterData,
  generateDeterministicUuid,
};
