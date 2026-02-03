# Deployment Guide (Phase 4)

This project is now in Phase 4. Cloud deployment is supported and recommended.

## Architecture

- Frontend: Vercel (Next.js App Router)
- Backend: Supabase Cloud (PostgreSQL + Auth + Storage)
- Optional: Vercel Cron for scheduled jobs (Gmail sync, backups)

## 1. Supabase Cloud Setup

1. Create a Supabase project.
2. Choose region (Tokyo `ap-northeast-1` recommended).
3. Note these values from the Supabase dashboard: Project URL, Anon public key, Service role key.
4. Apply schema. If using local migrations: `supabase link` then `supabase db push`. If migrating from local: use `.docs/migration.md` or `scripts/enhanced_migration.py`.

## 2. Vercel Setup

### Install and link

```bash
cd web
npm install -g vercel
vercel login
vercel
```

### Environment variables (Vercel Dashboard)

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `OCR_MONTHLY_LIMIT`
- `GOOGLE_VISION_API_KEY`
- `GOOGLE_APPLICATION_CREDENTIALS` (if using a JSON file in runtime)
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`

### Deploy

```bash
vercel --prod
```

## 3. Cron Jobs (Optional)

If you want scheduled jobs:

- `web/app/api/cron/backup/route.ts`
- `web/app/api/cron/gmail-sync/route.ts`

Configure `vercel.json` or the Vercel dashboard cron schedule.

## 4. Post-Deploy Checks

- Verify login works (Supabase Auth).
- Verify RLS policies are enabled and correct.
- Test uploads (Supabase Storage).
- Run a simple query from the UI to ensure connectivity.

## CI/CD (Optional)

If using GitHub Actions, ensure these secrets exist:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
