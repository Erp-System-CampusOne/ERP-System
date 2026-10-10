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

// Topological insertion order for foreign keys
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

async function backup() {
  await client.connect();
  console.log('Connected to database for backup...');

  const tablesRes = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  `);

  const liveTables = new Set(tablesRes.rows.map(r => r.table_name));
  
  // Sort according to TABLE_ORDER, appending any unexpected table
  const orderedTables = [
    ...TABLE_ORDER.filter(t => liveTables.has(t)),
    ...Array.from(liveTables).filter(t => !TABLE_ORDER.includes(t))
  ];

  console.log(`Found ${orderedTables.length} tables in public schema.`);

  const backupData = {};
  const sqlStatements = [
    '-- CampusOne ERP Live Database Backup',
    `-- Date: ${new Date().toISOString()}`,
    '-- Database Target: Neon PostgreSQL',
    'BEGIN;'
  ];

  for (const table of orderedTables) {
    const res = await client.query(`SELECT * FROM "${table}"`);
    backupData[table] = res.rows;
    console.log(`  - "${table}": ${res.rows.length} rows`);

    if (res.rows.length > 0) {
      sqlStatements.push(`\n-- Table: "${table}" (${res.rows.length} rows)`);
      const cols = Object.keys(res.rows[0]);
      const colList = cols.map(c => `"${c}"`).join(', ');

      for (const row of res.rows) {
        const valList = cols.map(c => {
          const val = row[c];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number' || typeof val === 'boolean') return val.toString();
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
          return `'${String(val).replace(/'/g, "''")}'`;
        }).join(', ');

        sqlStatements.push(`INSERT INTO "${table}" (${colList}) VALUES (${valList});`);
      }
    }
  }

  sqlStatements.push('\nCOMMIT;\n');

  const docsDir = path.resolve(__dirname, '..', '..', 'docs');
  const sqlPath = path.join(docsDir, 'source-data-backup.sql');
  const jsonPath = path.join(docsDir, 'source-data-backup.json');

  fs.writeFileSync(sqlPath, sqlStatements.join('\n'), 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2), 'utf8');

  console.log(`\nBackup successfully written:`);
  console.log(`- SQL: ${sqlPath} (${fs.statSync(sqlPath).size} bytes)`);
  console.log(`- JSON: ${jsonPath} (${fs.statSync(jsonPath).size} bytes)`);

  await client.end();
}

backup().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
