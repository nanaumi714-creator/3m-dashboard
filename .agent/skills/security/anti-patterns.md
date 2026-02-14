# Security Anti-Patterns

## 1. Client-Side filtering
**Bad**: Fetching all data and filtering in JS `data.filter(u => u.id === user.id)`.
**Good**: Filtering in the DB query `supabase.from('x').select('*').eq('id', user.id)`.

## 2. Leaking Secrets
**Bad**: `NEXT_PUBLIC_API_KEY` for sensitive keys.
**Good**: `API_KEY` (server-only) or separate `NEXT_PUBLIC_` for truly public keys (like Supabase Anon Key).

## 3. Trusting Client Input
**Bad**: `db.update(req.body)`.
**Good**: `db.update(schema.parse(req.body))`.
