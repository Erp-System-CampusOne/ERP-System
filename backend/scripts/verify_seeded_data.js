const { Client } = require('pg');

async function verify(connStr, label) {
  console.log(`\n======================================================`);
  console.log(`AUDITING DATABASE: ${label}`);
  console.log(`======================================================`);
  const client = new Client({ connectionString: connStr });
  await client.connect();

  const userCounts = await client.query('SELECT role, count(*)::int FROM "User" GROUP BY role ORDER BY count DESC;');
  console.log(`Users breakdown by role:`, userCounts.rows);

  const totalUsers = await client.query('SELECT count(*)::int FROM "User";');
  const faculties = await client.query('SELECT count(*)::int FROM "Faculty";');
  const students = await client.query('SELECT count(*)::int FROM "Student";');
  const departments = await client.query('SELECT count(*)::int FROM "Department";');
  const courses = await client.query('SELECT count(*)::int FROM "Course";');
  const timetables = await client.query('SELECT count(*)::int FROM "TimetableEntry";');
  const feeStructures = await client.query('SELECT count(*)::int FROM "FeeStructure";');
  const feeTransactions = await client.query('SELECT count(*)::int FROM "FeeTransaction";');
  const docRequests = await client.query('SELECT count(*)::int FROM "DocumentRequest";');
  const books = await client.query('SELECT count(*)::int FROM "Book";');
  const circ = await client.query('SELECT count(*)::int FROM "CirculationRecord";');
  const exams = await client.query('SELECT count(*)::int FROM "Examination";');
  const results = await client.query('SELECT count(*)::int FROM "ExamResult";');
  const notices = await client.query('SELECT count(*)::int FROM "Notice";');
  const creds = await client.query('SELECT count(*)::int FROM user_credentials;');
  const roleAssigns = await client.query('SELECT count(*)::int FROM user_role_assignments;');

  console.log(`Entity Counts:`, {
    totalUsers: totalUsers.rows[0].count,
    faculties: faculties.rows[0].count,
    students: students.rows[0].count,
    departments: departments.rows[0].count,
    courses: courses.rows[0].count,
    timetables: timetables.rows[0].count,
    feeStructures: feeStructures.rows[0].count,
    feeTransactions: feeTransactions.rows[0].count,
    docRequests: docRequests.rows[0].count,
    books: books.rows[0].count,
    circ: circ.rows[0].count,
    exams: exams.rows[0].count,
    results: results.rows[0].count,
    notices: notices.rows[0].count,
    userCredentials: creds.rows[0].count,
    userRoleAssignments: roleAssigns.rows[0].count
  });

  const sampleUsers = await client.query('SELECT email, name, role FROM "User" ORDER BY role, email;');
  console.log('\nSeeded Users (all 20):');
  sampleUsers.rows.forEach((u, i) => {
    console.log(`  ${(i + 1).toString().padStart(2, ' ')}. [${u.role.padEnd(15, ' ')}] ${u.email.padEnd(30, ' ')} (${u.name})`);
  });

  await client.end();
}

async function run() {
  const neonUrl = 'postgresql://neondb_owner:npg_R42trhBoesAx@ep-green-pine-azr0z3ii.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
  const target = process.argv[2] || neonUrl;
  const label = process.argv[2] ? 'Docker Container Database' : 'Neon Production Database';
  await verify(target, label);
}

run().catch(console.error);
