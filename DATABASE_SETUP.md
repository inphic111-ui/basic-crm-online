# PostgreSQL 強制檢查機制 - 完整部署指南

## 概述

本文檔詳細說明了 CRM 3.0 系統的 PostgreSQL 強制檢查機制，這是一個多層預防性驗證系統，旨在防止資料不同步問題。該機制在部署前自動執行一系列檢查，確保系統配置正確。

## 架構設計

### 第 1 層：項目配置層

**目的**：驗證項目級別的配置是否正確標記了 PostgreSQL 的使用。

**檢查項目**：
- 檢查 `package.json` 中是否存在 `"database": "postgresql"` 字段
- 驗證 `pg` 驅動是否已安裝在依賴中
- 檢查 `drizzle.config.ts` 是否存在且配置正確

**修復步驟**：
```json
{
  "database": "postgresql",
  "dependencies": {
    "pg": "^8.11.0"
  }
}
```

### 第 2 層：代碼檢查層

**目的**：掃描代碼文件，確保沒有使用過時的 MySQL 驅動配置。

**檢查項目**：
- 掃描 `drizzle/schema.ts` 文件
- 驗證所有表定義使用 `pgTable` 而不是 `mysqlTable`
- 確保導入語句來自 `drizzle-orm/pg-core`

**修復步驟**：

如果發現 `mysqlTable` 的使用，需要進行以下替換：

```typescript
// ❌ 錯誤
import { mysqlTable, int, varchar } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').primaryKey(),
  name: varchar('name', { length: 255 })
});

// ✅ 正確
import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 })
});
```

### 第 3 層：部署檢查層

**目的**：驗證環境變數和部署配置是否正確。

**檢查項目**：
- 驗證 `DATABASE_URL` 環境變數是否設置
- 檢查 `DATABASE_URL` 是否為有效的 PostgreSQL 連接字符串
- 確保連接字符串包含 SSL 配置（如 `?sslmode=require`）

**正確的 DATABASE_URL 格式**：

```
postgresql://username:password@hostname:5432/database_name?sslmode=require
```

**環境變數設置示例**：

```bash
# .env 文件
DATABASE_URL=postgresql://user:password@localhost:5432/crm_db?sslmode=require
```

### 第 4 層：文檔層

**目的**：確保部署文檔完整且包含所有必要的 PostgreSQL 配置步驟。

**檢查項目**：
- 驗證 `DATABASE_SETUP.md` 文件是否存在
- 檢查文檔是否包含 PostgreSQL 配置說明
- 確保文檔包含故障排查指南

### 第 5 層：開發工作流層

**目的**：確保開發流程中有適當的防護措施，防止配置錯誤被提交。

**檢查項目**：
- 檢查 `.pre-commit` 鉤子是否存在
- 驗證鉤子是否檢查 `mysqlTable` 的使用
- 確保 `todo.md` 中的任務已正確更新

**Pre-commit 鉤子配置**：

在 `.git/hooks/pre-commit` 中添加以下檢查：

```bash
#!/bin/bash
# 防止提交包含 mysqlTable 的代碼

if git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$' | xargs grep -l 'mysqlTable'; then
  echo "❌ 錯誤：發現 mysqlTable 的使用，請改為 pgTable"
  exit 1
fi

if git diff --cached -- 'drizzle/schema.ts' | grep -q 'mysqlTable'; then
  echo "❌ 錯誤：schema.ts 中不能使用 mysqlTable"
  exit 1
fi

exit 0
```

### 第 6 層：運行時檢查層

**目的**：在部署前進行實時驗證，確保數據庫連接正常。

**檢查項目**：
- 建立到 PostgreSQL 數據庫的連接
- 執行簡單的測試查詢（`SELECT 1`）
- 驗證連接池配置
- 檢查本地 schema 定義與數據庫實際結構的一致性

