# fingerprint / vendor_norm 仕様（Phase 1）

## vendor_norm の正規化ルール

vendor_norm は重複検知のために vendor_raw から生成します。

1. vendor_raw の先頭30文字を抽出
2. 全角→半角変換（Unicode NFKC）
3. 記号・空白を除去
4. 小文字化

## vendor_raw の扱い

- vendor_raw は CSV の摘要/利用店舗列の値をそのまま保存します

## fingerprint の生成

以下の材料を `|` で連結し、SHA256 を計算します。

- occurred_on（取引日, `YYYY-MM-DD`）
- amount_yen（金額）
- payment_method_id（支払い手段）
- vendor_norm
- source_type（例: `csv`）

この fingerprint を `transactions.fingerprint` に保存し、重複検知に利用します。
