import React, { useState, useEffect } from 'react';
import '../styles/deployment-dashboard.css';

export default function DeploymentDashboard() {
  const [deployments, setDeployments] = useState([]);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // 初始化 WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);
    };
    
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    websocket.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      setIsConnected(false);
    };
    
    websocket.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
      // 3 秒後重新連接
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    };
    
    setWs(websocket);
    
    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, []);

  // 處理 WebSocket 消息
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'deployment_update':
        // 更新部署狀態
        setDeployments(prev => 
          prev.map(d => 
            d.id === data.deploymentId 
              ? { ...d, status: data.status, message: data.message }
              : d
          )
        );
        if (selectedDeployment?.id === data.deploymentId) {
          setSelectedDeployment(prev => ({
            ...prev,
            status: data.status,
            message: data.message
          }));
        }
        break;
        
      case 'deployment_log':
        // 添加新日誌
        if (selectedDeployment?.id === data.deploymentId) {
          setLogs(prev => [data.log, ...prev]);
        }
        break;
        
      default:
        break;
    }
  };

  // 加載部署歷史
  useEffect(() => {
    fetchDeployments();
    fetchStats();
    
    const interval = setInterval(() => {
      fetchDeployments();
      fetchStats();
    }, 5000); // 每 5 秒刷新一次
    
    return () => clearInterval(interval);
  }, []);

  // 獲取部署歷史
  const fetchDeployments = async () => {
    try {
      const response = await fetch('/api/deployments/history?limit=20');
      const data = await response.json();
      setDeployments(data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching deployments:', error);
      setLoading(false);
    }
  };

  // 獲取部署統計
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/deployments/stats');
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // 獲取部署詳情
  const fetchDeploymentDetails = async (deploymentId) => {
    try {
      const response = await fetch(`/api/deployments/${deploymentId}`);
      const data = await response.json();
      setSelectedDeployment(data.deployment);
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching deployment details:', error);
    }
  };

  // 觸發部署
  const triggerDeployment = async () => {
    const serviceName = prompt('輸入服務名稱:');
    if (!serviceName) return;
    
    try {
      const response = await fetch('/api/deployments/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceName })
      });
      const data = await response.json();
      setDeployments(prev => [data.deployment, ...prev]);
      setSelectedDeployment(data.deployment);
    } catch (error) {
      console.error('Error triggering deployment:', error);
      alert('觸發部署失敗');
    }
  };

  // 更新部署狀態
  const updateDeploymentStatus = async (deploymentId, status, message) => {
    try {
      const response = await fetch(`/api/deployments/${deploymentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, message })
      });
      const data = await response.json();
      setSelectedDeployment(data.deployment);
      setDeployments(prev => 
        prev.map(d => d.id === deploymentId ? data.deployment : d)
      );
    } catch (error) {
      console.error('Error updating deployment:', error);
    }
  };

  // 添加日誌
  const addLog = async (deploymentId) => {
    const message = prompt('輸入日誌信息:');
    if (!message) return;
    
    const level = prompt('輸入日誌級別 (info/warning/error):') || 'info';
    
    try {
      const response = await fetch(`/api/deployments/${deploymentId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, message })
      });
      const data = await response.json();
      setLogs(prev => [data.log, ...prev]);
    } catch (error) {
      console.error('Error adding log:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS': return '#4caf50';
      case 'FAILED': return '#f44336';
      case 'PENDING': return '#ff9800';
      case 'IN_PROGRESS': return '#2196f3';
      default: return '#999';
    }
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'error': return '#f44336';
      case 'warning': return '#ff9800';
      case 'info': return '#2196f3';
      default: return '#999';
    }
  };

  return (
    <div className="deployment-dashboard">
      {/* 頭部 */}
      <div className="dashboard-header">
        <h1>🚀 部署監控儀表板</h1>
        <div className="header-actions">
          <button 
            className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}
            title={isConnected ? '已連接' : '未連接'}
          >
            {isConnected ? '● 已連接' : '● 未連接'}
          </button>
          <button className="btn btn-primary" onClick={triggerDeployment}>
            + 觸發部署
          </button>
        </div>
      </div>

      {/* 統計面板 */}
      {stats && (
        <div className="stats-panel">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">總部署數</div>
          </div>
          <div className="stat-card success">
            <div className="stat-value">{stats.success}</div>
            <div className="stat-label">成功</div>
          </div>
          <div className="stat-card error">
            <div className="stat-value">{stats.failed}</div>
            <div className="stat-label">失敗</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">待處理</div>
          </div>
        </div>
      )}

      <div className="dashboard-content">
        {/* 部署歷史列表 */}
        <div className="deployments-list">
          <h2>部署歷史</h2>
          {loading ? (
            <div className="loading">加載中...</div>
          ) : deployments.length === 0 ? (
            <div className="empty">沒有部署記錄</div>
          ) : (
            <div className="list-container">
              {deployments.map(deployment => (
                <div
                  key={deployment.id}
                  className={`deployment-item ${selectedDeployment?.id === deployment.id ? 'active' : ''}`}
                  onClick={() => fetchDeploymentDetails(deployment.id)}
                >
                  <div className="deployment-header">
                    <div className="deployment-title">
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(deployment.status) }}
                      >
                        {deployment.status}
                      </span>
                      <span className="service-name">{deployment.service_name}</span>
                    </div>
                    <div className="deployment-time">
                      {new Date(deployment.created_at).toLocaleString('zh-TW')}
                    </div>
                  </div>
                  <div className="deployment-message">{deployment.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 部署詳情和日誌 */}
        {selectedDeployment && (
          <div className="deployment-details">
            <h2>部署詳情</h2>
            
            {/* 部署信息 */}
            <div className="detail-card">
              <div className="detail-row">
                <span className="label">部署 ID:</span>
                <span className="value">{selectedDeployment.id}</span>
              </div>
              <div className="detail-row">
                <span className="label">服務:</span>
                <span className="value">{selectedDeployment.service_name}</span>
              </div>
              <div className="detail-row">
                <span className="label">環境:</span>
                <span className="value">{selectedDeployment.environment}</span>
              </div>
              <div className="detail-row">
                <span className="label">狀態:</span>
                <span 
                  className="value status"
                  style={{ color: getStatusColor(selectedDeployment.status) }}
                >
                  {selectedDeployment.status}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">消息:</span>
                <span className="value">{selectedDeployment.message}</span>
              </div>
              <div className="detail-row">
                <span className="label">開始時間:</span>
                <span className="value">
                  {new Date(selectedDeployment.started_at).toLocaleString('zh-TW')}
                </span>
              </div>
              {selectedDeployment.completed_at && (
                <div className="detail-row">
                  <span className="label">完成時間:</span>
                  <span className="value">
                    {new Date(selectedDeployment.completed_at).toLocaleString('zh-TW')}
                  </span>
                </div>
              )}
            </div>

            {/* 操作按鈕 */}
            <div className="action-buttons">
              <button 
                className="btn btn-success"
                onClick={() => updateDeploymentStatus(selectedDeployment.id, 'SUCCESS', 'Deployment completed successfully')}
              >
                標記為成功
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => updateDeploymentStatus(selectedDeployment.id, 'FAILED', 'Deployment failed')}
              >
                標記為失敗
              </button>
              <button 
                className="btn btn-info"
                onClick={() => addLog(selectedDeployment.id)}
              >
                添加日誌
              </button>
            </div>

            {/* 日誌列表 */}
            <div className="logs-section">
              <h3>部署日誌 ({logs.length})</h3>
              <div className="logs-container">
                {logs.length === 0 ? (
                  <div className="empty">沒有日誌</div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="log-entry">
                      <div className="log-header">
                        <span 
                          className="log-level"
                          style={{ backgroundColor: getLogLevelColor(log.log_level) }}
                        >
                          {log.log_level.toUpperCase()}
                        </span>
                        <span className="log-time">
                          {new Date(log.timestamp).toLocaleTimeString('zh-TW')}
                        </span>
                      </div>
                      <div className="log-message">{log.message}</div>
                      {log.details && (
                        <div className="log-details">{log.details}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
