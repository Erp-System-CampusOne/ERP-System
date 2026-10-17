const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function seedDatabase(connectionString, label) {
  console.log(`\n======================================================`);
  console.log(`[SEEDER] Starting Clean & Seed on: ${label}`);
  console.log(`======================================================`);

  const client = new Client({ connectionString });
  await client.connect();
  console.log(`[${label}] Connected successfully to PostgreSQL.`);

  try {
    await client.query('BEGIN;');

    console.log(`[${label}] 1. Purging existing database tables and ensuring schema...`);

    // Ensure campusId column exists
    await client.query(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "campusId" TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS "User_campusId_key" ON "User"("campusId");
      CREATE INDEX IF NOT EXISTS "User_campusId_idx" ON "User"("campusId");
    `);

    // Detach circular references on Department
    await client.query('UPDATE "Department" SET "headOfDepartmentId" = NULL;');

    // Clean tables in reverse dependency order
    const tablesToClean = [
      '"DocumentRequest"',
      '"ExamResult"',
      'examiner_assignments',
      '"Examination"',
      '"AttendanceRecord"',
      '"CirculationRecord"',
      '"FineRecord"',
      '"Book"',
      '"LeaveRequest"',
      '"AdmissionApplication"',
      '"PlacementRecord"',
      '"FeeTransaction"',
      '"FeeStructure"',
      '"TimetableEntry"',
      '"Notice"',
      'department_appointments',
      '"ExpenseRecord"',
      'student_term_registrations',
      'student_program_enrollments',
      'faculty_profiles',
      'student_profiles',
      'employee_profiles',
      'institution_hod_assignments',
      'auth_sessions',
      'user_role_assignments',
      'user_credentials',
      '"Student"',
      '"Course"',
      '"Faculty"',
      '"Department"',
      '"User"'
    ];

    for (const tbl of tablesToClean) {
      try {
        await client.query(`DELETE FROM ${tbl};`);
      } catch (e) {
        console.warn(`[${label}] Note while clearing ${tbl}: ${e.message}`);
      }
    }

    console.log(`[${label}] 2. Preparing baseline password hashes...`);
    const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
    const hodPasswordHash = await bcrypt.hash('Hod123!', 10);
    const facultyPasswordHash = await bcrypt.hash('Faculty123!', 10);
    const studentPasswordHash = await bcrypt.hash('Student123!', 10);
    const analyticsPasswordHash = await bcrypt.hash('Analytics123!', 10);
    const librarianPasswordHash = await bcrypt.hash('Librarian123!', 10);
    const financePasswordHash = await bcrypt.hash('Finance123!', 10);

    console.log(`[${label}] 3. Seeding Institutional Foundation & Roles...`);
    let instRes = await client.query('SELECT id FROM institutions LIMIT 1;');
    let institutionId;
    if (instRes.rows.length === 0) {
      const ins = await client.query(`
        INSERT INTO institutions (name, code, status) 
        VALUES ('CampusOne Institute of Technology', 'CIT', 'active') 
        RETURNING id;
      `);
      institutionId = ins.rows[0].id;
    } else {
      institutionId = instRes.rows[0].id;
    }

    let campusRes = await client.query('SELECT id FROM campuses LIMIT 1;');
    let campusId;
    if (campusRes.rows.length === 0) {
      const cmp = await client.query(`
        INSERT INTO campuses (institution_id, name, code, address, timezone, status)
        VALUES ($1, 'Main Campus - Bangalore', 'CIT-BLR', 'Electronic City, Bangalore, India', 'Asia/Kolkata', 'active')
        RETURNING id;
      `, [institutionId]);
      campusId = cmp.rows[0].id;
    } else {
      campusId = campusRes.rows[0].id;
    }

    // Role mapping
    const roleRows = await client.query(`SELECT id, code FROM roles;`);
    const roleIdMap = {};
    for (const r of roleRows.rows) {
      roleIdMap[r.code] = r.id;
    }

    const requiredRoles = ['admin', 'hod', 'faculty', 'student', 'analytics', 'finance_officer', 'librarian', 'examiner', 'management'];
    for (const r of requiredRoles) {
      if (!roleIdMap[r]) {
        const ins = await client.query(`
          INSERT INTO roles (id, code, name, description, is_system, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), NOW())
          RETURNING id;
        `, [r, r.toUpperCase(), `${r} system role`]);
        roleIdMap[r] = ins.rows[0].id;
      }
    }

    console.log(`[${label}] 4. Seeding Academic Departments...`);
    await client.query(`
      INSERT INTO "Department" (id, code, name, "createdAt", "updatedAt")
      VALUES 
        (gen_random_uuid()::text, 'CSE', 'Computer Science and Engineering', NOW(), NOW()),
        (gen_random_uuid()::text, 'ECE', 'Electronics and Communication Engineering', NOW(), NOW()),
        (gen_random_uuid()::text, 'MECH', 'Mechanical Engineering', NOW(), NOW())
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;
    `);

    const cseDept = (await client.query("SELECT id, code, name FROM \"Department\" WHERE code='CSE';")).rows[0];
    const eceDept = (await client.query("SELECT id, code, name FROM \"Department\" WHERE code='ECE';")).rows[0];
    const mechDept = (await client.query("SELECT id, code, name FROM \"Department\" WHERE code='MECH';")).rows[0];

    console.log(`[${label}] 5. Seeding Admin Account (COID1001)...`);
    const adminUserRes = await client.query(`
      INSERT INTO "User" (id, "campusId", email, name, password, role, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, 'COID1001', 'admin@campus.edu', 'System Administrator', $1, 'admin', NOW(), NOW())
      RETURNING id;
    `, [adminPasswordHash]);
    const adminUserId = adminUserRes.rows[0].id;

    await client.query(`
      INSERT INTO user_credentials (user_id, credential_type, password_hash, algorithm)
      VALUES ($1, 'password', $2, 'bcrypt');
    `, [adminUserId, adminPasswordHash]);

    await client.query(`
      INSERT INTO user_role_assignments (user_id, role_id, is_active, valid_from)
      VALUES ($1, $2, true, NOW());
    `, [adminUserId, roleIdMap['admin']]);

    console.log(`[${label}] 6. Seeding Executive Accounts (COID1003, COID1004, COID1005)...`);
    // 1 Analytics
    const analyticsRes = await client.query(`
      INSERT INTO "User" (id, "campusId", email, name, password, role, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, 'COID1003', 'analytics@campus.edu', 'Dr. Rohan Mehta', $1, 'analytics', NOW(), NOW())
      RETURNING id;
    `, [analyticsPasswordHash]);
    await client.query(`INSERT INTO user_credentials (user_id, credential_type, password_hash, algorithm) VALUES ($1, 'password', $2, 'bcrypt');`, [analyticsRes.rows[0].id, analyticsPasswordHash]);
    await client.query(`INSERT INTO user_role_assignments (user_id, role_id, is_active, valid_from) VALUES ($1, $2, true, NOW());`, [analyticsRes.rows[0].id, roleIdMap['analytics']]);

    // 1 Librarian
    const libRes = await client.query(`
      INSERT INTO "User" (id, "campusId", email, name, password, role, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, 'COID1004', 'librarian@campus.edu', 'Anita Sharma', $1, 'librarian', NOW(), NOW())
      RETURNING id;
    `, [librarianPasswordHash]);
    await client.query(`INSERT INTO user_credentials (user_id, credential_type, password_hash, algorithm) VALUES ($1, 'password', $2, 'bcrypt');`, [libRes.rows[0].id, librarianPasswordHash]);
    await client.query(`INSERT INTO user_role_assignments (user_id, role_id, is_active, valid_from) VALUES ($1, $2, true, NOW());`, [libRes.rows[0].id, roleIdMap['librarian']]);

    // 1 Finance Officer
    const finRes = await client.query(`
      INSERT INTO "User" (id, "campusId", email, name, password, role, phone, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, 'COID1005', 'finance@campus.edu', 'Kavita Iyer', $1, 'finance_officer', '+91-9876543210', NOW(), NOW())
      RETURNING id;
    `, [financePasswordHash]);
    await client.query(`INSERT INTO user_credentials (user_id, credential_type, password_hash, algorithm) VALUES ($1, 'password', $2, 'bcrypt');`, [finRes.rows[0].id, financePasswordHash]);
    await client.query(`INSERT INTO user_role_assignments (user_id, role_id, is_active, valid_from) VALUES ($1, $2, true, NOW());`, [finRes.rows[0].id, roleIdMap['finance_officer']]);

    console.log(`[${label}] 7. Seeding 1 Single Institution HOD (Dr. Sarah Jenkins - COID1002)...`);
    const hodUserRes = await client.query(`
      INSERT INTO "User" (id, "campusId", email, name, password, role, phone, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, 'COID1002', 'hod@campus.edu', 'Dr. Sarah Jenkins', $1, 'hod', '+91 98450 11223', NOW(), NOW())
      RETURNING id;
    `, [hodPasswordHash]);
    const hodUserId = hodUserRes.rows[0].id;
    await client.query(`INSERT INTO user_credentials (user_id, credential_type, password_hash, algorithm) VALUES ($1, 'password', $2, 'bcrypt');`, [hodUserId, hodPasswordHash]);
    await client.query(`INSERT INTO user_role_assignments (user_id, role_id, is_active, valid_from) VALUES ($1, $2, true, NOW());`, [hodUserId, roleIdMap['hod']]);

    await client.query(`
      INSERT INTO "Faculty" (id, "userId", "employeeCode", "departmentId", designation, qualification, "weeklyWorkloadHours", "leaveBalance", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, $1, 'HOD-INST-001', $2, 'Institution Head of Department', 'Ph.D. in Computer Science (MIT)', 0, 18, NOW(), NOW())
      RETURNING id;
    `, [hodUserId, cseDept.id]);

    // Ensure all departments are uniformly governed by the Institution HOD without per-department separation
    await client.query(`UPDATE "Department" SET "headOfDepartmentId" = NULL;`);
    await client.query(`
      INSERT INTO institution_hod_assignments (institution_id, user_id, is_active, appointed_at)
      VALUES ($1, $2, true, NOW());
    `, [institutionId, hodUserId]);

    console.log(`[${label}] 8. Seeding 5 Faculty Members (COID2001 - COID2005)...`);
    const facultyDefs = [
      { campusId: 'COID2001', email: 'faculty.sharma@campus.edu', name: 'Prof. Rajesh Sharma', code: 'FAC-CSE-001', deptId: cseDept.id, desig: 'Professor', qual: 'Ph.D. in Distributed Systems', hours: 14 },
      { campusId: 'COID2002', email: 'faculty.iyer@campus.edu', name: 'Dr. Meera Iyer', code: 'FAC-CSE-002', deptId: cseDept.id, desig: 'Associate Professor', qual: 'Ph.D. in AI & Machine Learning', hours: 16 },
      { campusId: 'COID2003', email: 'faculty.verma@campus.edu', name: 'Dr. Amit Verma', code: 'FAC-CSE-003', deptId: cseDept.id, desig: 'Associate Professor', qual: 'Ph.D. in Algorithms & Complexity', hours: 16 },
      { campusId: 'COID2004', email: 'faculty.gupta@campus.edu', name: 'Prof. Vikram Gupta', code: 'FAC-ECE-001', deptId: eceDept.id, desig: 'Assistant Professor', qual: 'M.Tech in VLSI Systems', hours: 18 },
      { campusId: 'COID2005', email: 'faculty.nair@campus.edu', name: 'Dr. Ananya Nair', code: 'FAC-MECH-001', deptId: mechDept.id, desig: 'Assistant Professor', qual: 'Ph.D. in Robotics & Mechatronics', hours: 18 },
    ];

    const facultyMap = {};
    for (const f of facultyDefs) {
      const uRes = await client.query(`
        INSERT INTO "User" (id, "campusId", email, name, password, role, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, 'faculty', NOW(), NOW())
        RETURNING id;
      `, [f.campusId, f.email, f.name, facultyPasswordHash]);
      const uid = uRes.rows[0].id;

      await client.query(`INSERT INTO user_credentials (user_id, credential_type, password_hash, algorithm) VALUES ($1, 'password', $2, 'bcrypt');`, [uid, facultyPasswordHash]);
      await client.query(`INSERT INTO user_role_assignments (user_id, role_id, is_active, valid_from) VALUES ($1, $2, true, NOW());`, [uid, roleIdMap['faculty']]);

      const facRes = await client.query(`
        INSERT INTO "Faculty" (id, "userId", "employeeCode", "departmentId", designation, qualification, "weeklyWorkloadHours", "leaveBalance", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, 15, NOW(), NOW())
        RETURNING id;
      `, [uid, f.code, f.deptId, f.desig, f.qual, f.hours]);

      facultyMap[f.code] = facRes.rows[0].id;
    }

    console.log(`[${label}] 9. Seeding 10 Students (COID3001 - COID3010)...`);
    const studentDefs = [
      { campusId: 'COID3001', email: 'student.aarav@campus.edu', name: 'Aarav Patel', roll: '22CS001', sem: 4, sec: 'A', batch: '2024-2028', cgpa: 8.85, att: 92.5, feeStatus: 'paid', quota: 'general' },
      { campusId: 'COID3002', email: 'student.diya@campus.edu', name: 'Diya Sen', roll: '22CS002', sem: 4, sec: 'A', batch: '2024-2028', cgpa: 9.20, att: 96.0, feeStatus: 'paid', quota: 'merit' },
      { campusId: 'COID3003', email: 'student.rohan@campus.edu', name: 'Rohan Kulkarni', roll: '22CS003', sem: 4, sec: 'A', batch: '2024-2028', cgpa: 7.60, att: 82.0, feeStatus: 'due', quota: 'general' },
      { campusId: 'COID3004', email: 'student.ananya@campus.edu', name: 'Ananya Roy', roll: '22CS004', sem: 4, sec: 'A', batch: '2024-2028', cgpa: 8.40, att: 88.5, feeStatus: 'paid', quota: 'general' },
      { campusId: 'COID3005', email: 'student.kabir@campus.edu', name: 'Kabir Das', roll: '22CS005', sem: 4, sec: 'B', batch: '2024-2028', cgpa: 6.95, att: 74.0, feeStatus: 'due', quota: 'management' },
      { campusId: 'COID3006', email: 'student.ishaan@campus.edu', name: 'Ishaan Reddy', roll: '22CS006', sem: 4, sec: 'B', batch: '2024-2028', cgpa: 8.10, att: 90.0, feeStatus: 'partial', quota: 'general' },
      { campusId: 'COID3007', email: 'student.tanvi@campus.edu', name: 'Tanvi Joshi', roll: '22CS007', sem: 4, sec: 'B', batch: '2024-2028', cgpa: 9.50, att: 98.0, feeStatus: 'paid', quota: 'merit' },
      { campusId: 'COID3008', email: 'student.aditya@campus.edu', name: 'Aditya Rao', roll: '22CS008', sem: 2, sec: 'A', batch: '2025-2029', cgpa: 8.30, att: 85.0, feeStatus: 'paid', quota: 'general' },
      { campusId: 'COID3009', email: 'student.zoya@campus.edu', name: 'Zoya Khan', roll: '22CS009', sem: 2, sec: 'A', batch: '2025-2029', cgpa: 7.80, att: 80.5, feeStatus: 'due', quota: 'general' },
      { campusId: 'COID3010', email: 'student.varun@campus.edu', name: 'Varun Nair', roll: '22CS010', sem: 6, sec: 'A', batch: '2023-2027', cgpa: 8.90, att: 91.0, feeStatus: 'paid', quota: 'general' },
    ];

    const studentIdMap = {};
    for (const s of studentDefs) {
      const uRes = await client.query(`
        INSERT INTO "User" (id, "campusId", email, name, password, role, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, 'student', NOW(), NOW())
        RETURNING id;
      `, [s.campusId, s.email, s.name, studentPasswordHash]);
      const uid = uRes.rows[0].id;

      await client.query(`INSERT INTO user_credentials (user_id, credential_type, password_hash, algorithm) VALUES ($1, 'password', $2, 'bcrypt');`, [uid, studentPasswordHash]);
      await client.query(`INSERT INTO user_role_assignments (user_id, role_id, is_active, valid_from) VALUES ($1, $2, true, NOW());`, [uid, roleIdMap['student']]);

      const stRes = await client.query(`
        INSERT INTO "Student" (id, "userId", "rollNumber", "departmentId", degree, semester, batch, section, cgpa, "attendancePercentage", "feeStatus", "feeQuota", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, 'B.Tech', $4, $5, $6, $7, $8, $9::"FeeStatus", $10::"FeeQuota", NOW(), NOW())
        RETURNING id;
      `, [uid, s.roll, cseDept.id, s.sem, s.batch, s.sec, s.cgpa, s.att, s.feeStatus, s.quota]);

      studentIdMap[s.roll] = stRes.rows[0].id;
    }

    console.log(`[${label}] 10. Seeding Courses & Faculty Allocations...`);
    const courseDefs = [
      { code: 'CS301', name: 'Database Management Systems', credits: 4, sem: 4, deptId: cseDept.id, facCode: 'FAC-CSE-001' },
      { code: 'CS302', name: 'Design & Analysis of Algorithms', credits: 4, sem: 4, deptId: cseDept.id, facCode: 'FAC-CSE-003' },
      { code: 'CS303', name: 'Operating Systems', credits: 4, sem: 4, deptId: cseDept.id, facCode: 'FAC-CSE-002' },
      { code: 'CS304', name: 'Computer Networks', credits: 3, sem: 4, deptId: cseDept.id, facCode: 'FAC-CSE-001' },
      { code: 'EC201', name: 'Signals & Systems', credits: 4, sem: 2, deptId: eceDept.id, facCode: 'FAC-ECE-001' },
      { code: 'ME201', name: 'Applied Thermodynamics', credits: 4, sem: 4, deptId: mechDept.id, facCode: 'FAC-MECH-001' },
    ];

    const courseMap = {};
    for (const c of courseDefs) {
      const crsRes = await client.query(`
        INSERT INTO "Course" (id, code, name, credits, semester, type, "departmentId", "faculty_instructor", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, 'theory'::"CourseType", $5, $6, NOW(), NOW())
        RETURNING id, code;
      `, [c.code, c.name, c.credits, c.sem, c.deptId, facultyMap[c.facCode]]);
      courseMap[c.code] = crsRes.rows[0].id;
    }

    console.log(`[${label}] 11. Seeding Timetable Entries...`);
    const timetableSlots = [
      { day: 'Monday', period: 1, slot: '09:00 - 09:55', cCode: 'CS301', facCode: 'FAC-CSE-001', room: 'CR-101', sec: 'A', sem: 4, deptId: cseDept.id },
      { day: 'Monday', period: 2, slot: '10:00 - 10:55', cCode: 'CS302', facCode: 'FAC-CSE-003', room: 'CR-101', sec: 'A', sem: 4, deptId: cseDept.id },
      { day: 'Monday', period: 3, slot: '11:15 - 12:10', cCode: 'CS303', facCode: 'FAC-CSE-002', room: 'LH-201', sec: 'A', sem: 4, deptId: cseDept.id },
      { day: 'Tuesday', period: 1, slot: '09:00 - 09:55', cCode: 'CS304', facCode: 'FAC-CSE-001', room: 'CR-102', sec: 'A', sem: 4, deptId: cseDept.id },
      { day: 'Tuesday', period: 2, slot: '10:00 - 10:55', cCode: 'CS301', facCode: 'FAC-CSE-001', room: 'LAB-301', sec: 'A', sem: 4, deptId: cseDept.id },
      { day: 'Wednesday', period: 1, slot: '09:00 - 09:55', cCode: 'CS302', facCode: 'FAC-CSE-003', room: 'CR-101', sec: 'A', sem: 4, deptId: cseDept.id },
      { day: 'Thursday', period: 1, slot: '09:00 - 09:55', cCode: 'CS303', facCode: 'FAC-CSE-002', room: 'CR-101', sec: 'A', sem: 4, deptId: cseDept.id },
      { day: 'Friday', period: 2, slot: '10:00 - 10:55', cCode: 'CS304', facCode: 'FAC-CSE-001', room: 'CR-101', sec: 'A', sem: 4, deptId: cseDept.id },
    ];

    for (const tt of timetableSlots) {
      await client.query(`
        INSERT INTO "TimetableEntry" (id, "dayOfWeek", period, "timeSlot", "courseId", "facultyId", "roomNumber", section, semester, "departmentId", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1::"DayOfWeek", $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT DO NOTHING;
      `, [tt.day, tt.period, tt.slot, courseMap[tt.cCode], facultyMap[tt.facCode], tt.room, tt.sec, tt.sem, tt.deptId]);
    }

    console.log(`[${label}] 12. Seeding Fee Structures & Transactions...`);
    await client.query(`
      INSERT INTO "FeeStructure" (id, program, quota, "tuitionFee", "hostelFee", "examFee", "libraryDeposit", "totalAmount", "dueDate", "createdAt", "updatedAt")
      VALUES 
        (gen_random_uuid()::text, 'B.Tech-CSE', 'general'::"FeeQuota", 65000, 10000, 5000, 5000, 85000, '2026-11-30', NOW(), NOW()),
        (gen_random_uuid()::text, 'B.Tech-CSE', 'merit'::"FeeQuota", 35000, 10000, 5000, 5000, 55000, '2026-11-30', NOW(), NOW()),
        (gen_random_uuid()::text, 'B.Tech-CSE', 'management'::"FeeQuota", 95000, 10000, 5000, 5000, 115000, '2026-11-30', NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `);

    // Transactions for Paid / Partial Students
    await client.query(`
      INSERT INTO "FeeTransaction" (id, "receiptNumber", "studentId", amount, "paymentMethod", status, "paidAt", "createdAt", "updatedAt")
      VALUES
        (gen_random_uuid()::text, 'REC-2026-001', $1, 85000, 'UPI'::"PaymentMethod", 'success'::"TransactionStatus", NOW() - INTERVAL '5 days', NOW(), NOW()),
        (gen_random_uuid()::text, 'REC-2026-002', $2, 55000, 'NetBanking'::"PaymentMethod", 'success'::"TransactionStatus", NOW() - INTERVAL '8 days', NOW(), NOW()),
        (gen_random_uuid()::text, 'REC-2026-004', $3, 85000, 'CreditCard'::"PaymentMethod", 'success'::"TransactionStatus", NOW() - INTERVAL '2 days', NOW(), NOW()),
        (gen_random_uuid()::text, 'REC-2026-006', $4, 45000, 'UPI'::"PaymentMethod", 'success'::"TransactionStatus", NOW() - INTERVAL '1 day', NOW(), NOW());
    `, [studentIdMap['22CS001'], studentIdMap['22CS002'], studentIdMap['22CS004'], studentIdMap['22CS006']]);

    console.log(`[${label}] 13. Seeding Document Requests & Fulfillment...`);
    const docRequests = [
      { stRoll: '22CS001', name: 'Bonafide Certificate', purpose: 'Passport Application', status: 'completed', url: 'https://campusone.edu/docs/bonafide_22CS001.pdf', reviewer: hodUserId },
      { stRoll: '22CS002', name: 'Official Academic Transcript', purpose: 'Master Studies Abroad', status: 'completed', url: 'https://campusone.edu/docs/transcript_22CS002.pdf', reviewer: hodUserId },
      { stRoll: '22CS004', name: 'Character & Conduct Certificate', purpose: 'Government Internship', status: 'completed', url: 'https://campusone.edu/docs/character_22CS004.pdf', reviewer: hodUserId },
      { stRoll: '22CS007', name: 'No Objection Certificate (NOC)', purpose: 'Summer Research Internship', status: 'pending', url: null, reviewer: null },
      { stRoll: '22CS005', name: 'Fee Concession Endorsement', purpose: 'Tuition Fee Waiver', status: 'pending', url: null, reviewer: null },
      { stRoll: '22CS010', name: 'Letter of Recommendation (LOR)', purpose: 'Graduate School Application', status: 'pending', url: null, reviewer: null },
    ];

    for (const d of docRequests) {
      await client.query(`
        INSERT INTO "DocumentRequest" (id, "studentId", "documentName", purpose, status, "documentUrl", "reviewerId", "reviewedAt", "requestedAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4::"DocumentStatus", $5, $6, ${d.reviewer ? 'NOW()' : 'NULL'}, NOW(), NOW());
      `, [studentIdMap[d.stRoll], d.name, d.purpose, d.status, d.url, d.reviewer]);
    }

    console.log(`[${label}] 14. Seeding Library Catalog & Circulation...`);
    const bookRes = await client.query(`
      INSERT INTO "Book" (id, title, author, isbn, category, "totalCopies", "availableCopies", publisher, "rackLocation", "createdAt", "updatedAt")
      VALUES
        (gen_random_uuid()::text, 'Database System Concepts', 'Silberschatz, Korth, Sudarshan', '978-0078022159', 'Computer Science', 10, 8, 'McGraw-Hill', 'CS-01-A', NOW(), NOW()),
        (gen_random_uuid()::text, 'Introduction to Algorithms (CLRS)', 'Cormen, Leiserson, Rivest, Stein', '978-0262033848', 'Computer Science', 12, 10, 'MIT Press', 'CS-02-B', NOW(), NOW()),
        (gen_random_uuid()::text, 'Modern Operating Systems', 'Andrew S. Tanenbaum', '978-0133591620', 'Computer Science', 8, 7, 'Pearson', 'CS-03-A', NOW(), NOW()),
        (gen_random_uuid()::text, 'Computer Networking: A Top-Down Approach', 'Kurose, Ross', '978-0133594140', 'Computer Science', 10, 9, 'Pearson', 'CS-04-C', NOW(), NOW()),
        (gen_random_uuid()::text, 'Clean Code', 'Robert C. Martin', '978-0132350884', 'Software Engineering', 6, 5, 'Prentice Hall', 'CS-05-A', NOW(), NOW())
      RETURNING id, title;
    `);

    // Circulation record for Aarav
    await client.query(`
      INSERT INTO "CirculationRecord" (id, "bookId", "borrowerId", "issueDate", "dueDate", status, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, $1, (SELECT "userId" FROM "Student" WHERE id = $2), NOW() - INTERVAL '7 days', NOW() + INTERVAL '7 days', 'issued'::"CirculationStatus", NOW(), NOW());
    `, [bookRes.rows[0].id, studentIdMap['22CS001']]);

    console.log(`[${label}] 15. Seeding Examinations, Results & Campus Notices...`);
    const examRes = await client.query(`
      INSERT INTO "Examination" (id, title, "academicYear", semester, "startDate", "endDate", status, "hallTicketReleased", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, 'Mid-Semester Examinations (Fall 2026)', '2026-2027', 4, NOW() + INTERVAL '10 days', NOW() + INTERVAL '20 days', 'upcoming'::"ExamStatus", true, NOW(), NOW())
      RETURNING id;
    `);

    await client.query(`
      INSERT INTO "ExamResult" (id, "examinationId", "studentId", "courseId", "internalScore", "endSemScore", "totalScore", grade, status, "createdAt", "updatedAt")
      VALUES
        (gen_random_uuid()::text, $1, $2, $3, 28, 64, 92, 'A+', 'published', NOW(), NOW()),
        (gen_random_uuid()::text, $1, $4, $3, 29, 66, 95, 'O', 'published', NOW(), NOW());
    `, [examRes.rows[0].id, studentIdMap['22CS001'], courseMap['CS301'], studentIdMap['22CS002']]);

    await client.query(`
      INSERT INTO "Notice" (id, title, content, category, "targetRole", "publishedBy", "isUrgent", "publishedAt", "createdAt", "updatedAt")
      VALUES 
        (gen_random_uuid()::text, 'Mid-Semester Examination Schedule 2026', 'The Fall 2026 Mid-Semester Examinations commence in 10 days. Students must carry valid hall tickets and campus ID cards.', 'examination'::"NoticeCategory", 'all'::"NoticeTargetRole", $1, true, NOW(), NOW(), NOW()),
        (gen_random_uuid()::text, 'Semester 4 Fee Dues Notice', 'Students with outstanding dues for Semester 4 are advised to clear them by November 30 to avoid examination registration holds.', 'fee'::"NoticeCategory", 'student'::"NoticeTargetRole", $1, false, NOW(), NOW(), NOW()),
        (gen_random_uuid()::text, 'Annual Smart Campus Hackathon', 'Registrations are now open for the 48-hour Annual CampusOne Hackathon hosted by the Department of Computer Science.', 'events'::"NoticeCategory", 'all'::"NoticeTargetRole", $1, false, NOW(), NOW(), NOW());
    `, [adminUserId]);

    await client.query('COMMIT;');
    console.log(`\n======================================================`);
    console.log(`[SEEDER] SUCCESS! Clean & Seed completed on: ${label}`);
    console.log(`======================================================\n`);
  } catch (error) {
    await client.query('ROLLBACK;');
    console.error(`[SEEDER ERROR] Transaction failed on ${label}:`, error);
    throw error;
  } finally {
    await client.end();
  }
}

async function run() {
  const targetArg = process.argv[2];
  const defaultUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_R42trhBoesAx@ep-green-pine-azr0z3ii.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

  if (targetArg) {
    console.log(`Running seeder on specified target: ${targetArg}`);
    await seedDatabase(targetArg, 'Custom Target Database');
  } else {
    console.log('TARGET: Production / Default Database');
    await seedDatabase(defaultUrl, 'Production Database');
    console.log('\nDATABASE SEEDING COMPLETED SUCCESSFULLY!\n');
  }
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
