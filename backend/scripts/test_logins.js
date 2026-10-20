/**
 * Campus ID Exclusive Authentication Verification Suite
 * Verifies that Campus ID and Password are the ONLY permitted credentials across the system.
 */

const positiveCases = [
  { identifier: 'COID1001', password: 'Admin123!', role: 'admin', label: 'System Admin' },
  { identifier: 'COID1002', password: 'Hod123!', role: 'hod', label: 'Institution HOD' },
  { identifier: 'COID1003', password: 'Analytics123!', role: 'analytics', label: 'Institutional Analytics' },
  { identifier: 'COID1004', password: 'Librarian123!', role: 'librarian', label: 'Librarian' },
  { identifier: 'COID1005', password: 'Finance123!', role: 'finance_officer', label: 'Finance Officer' },
  { identifier: 'COID2001', password: 'Faculty123!', role: 'faculty', label: 'Faculty (CSE)' },
  { identifier: 'COID3001', password: 'Student123!', role: 'student', label: 'Student (CSE)' },
];

const negativeCases = [
  // 1. Email identifier login attempts (MUST be rejected with 401)
  { label: 'Email login (Admin)', body: { identifier: 'admin@campus.edu', password: 'Admin123!' }, expectStatus: 401, checkMessage: 'Email login is disabled' },
  { label: 'Email login (Student)', body: { identifier: 'student.aarav@campus.edu', password: 'Student123!' }, expectStatus: 401, checkMessage: 'Email login is disabled' },
  { label: 'Email login (HOD)', body: { identifier: 'hod@campus.edu', password: 'Hod123!' }, expectStatus: 401, checkMessage: 'Email login is disabled' },

  // 2. Student roll number login attempts (MUST be rejected with 401)
  { label: 'Roll Number login (22CS001)', body: { identifier: '22CS001', password: 'Student123!' }, expectStatus: 401, checkMessage: 'Invalid Campus ID or password' },
  { label: 'Roll Number login (22CS002)', body: { identifier: '22CS002', password: 'Student123!' }, expectStatus: 401, checkMessage: 'Invalid Campus ID or password' },

  // 3. Faculty employee code login attempts (MUST be rejected with 401)
  { label: 'Employee Code login (FAC-CSE-001)', body: { identifier: 'FAC-CSE-001', password: 'Faculty123!' }, expectStatus: 401, checkMessage: 'Invalid Campus ID or password' },
  { label: 'HOD Employee Code login (HOD-INST-001)', body: { identifier: 'HOD-INST-001', password: 'Hod123!' }, expectStatus: 401, checkMessage: 'Invalid Campus ID or password' },

  // 4. Name / Username / Phone login attempts (MUST be rejected with 401)
  { label: 'Full Name login', body: { identifier: 'System Administrator', password: 'Admin123!' }, expectStatus: 401, checkMessage: 'Invalid Campus ID or password' },
  { label: 'Username login', body: { identifier: 'admin', password: 'Admin123!' }, expectStatus: 401, checkMessage: 'Invalid Campus ID or password' },
  { label: 'Phone Number login', body: { identifier: '9876543210', password: 'Admin123!' }, expectStatus: 401, checkMessage: 'Invalid Campus ID or password' },

  // 5. Alternative JSON payload fields without Campus ID (MUST be rejected with 400)
  { label: 'Unsupported email body field', body: { email: 'admin@campus.edu', password: 'Admin123!' }, expectStatus: 400, checkMessage: 'Alternative identifiers' },
  { label: 'Unsupported rollNumber body field', body: { rollNumber: '22CS001', password: 'Student123!' }, expectStatus: 400, checkMessage: 'Alternative identifiers' },

  // 6. Missing credentials (MUST be rejected with 400)
  { label: 'Missing Campus ID', body: { identifier: '', password: 'Admin123!' }, expectStatus: 400, checkMessage: 'Campus ID and password are required' },
  { label: 'Missing password', body: { identifier: 'COID1001', password: '' }, expectStatus: 400, checkMessage: 'Campus ID and password are required' },

  // 7. Invalid credentials (MUST be rejected with 401)
  { label: 'Wrong password for valid Campus ID', body: { identifier: 'COID1001', password: 'WrongPassword999' }, expectStatus: 401, checkMessage: 'Invalid' },
  { label: 'Non-existent Campus ID', body: { identifier: 'COID9999', password: 'Admin123!' }, expectStatus: 401, checkMessage: 'Invalid Campus ID or password' },
];

async function runAuthVerificationSuite() {
  console.log('========================================================================');
  console.log('   CAMPUS ID EXCLUSIVE AUTHENTICATION TEST SUITE');
  console.log('   Target: http://localhost:8080/api/auth/login');
  console.log('========================================================================\n');

  let passed = 0;
  const total = positiveCases.length + negativeCases.length;

  console.log('--- 1. POSITIVE TESTS: All Supported Roles with Campus ID ---');
  for (const c of positiveCases) {
    try {
      const resp = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: c.identifier, password: c.password })
      });
      const data = await resp.json();
      const userName = data.user?.name || data.data?.user?.name || 'Unknown';
      const userRole = data.user?.role || data.data?.user?.role || 'Unknown';
      const campusId = data.user?.campusId || data.data?.user?.campusId || 'Unknown';

      if (resp.status === 200 && data.token && campusId === c.identifier) {
        console.log(`  [PASS] [${c.role.padEnd(16)}] Campus ID: ${c.identifier.padEnd(10)} -> ${userName} (${userRole}) [campusId verified: ${campusId}]`);
        passed++;
      } else {
        console.error(`  [FAIL] [${c.role}] ${c.label} failed -> HTTP ${resp.status}:`, data);
      }
    } catch (e) {
      console.error(`  [ERROR] ${c.label}:`, e.message);
    }
  }

  console.log('\n--- 2. NEGATIVE TESTS: Rejection of All Alternative Identifiers & Bad Inputs ---');
  for (const n of negativeCases) {
    try {
      const resp = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n.body)
      });
      const data = await resp.json();
      const msg = data.message || '';

      const statusMatches = resp.status === n.expectStatus;
      const messageMatches = !n.checkMessage || msg.toLowerCase().includes(n.checkMessage.toLowerCase());

      if (statusMatches && messageMatches) {
        console.log(`  [PASS] [BLOCKED HTTP ${resp.status}] ${n.label.padEnd(38)} -> "${msg}"`);
        passed++;
      } else {
        console.error(`  [FAIL] ${n.label} -> Expected HTTP ${n.expectStatus} (${n.checkMessage}), got HTTP ${resp.status}: "${msg}"`);
      }
    } catch (e) {
      console.error(`  [ERROR] ${n.label}:`, e.message);
    }
  }

  console.log('\n========================================================================');
  console.log(`   TEST RESULTS: ${passed}/${total} CHECKS PASSED`);
  console.log('========================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runAuthVerificationSuite();
