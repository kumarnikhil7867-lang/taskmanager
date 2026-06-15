---
name: Gemini API setup
description: How Gemini AI is wired in this project — direct API key, no Replit proxy, esbuild externalization gotcha
---

**Rule:** Use `GEMINI_API_KEY` directly in `lib/integrations-gemini-ai/src/client.ts` via standard `GoogleGenAI`. The Replit AI Integrations proxy was declined by the user.

**Why:** User provided their own Gemini API key and did not want the proxy/billing layer.

**How to apply:**
- The `@google/genai` package and any other `@google/*` packages are externalized by esbuild in `artifacts/api-server/build.mjs`. This means they are NOT bundled into `dist/index.mjs`.
- Any workspace lib that uses `@google/genai` must have it listed as a direct `dependency` in `artifacts/api-server/package.json` so Node.js can find it at runtime.
- Same applies to transitive deps like `p-limit`, `p-retry` — add them directly to api-server if they come from an externalized lib.
- The main client (`lib/integrations-gemini-ai/src/client.ts`) uses `gemini-2.5-flash` model for text/JSON generation.
- The image client (`./image/client.ts`) uses the Replit proxy URL — it is NOT used in this project.
