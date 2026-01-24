# GitHub Copilot Custom Instructions

## First Steps

**Before suggesting any code**, read these files in order:

1. `AGENTS.md` - Project intent, current phase, core principles
2. `ai/PHASE.md` - Current phase constraints (Phase 1 = local-only, zero-cost)
3. `ai/DECISIONS.md` - Why key design choices were made

For area-specific guidance, read:
- Frontend: `.github/instructions/frontend.instructions.md`
- Importer: `.github/instructions/importer.instructions.md`
- Database: `.github/instructions/database.instructions.md`

---

## Core Rules

### Always
- ✅ Check current phase in `ai/PHASE.md` before suggesting features
- ✅ Prefer simple solutions (YAGNI principle)
- ✅ Include error handling (try-catch, async/await)
- ✅ Add comments for non-obvious logic
- ✅ Maintain idempotency for importer code

### Never
- ❌ Suggest features forbidden in current phase
- ❌ Use `any` type in TypeScript
- ❌ Skip error handling
- ❌ Add dependencies without strong justification
- ❌ Use localStorage/sessionStorage
- ❌ Suggest cloud services in Phase 1

---

## Code Generation Guidelines

### TypeScript/React
- Use strict TypeScript (no `any`)
- Functional components with hooks
- Custom hooks for data fetching
- Tailwind CSS utility classes only
- Explicit error handling with try-catch

### Python
- Type hints on all functions
- Google-style docstrings
- Use `logging` instead of `print`
- Explicit error handling with try-except

### SQL
- Comment all DDL changes
- Use snake_case for identifiers
- Include CHECK constraints where appropriate
- Reference `ai/DB.md` for schema design intent

---

## Phase-Specific Constraints

**Current Phase**: Check `ai/PHASE.md` for latest

**Phase 1 (Local MVP)**:
- Local-only (no cloud)
- JPY currency only (BIGINT, not DECIMAL)
- Single CSV format
- Zero external costs

**If user requests Phase 2+ feature**:
- Note it requires phase upgrade
- Suggest deferring or implementing as experimental flag
- Link to `ai/PHASE.md` transition checklist

---

## Quality Checks

Before marking code as "ready":

- [ ] Follows conventions in `.github/instructions/*.instructions.md`
- [ ] No Phase constraint violations
- [ ] Error handling present
- [ ] Types are explicit (no `any`)
- [ ] Idempotency verified (for imports)
- [ ] Comments added for complex logic

---

## When in Doubt

1. Read `AGENTS.md` for project philosophy
2. Check `ai/PHASE.md` for current constraints
3. Search `ai/DECISIONS.md` for similar past decisions
4. Prefer asking user over assuming

---

## Commit/PR Guidelines (Optional)

- Commit messages: Conventional Commits format
- PR description: Include "Fixes #issue" if applicable
- Breaking changes: Update `ai/DECISIONS.md` and `AGENTS.md`
- Schema changes: Update `ai/DB.md`
