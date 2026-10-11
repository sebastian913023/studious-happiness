import type { ContentKey, ContentBundle, Scenario, InsertScenario, Task, UpdateTask, Note, InsertNote, LayerId } from "../shared/schema";

export type StorageKind = "sqlite" | "redis" | "memory";

export interface IStorage {
  readonly kind: StorageKind;
  getContent(): Promise<ContentBundle>;
  getSection<K extends ContentKey>(key: K): Promise<ContentBundle[K]>;
  putSection(key: ContentKey, value: unknown): Promise<ContentBundle>;
  resetContent(keys?: ContentKey[]): Promise<ContentBundle>;

  listScenarios(): Promise<Scenario[]>;
  createScenario(s: InsertScenario): Promise<Scenario>;
  deleteScenario(id: number): Promise<boolean>;

  listTasks(): Promise<Task[]>;
  upsertTask(id: string, patch: UpdateTask): Promise<Task>;

  listNotes(layer?: LayerId): Promise<Note[]>;
  createNote(n: InsertNote): Promise<Note>;
  deleteNote(id: number): Promise<boolean>;
}

export const httpError = (status: number, message: string) => Object.assign(new Error(message), { status });
