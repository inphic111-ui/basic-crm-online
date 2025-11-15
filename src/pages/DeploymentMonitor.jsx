import React, { useState, useEffect } from 'react';
import '../styles/deployment-monitor.css';
import DeploymentPreCheckList from '../components/DeploymentPreCheckList';

export default function DeploymentMonitor() {
  const [deployments, setDeployments] = useState([]);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [logs, setLogs] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [triggeringDeploy, setTriggeringDeploy] = useState(false);

  // 獲取部署歷史
  useEffect(() => {
    fetchDeploymentHistory();
    const interval = setInterval(fetchDeploymentHistory, 10000); // 每10秒刷新
    return () => clearInterval(interval);
  }, []);

  const fetchDeploymentHistory = async () => {
    try {
      const response = await fetch('/api/deployments/history?limit=20');
      if (response.ok) {
        const data = await response.json();
        setDeployments(data);
      }
    } catch (error) {
      console.error('Failed to fetch deployment history:', error);
    }
  };

  // 獲取部署詳情
  const fetchDeploymentDetails = async (deploymentId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/deployments/${deploymentId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedDeployment(data.deployment);
        setLogs(data.logs);
        setChecklist(data.checklist);
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Failed to fetch deployment details:', error);
    } finally {
      setLoading(false);
    }
  };

  // 獲取統計信息
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/deployments/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // 每30秒刷新
    return () => clearInterval(interval);
  }, []);

  // 觸發部署
  const handleTriggerDeploy = async () => {
    setTriggeringDeploy(true);
    try {
      const response = await fetch('/api/deployments/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: process.env.REACT_APP_RAILWAY_SERVICE_ID,
          environmentId: process.env.REACT_APP_RAILWAY_ENVIRONMENT_ID,
          serviceName: 'basic-crm',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedDeployment(data);
        fetchDeploymentHistory();
      }
    } catch (error) {
      console.error('Failed to trigger deployment:', error);
    } finally {
      setTriggeringDeploy(false);
    }
  };

  // 更新檢查清單項目
  const handleUpdateChecklist = async (deploymentId, checkName, newStatus) => {
    try {
      const response = await fetch(
        `/api/deployments/${deploymentId}/checklist/${checkName}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        setChecklist(
          checklist.map(item =>
            item.check_name === checkName
              ? { ...item, status: newStatus }
              : item
          )
        );
      }
    } catch (error) {
      console.error('Failed to update checklist:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS':
        return '#4CAF50';
      case 'FAILED':
        return '#F44336';
      case 'PENDING':
      case 'IN_PROGRESS':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'SUCCESS': '成功',
      'FAILED': '失敗',
      'PENDING': '待處理',
      'IN_PROGRESS': '進行中',
      'CANCELLED': '已取消',
    };
    return statusMap[status] || status;
  };

  return (
    <div className="deployment-monitor">
      {/* 部署前檢查清單 */}
      <DeploymentPreCheckList />
      
      <div className="monitor-header">
        <h1>🚀 部署監控中心</h1>
        <button 
          className="trigger-deploy-btn"
          onClick={handleTriggerDeploy}
          disabled={triggeringDeploy}
        >
          {triggeringDeploy ? '部署中...' : '觸發部署'}
        </button>
      </div>

      <div className="monitor-content">
        {/* 左側：部署歷史 */}
        <div className="deployment-history">
          <h2>部署歷史</h2>
          <div className="history-list">
            {deployments.map(deployment => (
              <div
                key={deployment.id}
                className={`history-item ${selectedDeployment?.id === deployment.id ? 'active' : ''}`}
                onClick={() => fetchDeploymentDetails(deployment.deployment_id)}
              >
                <div className="history-status" style={{ backgroundColor: getStatusColor(deployment.status) }}></div>
                <div className="history-info">
                  <div className="history-service">{deployment.service_name}</div>
                  <div className="history-time">
                    {new Date(deployment.created_at).toLocaleString('zh-TW')}
                  </div>
                  <div className="history-status-text">{getStatusText(deployment.status)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右側：詳情面板 */}
        <div className="deployment-details">
          {selectedDeployment ? (
            <>
              {/* 部署信息 */}
              <div className="detail-section">
                <h3>部署信息</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">狀態：</span>
                    <span className="value" style={{ color: getStatusColor(selectedDeployment.status) }}>
                      {getStatusText(selectedDeployment.status)}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">服務：</span>
                    <span className="value">{selectedDeployment.service_name}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">環境：</span>
                    <span className="value">{selectedDeployment.environment}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">創建者：</span>
                    <span className="value">{selectedDeployment.created_by}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">開始時間：</span>
                    <span className="value">
                      {selectedDeployment.started_at
                        ? new Date(selectedDeployment.started_at).toLocaleString('zh-TW')
                        : '-'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">完成時間：</span>
                    <span className="value">
                      {selectedDeployment.completed_at
                        ? new Date(selectedDeployment.completed_at).toLocaleString('zh-TW')
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 檢查清單 */}
              {checklist.length > 0 && (
                <div className="detail-section">
                  <h3>檢查清單</h3>
                  <div className="checklist">
                    {checklist.map(item => (
                      <div key={item.id} className="checklist-item">
                        <input
                          type="checkbox"
                          checked={item.status === 'completed'}
                          onChange={() =>
                            handleUpdateChecklist(
                              selectedDeployment.deployment_id,
                              item.check_name,
                              item.status === 'completed' ? 'pending' : 'completed'
                            )
                          }
                        />
                        <span className="check-name">{item.check_name}</span>
                        {item.description && (
                          <span className="check-description">{item.description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 監控指標 */}
              {metrics.length > 0 && (
                <div className="detail-section">
                  <h3>監控指標</h3>
                  <div className="metrics-grid">
                    {metrics.map(metric => (
                      <div key={metric.id} className="metric-card">
                        <div className="metric-name">{metric.metric_name}</div>
                        <div className="metric-value">
                          {metric.metric_value}
                          {metric.unit && <span className="metric-unit">{metric.unit}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 部署日誌 */}
              <div className="detail-section">
                <h3>部署日誌</h3>
                <div className="logs-container">
                  {logs.length > 0 ? (
                    logs.map(log => (
                      <div key={log.id} className={`log-entry log-${log.log_level.toLowerCase()}`}>
                        <span className="log-time">
                          {new Date(log.timestamp).toLocaleTimeString('zh-TW')}
                        </span>
                        <span className="log-level">[{log.log_level}]</span>
                        <span className="log-message">{log.message}</span>
                      </div>
                    ))
                  ) : (
                    <div className="no-logs">暫無日誌</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection">選擇一個部署以查看詳情</div>
          )}
        </div>
      </div>

      {/* 統計面板 */}
      {stats && (
        <div className="stats-panel">
          <h3>部署統計（最近30天）</h3>
          <div className="stats-grid">
            {stats.map(stat => (
              <div key={stat.status} className="stat-card">
                <div className="stat-status">{getStatusText(stat.status)}</div>
                <div className="stat-count">{stat.count}</div>
                {stat.avg_duration && (
                  <div className="stat-duration">
                    平均耗時：{Math.round(stat.avg_duration)}秒
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
