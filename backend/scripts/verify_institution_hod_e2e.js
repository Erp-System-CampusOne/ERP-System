const http = require('http');

function postJson(urlPath, data, token = null) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: urlPath,
      method: 'POST',
      headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getJson(urlPath, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: urlPath,
      method: 'GET',
      headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('=== Step 1: Admin Login (COID1001) ===');
  const adminLogin = await postJson('/api/auth/login', {
    identifier: 'COID1001',
    password: 'Admin123!'
  });
  if (adminLogin.status !== 200) {
    console.error('Admin login failed:', adminLogin);
    process.exit(1);
  }
  console.log('Login res:', adminLogin);
  const adminToken = adminLogin.data?.tokens?.accessToken || adminLogin.data?.token;
  console.log('Admin logged in successfully.');

  console.log('\n=== Step 2: Fetch Institution HOD Details (/api/admin/hods) ===');
  const hodsRes = await getJson('/api/admin/hods', adminToken);
  console.log('Status:', hodsRes.status);
  console.log('Active HOD:', hodsRes.data.activeHod?.name, `(${hodsRes.data.activeHod?.employeeCode})`);
  console.log('Total Oversight Departments:', hodsRes.data.departments?.length);
  console.log('Historical Tenures:', hodsRes.data.history?.length);
  console.log('Total Faculty Under Oversight:', hodsRes.data.totalFacultyCount);
  console.log('Total Students Under Oversight:', hodsRes.data.totalStudentCount);

  if (!hodsRes.data.activeHod || hodsRes.data.activeHod.email !== 'hod@campus.edu') {
    console.error('Expected active HOD to be hod@campus.edu, got:', hodsRes.data.activeHod);
    process.exit(1);
  }

  console.log('\n=== Step 3: Fetch Faculty list to find a candidate for promotion ===');
  const facultyRes = await getJson('/api/faculty', adminToken);
  console.log(`Found ${facultyRes.data?.length || 0} faculty members.`);
  const candidate = facultyRes.data.find(f => f.user?.email === 'faculty.sharma@campus.edu' || f.email === 'faculty.sharma@campus.edu');
  if (!candidate) {
    console.error('Could not find candidate faculty.sharma@campus.edu. Faculty list:', facultyRes.data.map(f => f.user?.email || f.email || f.name));
    process.exit(1);
  }
  console.log(`Candidate found: ${candidate.user?.name || candidate.name} (ID: ${candidate.id})`);

  console.log('\n=== Step 4: Promote Candidate to Institution HOD ===');
  const promoteRes = await postJson('/api/admin/hod/promote', { facultyId: candidate.id }, adminToken);
  console.log('Promotion status:', promoteRes.status, promoteRes.data);
  if (promoteRes.status !== 200) {
    console.error('Promotion failed!');
    process.exit(1);
  }

  console.log('\n=== Step 5: Verify Active HOD is now Candidate ===');
  const hodsAfterPromote = await getJson('/api/admin/hods', adminToken);
  console.log('New Active HOD:', hodsAfterPromote.data.activeHod?.name, `(${hodsAfterPromote.data.activeHod?.email})`);
  console.log('History count now:', hodsAfterPromote.data.history?.length);
  if (hodsAfterPromote.data.activeHod?.email !== 'faculty.sharma@campus.edu') {
    console.error('Active HOD was not updated properly!');
    process.exit(1);
  }

  console.log('\n=== Step 6: Relieve Active HOD ===');
  const relieveRes = await postJson('/api/admin/hod/relieve', { hodId: candidate.id }, adminToken);
  console.log('Relieve status:', relieveRes.status, relieveRes.data);
  if (relieveRes.status !== 200) {
    console.error('Relief failed!');
    process.exit(1);
  }

  const hodsAfterRelieve = await getJson('/api/admin/hods', adminToken);
  console.log('Active HOD after relief:', hodsAfterRelieve.data.activeHod);
  if (hodsAfterRelieve.data.activeHod !== null) {
    console.error('Expected active HOD to be null after relief!');
    process.exit(1);
  }

  console.log('\n=== Step 7: Re-promote Dr. Sarah Jenkins back as Institution HOD ===');
  const sarahCandidate = facultyRes.data.find(f => f.user?.email === 'hod@campus.edu' || f.email === 'hod@campus.edu');
  const restoreRes = await postJson('/api/admin/hod/promote', { facultyId: sarahCandidate.id }, adminToken);
  console.log('Restore promotion status:', restoreRes.status);
  
  const hodsFinal = await getJson('/api/admin/hods', adminToken);
  console.log('Final Active HOD:', hodsFinal.data.activeHod?.name, `(${hodsFinal.data.activeHod?.email})`);
  if (hodsFinal.data.activeHod?.email !== 'hod@campus.edu') {
    console.error('Failed to restore Sarah Jenkins as HOD!');
    process.exit(1);
  }

  console.log('\n=== Step 8: Test Institution HOD Dashboard Login & API Access ===');
  const hodLogin = await postJson('/api/auth/login', {
    identifier: 'COID1002',
    password: 'Hod123!'
  });
  console.log('HOD login status:', hodLogin.status, 'Role:', hodLogin.data?.user?.role, `(CampusOne ID: ${hodLogin.data?.user?.campusId})`);
  if (hodLogin.status !== 200 || hodLogin.data.user.role !== 'hod') {
    console.error('HOD login failed:', hodLogin);
    process.exit(1);
  }
  const hodToken = hodLogin.data.token || hodLogin.data.tokens?.accessToken;
  const deptsRes = await getJson('/api/departments', hodToken);
  const coursesRes = await getJson('/api/courses', hodToken);
  const facultyRes2 = await getJson('/api/faculty', hodToken);
  const studentsRes = await getJson('/api/students', hodToken);
  const docsRes = await getJson('/api/documents/queue', hodToken);

  console.log('HOD can access Departments:', deptsRes.status === 200, `(${deptsRes.data?.length} depts)`);
  console.log('HOD can access Courses:', coursesRes.status === 200, `(${coursesRes.data?.length} courses)`);
  console.log('HOD can access Faculty:', facultyRes2.status === 200, `(${facultyRes2.data?.length} faculty)`);
  console.log('HOD can access Students:', studentsRes.status === 200, `(${studentsRes.data?.length} students)`);
  console.log('HOD can access Document Queue:', docsRes.status === 200);

  if (deptsRes.status !== 200 || coursesRes.status !== 200 || facultyRes2.status !== 200 || studentsRes.status !== 200) {
    console.error('HOD academic permissions check failed!');
    process.exit(1);
  }

  console.log('\n=== Step 9: Verify All Single Institution Roles Authenticate via CampusOne ID ===');
  const rolesToVerify = [
    { name: 'Admin', campusId: 'COID1001', email: 'admin@campus.edu', pass: 'Admin123!', role: 'admin' },
    { name: 'Institution HOD', campusId: 'COID1002', email: 'hod@campus.edu', pass: 'Hod123!', role: 'hod' },
    { name: 'Librarian', campusId: 'COID1004', email: 'librarian@campus.edu', pass: 'Librarian123!', role: 'librarian' },
    { name: 'Finance Officer', campusId: 'COID1005', email: 'finance@campus.edu', pass: 'Finance123!', role: 'finance_officer' },
    { name: 'Analytics Officer', campusId: 'COID1003', email: 'analytics@campus.edu', pass: 'Analytics123!', role: 'analytics' }
  ];

  for (const r of rolesToVerify) {
    const res = await postJson('/api/auth/login', { identifier: r.campusId, password: r.pass });
    if (res.status === 200 && res.data.user.role === r.role) {
      console.log(`[PASS] ${r.name.padEnd(20)}: ${r.campusId} (${res.data.user.role}) [Name: ${res.data.user.name}]`);
    } else {
      console.error(`[FAIL] ${r.name}: status=${res.status}`, res.data);
      process.exit(1);
    }

    // Verify email login rejection
    const emailRes = await postJson('/api/auth/login', { identifier: r.email, password: r.pass });
    if (emailRes.status === 401 && emailRes.data.message?.includes('Email login is disabled')) {
      console.log(`[PASS] Email Block Check for ${r.name}: "${emailRes.data.message}"`);
    } else {
      console.error(`[FAIL] Expected email login rejection for ${r.email}, got status ${emailRes.status}:`, emailRes.data);
      process.exit(1);
    }
  }

  console.log('\n>>> ALL 9 VERIFICATION CHECKS PASSED WITH FLYING COLORS! <<<');
}

run().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
