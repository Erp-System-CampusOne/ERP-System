import prisma from '../config/db';

/**
 * Generates a unique CampusOne ID formatted as COID{4 random numbers} (e.g. COID1001 to COID9999).
 * Guarantees zero collisions by checking database records before returning.
 */
export async function generateUniqueCampusId(txOrPrisma: any = prisma): Promise<string> {
  let isUnique = false;
  let campusId = '';
  let attempts = 0;

  while (!isUnique && attempts < 100) {
    attempts++;
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 1000 to 9999 inclusive
    campusId = `COID${randomNum}`;

    const existing = await txOrPrisma.user.findUnique({
      where: { campusId }
    });

    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    throw new Error('Unable to generate a unique CampusOne ID. Please contact system administrator.');
  }

  return campusId;
}
