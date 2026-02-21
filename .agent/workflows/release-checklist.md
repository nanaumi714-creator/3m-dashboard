---
description: Checklist before releasing to production
---

# Release Checklist

**When to use:**
- Before deploying to production.
- After a major feature merge.

1.  **Security Check**
    - [ ] Run `npm audit`.
    - [ ] Run `security` skill check on changed files.
    - [ ] Verify `NEXT_PUBLIC_` env vars do not contain secrets.

2.  **Quality Check**
    - [ ] `npm run lint` passes.
    - [ ] `npm run typecheck` passes.
    - [ ] `npm run build` passes.

3.  **Functional Check**
    - [ ] Critical paths (Login, Money Transaction) tested manually.
