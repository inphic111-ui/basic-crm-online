// 初始化客戶表的 API 路由（PostgreSQL 語法）
// 在 server.mjs 中使用此代碼替換 POST /api/customers/init-table 路由

app.post('/api/customers/init-table', async (req, res) => {
  try {
    const pool = pools.online;
    if (!pool) {
      addLog('warn', '無法初始化表：ONLINE 數據庫未連接');
      return res.status(500).json({ error: 'ONLINE 數據庫未連接' });
    }

    // 步驟 1：刪除現有表
    try {
      await pool.query('DROP TABLE IF EXISTS customers CASCADE');
      addLog('info', '舊客戶表已刪除');
    } catch (err) {
      addLog('warn', '刪除舊表時出現警告', err.message);
    }

    // 步驟 2：創建新表（PostgreSQL 語法）
    const createTableSQL = `
      CREATE TABLE customers (
        id SERIAL PRIMARY KEY,
        customer_id VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        initial_product VARCHAR(255),
        price NUMERIC(10, 2),
        budget NUMERIC(10, 2),
        phone VARCHAR(20),
        telephone VARCHAR(20),
        order_status VARCHAR(50),
        total_consumption NUMERIC(15, 2),
        customer_rating VARCHAR(10),
        customer_type VARCHAR(50),
        source VARCHAR(50),
        capital_amount NUMERIC(15, 2),
        nfvp_score NUMERIC(3, 1),
        cvi_score NUMERIC(5, 2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await pool.query(createTableSQL);
    addLog('info', '新客戶表已創建');

    // 步驟 3：創建索引以提高查詢性能
    const createIndexesSQL = `
      CREATE INDEX idx_customers_customer_id ON customers(customer_id);
      CREATE INDEX idx_customers_name ON customers(name);
      CREATE INDEX idx_customers_created_at ON customers(created_at);
    `;

    await pool.query(createIndexesSQL);
    addLog('info', '索引已創建');

    // 步驟 4：插入示例數據
    const insertDataSQL = `
      INSERT INTO customers (
        customer_id, name, company_name, initial_product, price, budget,
        phone, telephone, order_status, total_consumption, customer_rating,
        customer_type, source, capital_amount, nfvp_score, cvi_score, notes
      ) VALUES
        ('20251106001', '林建宏', '智能科技有限公司', '軟件開發', 50000, 100000,
         '0912345678', '0287654321', '成交', 250000, 'A', 'shark', 'LINE', 5000000, 8.5, 92.5, 'VIP 客戶'),
        ('20251106002', '陳怡君', '數位行銷集團', '網頁設計', 30000, 80000,
         '0923456789', '0276543210', '追單', 150000, 'B', 'whale', 'EMAIL', 2000000, 7.2, 85.3, '潛力客戶'),
        ('20251106003', '劉文昌', '建築設計事務所', '平面設計', 20000, 50000,
         '0934567890', '0265432109', '售後', 100000, 'C', 'grass', 'PHONE', 1000000, 6.8, 78.5, '常客'),
        ('20251106004', '黃美琴', '個人', '品牌顧問', 15000, 30000,
         '0945678901', '0254321098', '不買', 50000, 'E', 'shrimp', 'REFERRAL', 500000, 4.5, 62.1, '低價值客戶'),
        ('20251106005', '張家豪', '金融投資公司', '財務規劃', 80000, 200000,
         '0956789012', '0243210987', '成交', 400000, 'S', 'shark', 'LINE', 10000000, 9.2, 98.7, '頂級 VIP')
    `;

    await pool.query(insertDataSQL);
    addLog('info', '示例數據已插入');

    res.json({
      success: true,
      message: '客戶表已重新定義（PostgreSQL），並插入 5 條示例數據',
      details: {
        tableCreated: true,
        indexesCreated: true,
        sampleDataCount: 5,
        fields: 17,
        database: 'PostgreSQL'
      }
    });
  } catch (err) {
    addLog('error', '初始化客戶表失敗', err.message);
    res.status(500).json({
      error: '初始化客戶表失敗',
      message: err.message,
      details: err.toString()
    });
  }
});
