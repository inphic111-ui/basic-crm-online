import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:ogzTiXiZsfxqloDQwcjwVdIpQkgEQxFe@junction.proxy.rlwy.net:18663/railway',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('開始資料庫遷移：添加 AI 分析欄位...');
    
    // 檢查欄位是否已存在
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ci_customers'
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    console.log('現有欄位:', existingColumns);
    
    // 需要添加的欄位
    const fieldsToAdd = [
      // 雷達圖分數（6個維度，0-100）
      { name: 'radar_purchase_intention', type: 'INTEGER DEFAULT 0', comment: '購買意願分數' },
      { name: 'radar_budget_capacity', type: 'INTEGER DEFAULT 0', comment: '預算能力分數' },
      { name: 'radar_decision_urgency', type: 'INTEGER DEFAULT 0', comment: '決策急迫性分數' },
      { name: 'radar_trust_level', type: 'INTEGER DEFAULT 0', comment: '信任程度分數' },
      { name: 'radar_communication_quality', type: 'INTEGER DEFAULT 0', comment: '溝通品質分數' },
      { name: 'radar_repeat_potential', type: 'INTEGER DEFAULT 0', comment: '回購潛力分數' },
      
      // 銷售分析 JSON
      { name: 'sales_analysis', type: 'JSONB', comment: '銷售分析（報價、成交機率、建議策略）' },
      
      // 溝通紀錄時間軸 JSON
      { name: 'communication_timeline', type: 'JSONB DEFAULT \'[]\'::jsonb', comment: '溝通紀錄時間軸' },
      
      // 詳細報告
      { name: 'detailed_report', type: 'TEXT', comment: 'AI 生成的詳細分析報告' },
      
      // 客戶基本資訊
      { name: 'customer_company', type: 'VARCHAR(255)', comment: '客戶公司名稱' },
      { name: 'customer_title', type: 'VARCHAR(100)', comment: '客戶職稱' },
      { name: 'customer_phone', type: 'VARCHAR(50)', comment: '客戶電話' },
      { name: 'customer_email', type: 'VARCHAR(255)', comment: '客戶電子郵件' },
      { name: 'customer_address', type: 'TEXT', comment: '客戶地址' },
      
      // 產品資訊
      { name: 'product_category', type: 'VARCHAR(100)', comment: '產品類別' },
      { name: 'product_specs', type: 'TEXT', comment: '產品規格' },
      
      // 報價資訊
      { name: 'quote_amount', type: 'DECIMAL(15,2)', comment: '報價金額' },
      { name: 'quote_date', type: 'DATE', comment: '報價日期' },
      { name: 'quote_status', type: 'VARCHAR(50)', comment: '報價狀態' },
      
      // 決策結構 JSON
      { name: 'decision_structure', type: 'JSONB', comment: '決策結構（決策者、影響者、使用者）' },
      
      // 聯絡紀錄統計
      { name: 'total_interactions', type: 'INTEGER DEFAULT 0', comment: '總互動次數' },
      { name: 'last_interaction_date', type: 'TIMESTAMP', comment: '最後互動日期' },
      
      // AI 分析狀態
      { name: 'ai_analysis_status', type: 'VARCHAR(50) DEFAULT \'pending\'', comment: 'AI 分析狀態（pending, processing, completed, failed）' },
      { name: 'ai_analysis_date', type: 'TIMESTAMP', comment: 'AI 分析完成時間' }
    ];
    
    // 逐一添加欄位
    for (const field of fieldsToAdd) {
      if (!existingColumns.includes(field.name)) {
        console.log(`添加欄位: ${field.name} (${field.comment})`);
        await pool.query(`
          ALTER TABLE ci_customers 
          ADD COLUMN ${field.name} ${field.type}
        `);
        console.log(`✅ ${field.name} 已添加`);
      } else {
        console.log(`⏭️  ${field.name} 已存在，跳過`);
      }
    }
    
    console.log('\n✅ 資料庫遷移完成！');
    console.log('\n新增欄位總覽：');
    console.log('- 雷達圖分數：6 個維度');
    console.log('- 銷售分析：JSONB 格式');
    console.log('- 溝通紀錄時間軸：JSONB 格式');
    console.log('- 詳細報告：TEXT 格式');
    console.log('- 客戶基本資訊：5 個欄位');
    console.log('- 產品資訊：2 個欄位');
    console.log('- 報價資訊：3 個欄位');
    console.log('- 決策結構：JSONB 格式');
    console.log('- 聯絡紀錄統計：2 個欄位');
    console.log('- AI 分析狀態：2 個欄位');
    
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
  } finally {
    await pool.end();
  }
}

migrate();
