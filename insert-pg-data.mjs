import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:ogzTiXiZsfxqloDQwcjwVdIpQkgEGeEy@postgres-eeb1.railway.internal:5432/railway',
  ssl: { rejectUnauthorized: false }
});

const testData = [
  { customer_id: 1, business_name: '何雨達', product_name: '智能軟件', call_date: '2025-11-12', call_time: '00:00:00', audio_url: 'https://example.com/audio1.mp3', audio_filename: '202511120000_1000_1143.wav', transcription_text: '客戶詢問了智能軟件的功能、定價和實施時間表。', transcription_status: 'completed', analysis_summary: '客戶對智能軟件感興趣，需要進一步報價和技術演示', analysis_status: 'completed', ai_tags: ['感興趣', '需要演示', '預算充足'], overall_status: 'completed' },
  { customer_id: 2, business_name: '郭庭碩', product_name: '投資顧問', call_date: '2025-11-12', call_time: '01:00:00', audio_url: 'https://example.com/audio2.mp3', audio_filename: '202511120100_1001_1144.wav', transcription_text: '討論了投資組合管理、風險評估和市場分析工具。', transcription_status: 'completed', analysis_summary: '客戶要求進一步的投資計劃和成本分析', analysis_status: 'completed', ai_tags: ['投資管理', '風險評估', '數據分析'], overall_status: 'completed' },
  { customer_id: 3, business_name: '鍾汶憲', product_name: '庫存管理系統', call_date: '2025-11-12', call_time: '02:00:00', audio_url: 'https://example.com/audio3.mp3', audio_filename: '202511120200_1002_1145.wav', transcription_text: '詢問了系統集成能力、成本和實施時間表。', transcription_status: 'completed', analysis_summary: '客戶對系統功能滿意，需要演示和集成測試', analysis_status: 'completed', ai_tags: ['庫存管理', '系統集成', '成本效益'], overall_status: 'completed' },
  { customer_id: 4, business_name: '何佳珊', product_name: '房產管理系統', call_date: '2025-11-12', call_time: '03:00:00', audio_url: 'https://example.com/audio4.mp3', audio_filename: '202511120300_1003_1146.wav', transcription_text: '討論了生產流程優化、報表功能和數據可視化。', transcription_status: 'completed', analysis_summary: '客戶需要定制化解決方案，預計下週做出決定', analysis_status: 'completed', ai_tags: ['房產管理', '生產管理', '定制化'], overall_status: 'completed' },
  { customer_id: 5, business_name: '何雨達', product_name: '案例管理系統', call_date: '2025-11-12', call_time: '04:00:00', audio_url: 'https://example.com/audio5.mp3', audio_filename: '202511120400_1004_1147.wav', transcription_text: '詢問了系統安全性、合規性和患者數據隱私保護。', transcription_status: 'completed', analysis_summary: '客戶關注數據隱私，需要合規證書和安全評估', analysis_status: 'completed', ai_tags: ['醫療合規', '數據安全', '隱私保護'], overall_status: 'completed' },
  { customer_id: 1, business_name: '郭庭碩', product_name: '智能軟件', call_date: '2025-11-12', call_time: '05:00:00', audio_url: 'https://example.com/audio6.mp3', audio_filename: '202511120500_1005_1148.wav', transcription_text: '討論了課程管理、學生互動和在線考試功能。', transcription_status: 'completed', analysis_summary: '客戶對平台功能感興趣，計劃進行試用', analysis_status: 'completed', ai_tags: ['在線教育', '互動功能', '學習分析'], overall_status: 'completed' },
  { customer_id: 2, business_name: '鍾汶憲', product_name: '投資顧問', call_date: '2025-11-12', call_time: '06:00:00', audio_url: 'https://example.com/audio7.mp3', audio_filename: '202511120600_1006_1149.wav', transcription_text: '詢問了租戶管理、維護工單和費用計算功能。', transcription_status: 'completed', analysis_summary: '客戶需要多物業支持，需要報價', analysis_status: 'completed', ai_tags: ['房產管理', '租戶服務', '自動計費'], overall_status: 'completed' },
  { customer_id: 3, business_name: '何佳珊', product_name: '庫存管理系統', call_date: '2025-11-12', call_time: '07:00:00', audio_url: 'https://example.com/audio8.mp3', audio_filename: '202511120700_1007_1150.wav', transcription_text: '討論了路線優化、實時跟蹤和燃油成本管理。', transcription_status: 'completed', analysis_summary: '客戶對成本節省效果感興趣', analysis_status: 'completed', ai_tags: ['物流管理', '路線優化', '成本節省'], overall_status: 'completed' },
  { customer_id: 4, business_name: '何雨達', product_name: '房產管理系統', call_date: '2025-11-12', call_time: '08:00:00', audio_url: 'https://example.com/audio9.mp3', audio_filename: '202511120800_1008_1151.wav', transcription_text: '詢問了多語言支持、支付集成和客戶關係管理功能。', transcription_status: 'completed', analysis_summary: '客戶計劃下月簽署，需要最終報價', analysis_status: 'completed', ai_tags: ['預訂管理', '支付集成', '收入管理'], overall_status: 'completed' },
  { customer_id: 5, business_name: '郭庭碩', product_name: '案例管理系統', call_date: '2025-11-12', call_time: '09:00:00', audio_url: 'https://example.com/audio10.mp3', audio_filename: '202511120900_1009_1152.wav', transcription_text: '討論了文檔管理、時間跟蹤和計費功能。', transcription_status: 'completed', analysis_summary: '客戶對系統功能滿意，預計本月做出決定', analysis_status: 'completed', ai_tags: ['案例管理', '文檔管理', '時間跟蹤'], overall_status: 'completed' }
];

async function insertData() {
  try {
    console.log('Connecting to PostgreSQL...');
    
    // Delete old data
    console.log('Deleting old data...');
    await pool.query('DELETE FROM audio_recordings');
    console.log('Old data deleted.');
    
    // Insert new data
    console.log('Inserting 10 new records...');
    for (const data of testData) {
      const query = `
        INSERT INTO audio_recordings (customer_id, business_name, product_name, call_date, call_time, audio_url, audio_filename, transcription_text, transcription_status, analysis_summary, analysis_status, ai_tags, overall_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      `;
      const values = [
        data.customer_id,
        data.business_name,
        data.product_name,
        data.call_date,
        data.call_time,
        data.audio_url,
        data.audio_filename,
        data.transcription_text,
        data.transcription_status,
        data.analysis_summary,
        data.analysis_status,
        JSON.stringify(data.ai_tags),
        data.overall_status
      ];
      await pool.query(query, values);
      console.log(`Inserted record: ${data.audio_filename}`);
    }
    
    // Verify
    const result = await pool.query('SELECT COUNT(*) as total FROM audio_recordings');
    console.log(`\nTotal records in audio_recordings: ${result.rows[0].total}`);
    console.log('✅ Data insertion completed successfully!');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

insertData();
