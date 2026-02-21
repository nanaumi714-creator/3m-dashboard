---
name: Code Generation Skill
description: Generates high-quality, secure, and idiomatic Next.js/Supabase code.
triggers:
  - "generate code"
  - "implement"
  - "create component"
  - "write function"
---

# Code Generation Skill

This skill guides you in generating code that adheres to the project's architectural and stylistic guidelines.

## Instructions
1.  **Context Awareness**: Before generating code, read `docs/architecture.md` and `docs/domain-money.md` if relevant.
2.  **Security First**: Always implement RLS and validation *before* writing the business logic.
3.  **Type Safety**: Generate full TypeScript definitions first.
4.  **Minimal Changes**: When modifying existing code, touch only what is necessary.

## Key Patterns
- **Server Actions**: Use for mutations.
- **Server Components**: Use for fetching data.
- **Client Components**: Use for interactivity.
- **Zod**: Use for validation.

## Formatting
- Use strict TypeScript.
- Add JSDoc for complex functions.
