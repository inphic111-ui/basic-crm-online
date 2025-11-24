import { useEffect, useRef, useCallback } from 'react';

/**
 * WebSocket 連接 Hook
 * 用於實時監聽部署狀態更新
 */
export function useDeploymentWebSocket(deploymentId, onUpdate) {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 秒

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[WebSocket] Connected');
        reconnectAttemptsRef.current = 0;

        // 訂閱部署
        if (deploymentId) {
          wsRef.current.send(JSON.stringify({
            type: 'subscribe',
            deploymentId,
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onUpdate(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      wsRef.current.onclose = () => {
        console.log('[WebSocket] Disconnected');
        attemptReconnect();
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      attemptReconnect();
    }
  }, [deploymentId, onUpdate]);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
      reconnectAttemptsRef.current += 1;
      console.log(
        `[WebSocket] Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`
      );

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectDelay);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
    }
  }, [connect]);

  const subscribe = useCallback((newDeploymentId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        deploymentId: newDeploymentId,
      }));
    }
  }, []);

  const unsubscribe = useCallback((unsubscribeDeploymentId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        deploymentId: unsubscribeDeploymentId,
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // 初始連接
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // 當 deploymentId 改變時，重新訂閱
  useEffect(() => {
    if (deploymentId && wsRef.current?.readyState === WebSocket.OPEN) {
      subscribe(deploymentId);
    }
  }, [deploymentId, subscribe]);

  return {
    subscribe,
    unsubscribe,
    disconnect,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}

/**
 * 部署監控 Hook
 * 結合 WebSocket 和 API 調用
 */
export function useDeploymentMonitoring(deploymentId) {
  const [deployment, setDeployment] = React.useState(null);
  const [logs, setLogs] = React.useState([]);
  const [checklist, setChecklist] = React.useState([]);
  const [metrics, setMetrics] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const handleUpdate = useCallback((data) => {
    switch (data.type) {
      case 'deployment_update':
        setDeployment(prev => ({
          ...prev,
          status: data.status,
          message: data.message,
        }));
        break;

      case 'deployment_log':
        setLogs(prev => [...prev, {
          id: data.id,
          log_level: data.level,
          message: data.message,
          timestamp: data.timestamp,
        }]);
        break;

      case 'checklist_update':
        setChecklist(data.checklist);
        break;

      case 'metric_update':
        setMetrics(prev => [...prev, {
          id: data.id,
          metric_name: data.metric_name,
          metric_value: data.metric_value,
          unit: data.unit,
          recorded_at: data.timestamp,
        }]);
        break;

      default:
        break;
    }
  }, []);

  const ws = useDeploymentWebSocket(deploymentId, handleUpdate);

  // 初始加載
  useEffect(() => {
    if (deploymentId) {
      setLoading(true);
      fetch(`/api/deployments/${deploymentId}`)
        .then(res => res.json())
        .then(data => {
          setDeployment(data.deployment);
          setLogs(data.logs);
          setChecklist(data.checklist);
          setMetrics(data.metrics);
        })
        .catch(error => console.error('Error loading deployment:', error))
        .finally(() => setLoading(false));
    }
  }, [deploymentId]);

  return {
    deployment,
    logs,
    checklist,
    metrics,
    loading,
    isConnected: ws.isConnected,
  };
}
