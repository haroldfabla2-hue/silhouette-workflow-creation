import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

// Import configurations
import { loadConfig } from './config/config';
import { setupDatabase } from './config/database';
import { setupRedis } from './config/redis';
import { setupNeo4j } from './config/neo4j';
import { setupRabbitMQ } from './config/rabbitmq';
import { setupSilhouetteIntegration } from './integrations/silhouette/setup';

// Import middleware
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import organizationRoutes from './routes/organizations';
import workflowRoutes from './routes/workflows';
import credentialRoutes from './routes/credentials';
import teamRoutes from './routes/teams';
import executionRoutes from './routes/executions';
import collaborationRoutes from './routes/collaboration';
import analyticsRoutes from './routes/analytics';
import healthRoutes from './routes/health';
import aiRoutes from './routes/ai';
import qaRoutes from './routes/qa';
import frameworkV4Routes from './routes/framework-v4';
import enterpriseAgentsRoutes from './routes/enterprise-agents';

// Import services
import { CollaborationService } from './services/collaboration';
import { NotificationService } from './services/notification';
import { MetricsService } from './services/metrics';

// Import Framework V4.0
import { 
  FrameworkV4Router, 
  enableFrameworkV4, 
  validateCompatibility,
  initializeFrameworkV4,
  shutdownFrameworkV4
} from './framework-v4';

// Load environment variables
dotenv.config();

class SilhouetteServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private collaborationService: CollaborationService;
  private notificationService: NotificationService;
  private metricsService: MetricsService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
    });
    
    this.collaborationService = new CollaborationService(this.io);
    this.notificationService = new NotificationService(this.io);
    this.metricsService = new MetricsService();
    
    this.initializeApp();
  }

  private initializeApp(): void {
    const config = loadConfig();
    
    console.log('🚀 Initializing Silhouette Workflow Creation Backend...');
    console.log(`📊 Environment: ${config.nodeEnv}`);
    console.log(`🔗 Port: ${config.port}`);
    
    // Initialize Framework V4.0 first
    this.initializeFrameworkV4();
    
    // Basic middleware setup
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
        },
      },
    }));
    
    this.app.use(cors({
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));
    
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => {
          console.log(message.trim());
        }
      }
    }));
    
    // Health check endpoint (no auth required)
    this.app.use('/health', healthRoutes);
    
    // Apply rate limiting
    this.app.use(rateLimiter);
    
    // Apply request logging
    this.app.use(requestLogger);
    
    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', authMiddleware, userRoutes);
    this.app.use('/api/organizations', authMiddleware, organizationRoutes);
    this.app.use('/api/workflows', authMiddleware, workflowRoutes);
    this.app.use('/api/credentials', authMiddleware, credentialRoutes);
    this.app.use('/api/teams', authMiddleware, teamRoutes);
    this.app.use('/api/executions', authMiddleware, executionRoutes);
    this.app.use('/api/collaboration', authMiddleware, collaborationRoutes);
    this.app.use('/api/analytics', authMiddleware, analyticsRoutes);
    this.app.use('/api/ai', authMiddleware, aiRoutes);
    this.app.use('/api/qa', authMiddleware, qaRoutes);
    this.app.use('/api/framework-v4', frameworkV4Routes);
    this.app.use('/api/enterprise-agents', authMiddleware, enterpriseAgentsRoutes);
    
    // Serve static files
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
    
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method} ${req.originalUrl} not found`
        }
      });
    });
    
    // Global error handler
    this.app.use(errorHandler);
    
    // Setup WebSocket handlers
    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    console.log('🔌 Setting up WebSocket connections...');
    
    // Authentication middleware for WebSocket
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        if (!token) {
          return next(new Error('Authentication error'));
        }
        
        // Verify JWT token (implementation needed)
        // const user = await this.authService.verifyToken(token);
        // socket.user = user;
        
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
    
    // WebSocket connection handling
    this.io.on('connection', (socket) => {
      console.log(`👤 User connected: ${socket.id}`);
      
      // Join workflow rooms for collaboration
      socket.on('join-workflow', (workflowId: string) => {
        socket.join(`workflow-${workflowId}`);
        this.collaborationService.handleUserJoinWorkflow(socket, workflowId);
      });
      
      // Leave workflow rooms
      socket.on('leave-workflow', (workflowId: string) => {
        socket.leave(`workflow-${workflowId}`);
        this.collaborationService.handleUserLeaveWorkflow(socket, workflowId);
      });
      
      // Handle cursor movement
      socket.on('cursor-move', (data: { workflowId: string; position: any }) => {
        this.collaborationService.handleCursorMove(socket, data);
      });
      
      // Handle node selection
      socket.on('node-select', (data: { workflowId: string; nodeIds: string[] }) => {
        this.collaborationService.handleNodeSelection(socket, data);
      });
      
      // Handle workflow updates
      socket.on('workflow-update', (data: { workflowId: string; changes: any }) => {
        this.collaborationService.handleWorkflowUpdate(socket, data);
      });
      
      // Handle real-time typing
      socket.on('typing-start', (data: { workflowId: string; field: string }) => {
        this.collaborationService.handleTypingStart(socket, data);
      });
      
      socket.on('typing-stop', (data: { workflowId: string; field: string }) => {
        this.collaborationService.handleTypingStop(socket, data);
      });
      
      // Handle workflow execution status updates
      socket.on('execution-status', (data: { workflowId: string; status: string; executionId: string }) => {
        this.notificationService.broadcastExecutionStatus(data);
      });
      
      // Handle user presence
      socket.on('user-presence', (data: { workflowId: string; status: 'active' | 'away' | 'busy' }) => {
        this.collaborationService.handleUserPresence(socket, data);
      });
      
      // QA System WebSocket Events
      socket.on('qa-verify-information', (data: { content: string; context: any; requestId: string }) => {
        // QA verification will be handled by QASystem service
        console.log('🔍 QA Information verification requested:', data.requestId);
      });
      
      socket.on('qa-detect-hallucination', (data: { content: string; requestId: string }) => {
        console.log('🤖 QA Hallucination detection requested:', data.requestId);
      });
      
      socket.on('qa-verify-sources', (data: { sources: string[]; content: string; requestId: string }) => {
        console.log('📚 QA Source verification requested:', data.requestId);
      });
      
      // Handle disconnect
      socket.on('disconnect', (reason) => {
        console.log(`👤 User disconnected: ${socket.id}, reason: ${reason}`);
        this.collaborationService.handleUserDisconnect(socket);
      });
      
      // Handle errors
      socket.on('error', (error) => {
        console.error(`❌ WebSocket error for ${socket.id}:`, error);
      });
    });
  }

  private async startServices(): Promise<void> {
    try {
      console.log('🔧 Starting services...');
      
      // Initialize TypeORM database for user management
      const { initializeDatabase } = await import('./database/data-source');
      await initializeDatabase();
      console.log('✅ User management database connected');
      
      // Initialize database connections
      await setupDatabase();
      console.log('✅ Main database connected');
      
      await setupRedis();
      console.log('✅ Redis connected');
      
      await setupNeo4j();
      console.log('✅ Neo4j connected');
      
      await setupRabbitMQ();
      console.log('✅ RabbitMQ connected');
      
      // Initialize Silhouette framework integration
      await setupSilhouetteIntegration();
      console.log('✅ Silhouette framework integrated');
      
      // Start background services
      this.startBackgroundServices();
      console.log('✅ Background services started');
      
    } catch (error) {
      console.error('❌ Failed to start services:', error);
      process.exit(1);
    }
  }

  private startBackgroundServices(): void {
    // Start metrics collection
    setInterval(async () => {
      try {
        await this.metricsService.collectSystemMetrics();
      } catch (error) {
        console.error('Failed to collect metrics:', error);
      }
    }, 30000); // Every 30 seconds
    
    // Start health checks
    setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 60000); // Every minute
  }

  private async healthCheck(): Promise<void> {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unknown',
        redis: 'unknown',
        neo4j: 'unknown',
        rabbitmq: 'unknown',
        silhouette: 'unknown'
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };
    
    // Update health status based on service connections
    // Implementation would check each service connection
    
    console.log(`💓 Health check: ${healthData.status}`);
  }

  private async initializeFrameworkV4(): Promise<void> {
    try {
      await initializeFrameworkV4();
      
      // Add Framework V4.0 middleware
      this.app.use(enableFrameworkV4());
      this.app.use(validateCompatibility());
      
      // Add Framework V4.0 routes
      this.app.use('/api/framework-v4', FrameworkV4Router);
      
      console.log('✅ Framework V4.0 integrated successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Framework V4.0:', error);
      // Don't crash the server, just log the error
    }
  }

  public async start(): Promise<void> {
    try {
      // Start all services
      await this.startServices();
      
      // Start the server
      const config = loadConfig();
      this.server.listen(config.port, () => {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║  🎉 Silhouette Workflow Creation Backend Started Successfully  ║
║                                                              ║
║  📊 Environment: ${config.nodeEnv}                              ║
║  🔗 API Server: http://localhost:${config.port}               ║
║  🔌 WebSocket: ws://localhost:${config.port}                  ║
║  🏥 Health: http://localhost:${config.port}/health             ║
║                                                              ║
║  🚀 Ready to create amazing workflows!                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `);
      });
      
      // Graceful shutdown
      process.on('SIGTERM', this.gracefulShutdown.bind(this));
      process.on('SIGINT', this.gracefulShutdown.bind(this));
      
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(): Promise<void> {
    console.log('🛑 Shutting down gracefully...');
    
    try {
      // Shutdown Framework V4.0 first
      shutdownFrameworkV4();
      
      // Close WebSocket connections
      this.io.close();
      
      // Close HTTP server
      this.server.close(() => {
        console.log('✅ HTTP server closed');
      });
      
      // Close database connections
      // await database.disconnect();
      // await redis.disconnect();
      // await neo4j.disconnect();
      // await rabbitmq.disconnect();
      
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new SilhouetteServer();
  server.start().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}

export { SilhouetteServer };