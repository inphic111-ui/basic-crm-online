import { Pool } from 'pg';
import fs from 'fs';

// 從環境變數讀取資料庫連接
const dbUrl = process.env.ONLINE_DB_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ 找不到資料庫連接字串');
  process.exit(1);
}

console.log('📊 連接資料庫...');
const pool = new Pool({ 
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

try {
  // 讀取 schema
  const schema = fs.readFileSync('./db/ci_schema.sql', 'utf-8');
  
  console.log('🔨 建立 CI 資料表...');
  await pool.query(schema);
  
  console.log('✅ CI 資料表建立成功');
  
  // 驗證表是否存在
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('ci_customers', 'ci_interactions')
    ORDER BY table_name
  `);
  
  console.log('📋 已建立的表：');
  result.rows.forEach(row => {
    console.log(`  - ${row.table_name}`);
  });
  
} catch (err) {
  console.error('❌ 錯誤：', err.message);
} finally {
  await pool.end();
}
