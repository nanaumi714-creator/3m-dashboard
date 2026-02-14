---
name: Code Review Skill
description: Performs a comprehensive code review based on strict quality and security standards.
triggers:
  - "review"
  - "check"
  - "audit code"
  - "verify changes"
---

# Code Review Skill

This skill allows you to review code with a focus on Security, Logic, Performance, and Maintainability.

## Instructions
1.  **Analyze** the provided code against the project's rules (`.agent/rules/*.md`) and documentation (`docs/*.md`).
2.  **Categorize** findings into P0 (Critical), P1 (Important), and P2 (Suggestion).
3.  **Strictly follow** the output format defined in `.agent/rules/30-review-output-format.md`.

## Checklist
- [ ] Is input validation present and correct (Zod)?
- [ ] Is RLS enabled and effective (for DB code)?
- [ ] Are types explicit (No `any`)?
- [ ] Are expensive operations optimized (Memoization, Server Components)?
- [ ] Are secrets exposed?
- [ ] Is error handling robust?

## Usage
Use this skill when the user asks for a "review" or "check" of the code.
