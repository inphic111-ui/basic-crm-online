# 🔴 完整問題列表和代碼審計報告

## 📋 問題總覽

| # | 問題 | 嚴重性 | 狀態 |
|---|------|------|------|
| 1 | 沒有 recordings 表 | 🔴 嚴重 | 未解決 |
| 2 | /api/audio/list 返回空列表 | 🔴 嚴重 | 未解決 |
| 3 | Recordings 頁面無法顯示數據 | 🔴 嚴重 | 未解決 |
| 4 | 表格列標題無法驗證 | 🟡 中等 | 待驗證 |
| 5 | 沒有示例/測試數據 | 🟡 中等 | 未解決 |

---

## 🔴 問題 1: 沒有 recordings 表

### 問題描述
數據庫中完全沒有 recordings 表的定義。只有 customers 表。

### 相關代碼

**server.mjs - 第 133-160 行（customers 表定義）：**
```javascript
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255),
  company_name VARCHAR(255),
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  industry VARCHAR(100),
  product_name VARCHAR(255),
  purchase_price DECIMAL(15, 2),
  budget DECIMAL(15, 2),
  annual_consumption DECIMAL(15, 2),
  total_consumption DECIMAL(15, 2),
  source VARCHAR(100),
  status VARCHAR(50),
  n_score INT,
  f_score INT,
  v_score INT,
  p_score INT,
  cvi_score DECIMAL(5, 2),
  customer_type VARCHAR(50),
  ai_analysis TEXT,
  ai_analysis_history TEXT,
  audio_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

**缺失的 recordings 表應該包含：**
- id (主鍵)
- filename (檔名)
- original_filename (原始檔名)
- customer_name (客戶名稱)
- salesperson_name (業務員名稱)
- product_name (產品名稱)
- duration (時長，秒數)
- transcription_text (轉錄文本)
- ai_tags (AI 標籤)
- summary (分析摘要)
- audio_url (音檔 URL)
- call_date (通話日期)
- call_time (通話時間)
- created_at (創建時間)
- updated_at (更新時間)

### 影響
- ❌ Recordings 頁面無法顯示任何數據
- ❌ 無法存儲音檔信息
- ❌ 無法進行音檔管理

---

## 🔴 問題 2: /api/audio/list 返回空列表

### 問題描述
API 端點被實現為直接返回空列表，而不是查詢數據庫。

### 相關代碼

**server.mjs - 第 484-498 行：**
```javascript
// 音檔列表端點
app.get('/api/audio/list', async (req, res) => {
  try {
    const { salesperson } = req.query;
    
    // 返回空列表 - 因為沒有 recordings 表
    // 如果需要實現音檔管理功能，需要創建 recordings 表
    const audioList = [];
    
    res.json(audioList);
  } catch (err) {
    addLog('error', '獲取音檔列表失敗', err.message);
    res.status(500).json({ error: err.message });
  }
});
```

### 問題分析
1. **硬編碼空列表** - `const audioList = [];` 永遠返回空
2. **未使用查詢參數** - `salesperson` 參數被定義但未使用
3. **未查詢數據庫** - 沒有 SQL 查詢
4. **缺少篩選邏輯** - 即使有數據也無法按業務員篩選

### 影響
- ❌ 前端無法獲取任何音檔數據
- ❌ Recordings 頁面顯示「沒有音檔記錄」
- ❌ 業務員篩選功能無法工作

---

## 🔴 問題 3: Recordings 頁面無法顯示數據

### 問題描述
Recordings.jsx 前端代碼結構正確，但因為 API 返回空列表，頁面無法顯示任何內容。

### 相關代碼

**src/pages/Recordings.jsx - 第 24-45 行（fetchAudioFiles 函數）：**
```javascript
const fetchAudioFiles = async () => {
  try {
    setLoading(true)
    const url = selectedSalesperson 
      ? `/api/audio/list?salesperson=${encodeURIComponent(selectedSalesperson)}`
      : '/api/audio/list'
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`獲取音檔列表失敗: ${response.status}`)
    }
    const data = await response.json()
    setAudioFiles(data || [])
    setError(null)
  } catch (err) {
    console.error('獲取音檔列表失敗:', err)
    setError(err.message)
    setAudioFiles([])
  } finally {
    setLoading(false)
  }
}
```

**src/pages/Recordings.jsx - 第 171-175 行（條件渲染）：**
```javascript
{loading ? (
  <div className="loading-message">加載中...</div>
) : filteredAudioFiles.length === 0 ? (
  <div className="empty-message">沒有音檔記錄</div>
) : (
  <table className="audio-table">
```

### 問題分析
1. ✅ 前端代碼邏輯正確
2. ✅ API 調用正確
3. ❌ 但 API 返回 `[]`，所以 `filteredAudioFiles.length === 0` 為真
4. ❌ 頁面顯示「沒有音檔記錄」

### 影響
- ❌ 用戶看不到任何音檔
- ❌ 無法驗證表格列標題是否正確
- ❌ 無法測試任何 Recordings 功能

---

## 🟡 問題 4: 表格列標題無法驗證

### 問題描述
Recordings.jsx 中的表格列標題已定義，但因為沒有數據，表格根本不會渲染，所以無法驗證列標題是否正確。

### 相關代碼

**src/pages/Recordings.jsx - 第 176-192 行（表格頭部）：**
```javascript
<table className="audio-table">
  <thead>
    <tr>
      <th className="checkbox-col">
        <input type="checkbox" />
      </th>
      <th className="play-col">播放</th>
      <th className="filename-col">檔名</th>
      <th className="customer-col">客戶</th>
      <th className="salesperson-col">業務員</th>
      <th className="product-col">產品</th>
      <th className="time-col">時間長度</th>
      <th className="transcription-col">轉錄文本</th>
      <th className="ai-tags-col">AI 標籤</th>
      <th className="summary-col">分析摘要</th>
    </tr>
  </thead>
```

### 當前列標題
1. ✅ 播放
2. ✅ 檔名
3. ✅ 客戶
4. ✅ 業務員
5. ✅ 產品
6. ✅ 時間長度
7. ✅ 轉錄文本
8. ✅ AI 標籤
9. ✅ 分析摘要

### 您上傳的「好版本」列標題
1. ✅ 播放
2. ✅ 檔名
3. ✅ 客戶
4. ❌ 業務（當前是「業務員」）
5. ✅ 產品
6. ❌ 時間（當前是「時間長度」）
7. ❌ 長度（當前沒有）
8. ❌ 轉錄狀態（當前是「轉錄文本」）
9. ❌ 分析狀態（當前是「分析摘要」）

### 問題分析
- 當前列標題與您的「好版本」不一致
- 但因為沒有數據，無法驗證哪個是正確的

### 影響
- ⚠️ 無法確認應該使用哪個版本的列標題

---

## 🟡 問題 5: 沒有示例/測試數據

### 問題描述
即使創建了 recordings 表，也沒有任何示例數據可以測試。

### 相關代碼

**缺失的數據初始化代碼**

應該有一個初始化腳本來創建 recordings 表並插入示例數據，但目前沒有。

### 影響
- ❌ 無法測試 Recordings 頁面功能
- ❌ 無法驗證表格列標題
- ❌ 無法驗證 API 是否正確工作

---

## 📊 Recordings.jsx 表格數據映射

### 表格列與數據字段映射

**src/pages/Recordings.jsx - 第 193-241 行（表格數據行）：**
```javascript
{filteredAudioFiles.map((audio, index) => (
  <tr key={audio.id || index}>
    <td className="checkbox-col">
      <input type="checkbox" />
    </td>
    <td className="play-col">
      <button
        className="play-button"
        onClick={() => handlePlayAudio(audio.id, audio.audio_url)}
        title="播放音檔"
      >
        ▶️
      </button>
    </td>
    <td className="filename-col" title={audio.original_filename}>
      {audio.filename || '-'}
    </td>
    <td className="customer-col">{audio.customer_name || '-'}</td>
    <td className="salesperson-col">{audio.salesperson_name || '-'}</td>
    <td className="product-col">{audio.product_name || '-'}</td>
    <td className="time-col">
      {formatDuration(audio.duration)}
    </td>
    <td className="transcription-col">
      <button
        className="transcription-button"
        onClick={() => handleViewTranscription(audio)}
        title="查看轉錄文本"
      >
        📄 查看
      </button>
    </td>
    <td className="ai-tags-col">
      <div className="tags-container">
        {parseAiTags(audio.ai_tags).map((tag, idx) => (
          <span key={idx} className="tag-badge">
            {tag}
          </span>
        ))}
      </div>
    </td>
    <td className="summary-col">
      <span className="summary-text" title={audio.summary}>
        {audio.summary ? audio.summary.substring(0, 30) + (audio.summary.length > 30 ? '...' : '') : '-'}
      </span>
    </td>
  </tr>
))}
```

### 需要的數據字段
```javascript
{
  id: number,                    // 音檔 ID
  filename: string,              // 顯示檔名
  original_filename: string,     // 原始檔名
  customer_name: string,         // 客戶名稱
  salesperson_name: string,      // 業務員名稱
  product_name: string,          // 產品名稱
  duration: number,              // 時長（秒數）
  audio_url: string,             // 音檔 URL
  transcription_text: string,    // 轉錄文本
  ai_tags: string,               // AI 標籤（逗號分隔）
  summary: string                // 分析摘要
}
```

---

## 🔧 修復方案概述

### 需要的修復步驟

1. **創建 recordings 表**
   - 在 server.mjs 中添加 CREATE TABLE recordings 語句
   - 包含所有必要的字段

2. **實現 /api/audio/list 端點**
   - 查詢 recordings 表
   - 支持按業務員篩選
   - 返回正確的數據結構

3. **添加示例數據**
   - 創建初始化腳本
   - 插入測試數據

4. **驗證表格列標題**
   - 確認應該使用哪個版本的列標題
   - 更新 Recordings.jsx 中的列標題

5. **測試完整流程**
   - 驗證 API 返回數據
   - 驗證表格正確顯示
   - 驗證所有功能正常工作

---

## 📝 總結

| 組件 | 狀態 | 問題 |
|------|------|------|
| **Recordings.jsx (前端)** | ✅ 正確 | 代碼結構正確，但無數據 |
| **/api/audio/list (API)** | ❌ 錯誤 | 返回空列表，未查詢數據庫 |
| **recordings 表 (數據庫)** | ❌ 不存在 | 完全沒有定義 |
| **示例數據** | ❌ 不存在 | 沒有測試數據 |
| **表格列標題** | ⚠️ 不確定 | 與「好版本」不一致 |

