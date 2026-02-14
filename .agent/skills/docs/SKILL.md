---
name: Documentation Skill
description: Assists in creating, updating, and reviewing project documentation.
triggers:
  - "update docs"
  - "document this"
  - "create readme"
  - "explain architecture"
---

# Documentation Skill

This skill helps maintain the `docs/` directory and ensures documentation stays up-to-date with code.

## Instructions
1.  **Consistency**: Ensure new docs match the style and depth of existing files in `docs/`.
2.  **ADR Generation**: When a significant architectural decision is made, propose creating a new ADR in `docs/decisions/` using the template.
3.  **Review**: When reviewing code changes, check if `docs/` need updates (e.g., new API endpoints, schema changes).

## Formatting
- Markdown.
- Clear headers.
- Mermaid diagrams for complex flows.
