-- Railway PostgreSQL 數據庫遷移腳本
-- 用於添加缺失的欄位到 customers 表

-- 檢查並添加 annual_consumption 欄位（如果不存在）
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS annual_consumption NUMERIC(12, 2) DEFAULT 0;

-- 檢查並添加 nfvp_score_n 欄位（如果不存在）
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS nfvp_score_n INTEGER DEFAULT 0;

-- 檢查並添加 nfvp_score_f 欄位（如果不存在）
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS nfvp_score_f INTEGER DEFAULT 0;

-- 檢查並添加 customer_type 欄位（如果不存在）
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50) DEFAULT 'unclassified';

-- 驗證表結構
\d customers
