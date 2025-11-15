import React, { useState, useEffect } from 'react';
import '../styles/deployment-pre-check.css';

/**
 * 部署前檢查清單組件
 * 實現多層預防性驗證機制，防止資料不同步
 * 
 * 檢查層級：
 * 1. 項目配置層 - 驗證 package.json 和 drizzle.config.ts
 * 2. 代碼檢查層 - 驗證 schema 文件和驅動配置
 * 3. 部署檢查層 - 驗證 DATABASE_URL 和環境變數
 * 4. 文檔層 - 驗證 DATABASE_SETUP.md 文檔
 * 5. 開發工作流層 - 驗證 todo.md 和 pre-commit 鉤子
 * 6. 運行時檢查層 - 驗證數據庫連接和 schema 一致性
 */
export default function DeploymentPreCheckList() {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedCheck, setExpandedCheck] = useState(null);
  const [overallStatus, setOverallStatus] = useState('idle'); // idle, running, success, failed

  // 定義檢查項目
  const checkDefinitions = [
    {
      id: 'project-config',
      layer: '項目配置層',
      name: '檢查 package.json 中的 database 字段',
      description: '驗證 package.json 中是否明確標記 "database": "postgresql"',
      icon: '📦',
      details: [
        '檢查 package.json 是否存在',
        '驗證 database 字段值為 postgresql',
        '確保依賴中包含 pg 驅動'
      ]
    },
    {
      id: 'drizzle-config',
      layer: '項目配置層',
      name: '檢查 drizzle.config.ts 配置',
      description: '驗證 drizzle.config.ts 中強制使用 PostgreSQL 驅動',
      icon: '⚙️',
      details: [
        '檢查 drizzle.config.ts 是否存在',
        '驗證 driver 字段值為 "pg"',
        '確保 schema 路徑正確'
      ]
    },
    {
      id: 'schema-validation',
      layer: '代碼檢查層',
      name: '驗證 schema 文件使用 pgTable',
      description: '確保所有 schema 文件使用 pgTable 而不是 mysqlTable',
      icon: '📋',
      details: [
        '掃描 drizzle/schema.ts',
        '檢查是否使用 pgTable',
        '驗證不存在 mysqlTable 的使用'
      ]
    },
    {
      id: 'env-validation',
      layer: '部署檢查層',
      name: '驗證 DATABASE_URL 格式',
      description: '確保 DATABASE_URL 為 PostgreSQL 連接字符串格式',
      icon: '🔐',
      details: [
        '檢查 DATABASE_URL 環境變數',
        '驗證格式為 postgresql://...',
        '確保 SSL 連接配置正確'
      ]
    },
    {
      id: 'db-connection',
      layer: '運行時檢查層',
      name: '測試數據庫連接',
      description: '嘗試連接到 PostgreSQL 數據庫並驗證連接成功',
      icon: '🔗',
      details: [
        '建立 PostgreSQL 連接',
        '執行簡單查詢測試',
        '驗證連接池配置'
      ]
    },
    {
      id: 'schema-sync',
      layer: '運行時檢查層',
      name: '驗證 schema 一致性',
      description: '檢查本地 schema 定義與數據庫實際結構是否一致',
      icon: '🔄',
      details: [
        '獲取本地 schema 定義',
        '查詢數據庫表結構',
        '比較欄位、類型和約束',
        '報告任何不一致之處'
      ]
    },
    {
      id: 'migration-check',
      layer: '開發工作流層',
      name: '檢查待處理遷移',
      description: '確保所有待處理的數據庫遷移已應用',
      icon: '📝',
      details: [
        '檢查遷移目錄',
        '驗證所有遷移已執行',
        '確認沒有待處理的遷移'
      ]
    },
    {
      id: 'pre-commit-hook',
      layer: '開發工作流層',
      name: '驗證 pre-commit 鉤子',
      description: '確保 .pre-commit 鉤子已配置以防止 mysqlTable 提交',
      icon: '🪝',
      details: [
        '檢查 .pre-commit 鉤子是否存在',
        '驗證鉤子檢查 mysqlTable 使用',
        '確保鉤子可執行'
      ]
    },
    {
      id: 'documentation',
      layer: '文檔層',
      name: '驗證 DATABASE_SETUP.md 文檔',
      description: '確保部署文檔完整且包含所有必要步驟',
      icon: '📚',
      details: [
        '檢查 DATABASE_SETUP.md 是否存在',
        '驗證文檔包含 PostgreSQL 配置步驟',
        '確保文檔包含故障排查指南'
      ]
    }
  ];

  // 執行檢查
  const runChecks = async () => {
    setLoading(true);
    setOverallStatus('running');
    
    try {
      const response = await fetch('/api/deployments/pre-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setChecks(data.checks);
        
        // 計算總體狀態
        const allPassed = data.checks.every(c => c.status === 'passed');
        const anyFailed = data.checks.some(c => c.status === 'failed');
        
        if (anyFailed) {
          setOverallStatus('failed');
        } else if (allPassed) {
          setOverallStatus('success');
        } else {
          setOverallStatus('running');
        }
      } else {
        setOverallStatus('failed');
      }
    } catch (error) {
      console.error('Failed to run checks:', error);
      setOverallStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  // 自動運行檢查
  useEffect(() => {
    runChecks();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return '✅';
      case 'failed':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'pending':
        return '⏳';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return '#4CAF50';
      case 'failed':
        return '#F44336';
      case 'warning':
        return '#FF9800';
      case 'pending':
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  const getOverallStatusText = () => {
    switch (overallStatus) {
      case 'success':
        return '✅ 所有檢查通過 - 可以安全部署';
      case 'failed':
        return '❌ 檢查失敗 - 請修復問題後再部署';
      case 'running':
        return '⏳ 檢查進行中...';
      default:
        return '📋 點擊下方按鈕開始檢查';
    }
  };

  return (
    <div className="deployment-pre-check">
      <div className="check-header">
        <h2>🔍 部署前檢查清單</h2>
        <p className="check-subtitle">多層預防性驗證機制 - 防止資料不同步</p>
      </div>

      {/* 整體狀態 */}
      <div className="overall-status" style={{ borderLeftColor: getStatusColor(overallStatus) }}>
        <div className="status-text">{getOverallStatusText()}</div>
        <button 
          className="run-check-btn"
          onClick={runChecks}
          disabled={loading}
        >
          {loading ? '檢查中...' : '重新檢查'}
        </button>
      </div>

      {/* 檢查項目列表 */}
      <div className="checks-container">
        {checks.length === 0 && !loading ? (
          <div className="empty-state">
            <p>尚未執行檢查</p>
            <button className="run-check-btn" onClick={runChecks}>
              開始檢查
            </button>
          </div>
        ) : (
          checks.map(check => (
            <div key={check.id} className="check-item" style={{ borderLeftColor: getStatusColor(check.status) }}>
              <div 
                className="check-header-row"
                onClick={() => setExpandedCheck(expandedCheck === check.id ? null : check.id)}
              >
                <div className="check-left">
                  <span className="check-icon">{getStatusIcon(check.status)}</span>
                  <div className="check-info">
                    <div className="check-name">{check.name}</div>
                    <div className="check-layer">{check.layer}</div>
                  </div>
                </div>
                <div className="check-right">
                  <span className="expand-icon">
                    {expandedCheck === check.id ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {/* 展開詳情 */}
              {expandedCheck === check.id && (
                <div className="check-details">
                  <p className="check-description">{check.description}</p>
                  
                  {check.details && (
                    <div className="check-details-list">
                      <h4>檢查項目：</h4>
                      <ul>
                        {check.details.map((detail, idx) => (
                          <li key={idx}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {check.error && (
                    <div className="check-error">
                      <h4>❌ 錯誤信息：</h4>
                      <p>{check.error}</p>
                    </div>
                  )}

                  {check.message && (
                    <div className="check-message">
                      <h4>ℹ️ 詳細信息：</h4>
                      <p>{check.message}</p>
                    </div>
                  )}

                  {check.suggestions && check.suggestions.length > 0 && (
                    <div className="check-suggestions">
                      <h4>💡 修復建議：</h4>
                      <ul>
                        {check.suggestions.map((suggestion, idx) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 統計信息 */}
      {checks.length > 0 && (
        <div className="check-stats">
          <div className="stat-item">
            <span className="stat-label">通過</span>
            <span className="stat-value" style={{ color: '#4CAF50' }}>
              {checks.filter(c => c.status === 'passed').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">失敗</span>
            <span className="stat-value" style={{ color: '#F44336' }}>
              {checks.filter(c => c.status === 'failed').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">警告</span>
            <span className="stat-value" style={{ color: '#FF9800' }}>
              {checks.filter(c => c.status === 'warning').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">總計</span>
            <span className="stat-value">{checks.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
