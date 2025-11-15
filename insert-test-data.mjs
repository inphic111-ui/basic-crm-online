import pg from 'pg';

const { Pool } = pg;

// Railway Postgres 連接字符串
const DATABASE_URL = 'postgresql://postgres:ogzTiXiZsfxqloDQwcjwVdIpQkgEGeEy@postgres-eeb1.railway.internal:5432/railway';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// 10 筆測試數據
const testData = [
  {
    customer_id: 20251106001,
    business_name: '林建宏',
    product_name: '水餃機',
    call_date: '2025-11-12',
    call_time: '10:30:00',
    audio_url: '/uploads/audio_20251106001_1731398400000.mp3',
    transcription_text: '客戶詢問水餃機的規格和價格',
    transcription_status: 'completed',
    analysis_summary: '客戶對產品感興趣，需要進一步跟進',
    analysis_status: 'completed',
    overall_status: 'active'
  },
  {
    customer_id: 20251106002,
    business_name: '陳怡君',
    product_name: '網頁設計',
    call_date: '2025-11-12',
    call_time: '11:00:00',
    audio_url: '/uploads/audio_20251106002_1731401600000.mp3',
    transcription_text: '討論網頁設計的需求和預算',
    transcription_status: 'completed',
    analysis_summary: '客戶預算充足，可以進行報價',
    analysis_status: 'completed',
    overall_status: 'active'
  },
  {
    customer_id: 20251106003,
    business_name: '劉文昌',
    product_name: '平面設計',
    call_date: '2025-11-11',
    call_time: '14:30:00',
    audio_url: '/uploads/audio_20251106003_1731324600000.mp3',
    transcription_text: '客戶詢問平面設計服務的詳細內容',
    transcription_status: 'pending',
    analysis_summary: '需要進一步了解客戶需求',
    analysis_status: 'pending',
    overall_status: 'active'
  },
  {
    customer_id: 20251106004,
    business_name: '黃美琴',
    product_name: '品牌顧問',
    call_date: '2025-11-11',
    call_time: '15:00:00',
    audio_url: '/uploads/audio_20251106004_1731326400000.mp3',
    transcription_text: '討論品牌顧問服務的內容和費用',
    transcription_status: 'completed',
    analysis_summary: '客戶對服務內容滿意，準備簽約',
    analysis_status: 'completed',
    overall_status: 'active'
  },
  {
    customer_id: 20251106005,
    business_name: '張家豪',
    product_name: '財務規劃',
    call_date: '2025-11-10',
    call_time: '09:30:00',
    audio_url: '/uploads/audio_20251106005_1731239400000.mp3',
    transcription_text: '客戶詢問財務規劃服務的具體內容',
    transcription_status: 'completed',
    analysis_summary: '客戶需要時間考慮，後續跟進',
    analysis_status: 'completed',
    overall_status: 'active'
  },
  {
    customer_id: 20251106006,
    business_name: '王思琪',
    product_name: '課程設計',
    call_date: '2025-11-10',
    call_time: '10:00:00',
    audio_url: '/uploads/audio_20251106006_1731241200000.mp3',
    transcription_text: '討論課程設計的教學目標和內容',
    transcription_status: 'pending',
    analysis_summary: '等待客戶確認課程大綱',
    analysis_status: 'pending',
    overall_status: 'active'
  },
  {
    customer_id: 20251106007,
    business_name: '李明德',
    product_name: '諮詢服務',
    call_date: '2025-11-09',
    call_time: '13:30:00',
    audio_url: '/uploads/audio_20251106007_1731153000000.mp3',
    transcription_text: '客戶詢問諮詢服務的收費標準',
    transcription_status: 'completed',
    analysis_summary: '客戶對價格有異議，需要重新協商',
    analysis_status: 'completed',
    overall_status: 'active'
  },
  {
    customer_id: 20251106008,
    business_name: '楊芬芬',
    product_name: '供應鏈優化',
    call_date: '2025-11-09',
    call_time: '14:00:00',
    audio_url: '/uploads/audio_20251106008_1731154800000.mp3',
    transcription_text: '討論供應鏈優化的實施方案',
    transcription_status: 'completed',
    analysis_summary: '客戶同意進行試點項目',
    analysis_status: 'completed',
    overall_status: 'active'
  },
  {
    customer_id: 20251106009,
    business_name: '何俊傑',
    product_name: '市場分析',
    call_date: '2025-11-08',
    call_time: '11:00:00',
    audio_url: '/uploads/audio_20251106009_1731064800000.mp3',
    transcription_text: '客戶詢問市場分析報告的內容和交付時間',
    transcription_status: 'pending',
    analysis_summary: '等待客戶確認報告的詳細要求',
    analysis_status: 'pending',
    overall_status: 'active'
  },
  {
    customer_id: 20251106010,
    business_name: '吳欣怡',
    product_name: '品牌推廣',
    call_date: '2025-11-08',
    call_time: '15:30:00',
    audio_url: '/uploads/audio_20251106010_1731082200000.mp3',
    transcription_text: '討論品牌推廣的策略和預算',
    transcription_status: 'completed',
    analysis_summary: '客戶同意按照提案進行推廣活動',
    analysis_status: 'completed',
    overall_status: 'active'
  }
];

async function insertTestData() {
  const client = await pool.connect();
  try {
    console.log('開始插入測試數據...');
    
    // 先清空現有數據（可選）
    console.log('清空現有的 audio_recordings 數據...');
    await client.query('DELETE FROM audio_recordings');
    
    // 插入測試數據
    for (const data of testData) {
      const query = `
        INSERT INTO audio_recordings 
        (customer_id, business_name, product_name, call_date, call_time, audio_url, 
         transcription_text, transcription_status, analysis_summary, analysis_status, 
         overall_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      `;
      
      const values = [
        data.customer_id,
        data.business_name,
        data.product_name,
        data.call_date,
        data.call_time,
        data.audio_url,
        data.transcription_text,
        data.transcription_status,
        data.analysis_summary,
        data.analysis_status,
        data.overall_status
      ];
      
      await client.query(query, values);
      console.log(`✅ 已插入: ${data.business_name} - ${data.product_name}`);
    }
    
    // 驗證插入結果
    const result = await client.query('SELECT COUNT(*) FROM audio_recordings');
    const count = result.rows[0].count;
    console.log(`\n✅ 成功插入 ${count} 筆數據！`);
    
    // 顯示前 3 筆數據
    const preview = await client.query('SELECT id, business_name, product_name, transcription_status, analysis_status FROM audio_recordings LIMIT 3');
    console.log('\n前 3 筆數據預覽：');
    console.table(preview.rows);
    
  } catch (error) {
    console.error('❌ 插入失敗:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

insertTestData();
