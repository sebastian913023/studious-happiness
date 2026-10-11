/**
 * Storage selection, by environment:
 *  - KV_REST_API_URL / UPSTASH_REDIS_REST_URL  -> Upstash Redis (serverless, persistent)
 *  - STORAGE=memory or VERCEL without Redis     -> in-memory (ephemeral, resets on cold start)
 *  - otherwise                                  -> SQLite file at DATABASE_PATH (default data.db)
 */
import type { IStorage } from "./storage-types";
import { JsonStorage, MemoryPersister, UpstashPersister } from "./storage-json";

export type { IStorage } from "./storage-types";

let instance: IStorage | null = null;
let sqliteFactory: (() => IStorage) | null = null;

/** The Node entry registers SQLite explicitly so serverless bundles never pull in the native module. */
export function registerSqlite(factory: () => IStorage) { sqliteFactory = factory; }

export async function getStorage(): Promise<IStorage> {
  if (instance) return instance;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const mode = (process.env.STORAGE || "").toLowerCase();

  if (mode === "redis" || (!mode && url && token)) {
    if (!url || !token) throw new Error("STORAGE=redis requires KV_REST_API_URL and KV_REST_API_TOKEN");
    instance = new JsonStorage(new UpstashPersister(url, token), "redis");
  } else if (mode === "memory" || (!mode && process.env.VERCEL)) {
    instance = new JsonStorage(new MemoryPersister(), "memory");
  } else if (sqliteFactory) {
    instance = sqliteFactory();
  } else {
    console.warn("[storage] SQLite not registered in this runtime; falling back to in-memory storage.");
    instance = new JsonStorage(new MemoryPersister(), "memory");
  }
  return instance;
}

/** Test hook. */
export function _resetStorageForTests() { instance = null; }
