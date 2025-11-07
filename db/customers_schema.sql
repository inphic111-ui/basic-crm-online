-- 客戶資料表
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(20) UNIQUE NOT NULL,  -- 編號（西元年+月+日+4碼流水號）
  name VARCHAR(255) NOT NULL,                -- 姓名
  company_name VARCHAR(255),                 -- 公司名稱
  initial_product VARCHAR(255),              -- 最初詢問商品
  price NUMERIC(10, 2),                      -- 價格
  budget NUMERIC(10, 2),                     -- 預算
  phone VARCHAR(20),                         -- 手機
  telephone VARCHAR(20),                     -- 電話
  order_status VARCHAR(50),                  -- 訂單狀態（追單/成交/售後/不買）
  total_consumption NUMERIC(15, 2),          -- 累計消費額
  annual_consumption NUMERIC(15, 2) DEFAULT 0,  -- 年度消費額
  customer_rating VARCHAR(10),               -- 客戶評級（S/A/B/C/D/E）
  customer_type VARCHAR(50),                 -- 客戶屬性（鯊魚/鯨魚/草魚/小蝦）
  source VARCHAR(50),                        -- 來源（KIPO/INPHIC）
  capital_amount NUMERIC(15, 2),             -- 資本額
  nfvp_score NUMERIC(3, 1),                  -- NFVP 評分（0-10）
  cvi_score NUMERIC(5, 2),                   -- CVI 評分（客戶價值指數）
  notes TEXT,                                -- 處理紀錄（備註）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_nfvp_score CHECK (nfvp_score >= 0 AND nfvp_score <= 10),
  CONSTRAINT chk_order_status CHECK (order_status IN ('追單', '成交', '售後', '不買')),
  CONSTRAINT chk_customer_rating CHECK (customer_rating IN ('S', 'A', 'B', 'C', 'D', 'E')),
  CONSTRAINT chk_customer_type CHECK (customer_type IN ('鯊魚', '鯨魚', '草魚', '小蝦')),
  CONSTRAINT chk_source CHECK (source IN ('KIPO', 'INPHIC'))
);

-- 建立索引以提高查詢性能
CREATE INDEX IF NOT EXISTS idx_customer_id ON customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_company_name ON customers(company_name);
CREATE INDEX IF NOT EXISTS idx_order_status ON customers(order_status);
CREATE INDEX IF NOT EXISTS idx_customer_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_created_at ON customers(created_at);
