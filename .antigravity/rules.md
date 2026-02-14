# Antigravity Workspace Rules

This workspace keeps all durable agent context in `.agent/`.

## Load Order

1. `AGENTS.md` (root bootstrap)
2. `.agent/context/AGENTS.md` (full project policy)
3. `.agent/rules/00-core.md`
4. Other files in `.agent/rules/` as needed by task scope
5. `.agent/workflows/` and `.agent/skills/` when task-specific behavior is required

## Source-of-Truth Rule

- Treat `.agent/` as canonical.
- Do not fork policy into Antigravity-only copies.
- If guidance changes, update `.agent/` first.

## Scope Reminder

- Respect current phase constraints and project DoD from `.agent/context/AGENTS.md`.
