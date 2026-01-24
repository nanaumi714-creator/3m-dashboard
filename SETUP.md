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
- ✅ `.env.local` and `.env` are already in `.gitignore`
- ✅ Use `.env.example` for documentation (no real secrets)

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