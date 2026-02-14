# Phase 1: MVP（最小機能・ローカル運用・課金ゼロ）

## 要件

### 目的
- **課金ゼロ**でフリーランスの金銭管理を実現
- **自分の目でお金の流れを把握**できることを第一目的とする
- 将来的に**必要なら手動で確定申告に使える粒度**のデータを保持する

### スコープ

#### 1. 実行環境・制約
- **ローカルでのみ動作**（PC稼働時のみ閲覧可能）
- 環境は**再現性のある手順で起動・停止**できること
- **課金ゼロ前提**（Supabase Cloud、Vercel、OCR API等は使用しない）
- 通貨は**円（JPY）固定**。外貨は扱わない

#### 2. 技術構成
- フロント：**Next.js（ダッシュボードWeb画面）**
- DB：**Supabase Local（Docker経由）**
- Storage：**Supabase Local Storage**
- インポート処理：**Python CLI（Importer）**
- 起動管理：**固定手順（README記載）**、将来的にMakefile化は任意
- ローカル限定アクセス：Web UIは**127.0.0.1にバインド**する

#### 3. 取り込み（入力経路）
- **Phase 1では1種類のカード明細CSVのみ対応**
  - 対応フォーマット例：三井住友カード、楽天カード等（実装時に1つ選定）
  - 列マッピング（日付、金額、摘要）が明確に定義されている
- 半自動取り込み方式（ファイル配置 → CLI実行 → 自動整形・登録）

#### 4. データ管理（DB設計）
Phase 1で作成するテーブル:
- `payment_methods` - 支払い手段マスタ
- `import_sources` - インポート履歴（追跡性）
- `transactions` - 取引本体（円、支出は負／収入は正）
- `transaction_business_info` - 経費判定（別テーブルで監査可能に）
- `receipts` - 証憑（Phase 1では最小実装）

設計原則:
- 経費判定は `transaction_business_info` の存在で管理（nullable地獄回避）
- 追跡性のため `import_sources` にインポート単位の情報を保持
- 重複排除のため `transactions.fingerprint` を保持
- 同一インポートの同一行を二重登録しない制約

#### 5. 取引の重複検出
fingerprint生成材料（SHA256でハッシュ化）:
- occurred_on（取引日）
- amount_yen（金額）
- payment_method_id（支払い手段）
- vendor_norm または description正規化値
- source_type

運用方針:
- fingerprintは**ユニーク制約にしない**（同日同額等の誤判定を避ける）
- 手動マージ用に `duplicate_group_id` を保持
- **Phase 1では重複候補カウント表示まで**（候補一覧UIはPhase 2）

#### 6. 可視化（ダッシュボード）
最低限の閲覧・判断ができる画面:
- **Transactions一覧**（検索・フィルタ・ページング必須）
- **Triage Queue**（未判定の経費判定を処理）
- **月次集計ダッシュボード**

主要な可視化観点:
- 月次の収入／支出（支出中心でOK）
- 事業支出（按分適用後）
- 支払い手段別の支出傾向
- 未判定件数

#### 7. 証憑管理（Phase 1段階的実装）
- **Phase 1最小**：receiptsテーブルへのレコード登録、storage_url表示
- **Phase 1完成**：Web UIからのアップロード、Supabase Local Storageへの保存

#### 8. 非機能要件
- **冪等性**：同じCSVを複数回インポートしてもDBが壊れない
- **パフォーマンス**：3ヶ月分（100-150件）で実用速度（ページング実装）
- **バックアップ**：DBバックアップ/リストア手順がREADMEに記載

---

## 受け入れ基準

### 環境・起動
- [ ] Supabase（ローカル）が起動しDB接続できる（`supabase start`）
- [ ] Next.js UIがローカルで閲覧できる（`http://127.0.0.1:3000`）
- [ ] UIが外部公開されない（127.0.0.1バインド）
- [ ] DBデータがコンテナ再起動後も保持される（Supabaseの永続化を確認）
- [ ] 起動/停止/DB初期化の手順がREADMEに記載されている

