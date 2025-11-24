/**
 * 部署管理 API 路由
 */

import express from 'express';
import RailwayService from './railway-service.mjs';
import { deploymentQueries } from './deployment-schema.mjs';

const router = express.Router();

// 初始化 Railway 服務
const railwayService = process.env.RAILWAY_API_TOKEN 
  ? new RailwayService(process.env.RAILWAY_API_TOKEN)
  : null;

/**
 * 獲取部署歷史
 * GET /api/deployments/history?limit=10&offset=0
 */
router.get('/history', async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const db = req.app.locals.db;

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const result = await db.query(deploymentQueries.getDeploymentHistory, [limit, offset]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching deployment history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 獲取部署詳情
 * GET /api/deployments/:deploymentId
 */
router.get('/:deploymentId', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const db = req.app.locals.db;

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const deployment = await db.query(
      deploymentQueries.getDeploymentDetails,
      [deploymentId]
    );

    const logs = await db.query(
      deploymentQueries.getDeploymentLogs,
      [deploymentId]
    );

    const checklist = await db.query(
      deploymentQueries.getChecklist,
      [deploymentId]
    );

    const metrics = await db.query(
      deploymentQueries.getMonitoringMetrics,
      [deploymentId]
    );

    res.json({
      deployment: deployment.rows[0],
      logs: logs.rows,
      checklist: checklist.rows,
      metrics: metrics.rows,
    });
  } catch (error) {
    console.error('Error fetching deployment details:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 獲取部署日誌
 * GET /api/deployments/:deploymentId/logs
 */
router.get('/:deploymentId/logs', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const db = req.app.locals.db;

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const result = await db.query(
      deploymentQueries.getDeploymentLogs,
      [deploymentId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching deployment logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 觸發部署
 * POST /api/deployments/trigger
 */
router.post('/trigger', async (req, res) => {
  try {
    const { serviceId, environmentId, serviceName } = req.body;
    const db = req.app.locals.db;

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    if (!railwayService) {
      return res.status(500).json({ error: 'Railway API not configured' });
    }

    // 觸發 Railway 部署
    const deployment = await railwayService.triggerDeploy(serviceId, environmentId);

    // 保存到數據庫
    const dbResult = await db.query(
      deploymentQueries.insertDeployment,
      [
        deployment.id,
        serviceName || 'Unknown',
        environmentId,
        'pending',
        'Deployment triggered',
        process.env.RAILWAY_USER || 'system',
      ]
    );

    // 開始監控部署
    railwayService.monitorDeployment(deployment.id, async (status) => {
      try {
        // 更新數據庫狀態
        await db.query(
          deploymentQueries.updateDeploymentStatus,
          [status.status, status.message, deployment.id]
        );

        // 保存日誌
        if (status.logs && status.logs.edges) {
          for (const log of status.logs.edges) {
            await db.query(
              deploymentQueries.insertDeploymentLog,
              [deployment.id, log.node.level, log.node.message]
            );
          }
        }
      } catch (error) {
        console.error('Error updating deployment status:', error);
      }
    });

    res.json(dbResult.rows[0]);
  } catch (error) {
    console.error('Error triggering deployment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 添加檢查清單項目
 * POST /api/deployments/:deploymentId/checklist
 */
router.post('/:deploymentId/checklist', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const { checkName, status, description } = req.body;
    const db = req.app.locals.db;

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    await db.query(
      deploymentQueries.insertChecklistItem,
      [deploymentId, checkName, status, description]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding checklist item:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 更新檢查清單項目
 * PUT /api/deployments/:deploymentId/checklist/:checkName
 */
router.put('/:deploymentId/checklist/:checkName', async (req, res) => {
  try {
    const { deploymentId, checkName } = req.params;
    const { status } = req.body;
    const db = req.app.locals.db;

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    await db.query(
      deploymentQueries.updateChecklistItem,
      [status, deploymentId, checkName]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 添加監控指標
 * POST /api/deployments/:deploymentId/metrics
 */
router.post('/:deploymentId/metrics', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const { metricName, metricValue, unit } = req.body;
    const db = req.app.locals.db;

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    await db.query(
      deploymentQueries.insertMonitoringMetric,
      [deploymentId, metricName, metricValue, unit]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding monitoring metric:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 獲取部署統計信息
 * GET /api/deployments/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const db = req.app.locals.db;

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const result = await db.query(deploymentQueries.getDeploymentStats);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching deployment stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
