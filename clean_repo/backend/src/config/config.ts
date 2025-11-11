import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  nodeEnv: string;
  port: number;
  frontendUrl: string;
  corsOrigins: string[];
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  databaseUrl: string;
  redisUrl: string;
  neo4jUrl: string;
  rabbitMqUrl: string;
  logLevel: string;
  enableCors: boolean;
  trustProxy: boolean;
}

export const loadConfig = (): Config => {
  const config: Config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001'),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret_change_in_production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/silhouette',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    neo4jUrl: process.env.NEO4J_URL || 'bolt://localhost:7687',
    rabbitMqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    logLevel: process.env.LOG_LEVEL || 'info',
    enableCors: process.env.ENABLE_CORS === 'true',
    trustProxy: process.env.TRUST_PROXY === 'true',
  };

  console.log('🔧 Configuration loaded:', {
    nodeEnv: config.nodeEnv,
    port: config.port,
    frontendUrl: config.frontendUrl,
    jwtExpiresIn: config.jwtExpiresIn,
  });

  return config;
};

export default loadConfig;