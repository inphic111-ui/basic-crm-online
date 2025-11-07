import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// 提供 dist 目錄中的靜態文件（React 構建輸出）
app.use(express.static(path.join(__dirname, 'dist')));
// 備份：如果 dist 不存在，提供 client 目錄
app.use(express.static(path.join(__dirname, 'client')));

// 日誌存儲
const logs = [];
const MAX_LOGS = 1000;

// 清理和轉換 annual_consumption 欄位
function cleanAnnualConsumption(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  
  // 如果是字符串，移除 'NT$' 前綴和其他非數字字符
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  // 如果是數字，直接返回
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  
  return 0;
}

// 添加日誌
function addLog(level, message, data = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    id: logs.length
  };
  logs.unshift(logEntry);
  if (logs.length > MAX_LOGS) {
    logs.pop();
  }
  console.log(`[${level}] ${message}`, data || '');
}

// 環境配置
const config = {
  offline: {
    name: 'OFFLINE (測試)',
    dbUrl: process.env.OFFLINE_DB_URL || process.env.DATABASE_URL,
    logFile: '/tmp/offline.log'
  },
  online: {
    name: 'ONLINE (正式)',
    dbUrl: process.env.ONLINE_DB_URL || process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
    logFile: '/tmp/online.log'
  }
};

// 創建數據庫連接池
const pools = {};

function createPool(env) {
  if (!config[env].dbUrl) {
    addLog('warn', `${env.toUpperCase()} 數據庫 URL 未配置`);
    return null;
  }

  try {
    pools[env] = new Pool({
      connectionString: config[env].dbUrl,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pools[env].on('error', (err) => {
      addLog('error', `${env.toUpperCase()} 數據庫連接池錯誤`, err.message);
    });

    addLog('info', `${env.toUpperCase()} 數據庫連接池已創建`);
    return pools[env];
  } catch (err) {
    addLog('error', `創建 ${env.toUpperCase()} 連接池失敗`, err.message);
    return null;
  }
}

// 初始化連接池
createPool('offline');
createPool('online');

// ============ CRM 3.0 API 路由 ============

// API: 儀表板統計數據 - 從 ONLINE 數據庫計算
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const pool = pools.online;
    if (!pool) {
      addLog('warn', '無法查詢統計：ONLINE 數據庫未連接');
      // 返回默認數據作為備用
      return res.json({
        totalCustomers: 1234,
        newCustomers: 234,
        repeatCustomers: 567,
        regularCustomers: 89,
        totalSales: 1234567,
        avgOrderValue: 5678
      });
    }

    // 查詢客戶統計
    const result = await pool.query(`
      SELECT 
        COUNT(*) as "totalCustomers",
        SUM(CASE WHEN status = '新客' OR status = '新客戶' THEN 1 ELSE 0 END) as "newCustomers",
        SUM(CASE WHEN status = '回購客' OR status = '回購客戶' THEN 1 ELSE 0 END) as "repeatCustomers",
        SUM(CASE WHEN status = '常客' OR status = '常客戶' THEN 1 ELSE 0 END) as "regularCustomers"
      FROM customers
    `);
    
    const stats = result.rows[0];
    addLog('info', '從 ONLINE 數據庫查詢統計成功', stats);
    
    res.json({
      totalCustomers: parseInt(stats.totalCustomers) || 0,
      newCustomers: parseInt(stats.newCustomers) || 0,
      repeatCustomers: parseInt(stats.repeatCustomers) || 0,
      regularCustomers: parseInt(stats.regularCustomers) || 0,
      totalSales: 1234567,
      avgOrderValue: 5678
    });
  } catch (err) {
    addLog('error', '查詢統計失敗', err.message);
    res.status(500).json({
      error: '查詢統計失敗',
      message: err.message
    });
  }
});

// API: 客戶列表 - 從 ONLINE 數據庫查詢
app.get('/api/customers', async (req, res) => {
  try {
    const pool = pools.online;
    if (!pool) {
      addLog('warn', '無法查詢客戶：ONLINE 數據庫未連接');
      // 返回默認數據作為備用
      return res.json([
        { id: 1, name: '客戶 A', company: '公司 A', capital: '上市', nfvp: 8.5, status: '蛻魚客戶' },
        { id: 2, name: '客戶 B', company: '公司 B', capital: '未上市', nfvp: 6.2, status: '鯰魚客戶' },
        { id: 3, name: '客戶 C', company: '公司 C', capital: '上市', nfvp: 7.8, status: '車魚客戶' },
      ]);
    }

    // 查詢 ONLINE 數據庫中的所有客戶
    // 使用 PostgreSQL CAST 操作符 ::NUMERIC 將 money 類型轉換為 NUMERIC
    const result = await pool.query(`
      SELECT *,
        CASE 
          WHEN annual_consumption IS NOT NULL THEN (annual_consumption)::NUMERIC
          ELSE 0
        END as annual_consumption_numeric
      FROM customers 
      ORDER BY id ASC
    `);
    
    // 將轉換後的 annual_consumption_numeric 值覆蓋原始的 annual_consumption
    const cleanedRows = result.rows.map(row => ({
      ...row,
      annual_consumption: row.annual_consumption_numeric || 0
    }));
    
    addLog('info', `從 ONLINE 數據庫查詢客戶成功，共 ${result.rows.length} 筆`);
    res.json(cleanedRows);
  } catch (err) {
    addLog('error', '查詢客戶失敗', err.message);
    res.status(500).json({
      error: '查詢客戶失敗',
      message: err.message
    });
  }
});

