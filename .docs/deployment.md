# デプロイメントガイド

## Vercelデプロイ手順

### 初回セットアップ

```bash
cd web
npm install -g vercel
vercel login
vercel
```

### 環境変数設定

Vercel Dashboard > Settings > Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
OCR_MONTHLY_LIMIT=100
GOOGLE_APPLICATION_CREDENTIALS=/var/task/credentials.json
```

### デプロイ

```bash
vercel --prod
```

---

## Supabase Cloudセットアップ

### プロジェクト作成

1. https://supabase.com/ でプロジェクト作成
2. リージョン: Tokyo (ap-northeast-1)
3. Database Password設定

### マイグレーション

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

---

## 自動デプロイ (CI/CD)

GitHub Actionsで自動化済み:
- `main` ブランチへのpush時に自動デプロイ
- `.github/workflows/deploy.yml` 参照

### 必要なSecrets

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`

---

## トラブルシューティング

### ビルドエラー

```
Error: Module not found
```

**対処法**: `package-lock.json` を削除して再インストール

```bash
rm package-lock.json
npm install
```

### 環境変数が反映されない

**対処法**: Vercelで環境変数を変更後、再デプロイが必要

```bash
vercel --prod --force
```
