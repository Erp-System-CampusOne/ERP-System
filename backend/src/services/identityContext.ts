import prisma from '../config/db';
import { Prisma } from '@prisma/client';

/**
 * Executes a callback within an isolated, identity-bound PostgreSQL transaction.
 * Guarantees that app.current_user_id is set locally (is_local = true)
 * and automatically wiped by PostgreSQL upon COMMIT or ROLLBACK.
 *
 * NOTE: As established in P2.8, this setting guarantees transaction and connection-pool
 * isolation across reused connections. Identity authenticity is established by the
 * application server verifying the caller's JWT and active session before invoking this helper.
 */
export async function executeWithIdentity<T>(
  userId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required to establish database transaction identity context.');
  }

  return await prisma.$transaction(async (tx) => {
    // Set transaction-local GUC variable (is_local = true)
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true);`;

    // Execute domain operation inside the identity-bound transaction
    return await callback(tx);
  }, {
    timeout: 10000,
    maxWait: 5000,
  });
}
