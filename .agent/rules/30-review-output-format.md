# Code Review Output Format

When asked to review code, use the following structure:

## 🔍 Review Summary
[Brief 2-3 line summary of the overall quality and safety.]

## 🚨 Critical Issues (P0)
**Must fix before merge.**
- [ ] **[Security]**: RLS bypass, Unvalidated input, Secret exposure.
- [ ] **[Logic]**: Floating point money math, Incorrect rounding, Idempotency failure.
- [ ] **[Identity]**: Auth bypass.

## ⚠️ Important Issues (P1)
**Strongly recommended to fix.**
- [ ] **[Performance]**: N+1 queries, Large bundle size, Missing indexes.
- [ ] **[Maintainability]**: Duplicate code, Lack of types (`any`), Hardcoded values.
- [ ] **[UX]**: Missing loading states, Poor error messages.

## 💡 Suggestions (P2)
**Nitpicks and polish.**
- [ ] **[Style]**: Naming convention violations, Comment clarity.
- [ ] **[Optimization]**: Minor re-render optimizations.

## ✅ Good Points
- Point 1
- Point 2
