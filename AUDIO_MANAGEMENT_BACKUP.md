# Audio Management 頁面 - 正確框架備份

## 📋 表格列標題（正確版本）

```
播放 | 檔名 | 客戶 | 業務 | 產品 | 時間 | 長度 | 轉錄狀態 | 分析狀態
```

## 🏗️ 表格 HTML 結構

### 表格頭部（thead）
```html
<thead>
  <tr>
    <th class="checkbox-col">
      <input type="checkbox" />
    </th>
    <th class="play-col">播放</th>
    <th class="filename-col">檔名</th>
    <th class="customer-col">客戶</th>
    <th class="salesperson-col">業務</th>
    <th class="product-col">產品</th>
    <th class="time-col">時間</th>
    <th class="duration-col">長度</th>
    <th class="transcription-col">轉錄狀態</th>
    <th class="analysis-col">分析狀態</th>
  </tr>
</thead>
```

### 表格數據行（tbody）
```html
<tbody>
  <tr>
    <td class="checkbox-col">
      <input type="checkbox" />
    </td>
    <td class="play-col">
      <button class="play-button" title="播放音檔">▶️</button>
    </td>
    <td class="filename-col">20251112_124500_A001223.wav</td>
    <td class="customer-col">林建宏</td>
    <td class="salesperson-col">庭磯</td>
    <td class="product-col">-</td>
    <td class="time-col">-</td>
    <td class="duration-col">03:12</td>
    <td class="transcription-col">
      <span class="status-badge status-undefined">⏳待轉錄</span>
    </td>
    <td class="analysis-col">
      <span class="status-badge status-undefined">⏳待分析</span>
    </td>
  </tr>
</tbody>
```

## 📊 CSS 類名對應

| 類名 | 用途 | 內容 |
|------|------|------|
| `checkbox-col` | 複選框列 | `<input type="checkbox" />` |
| `play-col` | 播放按鈕列 | `<button class="play-button">▶️</button>` |
| `filename-col` | 檔名列 | 音檔檔名 |
| `customer-col` | 客戶列 | 客戶名稱 |
| `salesperson-col` | 業務列 | 業務名稱 |
| `product-col` | 產品列 | 產品名稱或 `-` |
| `time-col` | 時間列 | 通話時間或 `-` |
| `duration-col` | 長度列 | 音檔時長（MM:SS 格式） |
| `transcription-col` | 轉錄狀態列 | `<span class="status-badge">⏳待轉錄</span>` |
| `analysis-col` | 分析狀態列 | `<span class="status-badge">⏳待分析</span>` |

## 🎯 關鍵差異對比

### ❌ 當前本地版本（錯誤）
```
播放 | 檔名 | 客戶 | 業務員 | 產品 | 時間長度 | 轉錄文本 | AI標籤 | 分析摘要
```

### ✅ Railway 正確版本
```
播放 | 檔名 | 客戶 | 業務 | 產品 | 時間 | 長度 | 轉錄狀態 | 分析狀態
```

## 📝 修改清單

需要在本地 Recordings.jsx 中進行以下修改：

1. ❌ 「業務員」 → ✅ 「業務」
2. ❌ 「時間長度」 → ✅ 分成「時間」和「長度」兩列
3. ❌ 「轉錄文本」 → ✅ 「轉錄狀態」
4. ❌ 「AI標籤」 → ✅ 移除
5. ❌ 「分析摘要」 → ✅ 「分析狀態」

## 🔍 表格數據映射

| 欄位 | 數據來源 | 格式 |
|------|--------|------|
| 檔名 | `filename` | 字符串 |
| 客戶 | `customer_name` | 字符串 |
| 業務 | `salesperson_name` | 字符串 |
| 產品 | `product_name` | 字符串或 `-` |
| 時間 | `call_time` | 字符串或 `-` |
| 長度 | `duration` | MM:SS 格式 |
| 轉錄狀態 | `transcription_status` | `⏳待轉錄` / `✅已轉錄` |
| 分析狀態 | `analysis_status` | `⏳待分析` / `✅已分析` |

## 💾 備份日期
2025-11-13 03:54:22 UTC+8

## 📌 備註
此備份來自 Railway 上的 `/audio-management` 頁面，代表正確的框架結構。
本地代碼應該與此結構保持一致。
