# CRM 5.0 - 正式版 (Online)

專業級客戶關係管理系統，包含圖形化儀表板、高級搜索和數據分析功能。

## 🎯 主要功能

### 儀表板
- 📊 實時統計卡片（總客戶、活躍客戶、非活躍客戶、分類數）
- 📈 客戶狀態分佈圖表（甜甜圈圖）
- 📉 客戶分類分佈圖表（橫向柱狀圖）
- 📋 最近添加的客戶列表

### 客戶管理
- 🔍 高級搜索（名稱、郵箱、公司）
- 🏷️ 按狀態篩選
- 📂 按分類篩選
- 📄 分頁顯示
- 📥 CSV 導出功能

### 客戶操作
- ➕ 添加新客戶
- ✏️ 編輯客戶信息
- 🗑️ 刪除客戶
- 🏷️ 客戶分類和標籤
- 📝 客戶備註

## 🛠️ 技術棧

- **後端**: Node.js + Express
- **數據庫**: PostgreSQL
- **前端**: HTML5 + CSS3 + JavaScript
- **圖表**: Chart.js
- **部署**: Railway

## 📦 安裝

```bash
npm install
```

## ⚙️ 配置

創建 `.env` 文件：

```env
DATABASE_URL=postgresql://user:password@host:5432/database
NODE_ENV=production
PORT=3000
```

## 🚀 運行

```bash
npm start
```

## 📊 API 端點

- `GET /api/dashboard` - 獲取儀表板數據
- `GET /api/customers` - 獲取客戶列表（支持搜索、篩選、排序）
- `GET /api/customers/:id` - 獲取單個客戶
- `POST /api/customers` - 添加客戶
- `PUT /api/customers/:id` - 更新客戶
- `DELETE /api/customers/:id` - 刪除客戶
- `POST /api/customers/batch/delete` - 批量刪除
- `GET /api/customers/export/csv` - 導出 CSV
- `GET /api/categories` - 獲取分類列表

## 📈 改進特性

相比測試版的改進：

1. **圖形化儀表板** - 使用 Chart.js 展示數據可視化
2. **高級搜索** - 支持多字段搜索和篩選
3. **數據導出** - CSV 格式導出
4. **分類管理** - 客戶分類和標籤系統
5. **性能優化** - 數據庫索引和查詢優化
6. **UI 改進** - 更現代的設計和交互

## 🔄 數據遷移

使用 DevLog 工具從測試環境遷移數據：

1. 訪問 DevLog 應用
2. 選擇源數據庫（OFFLINE）
3. 選擇目標數據庫（ONLINE）
4. 執行遷移
5. 驗證數據完整性

## 📝 許可

MIT License
# CRM 5.0 Online - Force Redeploy
