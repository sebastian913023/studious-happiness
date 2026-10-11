/**
 * Vercel serverless entry. Compiled by Vercel's Node builder; the Express app is
 * created once per warm instance. SQLite is intentionally not registered here —
 * storage resolves to Upstash Redis (if configured) or in-memory.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../server/app";

let appPromise: ReturnType<typeof createApp> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  appPromise ??= createApp();
  const app = await appPromise;
  app(req as any, res as any);
}
