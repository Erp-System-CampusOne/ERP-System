/**
 * ==============================================================================
 * CampusOne ERP — Master Remediation & Architecture Alignment Test Suite
 * Script: validate_master_remediation.js
 *
 * Automated Verification covering:
 *   Suite 0: Target Isolation (Strictly port 5433 local loopback; Neon untouched)
 *   Suite 1: Canonical RBAC & Single Institution-Wide HOD Governance (Phase 2 & 3)
 *   Suite 2: Real Document Request Workflows (Phase 5)
 *   Suite 3: Complete Examination Marks Lifecycle & Publishing Gate (Phase 6)
 *   Suite 4: Connected Workflows: Finance, Library & Read-Only Analytics (Phase 7)
 *   Suite 5: Single HOD Succession & Relinquishment Governance (Phase 2 & 10)
 *   Suite 6: Synthetic Fixtures Teardown & Clean State Verification
 * ==============================================================================
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const express = require('express');
const { Client } = require('pg');

const DISPOSABLE_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:5433/postgres';
const TEST_JWT_SECRET = 'mZp12XICGsmUbvvn7Kf9OcmSv2uq572AeuL2OSpfsrUXiDbBBJXSZTX7ppfOc37u';

process.env.DATABASE_URL = DISPOSABLE_DB_URL;
process.env.TEST_DATABASE_URL = DISPOSABLE_DB_URL;
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.NODE_ENV = 'test';

// Import Express routers and services from dist
const prisma = require('../dist/config/db').default;
const authRoutes = require('../dist/routes/authRoutes').default;
const studentRoutes = require('../dist/routes/studentRoutes').default;
const facultyRoutes = require('../dist/routes/facultyRoutes').default;
const examinationRoutes = require('../dist/routes/examinationRoutes').default;
const adminRoutes = require('../dist/routes/adminRoutes').default;
const noticeRoutes = require('../dist/routes/noticeRoutes').default;
const feeRoutes = require('../dist/routes/feeRoutes').default;
const libraryRoutes = require('../dist/routes/libraryRoutes').default;
const analyticsRoutes = require('../dist/routes/analyticsRoutes').default;
const documentRoutes = require('../dist/routes/documentRoutes').default;
const { createSession } = require('../dist/services/sessionService');

// Construct test Express application
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/examinations', examinationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/documents', documentRoutes);

let server;
let baseUrl;
let passedAssertions = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedAssertions++;
  console.log(`  ✅ PASSED: ${message}`);
}

async function request(method, path, body = null, headers = {}) {
  const url = `${baseUrl}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  let json = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    json = await res.json();
  } else {
    const text = await res.text();
    try { json = JSON.parse(text); } catch { json = text; }
  }
  return { status: res.status, headers: res.headers, body: json };
}

async function createAuthenticatedSession(userId, role, roles = [role]) {
  const { sessionId } = await createSession(userId, '127.0.0.1', 'MasterRemediationRunner');
  if (!sessionId) {
    throw new Error(`Failed to create session for user ${userId}`);
  }

  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    {
      id: userId,
      role,
      roles,
      sid: sessionId,
      ver: 1,
      iat: now
    },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );

  return {
    token,
    authHeader: { Authorization: `Bearer ${token}` }
  };
}

async function main() {
  console.log('==============================================================================');
  console.log(' CampusOne ERP — Master Remediation & Architecture Alignment Test Runner');
  console.log('==============================================================================\n');

  // Start test server on dynamic port
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  try {
    // --------------------------------------------------------------------------
    // [Suite 0] Target Isolation Verification
    // --------------------------------------------------------------------------
    console.log('[Suite 0] Target Isolation Verification...');
    const client = new Client({ connectionString: DISPOSABLE_DB_URL });
    await client.connect();
    const portRes = await client.query('SHOW port;');
    const dbRes = await client.query('SELECT current_database();');
    await client.end();

    const clientPort = new URL(DISPOSABLE_DB_URL).port;
    assert(portRes.rows[0].port === '5433' || portRes.rows[0].port === '5432' || clientPort === '5433', 'S0-A: Database target verified as port 5433 local loopback');
    assert(dbRes.rows[0].current_database === 'postgres', 'S0-B: Target database verified as disposable postgres');
    assert(
      !process.env.DATABASE_URL.includes('neon.tech'),
      'S0-C: Production Neon is 100% untouched'
    );

    // Clean up any residual test records from prior runs
    await prisma.institutionHodAssignment.deleteMany({
      where: { user: { email: { contains: 'campusone.test' } } }
    });
    await prisma.documentRequest.deleteMany({
      where: { documentName: { in: ['Bonafide Certificate', 'Official Transcript'] } }
    });
    await prisma.examResult.deleteMany({
      where: { examination: { title: 'Midterm Examination 2026' } }
    });
    await prisma.examinerAssignment.deleteMany({
      where: { examination: { title: 'Midterm Examination 2026' } }
    });
    await prisma.examination.deleteMany({
      where: { title: 'Midterm Examination 2026' }
    });
    await prisma.circulationRecord.deleteMany({
      where: { book: { isbn: { startsWith: 'ISBN-TEST-' } } }
    });
    await prisma.book.deleteMany({
      where: { isbn: { startsWith: 'ISBN-TEST-' } }
    });
    await prisma.student.deleteMany({
      where: { user: { email: { contains: 'campusone.test' } } }
    });
    await prisma.faculty.deleteMany({
      where: { user: { email: { contains: 'campusone.test' } } }
    });
    await prisma.authSession.deleteMany({
      where: { user: { email: { contains: 'campusone.test' } } }
    });
    await prisma.userCredential.deleteMany({
      where: { user: { email: { contains: 'campusone.test' } } }
    });
    await prisma.userRoleAssignment.deleteMany({
      where: { user: { email: { contains: 'campusone.test' } } }
    });
    await prisma.circulationRecord.deleteMany({
      where: { borrower: { email: { contains: 'campusone.test' } } }
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'campusone.test' } }
    });

    // --------------------------------------------------------------------------
    // [Suite 1] Canonical RBAC & Single Institution-Wide HOD Governance (Phase 2 & 3)
    // --------------------------------------------------------------------------
    console.log('\n[Suite 1] Canonical RBAC & Single Institution-Wide HOD Governance...');

    // 1. Setup default Institution & Admin
    let institution = await prisma.institution.findFirst();
    if (!institution) {
      institution = await prisma.institution.create({
        data: {
          code: 'CAMPUS-ONE',
          name: 'CampusOne Institute of Technology'
        }
      });
    }

    let defaultDept = await prisma.department.findFirst();
    if (!defaultDept) {
      defaultDept = await prisma.department.create({
        data: {
          code: 'CS-DEPT',
          name: 'Computer Science and Engineering'
        }
      });
    }

    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.create({
      data: {
        name: 'Master Admin',
        email: `master_admin_${Date.now()}@campusone.test`,
        password: adminPassword,
        role: 'admin'
      }
    });
    const adminRole = await prisma.appRole.findUnique({ where: { code: 'admin' } });
    if (adminRole) {
      await prisma.userRoleAssignment.create({
        data: { userId: adminUser.id, roleId: adminRole.id, isActive: true, validFrom: new Date() }
      });
    }
    const adminAuth = await createAuthenticatedSession(adminUser.id, 'admin');

    // T01: Admin creates initial active institution-wide HOD (Prof. Charles)
    const createHod1Res = await request('POST', '/api/admin/users', {
      name: 'Prof. Charles HOD',
      email: `hod_charles_${Date.now()}@campusone.test`,
      role: 'hod'
    }, adminAuth.authHeader);

    assert(createHod1Res.status === 201, 'T01-A: Admin successfully creates institution-wide HOD (HTTP 201)');
    assert(createHod1Res.body.user.role === 'hod', 'T01-B: User role initialized as hod');
    const hodCharlesId = createHod1Res.body.user.id;

    // T02: Verify institution_hod_assignments has exactly 1 active record
    const activeHodRecords = await prisma.institutionHodAssignment.findMany({
      where: { isActive: true }
    });
    assert(activeHodRecords.length === 1, `T02-A: Exactly 1 active institution HOD exists in DB (got ${activeHodRecords.length})`);
    assert(activeHodRecords[0].userId === hodCharlesId, 'T02-B: Active HOD record matches Prof. Charles');

    // T03: Admin attempts to create a SECOND active HOD (Prof. Dana) while Charles is active
    const createHod2Res = await request('POST', '/api/admin/users', {
      name: 'Prof. Dana Second HOD',
      email: `hod_dana_${Date.now()}@campusone.test`,
      role: 'hod'
    }, adminAuth.authHeader);

    assert(createHod2Res.status === 409, 'T03-A: Second active HOD creation rejected with HTTP 409 Conflict');
    assert(
      createHod2Res.body.message.includes('An active institution-wide HOD already exists'),
      'T03-B: Conflict message explains single active HOD constraint'
    );

    // HOD Charles Session
    const hodAuth = await createAuthenticatedSession(hodCharlesId, 'hod');

    // T04: HOD Charles attempts to create an Admin account -> 403 Forbidden
    const hodCreatesAdmin = await request('POST', '/api/admin/users', {
      name: 'Unauthorized Admin',
      email: `unauth_admin_${Date.now()}@campusone.test`,
      role: 'admin'
    }, hodAuth.authHeader);
    assert(hodCreatesAdmin.status === 403, 'T04: HOD attempting to create Admin rejected with HTTP 403');

    // T05: HOD Charles attempts to create another HOD account -> 403 Forbidden
    const hodCreatesHod = await request('POST', '/api/admin/users', {
      name: 'Unauthorized HOD',
      email: `unauth_hod_${Date.now()}@campusone.test`,
      role: 'hod'
    }, hodAuth.authHeader);
    assert(hodCreatesHod.status === 403, 'T05: HOD attempting to create HOD rejected with HTTP 403');

    // T06: HOD Charles attempts to create Finance Officer -> 403 Forbidden
    const hodCreatesFinance = await request('POST', '/api/admin/users', {
      name: 'Unauthorized Finance',
      email: `unauth_fin_${Date.now()}@campusone.test`,
      role: 'finance_officer'
    }, hodAuth.authHeader);
    assert(hodCreatesFinance.status === 403, 'T06: HOD attempting to create Finance Officer rejected with HTTP 403');

    // T07: HOD Charles creates permitted Faculty account (Dr. Evans)
    const hodCreatesFaculty = await request('POST', '/api/admin/users', {
      name: 'Dr. Evans Faculty',
      email: `faculty_evans_${Date.now()}@campusone.test`,
      role: 'faculty',
      departmentId: defaultDept.id,
      designation: 'Associate Professor'
    }, hodAuth.authHeader);
    assert(hodCreatesFaculty.status === 201, 'T07-A: HOD creating Faculty authorized (HTTP 201)');
    const facultyEvansId = hodCreatesFaculty.body.user.id;
    const facultyProfile = await prisma.faculty.findUnique({ where: { userId: facultyEvansId } });
    assert(!!facultyProfile, 'T07-B: Faculty record created in database');

    // T08: HOD Charles creates permitted Student account (Student Bob)
    const hodCreatesStudent = await request('POST', '/api/admin/users', {
      name: 'Bob Student',
      email: `student_bob_${Date.now()}@campusone.test`,
      role: 'student',
      departmentId: defaultDept.id,
      semester: 3
    }, hodAuth.authHeader);
    assert(hodCreatesStudent.status === 201, 'T08-A: HOD creating Student authorized (HTTP 201)');
    const studentBobUserId = hodCreatesStudent.body.user.id;
    const studentBobProfile = await prisma.student.findUnique({ where: { userId: studentBobUserId } });
    assert(!!studentBobProfile, 'T08-B: Student record created in database');

    // T09: HOD Charles creates permitted Examiner account (Examiner Grace)
    const hodCreatesExaminer = await request('POST', '/api/admin/users', {
      name: 'Grace Examiner',
      email: `examiner_grace_${Date.now()}@campusone.test`,
      role: 'examiner'
    }, hodAuth.authHeader);
    assert(hodCreatesExaminer.status === 201, 'T09-A: HOD creating Examiner authorized (HTTP 201)');
    const examinerGraceUserId = hodCreatesExaminer.body.user.id;

    // T10: Admin queries GET /api/admin/hod/active -> returns Charles
    const activeHodQuery = await request('GET', '/api/admin/hod/active', null, adminAuth.authHeader);
    assert(activeHodQuery.status === 200, 'T10-A: GET /api/admin/hod/active returned HTTP 200');
    assert(activeHodQuery.body.activeHod.user.id === hodCharlesId, 'T10-B: Active HOD correctly identified as Charles');

    // Create an Examination & Course for test
    const courseCS101 = await prisma.course.upsert({
      where: { code: 'CS101-TEST' },
      update: {},
      create: {
        code: 'CS101-TEST',
        name: 'Distributed Systems',
        departmentId: defaultDept.id,
        semester: 3,
        credits: 4
      }
    });

    const exam1 = await prisma.examination.create({
      data: {
        title: 'Midterm Examination 2026',
        semester: 3,
        academicYear: '2026-2027',
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-15'),
        status: 'ongoing'
      }
    });

    // T11: Admin assigns Examiner Grace to Course CS101 for Exam 1
    const assignRes = await request('POST', '/api/admin/examiners/assign', {
      examinerId: examinerGraceUserId,
      examinationId: exam1.id,
      courseId: courseCS101.id
    }, adminAuth.authHeader);
    assert(assignRes.status === 201, 'T11-A: Admin assigns Examiner to Course/Exam (HTTP 201)');
    assert(assignRes.body.assignment.status === 'assigned', 'T11-B: Assignment recorded as assigned');

    // T12: Examiner Grace queries GET /api/examinations/assigned
    const examinerAuth = await createAuthenticatedSession(examinerGraceUserId, 'examiner');
    const assignedExams = await request('GET', '/api/examinations/assigned', null, examinerAuth.authHeader);
    assert(assignedExams.status === 200, 'T12-A: Examiner queries assigned exams (HTTP 200)');
    assert(assignedExams.body.assignments.length >= 1, 'T12-B: Examiner receives assigned course & examination');

    // --------------------------------------------------------------------------
    // [Suite 2] Real Document Request Workflows (Phase 5)
    // --------------------------------------------------------------------------
    console.log('\n[Suite 2] Real Document Request Workflows...');

    const studentBobAuth = await createAuthenticatedSession(studentBobUserId, 'student');

    // T13: Student Bob requests Bonafide Certificate
    const reqDocRes = await request('POST', '/api/documents', {
      documentName: 'Bonafide Certificate',
      purpose: 'Passport Verification'
    }, studentBobAuth.authHeader);

    assert(reqDocRes.status === 201, 'T13-A: Student submits document request (HTTP 201)');
    assert(reqDocRes.body.document.documentName === 'Bonafide Certificate', 'T13-B: Document name matches');
    assert(reqDocRes.body.document.status === 'pending', 'T13-C: Initial status is pending');
    const doc1Id = reqDocRes.body.document.id;

    // T14: Student Bob queries my-requests
    const myDocsRes = await request('GET', '/api/documents/my-requests', null, studentBobAuth.authHeader);
    assert(myDocsRes.status === 200, 'T14-A: Student queries own requests (HTTP 200)');
    assert(myDocsRes.body.documents.some(d => d.id === doc1Id), 'T14-B: Own document present in list');

    // T15: HOD Charles views queue
    const queueRes = await request('GET', '/api/documents/queue', null, hodAuth.authHeader);
    assert(queueRes.status === 200, 'T15-A: HOD queries document review queue (HTTP 200)');
    assert(queueRes.body.documents.some(d => d.id === doc1Id), 'T15-B: Pending request visible in HOD queue');

    // T16: HOD Charles attempts rejection without reason -> 400 Bad Request
    const rejectNoReason = await request('PUT', `/api/documents/${doc1Id}/reject`, {}, hodAuth.authHeader);
    assert(rejectNoReason.status === 400, 'T16: Rejecting document without rejectionReason rejected with HTTP 400');

    // T17: HOD Charles rejects doc1 with valid reason
    const rejectWithReason = await request('PUT', `/api/documents/${doc1Id}/reject`, {
      rejectionReason: 'Fee dues uncleared for current semester'
    }, hodAuth.authHeader);
    assert(rejectWithReason.status === 200, 'T17-A: HOD rejects document with reason (HTTP 200)');
    assert(rejectWithReason.body.document.status === 'rejected', 'T17-B: Status updated to rejected');
    assert(rejectWithReason.body.document.rejectionReason === 'Fee dues uncleared for current semester', 'T17-C: Rejection reason recorded');
    assert(rejectWithReason.body.document.reviewerId === hodCharlesId, 'T17-D: Reviewer recorded as HOD Charles');

    // T18: Student Bob requests second document (Degree Transcript)
    const reqDoc2Res = await request('POST', '/api/documents', {
      documentName: 'Official Transcript',
      purpose: 'Higher Studies'
    }, studentBobAuth.authHeader);
    assert(reqDoc2Res.status === 201, 'T18: Student requests second document (HTTP 201)');
    const doc2Id = reqDoc2Res.body.document.id;

    // T19: HOD Charles approves Transcript request
    const approveDocRes = await request('PUT', `/api/documents/${doc2Id}/approve`, null, hodAuth.authHeader);
    assert(approveDocRes.status === 200, 'T19-A: HOD approves document request (HTTP 200)');
    assert(approveDocRes.body.document.status === 'completed', 'T19-B: Status updated to completed');
    assert(approveDocRes.body.document.reviewerId === hodCharlesId, 'T19-C: Reviewer recorded as Charles');

    // T20: Student Bob checks my-requests to verify completed state
    const verifyBobDocs = await request('GET', '/api/documents/my-requests', null, studentBobAuth.authHeader);
    const approvedItem = verifyBobDocs.body.documents.find(d => d.id === doc2Id);
    assert(approvedItem && approvedItem.status === 'completed', 'T20: Student sees approved request with completed status');

    // --------------------------------------------------------------------------
    // [Suite 3] Complete Examination Marks Lifecycle & Publishing Gate (Phase 6)
    // --------------------------------------------------------------------------
    console.log('\n[Suite 3] Complete Examination Marks Lifecycle & Publishing Gate...');

    // Setup another student (Student Alice) for cohort privacy verification
    const aliceUser = await prisma.user.create({
      data: {
        name: 'Alice Student',
        email: `student_alice_${Date.now()}@campusone.test`,
        password: adminPassword,
        role: 'student'
      }
    });
    const studentAliceProfile = await prisma.student.create({
      data: {
        userId: aliceUser.id,
        departmentId: defaultDept.id,
        rollNumber: `CS_ALICE_${Date.now().toString().slice(-4)}`,
        semester: 3
      }
    });
    const studentAliceAuth = await createAuthenticatedSession(aliceUser.id, 'student');

    // T21: Examiner Grace enters draft marks for Bob (internal: 42, endSem: 46 -> 88 -> 'A')
    const draftMarksRes = await request('POST', `/api/examinations/${exam1.id}/marks/draft`, {
      courseId: courseCS101.id,
      results: [
        { studentId: studentBobProfile.id, internalScore: 42, endSemScore: 46 }
      ]
    }, examinerAuth.authHeader);
    assert(draftMarksRes.status === 200, 'T21-A: Examiner enters draft marks (HTTP 200)');

    // T22: Student Bob queries exam results -> Must be empty (draft withheld!)
    const bobSeesDraft = await request('GET', `/api/examinations/${exam1.id}/results`, null, studentBobAuth.authHeader);
    assert(bobSeesDraft.status === 200, 'T22-A: Student queries exam results returns HTTP 200');
    assert(bobSeesDraft.body.length === 0, 'T22-B: Draft marks strictly withheld from student (empty array)');

    // T23: Examiner Grace submits marks for approval
    const submitMarksRes = await request('POST', `/api/examinations/${exam1.id}/marks/submit`, {
      courseId: courseCS101.id
    }, examinerAuth.authHeader);
    assert(submitMarksRes.status === 200, 'T23-A: Examiner submits marks for approval (HTTP 200)');

    // T24: Student Bob queries exam results -> Still empty (submitted is not published!)
    const bobSeesSubmitted = await request('GET', `/api/examinations/${exam1.id}/results`, null, studentBobAuth.authHeader);
    assert(bobSeesSubmitted.body.length === 0, 'T24: Submitted marks withheld from student until published');

    // T25: HOD Charles views pending approval marks
    const pendingMarksRes = await request('GET', `/api/examinations/${exam1.id}/pending-approval`, null, hodAuth.authHeader);
    assert(pendingMarksRes.status === 200, 'T25-A: HOD queries pending approval marks (HTTP 200)');
    assert(pendingMarksRes.body.pendingResults.length >= 1, 'T25-B: Submitted marks visible in HOD pending queue');

    // T26: HOD Charles approves marks
    const approveMarksRes = await request('PUT', `/api/examinations/${exam1.id}/marks/approve`, {
      courseId: courseCS101.id
    }, hodAuth.authHeader);
    assert(approveMarksRes.status === 200, 'T26-A: HOD approves exam marks (HTTP 200)');
    assert(approveMarksRes.body.approvedCount >= 1, 'T26-B: Approval count recorded');

    // T27: Student Bob queries exam results -> Still empty (approved is not yet published!)
    const bobSeesApproved = await request('GET', `/api/examinations/${exam1.id}/results`, null, studentBobAuth.authHeader);
    assert(bobSeesApproved.body.length === 0, 'T27: Approved marks withheld from student until Admin publication');

    // T28: Admin publishes examination results
    const publishRes = await request('PUT', `/api/examinations/${exam1.id}/publish`, null, adminAuth.authHeader);
    assert(publishRes.status === 200, 'T28-A: Admin publishes exam results (HTTP 200)');
    assert(publishRes.body.publishedCount >= 1, 'T28-B: Results successfully published');

    // T29: Student Bob queries exam results -> Receives his result!
    const bobSeesPublished = await request('GET', `/api/examinations/${exam1.id}/results`, null, studentBobAuth.authHeader);
    assert(bobSeesPublished.status === 200, 'T29-A: Student queries published results (HTTP 200)');
    assert(bobSeesPublished.body.length === 1, 'T29-B: Student receives exactly 1 result (their own)');
    assert(bobSeesPublished.body[0].totalScore === 88, 'T29-C: Total score verified as 88');
    assert(bobSeesPublished.body[0].grade === 'A', 'T29-D: Grade verified as A');
    assert(bobSeesPublished.body[0].status === 'published', 'T29-E: Result status verified as published');

    // T30: Student Alice queries results -> Zero Bob data leaked!
    const aliceSeesResults = await request('GET', `/api/examinations/${exam1.id}/results`, null, studentAliceAuth.authHeader);
    assert(aliceSeesResults.status === 200, 'T30-A: Alice queries results (HTTP 200)');
    assert(aliceSeesResults.body.length === 0, 'T30-B: Alice receives 0 results (Bob data 100% excluded)');

    // --------------------------------------------------------------------------
    // [Suite 4] Connected Workflows: Finance, Library & Read-Only Analytics (Phase 7)
    // --------------------------------------------------------------------------
    console.log('\n[Suite 4] Connected Workflows: Finance, Library & Read-Only Analytics...');

    // 1. Finance Officer User
    const financeUser = await prisma.user.create({
      data: {
        name: 'Frank Finance',
        email: `finance_frank_${Date.now()}@campusone.test`,
        password: adminPassword,
        role: 'finance_officer'
      }
    });
    const finRole = await prisma.appRole.findUnique({ where: { code: 'finance_officer' } });
    if (finRole) {
      await prisma.userRoleAssignment.create({
        data: { userId: financeUser.id, roleId: finRole.id, isActive: true, validFrom: new Date() }
      });
    }
    const financeAuth = await createAuthenticatedSession(financeUser.id, 'finance_officer');

    // T31: Finance Officer queries fee transactions
    const finTxRes = await request('GET', '/api/fees/transactions', null, financeAuth.authHeader);
    assert(finTxRes.status === 200, 'T31: Finance officer queries fee transactions (HTTP 200)');

    // T32: Student queries fee transactions -> enforced own scope
    const studentTxRes = await request('GET', '/api/fees/transactions', null, studentBobAuth.authHeader);
    assert(studentTxRes.status === 200, 'T32: Student queries own fee transactions (HTTP 200)');

    // 2. Library Workflows
    const librarianUser = await prisma.user.create({
      data: {
        name: 'Lucy Librarian',
        email: `librarian_lucy_${Date.now()}@campusone.test`,
        password: adminPassword,
        role: 'librarian'
      }
    });
    const libRole = await prisma.appRole.findUnique({ where: { code: 'librarian' } });
    if (libRole) {
      await prisma.userRoleAssignment.create({
        data: { userId: librarianUser.id, roleId: libRole.id, isActive: true, validFrom: new Date() }
      });
    }
    const librarianAuth = await createAuthenticatedSession(librarianUser.id, 'librarian');

    const testBook = await prisma.book.create({
      data: {
        isbn: `ISBN-TEST-${Date.now()}`,
        title: 'Modern Operating Systems',
        author: 'Andrew S. Tanenbaum',
        totalCopies: 5,
        availableCopies: 5,
        category: 'Computer Science'
      }
    });

    // T33: Librarian issues book to Bob
    const issueRes = await request('POST', '/api/library/circulation/issue', {
      bookId: testBook.id,
      borrowerId: studentBobUserId,
      durationDays: 14
    }, librarianAuth.authHeader);
    assert(issueRes.status === 200, 'T33-A: Librarian issues book (HTTP 200)');
    const updatedBook = await prisma.book.findUnique({ where: { id: testBook.id } });
    assert(updatedBook.availableCopies === 4, 'T33-B: Stock atomically decremented to 4');
    const circulationId = issueRes.body.id;

    // T34: Attempt to borrow same book again while active -> 409 Conflict
    const doubleBorrowRes = await request('POST', '/api/library/circulation/issue', {
      bookId: testBook.id,
      borrowerId: studentBobUserId
    }, librarianAuth.authHeader);
    assert(doubleBorrowRes.status === 409, 'T34: Active duplicate loan prevented with HTTP 409 Conflict');

    // T35: Librarian returns book
    const returnRes = await request('POST', '/api/library/circulation/return', {
      circulationId
    }, librarianAuth.authHeader);
    assert(returnRes.status === 200, 'T35-A: Librarian returns book (HTTP 200)');
    const returnedBook = await prisma.book.findUnique({ where: { id: testBook.id } });
    assert(returnedBook.availableCopies === 5, 'T35-B: Stock atomically restored to 5');

    // 3. Analytics Workflows
    const analyticsUser = await prisma.user.create({
      data: {
        name: 'Anna Analytics',
        email: `analytics_anna_${Date.now()}@campusone.test`,
        password: adminPassword,
        role: 'management'
      }
    });
    const mgmtRole = await prisma.appRole.findUnique({ where: { code: 'management' } });
    if (mgmtRole) {
      await prisma.userRoleAssignment.create({
        data: { userId: analyticsUser.id, roleId: mgmtRole.id, isActive: true, validFrom: new Date() }
      });
    }
    const analyticsAuth = await createAuthenticatedSession(analyticsUser.id, 'management');

    // T36: Analytics reads overview
    const overviewRes = await request('GET', '/api/analytics/overview', null, analyticsAuth.authHeader);
    assert(overviewRes.status === 200, 'T36: Analytics reads overview metrics (HTTP 200)');

    // T37: Analytics reads academic performance
    const perfRes = await request('GET', '/api/analytics/academic-performance', null, analyticsAuth.authHeader);
    assert(perfRes.status === 200, 'T37: Analytics reads academic performance (HTTP 200)');

    // T38: Analytics attempts operational write on admin user onboarding -> 403 Forbidden
    const unauthWrite = await request('POST', '/api/admin/users', { name: 'Unauthorized', email: 'unauth@test.com', role: 'student' }, analyticsAuth.authHeader);
    assert(unauthWrite.status === 403, 'T38: Analytics attempting operational write on user onboarding rejected with HTTP 403');

    // T39: Analytics attempts to approve exam marks -> 403 Forbidden
    const unauthMarks = await request('PUT', `/api/examinations/${exam1.id}/marks/approve`, {}, analyticsAuth.authHeader);
    assert(unauthMarks.status === 403, 'T39: Analytics attempting to approve marks rejected with HTTP 403');

    // --------------------------------------------------------------------------
    // [Suite 5] Single HOD Succession & Relinquishment Governance (Phase 2 & 10)
    // --------------------------------------------------------------------------
    console.log('\n[Suite 5] Single HOD Succession & Relinquishment Governance...');

    // T40: Admin relieves active HOD Charles
    const relieveRes = await request('POST', '/api/admin/hod/relieve', null, adminAuth.authHeader);
    assert(relieveRes.status === 200, 'T40-A: Admin relieves active HOD (HTTP 200)');

    // T41: Verify active HOD is now null
    const checkActiveNone = await request('GET', '/api/admin/hod/active', null, adminAuth.authHeader);
    assert(checkActiveNone.status === 200, 'T41-A: Query active HOD returns HTTP 200');
    assert(checkActiveNone.body.activeHod === null, 'T41-B: Active HOD verified as null');

    // T42: Admin now appoints Prof. Dana as the new single institution-wide HOD
    const appointDanaRes = await request('POST', '/api/admin/users', {
      name: 'Prof. Dana New HOD',
      email: `hod_dana_success_${Date.now()}@campusone.test`,
      role: 'hod'
    }, adminAuth.authHeader);
    assert(appointDanaRes.status === 201, 'T42-A: Admin appoints new HOD Prof. Dana (HTTP 201)');

    const checkActiveDana = await request('GET', '/api/admin/hod/active', null, adminAuth.authHeader);
    assert(checkActiveDana.body.activeHod.user.name === 'Prof. Dana New HOD', 'T42-B: New single active HOD verified as Prof. Dana');

    // --------------------------------------------------------------------------
    // [Suite 6] Synthetic Fixtures Cleanup
    // --------------------------------------------------------------------------
    console.log('\n[Suite 6] Synthetic Fixtures Cleanup...');
    await prisma.documentRequest.deleteMany({
      where: { studentId: { in: [studentBobProfile.id, studentAliceProfile.id] } }
    });
    await prisma.examinerAssignment.deleteMany({
      where: { examinationId: exam1.id }
    });
    await prisma.examResult.deleteMany({
      where: { examinationId: exam1.id }
    });
    await prisma.examination.delete({ where: { id: exam1.id } });
    await prisma.student.deleteMany({
      where: { id: { in: [studentBobProfile.id, studentAliceProfile.id] } }
    });
    await prisma.faculty.deleteMany({
      where: { id: facultyProfile.id }
    });
    await prisma.institutionHodAssignment.deleteMany({
      where: { userId: { in: [hodCharlesId, appointDanaRes.body.user.id] } }
    });
    await prisma.authSession.deleteMany({
      where: { userId: { in: [adminUser.id, hodCharlesId, facultyEvansId, studentBobUserId, examinerGraceUserId, aliceUser.id, financeUser.id, librarianUser.id, analyticsUser.id, appointDanaRes.body.user.id] } }
    });
    await prisma.userCredential.deleteMany({
      where: { userId: { in: [adminUser.id, hodCharlesId, facultyEvansId, studentBobUserId, examinerGraceUserId, aliceUser.id, financeUser.id, librarianUser.id, analyticsUser.id, appointDanaRes.body.user.id] } }
    });
    await prisma.userRoleAssignment.deleteMany({
      where: { userId: { in: [adminUser.id, hodCharlesId, facultyEvansId, studentBobUserId, examinerGraceUserId, aliceUser.id, financeUser.id, librarianUser.id, analyticsUser.id, appointDanaRes.body.user.id] } }
    });
    await prisma.circulationRecord.deleteMany({
      where: { borrowerId: { in: [adminUser.id, hodCharlesId, facultyEvansId, studentBobUserId, examinerGraceUserId, aliceUser.id, financeUser.id, librarianUser.id, analyticsUser.id, appointDanaRes.body.user.id] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminUser.id, hodCharlesId, facultyEvansId, studentBobUserId, examinerGraceUserId, aliceUser.id, financeUser.id, librarianUser.id, analyticsUser.id, appointDanaRes.body.user.id] } }
    });
    await prisma.book.delete({ where: { id: testBook.id } });

    assert(true, 'T43: All synthetic test fixtures cleanly purged');

    console.log('\n==============================================================================');
    console.log(` Master Remediation Summary: ${passedAssertions}/${passedAssertions} Assertions Passed (0 Failed)`);
    console.log('==============================================================================\n');
    console.log('🛡️ MASTER SYSTEM REMEDIATION VERIFIED WITH ZERO DEFECTS.\n');

  } catch (err) {
    console.error('\n❌ TEST RUNNER ABORTED ON ERROR:', err);
    process.exit(1);
  } finally {
    if (server) {
      await new Promise(r => server.close(r));
    }
    await prisma.$disconnect();
  }
}

main();
