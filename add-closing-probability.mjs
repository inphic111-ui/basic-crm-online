import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: 'postgresql://postgres:ypYZYOGMaHLLKMmqGZxNbEZbAyqAIxOt@junction.proxy.rlwy.net:41603/railway', 
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false } 
});

(async () => {
  try {
    console.log('🔧 開始添加 closing_probability 欄位...');
    
    await pool.query('ALTER TABLE ci_customers ADD COLUMN IF NOT EXISTS closing_probability INTEGER DEFAULT 0');
    
    console.log('✅ closing_probability 欄位已添加');
    
    // 驗證欄位是否存在
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ci_customers' AND column_name = 'closing_probability'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ 驗證成功：closing_probability 欄位已存在');
    } else {
      console.log('❌ 驗證失敗：closing_probability 欄位不存在');
    }
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ 錯誤:', err.message);
    await pool.end();
    process.exit(1);
  }
})();
