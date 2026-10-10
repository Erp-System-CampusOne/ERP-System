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

const TABLE_ORDER = [
  'User',
  'Department',
  'Permission',
  'RolePermission',
  'Faculty',
  'Course',
  'Student',
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
  'TimetableEntry',
  'AdmissionApplication',
  'DocumentRequest',
  'ExpenseRecord',
  'PlacementRecord',
  'ResearchGrant',
  'SystemActivity',
  '_prisma_migrations'
];

async function verifyRestore() {
  await client.connect();
  console.log('Connected to database to verify backup restore...');

  const testSchema = 'restore_verification_test';
  
  try {
    console.log(`Creating test schema "${testSchema}"...`);
    await client.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE;`);
    await client.query(`CREATE SCHEMA "${testSchema}";`);

    const schemaSql = fs.readFileSync(path.resolve(__dirname, '..', '..', 'docs', 'source-schema.sql'), 'utf8')
      .replace(/"public"/g, `"${testSchema}"`);

    await client.query(`SET search_path TO "${testSchema}";`);
    await client.query(schemaSql);
    console.log('Schema DDL applied successfully to isolated test schema.');

    const jsonPath = path.resolve(__dirname, '..', '..', 'docs', 'source-data-backup.json');
    const backupData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    for (const table of TABLE_ORDER) {
      const rows = backupData[table] || [];
      if (rows.length === 0) continue;

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
    console.log('Table data restored successfully into isolated test schema.');

    console.log('\n--- VERIFICATION OF RESTORED ROW COUNTS ---');
    let totalRestored = 0;
    for (const table of TABLE_ORDER) {
      const res = await client.query(`SELECT COUNT(*)::int as cnt FROM "${testSchema}"."${table}"`);
      const count = res.rows[0].cnt;
      totalRestored += count;
      if (count > 0) {
        console.log(`  - ${table}: ${count} rows`);
      }
    }

    console.log(`\nVerified: All ${TABLE_ORDER.length} tables and ${totalRestored} rows restored without errors.`);
    console.log('Backup & restore verification: PASSED ✅');
  } finally {
    console.log(`\nCleaning up isolated test schema "${testSchema}"...`);
    await client.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE;`);
    console.log('Cleanup complete.');
    await client.end();
  }
}

verifyRestore().catch(err => {
  console.error('Backup restore verification FAILED ❌:', err);
  process.exit(1);
});
