const accounts = [
  // CampusOne ID Logins (Expect SUCCESS)
  { identifier: 'COID1001', password: 'Admin123!', role: 'admin', expectedSuccess: true },
  { identifier: 'COID1002', password: 'Hod123!', role: 'hod', expectedSuccess: true },
  { identifier: 'COID1003', password: 'Analytics123!', role: 'analytics', expectedSuccess: true },
  { identifier: 'COID1004', password: 'Librarian123!', role: 'librarian', expectedSuccess: true },
  { identifier: 'COID1005', password: 'Finance123!', role: 'finance_officer', expectedSuccess: true },
  { identifier: 'COID2001', password: 'Faculty123!', role: 'faculty', expectedSuccess: true },
  { identifier: 'COID3001', password: 'Student123!', role: 'student', expectedSuccess: true },
  
  // Email Logins (Must be REJECTED)
  { identifier: 'admin@campus.edu', password: 'Admin123!', role: 'admin', expectedSuccess: false },
  { identifier: 'student.aarav@campus.edu', password: 'Student123!', role: 'student', expectedSuccess: false },
  { identifier: 'hod@campus.edu', password: 'Hod123!', role: 'hod', expectedSuccess: false }
];

async function testLogins() {
  console.log('Testing CampusOne ID authentication against http://localhost:8080/api/auth/login...\n');
  let passed = 0;
  for (const acc of accounts) {
    try {
      const resp = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: acc.identifier, password: acc.password })
      });
      const data = await resp.json();
      const userName = data.data?.user?.name || data.user?.name || 'Unknown';
      const userRole = data.data?.user?.role || data.user?.role || 'Unknown';
      
      if (acc.expectedSuccess) {
        if (resp.status === 200 && data.token && data.user) {
          console.log(`[PASS] [${acc.role.padEnd(15, ' ')}] CampusOne ID: ${acc.identifier.padEnd(12, ' ')} -> Logged in as: ${userName} (${userRole}) [campusId: ${data.user.campusId}]`);
          passed++;
        } else {
          console.error(`[FAIL] [${acc.role}] Expected success for ${acc.identifier} -> HTTP ${resp.status}:`, data);
        }
      } else {
        // Expected to be rejected
        if (resp.status === 401 && data.message?.includes('Email login is disabled')) {
          console.log(`[PASS] [EMAIL BLOCKED  ] Identifier: ${acc.identifier.padEnd(25, ' ')} -> Correctly rejected: "${data.message}"`);
          passed++;
        } else {
          console.error(`[FAIL] Expected email login rejection for ${acc.identifier} -> HTTP ${resp.status}:`, data);
        }
      }
    } catch (e) {
      console.error(`[ERROR] [${acc.role}] Identifier: ${acc.identifier}:`, e.message);
    }
  }
  console.log(`\nResult: ${passed}/${accounts.length} checks verified successfully.`);
  if (passed !== accounts.length) process.exit(1);
}

testLogins();
