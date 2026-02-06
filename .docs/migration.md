# クラウド移行ガイド

## 概要

ローカルDockerで動作している3M DashboardをSupabase Cloud + Vercelに移行する手順。

---

## 前提条件

- Supabase Cloudプロジェクト作成済み
- Vercelアカウント作成済み
- ローカルでデータが正常に動作している

---

## Phase 1: データ整合性チェック

### 1. バックアップ作成

```bash
python scripts/migrate_to_cloud.py
```

これにより `dump_YYYYMMDD_HHMMSS.sql` が生成されます。

### 2. データ検証

```bash
python scripts/data_validation.py
```

エラーがある場合は修正してから進めてください。

---

## Phase 2: Supabase Cloudセットアップ

### 1. プロジェクト作成

1. https://supabase.com/ にログイン
2. 「New Project」をクリック
3. プロジェクト名: `3m-dashboard`
4. リージョン: `Tokyo (ap-northeast-1)`
5. Database Password: 強力なパスワードを設定

### 2. 環境変数取得

Settings > API から以下を取得:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. スキーマ投入

```bash
# Supabase CLIをインストール
npm install -g supabase

# プロジェクトにリンク
supabase link --project-ref YOUR_PROJECT_REF

# マイグレーション実行
supabase db push
```

### 4. データインポート

```bash
# ローカルのダンプをインポート
psql -h db.YOUR_PROJECT_REF.supabase.co \
  -U postgres \
  -d postgres \
  -f dump_YYYYMMDD_HHMMSS.sql
```

パスワード入力時は、Supabaseプロジェクト作成時のDatabase Passwordを使用。

---

## Phase 3: Vercelデプロイ

### 1. プロジェクト作成

```bash
cd web
npm install -g vercel
vercel login
vercel
```

指示に従ってプロジェクトを作成。

### 2. 環境変数設定

Vercel Dashboard > Settings > Environment Variables で設定:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OCR_MONTHLY_LIMIT=100
GOOGLE_APPLICATION_CREDENTIALS=/var/task/credentials.json
```

### 3. デプロイ

```bash
vercel --prod
```

---

## Phase 4: 動作確認

### 1. 基本機能テスト

- [ ] ログイン/ログアウト
- [ ] トランザクション一覧表示
- [ ] CSV インポート
- [ ] カテゴリ管理
- [ ] ベンダー管理
- [ ] レシート アップロード
- [ ] 月次レポート表示

### 2. RLSテスト

複数ユーザーでログインし、データが分離されていることを確認:

```sql
-- ユーザー1で取引作成
INSERT INTO transactions (...) VALUES (...);

-- ユーザー2で確認（見えないはず）
SELECT * FROM transactions WHERE id = ...;
```

### 3. パフォーマンステスト

- 100件のトランザクション表示
- 検索機能
- フィルタリング

---

## Phase 5: 移行完了

### 1. ローカル→クラウド切り替え

`web/.env.local` を更新:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 2. Dockerコンテナ停止

```bash
docker compose down
```

### 3. モニタリング設定

- Supabase Dashboard > Reports で使用状況確認
- Vercel Analytics で パフォーマンス確認

---

## トラブルシューティング

### データインポートエラー

```
ERROR:  relation "transactions" already exists
```

**対処法**: Supabaseで既存テーブルを削除してから再実行

```sql
DROP TABLE IF EXISTS transactions CASCADE;
```

### RLSポリシーエラー

```
new row violates row-level security policy
```

**対処法**: `user_id` カラムが正しく設定されているか確認

```sql
SELECT * FROM transactions WHERE user_id IS NULL;
```

NULLがあれば更新:

```sql
UPDATE transactions SET user_id = auth.uid() WHERE user_id IS NULL;
```

---

## ロールバック手順

問題が発生した場合:

1. Vercelデプロイをprevious versionに戻す
2. ローカルDocker再起動: `docker compose up -d`
3. `.env.local` をローカル設定に戻す

---

## 参考資料

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Vercel公式ドキュメント](https://vercel.com/docs)
- [Next.js + Supabase統合ガイド](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
