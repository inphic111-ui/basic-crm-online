import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

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
    dbUrl: (process.env.OFFLINE_DB_URL || process.env.DATABASE_URL || '').replace('?', '?sslmode=require&').replace('postgresql://', 'postgresql://'),
    logFile: '/tmp/offline.log'
  },
  online: {
    name: 'ONLINE (正式)',
    dbUrl: (process.env.ONLINE_DB_URL || process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || '').replace('?', '?sslmode=require&').replace('postgresql://', 'postgresql://'),
    logFile: '/tmp/online.log'
  }
};

// R2 客戶端配置
let r2Client = null;
try {
  if (process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    console.log('[INFO] R2 Client 初始化成功');
  } else {
    console.warn('[WARN] R2 環境變數未完整設置，跳過 R2 Client 初始化');
  }
} catch (err) {
  console.error('[ERROR] R2 Client 初始化失敗:', err.message);
}

// Multer 配置（內存存儲）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳音檔'));
    }
  },
});

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
      ssl: { rejectUnauthorized: false }
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

// 自動初始化數據庫表（如果不存在）
async function initializeDatabase() {
  const pool = pools.online;
  if (!pool) {
    addLog('warn', '無法初始化數據庫：ONLINE 連接池未創建');
    return;
  }

  try {
    // 檢查 customers 表是否存在
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'customers'
      )
    `);

    if (!tableCheckResult.rows[0].exists) {
      addLog('info', '檢測到 customers 表不存在，開始初始化...');
      
      // 創建表
      await pool.query(`
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
          audio_url TEXT,
          product_url TEXT,
          ai_analysis TEXT,
          ai_analysis_history TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      addLog('info', 'customers 表已創建');;
      
      // 創建索引
      await pool.query('CREATE INDEX idx_customers_customer_id ON customers(customer_id)');
      await pool.query('CREATE INDEX idx_customers_name ON customers(name)');
      await pool.query('CREATE INDEX idx_customers_created_at ON customers(created_at)');
      addLog('info', '索引已創建');
      
      // 插入示例數據
      await pool.query(`
        INSERT INTO customers (
          customer_id, name, company_name, initial_product, price, budget,
          phone, telephone, order_status, total_consumption, customer_rating,
          customer_type, source, capital_amount, nfvp_score, cvi_score, notes
        ) VALUES
          ('20251106001', '林建宏', '智能科技有限公司', '軟件開發', 50000, 100000,
           '0912345678', '0287654321', '成交', 250000, 'A', NULL, 'LINE', 5000000, NULL, 92.5, '待評估'),
          ('20251106002', '陳怡君', '數位行銷集團', '網頁設計', 30000, 80000,
           '0923456789', '0276543210', '成交', 500000, 'S', NULL, 'EMAIL', 8000000, 9.2, 95.3, '頂級VIP')
      `);
      addLog('info', '示例數據已插入');
    } else {
      
      // 檢查並添加 ai_analysis_history 欄位
      try {
        await pool.query('ALTER TABLE customers ADD COLUMN ai_analysis_history TEXT');
        addLog('info', 'ai_analysis_history 欄位已添加');
      } catch (err) {
        if (!err.message.includes('already exists')) {
          addLog('warn', 'ai_analysis_history 欄位添加失敗: ' + err.message);
        }
      }

      addLog('info', 'customers 表已存在，跳過初始化');
    }

    // 檢查 audio_recordings 表是否存在
    const audioTableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'audio_recordings'
      )
    `);

    if (!audioTableCheckResult.rows[0].exists) {
      addLog('info', '檢測到 audio_recordings 表不存在，開始初始化...');
      
      // 創建 audio_recordings 表
      await pool.query(`
        CREATE TABLE audio_recordings (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER,
          business_name VARCHAR(255),
          product_name VARCHAR(255),
          call_date DATE,
          call_time TIME,
          audio_url TEXT,
          transcription_text TEXT,
          transcription_status VARCHAR(50),
          analysis_summary TEXT,
          analysis_status VARCHAR(50),
          ai_tags JSONB,
          overall_status VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      addLog('info', 'audio_recordings 表已創建');
      
      // 插入 10 筆測試資料
      const testData = [
        { customer_id: 1, business_name: 'Tech Corp', product_name: 'AI Software', call_date: '2025-11-10', call_time: '09:30:00', audio_url: 'https://example.com/audio1.mp3', transcription_text: 'Customer inquired about AI software features, pricing and implementation timeline.', transcription_status: 'completed', analysis_summary: 'Customer interested in AI software, needs further quote and technical demo', analysis_status: 'completed', ai_tags: ['interested', 'demo_needed', 'budget_sufficient'], overall_status: 'pending' },
        { customer_id: 2, business_name: 'Finance Services', product_name: 'Investment Advisor', call_date: '2025-11-10', call_time: '10:15:00', audio_url: 'https://example.com/audio2.mp3', transcription_text: 'Discussed portfolio management, risk assessment and market analysis tools.', transcription_status: 'completed', analysis_summary: 'Customer requests further investment plan and cost analysis', analysis_status: 'completed', ai_tags: ['investment_mgmt', 'risk_assessment', 'data_analysis'], overall_status: 'pending' },
        { customer_id: 3, business_name: 'Retail Store', product_name: 'Inventory Management System', call_date: '2025-11-10', call_time: '11:00:00', audio_url: 'https://example.com/audio3.mp3', transcription_text: 'Inquired about system integration capability, cost and implementation timeline.', transcription_status: 'completed', analysis_summary: 'Customer satisfied with system features, needs demo and integration testing', analysis_status: 'completed', ai_tags: ['inventory_mgmt', 'system_integration', 'cost_effective'], overall_status: 'pending' },
        { customer_id: 4, business_name: 'Manufacturing', product_name: 'ERP System', call_date: '2025-11-10', call_time: '14:30:00', audio_url: 'https://example.com/audio4.mp3', transcription_text: 'Discussed production process optimization, report functionality and data visualization.', transcription_status: 'completed', analysis_summary: 'Customer needs customization solution, expected decision next week', analysis_status: 'completed', ai_tags: ['ERP', 'production_mgmt', 'customization'], overall_status: 'pending' },
        { customer_id: 5, business_name: 'Healthcare Institution', product_name: 'Patient Management System', call_date: '2025-11-10', call_time: '15:45:00', audio_url: 'https://example.com/audio5.mp3', transcription_text: 'Inquired about system security, compliance and patient data privacy protection.', transcription_status: 'completed', analysis_summary: 'Customer concerned about data privacy, needs compliance certificate and security assessment', analysis_status: 'completed', ai_tags: ['healthcare_compliance', 'data_security', 'privacy_protection'], overall_status: 'pending' },
        { customer_id: 1, business_name: 'Education Institution', product_name: 'Online Teaching Platform', call_date: '2025-11-11', call_time: '09:00:00', audio_url: 'https://example.com/audio6.mp3', transcription_text: 'Discussed course management, student interaction and online exam functionality.', transcription_status: 'completed', analysis_summary: 'Customer interested in platform features, planning trial', analysis_status: 'completed', ai_tags: ['online_education', 'interactive_features', 'learning_analytics'], overall_status: 'pending' },
        { customer_id: 2, business_name: 'Real Estate', product_name: 'Property Management System', call_date: '2025-11-11', call_time: '10:30:00', audio_url: 'https://example.com/audio7.mp3', transcription_text: 'Inquired about tenant management, maintenance work orders and fee calculation functionality.', transcription_status: 'completed', analysis_summary: 'Customer needs multi-property support, needs quote', analysis_status: 'completed', ai_tags: ['property_mgmt', 'tenant_service', 'auto_billing'], overall_status: 'pending' },
        { customer_id: 3, business_name: 'Logistics Company', product_name: 'Transportation Management System', call_date: '2025-11-11', call_time: '13:15:00', audio_url: 'https://example.com/audio8.mp3', transcription_text: 'Discussed route optimization, real-time tracking and fuel cost management.', transcription_status: 'completed', analysis_summary: 'Customer interested in cost saving effect', analysis_status: 'completed', ai_tags: ['logistics_mgmt', 'route_optimization', 'cost_saving'], overall_status: 'pending' },
        { customer_id: 4, business_name: 'Hotel Group', product_name: 'Booking Management System', call_date: '2025-11-11', call_time: '14:00:00', audio_url: 'https://example.com/audio9.mp3', transcription_text: 'Inquired about multi-language support, payment integration and customer relationship management functionality.', transcription_status: 'completed', analysis_summary: 'Customer planning to sign next month, needs final quote', analysis_status: 'completed', ai_tags: ['booking_mgmt', 'payment_integration', 'revenue_mgmt'], overall_status: 'pending' },
        { customer_id: 5, business_name: 'Law Firm', product_name: 'Case Management System', call_date: '2025-11-11', call_time: '15:30:00', audio_url: 'https://example.com/audio10.mp3', transcription_text: 'Discussed document management, time tracking and billing functionality.', transcription_status: 'completed', analysis_summary: 'Customer satisfied with system features, expected decision this month', analysis_status: 'completed', ai_tags: ['case_mgmt', 'document_mgmt', 'time_tracking'], overall_status: 'pending' }
      ];
      
      for (const data of testData) {
        await pool.query(`
          INSERT INTO audio_recordings (customer_id, business_name, product_name, call_date, call_time, audio_url, transcription_text, transcription_status, analysis_summary, analysis_status, ai_tags, overall_status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          data.customer_id,
          data.business_name,
          data.product_name,
          data.call_date,
          data.call_time,
          data.audio_url,
          data.transcription_text,
          data.transcription_status,
          data.analysis_summary,
          data.analysis_status,
          JSON.stringify(data.ai_tags),
          data.overall_status
        ]);
      }
      addLog('info', '10 筆測試資料已插入 audio_recordings 表');
    } else {
      addLog('info', 'audio_recordings 表已存在，清空舊資料並插入新資料...');
      
      // 清空舊資料
      await pool.query('DELETE FROM audio_recordings');
      addLog('info', '舊資料已清空');
      
      // 插入 10 筆測試資料
      const testData = [
        { customer_id: 1, business_name: 'Tech Corp', product_name: 'AI Software', call_date: '2025-11-10', call_time: '09:30:00', audio_url: 'https://example.com/audio1.mp3', transcription_text: 'Customer inquired about AI software features, pricing and implementation timeline.', transcription_status: 'completed', analysis_summary: 'Customer interested in AI software, needs further quote and technical demo', analysis_status: 'completed', ai_tags: ['interested', 'demo_needed', 'budget_sufficient'], overall_status: 'pending' },
        { customer_id: 2, business_name: 'Finance Services', product_name: 'Investment Advisor', call_date: '2025-11-10', call_time: '10:15:00', audio_url: 'https://example.com/audio2.mp3', transcription_text: 'Discussed portfolio management, risk assessment and market analysis tools.', transcription_status: 'completed', analysis_summary: 'Customer requests further investment plan and cost analysis', analysis_status: 'completed', ai_tags: ['investment_mgmt', 'risk_assessment', 'data_analysis'], overall_status: 'pending' },
        { customer_id: 3, business_name: 'Retail Store', product_name: 'Inventory Management System', call_date: '2025-11-10', call_time: '11:00:00', audio_url: 'https://example.com/audio3.mp3', transcription_text: 'Inquired about system integration capability, cost and implementation timeline.', transcription_status: 'completed', analysis_summary: 'Customer satisfied with system features, needs demo and integration testing', analysis_status: 'completed', ai_tags: ['inventory_mgmt', 'system_integration', 'cost_effective'], overall_status: 'pending' },
        { customer_id: 4, business_name: 'Manufacturing', product_name: 'ERP System', call_date: '2025-11-10', call_time: '14:30:00', audio_url: 'https://example.com/audio4.mp3', transcription_text: 'Discussed production process optimization, report functionality and data visualization.', transcription_status: 'completed', analysis_summary: 'Customer needs customization solution, expected decision next week', analysis_status: 'completed', ai_tags: ['ERP', 'production_mgmt', 'customization'], overall_status: 'pending' },
        { customer_id: 5, business_name: 'Healthcare Institution', product_name: 'Patient Management System', call_date: '2025-11-10', call_time: '15:45:00', audio_url: 'https://example.com/audio5.mp3', transcription_text: 'Inquired about system security, compliance and patient data privacy protection.', transcription_status: 'completed', analysis_summary: 'Customer concerned about data privacy, needs compliance certificate and security assessment', analysis_status: 'completed', ai_tags: ['healthcare_compliance', 'data_security', 'privacy_protection'], overall_status: 'pending' },
        { customer_id: 1, business_name: 'Education Institution', product_name: 'Online Teaching Platform', call_date: '2025-11-11', call_time: '09:00:00', audio_url: 'https://example.com/audio6.mp3', transcription_text: 'Discussed course management, student interaction and online exam functionality.', transcription_status: 'completed', analysis_summary: 'Customer interested in platform features, planning trial', analysis_status: 'completed', ai_tags: ['online_education', 'interactive_features', 'learning_analytics'], overall_status: 'pending' },
        { customer_id: 2, business_name: 'Real Estate', product_name: 'Property Management System', call_date: '2025-11-11', call_time: '10:30:00', audio_url: 'https://example.com/audio7.mp3', transcription_text: 'Inquired about tenant management, maintenance work orders and fee calculation functionality.', transcription_status: 'completed', analysis_summary: 'Customer needs multi-property support, needs quote', analysis_status: 'completed', ai_tags: ['property_mgmt', 'tenant_service', 'auto_billing'], overall_status: 'pending' },
        { customer_id: 3, business_name: 'Logistics Company', product_name: 'Transportation Management System', call_date: '2025-11-11', call_time: '13:15:00', audio_url: 'https://example.com/audio8.mp3', transcription_text: 'Discussed route optimization, real-time tracking and fuel cost management.', transcription_status: 'completed', analysis_summary: 'Customer interested in cost saving effect', analysis_status: 'completed', ai_tags: ['logistics_mgmt', 'route_optimization', 'cost_saving'], overall_status: 'pending' },
        { customer_id: 4, business_name: 'Hotel Group', product_name: 'Booking Management System', call_date: '2025-11-11', call_time: '14:00:00', audio_url: 'https://example.com/audio9.mp3', transcription_text: 'Inquired about multi-language support, payment integration and customer relationship management functionality.', transcription_status: 'completed', analysis_summary: 'Customer planning to sign next month, needs final quote', analysis_status: 'completed', ai_tags: ['booking_mgmt', 'payment_integration', 'revenue_mgmt'], overall_status: 'pending' },
        { customer_id: 5, business_name: 'Law Firm', product_name: 'Case Management System', call_date: '2025-11-11', call_time: '15:30:00', audio_url: 'https://example.com/audio10.mp3', transcription_text: 'Discussed document management, time tracking and billing functionality.', transcription_status: 'completed', analysis_summary: 'Customer satisfied with system features, expected decision this month', analysis_status: 'completed', ai_tags: ['case_mgmt', 'document_mgmt', 'time_tracking'], overall_status: 'pending' }
      ];
      
      for (const data of testData) {
        await pool.query(`
          INSERT INTO audio_recordings (customer_id, business_name, product_name, call_date, call_time, audio_url, transcription_text, transcription_status, analysis_summary, analysis_status, ai_tags, overall_status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          data.customer_id,
          data.business_name,
          data.product_name,
          data.call_date,
          data.call_time,
          data.audio_url,
          data.transcription_text,
          data.transcription_status,
          data.analysis_summary,
          data.analysis_status,
          JSON.stringify(data.ai_tags),
          data.overall_status
        ]);
      }
      addLog('info', '10 筆新測試資料已插入 audio_recordings 表');
    }
  } catch (err) {
    addLog('error', '初始化數據庫失敗', err.message);
  }
}

