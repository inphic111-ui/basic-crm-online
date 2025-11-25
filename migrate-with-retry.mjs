import pkg from 'pg';
const { Client } = pkg;

const connectionConfig = {
  host: 'junction.proxy.rlwy.net',
  port: 18663,
  user: 'postgres',
  password: 'ogzTiXiZsfxqloDQwcjwVdIpQkgEQxFe',
  database: 'railway',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  query_timeout: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

async function executeWithRetry(client, query, description, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[嘗試 ${attempt}/${maxRetries}] ${description}`);
      await client.query(query);
      console.log(`✅ ${description} 成功`);
      return true;
    } catch (error) {
      console.error(`❌ ${description} 失敗 (嘗試 ${attempt}/${maxRetries}):`, error.message);
      if (attempt < maxRetries) {
        console.log(`等待 2 秒後重試...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  return false;
}

async function migrate() {
  const client = new Client(connectionConfig);
  
  try {
    console.log('正在連接到 PostgreSQL...');
    await client.connect();
    console.log('✅ 已連接到 PostgreSQL');
    
    // 檢查現有欄位
    console.log('\n檢查現有欄位...');
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ci_customers'
      ORDER BY ordinal_position
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    console.log('現有欄位:', existingColumns.join(', '));
    
    // 定義需要添加的欄位
    const fieldsToAdd = [
      { name: 'radar_purchase_intention', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS radar_purchase_intention INTEGER DEFAULT 0', desc: '購買意願分數' },
      { name: 'radar_budget_capacity', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS radar_budget_capacity INTEGER DEFAULT 0', desc: '預算能力分數' },
      { name: 'radar_decision_urgency', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS radar_decision_urgency INTEGER DEFAULT 0', desc: '決策急迫性分數' },
      { name: 'radar_trust_level', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS radar_trust_level INTEGER DEFAULT 0', desc: '信任程度分數' },
      { name: 'radar_communication_quality', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS radar_communication_quality INTEGER DEFAULT 0', desc: '溝通品質分數' },
      { name: 'radar_repeat_potential', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS radar_repeat_potential INTEGER DEFAULT 0', desc: '回購潛力分數' },
      { name: 'sales_analysis', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS sales_analysis JSONB', desc: '銷售分析' },
      { name: 'communication_timeline', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS communication_timeline JSONB DEFAULT \'[]\'::jsonb', desc: '溝通紀錄時間軸' },
      { name: 'decision_structure', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS decision_structure JSONB', desc: '決策結構' },
      { name: 'detailed_report', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS detailed_report TEXT', desc: '詳細報告' },
      { name: 'customer_company', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS customer_company VARCHAR(255)', desc: '客戶公司' },
      { name: 'customer_title', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS customer_title VARCHAR(100)', desc: '客戶職稱' },
      { name: 'customer_phone', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50)', desc: '客戶電話' },
      { name: 'customer_email', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255)', desc: '客戶電子郵件' },
      { name: 'customer_address', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS customer_address TEXT', desc: '客戶地址' },
      { name: 'product_category', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS product_category VARCHAR(100)', desc: '產品類別' },
      { name: 'product_specs', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS product_specs TEXT', desc: '產品規格' },
      { name: 'quote_amount', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS quote_amount DECIMAL(15,2)', desc: '報價金額' },
      { name: 'quote_date', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS quote_date DATE', desc: '報價日期' },
      { name: 'quote_status', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS quote_status VARCHAR(50)', desc: '報價狀態' },
      { name: 'total_interactions', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS total_interactions INTEGER DEFAULT 0', desc: '總互動次數' },
      { name: 'last_interaction_date', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS last_interaction_date TIMESTAMP', desc: '最後互動日期' },
      { name: 'ai_analysis_status', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS ai_analysis_status VARCHAR(50) DEFAULT \'pending\'', desc: 'AI 分析狀態' },
      { name: 'ai_analysis_date', query: 'ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS ai_analysis_date TIMESTAMP', desc: 'AI 分析完成時間' }
    ];
    
    console.log(`\n需要添加 ${fieldsToAdd.length} 個欄位\n`);
    
    let addedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    
    for (const field of fieldsToAdd) {
      if (existingColumns.includes(field.name)) {
        console.log(`⏭️  ${field.name} (${field.desc}) - 已存在，跳過`);
        skippedCount++;
      } else {
        const success = await executeWithRetry(client, field.query, `添加 ${field.name} (${field.desc})`);
        if (success) {
          addedCount++;
        } else {
          failedCount++;
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('遷移完成！');
    console.log('='.repeat(60));
    console.log(`✅ 成功添加: ${addedCount} 個欄位`);
    console.log(`⏭️  跳過: ${skippedCount} 個欄位（已存在）`);
    console.log(`❌ 失敗: ${failedCount} 個欄位`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ 遷移失敗:', error.message);
    console.error('錯誤詳情:', error);
  } finally {
    await client.end();
    console.log('\n資料庫連接已關閉');
  }
}

migrate();
