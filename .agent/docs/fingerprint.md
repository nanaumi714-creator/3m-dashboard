# Fingerprint仕様書

## 概要

3M Dashboardでは、取引の一意性を判定するために **fingerprint** （指紋）という概念を使用しています。これはSHA256ハッシュ値で、重複取引の検出と正規化ロジックの基盤となります。

---

## 1. Fingerprint生成ルール

### 1.1 基本アルゴリズム

```python
fingerprint = SHA256(
    normalize(occurred_on) + "|" +
    normalize(abs(amount_yen)) + "|" +
    normalize(description) + "|" +
    payment_method_id
)
```

### 1.2 入力フィールド

| フィールド | 説明 | 正規化 |
|-----------|------|--------|
| `occurred_on` | 取引日 | YYYY-MM-DD形式に統一 |
| `amount_yen` | 金額（絶対値） | 正の整数に変換 |
| `description` | 取引内容 | 詳細は後述 |
| `payment_method_id` | 支払い方法ID | UUID（そのまま） |

---

## 2. 正規化ロジック

### 2.1 Description正規化

取引内容（`description`）は以下のステップで正規化されます：

#### Step 1: 文字種統一
```python
# 全角 → 半角
"ＡＢＣ" → "ABC"
"１２３" → "123"

# 半角カナ → 全角カナ
"ｺﾝﾋﾞﾆ" → "コンビニ"
```

#### Step 2: 空白除去
```python
"  Amazon  Japan  " → "AmazonJapan"
```

#### Step 3: 記号除去（一部）
```python
"セブン-イレブン" → "セブンイレブン"
"株式会社ABC" → "ABC"  # 法人格除去
```

#### Step 4: 小文字統一
```python
"Amazon" → "amazon"
"LAWSON" → "lawson"
```

### 2.2 Vendor Name正規化

ベンダー名（`vendor_raw`）から `vendor_norm` を生成：

```python
def normalize_vendor(vendor_raw: str) -> str:
    # 1. 全角→半角、半角カナ→全角カナ
    # 2. 法人格除去（株式会社、有限会社、合同会社等）
    # 3. 店舗番号・支店名除去
    # 4. 記号除去
    # 5. 小文字統一
    return normalized_name
```

#### 実例

| vendor_raw | vendor_norm | 理由 |
|-----------|-------------|------|
| `ｱﾏｿﾞﾝ ｼﾞｬﾊﾟﾝ` | `amazon` | カナ→英字、全角→半角 |
| `セブン-イレブン 01234店` | `セブンイレブン` | 記号・店舗番号除去 |
| `株式会社LAWSON` | `lawson` | 法人格除去、小文字化 |
| `ファミリーマート 渋谷店` | `ファミリーマート` | 支店名除去 |

---

## 3. 重複検出

### 3.1 検出ロジック

インポート時、各行の `fingerprint` を計算し、既存の `transactions` テーブルと照合：

```sql
SELECT id FROM transactions WHERE fingerprint = ?
```

- **一致あり** → 重複とみなし、スキップ
- **一致なし** → 新規取引として挿入

### 3.2 Edge Cases

#### Case 1: 同一店舗で同日・同額の買い物
```
2024-01-15, -1000円, "セブンイレブン", カードA
2024-01-15, -1000円, "セブンイレブン", カードA
```
→ **重複と判定**（意図的に同日同額取引を区別したい場合は手動入力推奨）

#### Case 2: 異なるカードでの同一取引
```
2024-01-15, -1000円, "Amazon", カードA
2024-01-15, -1000円, "Amazon", カードB
```
→ **別取引と判定**（`payment_method_id` が異なるため）

#### Case 3: 表記ゆれ
```
"Amazon Japan" → fingerprint: abc123...
"ｱﾏｿﾞﾝ ｼﾞｬﾊﾟﾝ" → fingerprint: abc123...
```
→ **重複と判定**（正規化により同一になる）

---

## 4. 実装コード

### 4.1 fingerprint.py

```python
import hashlib
import unicodedata
import re

def normalize_text(text: str) -> str:
    \"\"\"基本的なテキスト正規化\"\"\"
    # 全角→半角（英数字）
    text = text.translate(
        str.maketrans(
            '０１２３４５６７８９ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ',
            '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
        )
    )
    
    # 半角カナ→全角カナ
    text = unicodedata.normalize('NFKC', text)
    
    # 空白除去
    text = re.sub(r'\s+', '', text)
    
    # 記号除去
    text = re.sub(r'[-_・]', '', text)
    
    # 小文字統一
    text = text.lower()
    
    return text

def normalize_vendor(vendor: str) -> str:
    \"\"\"ベンダー名の正規化\"\"\"
    # 法人格除去
    patterns = [
        r'株式会社',
        r'有限会社',
        r'合同会社',
        r'合資会社',
        r'(株)',
        r'(有)',
    ]
    for pattern in patterns:
        vendor = re.sub(pattern, '', vendor)
    
    # 店舗番号除去（例: "01234店"）
    vendor = re.sub(r'\d{4,}店', '', vendor)
    vendor = re.sub(r'[0-9]{2,}号店', '', vendor)
    
    # 支店名除去
    vendor = re.sub(r'[^\s]+支店', '', vendor)
    vendor = re.sub(r'[^\s]+店', '', vendor)
    
    return normalize_text(vendor)

def generate_fingerprint(
    occurred_on: str,
    amount_yen: int,
    description: str,
    payment_method_id: str
) -> str:
    \"\"\"取引のfingerprint生成\"\"\"
    components = [
        occurred_on,
        str(abs(amount_yen)),
        normalize_text(description),
        payment_method_id
    ]
    
    raw = '|'.join(components)
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()
```

---

## 5. ベストプラクティス

### 5.1 正規化の限界を理解する

正規化は完璧ではありません。以下のケースでは手動判定が必要です：

- 同一店舗の異なる支店（例: "東京駅店" vs "渋谷店"）
- 微妙な表記ゆれ（例: "Amazon" vs "Amazonマーケットプレイス"）

### 5.2 Vendor Aliasの活用

複雑な表記ゆれは `vendor_aliases` テーブルで管理：

```sql
INSERT INTO vendor_aliases (vendor_id, alias)
VALUES 
  ('uuid-amazon', 'ｱﾏｿﾞﾝ'),
  ('uuid-amazon', 'Amazon Japan'),
  ('uuid-amazon', 'Amazonマーケットプレイス');
```

### 5.3 重複を意図的に許可したい場合

同日同額の取引を区別したい場合は、`description` に識別子を追加：

```csv
2024-01-15,-1000,セブンイレブン (朝),card-a
2024-01-15,-1000,セブンイレブン (夜),card-a
```

---

## 6. トラブルシューティング

### 問題: 重複でないのに「Duplicate」と判定される

**原因**: 正規化後の値が同一になっている

**対処法**:
1. `description` を確認し、区別できる情報を追加
2. 手動で1件を削除後、再インポート

### 問題: 重複なのに「別取引」と判定される

**原因**: `payment_method_id` または日付が異なる

**対処法**:
1. CSVの `occurred_on` 形式を確認（YYYY-MM-DD）
2. `payment_method_id` が正しいか確認

---

## 参考リンク

- [CSV仕様書](./csv_spec.md)
- [ベンダー管理ガイド](./vendor_management.md)
- 実装コード: [`importer/fingerprint.py`](../importer/fingerprint.py)
