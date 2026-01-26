# Phase 3 実装プラン（Advanced Management）

## 目的
Phase 3 では OCR を基盤にして、エクスポートと高度検索を「使える状態」に仕上げる。  
Gmail 同期はローカル運用の制約が大きいため Phase 4 に延期する。

---

## 方針（重要な前提）
- **OCR は最優先**: 後続機能（検索/エクスポート）の土台になるため先行実装。
- **OCR Provider は Google Vision API のみ**: Phase 3 での二重実装は避ける。
- **Gmail 同期は Phase 4 へ延期**: ローカル OAuth の UX/安全性が厳しいため。
- **日本語検索は pg_bigm を採用**: PostgreSQL 標準全文検索では日本語に弱いため。
- **コスト管理は DB で月次カウンター**: API のリアルタイム課金連携は Phase 4 で検討。

---

## 実装順序（依存関係に基づく）

### 3a: OCR 基盤（Week 1-2）
**目的**: 画像/PDF を OCR して `ocr_text` を保存し、後続機能の土台を作る。  
**主な作業**:
- Google Vision API 連携
- OCR 失敗時の手動確認フロー（再実行/手動入力）
- OCR 使用量ログ（後述のコスト管理で使用）
- 画像/PDF からの抽出結果（店名/日付/金額）を補助情報として保存

**受け入れ条件**:
- [ ] 画像アップロード → OCR → `ocr_text` 保存が成功する
- [ ] OCR 失敗時に UI で明確なエラー表示
- [ ] OCR の再実行ができる

---

### 3b: エクスポート（Week 3-4）
**目的**: OCR 結果を含む出力が可能な状態にする。  
**主な作業**:
- CSV 出力（選択列・フィルタ対応）
- Excel 出力（サマリシート付き）
- エクスポート履歴を記録
- テンプレート保存（列/フィルタ設定）

**受け入れ条件**:
- [ ] OCR 結果を含むエクスポートが可能
- [ ] `export_history` に必ず記録される
- [ ] テンプレートを再利用できる

---

### 3c: 高度検索 + 保存検索（Week 5-6）
**目的**: OCR を含む日本語検索とフィルタの組み合わせを提供する。  
**主な作業**:
- `pg_bigm` 拡張の導入
- 対象カラム: `description`, `vendor_raw`, `ocr_text`
- フィルタ: 日付範囲 / 金額範囲 / カテゴリ / 判定状態
- 検索条件の保存（`saved_searches`）

**受け入れ条件**:
- [ ] 日本語検索で実用的なヒットが得られる
- [ ] 主要フィルタを複合指定できる
- [ ] 保存検索を 1-click で再実行できる

---

### 3d: QA + ドキュメント（Week 7-8）
**目的**: 安定運用とコスト管理の確立。  
**主な作業**:
- OCR の月次上限運用（UI 停止/表示）
- エクスポートと検索の回帰テスト
- `ai/DB.md` / `ai/ARCHITECTURE.md` 更新

---

## Gmail 同期（Phase 4 に延期）
- ローカル OAuth は UX とセキュリティが厳しいため Phase 4 で実施。
- Phase 3 では「手動で PDF をアップロード → OCR」までを運用範囲とする。

---

## 新規テーブル設計（ドラフト）

### export_templates
- `id` uuid PK
- `name` text
- `format` text (`csv` / `excel`)
- `columns` jsonb（出力列定義）
- `filters` jsonb（デフォルト条件）
- `created_at` timestamptz

### export_history
- `id` uuid PK
- `template_id` uuid FK → export_templates
- `format` text
- `filters` jsonb
- `row_count` int
- `created_at` timestamptz

### saved_searches
- `id` uuid PK
- `name` text
- `query` text（全文検索文字列）
- `filters` jsonb（複合条件）
- `created_at` timestamptz

### ocr_usage_logs
- `id` uuid PK
- `request_at` timestamptz
- `pages` int（API 課金単位用）
- `status` text（success/failed）

---

## コスト管理（現実的な実装）
- `ocr_usage_logs` で月次使用量を集計
- OCR 実行前に当月上限を確認
- 上限到達時は UI で OCR を無効化しメッセージ表示
- 翌月 1 日に自動リセット（バッチ処理）

---

## Phase 3 完了条件（最終）
- [ ] OCR が安定して `ocr_text` を保存できる
- [ ] OCR 結果を含むエクスポートが可能
- [ ] 日本語全文検索 + 保存検索が使える
- [ ] OCR 月次上限の制御が機能する
- [ ] ドキュメント更新（DB/Architecture/Phase）
