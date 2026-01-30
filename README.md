# 3m Dashboard (Phase 1 MVP)

ローカル専用で稼働するフリーランス向けの取引・証憑管理MVPです。`docker compose up` でNext.js UIとローカルDBを起動し、CSVの半自動インポートを行うためのImporterを用意しています。

## 起動手順

```bash
docker compose up --build
```

- Web UI: http://127.0.0.1:3000
- Postgres (Supabase互換): `localhost:5432`

## 停止手順

```bash
docker compose down
```

## DB初期化（ローカル）

```bash
docker compose down --volumes
docker compose up --build
```

## バックアップ / リストア

```bash
# バックアップ
docker compose exec db pg_dump -U postgres -d postgres > backup.sql

# リストア
cat backup.sql | docker compose exec -T db psql -U postgres -d postgres
```

## 運用手順（毎月）

1. CSVを `import/` に配置する
2. Importerを実行する
3. UIのTriage Queueで未判定を処理する
4. Overviewで月次の支出傾向を確認する
5. 月次で繰り返す

## CSVインポート（例）

```bash
docker compose run --rm importer \
  python import_csv.py import/card_202501.csv YOUR_PAYMENT_METHOD_ID \
  --date "利用日" \
  --amount "利用金額" \
  --description "利用店舗" \
  --url "http://localhost:54321" \
  --key "YOUR_SUPABASE_ANON_KEY"
```

## サンプルCSV例

```csv
利用日,利用金額,利用店舗
2025/01/05,1234,Amazon Web Services
2025/01/09,560,セブンイレブン 新宿店
```

## ディレクトリ構成

- `web/`: Next.js UI (Phase 1: ダッシュボード / 取引一覧 / Triage Queue)
- `supabase/`: 初期DDL
- `importer/`: CSVインポーター + fingerprint生成

## 開発者ガイド (Developer Guide)

### テストの実行 (Stage 1)
Importerのロジックテストを実行するには:

```bash
docker compose run --rm importer python -m unittest discover tests
```

### シードデータの投入 (Stage 1)
開発用にダミーデータを投入するには:

```bash
docker compose run --rm importer python ../scripts/seed_data.py
```

### トラブルシューティング

#### PAYMENT_METHOD_ID の取得方法
以下のSQLで確認してください:

```bash
docker compose exec db psql -U postgres -d postgres -c "select id, name from payment_methods;"
```

#### 環境変数の設定 (.env)
OCR機能などを使用する場合、`.env` ファイルを作成して以下を設定します:

```ini
# .env example
OCR_MONTHLY_LIMIT=1000
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

---

## 新機能 (New Features: Stage 2-4)

### Stage 2: 効率化機能

#### ベンダールール自動適用
CSVインポート時、登録済みのベンダールールに基づいて自動的にカテゴリと事業割合が設定されます。

#### 一括アクション (Batch Actions)
`/transactions` ページで複数の取引を選択し、一括で「生活」または「事業」として判定できます。

### Stage 3: 連携機能

#### Gmail連携
```bash
docker compose run --rm importer python gmail_sync.py
```
Gmail から領収書の添付ファイルを自動取得します。初回実行時に Google OAuth 認証が必要です。

#### エクスポート履歴
`/exports` ページで過去のCSVエクスポート履歴を確認できます。

### Stage 4: クラウド対応

#### RLS (Row Level Security)
`supabase/init.sql` に各テーブルのRLSポリシーを追加済み。Supabase Cloud にデプロイする際に自動的にユーザーごとのデータ分離が有効になります。

#### クラウド移行
ローカルDBをクラウドに移行する際は以下のスクリプトを使用:
```bash
python scripts/migrate_to_cloud.py
```

