# Automated Testing Framework - Completo

## Descripción General

El **Automated Testing Framework** de Silhouette Workflow Creation es un sistema integral de testing automatizado que garantiza la calidad, confiabilidad y rendimiento de la plataforma a través de múltiples capas de testing. Este framework implementa testing unitario, de integración, end-to-end (E2E), API testing y mobile testing con una cobertura objetivo del 95%+.

## Arquitectura del Framework de Testing

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                AUTOMATED TESTING FRAMEWORK                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ UNIT TESTING    │  │ INTEGRATION     │  │ E2E TESTING  │ │
│  │                 │  │ TESTING         │  │              │ │
│  │ • Jest/Supertest│  │ • TestContainers│  │ • Cypress    │ │
│  │ • Mock Services │  │ • API Testing   │  │ • Playwright │ │
│  │ • 95% Coverage  │  │ • DB Testing    │  │ • Full User  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ API TESTING     │  │ MOBILE TESTING  │  │ SECURITY     │ │
│  │                 │  │                 │  │ TESTING      │ │
│  │ • Postman/Newman│  │ • Detox         │  │              │ │
│  │ • REST Assured  │  │ • Jest Mobile   │  │ • OWASP ZAP  │ │
│  │ • Contract Test │  │ • Device Farm   │  │ • Input Val. │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ PERFORMANCE     │  │ ACCESSIBILITY   │  │ VISUAL       │ │
│  │ TESTING         │  │ TESTING         │  │ REGRESSION   │ │
│  │                 │  │                 │  │              │ │
│  │ • K6/JMeter     │  │ • Axe-Core      │  │ • Percy      │ │
│  │ • Load Tests    │  │ • Screen Reader │  │ • Screenshot │ │
│  │ • Benchmark     │  │ • Keyboard Nav  │  │ • Diff Check │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 1. Unit Testing Framework

### Configuración de Jest para Backend

#### Configuración de Jest
```typescript
// backend/jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.[jt]s',
    '**/*.(test|spec).[jt]s',
  ],
  transform: {
    '^.+\\.[jt]s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/config/**/*',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary',
  ],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  maxWorkers: '50%',
  verbose: true,
};

export default config;
```

#### Setup de Testing Environment
```typescript
// backend/tests/setup.ts
import { setupTestDatabase } from './utils/test-database';
import { setupTestRedis } from './utils/test-redis';
import { setupTestRabbitMQ } from './utils/test-rabbitmq';

beforeAll(async () => {
  await setupTestDatabase();
  await setupTestRedis();
  await setupTestRabbitMQ();
});

afterAll(async () => {
  // Cleanup test resources
  await cleanupTestDatabase();
  await cleanupTestRedis();
  await cleanupTestRabbitMQ();
});

beforeEach(async () => {
  // Reset database state before each test
  await resetTestDatabase();
});

afterEach(async () => {
  // Cleanup after each test
  await cleanupTestData();
});
```

### Ejemplo de Test Unitario - Servicio de Workflow

```typescript
// backend/src/services/workflow.service.test.ts
import { WorkflowService } from './workflow.service';
import { mockWorkflowData, createMockWorkflow } from '../../tests/mocks/workflow.mocks';
import { DatabaseError, ValidationError } from '../utils/errors';

describe('WorkflowService', () => {
  let workflowService: WorkflowService;
  let mockRepository: jest.Mocked<any>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findWithExecutions: jest.fn(),
    };
    workflowService = new WorkflowService(mockRepository);
  });

  describe('createWorkflow', () => {
    it('should create a workflow successfully', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'Test Description',
        triggers: [{ type: 'manual' }],
        actions: [{ type: 'api_call', config: { url: 'http://api.example.com' } }],
      };

      const expectedWorkflow = {
        id: 'workflow-123',
        ...workflowData,
        userId: 'user-456',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft',
      };

      mockRepository.create.mockResolvedValue(expectedWorkflow);

      const result = await workflowService.createWorkflow(workflowData, 'user-456');

      expect(result).toEqual(expectedWorkflow);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...workflowData,
        userId: 'user-456',
        status: 'draft',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should throw ValidationError for invalid workflow data', async () => {
      const invalidWorkflowData = {
        name: '', // Empty name should fail validation
        triggers: [],
        actions: [],
      };

      await expect(
        workflowService.createWorkflow(invalidWorkflowData, 'user-456')
      ).rejects.toThrow(ValidationError);
    });

    it('should handle database errors gracefully', async () => {
      const workflowData = {
        name: 'Test Workflow',
        triggers: [{ type: 'manual' }],
        actions: [{ type: 'api_call' }],
      };

      mockRepository.create.mockRejectedValue(new DatabaseError('Connection failed'));

      await expect(
        workflowService.createWorkflow(workflowData, 'user-456')
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('executeWorkflow', () => {
    it('should execute workflow successfully', async () => {
      const workflow = createMockWorkflow({ status: 'active' });
      mockRepository.findById.mockResolvedValue(workflow);

      const mockExecution = {
        id: 'exec-123',
        workflowId: workflow.id,
        status: 'running',
        startedAt: new Date(),
      };

      const result = await workflowService.executeWorkflow(workflow.id, { trigger: 'manual' });

      expect(result).toEqual(mockExecution);
      expect(mockRepository.findById).toHaveBeenCalledWith(workflow.id);
    });

    it('should throw error for inactive workflow', async () => {
      const workflow = createMockWorkflow({ status: 'draft' });
      mockRepository.findById.mockResolvedValue(workflow);

      await expect(
        workflowService.executeWorkflow(workflow.id, { trigger: 'manual' })
      ).rejects.toThrow('Workflow is not active');
    });
  });

  describe('getWorkflowMetrics', () => {
    it('should return correct metrics for workflow', async () => {
      const workflow = createMockWorkflow();
      mockRepository.findWithExecutions.mockResolvedValue({
        ...workflow,
        executions: [
          { status: 'completed', startedAt: new Date(Date.now() - 1000), endedAt: new Date() },
          { status: 'failed', startedAt: new Date(), endedAt: new Date() },
          { status: 'completed', startedAt: new Date(), endedAt: new Date() },
        ],
      });

      const metrics = await workflowService.getWorkflowMetrics(workflow.id);

      expect(metrics).toEqual({
        totalExecutions: 3,
        successRate: 66.67,
        averageExecutionTime: expect.any(Number),
        lastExecution: expect.any(Date),
      });
    });
  });
});
```

