import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCosts, contentSchemas, contentKeys } from "../shared/schema";
import { SEED } from "../shared/seed";

test("seed content validates against every section schema", () => {
  for (const k of contentKeys) assert.doesNotThrow(() => contentSchemas[k].parse(SEED[k]), `section ${k}`);
});

test("computeCosts follows the documented pricing model", () => {
  const m = SEED.pricing.model;
  const [mark, jasper, hubspot, sf] = computeCosts(m, { seats: 5, contacts: 10000, convos: 1500 });
  assert.equal(mark.id, "mark");
  assert.equal(Math.round(mark.annual), m.markMonthlyUsd * 12);
  assert.equal(Math.round(jasper.annual), m.jasperSeatMonthlyUsd * 5 * 12);
  const blocks = Math.ceil((10000 - m.hubspotIncludedContacts) / m.hubspotContactBlock);
  assert.equal(Math.round(hubspot.annual), (m.hubspotBaseMonthlyUsd + blocks * m.hubspotContactBlockMonthlyUsd) * 12 + m.hubspotOnboardingUsd);
  assert.equal(Math.round(sf.annual), (1500 * m.salesforcePerConversationUsd + 5 * m.salesforceSeatMonthlyUsd) * 12);
  for (const c of [mark, jasper, hubspot, sf]) assert.ok(Math.abs(c.monthly * 12 - c.annual) < 1);
});

test("capability coverage matches the teardown", () => {
  const caps = SEED.features.capabilities;
  const pct = (i: number) => Math.round((caps.reduce((a, c) => a + c.scores[i], 0) / (caps.length * 3)) * 100);
  assert.deepEqual([pct(0), pct(1), pct(2), pct(3)], [91, 52, 58, 70]);
});
