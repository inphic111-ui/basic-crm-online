import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function test() {
  try {
    const result = await pool.query(`
      SELECT id, name, ai_analysis_history_json 
      FROM customers 
      WHERE ai_analysis_history_json IS NOT NULL 
      LIMIT 3
    `);
    
    console.log('找到的客戶：', result.rows.length);
    result.rows.forEach((row, idx) => {
      console.log(`\n客戶 ${idx + 1}:`);
      console.log('ID:', row.id);
      console.log('名稱:', row.name);
      console.log('分析歷史:');
      try {
        const history = JSON.parse(row.ai_analysis_history_json);
        console.log(JSON.stringify(history, null, 2));
      } catch (e) {
        console.log('無法解析:', row.ai_analysis_history_json);
      }
    });
  } catch (err) {
    console.error('查詢失敗:', err.message);
  } finally {
    await pool.end();
  }
}

test();
