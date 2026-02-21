# Environment Setup Guide

## Quick Start

1. **Start Supabase Local**
   ```bash
   npx supabase start
   ```
   
   This will output credentials like:
   ```
   API URL: http://127.0.0.1:54321
   anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Setup Frontend Environment**
   ```bash
   cp .env.example web/.env.local
   ```
   
   Edit `web/.env.local` and fill in:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from step 1>
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_ANON_KEY=<anon key from step 1>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key from step 1>
   ```

3. **Setup Importer Environment**
   ```bash
   cp .env.example importer/.env
   ```
   
   Edit `importer/.env` and fill in:
   ```env
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_SERVICE_ROLE_KEY=<service_role key from step 1>
   ```

4. **Start Frontend**
   ```bash
   cd web
   npm install
   npm run dev
   ```

## Security Rules

- ✅ `NEXT_PUBLIC_*` variables are safe for browser (public)
- ❌ `SUPABASE_SERVICE_ROLE_KEY` must NEVER have `NEXT_PUBLIC_` prefix
- ❌ Server-only keys (OpenAI/Gmail/Google Vision, etc.) must NOT use `NEXT_PUBLIC_`
- ✅ `.env.local` and `.env` are already in `.gitignore`
- ✅ Use `.env.example` for documentation (no real secrets)

### Client-visible environment variables

The following `NEXT_PUBLIC_` variables are referenced by the web client:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DISABLE_AUTH` (dev only)
- `NEXT_PUBLIC_DEV_LOGIN_EMAIL` (dev only)
- `NEXT_PUBLIC_DEV_LOGIN_PASSWORD` (dev only)
- `NEXT_PUBLIC_DEV_AUTO_SIGNUP` (dev only)

### Local Dev Auth + RLS (Categories / Payment Methods)

Local development uses RLS on master tables, so you must be authenticated to see data.
Use DevAutoLogin (local only) and ensure the seeded rows are owned by your dev user.

1. Enable dev auto-login in `web/.env.local`:
   ```env
   NEXT_PUBLIC_DISABLE_AUTH=true
   NEXT_PUBLIC_DEV_LOGIN_EMAIL=dev+local@example.com
   NEXT_PUBLIC_DEV_LOGIN_PASSWORD=DevPassw0rd!2345
   NEXT_PUBLIC_DEV_AUTO_SIGNUP=true
   ```
2. Open `http://localhost:3000` and confirm `DevAutoLogin` logs in.
3. Backfill owner ids in **local** Supabase Studio (`http://127.0.0.1:54323`):
   ```sql
   update expense_categories
   set user_id = (select id from auth.users order by created_at desc limit 1);

   update payment_methods
   set user_id = (select id from auth.users order by created_at desc limit 1);
   ```

Notes:
- Run the SQL **only in local**. Do not run these updates in production.
- If categories still do not show, clear LocalStorage and reload so a fresh session is used.

## Troubleshooting

**Frontend can't connect to database:**
- Check `NEXT_PUBLIC_SUPABASE_URL` matches Supabase output
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Restart `npm run dev` after changing `.env.local`

**Importer fails:**
- Check `SUPABASE_URL` matches Supabase output  
- Verify `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
- Ensure Supabase is running (`npx supabase status`)

**Database connection issues:**
- Run `npx supabase status` to check services
- Database URL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- API URL: `http://127.0.0.1:54321`
