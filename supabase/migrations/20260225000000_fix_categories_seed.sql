-- Fix category seed data after encoding issues in previous migration
-- Re-upsert correct names/descriptions to ensure UI shows expected categories

INSERT INTO expense_categories (name, description) VALUES
  -- Common / Private
  ('食費', '日々の飲食代、食料品購入など'),
  ('日用品', '生活雑貨、消耗品、ドラッグストアでの購入など'),
  ('交際費', '慶弔費、プレゼント、仕事以外での会食など（事業用は別途判定）'),
  ('住居費', '家賃、管理費、住宅ローン支払いなど'),
  ('水道光熱費', '電気、ガス、水道料金'),
  ('美容・衣服', '散髪、衣服、靴、アクセサリーなど'),
  ('娯楽・レジャー', '映画、旅行、趣味、レジャー活動など'),
  ('医療・保険', '通院、医薬品、生命保険、健康診断など'),
  ('教育・教養', '書籍、新聞、習い事、セミナーなど'),
  -- Business Specific / Professional
  ('事務用品費', '文房具、コピー用紙、事務用備品など（事業用）'),
  ('消耗品費', '10万円未満のパソコン周辺機器、備品など（事業用）'),
  ('広告宣伝費', '広告、名刺、サイト作成費用など'),
  ('支払手数料', '振込手数料、各種サービスの利用手数料、システム利用料など'),
  ('旅費交通費', '出張、仕事での交通手段利用など（事業用）'),
  ('会議費', '仕事に関連する打ち合わせ、茶菓子代など'),
  -- General
  ('その他', '上記に該当しない支出')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

COMMENT ON TABLE expense_categories IS '支出カテゴリ: 事業用（経費）とプライベート（生活費）の両方で利用。';
