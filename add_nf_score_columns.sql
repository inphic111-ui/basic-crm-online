-- Railway PostgreSQL 添加 N/F 評分欄位
-- 在 Railway 儀表板的 SQL 查詢界面中執行此腳本

-- 步驟 1：添加 nfvp_score_n 欄位（N 評分）
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS nfvp_score_n INTEGER DEFAULT 0;

-- 步驟 2：添加 nfvp_score_f 欄位（F 評分）
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS nfvp_score_f INTEGER DEFAULT 0;

-- 步驟 3：驗證欄位已添加
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name IN ('nfvp_score_n', 'nfvp_score_f')
ORDER BY column_name;

-- 步驟 4：檢查表結構
\d customers
