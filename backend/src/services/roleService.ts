import prisma from '../config/db';

/**
 * Retrieves the current, live canonical active roles for a user.
 * Evaluates user_role_assignments with valid_from/valid_to window and is_active flag.
 * Supports deterministic fallback and lazy backfill for legacy users.
 */
export async function getUserActiveRoles(userId: string): Promise<string[]> {
  if (!userId) return [];

  const now = new Date();

  const assignments = await prisma.userRoleAssignment.findMany({
    where: {
      userId,
      isActive: true,
      validFrom: { lte: now },
      OR: [
        { validTo: null },
        { validTo: { gt: now } }
      ]
    },
    include: { role: true }
  });

  if (assignments.length > 0) {
    return assignments.map((a) => a.role.code);
  }

  // If user has ANY canonical role assignments (even if revoked or expired),
  // canonical RBAC is authoritative: DO NOT fall back to legacy User.role!
  const totalAssignmentsCount = await prisma.userRoleAssignment.count({
    where: { userId }
  });

  if (totalAssignmentsCount > 0) {
    // All assigned roles are currently revoked or outside valid window.
    return [];
  }

  // Fallback to legacy User.role ONLY for un-migrated accounts with zero canonical assignments
  const legacyUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (!legacyUser || !legacyUser.role) {
    return [];
  }

  const legacyRoleCode = legacyUser.role;

  // Attempt lazy backfill into user_role_assignments if canonical role exists
  try {
    const canonicalRole = await prisma.appRole.findUnique({
      where: { code: legacyRoleCode }
    });

    if (canonicalRole) {
      await prisma.userRoleAssignment.upsert({
        where: {
          userId_roleId: {
            userId,
            roleId: canonicalRole.id
          }
        },
        create: {
          userId,
          roleId: canonicalRole.id,
          isActive: true,
          validFrom: now
        },
        update: {}
      });
    }
  } catch (err) {
    // Unique violation or concurrency notice
    console.warn(`[RoleService] Concurrent role assignment backfill notice for user ${userId}`);
  }

  return [legacyRoleCode];
}

/**
 * Checks whether the user currently possesses any of the allowed roles.
 * Always resolves against the database to guarantee freshness and prevent stale token escalation.
 */
export async function checkUserHasRole(
  userId: string,
  allowedRoles: string[]
): Promise<boolean> {
  if (allowedRoles.includes('all')) return true;

  const currentRoles = await getUserActiveRoles(userId);
  return currentRoles.some((role) => allowedRoles.includes(role));
}

/**
 * Resolves all canonical permission codes granted to the user across all active roles.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  if (!userId) return [];

  const now = new Date();

  const assignments = await prisma.userRoleAssignment.findMany({
    where: {
      userId,
      isActive: true,
      validFrom: { lte: now },
      OR: [
        { validTo: null },
        { validTo: { gt: now } }
      ]
    },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true }
          }
        }
      }
    }
  });

  const permissionSet = new Set<string>();

  for (const assignment of assignments) {
    for (const rp of assignment.role.rolePermissions) {
      if (rp.permission && rp.permission.code) {
        permissionSet.add(rp.permission.code);
      }
    }
  }

  return Array.from(permissionSet);
}