// API: 更新客戶信息
app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    
    const pool = pools.online;
    if (!pool) {
      addLog('warn', '無法更新客戶：ONLINE 數據庫未連接');
      return res.status(500).json({
        error: 'ONLINE 數據庫未連接'
      });
    }

    // 準備更新的字段
    const updates = [];
    const values = [];
    let paramIndex = 1;

    // 支持的所有字段
    // 注意：不接受 nfvp_score_n 和 nfvp_score_f，只接受 nfvp_score
    const fieldMap = {
      'name': 'name',
      'email': 'email',
      'phone': 'phone',
      'company_name': 'company_name',
      'initial_product': 'initial_product',
      'price': 'price',
      'budget': 'budget',
      'telephone': 'telephone',
      'order_status': 'order_status',
      'total_consumption': 'total_consumption',
      'annual_consumption': 'annual_consumption',
      'customer_rating': 'customer_rating',
      'customer_type': 'customer_type',
      'source': 'source',
      'capital_amount': 'capital_amount',
      'nfvp_score': 'nfvp_score',
      'cvi_score': 'cvi_score',
      'notes': 'notes',
      'status': 'status'
    };

    addLog('info', `更新客戶 ${id}，請求体：${JSON.stringify(body)}`);

    // 遍歷所有支持的字段
    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (body[key] !== undefined) {
        let value = body[key];
        
        // 數字字段的類型轉換
        if (['price', 'budget', 'total_consumption', 'annual_consumption', 'capital_amount', 'nfvp_score'].includes(dbField)) {
          if (value !== null && value !== '') {
            value = parseFloat(value);
            if (isNaN(value)) {
              addLog('warn', `字段 ${dbField} 的值不是有效的數字: ${body[key]}`);
              value = null;  // 轉換為 NULL
            }
          } else {
            value = null;
          }
        }
        
        updates.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        addLog('debug', `Added field: ${dbField} = ${value}`);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: '沒有提供任何更新字段'
      });
    }

    // 添加 id 到 values
    values.push(id);
    const updateQuery = `UPDATE customers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

    addLog('info', `SQL Query: ${updateQuery}`);
    addLog('info', `SQL Values: ${JSON.stringify(values)}`);

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: '客戶不存在'
      });
    }

    addLog('info', `客戶 ${id} 信息已更新`);
    res.json(result.rows[0]);
  } catch (err) {
    addLog('error', '更新客戶失敗', err.message);
    res.status(500).json({
      error: '更新客戶失敗',
      message: err.message
    });
  }
});

// API: 創建新客戶
app.post('/api/customers', async (req, res) => {
  try {
    const {
      customer_id, name, company_name, initial_product, price, budget,
      phone, telephone, order_status, total_consumption, customer_rating,
      customer_type, source, capital_amount, nfvp_score, cvi_score, notes
    } = req.body;

    const pool = pools.online;
    if (!pool) {
      addLog('warn', '無法創建客戶：ONLINE 數據庫未連接');
      return res.status(500).json({ error: 'ONLINE 數據庫未連接' });
    }

    // 驗證必填欄位
    if (!customer_id || !name) {
      return res.status(400).json({ error: '客戶編號和名稱為必填項' });
    }

    // 檢查客戶編號是否已存在
    const checkResult = await pool.query(
      'SELECT id FROM customers WHERE customer_id = $1',
      [customer_id]
    );

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: '客戶編號已存在' });
    }

    // 插入新客戶
    const result = await pool.query(`
      INSERT INTO customers (
        customer_id, name, company_name, initial_product, price, budget,
        phone, telephone, order_status, total_consumption, customer_rating,
        customer_type, source, capital_amount, nfvp_score, cvi_score, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      customer_id, name, company_name, initial_product, price, budget,
      phone, telephone, order_status, total_consumption, customer_rating,
      customer_type, source, capital_amount, nfvp_score, cvi_score, notes
    ]);

    addLog('info', `新客戶已創建: ${customer_id}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    addLog('error', '創建客戶失敗', err.message);
    res.status(500).json({
      error: '創建客戶失敗',
      message: err.message
    });
  }
});

// API: 獲取單個客戶詳細信息
app.get('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = pools.online;
    if (!pool) {
      addLog('warn', '無法查詢客戶：ONLINE 數據庫未連接');
      return res.status(500).json({ error: 'ONLINE 數據庫未連接' });
    }

    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '客戶不存在' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    addLog('error', '查詢客戶詳細信息失敗', err.message);
    res.status(500).json({
      error: '查詢客戶詳細信息失敗',
      message: err.message
    });
  }
});

// API: 刪除客戶
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = pools.online;
    if (!pool) {
      addLog('warn', '無法刪除客戶：ONLINE 數據庫未連接');
      return res.status(500).json({ error: 'ONLINE 數據庫未連接' });
    }

    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '客戶不存在' });
    }

    addLog('info', `客戶已刪除: ${id}`);
    res.json({ success: true, message: '客戶已刪除' });
  } catch (err) {
    addLog('error', '刪除客戶失敗', err.message);
    res.status(500).json({
      error: '刪除客戶失敗',
      message: err.message
    });
  }
});

// API: 初始化客戶表（重新定義）
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
        annual_consumption NUMERIC(15, 2) DEFAULT 0,
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

    // 步驟 3：創建索引
    await pool.query('CREATE INDEX idx_customers_customer_id ON customers(customer_id)');
    await pool.query('CREATE INDEX idx_customers_name ON customers(name)');
    await pool.query('CREATE INDEX idx_customers_created_at ON customers(created_at)');
    addLog('info', '索引已創建');

    // 步驟 4：插入示例數據
    const insertDataSQL = `
      INSERT INTO customers (
        customer_id, name, company_name, initial_product, price, budget,
        phone, telephone, order_status, total_consumption, customer_rating,
        customer_type, source, capital_amount, nfvp_score, cvi_score, notes
      ) VALUES
        ('20251106001', '林建宏', '智能科技有限公司', '軟件開發', 50000, 100000,
         '0912345678', '0287654321', '成交', 250000, 'A', NULL, 'LINE', 5000000, NULL, 92.5, '待評估'),
        ('20251106002', '陳怡君', '數位行銷集團', '網頁設計', 30000, 80000,
         '0923456789', '0276543210', '成交', 500000, 'S', NULL, 'EMAIL', 8000000, 9.2, 95.3, '頂級VIP'),
        ('20251106003', '劉文昌', '建築設計事務所', '平面設計', 20000, 50000,
         '0934567890', '0265432109', '追單', 300000, 'A', NULL, 'PHONE', 6000000, 8.5, 88.5, '高價值客戶'),
        ('20251106004', '黃美琴', '房地產開發公司', '品牌顧問', 80000, 150000,
         '0945678901', '0254321098', '售後', 200000, 'B', NULL, 'REFERRAL', 15000000, 7.2, 82.1, '潛力客戶'),
        ('20251106005', '張家豪', '金融投資公司', '財務規劃', 40000, 100000,
         '0956789012', '0243210987', '成交', 180000, 'C', NULL, 'LINE', 3000000, 6.8, 75.5, '常客'),
        ('20251106006', '王思琪', '教育培訓中心', '課程設計', 15000, 40000,
         '0967890123', '0232109876', '追單', 80000, 'D', NULL, 'WECHAT', 1000000, 5.5, 68.3, '普通客戶'),
        ('20251106007', '李明德', '醫療健康集團', '諮詢服務', 10000, 25000,
         '0978901234', '0221098765', '不買', 30000, 'E', NULL, 'FACEBOOK', 500000, 4.2, 55.1, '低價值客戶'),
        ('20251106008', '楊芬芬', '零售連鎖企業', '供應鏈優化', 60000, 120000,
         '0989012345', '0210987654', '售後', 450000, 'S', NULL, 'LINKEDIN', 12000000, 9.5, 96.8, '超級VIP'),
        ('20251106009', '何俊傑', '房地產開發公司', '市場分析', 45000, 90000,
         '0990123456', '0209876543', '成交', 220000, 'A', NULL, 'PHONE', 7000000, 8.2, 86.2, '高價值客戶'),
        ('20251106010', '吳欣怡', '餐飲連鎖企業', '品牌推廣', 25000, 60000,
         '0901234567', '0298765432', '追單', 120000, 'B', NULL, 'WECHAT', 2000000, 7.0, 79.5, '潛力客戶')
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

// ============ DevLog API 路由（保留現有功能）============

// API: 獲取日誌
app.get('/api/logs', (req, res) => {
  const { level, limit = 100, offset = 0 } = req.query;
  let filtered = logs;

  if (level && level !== 'all') {
    filtered = logs.filter(log => log.level === level);
  }

  const paginated = filtered.slice(offset, offset + parseInt(limit));
  res.json({
    total: filtered.length,
    offset: parseInt(offset),
    limit: parseInt(limit),
    logs: paginated
  });
});

// API: 清空日誌
app.post('/api/logs/clear', (req, res) => {
  logs.length = 0;
  addLog('info', '日誌已清空');
  res.json({ success: true, message: '日誌已清空' });
});

// API: 獲取環境狀態
app.get('/api/environments', async (req, res) => {
  const environments = {};

  for (const [env, cfg] of Object.entries(config)) {
    const pool = pools[env];
    let status = 'disconnected';
    let error = null;
    let dbInfo = null;

    if (pool) {
      try {
        const result = await pool.query('SELECT version();');
        status = 'connected';
        dbInfo = {
          version: result.rows[0].version,
          poolSize: pool.totalCount,
          idleCount: pool.idleCount
        };
      } catch (err) {
        status = 'error';
        error = err.message;
      }
    }

    environments[env] = {
      name: cfg.name,
      status,
      error,
      dbInfo,
      dbUrl: cfg.dbUrl ? '已配置' : '未配置'
    };
  }

  res.json(environments);
});

// API: 執行 SQL 查詢
app.post('/api/query', async (req, res) => {
  const { env, sql } = req.body;

  if (!env || !sql) {
    return res.status(400).json({ error: '缺少 env 或 sql 參數' });
  }

  if (!['offline', 'online'].includes(env)) {
    return res.status(400).json({ error: '無效的環境' });
  }

  const pool = pools[env];
  if (!pool) {
    return res.status(503).json({ error: `${env.toUpperCase()} 數據庫未連接` });
  }

  try {
    addLog('info', `執行查詢 [${env}]`, sql.substring(0, 100));
    const result = await pool.query(sql);
    res.json({
      success: true,
      rowCount: result.rowCount,
      rows: result.rows,
      fields: result.fields.map(f => ({ name: f.name, type: f.dataTypeID }))
    });
  } catch (err) {
    addLog('error', `查詢失敗 [${env}]`, err.message);
    res.status(400).json({ error: err.message });
  }
});

// API: 獲取表格列表
app.get('/api/tables/:env', async (req, res) => {
  const { env } = req.params;

  if (!['offline', 'online'].includes(env)) {
    return res.status(400).json({ error: '無效的環境' });
  }

  const pool = pools[env];
  if (!pool) {
    return res.status(503).json({ error: `${env.toUpperCase()} 數據庫未連接` });
  }

  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    res.json({ tables: result.rows.map(r => r.table_name) });
  } catch (err) {
    addLog('error', `獲取表格列表失敗 [${env}]`, err.message);
    res.status(400).json({ error: err.message });
  }
});

