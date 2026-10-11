# MARK Intelligence

Five-layer competitive teardown app: **MARK by AIMatric** vs. Jasper AI, HubSpot Breeze AI and Salesforce Agentforce.
Layers: Overview · Pricing (live cost modeler, saved scenarios) · Capabilities (radar, matrix, filters) · Battlecards (landmines, copy-to-clipboard) · Playbook (action tracker, review plan, sources).

## Stack
- **Client:** React 18 + TypeScript, Vite 7, wouter (hash routing), TanStack Query, Chart.js. Custom design system (Cabinet Grotesk / Satoshi / JetBrains Mono), dark + light themes.
- **API:** Express 5, zod-validated routes, CSV/JSON exports, rate-limited writes, security headers.
- **Storage (auto-selected):**
  | Environment | Backend | Persistence |
  |---|---|---|
  | Node / Docker (default) | SQLite via better-sqlite3 + Drizzle (`DATABASE_PATH`) | durable file |
  | Vercel + Upstash Redis (`KV_REST_API_URL` / `KV_REST_API_TOKEN`) | Redis document store | durable |
  | Vercel without Redis, or `STORAGE=memory` | in-memory | ephemeral (resets on cold start) |
- The client ships the bundled teardown as a read-only fallback, so the UI renders even if the API is unreachable.

## Run locally
```bash
npm install
npm run dev          # http://localhost:5000 (API + Vite HMR)
npm test             # unit tests (pricing model, schemas, storage)
npm run check        # TypeScript
npm run build && npm start   # production Node server
```

## Deploy
**Vercel** — `vercel deploy --prod`. `vercel.json` builds the static client to `dist/public` and bundles the API into a single serverless function (`api/index.js`). Add the *Upstash for Redis* marketplace integration to make scenarios, notes and task updates persistent.

**Docker** — `docker compose up -d` (SQLite persisted in the `mark-data` volume, health check on `/api/health`).

## Environment
See `.env.example`. Key variables: `PORT`, `DATABASE_PATH`, `STORAGE`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `APP_VERSION`.

## API
`GET /api/health` · `GET /api/content` · `GET|PUT /api/content/:key` · `POST /api/content/reset` ·
`GET|POST /api/scenarios`, `DELETE /api/scenarios/:id` · `GET /api/tasks`, `PATCH /api/tasks/:id` ·
`GET|POST /api/notes`, `DELETE /api/notes/:id` · `GET /api/export/{pricing.csv,capabilities.csv,scenarios.csv,teardown.json}`

## Keyboard
`1`–`5` jump between layers · `⌘/Ctrl K` search · `N` team notes · `Esc` close.