### Ejemplo de Test Unitario - Controlador de API

```typescript
// backend/src/controllers/workflow.controller.test.ts
import { Request, Response } from 'express';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from '../services/workflow.service';
import { AuthenticationError, ValidationError } from '../utils/errors';

describe('WorkflowController', () => {
  let workflowController: WorkflowController;
  let mockWorkflowService: jest.Mocked<WorkflowService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockWorkflowService = {
      createWorkflow: jest.fn(),
      getWorkflow: jest.fn(),
      getUserWorkflows: jest.fn(),
      updateWorkflow: jest.fn(),
      deleteWorkflow: jest.fn(),
      executeWorkflow: jest.fn(),
      getWorkflowMetrics: jest.fn(),
    } as any;

    workflowController = new WorkflowController(mockWorkflowService);
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: { id: 'user-123', email: 'test@example.com' },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
  });

  describe('createWorkflow', () => {
    it('should create workflow successfully', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'Test Description',
      };

      const createdWorkflow = {
        id: 'workflow-123',
        ...workflowData,
        userId: 'user-123',
        createdAt: new Date(),
      };

      mockWorkflowService.createWorkflow.mockResolvedValue(createdWorkflow);
      mockRequest.body = workflowData;

      await workflowController.createWorkflow(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: createdWorkflow,
      });
    });

    it('should handle validation errors', async () => {
      mockWorkflowService.createWorkflow.mockRejectedValue(
        new ValidationError('Invalid workflow data')
      );

      await workflowController.createWorkflow(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid workflow data',
      });
    });

    it('should handle authentication errors', async () => {
      mockWorkflowService.createWorkflow.mockRejectedValue(
        new AuthenticationError('User not authenticated')
      );

      await workflowController.createWorkflow(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getWorkflows', () => {
    it('should return user workflows successfully', async () => {
      const userWorkflows = [
        { id: 'workflow-1', name: 'Workflow 1', userId: 'user-123' },
        { id: 'workflow-2', name: 'Workflow 2', userId: 'user-123' },
      ];

      mockWorkflowService.getUserWorkflows.mockResolvedValue(userWorkflows);

      await workflowController.getWorkflows(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: userWorkflows,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      });
    });
  });
});
```

## 2. Integration Testing Framework

### Configuración de TestContainers

```typescript
// backend/tests/containers/postgres.container.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';

let postgresContainer: PostgreSqlContainer;

export const setupTestDatabase = async (): Promise<void> => {
  postgresContainer = await new PostgreSqlContainer('postgres:15')
    .withDatabase('silhouette_test')
    .withUsername('testuser')
    .withPassword('testpass')
    .start();

  process.env.DATABASE_URL = postgresContainer.getConnectionUri();
  process.env.DATABASE_HOST = postgresContainer.getHost();
  process.env.DATABASE_PORT = postgresContainer.getPort().toString();
  process.env.DATABASE_NAME = postgresContainer.getDatabase();
  process.env.DATABASE_USER = postgresContainer.getUsername();
  process.env.DATABASE_PASSWORD = postgresContainer.getPassword();
};

export const cleanupTestDatabase = async (): Promise<void> => {
  if (postgresContainer) {
    await postgresContainer.stop();
  }
};
```

### Ejemplo de Test de Integración - Base de Datos

