# トラブルシューティングガイド

## データベース関連

### 問題: CSVインポートで重複エラー

```
Error: duplicate key value violates unique constraint
```

**原因**: 同じfingerprintの取引が既存

**対処法**:
```bash
# 重複確認
SELECT fingerprint, COUNT(*) 
FROM transactions 
GROUP BY fingerprint 
HAVING COUNT(*) > 1;

# 重複削除（慎重に！）
DELETE FROM transactions 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM transactions 
  GROUP BY fingerprint
);
```

---

### 問題: payment_method_idエラー

```
Error: insert or update on table "transactions" violates foreign key constraint
```

**原因**: 無効な `payment_method_id`

**対処法**:
```sql
-- 有効なIDを確認
SELECT id, name FROM payment_methods WHERE is_active = true;

-- README.mdの「Payment Method IDの取得」参照
```

---

## 認証関連

### 問題: ログインできない

**対処法**:
1. Supabase Dashboard > Authentication > Users で確認
2. メール認証リンクを再送信
3. パスワードリセット

### 問題: セッションが切れる

**原因**: トークンの有効期限切れ

**対処法**: 自動リフレッシュ実装（`/web/lib/session.ts`）

---

## OCR関連

### 問題: 月次上限エラー

```
Error: Monthly OCR limit exceeded
```

**対処法**:
- `OCR_MONTHLY_LIMIT` 環境変数を増やす
- または翌月まで待つ
- または手動入力に切り替える

### 問題: OCR精度が低い

**対処法**:
1. 画像を高解像度で撮影
2. 照明を改善
3. レシートを平らにする

---

## デプロイ関連

### 問題: Vercelビルドエラー

```
Error: Module not found
```

**対処法**:
```bash
# 依存関係を再インストール
cd web
rm -rf node_modules package-lock.json
npm install
```

### 問題: 環境変数が反映されない

**対処法**:
1. Vercel Dashboard > Settings > Environment Variables 確認
2. Production環境にも設定されているか確認
3. 再デプロイ: `vercel --prod --force`

---

## パフォーマンス

### 問題: ページ読み込みが遅い

**対処法**:
1. Vercel Analytics で確認
2. 画像を最適化（WebP形式）
3. 不要なデータフェッチを削減

### 問題: データベースクエリが遅い

**対処法**:
```sql
-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_transactions_occurred_on 
ON transactions(occurred_on);

CREATE INDEX IF NOT EXISTS idx_transactions_payment_method 
ON transactions(payment_method_id);
```

---

## よくある質問 (FAQ)

### Q: CSVの日付フォーマットは？

A: `YYYY-MM-DD` 形式。例: `2024-01-15`

### Q: 現金取引はどう記録？

A: `/transactions/cash` から手動入力

### Q: ベンダー自動判定されない

A: `vendor_aliases` テーブルに表記ゆれを登録

### Q: 月次レポートの出力形式は？

A: CSV, Excel, PDF に対応

---

## サポート

問題が解決しない場合:
1. GitHub Issues で報告
2. `README.md` の関連セクション参照
3. `.docs/` 配下のドキュメント確認
