---
name: Performance Audit Skill
description: Analyzes the application for performance bottlenecks in Next.js and Supabase.
triggers:
  - "check performance"
  - "optimize"
  - "slow loading"
  - "audit speed"
---

# Performance Audit Skill

This skill focuses on identifying and fixing performance issues.

## Focus Areas
1.  **Render Cycles**: unnecessary re-renders in React.
2.  **Bundle Size**: large imports, lack of code splitting.
3.  **Data Fetching**: waterfalls, requesting too much data (`select *`).
4.  **Images**: Missing `width/height`, layout shift (CLS).
5.  **Database**: Missing indexes on foreign keys and frequently queried columns.

## Tools
- `Lighthouse` (conceptual check)
- bundle-analyzer
- Supabase Query Performance (explain analyze)
