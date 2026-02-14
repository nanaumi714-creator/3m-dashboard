# Example: Good Review

## 🔍 Review Summary
The code is generally solid, but there is a critical security flaw in the `updateUser` function where RLS is bypassed.

## 🚨 Critical Issues (P0)
- [ ] **[Security]**: The `updateUser` function uses `supabaseAdmin` client which bypasses RLS. Use the authenticated client instead.

## ✅ Good Points
- Good use of Zod for validation.
- Clear variable naming.
