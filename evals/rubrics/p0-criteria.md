# P0 Criteria Rubric

A finding is **P0 (Critical)** if it matches any of the following:

1.  **Money / Data Integrity**
    - Uses floating point arithmetic for currency.
    - Performs rounding on the client side.
    - Uses `Decimal` type without DB support confirmation.
    - Updates are not idempotent (where required).

2.  **Security**
    - Bypasses RLS (e.g. `supabaseAdmin` in user flow).
    - Client-side filtering of sensitive data.
    - Missing `zod` validation on API inputs.
    - Exposed secrets.

3.  **Authentication**
    - Missing `auth.uid()` check in RLS policies.
    - Allow anonymous access to protected resources.
