import { Pool } from 'pg';

/**
 * 檔名解析函數
 */
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

/**
 * 連接到 Railway PostgreSQL 並更新記錄
 */
async function updateAudioRecord() {
  const filename = '202409230014_何雨達_封口機_1008_1416.mp3';
  
  console.log('📄 正在解析檔名：', filename);
  const parsed = parseAudioFilename(filename);
  console.log('✅ 解析成功：', JSON.stringify(parsed, null, 2));
  
  // 連接到本地 PostgreSQL（用於測試）
  // 注意：Railway PostgreSQL 無法從本地沙箱直接訪問
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/crm_db',
    ssl: false
  });
  
  try {
    console.log('\n📡 正在連接到數據庫...');
    
    // 首先查詢第一條記錄
    console.log('\n🔍 查詢第一條記錄...');
    const selectResult = await pool.query('SELECT id FROM audio_recordings LIMIT 1');
    
    if (selectResult.rows.length === 0) {
      console.error('❌ 沒有找到任何記錄');
      return;
    }
    
    const recordId = selectResult.rows[0].id;
    console.log(`✅ 找到記錄 ID: ${recordId}`);
    
    // 更新記錄
    console.log('\n📝 正在更新記錄...');
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
    
    console.log('✅ 記錄已更新！');
    console.log('\n📊 更新後的記錄：');
    console.log(JSON.stringify(updateResult.rows[0], null, 2));
    
    // 驗證更新
    console.log('\n✅ 驗證更新結果：');
    console.log(`  - customer_id: ${updateResult.rows[0].customer_id}`);
    console.log(`  - business_name: ${updateResult.rows[0].business_name}`);
    console.log(`  - product_name: ${updateResult.rows[0].product_name}`);
    console.log(`  - call_date: ${updateResult.rows[0].call_date}`);
    console.log(`  - call_time: ${updateResult.rows[0].call_time}`);
    console.log(`  - audio_url: ${updateResult.rows[0].audio_url}`);
    
  } catch (err) {
    console.error('❌ 錯誤：', err.message);
  } finally {
    await pool.end();
  }
}

// 運行
updateAudioRecord();
