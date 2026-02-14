# RLS Checklist

## Basics
- [ ] **Enabled**: `ALTER TABLE x ENABLE ROW LEVEL SECURITY;` executed?
- [ ] **Policies**: Policies defined for SELECT, INSERT, UPDATE, DELETE?
- [ ] **Default Deny**: `public` role has no implicit access?

## Common Pitfalls
- [ ] **`using (true)`**: Only for truly public data (e.g. blog posts). Never for user data.
- [ ] **`auth.uid()`**: Is it comparing against the correct column (e.g. `user_id`)?
- [ ] **Service Role**: Are you using `supabaseAdmin` only where absolutely necessary?

## Advanced
- [ ] **Views**: Do views have `security_invoker = on`?
- [ ] **Functions**: Do security definer functions have `search_path` set?
