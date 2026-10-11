import type { Express, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { getStorage } from "./storage";
import {
  contentKeySchema, insertScenarioSchema, updateTaskSchema, insertNoteSchema, layerIdSchema,
  computeCosts, type ContentKey,
} from "../shared/schema";
import { SEED } from "../shared/seed";

const startedAt = Date.now();

/** Wrap an async handler so thrown errors (including Zod) land in the error middleware. */
const wrap = (fn: (req: Request, res: Response) => Promise<unknown> | unknown) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve().then(() => fn(req, res)).catch(next);
  };

const csvEscape = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(csvEscape).join(",")).join("\r\n") + "\r\n";
const attach = (res: Response, filename: string, type: string) => {
  res.setHeader("Content-Type", type);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
};

/** Small in-memory write limiter: 120 mutating requests / minute / IP. */
const buckets = new Map<string, { n: number; reset: number }>();
function writeLimiter(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  const ip = req.ip || "anon";
  const t = Date.now();
  const b = buckets.get(ip);
  if (!b || b.reset < t) { buckets.set(ip, { n: 1, reset: t + 60_000 }); return next(); }
  if (b.n >= 120) return res.status(429).json({ message: "Too many requests. Try again in a minute." });
  b.n += 1;
  next();
}

export async function registerRoutes(app: Express): Promise<void> {
  const storage = await getStorage();

  app.use("/api", writeLimiter);
  app.use("/api", (_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });

  /* ---------- health ---------- */
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      version: process.env.APP_VERSION || "1.0.0",
      storage: storage.kind,
      persistent: storage.kind !== "memory",
    });
  });

  /* ---------- content ---------- */
  app.get("/api/content", wrap(async (_req, res) => res.json(await storage.getContent())));

  app.get("/api/content/:key", wrap(async (req, res) => {
    const key = contentKeySchema.parse(req.params.key);
    res.json(await storage.getSection(key));
  }));

  app.get("/api/content/:key/seed", wrap((req, res) => {
    const key = contentKeySchema.parse(req.params.key);
    res.json(SEED[key]);
  }));

  app.put("/api/content/:key", wrap(async (req, res) => {
    const key = contentKeySchema.parse(req.params.key);
    res.json(await storage.putSection(key, req.body));
  }));

  app.post("/api/content/reset", wrap(async (req, res) => {
    const keys = Array.isArray(req.body?.keys) ? (req.body.keys as unknown[]).map((k) => contentKeySchema.parse(k)) : undefined;
    res.json(await storage.resetContent(keys as ContentKey[] | undefined));
  }));

  /* ---------- scenarios ---------- */
  app.get("/api/scenarios", wrap(async (_req, res) => res.json(await storage.listScenarios())));

  app.post("/api/scenarios", wrap(async (req, res) => {
    const data = insertScenarioSchema.parse(req.body);
    if ((await storage.listScenarios()).length >= 50) return res.status(409).json({ message: "Scenario limit reached (50). Delete one first." });
    res.status(201).json(await storage.createScenario(data));
  }));

  app.delete("/api/scenarios/:id", wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid id" });
    return (await storage.deleteScenario(id)) ? res.status(204).end() : res.status(404).json({ message: "Scenario not found" });
  }));

  /* ---------- tasks ---------- */
  app.get("/api/tasks", wrap(async (_req, res) => res.json(await storage.listTasks())));

  app.patch("/api/tasks/:id", wrap(async (req, res) => {
    const patch = updateTaskSchema.parse(req.body);
    res.json(await storage.upsertTask(String(req.params.id), patch));
  }));

  /* ---------- notes ---------- */
  app.get("/api/notes", wrap(async (req, res) => {
    const layer = req.query.layer ? layerIdSchema.parse(req.query.layer) : undefined;
    res.json(await storage.listNotes(layer));
  }));

  app.post("/api/notes", wrap(async (req, res) => {
    const data = insertNoteSchema.parse(req.body);
    res.status(201).json(await storage.createNote(data));
  }));

  app.delete("/api/notes/:id", wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid id" });
    return (await storage.deleteNote(id)) ? res.status(204).end() : res.status(404).json({ message: "Note not found" });
  }));

  /* ---------- exports ---------- */
  app.get("/api/export/pricing.csv", wrap(async (_req, res) => {
    const c = await storage.getContent();
    const header = ["Dimension", ...c.vendors.map((v) => v.name)];
    const rows = c.pricing.rows.map((r) => [r.dim, r.mark, r.jasper, r.hubspot, r.salesforce]);
    attach(res, "mark-pricing-comparison.csv", "text/csv; charset=utf-8");
    res.send(toCsv([header, ...rows]));
  }));

  app.get("/api/export/capabilities.csv", wrap(async (_req, res) => {
    const c = await storage.getContent();
    const header = ["Capability", ...c.vendors.flatMap((v) => [`${v.name} score`, `${v.name} detail`])];
    const rows = c.features.capabilities.map((cap) => [
      cap.name, cap.scores[0], cap.mark, cap.scores[1], cap.jasper, cap.scores[2], cap.hubspot, cap.scores[3], cap.salesforce,
    ]);
    attach(res, "mark-capability-matrix.csv", "text/csv; charset=utf-8");
    res.send(toCsv([header, ...rows]));
  }));

  app.get("/api/export/scenarios.csv", wrap(async (_req, res) => {
    const c = await storage.getContent();
    const header = ["Scenario", "Seats", "Contacts", "AI conversations/mo", ...c.vendors.map((v) => `${v.name} year-1 USD`)];
    const rows = (await storage.listScenarios()).map((s) => {
      const costs = computeCosts(c.pricing.model, s);
      return [s.name, s.seats, s.contacts, s.convos, ...costs.map((x) => Math.round(x.annual))];
    });
    attach(res, "mark-cost-scenarios.csv", "text/csv; charset=utf-8");
    res.send(toCsv([header, ...rows]));
  }));

  app.get("/api/export/teardown.json", wrap(async (_req, res) => {
    attach(res, "mark-teardown.json", "application/json; charset=utf-8");
    res.send(JSON.stringify({
      exportedAt: new Date().toISOString(),
      content: await storage.getContent(),
      tasks: await storage.listTasks(),
      scenarios: await storage.listScenarios(),
      notes: await storage.listNotes(),
    }, null, 2));
  }));

  /* ---------- 404 for unknown API routes ---------- */
  app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));

  /* ---------- error translation (Zod / JSON -> 400) ---------- */
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message, issues: err.issues });
    if (err instanceof SyntaxError && "body" in (err as object)) return res.status(400).json({ message: "Malformed JSON body" });
    next(err);
  });
}
