/**
 * WebSocket 實時推送服務
 * 用於實時推送部署狀態更新
 */

import { WebSocketServer } from 'ws';

class WebSocketService {
  constructor(server) {
    this.wss = new WebSocketServer({ server });
    this.clients = new Map();
    this.deploymentSubscribers = new Map();

    this.wss.on('connection', (ws) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);

      console.log(`[WebSocket] Client connected: ${clientId}`);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(clientId, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        // 移除該客戶端的所有訂閱
        for (const [deploymentId, subscribers] of this.deploymentSubscribers.entries()) {
          const index = subscribers.indexOf(clientId);
          if (index > -1) {
            subscribers.splice(index, 1);
          }
          if (subscribers.length === 0) {
            this.deploymentSubscribers.delete(deploymentId);
          }
        }
        console.log(`[WebSocket] Client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        console.error(`[WebSocket] Error for client ${clientId}:`, error);
      });

      // 發送歡迎消息
      ws.send(JSON.stringify({
        type: 'connection',
        clientId,
        message: 'Connected to deployment monitoring service',
      }));
    });
  }

  /**
   * 生成客戶端 ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 處理客戶端消息
   */
  handleMessage(clientId, data) {
    const { type, deploymentId, action } = data;

    switch (type) {
      case 'subscribe':
        this.subscribeToDeployment(clientId, deploymentId);
        break;

      case 'unsubscribe':
        this.unsubscribeFromDeployment(clientId, deploymentId);
        break;

      case 'ping':
        this.sendToClient(clientId, { type: 'pong' });
        break;

      default:
        console.warn(`[WebSocket] Unknown message type: ${type}`);
    }
  }

  /**
   * 訂閱部署狀態更新
   */
  subscribeToDeployment(clientId, deploymentId) {
    if (!this.deploymentSubscribers.has(deploymentId)) {
      this.deploymentSubscribers.set(deploymentId, []);
    }

    const subscribers = this.deploymentSubscribers.get(deploymentId);
    if (!subscribers.includes(clientId)) {
      subscribers.push(clientId);
    }

    this.sendToClient(clientId, {
      type: 'subscribed',
      deploymentId,
      message: `Subscribed to deployment ${deploymentId}`,
    });

    console.log(`[WebSocket] Client ${clientId} subscribed to deployment ${deploymentId}`);
  }

  /**
   * 取消訂閱部署狀態更新
   */
  unsubscribeFromDeployment(clientId, deploymentId) {
    if (this.deploymentSubscribers.has(deploymentId)) {
      const subscribers = this.deploymentSubscribers.get(deploymentId);
      const index = subscribers.indexOf(clientId);
      if (index > -1) {
        subscribers.splice(index, 1);
      }

      if (subscribers.length === 0) {
        this.deploymentSubscribers.delete(deploymentId);
      }
    }

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      deploymentId,
      message: `Unsubscribed from deployment ${deploymentId}`,
    });

    console.log(`[WebSocket] Client ${clientId} unsubscribed from deployment ${deploymentId}`);
  }

  /**
   * 發送消息給特定客戶端
   */
  sendToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (client && client.readyState === 1) { // OPEN
      client.send(JSON.stringify(data));
    }
  }

  /**
   * 廣播部署狀態更新給所有訂閱者
   */
  broadcastDeploymentUpdate(deploymentId, update) {
    const subscribers = this.deploymentSubscribers.get(deploymentId) || [];

    const message = {
      type: 'deployment_update',
      deploymentId,
      timestamp: new Date().toISOString(),
      ...update,
    };

    for (const clientId of subscribers) {
      this.sendToClient(clientId, message);
    }

    console.log(
      `[WebSocket] Broadcast deployment update to ${subscribers.length} subscribers`
    );
  }

  /**
   * 廣播部署日誌給所有訂閱者
   */
  broadcastDeploymentLog(deploymentId, log) {
    const subscribers = this.deploymentSubscribers.get(deploymentId) || [];

    const message = {
      type: 'deployment_log',
      deploymentId,
      timestamp: new Date().toISOString(),
      ...log,
    };

    for (const clientId of subscribers) {
      this.sendToClient(clientId, message);
    }
  }

  /**
   * 廣播檢查清單更新給所有訂閱者
   */
  broadcastChecklistUpdate(deploymentId, checklist) {
    const subscribers = this.deploymentSubscribers.get(deploymentId) || [];

    const message = {
      type: 'checklist_update',
      deploymentId,
      timestamp: new Date().toISOString(),
      checklist,
    };

    for (const clientId of subscribers) {
      this.sendToClient(clientId, message);
    }
  }

  /**
   * 廣播監控指標給所有訂閱者
   */
  broadcastMetric(deploymentId, metric) {
    const subscribers = this.deploymentSubscribers.get(deploymentId) || [];

    const message = {
      type: 'metric_update',
      deploymentId,
      timestamp: new Date().toISOString(),
      ...metric,
    };

    for (const clientId of subscribers) {
      this.sendToClient(clientId, message);
    }
  }

  /**
   * 廣播消息給所有連接的客戶端
   */
  broadcastToAll(data) {
    const message = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...data,
    });

    for (const [, client] of this.clients) {
      if (client.readyState === 1) { // OPEN
        client.send(message);
      }
    }

    console.log(`[WebSocket] Broadcast to ${this.clients.size} clients`);
  }

  /**
   * 獲取連接的客戶端數量
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * 獲取部署的訂閱者數量
   */
  getSubscriberCount(deploymentId) {
    return (this.deploymentSubscribers.get(deploymentId) || []).length;
  }

  /**
   * 關閉 WebSocket 服務
   */
  close() {
    this.wss.close();
    console.log('[WebSocket] Service closed');
  }
}

export default WebSocketService;
