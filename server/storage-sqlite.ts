import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import {
  contentSections, scenarios, tasks, notes, contentSchemas, contentKeys,
  type ContentKey, type ContentBundle, type Scenario, type InsertScenario,
  type Task, type UpdateTask, type Note, type InsertNote, type LayerId,
} from "../shared/schema";
import { SEED } from "../shared/seed";

import type { IStorage } from "./storage-types";

const DB_PATH = process.env.DATABASE_PATH || "data.db";
if (DB_PATH !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(DB_PATH)), { recursive: true });
const sqlite = new Database(DB_PATH);
if (DB_PATH !== ":memory:") sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

/* Schema is applied idempotently at boot so a fresh container works without a migration step. */
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS content_sections (key TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS scenarios (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, seats INTEGER NOT NULL, contacts INTEGER NOT NULL, convos INTEGER NOT NULL, created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, kind TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'todo', owner TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, layer TEXT NOT NULL, author TEXT NOT NULL DEFAULT 'Anonymous', body TEXT NOT NULL, created_at INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS notes_layer_idx ON notes(layer);
`);

export const db = drizzle(sqlite);
const now = () => Date.now();

export class SqliteStorage implements IStorage {
  readonly kind = "sqlite" as const;
  constructor() {
    this.seedIfEmpty();
    this.ensureTasks();
  }

  /* ---------------- content ---------------- */
  private seedIfEmpty() {
    const existing = new Set(db.select({ key: contentSections.key }).from(contentSections).all().map((r) => r.key));
    const t = now();
    for (const key of contentKeys) {
      if (!existing.has(key)) {
        db.insert(contentSections).values({ key, json: JSON.stringify(SEED[key]), updatedAt: t }).run();
      }
    }
  }

  private ensureTasks() {
    const row = db.select().from(contentSections).where(eq(contentSections.key, "playbook")).get();
    const playbook = (row ? JSON.parse(row.json) : SEED.playbook) as ContentBundle["playbook"];
    const existing = new Set(db.select({ id: tasks.id }).from(tasks).all().map((r) => r.id));
    const t = now();
    for (const a of playbook.actions) {
      const id = `action-${a.n}`;
      if (!existing.has(id)) db.insert(tasks).values({ id, kind: "action", status: "todo", owner: "", note: "", updatedAt: t }).run();
    }
    playbook.reviewPhases.forEach((_, i) => {
      const id = `phase-${i + 1}`;
      if (!existing.has(id)) db.insert(tasks).values({ id, kind: "phase", status: "todo", owner: "", note: "", updatedAt: t }).run();
    });
  }

  async getContent(): Promise<ContentBundle> {
    const rows = db.select().from(contentSections).all();
    const bundle: Record<string, unknown> = {};
    const updatedAt: Record<string, number> = {};
    for (const r of rows) { bundle[r.key] = JSON.parse(r.json); updatedAt[r.key] = r.updatedAt; }
    return { ...(bundle as Omit<ContentBundle, "updatedAt">), updatedAt: updatedAt as ContentBundle["updatedAt"] };
  }

  async getSection<K extends ContentKey>(key: K): Promise<ContentBundle[K]> {
    const row = db.select().from(contentSections).where(eq(contentSections.key, key)).get();
    return (row ? JSON.parse(row.json) : SEED[key]) as ContentBundle[K];
  }

  async putSection(key: ContentKey, value: unknown): Promise<ContentBundle> {
    const parsed = contentSchemas[key].parse(value); // throws ZodError on invalid payloads
    db.insert(contentSections)
      .values({ key, json: JSON.stringify(parsed), updatedAt: now() })
      .onConflictDoUpdate({ target: contentSections.key, set: { json: JSON.stringify(parsed), updatedAt: now() } })
      .run();
    if (key === "playbook") this.ensureTasks();
    return await this.getContent();
  }

  async resetContent(keys: ContentKey[] = contentKeys): Promise<ContentBundle> {
    const t = now();
    for (const key of keys) {
      db.insert(contentSections)
        .values({ key, json: JSON.stringify(SEED[key]), updatedAt: t })
        .onConflictDoUpdate({ target: contentSections.key, set: { json: JSON.stringify(SEED[key]), updatedAt: t } })
        .run();
    }
    return await this.getContent();
  }

  /* ---------------- scenarios ---------------- */
  async listScenarios(): Promise<Scenario[]> {
    return db.select().from(scenarios).orderBy(desc(scenarios.createdAt)).all();
  }
  async createScenario(s: InsertScenario): Promise<Scenario> {
    return db.insert(scenarios).values({ ...s, createdAt: now() }).returning().get();
  }
  async deleteScenario(id: number): Promise<boolean> {
    return db.delete(scenarios).where(eq(scenarios.id, id)).run().changes > 0;
  }

  /* ---------------- tasks ---------------- */
  async listTasks(): Promise<Task[]> {
    return db.select().from(tasks).all();
  }
  async upsertTask(id: string, patch: UpdateTask): Promise<Task> {
    const kind = id.startsWith("action-") ? "action" : id.startsWith("phase-") ? "phase" : null;
    if (!kind) throw Object.assign(new Error("Unknown task id"), { status: 404 });
    const existing = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!existing) throw Object.assign(new Error("Task not found"), { status: 404 });
    return db.update(tasks).set({ ...patch, updatedAt: now() }).where(eq(tasks.id, id)).returning().get();
  }

  /* ---------------- notes ---------------- */
  async listNotes(layer?: LayerId): Promise<Note[]> {
    const q = db.select().from(notes);
    return (layer ? q.where(eq(notes.layer, layer)) : q).orderBy(desc(notes.createdAt)).all();
  }
  async createNote(n: InsertNote): Promise<Note> {
    return db.insert(notes).values({ ...n, createdAt: now() }).returning().get();
  }
  async deleteNote(id: number): Promise<boolean> {
    return db.delete(notes).where(eq(notes.id, id)).run().changes > 0;
  }
}
