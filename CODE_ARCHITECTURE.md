# 現在的代碼架構

## 1. 後端上傳 API (`/api/audio/upload`)

**位置：** `server.mjs` 行 729-825

**邏輯流程：**
```
1. 接收前端的 FormData（包含 file 和 data）
2. 使用原始檔名 (req.file.originalname)
3. 生成時間戳作為 recordingId
4. 構建 R2 路徑：inphic-crm/audio_recordings/{timestamp}/{fileName}

第一步：直接上傳到 R2
├─ 檢查 R2 環境變數
├─ 使用 S3Client 上傳檔案
├─ 生成 R2 公開 URL
└─ 如果失敗 → 返回 500 錯誤

第二步：嘗試在 audio_recordings 表中創建記錄（可選）
├─ 檢查 pools.online 是否存在
├─ 執行 INSERT 語句
├─ 如果成功 → 使用數據庫返回的 id 作為 recordingId
└─ 如果失敗 → 使用時間戳作為 recordingId（不影響上傳結果）

返回結果：
{
  success: true,
  recording_id: recordingId,
  audio_url: audioUrl,
  message: '✅ 音檔已成功上傳到 R2'
}
```

**R2 環境變數：**
- `R2_BUCKET_NAME` = `inphic-crm`
- `R2_ENDPOINT` = `https://14a73ec296e8619d856c15bf5290a433.r2.cloudflarestorage.com`
- `R2_ACCESS_KEY_ID` = 已設置
- `R2_SECRET_ACCESS_KEY` = 已設置
- `R2_PUBLIC_URL` = `https://pub-8fa82e9fb0484d31af0f18314c139583.r2.dev`

**INSERT 語句：**
```sql
INSERT INTO audio_recordings 
(customer_id, business_name, product_name, call_date, call_time, audio_url, transcription_status, analysis_status, overall_status, created_at, updated_at)
VALUES 
($1, $2, $3, $4, $5, $6, 'pending', 'pending', 'processing', NOW(), NOW())
RETURNING id
```

**參數映射：**
- $1: customerNumber (from parsedData.customer_id)
- $2: businessName (from parsedData.salesperson_name)
- $3: productName (from parsedData.product_name)
- $4: callDate (from parsedData.call_date)
- $5: callTime (from parsedData.call_time)
- $6: audioUrl (R2 URL)

## 2. 前端上傳邏輯 (`src/pages/Recordings.jsx`)

**位置：** 行 122-159

**邏輯流程：**
```
1. 用戶點擊「⬆️ 上傳音檔」按鈕
2. 打開檔案選擇器
3. 選擇檔案後，調用 handleUploadAudio()
4. 構建 FormData：
   - file: 選中的檔案
   - data: JSON 字符串，包含客戶信息
5. POST 到 /api/audio/upload
6. 成功後重新獲取音檔列表
```

**前端代碼片段：**
```javascript
const handleUploadAudio = async () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/*';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('data', JSON.stringify({
      customer_id: selectedCustomer,
      salesperson_name: selectedSalesperson,
      product_name: selectedProduct,
      call_date: new Date().toISOString().split('T')[0],
      call_time: new Date().toTimeString().split(' ')[0]
    }));
    
    try {
      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      alert('上傳成功');
      fetchAudioFiles();
    } catch (err) {
      alert(`上傳失敗: ${err.message}`);
    }
  };
  
  input.click();
}
```

## 3. 數據庫表結構

**表名：** `audio_recordings`

**欄位：**
- id: integer (PK)
- customer_id: integer (FK to customers)
- business_name: varchar
- product_name: varchar
- call_date: date
- call_time: time
- audio_url: varchar (R2 URL)
- transcription_text: text
- transcription_status: varchar (pending/processing/completed)
- analysis_status: varchar (pending/processing/completed)
- overall_status: varchar (processing/completed)
- created_at: timestamp
- updated_at: timestamp

## 4. 當前問題

### 問題 1：R2 上傳成功，但數據庫記錄不存在
- ✅ Railway 日誌顯示上傳到 R2 成功
- ✅ 日誌顯示「在 audio_recordings 表中創建記錄」
- ❌ 但查詢數據庫返回 0 行

**可能原因：**
1. INSERT 語句執行失敗（但沒有拋出錯誤）
2. 數據庫連接失敗（但代碼沒有正確處理）
3. 事務回滾（但沒有日誌）
4. 連接到了不同的數據庫

### 問題 2：數據庫中的舊記錄仍然是示例 URL
- 舊記錄中的 audio_url 仍然是 `https://example.com/audio*.mp3`
- 這是因為舊記錄是在修復前創建的

## 5. 建議的下一步

1. **驗證數據庫連接**
   - 檢查 Railway 日誌中是否有數據庫連接錯誤
   - 驗證 DATABASE_URL 是否正確

2. **檢查 INSERT 是否真的執行**
   - 在 INSERT 前後添加更詳細的日誌
   - 檢查是否有 SQL 錯誤

3. **驗證 R2 URL 是否正確**
   - 確認生成的 R2 URL 是否可以訪問
   - 檢查 R2 中的檔案是否真的存在

4. **測試新上傳**
   - 上傳新檔案
   - 檢查 R2 中是否出現新檔案
   - 檢查數據庫中是否出現新記錄
