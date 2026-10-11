import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import * as z from "zod";

/* ------------------------------------------------------------------ */
/*  Persistence tables                                                 */
/* ------------------------------------------------------------------ */

/** Editable teardown content, one JSON document per section. */
export const contentSections = sqliteTable("content_sections", {
  key: text("key").primaryKey(),
  json: text("json").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

/** Saved cost-model scenarios (Layer 02). */
export const scenarios = sqliteTable("scenarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  seats: integer("seats").notNull(),
  contacts: integer("contacts").notNull(),
  convos: integer("convos").notNull(),
  createdAt: integer("created_at").notNull(),
});

/** Status tracker for playbook actions and review phases (Layer 05). */
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(), // e.g. "action-1", "phase-3"
  kind: text("kind").notNull(), // "action" | "phase"
  status: text("status").notNull().default("todo"), // todo | in_progress | done
  owner: text("owner").notNull().default(""),
  note: text("note").notNull().default(""),
  updatedAt: integer("updated_at").notNull(),
});

/** Team annotations attached to a layer. */
export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  layer: text("layer").notNull(), // overview | pricing | capabilities | battlecards | playbook
  author: text("author").notNull().default("Anonymous"),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
});

/* ------------------------------------------------------------------ */
/*  Insert schemas + types                                             */
/* ------------------------------------------------------------------ */

export const insertScenarioSchema = createInsertSchema(scenarios)
  .omit({ id: true, createdAt: true })
  .extend({
    name: z.string().trim().min(1, "Name is required").max(60),
    seats: z.number().int().min(1).max(500),
    contacts: z.number().int().min(0).max(5_000_000),
    convos: z.number().int().min(0).max(1_000_000),
  });
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
export type Scenario = typeof scenarios.$inferSelect;

export const taskStatusSchema = z.enum(["todo", "in_progress", "done"]);
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export const updateTaskSchema = z.object({
  status: taskStatusSchema.optional(),
  owner: z.string().trim().max(80).optional(),
  note: z.string().trim().max(2000).optional(),
});
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const layerIdSchema = z.enum(["overview", "pricing", "capabilities", "battlecards", "playbook"]);
export type LayerId = z.infer<typeof layerIdSchema>;
export const insertNoteSchema = createInsertSchema(notes)
  .omit({ id: true, createdAt: true })
  .extend({
    layer: layerIdSchema,
    author: z.string().trim().max(60).default("Anonymous"),
    body: z.string().trim().min(1, "Note cannot be empty").max(4000),
  });
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

/* ------------------------------------------------------------------ */
/*  Content section schemas (validated on edit)                        */
/* ------------------------------------------------------------------ */

export const vendorIdSchema = z.enum(["mark", "jasper", "hubspot", "salesforce"]);
export type VendorId = z.infer<typeof vendorIdSchema>;

const link = z.object({ label: z.string(), href: z.string().url() });

export const vendorSchema = z.object({
  id: vendorIdSchema,
  name: z.string(),
  org: z.string(),
  short: z.string(),
  tagline: z.string(),
  url: z.string().url(),
});

export const summarySchema = z.object({
  lede: z.string(),
  thesis: z.string(),
  kpis: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
      prefix: z.string().optional(),
      suffix: z.string().optional(),
      note: z.string(),
      href: z.string().url().optional(),
      tone: z.enum(["warn"]).optional(),
    }),
  ),
  proof: z.array(z.object({ industry: z.string(), stat: z.string(), desc: z.string() })),
  proofHref: z.string().url(),
  compliance: z.array(z.string()),
  complianceHref: z.string().url(),
  positioning: z.array(
    z.object({
      id: vendorIdSchema,
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      label: z.string(),
      flip: z.boolean().optional(),
      upMobile: z.boolean().optional(),
      downMobile: z.boolean().optional(),
    }),
  ),
  positioningNotes: z.array(z.string()),
});

const perVendorText = z.object({ mark: z.string(), jasper: z.string(), hubspot: z.string(), salesforce: z.string() });

export const pricingSchema = z.object({
  rows: z.array(perVendorText.extend({ dim: z.string() })),
  analysis: z.array(z.object({ vendor: vendorIdSchema, text: z.string() })),
  sources: z.array(link),
  model: z.object({
    markMonthlyUsd: z.number(),
    jasperSeatMonthlyUsd: z.number(),
    hubspotBaseMonthlyUsd: z.number(),
    hubspotIncludedContacts: z.number(),
    hubspotContactBlock: z.number(),
    hubspotContactBlockMonthlyUsd: z.number(),
    hubspotOnboardingUsd: z.number(),
    salesforcePerConversationUsd: z.number(),
    salesforceSeatMonthlyUsd: z.number(),
  }),
});