// 延遲初始化，等待連接池完全建立
setTimeout(initializeDatabase, 1000);

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
    // 使用 PostgreSQL COALESCE 和 CAST 將 annual_consumption 轉換為 NUMERIC
    const result = await pool.query(`
      SELECT *,
        COALESCE(annual_consumption::NUMERIC, 0) as annual_consumption_numeric
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
    // 註權：不接受 nfvp_score_n 和 nfvp_score_f，只接受 nfvp_score
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
      'status': 'status',
      'product_url': 'product_url',
      'ai_analysis': 'ai_analysis',
      'n_score': 'n_score',
      'f_score': 'f_score'
    };

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
    console.log('Update Query:', updateQuery);
    console.log('Values:', values);
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

// 音檔列表端點
app.get('/api/audio/list', async (req, res) => {
  try {
    const pool = pools.online;
    if (!pool) {
      return res.status(500).json({ error: '數據庫未連接' });
    }

    const result = await pool.query(`
      SELECT 
        id,
        customer_id,
        business_name,
        product_name,
        call_date,
        call_time,
        audio_url,
        transcription_text,
        transcription_status,
        analysis_summary,
        analysis_status,
        ai_tags,
        overall_status,
        created_at,
        updated_at
      FROM audio_recordings
      ORDER BY created_at DESC
      LIMIT 100
    `);
    
    const audioList = result.rows || [];
    res.json(audioList);
  } catch (err) {
    addLog('error', '獲取音檔列表失敗', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 音檔檔名解析端點
app.post('/api/audio/parse-filename', async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: '缺少檔名' });
    }

    // 移除副檔名
    const nameWithoutExt = filename.replace(/\.[^\/\.]+$/, '');
    
    // 分割檔名
    const parts = nameWithoutExt.split('_');
    
    if (parts.length < 5) {
      return res.status(400).json({ 
        error: '檔名格式不正確，應為：YYYYMMDDNNNN_業務名_產品名_MMDD_HHMM.mp3' 
      });
    }

    const [customerIdStr, salespersonName, productName, dateStr, timeStr] = parts;

    // 驗證客戶編號（12 位數字）
    if (!/^\d{12}$/.test(customerIdStr)) {
      return res.status(400).json({ 
        error: '客戶編號應為 12 位數字（YYYYMMDDNNNN）' 
      });
    }

    const year = customerIdStr.substring(0, 4);
    const month = customerIdStr.substring(4, 6);
    const day = customerIdStr.substring(6, 8);
    const customerId = customerIdStr.substring(8, 12);

    // 驗證撥打日期（4 位數字 MMDD）
    if (!/^\d{4}$/.test(dateStr)) {
      return res.status(400).json({ 
        error: '撥打日期應為 4 位數字（MMDD）' 
      });
    }

    const callMonth = dateStr.substring(0, 2);
    const callDay = dateStr.substring(2, 4);
    const currentYear = new Date().getFullYear();
    const callDate = `${currentYear}-${callMonth}-${callDay}`;

    // 驗證撥打時間（4 位數字 HHMM）
    if (!/^\d{4}$/.test(timeStr)) {
      return res.status(400).json({ 
        error: '撥打時間應為 4 位數字（HHMM）' 
      });
    }

    const hour = timeStr.substring(0, 2);
    const minute = timeStr.substring(2, 4);
    const callTime = `${hour}:${minute}:00`;

    // 返回解析結果
    res.json({
      filename: filename,
      customer_id: customerId,
      customer_registration_date: `${year}-${month}-${day}`,
      salesperson_name: salespersonName,
      product_name: productName,
      call_date: callDate,
      call_time: callTime
    });
  } catch (err) {
    addLog('error', '檔名解析失敗', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 音檔上傳端點
app.post('/api/audio/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '沒有選擇文件' });
    }

    // 修復檔名編碼問題：移除特殊字符，保留字母數字和下劃線
    let fileName = req.file.originalname;
    // 使用 Buffer 確保正確的 UTF-8 編碼
    fileName = Buffer.from(fileName, 'utf8').toString('utf8');
    // 移除可能導致問題的特殊字符，但保留中文字符
    // fileName = fileName.replace(/[^\w\u4e00-\u9fa5.-]/g, '_');
    // 或者使用 URL 編碼
    // fileName = encodeURIComponent(fileName);
    addLog('info', '【檔名診斷】原始檔名', { originalname: req.file.originalname, encodedName: fileName });

    // 嘗試解析 req.body.data
    let parsedData = {};
    if (req.body.data) {
      try {
        parsedData = JSON.parse(req.body.data);
      } catch (e) {
        addLog('warn', '解析 data 字段失敗', e.message);
      }
    }

    // ---------- Step 1：上傳到 R2 ----------
    const recordingId = Date.now();
    const fileKey = `audio-recordings/${recordingId}/${fileName}`;
    let audioUrl = '';

    try {
      // 診斷：檢查 R2 Client 是否初始化
      if (!r2Client) {
        addLog('error', '❌ R2 Client 未初始化', {
          R2_ENDPOINT: process.env.R2_ENDPOINT ? '已設置' : '未設置',
          R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? '已設置' : '未設置',
          R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? '已設置' : '未設置',
        });
        return res.status(500).json({ error: 'R2 Client 未初始化' });
      }

      addLog('info', '開始上傳到 R2', {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        fileName: fileName,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });

      const putCommand = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      });

      addLog('info', '【R2 診斷】PutObjectCommand 已構建，準備發送...');
      const uploadResponse = await r2Client.send(putCommand);
      addLog('info', '【R2 診斷】上傳命令執行完成', {
        ETag: uploadResponse.ETag,
        VersionId: uploadResponse.VersionId,
      });

      // 公開網址
      audioUrl = `${process.env.R2_PUBLIC_URL}/${fileKey}`;

      addLog('info', '✅ 音檔成功上傳到 R2', { 
        audioUrl, 
        fileKey,
        fileName: fileName,
        recordingId: recordingId
      });

    } catch (err) {
      addLog('error', '❌ R2 上傳失敗', {
        fileName: fileName,
        fileKey: fileKey,
        message: err.message,
        code: err.code,
        statusCode: err.statusCode,
      });
      return res.status(500).json({ error: 'R2 上傳失敗：' + err.message });
    }

    // ---------- Step 2：寫入資料庫（可選） ----------
    const pool = pools.online;
    if (pool) {
      try {
        const customerNumber = parsedData.customer_id || null;
        const businessName = parsedData.salesperson_name || '';
        const productName = parsedData.product_name || '';
        const callDate = parsedData.call_date || new Date().toISOString().split('T')[0];
        const callTime = parsedData.call_time || '00:00:00';

        const result = await pool.query(
          `INSERT INTO audio_recordings 
          (customer_id, business_name, product_name, call_date, call_time, audio_url,
           transcription_status, analysis_status, overall_status, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,'pending','pending','processing',NOW(),NOW())
           RETURNING id`,
          [customerNumber, businessName, productName, callDate, callTime, audioUrl]
        );

        // 使用數據庫返回的真正 ID（如果成功）
        recordingId = result.rows[0].id;

        addLog('info', '✅ DB 已建立音檔記錄', {
          recordingId: result.rows[0].id,
          customerNumber,
          fileName: fileName,
          audioUrl: audioUrl
        });

      } catch (dbErr) {
        addLog('warn', '⚠️ DB 寫入失敗（但 R2 上傳成功），使用時間戳作為 recordingId', {
          message: dbErr.message,
          fileName: fileName,
          audioUrl: audioUrl,
          recordingId: recordingId
        });
      }
    } else {
      addLog('warn', '⚠️ DB 未連接（但 R2 上傳已成功）');
    }

    // ---------- 回傳 ----------
    res.json({
      success: true,
      recording_id: recordingId,
      audio_url: audioUrl,
      message: '成功'
    });

  } catch (err) {
    addLog('error', '❌ 音檔上傳流程錯誤', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 音檔刪除端點
app.delete('/api/audio/delete/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const pool = pools.online;
    if (!pool) {
      return res.status(500).json({ error: '數據庫未連接' });
    }

    // 獲取當前的 audio_url
    const result = await pool.query(
      'SELECT audio_url FROM customers WHERE id = $1',
      [customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '客戶不存在' });
    }

    const audioUrl = result.rows[0].audio_url;
    
    // 刪除文件
    if (audioUrl) {
      const filePath = path.join('./uploads', path.basename(audioUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // 更新數據庫，移除 audio_url
    await pool.query(
      'UPDATE customers SET audio_url = NULL WHERE id = $1',
      [customerId]
    );

    addLog('info', '音檔已刪除', { customerId });
    res.json({ success: true, message: '音檔已刪除' });
  } catch (err) {
    addLog('error', '音檔刪除失敗', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 音檔下載端點
app.get('/uploads/:fileName', (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join('./uploads', fileName);
    
    // 安全檢查：防止目錄遍歷攻擊
    if (!filePath.startsWith(path.resolve('./uploads'))) {
      return res.status(403).json({ error: '禁止訪問' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    res.download(filePath);
  } catch (err) {
    addLog('error', '音檔下載失敗', err.message);
    res.status(500).json({ error: err.message });
  }
});


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
        audio_url TEXT,
        product_url TEXT,
        ai_analysis TEXT,
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
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '客戶不存在' });
    }

    addLog('info', '客戶已刪除', { id });
    res.json({ success: true, message: '客戶已刪除' });
  } catch (err) {
    addLog('error', '刪除客戶失敗', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error(err.stack)
  addLog('error', '伺服器錯誤', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  })
});


// 音檔上傳 API

// 音檔刪除 API
app.delete('/api/audio/delete/:customerId', async (req, res) => {
  try {
    // 這裡可以根據 customerId 查詢並刪除對應的音檔
    // 暫時返回成功
    res.json({ success: true, message: '音檔已刪除' });
  } catch (error) {
    console.error('音檔刪除錯誤:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI 分析 API

// 帶有 AI 分析的客戶更新端點
app.put('/api/customers/:id/update-with-analysis', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    
    const pool = pools.online;
    if (!pool) {
      return res.status(500).json({ error: 'ONLINE 數據庫未連接' });
    }

    // 第一步：更新客戶信息
    const updates = [];
    const values = [];
    let paramIndex = 1;

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
      'product_url': 'product_url',
      'n_score': 'n_score',
      'f_score': 'f_score',
      'ai_analysis_history': 'ai_analysis_history'
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      // 跳過 ai_analysis_history，它會在合併邏輯中單獨處理
      if (key === 'ai_analysis_history') continue;
      
      if (body[key] !== undefined) {
        let value = body[key];
        if (['price', 'budget', 'total_consumption', 'annual_consumption', 'capital_amount', 'nfvp_score'].includes(dbField)) {
          if (value !== null && value !== '') {
            value = parseFloat(value);
            if (isNaN(value)) value = null;
          } else {
            value = null;
          }
        }
        updates.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '沒有提供任何更新字段' });
    }

    // 第二步：獲取客戶當前信息（用於 AI 分析）
    const customerResult = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: '客戶不存在' });
    }

    const customer = customerResult.rows[0];
    
    // 第三步：調用 AI 分析
    let analysisResult = null;
    let audioTranscription = null;
    
    if (process.env.OPENAI_API_KEY) {
      // 如果有音檔，先進行轉錄
      if (body.audio_url || customer.audio_url) {
        const audioUrl = body.audio_url || customer.audio_url;
        try {
          const audioResponse = await fetch(audioUrl);
          if (audioResponse.ok) {
            const audioBuffer = await audioResponse.arrayBuffer();
            const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
            
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.mp3');
            formData.append('model', 'whisper-1');
            formData.append('language', 'zh');
            
            const transcribeResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
              body: formData
            });
            
            if (transcribeResponse.ok) {
              const transcribeData = await transcribeResponse.json();
              audioTranscription = transcribeData.text;
            }
          }
        } catch (err) {
          console.error('音檔轉錄失敗:', err);
        }
      }

      // 構建 AI 分析提示詞
      const nScore = body.n_score !== undefined ? body.n_score : customer.n_score || 0;
      const fScore = body.f_score !== undefined ? body.f_score : customer.f_score || 0;
      const vScore = customer.v_score || 0;
      const pScore = customer.p_score || 0;
      const budget = body.budget !== undefined ? body.budget : customer.budget || 0;
      const hasAudio = !!(body.audio_url || customer.audio_url);

      let prompt = `根據以下客戶信息進行銷售分析：

客戶名稱：${body.name || customer.name}
公司名稱：${body.company_name || customer.company_name}
詢問產品：${body.initial_product || customer.initial_product}
預算：${budget}
資本額：${body.capital_amount || customer.capital_amount || '未提供'}
年度消費：${body.annual_consumption || customer.annual_consumption || '未提供'}
總消費：${body.total_consumption || customer.total_consumption || '未提供'}

評分指標：
- N評分（需求度）：${nScore}
- F評分（資金能力）：${fScore}
- V評分（採購量）：${vScore}
- P評分（報價額）：${pScore}`;

      if (audioTranscription) {
        prompt += `

客戶通話記錄：
${audioTranscription}`;
      }

      prompt += `

請根據上述信息分析成交機率和建議行動。`;

      // 調用 OpenAI API
      try {
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: '你是一位專業的銷售顧問師。你的回答必須一字一字遵從下列格式，不要有任何其他內容:\n\n成交機率：(XX%)\n建議行動：\n- 建議一\n- 建議二\n- 建議三\n- 建議四\n\n不要添加任何其他文字、數字或符號。'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 500
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          analysisResult = aiData.choices[0].message.content;
        }
      } catch (err) {
        console.error('AI 分析失敗:', err);
      }
    }

    // 第四步：更新 ai_analysis_history
    let historyJson = [];
    // 優先使用 body 中的 ai_analysis_history（前端發送的最新值），如果沒有則使用數據庫中的舊值
    const aiAnalysisHistoryStr = body.ai_analysis_history || customer.ai_analysis_history;
    console.log('[DEBUG] 客戶現有的 ai_analysis_history:', aiAnalysisHistoryStr);
    if (aiAnalysisHistoryStr) {
      try {
        historyJson = JSON.parse(aiAnalysisHistoryStr);
        if (!Array.isArray(historyJson)) {
          historyJson = [];
        }
      } catch (err) {
        console.error('[DEBUG] JSON 解析失敗:', err.message);
        historyJson = [];
      }
    }
    console.log('[DEBUG] 解析後的 historyJson 長度:', historyJson.length);
    console.log('[DEBUG] 解析後的 historyJson 內容:', JSON.stringify(historyJson, null, 2));

    if (analysisResult) {
      // 提取成交機率
      const probabilityMatch = analysisResult.match(/成交機率：\((\d+)%\)/);
      const probability = probabilityMatch ? parseInt(probabilityMatch[1]) : null;

      // 生成時間軸文字（GMT+8）
      const timestamp = new Date();
      const timeStr = timestamp.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
      let timelineText = `${timeStr} | 成交率：${probability}%`;
      
      // 如果有前一條記錄，計算變化
      if (historyJson.length > 0) {
        const previousRecord = historyJson[historyJson.length - 1];
        const previousProb = previousRecord.probability;
        if (previousProb !== null && probability !== null) {
          const diff = probability - previousProb;
          const arrow = diff > 0 ? '⬆️' : diff < 0 ? '⬇️' : '→';
          const diffText = diff > 0 ? `+${diff}%` : `${diff}%`;
          timelineText += ` | ${arrow} ${diffText}`;
        }
      }

      historyJson.push({
        timestamp: timestamp.toISOString(),
        probability: probability,
        recommendations: analysisResult,
        has_audio: !!(body.audio_url || customer.audio_url),
        audio_transcription: audioTranscription || null,
        timeline_text: timelineText
      });
      console.log('[DEBUG] 添加新記錄後的 historyJson 長度:', historyJson.length);
      console.log('[DEBUG] 添加新記錄後的 historyJson 內容:', JSON.stringify(historyJson, null, 2));
    }

    // 第五步：保存更新
    updates.push(`ai_analysis_history = $${paramIndex}`);
    values.push(JSON.stringify(historyJson));
    paramIndex++;

    if (analysisResult) {
      updates.push(`ai_analysis = $${paramIndex}`);
      values.push(analysisResult);
      paramIndex++;
    }

    values.push(id);
    const updateQuery = `UPDATE customers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(updateQuery, values);

    addLog('info', `客戶 ${id} 信息已更新並進行了 AI 分析`);
    res.json({
      success: true,
      customer: result.rows[0],
      analysis: analysisResult,
      history: historyJson
    });
  } catch (err) {
    addLog('error', '更新客戶失敗', err.message);
    res.status(500).json({
      error: '更新客戶失敗',
      message: err.message
    });
  }
});


