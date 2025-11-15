import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:ogzTiXiZsfxqloDQwcjwVdIpQkgEGeEy@postgres-eeb1.railway.internal:5432/railway',
  ssl: { rejectUnauthorized: false }
});

try {
  console.log('正在連接到 Railway PostgreSQL...');
  
  // 測試連接
  const result = await pool.query('SELECT NOW()');
  console.log('✅ 數據庫連接成功！當前時間：', result.rows[0].now);
  
  // 查詢 audio_recordings 表
  console.log('\n正在查詢 audio_recordings 表...');
  const audioResult = await pool.query('SELECT COUNT(*) FROM audio_recordings');
  console.log('✅ audio_recordings 表中有', audioResult.rows[0].count, '筆記錄');
  
  // 查詢前 3 筆記錄
  console.log('\n正在查詢前 3 筆記錄...');
  const dataResult = await pool.query('SELECT id, business_name, product_name, ai_tags FROM audio_recordings LIMIT 3');
  console.log('✅ 查詢結果：');
  console.log(JSON.stringify(dataResult.rows, null, 2));
  
  await pool.end();
  console.log('\n✅ 測試完成！');
} catch (err) {
  console.error('❌ 錯誤：', err.message);
  process.exit(1);
}