**連接測試示例**：

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.query('SELECT 1 as test', (err, res) => {
  if (err) {
    console.error('❌ 數據庫連接失敗:', err);
  } else {
    console.log('✅ 數據庫連接成功');
  }
  pool.end();
});
```

## 部署前檢查清單

在執行部署前，系統會自動運行以下檢查。如果任何檢查失敗，部署將被阻止。

| 檢查項 | 層級 | 狀態 | 說明 |
|--------|------|------|------|
| package.json 配置 | 項目配置層 | 必須通過 | 驗證 database 字段 |
| drizzle.config.ts | 項目配置層 | 必須通過 | 驗證 PostgreSQL 驅動 |
| schema.ts 驗證 | 代碼檢查層 | 必須通過 | 禁止使用 mysqlTable |
| DATABASE_URL 格式 | 部署檢查層 | 必須通過 | 驗證連接字符串 |
| 數據庫連接 | 運行時檢查層 | 必須通過 | 測試連接可用性 |
| Schema 一致性 | 運行時檢查層 | 必須通過 | 驗證表結構一致 |
| 待處理遷移 | 開發工作流層 | 警告 | 提醒未應用的遷移 |
| 文檔完整性 | 文檔層 | 警告 | 驗證文檔存在 |

## 常見問題與解決方案

### 問題 1：DATABASE_URL 格式錯誤

**症狀**：檢查報告 "DATABASE_URL 格式不正確"

**解決方案**：
1. 確認 DATABASE_URL 以 `postgresql://` 開頭
2. 檢查連接字符串格式：`postgresql://user:password@host:port/database`
3. 添加 SSL 配置：`?sslmode=require`

### 問題 2：數據庫連接失敗

**症狀**：檢查報告 "數據庫連接失敗"

**解決方案**：
1. 驗證 PostgreSQL 服務是否運行
2. 檢查防火牆設置，確保允許連接
3. 驗證用戶名和密碼是否正確
4. 確保 SSL 證書配置正確

### 問題 3：發現 mysqlTable 使用

**症狀**：檢查報告 "檢測到 mysqlTable 的使用"

**解決方案**：
1. 打開 `drizzle/schema.ts` 文件
2. 將所有 `mysqlTable` 替換為 `pgTable`
3. 更新導入語句為 `from 'drizzle-orm/pg-core'`
4. 運行 `pnpm db:push` 應用更改

### 問題 4：待處理遷移

**症狀**：檢查報告 "發現待處理遷移"

**解決方案**：
1. 運行 `pnpm db:push` 應用所有遷移
2. 驗證遷移是否成功執行
3. 檢查遷移日誌中是否有錯誤

## 部署流程

### 正常部署流程

```
1. 開發者提交代碼
   ↓
2. Pre-commit 鉤子檢查
   ↓
3. 代碼推送到倉庫
   ↓
4. 訪問部署監控頁面
   ↓
5. 系統自動運行部署前檢查
   ↓
6. 所有檢查通過 → 允許部署
   ↓
7. 觸發部署流程
   ↓
8. 監控部署進度和日誌
```

### 檢查失敗的處理

```
1. 檢查失敗
   ↓
2. 查看詳細錯誤信息
   ↓
3. 根據建議修復問題
   ↓
4. 重新運行檢查
   ↓
5. 確認所有檢查通過後部署
```

## 最佳實踐

### 1. 定期驗證配置

在每次代碼更新後，運行部署前檢查以確保配置保持一致。

### 2. 使用版本控制

始終在 Git 中跟蹤配置文件的更改，包括：
- `package.json`
- `drizzle.config.ts`
- `drizzle/schema.ts`
- `.pre-commit` 鉤子

### 3. 文檔更新

每當進行數據庫配置更改時，更新 `DATABASE_SETUP.md` 文檔。

### 4. 團隊協作

確保所有團隊成員都理解 PostgreSQL 配置要求，並在本地環境中進行測試。

### 5. 備份策略

在進行重大部署前，備份數據庫以防止數據丟失。

## 監控和日誌

### 部署前檢查日誌

所有檢查結果都記錄在部署監控頁面中，包括：
- 檢查名稱
- 檢查層級
- 檢查狀態（通過/失敗/警告）
- 詳細信息和建議

### 訪問檢查歷史

通過部署監控中心的「檢查歷史」標籤頁查看過去的檢查結果。

## 故障排查

### 檢查無法連接到數據庫

**可能原因**：
- 數據庫服務未運行
- 網絡連接問題
- 防火牆阻止連接

**解決方案**：
```bash
# 測試數據庫連接
psql postgresql://user:password@host:port/database

# 檢查 PostgreSQL 服務狀態
systemctl status postgresql

# 檢查網絡連接
ping hostname
```

### Schema 一致性檢查失敗

**可能原因**：
- 本地 schema 定義與數據庫不同步
- 遷移未完全應用

**解決方案**：
```bash
# 應用所有待處理遷移
pnpm db:push

# 驗證 schema 一致性
pnpm db:check
```

## 技術支持

如遇到任何問題，請：
1. 查看部署監控頁面的詳細錯誤信息
2. 參考本文檔的常見問題部分
3. 檢查系統日誌中的相關錯誤
4. 聯繫技術支持團隊

---

**最後更新**：2025 年 11 月 15 日
**版本**：1.0
**維護者**：CRM 開發團隊
