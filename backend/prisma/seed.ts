//backend/prisma/seed.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Seeding initial data...');

  const password = await bcrypt.hash('admin123', 10);

  // 1. Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@campus.edu' },
    update: {
      campusId: 'COID1001',
    },
    create: {
      campusId: 'COID1001',
      email: 'admin@campus.edu',
      name: 'System Admin',
      password,
      role: 'admin',
    },
  });

  // Analytics user — credentials for the executive Analytics portal.
  const analyticsPassword = await bcrypt.hash('analytics123', 10);
  await prisma.user.upsert({
    where: { email: 'analytics@campus.edu' },
    update: { campusId: 'COID1003', name: 'Dr. Rohan Mehta', password: analyticsPassword, role: 'analytics' },
    create: {
      campusId: 'COID1003',
      email: 'analytics@campus.edu',
      name: 'Dr. Rohan Mehta',
      password: analyticsPassword,
      role: 'analytics',
    },
  });

  // 2. Librarian User
  const librarianPassword = await bcrypt.hash('librarian123', 10);
  await prisma.user.upsert({
    where: { email: 'librarian@campus.edu' },
    update: {
      campusId: 'COID1004',
    },
    create: {
      campusId: 'COID1004',
      email: 'librarian@campus.edu',
      name: 'Anita Sharma',
      password: librarianPassword,
      role: 'librarian',
    },
  });

  // 3. Finance Officer User — credentials for the Finance Office portal.
  const financePassword = await bcrypt.hash('finance123', 10);
  await prisma.user.upsert({
    where: { email: 'finance@campus.edu' },
    update: {
      campusId: 'COID1005',
      name: 'Kavita Iyer',
      password: financePassword,
      role: 'finance_officer',
      phone: '+91-9876543210',
    },
    create: {
      campusId: 'COID1005',
      email: 'finance@campus.edu',
      name: 'Kavita Iyer',
      password: financePassword,
      role: 'finance_officer',
      phone: '+91-9876543210',
    },
  });

  // 3. Department
  const csDept = await prisma.department.upsert({
    where: { code: 'CSE' },
    update: {},
    create: {
      code: 'CSE',
      name: 'Computer Science and Engineering',
    },
  });

  // 3. Faculty
  const facultyPassword = await bcrypt.hash('faculty123', 10);
  const facultyUser = await prisma.user.upsert({
    where: { email: 'faculty@campus.edu' },
    update: {
      campusId: 'COID2001',
    },
    create: {
      campusId: 'COID2001',
      email: 'faculty@campus.edu',
      name: 'Dr. Priya Menon',
      password: facultyPassword,
      role: 'faculty',
      facultyProfile: {
        create: {
          employeeCode: 'FAC1001',
          departmentId: csDept.id,
          designation: 'Professor',
        },
      },
    },
  });

  // 3b. HOD User
  const hodPassword = await bcrypt.hash('hod123', 10);
  await prisma.user.upsert({
    where: { email: 'hod@campus.edu' },
    update: {
      campusId: 'COID1002',
    },
    create: {
      campusId: 'COID1002',
      email: 'hod@campus.edu',
      name: 'Prof. Alistair HOD',
      password: hodPassword,
      role: 'hod',
      facultyProfile: {
        create: {
          employeeCode: 'HOD1001',
          departmentId: csDept.id,
          designation: 'Head of Department',
        },
      },
    },
  });

  // 3c. Examiner User
  const examinerPassword = await bcrypt.hash('examiner123', 10);
  await prisma.user.upsert({
    where: { email: 'examiner@campus.edu' },
    update: {
      campusId: 'COID1006',
    },
    create: {
      campusId: 'COID1006',
      email: 'examiner@campus.edu',
      name: 'Dr. Ethan Examiner',
      password: examinerPassword,
      role: 'examiner',
      facultyProfile: {
        create: {
          employeeCode: 'EXM1001',
          departmentId: csDept.id,
          designation: 'Examination Officer',
        },
      },
    },
  });

  // 4. Student
  const studentPassword = await bcrypt.hash('student123', 10);
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@campus.edu' },
    update: {
      campusId: 'COID3001',
    },
    create: {
      campusId: 'COID3001',
      email: 'student@campus.edu',
      name: 'Aryan Sharma',
      password: studentPassword,
      role: 'student',
      studentProfile: {
        create: {
          rollNumber: '22CS001',
          departmentId: csDept.id,
          semester: 4,
          section: 'A',
          batch: '2022-2026'
        },
      },
    },
  });

  // Finance needs a deterministic program to resolve the fee structure.
  const studentProfile = await prisma.student.findUniqueOrThrow({ where: { userId: studentUser.id } });
  await prisma.student.update({
    where: { id: studentProfile.id },
    data: {
      rollNumber: '22CS001',
      departmentId: csDept.id,
      degree: 'B.Tech',
      feeQuota: 'general',
      semester: 4,
      section: 'A',
      batch: '2022-2026',
    },
  });

  const facultyProfile = await prisma.faculty.findUnique({
    where: { userId: facultyUser.id }
  });

  // 5. Course
  const course = await prisma.course.upsert({
    where: { code: 'CS301' },
    update: {},
    create: {
      code: 'CS301',
      name: 'Database Management Systems',
      departmentId: csDept.id,
      semester: 4,
      credits: 4,
      facultyId: facultyProfile?.id
    }
  });

  // 6. Timetable
  await prisma.timetableEntry.upsert({
    where: { 
      dayOfWeek_period_facultyId: {
        dayOfWeek: 'Monday',
        period: 1,
        facultyId: facultyProfile!.id
      }
    },
    update: {},
    create: {
      dayOfWeek: 'Monday',
      period: 1,
      timeSlot: '09:00-09:55',
      courseId: course.id,
      facultyId: facultyProfile!.id,
      roomNumber: 'CR-101',
      section: 'A',
      semester: 4,
      departmentId: csDept.id
    }
  });

  // 7. Notice
  const examNotices = await prisma.notice.findMany({
    where: { title: 'Mid-Semester Examination Schedule', targetRole: 'student' },
    orderBy: { createdAt: 'asc' },
  });
  if (examNotices.length > 1) {
    await prisma.notice.deleteMany({ where: { id: { in: examNotices.slice(1).map((notice) => notice.id) } } });
  }
  if (examNotices.length === 0) {
    await prisma.notice.create({
      data: {
        title: 'Mid-Semester Examination Schedule',
        content: 'The mid-semester examinations will be conducted from March 15-25, 2024. Students must carry their ID cards.',
        category: 'examination',
        targetRole: 'student',
        publishedBy: admin.id,
        isUrgent: true
      }
    });
  }

  // 8. Book
  const book = await prisma.book.upsert({
    where: { isbn: '978-0078022159' },
    update: {},
    create: {
      isbn: '978-0078022159',
      title: 'Database System Concepts',
      author: 'Silberschatz, Korth, Sudarshan',
      totalCopies: 5,
      availableCopies: 4
    }
  });

  // Keep the demo seed idempotent and repair duplicate active rows created by older seeds.
  const activeCirculations = await prisma.circulationRecord.findMany({
    where: { bookId: book.id, borrowerId: studentUser.id, status: { in: ['issued', 'overdue'] } },
    orderBy: { issueDate: 'asc' },
  });
  const anySeedCirculation = await prisma.circulationRecord.findFirst({
    where: { bookId: book.id, borrowerId: studentUser.id },
    select: { id: true },
  });
  if (activeCirculations.length === 0 && !anySeedCirculation) {
    await prisma.circulationRecord.create({
      data: {
        bookId: book.id,
        borrowerId: studentUser.id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        status: 'issued'
      }
    });
  } else if (activeCirculations.length > 1) {
    await prisma.circulationRecord.updateMany({
      where: { id: { in: activeCirculations.slice(1).map((record) => record.id) } },
      data: { status: 'returned', returnDate: new Date(), fineAmount: 0 },
    });
  }
  const activeBookLoans = await prisma.circulationRecord.count({
    where: { bookId: book.id, status: { in: ['issued', 'overdue'] } },
  });
  await prisma.book.update({
    where: { id: book.id },
    data: { availableCopies: Math.max(0, book.totalCopies - activeBookLoans) },
  });

  // 9. Permissions
  const perm1 = await prisma.permission.upsert({
    where: { name: 'manage_students' },
    update: {},
    create: { name: 'manage_students', category: 'Student', description: 'Manage students' }
  });
  const perm2 = await prisma.permission.upsert({
    where: { name: 'manage_faculty' },
    update: {},
    create: { name: 'manage_faculty', category: 'Faculty', description: 'Manage faculty' }
  });
  const perm3 = await prisma.permission.upsert({
    where: { name: 'manage_admissions' },
    update: {},
    create: { name: 'manage_admissions', category: 'Admissions', description: 'Manage admissions' }
  });
  const perm4 = await prisma.permission.upsert({
    where: { name: 'view_analytics' },
    update: {},
    create: { name: 'view_analytics', category: 'Analytics', description: 'View analytics dashboard' }
  });

  // Role Permissions
  await prisma.rolePermission.upsert({
    where: { role_permissionId: { role: 'admin', permissionId: perm1.id } },
    update: {},
    create: { role: 'admin', permissionId: perm1.id }
  });
  await prisma.rolePermission.upsert({
    where: { role_permissionId: { role: 'admin', permissionId: perm2.id } },
    update: {},
    create: { role: 'admin', permissionId: perm2.id }
  });
  await prisma.rolePermission.upsert({
    where: { role_permissionId: { role: 'admin', permissionId: perm3.id } },
    update: {},
    create: { role: 'admin', permissionId: perm3.id }
  });
  await prisma.rolePermission.upsert({
    where: { role_permissionId: { role: 'admin', permissionId: perm4.id } },
    update: {},
    create: { role: 'admin', permissionId: perm4.id }
  });

  // 10. Admission Applications (seeds Admissions page)
  const admissions = [
    { applicationId: 'APP2024001', applicantName: 'Rahul Verma', program: 'B.Tech', department: 'Computer Science and Engineering', category: 'General', quota: 'Merit', status: 'pending' },
    { applicationId: 'APP2024002', applicantName: 'Sneha Reddy', program: 'B.Tech', department: 'Computer Science and Engineering', jeeRank: 1450, category: 'OBC', quota: 'Merit', status: 'approved' },
    { applicationId: 'APP2024003', applicantName: 'Vikram Singh', program: 'M.Tech', department: 'Computer Science and Engineering', gateRank: 320, category: 'General', quota: 'GATE', status: 'pending' },
    { applicationId: 'APP2024004', applicantName: 'Kavya Nair', program: 'B.Tech', department: 'Computer Science and Engineering', jeeRank: 2100, category: 'SC', quota: 'Reserved', status: 'approved' },
    { applicationId: 'APP2024005', applicantName: 'Ankit Patel', program: 'B.Tech', department: 'Computer Science and Engineering', jeeRank: 890, category: 'General', quota: 'Merit', status: 'rejected' },
  ];
  for (const app of admissions) {
    await prisma.admissionApplication.upsert({
      where: { applicationId: app.applicationId },
      update: {},
      create: app as any
    });
  }

  // 11. Leave Requests for Faculty (seeds FacultyLeaves page)
  if (facultyProfile) {
    const seededLeaves = [
      { type: 'Sick Leave', fromDate: new Date('2024-03-10'), toDate: new Date('2024-03-12'), days: 3, reason: 'Medical treatment', status: 'approved' },
      { type: 'Casual Leave', fromDate: new Date('2024-04-05'), toDate: new Date('2024-04-06'), days: 2, reason: 'Family function', status: 'pending' },
    ] as const;
    for (const leave of seededLeaves) {
      const existingLeave = await prisma.leaveRequest.findFirst({
        where: { facultyId: facultyProfile.id, type: leave.type, fromDate: leave.fromDate },
      });
      if (!existingLeave) await prisma.leaveRequest.create({ data: { facultyId: facultyProfile.id, ...leave } });
    }
  }

  // 12. Additional Book and notice for Library
  const book2 = await prisma.book.upsert({
    where: { isbn: '978-0132350884' },
    update: {},
    create: {
      isbn: '978-0132350884',
      title: 'Clean Code',
      author: 'Robert C. Martin',
      totalCopies: 3,
      availableCopies: 3
    }
  });
  const activeBook2Loans = await prisma.circulationRecord.count({
    where: { bookId: book2.id, status: { in: ['issued', 'overdue'] } },
  });
  await prisma.book.update({
    where: { id: book2.id },
    data: { availableCopies: Math.max(0, book2.totalCopies - activeBook2Loans) },
  });

  // 13. Second Notice - General announcement
  const recruitmentNotices = await prisma.notice.findMany({
    where: { title: 'Campus Recruitment Drive - TCS & Infosys', targetRole: 'student' },
    orderBy: { createdAt: 'asc' },
  });
  if (recruitmentNotices.length > 1) {
    await prisma.notice.deleteMany({ where: { id: { in: recruitmentNotices.slice(1).map((notice) => notice.id) } } });
  }
  if (recruitmentNotices.length === 0) {
    await prisma.notice.create({
      data: {
        title: 'Campus Recruitment Drive - TCS & Infosys',
        content: 'TCS and Infosys will be conducting campus recruitment drives next month. Final year students must register by April 10.',
        category: 'general',
        targetRole: 'student',
        publishedBy: admin.id,
        isUrgent: false
      }
    });
  }

  // 14. A second Student for richer data
  const student2Password = await bcrypt.hash('student123', 10);
  const student2User = await prisma.user.upsert({
    where: { email: 'priya@campus.edu' },
    update: {
      campusId: 'COID3002',
    },
    create: {
      campusId: 'COID3002',
      email: 'priya@campus.edu',
      name: 'Priya Singh',
      password: student2Password,
      role: 'student',
      studentProfile: {
        create: {
          rollNumber: '22CS002',
          departmentId: csDept.id,
          semester: 4,
          section: 'A',
          batch: '2022-2026'
        },
      },
    },
  });

  const student2Profile = await prisma.student.findUniqueOrThrow({ where: { userId: student2User.id } });
  await prisma.student.update({
    where: { id: student2Profile.id },
    data: {
      rollNumber: '22CS002',
      departmentId: csDept.id,
      degree: 'B.Tech',
      feeQuota: 'general',
      semester: 4,
      section: 'A',
      batch: '2022-2026',
    },
  });

  // 15. Finance master data and ledger records. These are idempotent and cover
  // complete, partial, and pending-payment states for the Finance dashboards.
  const overdueDueDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const btechGeneral = await prisma.feeStructure.upsert({
    where: { program_quota: { program: 'B.Tech', quota: 'general' } },
    update: {
      tuitionFee: 110000,
      hostelFee: 25000,
      examFee: 5000,
      libraryDeposit: 5000,
      totalAmount: 145000,
      dueDate: overdueDueDate,
    },
    create: {
      program: 'B.Tech',
      quota: 'general',
      tuitionFee: 110000,
      hostelFee: 25000,
      examFee: 5000,
      libraryDeposit: 5000,
      totalAmount: 145000,
      dueDate: overdueDueDate,
    },
  });
  await prisma.feeStructure.upsert({
    where: { program_quota: { program: 'B.Tech', quota: 'merit' } },
    update: {
      tuitionFee: 80000,
      hostelFee: 25000,
      examFee: 5000,
      libraryDeposit: 5000,
      totalAmount: 115000,
      dueDate: overdueDueDate,
    },
    create: {
      program: 'B.Tech',
      quota: 'merit',
      tuitionFee: 80000,
      hostelFee: 25000,
      examFee: 5000,
      libraryDeposit: 5000,
      totalAmount: 115000,
      dueDate: overdueDueDate,
    },
  });
  await prisma.feeStructure.upsert({
    where: { program_quota: { program: 'M.Tech', quota: 'general' } },
    update: {
      tuitionFee: 90000,
      hostelFee: 25000,
      examFee: 5000,
      libraryDeposit: 5000,
      totalAmount: 125000,
      dueDate: overdueDueDate,
    },
    create: {
      program: 'M.Tech',
      quota: 'general',
      tuitionFee: 90000,
      hostelFee: 25000,
      examFee: 5000,
      libraryDeposit: 5000,
      totalAmount: 125000,
      dueDate: overdueDueDate,
    },
  });

  const financeTransactions = [
    { receiptNumber: 'SEED-FIN-001', studentId: studentProfile.id, amount: 60000, paymentMethod: 'UPI' as const, status: 'success' as const, paidAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
    { receiptNumber: 'SEED-FIN-002', studentId: student2Profile.id, amount: 25000, paymentMethod: 'NetBanking' as const, status: 'success' as const, paidAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
    { receiptNumber: 'SEED-FIN-003', studentId: student2Profile.id, amount: 15000, paymentMethod: 'Challan' as const, status: 'pending' as const, paidAt: null },
  ];
  for (const transaction of financeTransactions) {
    await prisma.feeTransaction.upsert({
      where: { receiptNumber: transaction.receiptNumber },
      update: transaction,
      create: transaction,
    });
  }
  await prisma.student.updateMany({
    where: { id: { in: [studentProfile.id, student2Profile.id] } },
    data: { feeStatus: 'partial' },
  });

  const manageFees = await prisma.permission.upsert({
    where: { name: 'manage_fees' },
    update: {},
    create: { name: 'manage_fees', category: 'Finance', description: 'Create fee structures and reconcile payments' },
  });
  const viewTransactions = await prisma.permission.upsert({
    where: { name: 'view_transactions' },
    update: {},
    create: { name: 'view_transactions', category: 'Finance', description: 'View finance transactions and fee ledgers' },
  });
  for (const permissionId of [manageFees.id, viewTransactions.id]) {
    await prisma.rolePermission.upsert({
      where: { role_permissionId: { role: 'finance_officer', permissionId } },
      update: {},
      create: { role: 'finance_officer', permissionId },
    });
  }

  const viewAnalytics = await prisma.permission.upsert({
    where: { name: 'view_analytics' },
    update: {},
    create: { name: 'view_analytics', category: 'Analytics', description: 'View institutional analytics and KPI reports' },
  });
  await prisma.rolePermission.upsert({
    where: { role_permissionId: { role: 'management', permissionId: viewAnalytics.id } },
    update: {},
    create: { role: 'management', permissionId: viewAnalytics.id },
  });

  // 16. Connected academic and placement records for Analytics dashboards.
  const examination = await prisma.examination.findFirst({ where: { title: 'End Semester Examination 2026', semester: 4 } }) || await prisma.examination.create({
    data: {
      title: 'End Semester Examination 2026',
      academicYear: '2025-26',
      semester: 4,
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-04-20'),
      status: 'evaluated',
      hallTicketReleased: true,
    },
  });
  const examResults = [
    { studentId: studentProfile.id, totalScore: 86, internalScore: 27, endSemScore: 59, grade: 'A' },
    { studentId: student2Profile.id, totalScore: 64, internalScore: 22, endSemScore: 42, grade: 'B' },
  ];
  for (const result of examResults) {
    const existing = await prisma.examResult.findFirst({ where: { studentId: result.studentId, courseId: course.id, examinationId: examination.id } });
    if (!existing) await prisma.examResult.create({ data: { ...result, courseId: course.id, examinationId: examination.id } });
  }
  const placements = [
    { studentId: studentProfile.id, companyName: 'Infosys', companyType: 'IT Services', ctc: 7.5, offerDate: new Date('2026-03-10') },
    { studentId: student2Profile.id, companyName: 'Deloitte', companyType: 'Consulting', ctc: 10, offerDate: new Date('2026-03-15') },
  ];
  for (const placement of placements) {
    const existing = await prisma.placementRecord.findFirst({ where: { studentId: placement.studentId, companyName: placement.companyName } });
    if (!existing) await prisma.placementRecord.create({ data: placement });
  }

  console.log(`Finance seed ready: ${btechGeneral.program} fee structure and ${financeTransactions.length} ledger records.`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
