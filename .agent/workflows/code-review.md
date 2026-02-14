---
description: How to perform a code review using the AI agent
---

# Code Review Workflow

**When to use:**
- Before creating a Pull Request.
- Final check before merging.
- When explicitly asked to "review code".

**Prerequisites:**
- `.agent/skills/code-review/` is loaded.

1.  **Context Loading**
    - Read `docs/architecture.md` and `docs/domain-money.md` to understand the current context.
    - Read `.agent/rules/30-review-output-format.md` to understand the output format.

2.  **Skill Execution**
    - Use the `code-review` skill.
    - Load the prompt from `prompts/review_prompt.md`.
    - Apply the checklist from `.agent/skills/code-review/checklist.md`.

3.  **Output Generation**
    - Generate the review in the standard format.
    - If critical issues (P0) are found, explicitly ask the user to fix them.