export const featuresSchema = z.object({
  capabilities: z.array(perVendorText.extend({ name: z.string(), scores: z.array(z.number().min(0).max(3)).length(4) })),
  leads: z.array(z.string()),
  theirs: z.array(z.object({ vendor: vendorIdSchema, text: z.string() })),
});

export const narrativeSchema = z.array(perVendorText.extend({ el: z.string() }));

export const battlecardsSchema = z.array(
  z.object({
    vs: vendorIdSchema,
    rows: z.array(z.object({ dim: z.string(), mark: z.string(), them: z.string() })),
    counter: z.string(),
    landmines: z.array(z.string()),
    weaknesses: z.array(z.string()),
    weaknessHref: z.string().url(),
  }),
);

export const playbookSchema = z.object({
  positioning: z.string(),
  category: z.object({
    recommendation: z.string(),
    owned: z.array(z.object({ vendor: vendorIdSchema, owns: z.string(), target: z.boolean().optional() })),
  }),
  actions: z.array(
    z.object({
      n: z.number().int(),
      title: z.string(),
      impact: z.enum(["High", "Medium", "Low"]),
      effort: z.enum(["High", "Medium", "Low"]),
      body: z.string(),
      links: z.array(link),
    }),
  ),
  reviewPhases: z.array(
    z.object({
      phase: z.string(),
      window: z.string(),
      title: z.string(),
      goal: z.string(),
      steps: z.array(z.string()),
      links: z.array(link),
    }),
  ),
});

export const sourcesSchema = z.array(z.tuple([z.string(), z.string().url()]));

export const metaSchema = z.object({ product: z.string(), prepared: z.string(), category: z.string() });

export const contentSchemas = {
  meta: metaSchema,
  vendors: z.array(vendorSchema).length(4),
  summary: summarySchema,
  pricing: pricingSchema,
  features: featuresSchema,
  narrative: narrativeSchema,
  battlecards: battlecardsSchema,
  playbook: playbookSchema,
  sources: sourcesSchema,
} as const;

export type ContentKey = keyof typeof contentSchemas;
export const contentKeys = Object.keys(contentSchemas) as ContentKey[];
export const contentKeySchema = z.enum(contentKeys as [ContentKey, ...ContentKey[]]);

export type Meta = z.infer<typeof metaSchema>;
export type Vendor = z.infer<typeof vendorSchema>;
export type Summary = z.infer<typeof summarySchema>;
export type Pricing = z.infer<typeof pricingSchema>;
export type Features = z.infer<typeof featuresSchema>;
export type Narrative = z.infer<typeof narrativeSchema>;
export type Battlecards = z.infer<typeof battlecardsSchema>;
export type Playbook = z.infer<typeof playbookSchema>;
export type Sources = z.infer<typeof sourcesSchema>;

export interface ContentBundle {
  meta: Meta;
  vendors: Vendor[];
  summary: Summary;
  pricing: Pricing;
  features: Features;
  narrative: Narrative;
  battlecards: Battlecards;
  playbook: Playbook;
  sources: Sources;
  updatedAt: Record<ContentKey, number>;
}

/* ------------------------------------------------------------------ */
/*  Shared cost model (used by server exports and client modeler)      */
/* ------------------------------------------------------------------ */

export interface CostInputs { seats: number; contacts: number; convos: number }
export interface CostLine { id: VendorId; annual: number; monthly: number }

export function computeCosts(m: Pricing["model"], { seats, contacts, convos }: CostInputs): CostLine[] {
  const mark = m.markMonthlyUsd * 12;
  const jasper = m.jasperSeatMonthlyUsd * seats * 12;
  const extra = Math.max(0, contacts - m.hubspotIncludedContacts);
  const hubspot = m.hubspotBaseMonthlyUsd * 12 + Math.ceil(extra / m.hubspotContactBlock) * m.hubspotContactBlockMonthlyUsd * 12 + m.hubspotOnboardingUsd;
  const salesforce = (convos * m.salesforcePerConversationUsd + seats * m.salesforceSeatMonthlyUsd) * 12;
  const line = (id: VendorId, annual: number): CostLine => ({ id, annual, monthly: annual / 12 });
  return [line("mark", mark), line("jasper", jasper), line("hubspot", hubspot), line("salesforce", salesforce)];
}