// API: 獲取表格數據
app.get('/api/table/:env/:table', async (req, res) => {
  const { env, table } = req.params;
  const { limit = 100, offset = 0 } = req.query;

  if (!['offline', 'online'].includes(env)) {
    return res.status(400).json({ error: '無效的環境' });
  }

  const pool = pools[env];
  if (!pool) {
    return res.status(503).json({ error: `${env.toUpperCase()} 數據庫未連接` });
  }

  try {
    // 驗證表名（防止 SQL 注入）
    const tableCheck = await pool.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = $1
    `, [table]);

    if (tableCheck.rows.length === 0) {
      return res.status(404).json({ error: '表格不存在' });
    }

    // 獲取行數
    const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const total = parseInt(countResult.rows[0].count);

    // 獲取數據
    const result = await pool.query(`
      SELECT * FROM "${table}" 
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);

    res.json({
      table,
      total,
      offset: parseInt(offset),
      limit: parseInt(limit),
      rows: result.rows,
      columns: result.fields.map(f => ({ name: f.name, type: f.dataTypeID }))
    });
  } catch (err) {
    addLog('error', `獲取表格數據失敗 [${env}:${table}]`, err.message);
    res.status(400).json({ error: err.message });
  }
});

// API: 數據遷移 - 從 OFFLINE 複製到 ONLINE
// API: 數據遷移 - 從 OFFLINE 剪下到 ONLINE（不覆蓋）
app.post('/api/migrate', async (req, res) => {
  const { table } = req.body;

  if (!table) {
    return res.status(400).json({ error: '缺少 table 參數' });
  }

  const offlinePool = pools['offline'];
  const onlinePool = pools['online'];

  if (!offlinePool || !onlinePool) {
    return res.status(503).json({ error: '數據庫連接不完整' });
  }

  try {
    addLog('info', `開始遷移表格 [${table}] - 剪下+貼上模式`);

    // 1. 獲取 OFFLINE 的數據計數
    const offlineCountBefore = await offlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const offlineRowsBefore = parseInt(offlineCountBefore.rows[0].count);

    // 2. 獲取 ONLINE 的數據計數
    const onlineCountBefore = await onlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const onlineRowsBefore = parseInt(onlineCountBefore.rows[0].count);

    // 3. 獲取 OFFLINE 的數據
    const sourceResult = await offlinePool.query(`SELECT * FROM "${table}"`);
    const rows = sourceResult.rows;

    if (rows.length === 0) {
      addLog('warn', `表格 [${table}] 在 OFFLINE 為空，無需遷移`);
      return res.json({ 
        success: true, 
        message: '表格為空，無需遷移', 
        rowCount: 0,
        offlineRowsBefore,
        onlineRowsBefore,
        migratedCount: 0
      });
    }

    // 4. 將數據插入到 ONLINE（不清空現有數據）
    const columns = Object.keys(rows[0]);
    const columnNames = columns.map(c => `"${c}"`).join(', ');
    let insertedCount = 0;
    let duplicateCount = 0;
    
    for (const row of rows) {
      try {
        const values = columns.map(c => row[c]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        await onlinePool.query(
          `INSERT INTO "${table}" (${columnNames}) VALUES (${placeholders})`,
          values
        );
        insertedCount++;
      } catch (err) {
        // 如果是重複鍵錯誤，跳過
        if (err.code === '23505') {
          duplicateCount++;
        } else {
          throw err;
        }
      }
    }

    addLog('info', `表格 [${table}] 已插入 ONLINE，共 ${insertedCount} 行，跳過重複 ${duplicateCount} 行`);

    // 5. 刪除 OFFLINE 的數據（剪下的第二步）
    await offlinePool.query(`DELETE FROM "${table}"`);
    addLog('info', `表格 [${table}] 已從 OFFLINE 刪除，共 ${rows.length} 行`);

    // 6. 獲取遷移後的計數
    const offlineCountAfter = await offlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const offlineRowsAfter = parseInt(offlineCountAfter.rows[0].count);

    const onlineCountAfter = await onlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const onlineRowsAfter = parseInt(onlineCountAfter.rows[0].count);

    addLog('info', `遷移完成 [${table}]: OFFLINE ${offlineRowsBefore}→${offlineRowsAfter}, ONLINE ${onlineRowsBefore}→${onlineRowsAfter}`);

    res.json({ 
      success: true, 
      message: `遷移成功（剪下+貼上模式），共遷移 ${insertedCount} 行，跳過重複 ${duplicateCount} 行`,
      offlineRowsBefore,
      offlineRowsAfter,
      onlineRowsBefore,
      onlineRowsAfter,
      migratedCount: insertedCount,
      duplicateCount
    });
  } catch (err) {
    addLog('error', `遷移失敗 [${table}]`, err.message);
    res.status(400).json({ error: err.message });
  }
});

// API: 遷移所有表格
app.post('/api/migrate-all', async (req, res) => {
  const offlinePool = pools['offline'];
  const onlinePool = pools['online'];

  if (!offlinePool || !onlinePool) {
    return res.status(503).json({ error: '數據庫連接不完整' });
  }

  try {
    addLog('info', '開始遷移所有表格');

    // 獲取所有表格
    const tableResult = await offlinePool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    const tables = tableResult.rows.map(r => r.table_name);
    const results = [];

    for (const table of tables) {
      try {
        const sourceResult = await offlinePool.query(`SELECT * FROM "${table}"`);
        const rows = sourceResult.rows;

        if (rows.length === 0) {
          results.push({ table, status: 'skipped', rowCount: 0 });
          continue;
        }

        // 清空 ONLINE 的表格
        await onlinePool.query(`TRUNCATE TABLE "${table}" CASCADE`);

        // 插入數據
        const columns = Object.keys(rows[0]);
        const columnNames = columns.map(c => `"${c}"`).join(', ');
        
        for (const row of rows) {
          const values = columns.map(c => row[c]);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          
          await onlinePool.query(
            `INSERT INTO "${table}" (${columnNames}) VALUES (${placeholders})`,
            values
          );
        }

        results.push({ table, status: 'success', rowCount: rows.length });
        addLog('info', `表格 [${table}] 遷移完成，共 ${rows.length} 行`);
      } catch (err) {
        results.push({ table, status: 'error', error: err.message });
        addLog('error', `表格 [${table}] 遷移失敗`, err.message);
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    addLog('error', '遷移所有表格失敗', err.message);
    res.status(400).json({ error: err.message });
  }
});

// API: 合併表格 - 從 OFFLINE 添加到 ONLINE（不覆蓋）
app.post('/api/merge', async (req, res) => {
  const { table } = req.body;

  if (!table) {
    return res.status(400).json({ error: '缺少 table 參數' });
  }

  const offlinePool = pools['offline'];
  const onlinePool = pools['online'];

  if (!offlinePool || !onlinePool) {
    return res.status(503).json({ error: '數據庫連接不完整' });
  }

  try {
    addLog('info', `開始合併表格 [${table}]`);

    // 獲取 OFFLINE 的數據
    const sourceResult = await offlinePool.query(`SELECT * FROM "${table}"`);
    const offlineRows = sourceResult.rows;

    if (offlineRows.length === 0) {
      addLog('warn', `表格 [${table}] 為空`);
      return res.json({ success: true, message: '表格為空，無需合併', mergedCount: 0 });
    }

    // 獲取 ONLINE 的現有數據
    const onlineCountResult = await onlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const onlineCountBefore = parseInt(onlineCountResult.rows[0].count);

    // 插入新數據（避免重複）
    const columns = Object.keys(offlineRows[0]);
    const columnNames = columns.map(c => `"${c}"`).join(', ');
    let mergedCount = 0;
    let duplicateCount = 0;

    for (const row of offlineRows) {
      try {
        const values = columns.map(c => row[c]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        await onlinePool.query(
          `INSERT INTO "${table}" (${columnNames}) VALUES (${placeholders})`,
          values
        );
        mergedCount++;
      } catch (err) {
        // 如果是重複鍵錯誤，跳過
        if (err.code === '23505') {
          duplicateCount++;
        } else {
          throw err;
        }
      }
    }

    // 獲取合併後的計數
    const onlineCountAfterResult = await onlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const onlineCountAfter = parseInt(onlineCountAfterResult.rows[0].count);

    addLog('info', `表格 [${table}] 合併完成，合併 ${mergedCount} 行，重複 ${duplicateCount} 行`);
    
    res.json({ 
      success: true, 
      message: `合併成功，共合併 ${mergedCount} 行，跳過重複 ${duplicateCount} 行`, 
      offlineCount: offlineRows.length,
      onlineCountBefore,
      mergedCount,
      duplicateCount,
      onlineCountAfter
    });
  } catch (err) {
    addLog('error', `合併失敗 [${table}]`, err.message);
    res.status(400).json({ error: err.message });
  }
});

// API: 部分遷移 - 按 ID 範圍
app.post('/api/migrate-range', async (req, res) => {
  const { table, idFrom, idTo } = req.body;

  if (!table || idFrom === undefined || idTo === undefined) {
    return res.status(400).json({ error: '缺少必要參數: table, idFrom, idTo' });
  }

  const offlinePool = pools['offline'];
  const onlinePool = pools['online'];

  if (!offlinePool || !onlinePool) {
    return res.status(503).json({ error: '數據庫連接不完整' });
  }

  try {
    addLog('info', `開始部分遷移表格 [${table}] - ID 範圍 ${idFrom}-${idTo}`);

    // 1. 獲取 OFFLINE 的數據計數
    const offlineCountBefore = await offlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const offlineRowsBefore = parseInt(offlineCountBefore.rows[0].count);

    // 2. 獲取 ONLINE 的數據計數
    const onlineCountBefore = await onlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const onlineRowsBefore = parseInt(onlineCountBefore.rows[0].count);

    // 3. 獲取 OFFLINE 的指定範圍數據
    const sourceResult = await offlinePool.query(
      `SELECT * FROM "${table}" WHERE id >= $1 AND id <= $2 ORDER BY id`,
      [idFrom, idTo]
    );
    const rows = sourceResult.rows;

    if (rows.length === 0) {
      addLog('warn', `表格 [${table}] 在 ID 範圍 ${idFrom}-${idTo} 內無數據`);
      return res.json({ 
        success: true, 
        message: '指定範圍內無數據', 
        rowCount: 0,
        offlineRowsBefore,
        onlineRowsBefore,
        migratedCount: 0
      });
    }

    // 4. 將數據插入到 ONLINE
    const columns = Object.keys(rows[0]);
    const columnNames = columns.map(c => `"${c}"`).join(', ');
    let insertedCount = 0;
    let duplicateCount = 0;
    
    for (const row of rows) {
      try {
        const values = columns.map(c => row[c]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        await onlinePool.query(
          `INSERT INTO "${table}" (${columnNames}) VALUES (${placeholders})`,
          values
        );
        insertedCount++;
      } catch (err) {
        if (err.code === '23505') {
          duplicateCount++;
        } else {
          throw err;
        }
      }
    }

    addLog('info', `表格 [${table}] 已插入 ONLINE，共 ${insertedCount} 行，跳過重複 ${duplicateCount} 行`);

    // 5. 刪除 OFFLINE 的指定範圍數據
    await offlinePool.query(
      `DELETE FROM "${table}" WHERE id >= $1 AND id <= $2`,
      [idFrom, idTo]
    );
    addLog('info', `表格 [${table}] 已從 OFFLINE 刪除 ID 範圍 ${idFrom}-${idTo}，共 ${rows.length} 行`);

    // 6. 獲取遷移後的計數
    const offlineCountAfter = await offlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const offlineRowsAfter = parseInt(offlineCountAfter.rows[0].count);

    const onlineCountAfter = await onlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const onlineRowsAfter = parseInt(onlineCountAfter.rows[0].count);

    addLog('info', `部分遷移完成 [${table}]: OFFLINE ${offlineRowsBefore}→${offlineRowsAfter}, ONLINE ${onlineRowsBefore}→${onlineRowsAfter}`);

    res.json({ 
      success: true, 
      message: `部分遷移成功（ID ${idFrom}-${idTo}），共遷移 ${insertedCount} 行，跳過重複 ${duplicateCount} 行`,
      offlineRowsBefore,
      offlineRowsAfter,
      onlineRowsBefore,
      onlineRowsAfter,
      migratedCount: insertedCount,
      duplicateCount,
      idRange: { from: idFrom, to: idTo }
    });
  } catch (err) {
    addLog('error', `部分遷移失敗 [${table}]`, err.message);
    res.status(400).json({ error: err.message });
  }
});

// API: 部分遷移 - 按條件
app.post('/api/migrate-condition', async (req, res) => {
  const { table, condition } = req.body;

  if (!table || !condition) {
    return res.status(400).json({ error: '缺少必要參數: table, condition' });
  }

  const offlinePool = pools['offline'];
  const onlinePool = pools['online'];

  if (!offlinePool || !onlinePool) {
    return res.status(503).json({ error: '數據庫連接不完整' });
  }

  try {
    addLog('info', `開始部分遷移表格 [${table}] - 條件: ${condition}`);

    // 1. 獲取 OFFLINE 的數據計數
    const offlineCountBefore = await offlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const offlineRowsBefore = parseInt(offlineCountBefore.rows[0].count);

    // 2. 獲取 ONLINE 的數據計數
    const onlineCountBefore = await onlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const onlineRowsBefore = parseInt(onlineCountBefore.rows[0].count);

    // 3. 獲取 OFFLINE 的符合條件的數據
    const sourceResult = await offlinePool.query(
      `SELECT * FROM "${table}" WHERE ${condition}`
    );
    const rows = sourceResult.rows;

    if (rows.length === 0) {
      addLog('warn', `表格 [${table}] 符合條件的數據為空`);
      return res.json({ 
        success: true, 
        message: '符合條件的數據為空', 
        rowCount: 0,
        offlineRowsBefore,
        onlineRowsBefore,
        migratedCount: 0
      });
    }

    // 4. 將數據插入到 ONLINE
    const columns = Object.keys(rows[0]);
    const columnNames = columns.map(c => `"${c}"`).join(', ');
    let insertedCount = 0;
    let duplicateCount = 0;
    
    for (const row of rows) {
      try {
        const values = columns.map(c => row[c]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        await onlinePool.query(
          `INSERT INTO "${table}" (${columnNames}) VALUES (${placeholders})`,
          values
        );
        insertedCount++;
      } catch (err) {
        if (err.code === '23505') {
          duplicateCount++;
        } else {
          throw err;
        }
      }
    }

    addLog('info', `表格 [${table}] 已插入 ONLINE，共 ${insertedCount} 行，跳過重複 ${duplicateCount} 行`);

    // 5. 刪除 OFFLINE 的符合條件的數據
    await offlinePool.query(
      `DELETE FROM "${table}" WHERE ${condition}`
    );
    addLog('info', `表格 [${table}] 已從 OFFLINE 刪除符合條件的數據，共 ${rows.length} 行`);

    // 6. 獲取遷移後的計數
    const offlineCountAfter = await offlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const offlineRowsAfter = parseInt(offlineCountAfter.rows[0].count);

    const onlineCountAfter = await onlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const onlineRowsAfter = parseInt(onlineCountAfter.rows[0].count);

    addLog('info', `部分遷移完成 [${table}]: OFFLINE ${offlineRowsBefore}→${offlineRowsAfter}, ONLINE ${onlineRowsBefore}→${onlineRowsAfter}`);

    res.json({ 
      success: true, 
      message: `部分遷移成功（條件: ${condition}），共遷移 ${insertedCount} 行，跳過重複 ${duplicateCount} 行`,
      offlineRowsBefore,
      offlineRowsAfter,
      onlineRowsBefore,
      onlineRowsAfter,
      migratedCount: insertedCount,
      duplicateCount,
      condition
    });
  } catch (err) {
    addLog('error', `部分遷移失敗 [${table}]`, err.message);
    res.status(400).json({ error: err.message });
  }
});

// API: 預覽部分遷移 - 按 ID 範圍
app.post('/api/preview-migrate-range', async (req, res) => {
  const { table, idFrom, idTo } = req.body;

  if (!table || idFrom === undefined || idTo === undefined) {
    return res.status(400).json({ error: '缺少必要參數' });
  }

  const offlinePool = pools['offline'];

  if (!offlinePool) {
    return res.status(503).json({ error: '數據庫連接不完整' });
  }

  try {
    const result = await offlinePool.query(
      `SELECT COUNT(*) as count FROM "${table}" WHERE id >= $1 AND id <= $2`,
      [idFrom, idTo]
    );
    const rowCount = parseInt(result.rows[0].count);

    res.json({ 
      success: true, 
      rowCount,
      message: `將遷移 ${rowCount} 行`
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// API: 預覽部分遷移 - 按條件
app.post('/api/preview-migrate-condition', async (req, res) => {
  const { table, condition } = req.body;

  if (!table || !condition) {
    return res.status(400).json({ error: '缺少必要參數' });
  }

  const offlinePool = pools['offline'];

  if (!offlinePool) {
    return res.status(503).json({ error: '數據庫連接不完整' });
  }

  try {
    const result = await offlinePool.query(
      `SELECT COUNT(*) as count FROM "${table}" WHERE ${condition}`
    );
    const rowCount = parseInt(result.rows[0].count);

    res.json({ 
      success: true, 
      rowCount,
      message: `將遷移 ${rowCount} 行`
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// API: 驗證數據完整性
app.post('/api/verify', async (req, res) => {
  const { table } = req.body;

  if (!table) {
    return res.status(400).json({ error: '缺少 table 參數' });
  }

  const offlinePool = pools['offline'];
  const onlinePool = pools['online'];

  if (!offlinePool || !onlinePool) {
    return res.status(503).json({ error: '數據庫連接不完整' });
  }

  try {
    addLog('info', `驗證表格 [${table}] 數據完整性`);

    const offlineCount = await offlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const onlineCount = await onlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);

    const offlineRows = parseInt(offlineCount.rows[0].count);
    const onlineRows = parseInt(onlineCount.rows[0].count);

    const match = offlineRows === onlineRows;
    const status = match ? 'success' : 'mismatch';

    addLog('info', `驗證完成 [${table}]: OFFLINE=${offlineRows}, ONLINE=${onlineRows}`);

    res.json({
      table,
      status,
      offlineRows,
      onlineRows,
      match
    });
  } catch (err) {
    addLog('error', `驗證失敗 [${table}]`, err.message);
    res.status(400).json({ error: err.message });
  }
});

// 首頁
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// 啟動服務器

// API: 按 ID 列表遷移
app.post('/api/migrate-by-ids', async (req, res) => {
  const { table, ids } = req.body;
  if (!table || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '缺少參數或 ID 列表為空' });
  }
  const offlinePool = pools['offline'];
  const onlinePool = pools['online'];
  if (!offlinePool || !onlinePool) {
    return res.status(503).json({ error: '數據庫連接不完整' });
  }
  try {
    const offlineCountBefore = await offlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const offlineRowsBefore = parseInt(offlineCountBefore.rows[0].count);
    const onlineCountBefore = await onlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const onlineRowsBefore = parseInt(onlineCountBefore.rows[0].count);
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const sourceResult = await offlinePool.query(
      `SELECT * FROM "${table}" WHERE id IN (${placeholders})`,
      ids
    );
    const rows = sourceResult.rows;
    if (rows.length === 0) {
      return res.json({ success: true, message: '指定 ID 的數據為空', migratedCount: 0 });
    }
    const columns = Object.keys(rows[0]);
    const columnNames = columns.map(c => `"${c}"`).join(', ');
    let insertedCount = 0, duplicateCount = 0;
    for (const row of rows) {
      try {
        const values = columns.map(c => row[c]);
        const ph = columns.map((_, i) => `$${i + 1}`).join(', ');
        await onlinePool.query(`INSERT INTO "${table}" (${columnNames}) VALUES (${ph})`, values);
        insertedCount++;
      } catch (err) {
        if (err.code === '23505') duplicateCount++;
        else throw err;
      }
    }
    await offlinePool.query(`DELETE FROM "${table}" WHERE id IN (${placeholders})`, ids);
    const offlineCountAfter = await offlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const offlineRowsAfter = parseInt(offlineCountAfter.rows[0].count);
    const onlineCountAfter = await onlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const onlineRowsAfter = parseInt(onlineCountAfter.rows[0].count);
    addLog('info', `按 ID 遷移完成: ${insertedCount} 行`);
    res.json({ success: true, message: `遷移成功 ${insertedCount} 行`, offlineRowsBefore, offlineRowsAfter, onlineRowsBefore, onlineRowsAfter, migratedCount: insertedCount, duplicateCount });
  } catch (err) {
    addLog('error', `遷移失敗: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

// API: 按 ID 列表合併
app.post('/api/merge-by-ids', async (req, res) => {
  const { table, ids } = req.body;
  if (!table || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '缺少參數或 ID 列表為空' });
  }
  const offlinePool = pools['offline'];
  const onlinePool = pools['online'];
  if (!offlinePool || !onlinePool) {
    return res.status(503).json({ error: '數據庫連接不完整' });
  }
  try {
    const offlineCountBefore = await offlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const offlineRowsBefore = parseInt(offlineCountBefore.rows[0].count);
    const onlineCountBefore = await onlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const onlineRowsBefore = parseInt(onlineCountBefore.rows[0].count);
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const sourceResult = await offlinePool.query(
      `SELECT * FROM "${table}" WHERE id IN (${placeholders})`,
      ids
    );
    const rows = sourceResult.rows;
    if (rows.length === 0) {
      return res.json({ success: true, message: '指定 ID 的數據為空', mergedCount: 0 });
    }
    const columns = Object.keys(rows[0]);
    const columnNames = columns.map(c => `"${c}"`).join(', ');
    let insertedCount = 0, duplicateCount = 0;
    for (const row of rows) {
      try {
        const values = columns.map(c => row[c]);
        const ph = columns.map((_, i) => `$${i + 1}`).join(', ');
        await onlinePool.query(`INSERT INTO "${table}" (${columnNames}) VALUES (${ph})`, values);
        insertedCount++;
      } catch (err) {
        if (err.code === '23505') duplicateCount++;
        else throw err;
      }
    }
    const onlineCountAfter = await onlinePool.query(`SELECT COUNT(*) as count FROM "${table}"`);
    const onlineRowsAfter = parseInt(onlineCountAfter.rows[0].count);
    addLog('info', `按 ID 合併完成: ${insertedCount} 行`);
    res.json({ success: true, message: `合併成功 ${insertedCount} 行`, offlineRowsBefore, onlineRowsBefore, onlineRowsAfter, mergedCount: insertedCount, duplicateCount });
  } catch (err) {
    addLog('error', `合併失敗: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

// API: 獲取表格的所有數據
app.post('/api/get-table-data', async (req, res) => {
  const { table, database } = req.body;
  if (!table || !database) {
    return res.status(400).json({ error: '缺少參數' });
  }
  const pool = pools[database];
  if (!pool) {
    return res.status(503).json({ error: '數據庫連接不完整' });
  }
  try {
    const result = await pool.query(`SELECT * FROM "${table}" ORDER BY id ASC`);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
// SPA 路由 - 所有未匹配的路由都返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
    if (err) {
      // 如果 dist 不存在，嘗試 client
      res.sendFile(path.join(__dirname, 'client', 'index.html'))
    }
  })
});


// 獲取單個客戶詳細信息
app.get('/api/customers/:id', async (req, res) => {
  const pool = pools.online;
  if (!pool) {
    return res.status(500).json({ error: '數據庫未連接' });
  }

  try {
    const { id } = req.params;
    // 使用 PostgreSQL CAST 操作符 ::NUMERIC 將 money 類型轉換為 NUMERIC
    const result = await pool.query(`
      SELECT *,
        CASE 
          WHEN annual_consumption IS NOT NULL THEN (annual_consumption)::NUMERIC
          ELSE 0
        END as annual_consumption_numeric
      FROM customers 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '客戶不存在' });
    }

    // 將轉換後的 annual_consumption_numeric 值覆蓋原始的 annual_consumption
    const cleanedRow = {
      ...result.rows[0],
      annual_consumption: result.rows[0].annual_consumption_numeric || 0
    };

    res.json(cleanedRow);
  } catch (err) {
    addLog('error', '獲取客戶詳細信息失敗', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 創建客戶
app.post('/api/customers', async (req, res) => {
  const pool = pools.online;
  if (!pool) {
    return res.status(500).json({ error: '數據庫未連接' });
  }

  try {
    const {
      customer_id, name, company_name, initial_product, price, budget,
      phone, telephone, order_status, total_consumption, customer_rating,
      customer_type, source, capital_amount, nfvp_score, cvi_score, notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO customers (
        customer_id, name, company_name, initial_product, price, budget,
        phone, telephone, order_status, total_consumption, customer_rating,
        customer_type, source, capital_amount, nfvp_score, cvi_score, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      customer_id, name, company_name, initial_product, price, budget,
      phone, telephone, order_status, total_consumption, customer_rating,
      customer_type, source, capital_amount, nfvp_score, cvi_score, notes
    ]);

    addLog('info', '客戶已創建', { customer_id });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    addLog('error', '創建客戶失敗', err.message);
    res.status(500).json({ error: err.message });
  }
});


// 刪除客戶
app.delete('/api/customers/:id', async (req, res) => {
  const pool = pools.online;
  if (!pool) {
    return res.status(500).json({ error: '數據庫未連接' });
  }

  try {
    const { id } = req.params;
    // 使用 PostgreSQL CAST 操作符 ::NUMERIC 將 money 類型轉換為 NUMERIC
    const result = await pool.query(`
      SELECT *,
        CASE 
          WHEN annual_consumption IS NOT NULL THEN (annual_consumption)::NUMERIC
          ELSE 0
        END as annual_consumption_numeric
      FROM customers 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '客戶不存在' });
    }

    // 將轉換後的 annual_consumption_numeric 值覆蓋原始的 annual_consumption
    const cleanedRow = {
      ...result.rows[0],
      annual_consumption: result.rows[0].annual_consumption_numeric || 0
    };