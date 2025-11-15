# 部署管理系統集成指南

## 概述

本系統提供了完整的部署管理解決方案，包括：

1. **Railway API 集成** - 與 Railway 平台通信
2. **後端 API 端點** - 部署歷史、日誌、檢查清單管理
3. **前端監控界面** - 實時顯示部署狀態
4. **WebSocket 實時推送** - 即時更新部署進度

## 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                    前端監控界面                              │
│              (DeploymentMonitor.jsx)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
    REST API      WebSocket      實時推送
    /api/        /ws            (日誌、狀態)
    deployments
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
   後端服務                      數據庫
(deployment-routes.mjs)      (PostgreSQL)
        │
        ▼
   Railway API
   (GraphQL)
```

## 文件結構

### 後端文件

- **railway-service.mjs** - Railway API 客戶端
- **deployment-schema.mjs** - 數據庫表定義和查詢
- **deployment-routes.mjs** - Express 路由
- **websocket-service.mjs** - WebSocket 服務

### 前端文件

- **src/pages/DeploymentMonitor.jsx** - 監控頁面
- **src/styles/deployment-monitor.css** - 樣式
- **src/hooks/useDeploymentWebSocket.js** - WebSocket Hook

## 安裝步驟

### 1. 安裝依賴

```bash
npm install ws axios
```

### 2. 環境變量配置

在 `.env` 文件中添加：

```env
# Railway API
RAILWAY_API_TOKEN=your_railway_api_token
RAILWAY_PROJECT_ID=your_project_id
RAILWAY_ENVIRONMENT_ID=your_environment_id
RAILWAY_SERVICE_ID=your_service_id
RAILWAY_USER=your_railway_username

# 前端環境變量
REACT_APP_RAILWAY_SERVICE_ID=your_service_id
REACT_APP_RAILWAY_ENVIRONMENT_ID=your_environment_id
```

### 3. 數據庫遷移

執行 `deployment-schema.mjs` 中的 SQL 語句創建表：

```sql
-- 運行 deployment-schema.mjs 中的 deploymentSchema SQL
```

### 4. 集成到 Express 服務器

在 `server.mjs` 中添加：

```javascript
import WebSocketService from './websocket-service.mjs';
import deploymentRoutes from './deployment-routes.mjs';

// 初始化 WebSocket
const wsService = new WebSocketService(server);
app.locals.wsService = wsService;

// 掛載路由
app.use('/api/deployments', deploymentRoutes);

// 在 WebSocket 消息處理中使用
// wsService.broadcastDeploymentUpdate(deploymentId, { status, message });
```

### 5. 在前端應用中添加路由

在 `src/App.jsx` 中添加：

```jsx
import DeploymentMonitor from '@/pages/DeploymentMonitor';

<Route path="/deployments" component={DeploymentMonitor} />
```

## API 文檔

### 獲取部署歷史

```
GET /api/deployments/history?limit=10&offset=0

Response:
[
  {
    id: 1,
    deployment_id: "dep_123",
    service_name: "basic-crm",
    environment: "production",
    status: "SUCCESS",
    message: "Deployment completed",
    started_at: "2024-01-01T10:00:00Z",
    completed_at: "2024-01-01T10:05:00Z",
    created_by: "user@example.com",
    created_at: "2024-01-01T10:00:00Z"
  }
]
```

### 獲取部署詳情

```
GET /api/deployments/:deploymentId

Response:
{
  deployment: { ... },
  logs: [ ... ],
  checklist: [ ... ],
  metrics: [ ... ]
}
```

### 觸發部署

```
POST /api/deployments/trigger

Request:
{
  serviceId: "srv_123",
  environmentId: "env_123",
  serviceName: "basic-crm"
}

Response:
{
  id: 1,
  deployment_id: "dep_456",
  service_name: "basic-crm",
  status: "pending",
  created_at: "2024-01-01T10:00:00Z"
}
```

### 添加檢查清單項目

```
POST /api/deployments/:deploymentId/checklist

