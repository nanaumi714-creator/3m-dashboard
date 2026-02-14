---
description: How to perform a small, safe refactor
---

# Small Refactor Workflow

**When to use:**
- Renaming variables/functions.
- Extracting components.
- Cleaning up dead code.
- **NOT** for architectural changes.

1.  **Preparation**
    - Read `docs/project-structure.md` to understand where files belong.
    - Read `10-coding-rules.md` for style guides.

2.  **Plan**
    - Identify the scope. If > 5 files, stop and ask usage to break it down.
    - Create a mini-plan in `task.md`.

3.  **Execution**
    - Use `code-gen` skill principles (Types first, validation second).
    - Apply changes.

4.  **Verification**
    - Run build `npm run build` (if applicable).
    - Run lint `npm run lint`.
