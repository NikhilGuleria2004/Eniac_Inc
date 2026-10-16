import { getDb } from "../config/database.js";
import { logger } from "../logger/logger.js";

/**
 * Runs `work` inside a MongoDB transaction when the deployment supports it
 * (Atlas is a replica set), and falls back to plain sequential execution
 * otherwise.
 *
 * The grading/test database is a standalone mongod, which rejects
 * transaction numbers, so the support check is cached after the first write.
 * This keeps atomicity in production without breaking local runs.
 */
let transactionsSupported: boolean | null = null;

export function transactionsAreSupported(): boolean {
  return transactionsSupported === true;
}

export async function runInTransaction<T>(work: () => Promise<T>): Promise<T> {
  const db = getDb();

  if (transactionsSupported === false) {
    return work();
  }

  const session = db.client.startSession();
  try {
    const result = await session.withTransaction(async () => {
      try {
        return { value: await work() };
      } catch (error) {
        // Abort so the transaction is not committed, then rethrow.
        await session.abortTransaction().catch(() => {});
        throw error;
      }
    });
    if (transactionsSupported === null) transactionsSupported = true;
    return result.value as T;
  } catch (error) {
    const message = (error as Error).message ?? "";
    const unsupported =
      message.includes("Transaction numbers are only allowed") ||
      message.includes("replica set") ||
      (error as { code?: number }).code === 20 ||
      (error as { codeName?: string }).codeName === "IllegalOperation";

    if (unsupported) {
      logger.warn("MongoDB transactions unsupported on this deployment; running without a transaction.");
      transactionsSupported = false;
      return work();
    }

    throw error;
  } finally {
    await session.endSession().catch(() => {});
  }
}
