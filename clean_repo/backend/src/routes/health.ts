import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/database';
import { getRedisClient } from '../config/redis';
import { getNeo4jDriver } from '../config/neo4j';
import { getRabbitChannel } from '../config/rabbitmq';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        api: 'healthy',
        database: 'unknown',
        redis: 'unknown',
        neo4j: 'unknown',
        rabbitmq: 'unknown'
      },
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };

    // Check database
    try {
      const dbHealth = await checkDatabaseHealth();
      healthData.services.database = dbHealth.healthy ? 'healthy' : 'unhealthy';
    } catch (error) {
      healthData.services.database = 'unhealthy';
      logger.error('Database health check failed:', error);
    }

    // Check Redis
    try {
      const redis = getRedisClient();
      if (redis && redis.status === 'ready') {
        healthData.services.redis = 'healthy';
      } else {
        healthData.services.redis = 'unavailable';
      }
    } catch (error) {
      healthData.services.redis = 'unavailable';
    }

    // Check Neo4j
    try {
      const neo4j = getNeo4jDriver();
      if (neo4j) {
        healthData.services.neo4j = 'healthy';
      } else {
        healthData.services.neo4j = 'unavailable';
      }
    } catch (error) {
      healthData.services.neo4j = 'unavailable';
    }

    // Check RabbitMQ
    try {
      const rabbitMQ = getRabbitChannel();
      if (rabbitMQ) {
        healthData.services.rabbitmq = 'healthy';
      } else {
        healthData.services.rabbitmq = 'unavailable';
      }
    } catch (error) {
      healthData.services.rabbitmq = 'unavailable';
    }

    // Determine overall status
    const criticalServices = ['database', 'api'];
    const hasCriticalServiceFailure = criticalServices.some(service => 
      healthData.services[service as keyof typeof healthData.services] === 'unhealthy'
    );

    if (hasCriticalServiceFailure) {
      healthData.status = 'unhealthy';
      return res.status(503).json(healthData);
    }

    res.json(healthData);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /health/detailed
 * @desc    Detailed health check with service-specific information
 * @access  Public
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: 'unknown',
          responseTime: 0,
          details: null
        },
        redis: {
          status: 'unknown',
          responseTime: 0,
          details: null
        },
        neo4j: {
          status: 'unknown',
          responseTime: 0,
          details: null
        },
        rabbitmq: {
          status: 'unknown',
          responseTime: 0,
          details: null
        }
      }
    };

    // Detailed database check
    try {
      const dbStart = Date.now();
      const dbHealth = await checkDatabaseHealth();
      healthData.services.database = {
        status: dbHealth.healthy ? 'healthy' : 'unhealthy',
        responseTime: dbHealth.responseTime,
        details: dbHealth.details
      };
    } catch (error) {
      healthData.services.database = {
        status: 'unhealthy',
        responseTime: 0,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }

    // Detailed Redis check
    try {
      const redisStart = Date.now();
      const redis = getRedisClient();
      healthData.services.redis = {
        status: redis && redis.status === 'ready' ? 'healthy' : 'unavailable',
        responseTime: Date.now() - redisStart,
        details: redis ? { status: redis.status } : null
      };
    } catch (error) {
      healthData.services.redis = {
        status: 'unavailable',
        responseTime: 0,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }

    // Detailed Neo4j check
    try {
      const neo4jStart = Date.now();
      const neo4j = getNeo4jDriver();
      if (neo4j) {
        const session = neo4j.session();
        const result = await session.run('RETURN 1 as health');
        await session.close();
        healthData.services.neo4j = {
          status: 'healthy',
          responseTime: Date.now() - neo4jStart,
          details: { connected: true }
        };
      } else {
        healthData.services.neo4j = {
          status: 'unavailable',
          responseTime: 0,
          details: { connected: false }
        };
      }
    } catch (error) {
      healthData.services.neo4j = {
        status: 'unhealthy',
        responseTime: 0,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }

    // Detailed RabbitMQ check
    try {
      const rabbitMQStart = Date.now();
      const rabbitMQ = getRabbitChannel();
      if (rabbitMQ) {
        healthData.services.rabbitmq = {
          status: 'healthy',
          responseTime: Date.now() - rabbitMQStart,
          details: { connected: true, channel: 'active' }
        };
      } else {
        healthData.services.rabbitmq = {
          status: 'unavailable',
          responseTime: 0,
          details: { connected: false }
        };
      }
    } catch (error) {
      healthData.services.rabbitmq = {
        status: 'unhealthy',
        responseTime: 0,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }

    res.json(healthData);
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Detailed health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;