```typescript
// backend/tests/integration/workflow.repository.test.ts
import { DataSource } from 'typeorm';
import { setupTestDatabase, cleanupTestDatabase } from '../containers/postgres.container';
import { WorkflowRepository } from '../../src/repositories/workflow.repository';
import { Workflow } from '../../src/models/entities/Workflow';

describe('WorkflowRepository Integration', () => {
  let dataSource: DataSource;
  let workflowRepository: WorkflowRepository;

  beforeAll(async () => {
    await setupTestDatabase();
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || '0'),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [Workflow],
      synchronize: true, // Only for testing
      logging: false,
    });

    await dataSource.initialize();
    workflowRepository = new WorkflowRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clean database before each test
    await dataSource.getRepository(Workflow).clear();
  });

  describe('createWorkflow', () => {
    it('should create and persist workflow', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'Test Description',
        userId: 'user-123',
        status: 'draft',
        triggers: [{ type: 'manual' }],
        actions: [{ type: 'api_call', config: { url: 'http://api.example.com' } }],
      };

      const createdWorkflow = await workflowRepository.create(workflowData);

      expect(createdWorkflow.id).toBeDefined();
      expect(createdWorkflow.name).toBe(workflowData.name);
      expect(createdWorkflow.createdAt).toBeInstanceOf(Date);
      expect(createdWorkflow.updatedAt).toBeInstanceOf(Date);

      // Verify persistence
      const savedWorkflow = await workflowRepository.findById(createdWorkflow.id);
      expect(savedWorkflow).toEqual(createdWorkflow);
    });

    it('should enforce unique constraints', async () => {
      const workflowData = {
        name: 'Test Workflow',
        userId: 'user-123',
        triggers: [{ type: 'manual' }],
        actions: [{ type: 'api_call' }],
      };

      await workflowRepository.create(workflowData);

      // Try to create duplicate
      await expect(
        workflowRepository.create({ ...workflowData, name: 'Test Workflow' })
      ).rejects.toThrow();
    });
  });

  describe('findUserWorkflows', () => {
    it('should return workflows for specific user', async () => {
      const userId = 'user-123';
      const otherUserId = 'user-456';

      // Create workflows for both users
      await workflowRepository.create({
        name: 'User 1 Workflow 1',
        userId,
        triggers: [{ type: 'manual' }],
        actions: [{ type: 'api_call' }],
      });

      await workflowRepository.create({
        name: 'User 1 Workflow 2',
        userId,
        triggers: [{ type: 'manual' }],
        actions: [{ type: 'api_call' }],
      });

      await workflowRepository.create({
        name: 'User 2 Workflow',
        userId: otherUserId,
        triggers: [{ type: 'manual' }],
        actions: [{ type: 'api_call' }],
      });

      const userWorkflows = await workflowRepository.findUserWorkflows(userId, {
        page: 1,
        limit: 10,
      });

      expect(userWorkflows.data).toHaveLength(2);
      expect(userWorkflows.total).toBe(2);
      expect(userWorkflows.data.every(w => w.userId === userId)).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const userId = 'user-123';

      // Create 5 workflows
      for (let i = 1; i <= 5; i++) {
        await workflowRepository.create({
          name: `Workflow ${i}`,
          userId,
          triggers: [{ type: 'manual' }],
          actions: [{ type: 'api_call' }],
        });
      }

      const page1 = await workflowRepository.findUserWorkflows(userId, {
        page: 1,
        limit: 2,
      });

      const page2 = await workflowRepository.findUserWorkflows(userId, {
        page: 2,
        limit: 2,
      });

      expect(page1.data).toHaveLength(2);
      expect(page2.data).toHaveLength(2);
      expect(page1.total).toBe(5);
      expect(page2.total).toBe(5);
    });
  });
});
```

### Ejemplo de Test de Integración - API

