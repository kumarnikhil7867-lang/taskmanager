---
name: Lazy init for lib modules
description: Shared libs must not throw at module load time — validate env vars inside functions, not at top level
---

**Rule:** Never put `throw new Error(...)` or validation logic at the top level of a TypeScript module file in `lib/`. Move env var checks inside the function or class constructor that actually needs them.

**Why:** When a lib module throws at import time (top-level code), it crashes the entire process on startup — even if that code path is never used. This happened with `lib/integrations-gemini-ai/src/image/client.ts` which threw on missing `AI_INTEGRATIONS_GEMINI_BASE_URL` even though the image feature wasn't used.

**How to apply:**
```typescript
// BAD — throws at import time
if (!process.env.SOME_KEY) throw new Error("...");
export const client = new SomeClient({ apiKey: process.env.SOME_KEY });

// GOOD — throws only when actually called
function getClient(): SomeClient {
  if (!process.env.SOME_KEY) throw new Error("...");
  return new SomeClient({ apiKey: process.env.SOME_KEY });
}
export async function doSomething() {
  const client = getClient();
  // ...
}
```

Exception: `lib/integrations-gemini-ai/src/client.ts` (the main text AI client) does throw at top level intentionally — it is always required and the error message is user-facing. Keep that pattern only for truly required deps.
