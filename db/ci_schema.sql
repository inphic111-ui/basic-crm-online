-- Customer Insight 客戶表
CREATE TABLE IF NOT EXISTS ci_customers (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(20) UNIQUE NOT NULL,
  customer_name VARCHAR(255),
  product_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Insight 互動記錄表
CREATE TABLE IF NOT EXISTS ci_interactions (
  id SERIAL PRIMARY KEY,
  ci_customer_id INTEGER REFERENCES ci_customers(id) ON DELETE CASCADE,
  sender_type VARCHAR(50),
  sender_name VARCHAR(255),
  timestamp TIMESTAMP,
  content TEXT,
  message_hash VARCHAR(64) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_ci_customer_id ON ci_customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_ci_interactions_customer ON ci_interactions(ci_customer_id);
CREATE INDEX IF NOT EXISTS idx_ci_interactions_hash ON ci_interactions(message_hash);
CREATE INDEX IF NOT EXISTS idx_ci_interactions_timestamp ON ci_interactions(timestamp);
