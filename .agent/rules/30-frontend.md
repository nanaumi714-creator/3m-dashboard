# Frontend Rules

---
description: Guidelines for Next.js Frontend code
globs: 
  - "frontend/**/*.{ts,tsx}"
  - "frontend/**/*.css"
---

## Read First
Reference `.github/instructions/frontend.instructions.md` for detailed code patterns.

## Quick Checklist

1. **Strict Types**: No `any`. Use generated Supabase types from `lib/database.types.ts`.
2. **Tailwind Only**: No CSS modules, no styled-components.
3. **Supabase Client**: Use the singleton from `lib/supabase.ts`.
4. **Error Handling**: `try/catch` around every `await supabase...` call.

## Phase 1 UI Constraints

- **Desktop First**: Do not optimize for mobile (Phase 4).
- **No Auth**: Do not add Login/Signup screens.
- **Components**:
  - Keep components small and single-responsibility.
  - Place page-specific components in `components/<feature>/`.
  - Use `shadcn/ui` for primitives (if installed) or simple HTML/Tailwind.

## Data Fetching

- **Server Components**: Prefer fetching data in Server Components where possible.
- **Client Components**: Use `useEffect` + `useState` (Phase 1 simplicity) or SWR/React Query (if introduced later).
- **Pagination**: usage of `.range(start, end)` is mandatory for Transaction lists.
