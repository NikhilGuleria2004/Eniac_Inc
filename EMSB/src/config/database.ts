import { MongoClient, Db, Collection, Document } from "mongodb";
import { env } from "./env.js";

let client: MongoClient;
let db: Db;

export async function connectDatabase(): Promise<void> {
  if (db) return;

  client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 100,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  });
  await client.connect();
  db = client.db(env.MONGODB_DATABASE);

  console.log("MongoDB connected to:", env.MONGODB_DATABASE);
}

export function getDb(): Db {
  if (!db) {
    throw new Error("Database not connected. Call connectDatabase() first.");
  }
  return db;
}

export function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
  }
}