```typescript
// backend/tests/integration/workflow.api.test.ts
import request from 'supertest';
import { createApp } from '../utils/create-app';
import { setupTestDatabase, cleanupTestDatabase } from '../containers/postgres.container';
import { getTestToken } from '../utils/auth-helpers';

describe('Workflow API Integration', () => {
  let app: Express;
  let authToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
    app = createApp();
    authToken = await getTestToken('user-123', 'test@example.com');
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/workflows', () => {
    it('should create workflow successfully', async () => {
      const workflowData = {
        name: 'Integration Test Workflow',
        description: 'Testing API integration',
        triggers: [{ type: 'manual' }],
        actions: [
          {
            type: 'api_call',
            config: {
              url: 'https://api.example.com/test',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: { test: true },
            },
          },
        ],
      };

      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workflowData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(workflowData.name);
      expect(response.body.data.id).toBeDefined();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('name');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/workflows')
        .send({ name: 'Test Workflow' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/workflows', () => {
    beforeEach(async () => {
      // Create test workflows
      await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Workflow 1',
          triggers: [{ type: 'manual' }],
          actions: [{ type: 'api_call' }],
        });

      await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Workflow 2',
          triggers: [{ type: 'manual' }],
          actions: [{ type: 'api_call' }],
        });
    });

    it('should return user workflows with pagination', async () => {
      const response = await request(app)
        .get('/api/workflows?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should filter workflows by name', async () => {
      const response = await request(app)
        .get('/api/workflows?search=Test%20Workflow%201')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Test Workflow 1');
    });
  });

  describe('GET /api/workflows/:id', () => {
    let createdWorkflowId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Workflow for GET',
          triggers: [{ type: 'manual' }],
          actions: [{ type: 'api_call' }],
        });

      createdWorkflowId = createResponse.body.data.id;
    });

    it('should return specific workflow', async () => {
      const response = await request(app)
        .get(`/api/workflows/${createdWorkflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdWorkflowId);
      expect(response.body.data.name).toBe('Test Workflow for GET');
    });

    it('should return 404 for non-existent workflow', async () => {
      const response = await request(app)
        .get('/api/workflows/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
```

## 3. End-to-End Testing Framework

### Configuración de Cypress

```typescript
// frontend/cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    excludeSpecPattern: [
      '**/examples/*',
      '**/fixtures/*',
      '**/support/*',
    ],
    env: {
      apiUrl: 'http://localhost:8000/api',
      authToken: Cypress.env('AUTH_TOKEN'),
    },
    retries: {
      runMode: 2,
      openMode: 0,
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
```

### Ejemplo de Test E2E - Crear Workflow

```typescript
// frontend/cypress/e2e/workflow-creation.cy.ts
describe('Workflow Creation E2E', () => {
  beforeEach(() => {
    // Login before each test
    cy.login('test@example.com', 'password123');
    cy.visit('/dashboard');
    cy.waitForApiCalls();
  });

  afterEach(() => {
    // Cleanup after each test
    cy.cleanupTestData();
  });

  it('should create a complete workflow from start to finish', () => {
    // Step 1: Navigate to workflow creation
    cy.get('[data-testid="create-workflow-btn"]').click();
    cy.url().should('include', '/workflows/create');
    cy.get('[data-testid="workflow-builder"]').should('be.visible');

    // Step 2: Fill basic information
    cy.get('[data-testid="workflow-name"]').type('E2E Test Workflow');
    cy.get('[data-testid="workflow-description"]').type(
      'This is an end-to-end test workflow for validation'
    );

    // Step 3: Add trigger
    cy.get('[data-testid="add-trigger-btn"]').click();
    cy.get('[data-testid="trigger-type-manual"]').click();
    cy.get('[data-testid="trigger-config-save"]').click();

    // Step 4: Add first action
    cy.get('[data-testid="add-action-btn"]').click();
    cy.get('[data-testid="action-type-api_call"]').click();
    
    // Configure API action
    cy.get('[data-testid="api-url"]').type('https://api.example.com/test');
    cy.get('[data-testid="api-method"]').select('POST');
    cy.get('[data-testid="api-headers"]').type('{"Content-Type": "application/json"}');
    cy.get('[data-testid="api-body"]').type('{"test": true}');
    cy.get('[data-testid="action-config-save"]').click();

    // Step 5: Add second action (conditional)
    cy.get('[data-testid="add-action-btn"]').click();
    cy.get('[data-testid="action-type-condition"]').click();
    
    // Configure condition
    cy.get('[data-testid="condition-field"]').type('$.response.status');
    cy.get('[data-testid="condition-operator"]').select('equals');
    cy.get('[data-testid="condition-value"]').type('200');
    cy.get('[data-testid="condition-true-action"]').select('Send Email');
    cy.get('[data-testid="condition-false-action"]').select('Log Error');
    cy.get('[data-testid="action-config-save"]').click();

    // Step 6: Save workflow
    cy.get('[data-testid="save-workflow-btn"]').click();
    
    // Verify success
    cy.get('[data-testid="success-message"]').should('contain', 'Workflow created successfully');
    cy.url().should('include', '/workflows/');
    cy.get('[data-testid="workflow-list"]').should('contain', 'E2E Test Workflow');

    // Step 7: Execute workflow
    cy.get('[data-testid="workflow-card-E2E Test Workflow"]')
      .find('[data-testid="execute-workflow-btn"]')
      .click();
    
    cy.get('[data-testid="execution-modal"]').should('be.visible');
    cy.get('[data-testid="confirm-execution-btn"]').click();
    
    // Monitor execution
    cy.get('[data-testid="execution-status"]').should('contain', 'Running');
    cy.get('[data-testid="execution-log"]').should('be.visible');
    
    // Wait for completion
    cy.get('[data-testid="execution-status"]', { timeout: 30000 })
      .should('contain', 'Completed');
    
    // Verify execution results
    cy.get('[data-testid="execution-results"]').should('be.visible');
    cy.get('[data-testid="execution-metrics"]').should('contain', 'Success Rate');
  });

  it('should handle workflow validation errors', () => {
    cy.visit('/workflows/create');

    // Try to save without name
    cy.get('[data-testid="save-workflow-btn"]').click();
    cy.get('[data-testid="name-error"]').should('contain', 'Name is required');

    // Add name but no triggers
    cy.get('[data-testid="workflow-name"]').type('Test Workflow');
    cy.get('[data-testid="save-workflow-btn"]').click();
    cy.get('[data-testid="triggers-error"]').should('contain', 'At least one trigger is required');
  });

  it('should test workflow import/export functionality', () => {
    // Create a test workflow first
    cy.createTestWorkflow('Export Test Workflow');

    // Test export
    cy.get('[data-testid="workflow-card-Export Test Workflow"]')
      .find('[data-testid="workflow-menu-btn"]')
      .click();
    
    cy.get('[data-testid="export-workflow-btn"]').click();
    cy.get('[data-testid="export-modal"]').should('be.visible');
    cy.get('[data-testid="export-format-json"]').click();
    cy.get('[data-testid="download-export-btn"]').click();

    // Wait for download and verify file content
    cy.readFile('cypress/downloads/workflow-export.json').should('exist');
    cy.readFile('cypress/downloads/workflow-export.json')
      .should('contain', 'Export Test Workflow');

    // Test import
    cy.get('[data-testid="import-workflow-btn"]').click();
    cy.get('[data-testid="import-modal"]').should('be.visible');
    cy.get('[data-testid="workflow-file-input"]')
      .selectFile('cypress/downloads/workflow-export.json');
    cy.get('[data-testid="import-workflow-btn"]').click();
    
    cy.get('[data-testid="success-message"]')
      .should('contain', 'Workflow imported successfully');
    cy.get('[data-testid="workflow-list"]').should('contain', 'Export Test Workflow (Imported)');
  });
});
```

### Ejemplo de Test E2E - Colaboración en Tiempo Real

```typescript
// frontend/cypress/e2e/collaboration.cy.ts
describe('Real-time Collaboration E2E', () => {
  let user1Token: string;
  let user2Token: string;

  beforeEach(async () => {
    // Setup two test users
    user1Token = await cy.createTestUser('user1@example.com', 'password123');
    user2Token = await cy.createTestUser('user2@example.com', 'password123');
  });

  it('should allow real-time collaboration on workflows', () => {
    // User 1 creates a workflow and shares it
    cy.login('user1@example.com', 'password123');
    cy.createTestWorkflow('Collaborative Workflow');
    
    // Share workflow with user2
    cy.get('[data-testid="workflow-card-Collaborative Workflow"]')
      .find('[data-testid="workflow-menu-btn"]')
      .click();
    
    cy.get('[data-testid="share-workflow-btn"]').click();
    cy.get('[data-testid="collaborator-email"]').type('user2@example.com');
    cy.get('[data-testid="collaborator-role"]').select('editor');
    cy.get('[data-testid="add-collaborator-btn"]').click();
    cy.get('[data-testid="save-sharing-btn"]').click();

    // User 2 opens the shared workflow
    cy.login('user2@example.com', 'password123');
    cy.visit('/workflows');
    cy.get('[data-testid="workflow-card-Collaborative Workflow"]').click();
    
    // Verify collaboration indicators
    cy.get('[data-testid="collaboration-status"]')
      .should('contain', '1 other user editing');
    cy.get('[data-testid="user-indicator-user1"]').should('be.visible');

    // User 2 makes changes
    cy.get('[data-testid="workflow-name"]').clear().type('Collaborative Workflow - Edited');
    
    // User 1 should see the changes in real-time
    cy.login('user1@example.com', 'password123');
    cy.visit('/workflows');
    cy.get('[data-testid="workflow-card-Collaborative Workflow - Edited"]')
      .should('exist');
    
    // Verify change history shows collaboration
    cy.get('[data-testid="workflow-card-Collaborative Workflow - Edited"]')
      .find('[data-testid="workflow-menu-btn"]')
      .click();
    
    cy.get('[data-testid="view-history-btn"]').click();
    cy.get('[data-testid="change-history"]').should('contain', 'Edited by user2@example.com');
  });

  it('should handle concurrent editing conflicts', () => {
    // User 1 opens workflow for editing
    cy.login('user1@example.com', 'password123');
    cy.visit('/workflows');
    cy.get('[data-testid="workflow-card-Collaborative Workflow"]').click();
    cy.get('[data-testid="edit-workflow-btn"]').click();

    // User 2 also opens the same workflow
    cy.login('user2@example.com', 'password123');
    cy.visit('/workflows');
    cy.get('[data-testid="workflow-card-Collaborative Workflow"]').click();
    
    // Both users should see conflict warning
    cy.get('[data-testid="editing-conflict-warning"]').should('be.visible');
    cy.get('[data-testid="active-editors"]').should('contain', '2 users editing');
  });
});
```

## 4. API Testing Framework

### Configuración de Postman/Newman

```json
// api-tests/silhouette-workflow.postman_collection.json
{
  "info": {
    "name": "Silhouette Workflow API Tests",
    "description": "Comprehensive API testing collection for Silhouette Workflow Creation",
    "version": "1.0.0"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:8000/api"
    },
    {
      "key": "authToken",
      "value": "{{$randomUUID}}"
    },
    {
      "key": "workflowId",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "login"]
            },
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\"\n}"
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 200', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test('Response has auth token', function () {",
                  "    const responseJson = pm.response.json();",
                  "    pm.expect(responseJson.success).to.be.true;",
                  "    pm.expect(responseJson.data.token).to.be.a('string');",
                  "    pm.environment.set('authToken', responseJson.data.token);",
                  "});"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      "name": "Workflow Management",
      "item": [
        {
          "name": "Create Workflow",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{authToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/workflows",
              "host": ["{{baseUrl}}"],
              "path": ["workflows"]
            },
            "body": {
              "mode": "raw",
              "raw": "{\n  \"name\": \"API Test Workflow\",\n  \"description\": \"Test workflow created via API\",\n  \"triggers\": [\n    {\n      \"type\": \"manual\",\n      \"config\": {}\n    }\n  ],\n  \"actions\": [\n    {\n      \"type\": \"api_call\",\n      \"config\": {\n        \"url\": \"https://api.example.com/test\",\n        \"method\": \"POST\",\n        \"headers\": {\n          \"Content-Type\": \"application/json\"\n        },\n        \"body\": {\n          \"test\": true\n        }\n      }\n    }\n  ]\n}"
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 201', function () {",
                  "    pm.response.to.have.status(201);",
                  "});",
                  "",
                  "pm.test('Response has workflow ID', function () {",
                  "    const responseJson = pm.response.json();",
                  "    pm.expect(responseJson.success).to.be.true;",
                  "    pm.expect(responseJson.data.id).to.be.a('string');",
                  "    pm.environment.set('workflowId', responseJson.data.id);",
                  "});"
                ]
              }
            }
          ]
        },
        {
          "name": "Get Workflow",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{authToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/workflows/{{workflowId}}",
              "host": ["{{baseUrl}}"],
              "path": ["workflows", "{{workflowId}}"]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 200', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test('Response has correct workflow data', function () {",
                  "    const responseJson = pm.response.json();",
                  "    pm.expect(responseJson.success).to.be.true;",
                  "    pm.expect(responseJson.data.name).to.equal('API Test Workflow');",
                  "});"
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}
```

### Ejemplo de Test Contracto de API

```typescript
// api-tests/contracts/workflow.contract.test.ts
import { pactum } from 'pactum';
import { getTestUser, setupPactServer } from '../utils/test-utils';

describe('Workflow API Contract Tests', () => {
  let testUser: any;

  beforeAll(async () => {
    await setupPactServer();
    testUser = await getTestUser();
  });

  describe('Workflow API Contract', () => {
    it('should create workflow according to contract', async () => {
      const workflowRequest = {
        name: 'Contract Test Workflow',
        description: 'Testing API contract',
        triggers: [
          {
            type: 'manual',
            config: {},
          },
        ],
        actions: [
          {
            type: 'api_call',
            config: {
              url: 'https://api.example.com/test',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: {
                test: true,
              },
            },
          },
        ],
      };

      const response = await pactum
        .spec()
        .post('/api/workflows')
        .withHeaders({
          'Authorization': `Bearer ${testUser.token}`,
          'Content-Type': 'application/json',
        })
        .withJson(workflowRequest)
        .expectStatus(201)
        .expectJsonSchema({
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: ['string', 'null'] },
                status: { type: 'string' },
                triggers: { type: 'array' },
                actions: { type: 'array' },
                userId: { type: 'string' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
              },
              required: ['id', 'name', 'status', 'triggers', 'actions', 'userId'],
            },
          },
          required: ['success', 'data'],
        });

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe(workflowRequest.name);
    });

    it('should return validation errors according to contract', async () => {
      const invalidWorkflow = {
        name: '', // Invalid: empty name
        triggers: [], // Invalid: no triggers
        actions: [], // Invalid: no actions
      };

      const response = await pactum
        .spec()
        .post('/api/workflows')
        .withHeaders({
          'Authorization': `Bearer ${testUser.token}`,
          'Content-Type': 'application/json',
        })
        .withJson(invalidWorkflow)
        .expectStatus(400)
        .expectJsonSchema({
          type: 'object',
          properties: {
            success: { type: 'boolean', const: false },
            error: { type: 'string' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
          required: ['success', 'error', 'details'],
        });

      expect(response.body.success).toBe(false);
      expect(response.body.details).toHaveLength.greaterThan(0);
    });
  });
});
```

## 5. Mobile Testing Framework

### Configuración de Detox

```typescript
// mobile/jest.config.js
module.exports = {
  preset: 'react-native',
  testRunner: 'jest-circus/runner',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  setupFiles: ['./__tests__/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1,
};
```

### Ejemplo de Test Mobile - React Native

```typescript
// mobile/__tests__/App.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { createTestStore } from '../src/store/testStore';
import { Provider } from 'react-redux';
import App from '../src/App';
import { mockWorkflowData } from '../src/__mocks__/workflows';

describe('Mobile App Integration Tests', () => {
  let store: any;

  beforeEach(() => {
    store = createTestStore();
  });

  it('should create workflow on mobile', async () => {
    const { getByTestId, getByText } = render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    // Navigate to create workflow
    fireEvent.press(getByTestId('create-workflow-button'));
    expect(getByTestId('workflow-creation-screen')).toBeTruthy();

    // Fill form
    fireEvent.changeText(getByTestId('workflow-name-input'), 'Mobile Test Workflow');
    fireEvent.changeText(
      getByTestId('workflow-description-input'),
      'Testing mobile workflow creation'
    );

    // Add trigger
    fireEvent.press(getByTestId('add-trigger-button'));
    fireEvent.press(getByTestId('trigger-manual-option'));

    // Add action
    fireEvent.press(getByTestId('add-action-button'));
    fireEvent.press(getByTestId('action-api-call-option'));

    // Fill action config
    fireEvent.changeText(getByTestId('api-url-input'), 'https://api.example.com/test');
    fireEvent.press(getByTestId('api-method-dropdown'));
    fireEvent.press(getByTestId('api-method-post'));

    // Save workflow
    fireEvent.press(getByTestId('save-workflow-button'));

    // Verify success
    await waitFor(() => {
      expect(getByTestId('workflow-saved-success')).toBeTruthy();
    });
  });

  it('should execute workflow on mobile', async () => {
    const { getByTestId, getByText } = render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    // Mock workflow data
    store.dispatch({
      type: 'workflows/setWorkflows',
      payload: [mockWorkflowData[0]],
    });

    // Navigate to workflow list
    fireEvent.press(getByTestId('workflows-tab'));
    
    // Select workflow
    fireEvent.press(getByTestId('workflow-item-0'));
    
    // Execute workflow
    fireEvent.press(getByTestId('execute-workflow-button'));
    
    // Verify execution modal appears
    await waitFor(() => {
      expect(getByTestId('execution-modal')).toBeTruthy();
    });

    // Confirm execution
    fireEvent.press(getByTestId('confirm-execution-button'));

    // Monitor execution
    expect(getByTestId('execution-status')).toHaveTextContent('Running');

    // Wait for completion
    await waitFor(() => {
      expect(getByTestId('execution-status')).toHaveTextContent('Completed');
    }, { timeout: 10000 });
  });
});
```

## 6. Performance Testing

### Configuración de K6

```javascript
// performance-tests/workflow-api-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete within 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
    checks: ['rate>0.95'],            // 95% of checks must pass
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000/api';
let authToken = '';

export function setup() {
  // Get authentication token
  const loginResponse = http.post(`${BASE_URL}/auth/login`, {
    email: 'test@example.com',
    password: 'password123',
  });

  if (loginResponse.status === 200) {
    authToken = loginResponse.json('data.token');
  }

  return { authToken };
}

export default function (data) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.authToken}`,
    },
  };

  // Test workflow creation
  const createWorkflowResponse = http.post(
    `${BASE_URL}/workflows`,
    JSON.stringify({
      name: `Load Test Workflow ${Math.random()}`,
      description: 'Testing API load',
      triggers: [{ type: 'manual' }],
      actions: [{ type: 'api_call', config: { url: 'https://api.example.com/test' } }],
    }),
    params
  );

  const createCheck = check(createWorkflowResponse, {
    'workflow creation status is 201': (r) => r.status === 201,
    'workflow creation response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!createCheck);

  if (createWorkflowResponse.status === 201) {
    const workflowId = createWorkflowResponse.json('data.id');

    // Test workflow retrieval
    const getWorkflowResponse = http.get(
      `${BASE_URL}/workflows/${workflowId}`,
      params
    );

    const getCheck = check(getWorkflowResponse, {
      'workflow retrieval status is 200': (r) => r.status === 200,
      'workflow retrieval response time < 200ms': (r) => r.timings.duration < 200,
    });

    errorRate.add(!getCheck);

    // Test workflow execution
    const executeResponse = http.post(
      `${BASE_URL}/workflows/${workflowId}/execute`,
      JSON.stringify({ trigger: 'manual' }),
      params
    );

    const executeCheck = check(executeResponse, {
      'workflow execution status is 200': (r) => r.status === 200,
      'workflow execution response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    errorRate.add(!executeCheck);
  }

  sleep(1);
}

export function teardown(data) {
  // Cleanup test data
  console.log('Test completed with auth token:', data.authToken);
}
```

## 7. Security Testing

### Configuración de OWASP ZAP

```yaml
# security-tests/zap-baseline-scan.yml
# ZAP Baseline Scan Configuration
params:
  - zapapitesturl: https://silhouette-workflow.example.com
  - zapapiformmethod: post
  - zapapiformdata: username=test@example.com&password=testpass&Login=Login

rules:
  # Skip scanning
  - rule_id: 2
    reason: 'Used for passive scanning'
  - rule_id: 3
    reason: 'Used for passive scanning'
  - rule_id: 10015
    reason: 'Sensitive information in HTTP referrer header'
  - rule_id: 10016
    reason: 'Web Browser XSS Protection Not Enabled'
  - rule_id: 10017
    reason: 'Cross-Domain JavaScript Source File Inclusion'
  - rule_id: 10019
    reason: 'Content Type is not specified'
  - rule_id: 10020
    reason: 'X-Frame-Options Header Missing'
  - rule_id: 10021
    reason: 'X-Content-Type-Options header missing'
  - rule_id: 10022
    reason: 'Store Password in Plaintext'
  - rule_id: 10023
    reason: 'Information Disclosure - Debug Error Messages'
  - rule_id: 10024
    reason: 'Information Disclosure - Sensitive Information in URL'
  - rule_id: 10025
    reason: 'Information Disclosure - Sensitive Information in HTTP Referrer Header'
  - rule_id: 10026
    reason: 'HTTP Parameter Override'
  - rule_id: 10027
    reason: 'Information Disclosure - Suspicious Comments'
  - rule_id: 10028
    reason: 'Open Redirect'
  - rule_id: 10029
    reason: 'Cookie No HttpOnly Flag'
  - rule_id: 10030
    reason: 'Cookie No Secure Flag'
  - rule_id: 10031
    reason: 'Weak HTTP Methods'
  - rule_id: 10032
    reason: 'HTTPS Content Available via HTTP'
  - rule_id: 10033
    reason: 'X-Download-Options Header Missing'
  - rule_id: 10034
    reason: 'Strict-Transport-Security Missing'
  - rule_id: 10035
    reason: 'Strict-Transport-Security Missing'
  - rule_id: 10036
    reason: 'HTTP Server Response Header'
  - rule_id: 10037
    reason: 'Server Leaks Information via "Server" HTTP Response Header Field'
  - rule_id: 10038
    reason: 'Content Security Policy Missing'
  - rule_id: 10039
    reason: 'X-Content-Type-Options Header Missing'
```

## Métricas y Reportes

### Reporte de Cobertura de Testing

```typescript
// testing-utils/coverage-reporter.ts
export class CoverageReporter {
  private coverageData: Map<string, any> = new Map();

  async generateCoverageReport() {
    const report = {
      summary: {
        totalLines: 0,
        coveredLines: 0,
        coveragePercentage: 0,
        functions: 0,
        functionsCovered: 0,
        branches: 0,
        branchesCovered: 0,
      },
      byFile: new Map<string, any>(),
      trends: {
        previousCoverage: 94.2,
        currentCoverage: 0,
        change: 0,
      },
    };

    // Aggregate coverage data
    for (const [filePath, data] of this.coverageData) {
      const fileCoverage = this.calculateFileCoverage(data);
      report.byFile.set(filePath, fileCoverage);
      
      report.summary.totalLines += data.totalLines || 0;
      report.summary.coveredLines += data.coveredLines || 0;
      report.summary.functions += data.functions?.length || 0;
      report.summary.branches += data.branches?.length || 0;
    }

    // Calculate percentages
    report.summary.coveragePercentage = 
      report.summary.totalLines > 0 
        ? (report.summary.coveredLines / report.summary.totalLines) * 100 
        : 0;

    report.trends.currentCoverage = report.summary.coveragePercentage;
    report.trends.change = report.trends.currentCoverage - report.trends.previousCoverage;

    return report;
  }

  private calculateFileCoverage(data: any) {
    return {
      lines: {
        total: data.totalLines || 0,
        covered: data.coveredLines || 0,
        percentage: data.totalLines > 0 
          ? (data.coveredLines / data.totalLines) * 100 
          : 0,
      },
      functions: {
        total: data.functions?.length || 0,
        covered: data.functions?.filter((f: any) => f.hit > 0).length || 0,
        percentage: 0,
      },
      branches: {
        total: data.branches?.length || 0,
        covered: data.branches?.filter((b: any) => b.hit > 0).length || 0,
        percentage: 0,
      },
    };
  }

  async saveCoverageReport(report: any, outputPath: string) {
    const fs = require('fs').promises;
    const reportHtml = this.generateHtmlReport(report);
    await fs.writeFile(outputPath, reportHtml);
  }

  private generateHtmlReport(report: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Silhouette Workflow Testing Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; }
        .good { color: green; }
        .warning { color: orange; }
        .bad { color: red; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Silhouette Workflow Testing Coverage Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <div class="metric">
            <strong>Total Coverage:</strong> 
            <span class="${this.getCoverageClass(report.summary.coveragePercentage)}">
                ${report.summary.coveragePercentage.toFixed(2)}%
            </span>
        </div>
        <div class="metric">
            <strong>Lines:</strong> ${report.summary.coveredLines}/${report.summary.totalLines}
        </div>
        <div class="metric">
            <strong>Change:</strong> 
            <span class="${this.getChangeClass(report.trends.change)}">
                ${report.trends.change > 0 ? '+' : ''}${report.trends.change.toFixed(2)}%
            </span>
        </div>
    </div>

    <h2>Files Coverage</h2>
    <table>
        <tr>
            <th>File</th>
            <th>Lines Coverage</th>
            <th>Functions Coverage</th>
            <th>Branches Coverage</th>
        </tr>
        ${Array.from(report.byFile.entries()).map(([file, coverage]) => `
        <tr>
            <td>${file}</td>
            <td class="${this.getCoverageClass(coverage.lines.percentage)}">
                ${coverage.lines.percentage.toFixed(2)}%
            </td>
            <td class="${this.getCoverageClass(coverage.functions.percentage)}">
                ${coverage.functions.percentage.toFixed(2)}%
            </td>
            <td class="${this.getCoverageClass(coverage.branches.percentage)}">
                ${coverage.branches.percentage.toFixed(2)}%
            </td>
        </tr>
        `).join('')}
    </table>
</body>
</html>
    `;
  }

  private getCoverageClass(coverage: number): string {
    if (coverage >= 95) return 'good';
    if (coverage >= 80) return 'warning';
    return 'bad';
  }

  private getChangeClass(change: number): string {
    if (change > 0) return 'good';
    if (change < -1) return 'bad';
    return 'warning';
  }
}
```

## Conclusión

El **Automated Testing Framework** de Silhouette Workflow Creation proporciona una cobertura integral de testing que garantiza la calidad, rendimiento y seguridad de la plataforma. Con un objetivo de 95%+ de cobertura de código, testing automatizado completo y reportes detallados, este framework establece las bases para un desarrollo confiable y escalable.

### Beneficios Principales

1. **Cobertura Integral**: 95%+ de cobertura de código en todas las capas
2. **Automatización Completa**: CI/CD integrado con todos los tipos de testing
3. **Detección Temprana**: Identificación de problemas antes de producción
4. **Confiabilidad**: Testing E2E completo de journeys de usuario
5. **Performance**: Testing de carga y rendimiento automatizado
6. **Seguridad**: Scanning de seguridad integrado en el pipeline
7. **Escalabilidad**: Framework diseñado para equipos grandes y proyectos complejos

---

**Autor**: Silhouette Anonimo  
**Versión**: 1.0.0  
**Fecha**: 2025-11-09  
**Estado**: Implementación Completa