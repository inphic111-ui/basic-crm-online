import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:ogzTiXiZsfxqloDQwcjwVdIpQkgEGeEy@postgres-eeb1.railway.internal:5432/railway'
});

async function test() {
  try {
    // 查詢有分析歷史的客戶
    const result = await pool.query(`
      SELECT id, name, ai_analysis_history_json, updated_at
      FROM customers 
      WHERE ai_analysis_history_json IS NOT NULL 
      ORDER BY updated_at DESC
      LIMIT 3
    `);
    
    console.log('找到的客戶：', result.rows.length);
    result.rows.forEach((row, idx) => {
      console.log(`\n客戶 ${idx + 1}:`);
      console.log('ID:', row.id);
      console.log('名稱:', row.name);
      console.log('最後更新:', row.updated_at);
      try {
        const history = JSON.parse(row.ai_analysis_history_json);
        console.log('歷史記錄數:', history.length);
        history.forEach((record, i) => {
          console.log(`  記錄 ${i + 1}: ${record.timeline_text || record.timestamp} - 成交率: ${record.probability}%`);
        });
      } catch (e) {
        console.log('無法解析:', e.message);
      }
    });
  } catch (err) {
    console.error('錯誤:', err.message);
  } finally {
    await pool.end();
  }
}

test();
