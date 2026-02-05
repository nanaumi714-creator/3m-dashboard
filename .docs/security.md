# セキュリティ設定ガイド

## RLS (Row Level Security)

### 有効なテーブル

- `transactions`
- `vendors`
- `expense_categories`
- `receipts`
- `export_history`
- `transaction_business_info`

### ポリシー確認

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

---

## 認証設定

### Supabase Auth

`/web/middleware.ts` でセッション管理実装済み。

### パスワードポリシー

Supabase Dashboard > Authentication > Policies:
- 最小文字数: 8
- 大文字・小文字・数字必須

---

## 環境変数管理

### 命名規則 (公開/非公開)

- `NEXT_PUBLIC_` が付く変数のみブラウザへ公開されます。
- サーバー専用キー（OpenAI/Gmail/Google Vision など）は **必ず** `NEXT_PUBLIC_` を付けません。

### 機密情報

以下は `.env.local` で管理（Git管理外）:
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `GOOGLE_VISION_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `GMAIL_CREDENTIALS_PATH`
- `GOOGLE_CREDENTIALS`

### 公開可能

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DISABLE_AUTH` (開発用)
- `NEXT_PUBLIC_DEV_LOGIN_EMAIL` (開発用)
- `NEXT_PUBLIC_DEV_LOGIN_PASSWORD` (開発用)
- `NEXT_PUBLIC_DEV_AUTO_SIGNUP` (開発用)

---

## API キー保護

### レート制限

Vercel Edge Middleware で実装推奨:

```typescript
export async function middleware(request: NextRequest) {
  // Rate limiting logic
}
```

### OCR月次上限

`OCR_MONTHLY_LIMIT` 環境変数で制御。

---

## データバックアップ

### 自動バックアップ

Supabase Cloud: 自動で毎日バックアップ（7日間保持）

### 手動バックアップ

```bash
python scripts/migrate_to_cloud.py
```

---

## セキュリティチェックリスト

- [ ] RLSポリシーが全テーブルで有効
- [ ] Service Role Keyが安全に管理されている
- [ ] HTTPS強制設定
- [ ] CORS設定が適切
- [ ] APIレート制限実装
- [ ] 定期バックアップ設定
