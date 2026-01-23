# Phase 1: MVP（最小機能・ローカル運用）

## 1. 目的
- フリーランスとしての金銭管理・証憑管理を、**低コスト（ツール課金なし）**かつ**継続可能**な運用で実現する。
- 会計申告（自動申告/自動書類作成）は行わず、**自分の目でお金の流れを把握**できることを第一目的とする。
- 将来的に**必要なら手動で確定申告に使える粒度**のデータを保持する。

## 2. スコープ

### 2.1 実行環境・制約
- 初期は**ローカルでのみ動作**すること（PC稼働時のみ閲覧可能）。
- 環境は**Dockerで管理**し、再現性のある起動・停止ができること。
- 公開運用（Vercel等）は将来検討とし、Phase 1では必須としない。
- 通貨は**円（JPY）固定**。外貨は扱わない。

### 2.2 技術構成
- フロント：**Next.js（ダッシュボードWeb画面）**
- DB/Auth/Storage：**Supabase（ローカル）**
- インポート処理：**Python（Importer）**
- 起動管理：**Docker Compose**（Next.js、Supabase、Importerを管理）
- ローカル限定アクセス：Web UIは**127.0.0.1にバインド**する。

### 2.3 取り込み（入力経路）
- **Phase 1では1種類のカード明細CSVのみ対応**。
- 半自動取り込み方式（ファイル配置/アップロード → 自動整形・登録）。

### 2.4 データ管理（DB設計）
作成するテーブル:
- `payment_methods` - 支払い手段マスタ
- `import_sources` - インポート履歴（追跡性）
- `transactions` - 取引本体（円、支出は負／収入は正）
- `transaction_business_info` - 経費判定（別テーブルで監査可能に）
- `receipts` - 証憑（将来OCR対応）

### 2.5 取引の重複検出
fingerprint生成材料（SHA256でハッシュ化）:
- occurred_on（取引日）
- amount_yen（金額）
- payment_method_id（支払い手段）
- vendor_norm または description正規化値
- source_type

## 3. 受け入れ基準

### 3.1 環境・起動
- [ ] `docker compose up` で環境が起動できる。
- [ ] Supabase（ローカル）が起動し、DBに接続できる。
- [ ] Web UIは `http://127.0.0.1:3000` でのみアクセス可能。
- [ ] データはコンテナ再起動後も保持される（永続化ボリューム設定済み）。

### 3.2 DB・スキーマ
- [ ] Phase 1のテーブルが作成される。
- [ ] `transactions.amount_yen` はBIGINT型で保持される。
- [ ] `transactions.updated_at` が更新時に自動更新される。
- [ ] `(import_source_id, source_row_number)` の部分ユニーク制約が機能する。

### 3.3 取引登録・重複検出
- [ ] 手動およびCSV経由で取引を登録でき、一覧に表示される。
- [ ] fingerprintが自動生成され、重複候補として検知される。
- [ ] `duplicate_group_id` を付与して取引を手動でグルーピングできる。

### 3.4 証憑（レシート/領収書）
- [ ] receiptsを取引に紐付けて登録できる。
- [ ] 取引詳細から証憑URLを開ける。

### 3.5 ダッシュボード（UI）
- [ ] Transactions一覧でフィルタ（期間、支払い手段、未判定）と検索ができる。
- [ ] Triage Queueで未判定取引に対して `is_business`, `business_ratio`, `audit_note` を登録できる。
- [ ] 月次集計（収入、支出、差額、事業支出）および未判定件数が表示される。
