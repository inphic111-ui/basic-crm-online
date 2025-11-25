
    // 檢查 ci_customers 表是否存在
    const ciCustomersCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ci_customers'
      )
    `);

    if (!ciCustomersCheckResult.rows[0].exists) {
      addLog('info', '檢測到 ci_customers 表不存在，開始初始化...');
      
      // 創建 ci_customers 表
      await pool.query(`
        CREATE TABLE ci_customers (
          id SERIAL PRIMARY KEY,
          customer_id VARCHAR(20) UNIQUE NOT NULL,
          customer_name VARCHAR(255),
          product_name VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      addLog('info', 'ci_customers 表已創建');
      
      // 創建索引
      await pool.query('CREATE INDEX idx_ci_customer_id ON ci_customers(customer_id)');
      addLog('info', 'ci_customers 索引已創建');
    } else {
      addLog('info', 'ci_customers 表已存在，跳過初始化');
    }

    // 檢查 ci_interactions 表是否存在
    const ciInteractionsCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ci_interactions'
      )
    `);

    if (!ciInteractionsCheckResult.rows[0].exists) {
      addLog('info', '檢測到 ci_interactions 表不存在，開始初始化...');
      
      // 創建 ci_interactions 表
      await pool.query(`
        CREATE TABLE ci_interactions (
          id SERIAL PRIMARY KEY,
          ci_customer_id INTEGER REFERENCES ci_customers(id) ON DELETE CASCADE,
          sender_type VARCHAR(50),
          sender_name VARCHAR(255),
          timestamp TIMESTAMP,
          content TEXT,
          message_hash VARCHAR(64) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      addLog('info', 'ci_interactions 表已創建');
      
      // 創建索引
      await pool.query('CREATE INDEX idx_ci_interactions_customer ON ci_interactions(ci_customer_id)');
      await pool.query('CREATE INDEX idx_ci_interactions_hash ON ci_interactions(message_hash)');
      await pool.query('CREATE INDEX idx_ci_interactions_timestamp ON ci_interactions(timestamp)');
      addLog('info', 'ci_interactions 索引已創建');
    } else {
      addLog('info', 'ci_interactions 表已存在，跳過初始化');
    }
