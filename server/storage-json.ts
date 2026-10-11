/**
 * Document-style storage: the whole state lives in one JSON document that a
 * Persister loads and saves. Used for serverless deployments (Upstash Redis)
 * and as a zero-dependency in-memory fallback.
 */
import {
  contentSchemas, contentKeys, type ContentKey, type ContentBundle, type Scenario, type InsertScenario,
  type Task, type UpdateTask, type Note, type InsertNote, type LayerId,
} from "../shared/schema";
import { SEED } from "../shared/seed";
import { httpError, type IStorage, type StorageKind } from "./storage-types";

export interface State {
  content: Record<ContentKey, unknown>;
  updatedAt: Record<ContentKey, number>;
  scenarios: Scenario[];
  tasks: Task[];
  notes: Note[];
  seq: number;
}

export interface Persister {
  load(): Promise<State | null>;
  save(state: State): Promise<void>;
}

const now = () => Date.now();

export function freshState(): State {
  const t = now();
  const content = Object.fromEntries(contentKeys.map((k) => [k, SEED[k]])) as Record<ContentKey, unknown>;
  const updatedAt = Object.fromEntries(contentKeys.map((k) => [k, t])) as Record<ContentKey, number>;
  return { content, updatedAt, scenarios: [], tasks: [], notes: [], seq: 1 };
}

function ensureTasks(state: State) {
  const playbook = state.content.playbook as ContentBundle["playbook"];
  const have = new Set(state.tasks.map((t) => t.id));
  const t = now();
  for (const a of playbook.actions) {
    const id = `action-${a.n}`;
    if (!have.has(id)) state.tasks.push({ id, kind: "action", status: "todo", owner: "", note: "", updatedAt: t });
  }
  playbook.reviewPhases.forEach((_, i) => {
    const id = `phase-${i + 1}`;
    if (!have.has(id)) state.tasks.push({ id, kind: "phase", status: "todo", owner: "", note: "", updatedAt: t });
  });
}

export class MemoryPersister implements Persister {
  private state: State | null = null;
  async load() { return this.state; }
  async save(s: State) { this.state = s; }
}

/** Upstash Redis over REST — works from any serverless runtime with fetch. */
export class UpstashPersister implements Persister {
  constructor(private url: string, private token: string, private key = "mark-intel:state:v1") {}
  private async cmd(...args: unknown[]) {
    const r = await fetch(this.url, { method: "POST", headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
    if (!r.ok) throw new Error(`Redis ${r.status}: ${await r.text()}`);
    return (await r.json()) as { result: unknown; error?: string };
  }
  async load() {
    const { result } = await this.cmd("GET", this.key);
    return typeof result === "string" ? (JSON.parse(result) as State) : null;
  }
  async save(s: State) { await this.cmd("SET", this.key, JSON.stringify(s)); }
}

export class JsonStorage implements IStorage {
  private cache: State | null = null;
  private inflight: Promise<State> | null = null;
  constructor(private persister: Persister, readonly kind: StorageKind) {}

  private async state(): Promise<State> {
    if (this.cache && this.kind === "memory") return this.cache;
    if (this.inflight) return this.inflight;
    this.inflight = (async () => {
      const loaded = await this.persister.load();
      const s = loaded ?? freshState();
      let dirty = !loaded;
      const before = s.tasks.length;
      ensureTasks(s);
      if (s.tasks.length !== before) dirty = true;
      if (dirty) await this.persister.save(s);
      this.cache = s;
      return s;
    })();
    try { return await this.inflight; } finally { this.inflight = null; }
  }
  private async commit(s: State) { this.cache = s; await this.persister.save(s); }
  private bundle(s: State): ContentBundle { return { ...(s.content as Omit<ContentBundle, "updatedAt">), updatedAt: { ...s.updatedAt } }; }

  async getContent() { return this.bundle(await this.state()); }
  async getSection<K extends ContentKey>(key: K) { return (await this.state()).content[key] as ContentBundle[K]; }
  async putSection(key: ContentKey, value: unknown) {
    const parsed = contentSchemas[key].parse(value);
    const s = await this.state();
    s.content[key] = parsed; s.updatedAt[key] = now();
    if (key === "playbook") ensureTasks(s);
    await this.commit(s);
    return this.bundle(s);
  }
  async resetContent(keys: ContentKey[] = contentKeys) {
    const s = await this.state(); const t = now();
    for (const k of keys) { s.content[k] = SEED[k]; s.updatedAt[k] = t; }
    ensureTasks(s);
    await this.commit(s);
    return this.bundle(s);
  }

  async listScenarios() { return [...(await this.state()).scenarios].sort((a, b) => b.createdAt - a.createdAt); }
  async createScenario(x: InsertScenario) {
    const s = await this.state();
    const row: Scenario = { id: s.seq++, ...x, createdAt: now() };
    s.scenarios.push(row); await this.commit(s); return row;
  }
  async deleteScenario(id: number) {
    const s = await this.state(); const n = s.scenarios.length;
    s.scenarios = s.scenarios.filter((x) => x.id !== id);
    if (s.scenarios.length === n) return false;
    await this.commit(s); return true;
  }

  async listTasks() { return [...(await this.state()).tasks]; }
  async upsertTask(id: string, patch: UpdateTask) {
    const s = await this.state();
    const t = s.tasks.find((x) => x.id === id);
    if (!t) throw httpError(404, "Task not found");
    Object.assign(t, patch, { updatedAt: now() });
    await this.commit(s); return { ...t };
  }

  async listNotes(layer?: LayerId) {
    const all = (await this.state()).notes;
    return (layer ? all.filter((n) => n.layer === layer) : [...all]).sort((a, b) => b.createdAt - a.createdAt);
  }
  async createNote(n: InsertNote) {
    const s = await this.state();
    const row: Note = { id: s.seq++, layer: n.layer, author: n.author ?? "Anonymous", body: n.body, createdAt: now() };
    s.notes.push(row); await this.commit(s); return row;
  }
  async deleteNote(id: number) {
    const s = await this.state(); const n = s.notes.length;
    s.notes = s.notes.filter((x) => x.id !== id);
    if (s.notes.length === n) return false;
    await this.commit(s); return true;
  }
}
