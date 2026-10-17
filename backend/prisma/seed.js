"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function main() {
    console.log('Seeding initial data...');
    const password = await bcryptjs_1.default.hash('admin123', 10);
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
    // 2. Department
    const csDept = await prisma.department.upsert({
        where: { code: 'CSE' },
        update: {},
        create: {
            code: 'CSE',
            name: 'Computer Science and Engineering',
        },
    });
    // 3. Faculty
    const facultyPassword = await bcryptjs_1.default.hash('faculty123', 10);
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
    // 4. Student
    const studentPassword = await bcryptjs_1.default.hash('student123', 10);
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
            facultyInstructor: facultyProfile?.id
        }
    });
    // 6. Timetable
    await prisma.timetableEntry.create({
        data: {
            dayOfWeek: 'Monday',
            period: 1,
            timeSlot: '09:00-09:55',
            courseId: course.id,
            facultyId: facultyProfile.id,
            roomNumber: 'CR-101',
            section: 'A',
            semester: 4
        }
    });
    // 7. Notice
    await prisma.notice.create({
        data: {
            title: 'Mid-Semester Examination Schedule',
            content: 'The mid-semester examinations will be conducted from March 15-25, 2024. Students must carry their ID cards.',
            category: 'examination',
            targetRole: 'student',
            publishedBy: 'System Admin',
            isUrgent: true
        }
    });
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
    await prisma.circulationRecord.create({
        data: {
            bookId: book.id,
            borrowerId: studentUser.id,
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
            status: 'issued'
        }
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
    // Role Permissions
    await prisma.rolePermission.upsert({
        where: { role_permissionId: { role: 'admin', permissionId: perm1.id } },
        update: {},
        create: { role: 'admin', permissionId: perm1.id }
    });
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
