import "dotenv/config";
import { connectDatabase, getDb, closeDatabase } from "../config/database.js";
import { env } from "../config/env.js";

/**
 * Completely wipes every collection in the configured MongoDB database.
 *
 * Use this before re-running a seed script to reset the database to a
 * pristine state. Production is intentionally locked down unless explicitly
 * opted into via FORCE_PROD_WIPE=true.
 *
 *   npx tsx src/scripts/wipe.ts      (or: npm run wipe)
 */
async function wipe(): Promise<void> {
  if (env.NODE_ENV === "production" && process.env.FORCE_PROD_WIPE !== "true") {
    throw new Error(
      'Refusing to wipe the database in production. Set FORCE_PROD_WIPE=true to override.'
    );
  }

  await connectDatabase();
  const db = getDb();
  const dbName = env.MONGODB_DATABASE;

  console.log(
    `Wiping ALL collections from database "${dbName}" (NODE_ENV=${env.NODE_ENV})...`
  );

  const collections = await db.listCollections().toArray();

  if (collections.length === 0) {
    console.log("  Database is already empty; nothing to wipe.");
    await closeDatabase();
    return;
  }

  let dropped = 0;
  for (const col of collections) {
    await db.dropCollection(col.name);
    console.log(`  Dropped collection: ${col.name}`);
    dropped++;
  }

  console.log(`\nWipe complete. Removed ${dropped} collection(s) from "${dbName}".`);
  await closeDatabase();
}

wipe().catch((error) => {
  console.error("Wipe failed:", error);
  process.exit(1);
});
