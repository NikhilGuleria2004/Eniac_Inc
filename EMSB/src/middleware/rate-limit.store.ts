import type { ObjectId } from "mongodb";
import type { Collection } from "mongodb";
import { getCollection } from "../config/database.js";
import type { ClientRateLimitInfo, Store } from "express-rate-limit";

export interface RateLimitEntry {
  _id?: ObjectId;
  key: string;
  hits: number;
  resetAt: Date;
}

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

/**
 * express-rate-limit store backed by MongoDB.
 *
 * Keeps hit counters in the shared `rate_limits` collection so limits hold
 * across restarts and across multiple application instances (a TTL index on
 * `resetAt` removes expired windows). Each limiter must use its own instance.
 */
export class MongoRateLimitStore implements Store {
  private windowMs = DEFAULT_WINDOW_MS;

  /** Keys are shared across instances (unlike the default MemoryStore). */
  readonly localKeys = false;

  private get collection(): Collection<RateLimitEntry> {
    return getCollection<RateLimitEntry>("rate_limits");
  }

  init(options: { windowMs?: number }): void {
    if (options.windowMs && options.windowMs > 0) {
      this.windowMs = options.windowMs;
    }
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = new Date();
    const resetAt = new Date(now.getTime() + this.windowMs);

    const existing = await this.collection.findOne({ key });
    if (existing && existing.resetAt.getTime() > now.getTime()) {
      const updated = await this.collection.findOneAndUpdate(
        { key },
        { $inc: { hits: 1 } },
        { returnDocument: "after" }
      );
      if (updated) {
        return { totalHits: updated.hits, resetTime: updated.resetAt };
      }
    } else {
      try {
        const started = await this.collection.findOneAndUpdate(
          { key },
          { $set: { hits: 1, resetAt } },
          { upsert: true, returnDocument: "after" }
        );
        if (started) {
          return { totalHits: started.hits, resetTime: started.resetAt };
        }
      } catch (error) {
        // Lost an upsert race against a concurrent request: retry as a plain
        // update now that the document exists.
        if (!isDuplicateKeyError(error)) throw error;
        const updated = await this.collection.findOneAndUpdate(
          { key },
          { $set: { hits: 1, resetAt } },
          { returnDocument: "after" }
        );
        if (updated) {
          return { totalHits: updated.hits, resetTime: updated.resetAt };
        }
      }
    }

    // Unreachable in practice; keeps totalHits positive for express-rate-limit's validation.
    return { totalHits: 1, resetTime: resetAt };
  }

  async decrement(key: string): Promise<void> {
    const updated = await this.collection.findOneAndUpdate(
      { key },
      { $inc: { hits: -1 } },
      { returnDocument: "after" }
    );
    if (updated && updated.hits < 1) {
      await this.collection.updateOne({ key }, { $set: { hits: 1 } });
    }
  }

  async resetKey(key: string): Promise<void> {
    await this.collection.deleteOne({ key });
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const entry = await this.collection.findOne({ key });
    if (!entry) return undefined;
    return { totalHits: entry.hits, resetTime: entry.resetAt };
  }
}
