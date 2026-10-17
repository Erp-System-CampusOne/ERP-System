const accounts = [
  { identifier: 'admin@campus.edu', password: 'Admin123!', role: 'admin' },
  { identifier: 'hod@campus.edu', password: 'Hod123!', role: 'hod' },
  { identifier: 'faculty.sharma@campus.edu', password: 'Faculty123!', role: 'faculty' },
  { identifier: 'student.aarav@campus.edu', password: 'Student123!', role: 'student' },
  { identifier: 'analytics@campus.edu', password: 'Analytics123!', role: 'analytics' },
  { identifier: 'librarian@campus.edu', password: 'Librarian123!', role: 'librarian' },
  { identifier: 'finance@campus.edu', password: 'Finance123!', role: 'finance_officer' },
  // Also test identifier by Roll Number and Employee Code
  { identifier: '22CS001', password: 'Student123!', role: 'student' },
  { identifier: 'HOD-INST-001', password: 'Hod123!', role: 'hod' },
  { identifier: 'FAC-CSE-001', password: 'Faculty123!', role: 'faculty' }
];

async function testLogins() {
  console.log('Testing authentication against http://localhost:8080/api/auth/login...\n');
  let passed = 0;
  for (const acc of accounts) {
    try {
      const resp = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(acc)
      });
      const data = await resp.json();
      const userName = data.data?.user?.name || data.user?.name || 'Unknown';
      const userRole = data.data?.user?.role || data.user?.role || 'Unknown';
      if (resp.status === 200 && data.token && data.user) {
        console.log(`[PASS] [${acc.role.padEnd(15, ' ')}] Identifier: ${acc.identifier.padEnd(26, ' ')} -> Logged in as: ${userName} (${userRole})`);
        passed++;
      } else {
        console.error(`[FAIL] [${acc.role}] Identifier: ${acc.identifier} -> HTTP ${resp.status}:`, data);
      }
    } catch (e) {
      console.error(`[ERROR] [${acc.role}] Identifier: ${acc.identifier}:`, e.message);
    }
  }
  console.log(`\nResult: ${passed}/${accounts.length} logins verified successfully.`);
}

testLogins();
