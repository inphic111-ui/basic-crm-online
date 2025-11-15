/**
 * 部署管理系統的數據庫表定義
 */

export const deploymentSchema = `
-- 部署歷史表
CREATE TABLE IF NOT EXISTS deployment_history (
  id SERIAL PRIMARY KEY,
  deployment_id VARCHAR(255) UNIQUE NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  environment VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 部署日誌表
CREATE TABLE IF NOT EXISTS deployment_logs (
  id SERIAL PRIMARY KEY,
  deployment_id VARCHAR(255) NOT NULL,
  log_level VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deployment_id) REFERENCES deployment_history(deployment_id) ON DELETE CASCADE
);

-- 部署檢查清單表
CREATE TABLE IF NOT EXISTS deployment_checklist (
  id SERIAL PRIMARY KEY,
  deployment_id VARCHAR(255) NOT NULL,
  check_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  description TEXT,
  completed_at TIMESTAMP,
  FOREIGN KEY (deployment_id) REFERENCES deployment_history(deployment_id) ON DELETE CASCADE
);

-- 部署監控表
CREATE TABLE IF NOT EXISTS deployment_monitoring (
  id SERIAL PRIMARY KEY,
  deployment_id VARCHAR(255) NOT NULL,
  metric_name VARCHAR(255) NOT NULL,
  metric_value FLOAT,
  unit VARCHAR(50),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deployment_id) REFERENCES deployment_history(deployment_id) ON DELETE CASCADE
);

-- 創建索引以提高查詢性能
CREATE INDEX IF NOT EXISTS idx_deployment_history_status ON deployment_history(status);
CREATE INDEX IF NOT EXISTS idx_deployment_history_created_at ON deployment_history(created_at);
CREATE INDEX IF NOT EXISTS idx_deployment_logs_deployment_id ON deployment_logs(deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_checklist_deployment_id ON deployment_checklist(deployment_id);
`;

export const deploymentQueries = {
  // 插入部署記錄
  insertDeployment: `
    INSERT INTO deployment_history 
    (deployment_id, service_name, environment, status, message, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `,

  // 更新部署狀態
  updateDeploymentStatus: `
    UPDATE deployment_history 
    SET status = $1, message = $2, updated_at = CURRENT_TIMESTAMP
    WHERE deployment_id = $3
    RETURNING *
  `,

  // 獲取部署歷史
  getDeploymentHistory: `
    SELECT * FROM deployment_history 
    ORDER BY created_at DESC 
    LIMIT $1 OFFSET $2
  `,

  // 獲取部署詳情
  getDeploymentDetails: `
    SELECT * FROM deployment_history 
    WHERE deployment_id = $1
  `,

  // 插入部署日誌
  insertDeploymentLog: `
    INSERT INTO deployment_logs 
    (deployment_id, log_level, message)
    VALUES ($1, $2, $3)
  `,

  // 獲取部署日誌
  getDeploymentLogs: `
    SELECT * FROM deployment_logs 
    WHERE deployment_id = $1 
    ORDER BY timestamp ASC
  `,

  // 插入檢查清單項目
  insertChecklistItem: `
    INSERT INTO deployment_checklist 
    (deployment_id, check_name, status, description)
    VALUES ($1, $2, $3, $4)
  `,

  // 更新檢查清單項目
  updateChecklistItem: `
    UPDATE deployment_checklist 
    SET status = $1, completed_at = CURRENT_TIMESTAMP
    WHERE deployment_id = $2 AND check_name = $3
  `,

  // 獲取檢查清單
  getChecklist: `
    SELECT * FROM deployment_checklist 
    WHERE deployment_id = $1 
    ORDER BY id ASC
  `,

  // 插入監控指標
  insertMonitoringMetric: `
    INSERT INTO deployment_monitoring 
    (deployment_id, metric_name, metric_value, unit)
    VALUES ($1, $2, $3, $4)
  `,

  // 獲取監控指標
  getMonitoringMetrics: `
    SELECT * FROM deployment_monitoring 
    WHERE deployment_id = $1 
    ORDER BY recorded_at DESC
  `,

  // 獲取最近的部署
  getLatestDeployment: `
    SELECT * FROM deployment_history 
    ORDER BY created_at DESC 
    LIMIT 1
  `,

  // 獲取統計信息
  getDeploymentStats: `
    SELECT 
      status,
      COUNT(*) as count,
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration
    FROM deployment_history 
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY status
  `,
};
