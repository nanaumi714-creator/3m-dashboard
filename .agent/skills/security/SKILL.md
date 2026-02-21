---
name: Security Audit Skill
description: performing security audits, specifically focusing on Supabase RLS and Next.js vulnerabilities.
triggers:
  - "security check"
  - "audit rls"
  - "check permissions"
  - "find vulnerabilities"
---

# Security Audit Skill

This skill provides a focused security lens for auditing the application.

## Focus Areas
1.  **RLS Policies**: logical gaps, "true" conditions, incorrect user checks.
2.  **SSR/CSR Boundaries**: leaking of secrets to the client.
3.  **Input Validation**: gaps where raw input hits the DB or API.
4.  **Dependencies**: known vulnerabilities in `package.json`.

## RLS Checklist
- [ ] `enable row level security` is ON for all tables.
- [ ] `anon` role has minimal/no access.
- [ ] `authenticated` role can only access own data `user_id = auth.uid()`.
- [ ] No `using (true)` policies unless public static data.
