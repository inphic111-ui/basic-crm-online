# 音檔管理系統 - 項目 TODO

## 第一階段：恢復項目架構和配置
- [x] 回滾到原始 Drizzle ORM 架構（c25eafe）
- [x] 安裝依賴並啟動開發服務器
- [ ] 驗證 Manus OAuth 配置
- [ ] 設置環境變數（DATABASE_URL、OPENAI_API_KEY、R2 等）

## 第二阶段：設計數據庫 schema（Drizzle）
- [x] 定義 recordings 表（音檔記錄）
- [x] 定義 transcriptions 表（轉錄記錄）
- [x] 定義 ai_analyses 表（AI 分析結果）
- [x] 定義 analysis_history 表（分析歷史）
- [x] 運行 `pnpm db:push` 遷移數據庫

## 第三階段：實現後端 API（tRPC 程序）
- [ ] 創建 recordings router（上傳、列表、刪除）
- [ ] 創建 transcriptions router（轉錄狀態、結果）
- [ ] 創建 analyses router（AI 分析、歷史）
- [ ] 實現文件上傳到 R2 的邏輯
- [ ] 實現 OpenAI 轉錄調用

## 第四階段：實現前端 UI 組件
- [ ] 創建音檔上傳頁面
- [ ] 創建音檔列表頁面
- [ ] 創建轉錄結果顯示組件
- [ ] 創建 AI 分析結果顯示組件
- [ ] 實現進度條和狀態指示

## 第五階段：集成 OpenAI 轉錄和 AI 分析功能
- [ ] 實現 Whisper API 調用（轉錄）
- [ ] 實現 GPT API 調用（分析）
- [ ] 實現異步任務隊列（可選）
- [ ] 實現錯誤重試機制

## 第六階段：集成 Cloudflare R2 文件存儲
- [ ] 配置 R2 客戶端
- [ ] 實現文件上傳邏輯
- [ ] 實現文件下載邏輯
- [ ] 實現文件刪除邏輯

## 第七階段：測試和部署
- [ ] 功能測試
- [ ] 性能測試
- [ ] 安全性檢查
- [ ] 部署到 Railway