Request:
{
  checkName: "Database Migration",
  status: "pending",
  description: "Run database migrations"
}

Response:
{ success: true }
```

### 更新檢查清單項目

```
PUT /api/deployments/:deploymentId/checklist/:checkName

Request:
{ status: "completed" }

Response:
{ success: true }
```

### 添加監控指標

```
POST /api/deployments/:deploymentId/metrics

Request:
{
  metricName: "CPU Usage",
  metricValue: 45.5,
  unit: "%"
}

Response:
{ success: true }
```

### 獲取部署統計

```
GET /api/deployments/stats

Response:
[
  {
    status: "SUCCESS",
    count: 10,
    avg_duration: 300
  },
  {
    status: "FAILED",
    count: 2,
    avg_duration: 150
  }
]
```

## WebSocket 協議

### 連接

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
```

### 訂閱部署

```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  deploymentId: 'dep_123'
}));
```

### 接收更新

```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'deployment_update':
      // 部署狀態更新
      console.log('Status:', data.status);
      break;
      
    case 'deployment_log':
      // 部署日誌
      console.log('Log:', data.message);
      break;
      
    case 'checklist_update':
      // 檢查清單更新
      console.log('Checklist:', data.checklist);
      break;
      
    case 'metric_update':
      // 監控指標
      console.log('Metric:', data.metric_name, data.metric_value);
      break;
  }
};
```

### 取消訂閱

```javascript
ws.send(JSON.stringify({
  type: 'unsubscribe',
  deploymentId: 'dep_123'
}));
```

## 使用示例

### 前端使用 WebSocket Hook

```jsx
import { useDeploymentMonitoring } from '@/hooks/useDeploymentWebSocket';

function MyComponent() {
  const { deployment, logs, checklist, metrics, loading, isConnected } = 
    useDeploymentMonitoring('dep_123');

  return (
    <div>
      <p>連接狀態: {isConnected ? '已連接' : '未連接'}</p>
      <p>部署狀態: {deployment?.status}</p>
      <ul>
        {logs.map(log => (
          <li key={log.id}>{log.message}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 後端推送更新

```javascript
// 推送部署狀態更新
wsService.broadcastDeploymentUpdate('dep_123', {
  status: 'IN_PROGRESS',
  message: 'Deploying...'
});

// 推送日誌
wsService.broadcastDeploymentLog('dep_123', {
  id: 'log_1',
  level: 'INFO',
  message: 'Starting deployment'
});

// 推送檢查清單更新
wsService.broadcastChecklistUpdate('dep_123', [
  { check_name: 'Database', status: 'completed' }
]);

// 推送監控指標
wsService.broadcastMetric('dep_123', {
  metric_name: 'CPU Usage',
  metric_value: 45.5,
  unit: '%'
});
```

## 故障排查

### WebSocket 連接失敗

1. 檢查 WebSocket 服務是否正確初始化
2. 確認防火牆允許 WebSocket 連接
3. 檢查瀏覽器控制台的錯誤信息

### 部署狀態未更新

1. 確認 Railway API Token 有效
2. 檢查部署 ID 是否正確
3. 查看服務器日誌中的錯誤

### 數據庫連接錯誤

1. 確認數據庫 URL 正確
2. 檢查表是否已創建
3. 驗證數據庫權限

## 性能優化

1. **日誌限制** - 限制保存的日誌數量
2. **連接池** - 使用數據庫連接池
3. **WebSocket 消息壓縮** - 啟用 permessage-deflate
4. **緩存** - 緩存部署歷史和統計信息

## 安全考慮

1. **身份驗證** - 添加 JWT 或其他身份驗證機制
2. **授權** - 驗證用戶是否有權限查看/修改部署
3. **速率限制** - 限制 API 請求速率
4. **日誌加密** - 加密敏感日誌信息

## 未來改進

1. 支持多個 Railway 項目
2. 自動回滾失敗的部署
3. 部署前置檢查
4. 部署通知（郵件、Slack 等）
5. 部署比較和版本控制
6. 自動化部署管道
