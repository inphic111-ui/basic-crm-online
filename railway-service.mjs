/**
 * Railway API 集成服務
 * 用於與 Railway 平台通信，實現部署管理
 */

import axios from 'axios';

const RAILWAY_API_URL = 'https://api.railway.app/graphql';

class RailwayService {
  constructor(apiToken) {
    this.apiToken = apiToken;
    this.client = axios.create({
      baseURL: RAILWAY_API_URL,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 執行 GraphQL 查詢
   */
  async query(query, variables = {}) {
    try {
      const response = await this.client.post('', {
        query,
        variables,
      });

      if (response.data.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data.data;
    } catch (error) {
      console.error('Railway API Error:', error.message);
      throw error;
    }
  }

  /**
   * 獲取項目信息
   */
  async getProject(projectId) {
    const query = `
      query GetProject($id: String!) {
        project(id: $id) {
          id
          name
          description
          createdAt
          updatedAt
        }
      }
    `;

    return this.query(query, { id: projectId });
  }

  /**
   * 獲取環境列表
   */
  async getEnvironments(projectId) {
    const query = `
      query GetEnvironments($projectId: String!) {
        environments(projectId: $projectId) {
          edges {
            node {
              id
              name
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    return this.query(query, { projectId });
  }

  /**
   * 獲取服務列表
   */
  async getServices(projectId, environmentId) {
    const query = `
      query GetServices($projectId: String!, $environmentId: String!) {
        services(projectId: $projectId, environmentId: $environmentId) {
          edges {
            node {
              id
              name
              status
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    return this.query(query, { projectId, environmentId });
  }

  /**
   * 獲取部署歷史
   */
  async getDeployments(projectId, environmentId, limit = 10) {
    const query = `
      query GetDeployments($projectId: String!, $environmentId: String!, $first: Int) {
        deployments(projectId: $projectId, environmentId: $environmentId, first: $first) {
          edges {
            node {
              id
              status
              message
              createdAt
              updatedAt
              creator {
                email
              }
            }
          }
        }
      }
    `;

    return this.query(query, { projectId, environmentId, first: limit });
  }

  /**
   * 獲取部署詳情
   */
  async getDeploymentDetails(deploymentId) {
    const query = `
      query GetDeployment($id: String!) {
        deployment(id: $id) {
          id
          status
          message
          createdAt
          updatedAt
          creator {
            email
          }
          logs {
            edges {
              node {
                id
                message
                level
                createdAt
              }
            }
          }
        }
      }
    `;

    return this.query(query, { id: deploymentId });
  }

  /**
   * 觸發部署
   */
  async triggerDeploy(serviceId, environmentId) {
    const query = `
      mutation TriggerDeploy($serviceId: String!, $environmentId: String!) {
        deployService(serviceId: $serviceId, environmentId: $environmentId) {
          id
          status
          createdAt
        }
      }
    `;

    return this.query(query, { serviceId, environmentId });
  }

  /**
   * 獲取部署日誌
   */
  async getDeploymentLogs(deploymentId) {
    const query = `
      query GetDeploymentLogs($id: String!) {
        deployment(id: $id) {
          logs {
            edges {
              node {
                id
                message
                level
                createdAt
              }
            }
          }
        }
      }
    `;

    return this.query(query, { id: deploymentId });
  }

  /**
   * 監控部署狀態
   */
  async monitorDeployment(deploymentId, callback, interval = 5000) {
    const pollInterval = setInterval(async () => {
      try {
        const deployment = await this.getDeploymentDetails(deploymentId);
        callback(deployment);

        // 如果部署完成或失敗，停止輪詢
        if (['SUCCESS', 'FAILED', 'CANCELLED'].includes(deployment.status)) {
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error monitoring deployment:', error);
        callback({ error: error.message });
      }
    }, interval);

    return pollInterval;
  }
}

export default RailwayService;