app.post('/api/analyze-customer', async (req, res) => {
  try {
    const { customerId, prompt } = req.body;
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ success: false, error: 'OpenAI API Key 未設置' });
    }
    
    // 調用 OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '你是一位專業的銷售顧問師。你的回答必須一字一字遵從下列格式，不要有任何其他內容:\n\n成交機率：(XX%)\n建議行動：\n- 建議一\n- 建議二\n- 建議三\n- 建議四\n\n不要添加任何其他文字、數字或符號。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API 错誤: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const analysis = data.choices[0].message.content;
    
    res.json({ 
      success: true, 
      analysis: analysis
    });
  } catch (error) {
    console.error('AI 分析错誤:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/// API: 初始化測試數據
app.get('/api/init-test-data', async (req, res) => {
  try {
    const pool = pools.online;
    if (!pool) {
      return res.status(500).json({ error: '數據庫未連接' });
    }

    // 10 筆測試數據
    const testData = [
      { customer_id: 1, business_name: '科技公司', product_name: 'AI 軟件', call_date: '2025-11-10', call_time: '09:30', audio_url: 'https://example.com/audio1.mp3', transcription_text: '客戶詢問 AI 軟件的功能、價格和實施時間。我們介紹了系統的核心功能，包括自然語言處理、機器學習和數據分析。客戶對我們的解決方案很感興趣，要求進一步的技術演示和報價。', transcription_status: 'completed', analysis_summary: '客戶對 AI 軟件感興趣，需要進一步報價和技術演示', analysis_status: 'completed', ai_tags: ["感興趣", "需要演示", "預算充足"], overall_status: 'pending' },
      { customer_id: 2, business_name: '金融服務', product_name: '投資顧問', call_date: '2025-11-10', call_time: '10:15', audio_url: 'https://example.com/audio2.mp3', transcription_text: '討論投資組合管理、風險評估和市場分析工具。客戶詢問系統如何處理複雜的投資策略和實時數據更新。我們展示了系統的實時分析能力和自定義報表功能。', transcription_status: 'completed', analysis_summary: '客戶要求進一步的投資方案和成本分析', analysis_status: 'completed', ai_tags: ["投資管理", "風險評估", "數據分析"], overall_status: 'pending' },
      { customer_id: 3, business_name: '零售商', product_name: '庫存管理系統', call_date: '2025-11-10', call_time: '11:00', audio_url: 'https://example.com/audio3.mp3', transcription_text: '詢問系統的集成能力、成本和實施周期。客戶關注系統如何與現有的 POS 系統和供應鏈管理系統集成。我們介紹了 API 集成方案和數據同步功能。', transcription_status: 'completed', analysis_summary: '客戶對系統功能滿意，需要演示和集成測試', analysis_status: 'completed', ai_tags: ["庫存管理", "系統集成", "成本效益"], overall_status: 'pending' },
      { customer_id: 4, business_name: '製造業', product_name: 'ERP 系統', call_date: '2025-11-10', call_time: '14:30', audio_url: 'https://example.com/audio4.mp3', transcription_text: '討論生產流程優化、報表功能和數據可視化。客戶詢問系統如何支持多工廠管理和跨部門協作。我們介紹了系統的模塊化設計和定制化方案。', transcription_status: 'completed', analysis_summary: '客戶需要定制化方案，預計下周決定', analysis_status: 'completed', ai_tags: ["ERP", "生產管理", "定制化"], overall_status: 'pending' },
      { customer_id: 5, business_name: '醫療機構', product_name: '患者管理系統', call_date: '2025-11-10', call_time: '15:45', audio_url: 'https://example.com/audio5.mp3', transcription_text: '詢問系統的安全性、合規性和患者數據隱私保護。客戶關注 HIPAA 和其他醫療數據保護法規的合規性。我們介紹了系統的加密、訪問控制和審計日誌功能。', transcription_status: 'completed', analysis_summary: '客戶關注數據隱私，需要合規證書和安全評估', analysis_status: 'completed', ai_tags: ["醫療合規", "數據安全", "隱私保護"], overall_status: 'pending' },
      { customer_id: 1, business_name: '教育機構', product_name: '在線教學平台', call_date: '2025-11-11', call_time: '09:00', audio_url: 'https://example.com/audio6.mp3', transcription_text: '討論課程管理、學生互動和在線考試功能。客戶詢問系統如何支持實時互動、錄製課程和學習分析。我們展示了系統的直播功能和學習進度追蹤。', transcription_status: 'completed', analysis_summary: '客戶對平台功能感興趣，計劃試用', analysis_status: 'completed', ai_tags: ["在線教育", "互動功能", "學習分析"], overall_status: 'pending' },
      { customer_id: 2, business_name: '房地產', product_name: '物業管理系統', call_date: '2025-11-11', call_time: '10:30', audio_url: 'https://example.com/audio7.mp3', transcription_text: '詢問租戶管理、維護工單和費用計算功能。客戶關注系統如何支持多物業管理和自動化計費。我們介紹了系統的租戶門戶和移動應用。', transcription_status: 'completed', analysis_summary: '客戶需要多物業支持，需要報價', analysis_status: 'completed', ai_tags: ["物業管理", "租戶服務", "自動計費"], overall_status: 'pending' },
      { customer_id: 3, business_name: '物流公司', product_name: '運輸管理系統', call_date: '2025-11-11', call_time: '13:15', audio_url: 'https://example.com/audio8.mp3', transcription_text: '討論路線優化、實時追蹤和燃油成本管理。客戶詢問系統如何幫助降低運輸成本和提高交付效率。我們展示了系統的 GPS 追蹤和路線規劃算法。', transcription_status: 'completed', analysis_summary: '客戶對成本節省效果感興趣', analysis_status: 'completed', ai_tags: ["物流管理", "路線優化", "成本節省"], overall_status: 'pending' },
      { customer_id: 4, business_name: '酒店集團', product_name: '預訂管理系統', call_date: '2025-11-11', call_time: '14:00', audio_url: 'https://example.com/audio9.mp3', transcription_text: '詢問多語言支持、支付集成和客戶關係管理功能。客戶關注系統如何與 OTA 平台集成和管理預訂。我們介紹了系統的多渠道預訂和收益管理功能。', transcription_status: 'completed', analysis_summary: '客戶計劃下月簽約，需要最終報價', analysis_status: 'completed', ai_tags: ["預訂管理", "支付集成", "收益管理"], overall_status: 'pending' },
      { customer_id: 5, business_name: '律師事務所', product_name: '案件管理系統', call_date: '2025-11-11', call_time: '15:30', audio_url: 'https://example.com/audio10.mp3', transcription_text: '討論文件管理、時間追蹤和計費功能。客戶詢問系統如何支持案件協作和客戶溝通。我們展示了系統的文件版本控制和自動計費功能。', transcription_status: 'completed', analysis_summary: '客戶對系統功能滿意，預計本月決定', analysis_status: 'completed', ai_tags: ["案件管理", "文件管理", "時間追蹤"], overall_status: 'pending' }
    ];

    // 清空現有數據
    await pool.query('DELETE FROM audio_recordings');
    addLog('info', '已清空 audio_recordings 表');

    // 插入測試數據
    let insertedCount = 0;
    for (const data of testData) {
      const query = `
        INSERT INTO audio_recordings 
        (customer_id, business_name, product_name, call_date, call_time, audio_url, 
         transcription_text, transcription_status, analysis_summary, analysis_status, 
         ai_tags, overall_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      `;
      
      const values = [
        data.customer_id,
        data.business_name,
        data.product_name,
        data.call_date,
        data.call_time,
        data.audio_url,
        data.transcription_text,
        data.transcription_status,
        data.analysis_summary,
        data.analysis_status,
        data.ai_tags ? JSON.stringify(data.ai_tags) : '[]',
        data.overall_status
      ];
      
      await pool.query(query, values);
      insertedCount++;
    }

    addLog('info', `已插入 ${insertedCount} 筆測試數據到 audio_recordings 表`);

    res.json({
      success: true,
      message: `已成功插入 ${insertedCount} 筆測試數據`,
      count: insertedCount
    });
  } catch (err) {
    addLog('error', '初始化測試數據失敗', err.message);
    res.status(500).json({ error: err.message });
  }
});

/// 静态文件服勑 - 音檔
app.use('/uploads', express.static('uploads'));

/// API: 解析音檔檔名並更新數據庫
function parseAudioFilename(filename) {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  const parts = nameWithoutExt.split('_');
  
  if (parts.length !== 5) {
    throw new Error(`檔名格式不正確，預期 5 個部分，實際 ${parts.length} 個。檔名：${filename}`);
  }
  
  const [customerCode, salesperson, product, callDateCode, callTimeCode] = parts;
  
  const customerYear = customerCode.substring(0, 4);
  const customerMonth = customerCode.substring(4, 6);
  const customerDay = customerCode.substring(6, 8);
  const customerId = parseInt(customerCode.substring(8), 10);
  const customerRegistrationDate = `${customerYear}-${customerMonth}-${customerDay}`;
  
  const salespersonName = salesperson;
  const productName = product;
  
  const callMonth = callDateCode.substring(0, 2);
  const callDay = callDateCode.substring(2, 4);
  const callDate = `2025-${callMonth}-${callDay}`;
  
  const callHour = callTimeCode.substring(0, 2);
  const callMinute = callTimeCode.substring(2, 4);
  const callTime = `${callHour}:${callMinute}:00`;
  
  return {
    customerId,
    customerRegistrationDate,
    salespersonName,
    productName,
    callDate,
    callTime,
    audioUrl: `/uploads/${filename}`
  };
}

app.post('/api/audio/parse-and-update', async (req, res) => {
  try {
    const { filename, recordId } = req.body;
    
    if (!filename || !recordId) {
      return res.status(400).json({ error: '缺少 filename 或 recordId' });
    }
    
    // 解析檔名
    const parsed = parseAudioFilename(filename);
    addLog('info', '檔名解析成功', JSON.stringify(parsed));
    
    const pool = pools.online;
    if (!pool) {
      return res.status(500).json({ error: '數據庫未連接' });
    }
    
    // 更新數據庫
    const updateResult = await pool.query(`
      UPDATE audio_recordings
      SET
        customer_id = $1,
        business_name = $2,
        product_name = $3,
        call_date = $4,
        call_time = $5,
        audio_url = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [
      parsed.customerId,
      parsed.salespersonName,
      parsed.productName,
      parsed.callDate,
      parsed.callTime,
      parsed.audioUrl,
      recordId
    ]);
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: `找不到 ID 為 ${recordId} 的記錄` });
    }
    
    addLog('info', '音檔記錄已更新', `ID: ${recordId}`);
    
    res.json({
      success: true,
      message: '記錄已更新',
      data: updateResult.rows[0]
    });
  } catch (err) {
    addLog('error', '解析或更新音檔記錄失敗', err.message);
    res.status(500).json({ error: err.message });
  }
});

// R2 音檔上傳端點

app.listen(PORT, () => {
  addLog('info', `CRM 3.0 服務器啟動成功，監聽端口 ${PORT}`);
  console.log(`
╔════════════════════════════════════════╗
║     CRM 3.0 - 客戶關係管理系統         ║
╚════════════════════════════════════════╝

✅ 伺服器已啟動
📍 地址: http://localhost:${PORT}
🌐 環境: ${process.env.NODE_ENV || 'production'}
⏰ 時間: ${new Date().toLocaleString('zh-TW')}

準備好了！請訪問應用程序。
  `);
});

// 優雅關閉
process.on('SIGTERM', async () => {
  addLog('info', '收到 SIGTERM，開始優雅關閉');
  for (const pool of Object.values(pools)) {
    if (pool) {
      await pool.end();
    }
  }
  process.exit(0);
});
