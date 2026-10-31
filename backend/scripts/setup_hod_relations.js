const prisma = require('../dist/config/db').default;

async function setup() {
  console.log('--- Setting up and verifying HOD relations in database ---');

  // 1. Find Dr. Sarah Jenkins
  const hodUser = await prisma.user.findFirst({
    where: { campusId: 'COID1002' },
    include: { facultyProfile: true }
  });

  if (!hodUser || !hodUser.facultyProfile) {
    throw new Error('HOD user or faculty profile not found!');
  }

  const cseDeptId = hodUser.facultyProfile.departmentId;
  console.log('HOD User:', hodUser.name, 'Faculty ID:', hodUser.facultyProfile.id, 'Dept ID:', cseDeptId);

  // 2. Set CSE department headOfDepartmentId
  const updatedDept = await prisma.department.update({
    where: { id: cseDeptId },
    data: { headOfDepartmentId: hodUser.facultyProfile.id }
  });
  console.log('Updated Department:', updatedDept.name, 'headOfDepartmentId:', updatedDept.headOfDepartmentId);

  // 3. Remove spurious password recovery notices from Notice table
  const deletedNotices = await prisma.notice.deleteMany({
    where: {
      OR: [
        { title: { contains: 'Password Recovery Request' } },
        { title: { contains: 'Action Required: Password Recovery' } }
      ]
    }
  });
  console.log('Cleaned up spurious recovery notices:', deletedNotices.count);

  await prisma.$disconnect();
  console.log('Setup completed successfully.');
}

setup().catch((e) => {
  console.error(e);
  process.exit(1);
});

