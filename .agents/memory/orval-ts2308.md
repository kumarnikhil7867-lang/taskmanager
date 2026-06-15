---
name: Orval codegen TS2308 collision
description: Orval generates conflicting type names when an endpoint has both path params and query params
---

**Rule:** When defining endpoints in `lib/api-spec/openapi.yaml`, do NOT put both path parameters AND query parameters on the same endpoint. Remove query params if path params already exist (or vice versa).

**Why:** Orval generates a `Params` type that combines path and query params. When both exist on the same endpoint, it generates duplicate/conflicting identifiers (TS2308: Cannot find module / duplicate identifier).

**How to apply:**
- If you need both path + query filtering, move the query params to the response shape or use a separate list endpoint.
- After any change to `openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` and verify no TS errors in the generated output.
- Example fix applied: `getTaskActivity` had a `limit` query param removed because the endpoint already had an `id` path param.
