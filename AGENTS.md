# AGENTS.md

This file is the root bootstrap for tools that only auto-load `AGENTS.md`.

## Source of Truth

Use `.agent/` as the canonical AI context.

1. Primary context: `.agent/context/AGENTS.md`
2. Rules: `.agent/rules/`
3. Workflows: `.agent/workflows/`
4. Skills: `.agent/skills/`
5. Detailed docs: `.agent/docs/`

## Tool Integration Policy

1. Do not create or depend on `CLAUDE.md` for this repository.
2. Antigravity entrypoint is `.antigravity/rules.md`, which points back to `.agent/`.
3. Cursor compatibility entrypoint is `.cursor/rules/global.mdc`, which points back to `.agent/rules/`.

## Maintenance Rule

When agent guidance changes, update `.agent/` first. Keep this file as a minimal pointer only.
