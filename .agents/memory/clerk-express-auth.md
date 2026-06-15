---
name: Clerk Express auth pattern
description: How to access the authenticated user in Express route handlers with @clerk/express
---

**Rule:** Use `getAuth(req)` from `@clerk/express` in route handlers to get `{ userId }`. Do NOT use `req.auth` directly — it is not typed on the Express `Request` type.

**Why:** `@clerk/express` does not augment the Express `Request` type with a typed `auth` property. Accessing `req.auth` causes TS2339 errors.

**How to apply:**
```typescript
import { getAuth } from "@clerk/express";

router.get("/some-route", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  // userId is string | null — use userId! after requireAuth guard
});
```

The `requireAuth` middleware (in `artifacts/api-server/src/middlewares/requireAuth.ts`) uses `getAuth(req)` and calls `next()` only if `userId` is truthy, so after it runs, `userId!` is safe.

**Setup:** `clerkMiddleware` is mounted in `app.ts` before routes. The proxy middleware (`clerkProxyMiddleware`) is mounted before `express.json()`.
