# LifeOS AI

An AI-powered execution assistant SaaS web app. Users track measurable work units (questions solved, pages read, apps sent) and log progress through natural language chat.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/lifeos-ai run dev` — run the frontend (port 19302)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — rebuild lib declarations (run after schema changes)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `GEMINI_API_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Clerk auth (`@clerk/express`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + shadcn/ui + TailwindCSS + wouter
- AI: Gemini 2.5 Flash via direct `GEMINI_API_KEY` (no proxy)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (tasks, activity_logs, chat_messages)
- `lib/integrations-gemini-ai/` — Gemini AI client (uses `GEMINI_API_KEY` directly)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/lifeos-ai/src/pages/` — React page components
- Generated hooks: `lib/api-client-react/src/generated/api.ts`
- Generated Zod schemas: `lib/api-zod/src/generated/api.ts`

## Architecture decisions

- Contract-first: OpenAPI spec → Orval → React Query hooks + Zod validators. Never write raw fetch calls.
- All routes protected by `requireAuth` middleware using `getAuth(req)` from `@clerk/express`.
- Chat uses Gemini 2.5 Flash with JSON mode to extract structured actions from natural language, then executes them against the DB.
- `@google/genai` and other Gemini runtime deps must be listed in `api-server`'s `dependencies` (not just the lib's) because esbuild externalizes `@google/*` at bundle time.
- Image generation client (`lib/integrations-gemini-ai/src/image/client.ts`) uses lazy initialization — validates env vars inside the function, not at module load time.

## Product

- **Dashboard** — summary stats (active tasks, completions, units remaining), task cards with progress bars, activity timeline
- **Chat** — natural language AI interface. Type "I solved 20 SQL questions", "Create a goal: 50 pushups today", "What's left?" — AI parses intent and updates tasks live
- **Tasks** — full task list with inline progress updates and task creation
- **Activity** — chronological log of all progress entries grouped by day
- **Settings** — user profile, theme toggle, sign out

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing DB schema, run `pnpm --filter @workspace/db run push` then `pnpm run typecheck:libs` to refresh lib declarations.
- After changing OpenAPI spec, run `pnpm --filter @workspace/api-spec run codegen` (it also rebuilds libs).
- TS2308 Orval collision: do NOT add both path params AND query params to the same endpoint — pick one (remove query params if the endpoint already has path params).
- `@google/*` is externalized in esbuild — any package from the `@google/` scope must be a direct `dependency` of `api-server`, not just the workspace lib.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