### DB・スキーマ
- [ ] Phase 1のテーブルが作成される（`payment_methods`, `import_sources`, `transactions`, `transaction_business_info`, `receipts`）
- [ ] `transactions.amount_yen` はBIGINT型で保持される
- [ ] `transactions.updated_at` が更新時に自動更新される（トリガで実装）
- [ ] `(import_source_id, source_row_number)` の部分ユニーク制約が機能する
- [ ] `transaction_business_info` を削除すると取引判定が未判定に戻る
- [ ] `amount_yen <> 0` のCHECK制約が機能する
- [ ] `fingerprint` の空文字禁止制約が機能する

### 取引登録・重複検出
- [ ] 手動で取引を1件登録でき、一覧に表示される
- [ ] CSV経由で取引を登録でき、一覧に表示される
- [ ] fingerprintが自動生成される
- [ ] インポート時に重複候補件数がCLI出力される
- [ ] `duplicate_group_id` を付与して取引を手動でグルーピングできる
- [ ] 同一インポートの同一行番号を再度インポートしようとすると安全にスキップされる
- [ ] 同じCSVを再実行してもDBが壊れない（冪等性）

### 証憑（段階的実装）

**Phase 1最小（Week 4まで）**:
- [ ] receiptsテーブルにレコードを登録できる（SQL直接でOK）
- [ ] storage_urlに外部URL（Google Drive等）または仮のパスを登録できる
- [ ] 取引詳細でstorage_urlを表示し、リンクを開ける

**Phase 1完成（Week 5-6：推奨）**:
- [ ] Web UIからファイルをアップロードできる
- [ ] アップロードしたファイルがSupabase Local Storageに保存される
- [ ] storage_urlに署名URLまたはローカルパスが自動設定される
- [ ] 取引詳細から証憑を閲覧できる

### ダッシュボード（UI）
- [ ] Transactions一覧で以下のフィルタができる:
  - [ ] 期間フィルタ（開始日〜終了日）
  - [ ] 支払い手段フィルタ
  - [ ] 未判定フィルタ（経費判定が未実施の取引のみ表示）
- [ ] Transactions一覧で検索ができる（description, vendor_raw）
- [ ] Transactions一覧に**ページング**が実装されている（50件/ページ推奨）
- [ ] 未判定取引（`transaction_business_info` が存在しない取引）を抽出できる
- [ ] Triage Queueで未判定取引に対して以下を登録できる:
  - [ ] `is_business`（事業/生活のトグル）
  - [ ] `business_ratio`（0-100のスライダーまたは入力欄）
  - [ ] `audit_note`（任意のメモ）
- [ ] 月次集計が表示される:
  - [ ] 支出合計（カード支出中心でOK）
  - [ ] 事業支出（按分適用後）
  - [ ] 支払い手段別支出
- [ ] 未判定件数が表示される

### インポート機能
- [ ] Python ImporterでCLIから1種類のカード明細CSVを取り込める
- [ ] 対応CSVフォーマットの例（ヘッダ・サンプル行）が `docs/csv_spec.md` に記載されている
- [ ] 想定外の列/文字コード/日付形式の場合、Importerは分かりやすいエラーを出す
- [ ] CSVファイルのchecksumが計算され、同一ファイルの再インポートが安全にスキップされる
- [ ] インポート時にvendor_normが自動生成される（全角→半角、記号除去、小文字化）
- [ ] インポート時にfingerprintが自動生成される
- [ ] インポート結果（成功件数、スキップ件数、重複候補件数、エラー件数）がCLI出力される
- [ ] Importerは**冪等**（同じCSVを何回流してもDBが壊れない）

### 運用
- [ ] 取り込みは「CSVを配置→CLI実行」の手順で実行できる
- [ ] 1ヶ月分の運用で回ることが確認できる（30-50件）
- [ ] README.mdに以下が記載されている:
  - [ ] 環境構築手順
  - [ ] 起動/停止手順
  - [ ] DB初期化手順
  - [ ] インポート手順
  - [ ] バックアップ/リストア手順
- [ ] `docs/csv_spec.md` に対応CSVフォーマットが記載されている
- [ ] `docs/fingerprint.md` にvendor_norm正規化ルールとfingerprint生成ルールが記載されている

### 非必須（Phase 1では実装しない）
- [ ] `make up/down` の統合（固定手順でOK）
- [ ] 収入UI・差額の厳密化（支出中心で成立）
- [ ] グラフ表示（数値表示で十分）
- [ ] 5,000件のパフォーマンステスト（3ヶ月分で十分）
