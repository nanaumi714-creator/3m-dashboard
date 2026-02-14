# Code Review Checklist

## Security (P0)
- [ ] **RLS**: Is `row level security` enabled? Are policies strict?
- [ ] **Auth**: Is the user authenticated (`auth.uid()`)?
- [ ] **Validation**: Are all inputs validated with Zod?
- [ ] **Injection**: Are SQL/HTML injection vectors blocked?

## Domain Logic (P0)
- [ ] **Money**: Is JPY stored as Integer? Is rounding server-side?
- [ ] **Idempotency**: Can this action be safely repeated?

## Performance (P1)
- [ ] **Database**: Are indexes used? No `select *`?
- [ ] **React**: Are useMemo/useCallback used appropriately?
- [ ] **Image**: Are images optimized (next/image)?

## Maintainability (P2)
- [ ] **Types**: No `any`? Are types shared?
- [ ] **Naming**: consistent with `10-coding-rules.md`?
- [ ] **Tests**: Are tests added/updated?
