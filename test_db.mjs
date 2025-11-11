import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:ogzTiXiZsfxqloDQwcjwVdIpQkgEGeEy@postgres-eeb1.railway.internal:5432/railway'
});

async function test() {
  try {
    // 測試連接
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ 數據庫連接成功');
    
    // 查詢有分析歷史的客戶
    const customers = await pool.query(`
      SELECT id, name, ai_analysis_history_json 
      FROM customers 
      WHERE ai_analysis_history_json IS NOT NULL 
      LIMIT 1
    `);
    
    if (customers.rows.length > 0) {
      const customer = customers.rows[0];
      console.log('\n客戶信息：');
      console.log('ID:', customer.id);
      console.log('名稱:', customer.name);
      console.log('\n分析歷史：');
      try {
        const history = JSON.parse(customer.ai_analysis_history_json);
        console.log(JSON.stringify(history, null, 2));
      } catch (e) {
        console.log('無法解析 JSON:', customer.ai_analysis_history_json);
      }
    } else {
      console.log('沒有找到有分析歷史的客戶');
    }
  } catch (err) {
    console.error('❌ 錯誤:', err.message);
  } finally {
    await pool.end();
  }
}

test();
