import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const adminEmail = process.env.ADMIN_EMAIL;

const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail) {
  throw new Error('ADMIN_EMAIL is required');
}

if (!adminPassword) {
  throw new Error('ADMIN_PASSWORD is required');
}

if (adminPassword.length < 12) {
  throw new Error('ADMIN_PASSWORD must be at least 12 characters long');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Creating production admin...');

  const password = bcrypt.hashSync(adminPassword!, 12);

  const admin = await prisma.user.upsert({
    where: {
      email: adminEmail!,
    },
    update: {
      campusId: process.env.ADMIN_CAMPUS_ID || 'COID1001',
      name: 'System Administrator',
      role: 'admin',
      password,
    },
    create: {
      campusId: process.env.ADMIN_CAMPUS_ID || 'COID1001',
      email: adminEmail!,
      name: 'System Administrator',
      password,
      role: 'admin',
    },
  });

  console.log(`Production admin ready: ${admin.email}`);
  console.log('Production seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Production seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });