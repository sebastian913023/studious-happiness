# CLAUDE.md — MARK Intelligence build brief

You are building (or extending) **MARK Intelligence**: a five-layer, premium competitive-teardown web app for **MARK by AIMatric** vs. **Jasper AI**, **HubSpot Breeze AI**, and **Salesforce Agentforce**. The source teardown (April 7, 2026) is in `docs/teardown-source.txt`. All structured content lives in `shared/seed.ts` — treat it as the single source of truth for copy, numbers, and links. Do not invent competitor facts.

If this repo already contains the code described below, your job is to verify, run, and extend it. If you are starting from an empty directory, build exactly what is specified here.

---

## 1. Product in one paragraph

A dashboard-style app with a fixed left sidebar listing five "layers" (01 Overview, 02 Pricing, 03 Capabilities, 04 Battlecards, 05 Playbook). Each layer is a page. The content is a competitive teardown, but the app is interactive: a live year-one cost modeler with saveable scenarios, a Chart.js radar with vendor toggles and a filterable capability matrix, per-rival battlecards with copy-to-clipboard "landmine" questions, and a playbook with a persistent action tracker. Teams can attach notes to each layer and edit any content section through a JSON data manager. It must feel elite: editorial typography, restrained brass accent, dark theme by default, no generic AI-dashboard look.

---

## 2. Stack (do not substitute)

| Area | Choice |
|---|---|
| Client | React 18, TypeScript (strict), Vite 7, `wouter` with **hash routing** (`useHashLocation`), TanStack Query v5, Chart.js 4 (radar only) |
| Styling | Hand-written CSS in `client/src/index.css` using CSS custom properties. Tailwind is present in the template but **not used** for app styling. No shadcn styling. |
| Server | Node 20+, Express 5, `zod` validation, `zod-validation-error` |
| Storage | Pluggable `IStorage` (async). `SqliteStorage` (better-sqlite3 + Drizzle) for Node/Docker; `JsonStorage` with `UpstashPersister` (Redis REST) or `MemoryPersister` for serverless |
| Build | `vite build` → `dist/public`; esbuild bundles `server/index.ts` → `dist/index.cjs` |
| Deploy | `vercel.json` (static client + `api/index.ts` serverless function), `Dockerfile`, `docker-compose.yml` |
| Tests | `node:test` via `tsx --test test/*.test.ts` |

Rules: never use `localStorage`/cookies for app state (theme is in-memory, defaults from `prefers-color-scheme`). External links use `target="_blank" rel="noopener noreferrer"`. No `alert/confirm/prompt`. Never call `window.confirm`.

---

## 3. Repository layout

```
client/index.html              fonts (Fontshare Cabinet Grotesk + Satoshi, Google JetBrains Mono), SVG favicon
client/src/main.tsx            sets #/ if no hash, mounts <App/>
client/src/App.tsx             QueryClientProvider > ThemeProvider > ToastProvider > Router(hash) > Shell > ErrorBoundary > Switch
client/src/index.css           design tokens + every component style (~650 lines)
client/src/lib/queryClient.ts  apiRequest(), default queryFn, API_BASE ("__PORT_5000__" placeholder → "" when unreplaced)
client/src/lib/api.ts          typed hooks: useContent (with bundled SEED fallback), scenarios/tasks/notes CRUD, useHealth, errorMessage()
client/src/lib/layers.ts       LAYERS array (id, path, n, title, sub), nextLayer()
client/src/lib/theme.tsx       ThemeProvider, cssVar(), hexA()
client/src/lib/format.ts       fmtUsd, fmtInt, fmtDate, slug, pad2
client/src/components/         Shell, CommandPalette, NotesDrawer, DataManager, PositioningMap, RadarChart, Counter, Toast, ErrorBoundary, Primitives (Logo, VTag, Ext, SectionHead, PageSkeleton, LoadError, copyText)
client/src/pages/              Overview, Pricing, Capabilities, Battlecards, Playbook, not-found
shared/schema.ts               Drizzle tables, zod schemas, ContentBundle type, computeCosts()
shared/seed.ts                 SEED content (all teardown data) + SEED_KEYS
server/app.ts                  createApp(): security headers, JSON limit 1mb, logging, routes, error handler
server/index.ts                Node entry: registers SQLite, serves static in production / Vite in dev, listens on PORT (5000)
server/routes.ts               all /api routes (see §6)
server/storage-types.ts        IStorage interface, httpError()
server/storage-sqlite.ts       SqliteStorage (CREATE TABLE IF NOT EXISTS at boot, seedIfEmpty, ensureTasks)
server/storage-json.ts         JsonStorage + MemoryPersister + UpstashPersister
server/storage.ts              getStorage(): env-based selection; registerSqlite()
api/index.ts                   Vercel function: lazily creates the Express app, forwards req/res
script/build.ts                client + server production build
test/costs.test.ts, test/storage.test.ts
docs/teardown-source.txt       original teardown text
```

---

## 4. Design system (must match)

**Fonts:** display `Cabinet Grotesk` 500/700/800, body `Satoshi` 400/500/700, data/labels `JetBrains Mono` 400/500.

**Dark (default):** bg `#0e0e0d`, surface `#141413`, surface-2 `#1a1a18`, surface-3 `#21211e`, text `#ece8df`, muted `#9c988e`, faint `#605d55`, primary (brass) `#d5aa4e`, warn `#e07a5f`, ok `#8ab98a`.
**Vendor colors (dark):** mark `#d5aa4e`, jasper `#8399c9`, hubspot `#d9825f`, salesforce `#6fb0a2`.
**Light:** bg `#f3f0e8`, surface `#faf8f2`, text `#1b1a17`, primary `#8a6516`, jasper `#4a63a3`, hubspot `#b85a3a`, salesforce `#337a6c`.

**Type scale:** `--text-xs … --text-2xl` with `clamp()`. Hero title (`--text-2xl`) only on Overview; other page titles use `--text-xl`. Eyebrow labels are mono, uppercase, letter-spaced, brass dash prefix.

**Layout:** CSS grid shell: sidebar 264px + topbar 56px + scrolling `.main` (body overflow hidden). Topbar shows "Layer 0N / Title" crumb and a five-segment progress bar. ≤900px: sidebar hidden, fixed bottom tab bar with the five layers, topbar shows notes/search/theme icon buttons. Subtle film grain via `body::after` SVG feTurbulence at 5% opacity. Page enter animation (fade + 8px rise). Every "next layer" card at page bottom.

**Components to style:** KPI tiles (animated counters), positioning map (HTML dots over SVG grid, quadrant axis labels), contender cards, proof grid, compliance chips, cost modeler (range sliders with mono outputs, horizontal bars, delta sentence), comparison tables with highlighted MARK column, score pips (3 dots), radar card with legend toggles, coverage index bars, tabs, vs-table (horizontal scroll wrapper ≥640px), callout, landmine quotes with copy buttons, `<details>` actions with badges and status pill, review phases, sources list, buttons (`.btn`, `.primary`, `.sm`, `.danger`), inputs/selects/textarea, right-side drawer, centered modal, toasts (bottom-left of main), skeletons with shimmer, error state, 404.

---

## 5. Data model (`shared/schema.ts`)

Tables: `content_sections(key PK, json, updated_at)`, `scenarios(id, name, seats, contacts, convos, created_at)`, `tasks(id text PK like action-1 / phase-2, kind action|phase, status todo|in_progress|done, owner, note, updated_at)`, `notes(id, layer, author, body, created_at)`.

Zod: `insertScenarioSchema` (name 1–60, seats int 1–500, contacts int 0–5,000,000, convos int 0–1,000,000; the UI sliders use 1–25 / 1k–50k / 0–5000), `updateTaskSchema` (status/owner≤80/note≤2000, all optional), `insertNoteSchema` (layer enum, author ≤60 default "Anonymous", body 1–4000), `layerIdSchema`, `vendorIdSchema` (mark|jasper|hubspot|salesforce), `contentSchemas` for keys `meta, vendors, summary, pricing, features, narrative, battlecards, playbook, sources`, `ContentBundle = sections + updatedAt map`.

`computeCosts(model, {seats, contacts, convos})` → `[{id, annual, monthly}]` in vendor order:
- MARK: `markMonthlyUsd (820) × 12`
- Jasper: `jasperSeatMonthlyUsd (59) × seats × 12`
- HubSpot: `(hubspotBaseMonthlyUsd 800 + ceil(max(0, contacts − 2000) / 5000) × 250) × 12 + hubspotOnboardingUsd 3000`
- Salesforce: `(convos × 2 + seats × 5) × 12`

Capability scores (mark, jasper, hubspot, salesforce): Content 3,3,3,1 · Lead gen 3,0,2,2 · Ads 3,0,0,2 · SEO 3,2,0,0 · Social 3,2,2,2 · Analytics 3,1,2,3 · Orchestration 3,2,2,3 · CRM 2,1,3,3 · Brand gov 2,3,2,2 · Compliance 2,2,2,3 · Industry 3,1,1,2 → coverage MARK 91%, Salesforce 70%, HubSpot 58%, Jasper 52% (tests assert this).

---

## 6. API contract (`server/routes.ts`)

All under `/api`, JSON, `Cache-Control: no-store`. Mutations rate-limited (120/min/IP → 429). Zod errors → 400 `{message, issues}`. Unknown `/api/*` → 404 `{message:"Not found"}`. 5xx bodies never leak internals.

| Method & path | Behavior |
|---|---|
| GET `/health` | `{status, uptimeSeconds, version, storage: sqlite|redis|memory, persistent}` |
| GET `/content` | full `ContentBundle` |
| GET `/content/:key` · GET `/content/:key/seed` | one section / its seed |
| PUT `/content/:key` | validate with `contentSchemas[key]`, persist, return bundle; re-`ensureTasks` when key = playbook |
| POST `/content/reset` `{keys?}` | restore seed for keys (or all) |
| GET/POST `/scenarios` · DELETE `/scenarios/:id` | list (newest first) / create (201, max 50 → 409) / delete (204 or 404) |
| GET `/tasks` · PATCH `/tasks/:id` | list / partial update (404 for unknown id) |
| GET `/notes?layer=` · POST `/notes` · DELETE `/notes/:id` | list / create 201 / delete 204 |
| GET `/export/pricing.csv`, `/export/capabilities.csv`, `/export/scenarios.csv`, `/export/teardown.json` | `Content-Disposition: attachment` downloads |

Storage selection (`server/storage.ts`): `KV_REST_API_URL`+`KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`) → Redis; `STORAGE=memory` or `VERCEL` set without Redis → memory; otherwise SQLite at `DATABASE_PATH` (default `data.db`, `:memory:` allowed). SQLite is registered only by `server/index.ts` so the Vercel bundle never imports the native module.

---

## 7. Pages — required behavior

**Shell:** sidebar with inline SVG "M" logo (rounded square + M path, `currentColor`), five layer links (`aria-current="page"`), footer with Search (⌘K), theme toggle, Notes (badge = note count for current layer), Data manager button, and a status line: "API live · sqlite · v1.0.0" / "API live · ephemeral storage" / "API offline · bundled data, read-only". Keyboard: `1–5` switch layers (ignored while typing), `⌘/Ctrl+K` palette, `N` notes, `Esc` closes overlays. `document.title` = "{Layer} — MARK Intelligence". Scroll main to top on route change.

**01 Overview:** eyebrow, hero title "Six engines. One flat price. *Zero reviews.*", lede + thesis, 5 KPI tiles with count-up (Team plan €750/mo, 6 engines, 147 KPIs, 150+ integrations, 0 public reviews in warn tone), positioning map (autonomy × platform breadth; points mark(30,88) jasper(36,42,flip) hubspot(76,40,upMobile) salesforce(86,30,downMobile)), positioning notes, 4 contender cards (link to vendor URL), proof grid (4 anonymized case studies) + compliance chips.

**02 Pricing:** cost modeler with three sliders (seats 1–25, contacts 1k–50k step 1k, conversations 0–5000 step 100), bars scaled to max, amounts + monthly, delta sentence ("MARK saves X% vs. HubSpot and Y% vs. Salesforce. Jasper is Z% cheaper, but content-only." with correct inverse wording when MARK is dearer), assumptions list from `pricing.model`; save-scenario form (name + Save → toast), saved scenarios list with Load/Delete and CSV export; tier-by-tier comparison table (MARK column highlighted, CSV export); pricing analysis cards; pricing sources.

**03 Capabilities:** radar (Chart.js, min 0 max 3, hidden ticks, colors read from CSS vars so theme switch recolors, labels wrapped <600px) with four vendor toggle buttons (`aria-pressed`); coverage index sorted desc with animated bars; matrix with filters All / MARK leads outright / Contested / MARK gaps, score pips + text, CSV export; "Where MARK leads" ordered list + "X leads on" cards.

**04 Battlecards:** tabs per rival (Jasper default), vs-table (MARK advantage / rival advantage), "Strength to counter" callout, landmine questions with per-question Copy and Copy all (clipboard with `execCommand` fallback; button shows "Copied" 1.6s; toast on failure), rival vulnerabilities list with source link, narrative teardown table (villain/hero/transformation per vendor).

**05 Playbook:** positioning statement with "only autonomous AI marketing agent" emphasized, category ownership rows (target row highlighted), top five actions as `<details>` (first open) with Impact/Effort badges and status pill + tracker (status select, owner input, progress note textarea; owner/note save on blur via PATCH with optimistic update), progress line "N/5 done"; G2 & Capterra review playbook with four phases each having a status select; all 25 sources numbered.

**Overlays:** Command palette (index built from content: KPIs, vendors, proof, pricing rows/analysis, capabilities, leads, landmines, weaknesses, vs rows, narrative, actions, phases, positioning; highlights match; arrow/enter navigation). Notes drawer (per-layer list newest first, delete, form with author + body, counter, toast). Data manager (section list with last-updated timestamps, JSON textarea, Save (server validates), Discard, Restore original, export links; block switching sections while dirty with an inline message).

**States:** skeleton page while loading, `LoadError` with Retry, `ErrorBoundary` per page, empty states for scenarios/notes, offline fallback renders bundled SEED read-only.

---

## 8. Commands & acceptance

```bash
npm install
npm run dev        # http://localhost:5000 — API + Vite HMR on one port
npm run check      # tsc must pass with zero errors
npm test           # 7 tests must pass (schemas, computeCosts, coverage %, JsonStorage CRUD/404/reset)
npm run build && npm start
```

Definition of done:
1. `npm run check` and `npm test` are green.
2. All five layers render at 1400×900 and 375×812 in dark and light with no horizontal overflow and no console errors.
3. Flows verified in a browser: save/load/delete scenario; change action-1 status to Done → "1/5 done"; owner persists after reload; add + delete note; ⌘K "landmine" → Enter navigates to Battlecards; Copy all → "Copied"; Capabilities "MARK gaps" filter shows 3 rows; Data manager edit `pricing.model.markMonthlyUsd` → Pricing modeler updates; Restore original reverts.
4. `curl /api/health` reports `storage: "sqlite"` locally; invalid POST `/api/scenarios` returns 400 with zod details; `/api/export/pricing.csv` has `Content-Disposition: attachment`.
5. Vercel: `vercel deploy` builds with `npm run build:client`, serves `dist/public`, and `/api/health` responds from `api/index.ts`. Add Upstash Redis env vars for persistence.

---

## 9. Non-goals / guardrails

- No auth (single-team tool). Do not add login flows unless asked.
- Do not change competitor figures, quotes, or links except via `shared/seed.ts`, and only with a source.
- Keep the visual system; do not introduce Tailwind utility styling, shadcn components, gradients-on-everything, or stock imagery.
- Keep bundle single-page; hash routing must remain so the static build works from any path.
