/**
 * ベンダー名を正規化します。
 * 30文字以内で切り出し、NFKC正規化を行い、記号や空白を除去して小文字化します。
 */
export function normalizeVendor(raw: string): string {
    return raw
        .slice(0, 30)
        .normalize("NFKC")
        .replace(/[\s\p{P}\p{S}]/gu, "")
        .toLowerCase();
}

/**
 * SHA-256 ハッシュを計算して 16進数文字列で返します。
 * ブラウザの Crypto API を使用するため非同期関数です。
 */
export async function sha256(value: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * 日付文字列 (YYYY/MM/DD) を ISO形式 (YYYY-MM-DD) に変換します。
 * 形式が正しくない場合は null を返します。
 */
export function formatDate(value: string): string | null {
    const trimmed = value.trim();
    if (!/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
        return null;
    }
    const [year, month, day] = trimmed.split("/");
    return `${year}-${month}-${day}`;
}
