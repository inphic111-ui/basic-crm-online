-- Railway PostgreSQL 數據修復腳本
-- 修復 annual_consumption 欄位中的「非數值」數據

-- 步驟 1：檢查 annual_consumption 欄位的當前狀態
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'customers' AND column_name = 'annual_consumption';

-- 步驟 2：如果 annual_consumption 欄位是 VARCHAR/TEXT 類型，需要轉換為 NUMERIC
-- 方案 A：直接修改欄位類型（如果可以）
-- ALTER TABLE customers 
-- ALTER COLUMN annual_consumption TYPE NUMERIC(12, 2) 
-- USING CASE 
--   WHEN annual_consumption ~ '^\d+(\.\d+)?$' THEN annual_consumption::NUMERIC
--   ELSE 0
-- END;

-- 方案 B：使用程式化方法重建欄位（推薦，更安全）
DO $$
BEGIN
  -- 檢查 annual_consumption 欄位是否存在
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'annual_consumption'
  ) THEN
    -- 檢查欄位類型
    IF (SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'annual_consumption') != 'numeric' THEN
      
      -- 重命名舊欄位
      ALTER TABLE customers RENAME COLUMN annual_consumption TO annual_consumption_old;
      
      -- 創建新的 NUMERIC 欄位
      ALTER TABLE customers ADD COLUMN annual_consumption NUMERIC(12, 2) DEFAULT 0;
      
      -- 遷移數據：將可轉換的值轉換，其他設為 0
      UPDATE customers
      SET annual_consumption = CASE
        WHEN annual_consumption_old ~ '^\d+(\.\d+)?$' THEN annual_consumption_old::NUMERIC
        WHEN annual_consumption_old IS NULL THEN 0
        ELSE 0
      END;
      
      -- 刪除舊欄位
      ALTER TABLE customers DROP COLUMN annual_consumption_old;
      
      RAISE NOTICE '成功將 annual_consumption 轉換為 NUMERIC 類型';
    ELSE
      -- 欄位已是 NUMERIC 類型，只需更新「非數值」的記錄
      UPDATE customers
      SET annual_consumption = 0
      WHERE annual_consumption IS NULL;
      
      RAISE NOTICE '年度消費欄位已是正確類型，已清理 NULL 值';
    END IF;
  ELSE
    -- 欄位不存在，創建新欄位
    ALTER TABLE customers ADD COLUMN annual_consumption NUMERIC(12, 2) DEFAULT 0;
    RAISE NOTICE '已創建 annual_consumption 欄位';
  END IF;
END $$;

-- 步驟 3：驗證修復結果
-- 檢查欄位類型
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customers' AND column_name = 'annual_consumption';

-- 檢查數據
SELECT id, name, annual_consumption FROM customers LIMIT 10;

-- 檢查是否還有 NULL 或無效值
SELECT COUNT(*) as invalid_count FROM customers 
WHERE annual_consumption IS NULL OR annual_consumption = 0;
