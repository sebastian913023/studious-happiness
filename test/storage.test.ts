import { test } from "node:test";
import assert from "node:assert/strict";
import { JsonStorage, MemoryPersister } from "../server/storage-json";
import { contentKeys } from "../shared/schema";

const make = () => new JsonStorage(new MemoryPersister(), "memory");

test("seeds content and tasks on first use", async () => {
  const s = make();
  const c = await s.getContent();
  for (const k of contentKeys) assert.ok(c[k], k);
  const tasks = await s.listTasks();
  assert.equal(tasks.filter((t) => t.kind === "action").length, c.playbook.actions.length);
  assert.equal(tasks.filter((t) => t.kind === "phase").length, c.playbook.reviewPhases.length);
});

test("scenario and note CRUD", async () => {
  const s = make();
  const sc = await s.createScenario({ name: "Mid-market", seats: 8, contacts: 20000, convos: 2000 });
  assert.equal((await s.listScenarios())[0].id, sc.id);
  assert.equal(await s.deleteScenario(sc.id), true);
  assert.equal(await s.deleteScenario(sc.id), false);
  const n = await s.createNote({ layer: "pricing", author: "Sam", body: "Check HubSpot seat pricing." });
  assert.equal((await s.listNotes("pricing")).length, 1);
  assert.equal((await s.listNotes("playbook")).length, 0);
  assert.equal(await s.deleteNote(n.id), true);
});

test("task updates persist and unknown ids 404", async () => {
  const s = make();
  const t = await s.upsertTask("action-1", { status: "done", owner: "Ava" });
  assert.equal(t.status, "done");
  assert.equal((await s.listTasks()).find((x) => x.id === "action-1")?.owner, "Ava");
  await assert.rejects(() => s.upsertTask("nope-9", { status: "done" }), (e: any) => e.status === 404);
});

test("putSection validates and resetContent restores the seed", async () => {
  const s = make();
  await assert.rejects(() => s.putSection("vendors", { bad: true }));
  const before = await s.getSection("summary");
  const edited = { ...before, lede: "Edited lede." };
  const bundle = await s.putSection("summary", edited);
  assert.equal(bundle.summary.lede, "Edited lede.");
  const reset = await s.resetContent(["summary"]);
  assert.equal(reset.summary.lede, before.lede);
});
