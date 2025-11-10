# Performance Testing - Completo

## Descripción General

El **Performance Testing Framework** de Silhouette Workflow Creation es un sistema integral de testing de rendimiento que garantiza que la plataforma mantenga un rendimiento óptimo bajo diversas condiciones de carga. Este framework implementa load testing, stress testing, endurance testing y spike testing con métricas automáticas de regresión y alertas proactivas.

## Arquitectura del Performance Testing

### Componentes del Sistema de Performance Testing

```
┌─────────────────────────────────────────────────────────────┐
│               PERFORMANCE TESTING FRAMEWORK                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ LOAD TESTING    │  │ STRESS TESTING  │  │ ENDURANCE    │ │
│  │                 │  │                 │  │ TESTING      │ │
│  │ • 100-1000 users│  │ • Breaking point│  │ • 1-24 hours │ │
│  │ • Normal ops    │  │ • Scalability   │  │ • Memory     │ │
│  │ • Response time │  │ • Failures      │  │ • Stability  │ │
│  │ • Throughput    │  │ • Recovery      │  │ • Leaks      │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ SPIKE TESTING   │  │ VOLUME TESTING  │  │ SCALABILITY  │ │
│  │                 │  │                 │  │ TESTING      │ │
│  │ • Sudden surge  │  │ • Large datasets│  │ • Horizontal │ │
│  │ • Traffic burst │  │ • Data size     │  │ • Vertical   │ │
│  │ • Auto-scaling  │  │ • File sizes    │  │ • Auto-scale │ │
│  │ • Graceful deg. │  │ • Database size │  │ • Load bal.  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ REAL-WORLD      │  │ MONITORING &    │  │ REGRESSION   │ │
│  │ SIMULATION      │  │ ALERTING        │  │ DETECTION    │ │
│  │                 │  │                 │  │              │ │
│  │ • User behavior │  │ • Real-time     │  │ • Performance│ │
│  │ • Think time    │  │ • Metrics       │  │ • Baseline   │ │
│  │ • Journeys      │  │ • Dashboards    │  │ • Alerts     │ │
│  │ • Real patterns │  │ • Notifications │  │ • Reporting  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 1. Configuración de K6 Performance Testing

### K6 Configuration Principal

```javascript
// performance-tests/config/main.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');
export const responseTime = new Trend('response_time');
export const throughput = new Trend('throughput');
export const concurrentUsers = new Counter('concurrent_users');

// Performance thresholds
export const thresholds = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
  http_req_failed: ['rate<0.01'], // Error rate under 1%
  checks: ['rate>0.95'], // 95% of checks must pass
  errors: ['rate<0.01'], // Custom error rate under 1%
};

// Environment configuration
export const config = {
  baseUrl: __ENV.BASE_URL || 'http://localhost:8000/api',
  authToken: __ENV.AUTH_TOKEN,
  testDuration: __ENV.TEST_DURATION || '5m',
  userCount: parseInt(__ENV.USER_COUNT || '100'),
  rampUpTime: __ENV.RAMP_UP_TIME || '2m',
  steadyStateTime: __ENV.STEADY_STATE_TIME || '3m',
  rampDownTime: __ENV.RAMP_DOWN_TIME || '1m',
  maxUsers: parseInt(__ENV.MAX_USERS || '1000'),
  
  // API endpoints
  endpoints: {
    workflows: {
      create: '/workflows',
      list: '/workflows',
      execute: '/workflows/{id}/execute',
      metrics: '/workflows/{id}/metrics',
    },
    auth: {
      login: '/auth/login',
      profile: '/auth/profile',
      logout: '/auth/logout',
    },
    analytics: {
      dashboard: '/analytics/dashboard',
      realtime: '/analytics/realtime',
      reports: '/analytics/reports',
    },
  },
  
  // Test data
  testData: {
    workflowTemplates: [
      {
        name: 'API Integration Workflow',
        description: 'Test workflow for API integration',
        triggers: [{ type: 'manual' }],
        actions: [{ type: 'api_call', config: { url: 'https://httpbin.org/get' } }],
      },
      {
        name: 'Data Processing Workflow',
        description: 'Test workflow for data processing',
        triggers: [{ type: 'schedule', config: { cron: '0 0 * * *' } }],
        actions: [{ type: 'data_transform', config: { operation: 'map' } }],
      },
    ],
  },
};

// Setup function
export function setup() {
  console.log('Performance test setup started');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Test duration: ${config.testDuration}`);
  console.log(`User count: ${config.userCount}`);
  
  // Authenticate if token not provided
  let authToken = config.authToken;
  if (!authToken) {
    const loginResponse = http.post(
      `${config.baseUrl}${config.endpoints.auth.login}`,
      JSON.stringify({
        email: 'test@silhouette-workflow.com',
        password: 'testpassword123',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
    if (loginResponse.status === 200) {
      authToken = loginResponse.json('data.token');
      console.log('Authentication successful');
    } else {
      console.error('Authentication failed:', loginResponse.status, loginResponse.json());
      throw new Error('Failed to authenticate for performance test');
    }
  }
  
  return { authToken, config };
}

// Helper function for authenticated requests
export function makeAuthenticatedRequest(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${__ITERATION_DATA.authToken}`,
    ...options.headers,
  };
  
  return http.request(
    options.method || 'GET',
    url,
    options.body ? JSON.stringify(options.body) : undefined,
    { headers, ...options }
  );
}
```

### Load Testing Scenario

```javascript
// performance-tests/scenarios/load-test.js
import { check, sleep } from 'k6';
import { makeAuthenticatedRequest, config, errorRate, responseTime } from '../config/main.js';

export let loadTestOptions = {
  stages: [
    { duration: config.rampUpTime, target: config.userCount },
    { duration: config.steadyStateTime, target: config.userCount },
    { duration: config.rampDownTime, target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
};

export default function (data) {
  const { authToken, config } = data;
  
  // Test 1: Workflow API Performance
  testWorkflowOperations(authToken, config);
  
  // Test 2: User Management Performance
  testUserManagementOperations(authToken, config);
  
  // Test 3: Analytics Performance
  testAnalyticsOperations(authToken, config);
  
  // Simulate user think time
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

function testWorkflowOperations(authToken, config) {
  const startTime = Date.now();
  
  // Create a new workflow
  const workflowTemplate = config.testData.workflowTemplates[0];
  const workflowData = {
    ...workflowTemplate,
    name: `Load Test Workflow ${Math.random()}`,
    description: `Load testing workflow created at ${new Date().toISOString()}`,
  };
  
  const createResponse = makeAuthenticatedRequest(
    `${config.baseUrl}${config.endpoints.workflows.create}`,
    {
      method: 'POST',
      body: workflowData,
    }
  );
  
  const createCheck = check(createResponse, {
    'workflow creation status is 201': (r) => r.status === 201,
    'workflow creation response time < 500ms': (r) => r.timings.duration < 500,
    'workflow creation response contains ID': (r) => {
      const body = r.json('data');
      return body && body.id && body.name;
    },
  });
  
  errorRate.add(!createCheck);
  responseTime.add(createResponse.timings.duration);
  
  if (createResponse.status === 201) {
    const workflowId = createResponse.json('data.id');
    
    // Test workflow listing
    const listResponse = makeAuthenticatedRequest(
      `${config.baseUrl}${config.endpoints.workflows.list}?page=1&limit=20`
    );
    
    const listCheck = check(listResponse, {
      'workflow list status is 200': (r) => r.status === 200,
      'workflow list response time < 200ms': (r) => r.timings.duration < 200,
      'workflow list contains pagination': (r) => {
        const body = r.json('pagination');
        return body && body.page && body.total;
      },
    });
    
    errorRate.add(!listCheck);
    responseTime.add(listResponse.timings.duration);
    
    // Test workflow execution
    const executeResponse = makeAuthenticatedRequest(
      `${config.baseUrl}${config.endpoints.workflows.execute.replace('{id}', workflowId)}`,
      {
        method: 'POST',
        body: { trigger: 'manual' },
      }
    );
    
    const executeCheck = check(executeResponse, {
      'workflow execution status is 200': (r) => r.status === 200,
      'workflow execution response time < 1000ms': (r) => r.timings.duration < 1000,
      'workflow execution started successfully': (r) => {
        const body = r.json('data');
        return body && body.status === 'running';
      },
    });
    
    errorRate.add(!executeCheck);
    responseTime.add(executeResponse.timings.duration);
    
    // Test workflow metrics
    const metricsResponse = makeAuthenticatedRequest(
      `${config.baseUrl}${config.endpoints.workflows.metrics.replace('{id}', workflowId)}`
    );
    
    const metricsCheck = check(metricsResponse, {
      'workflow metrics status is 200': (r) => r.status === 200,
      'workflow metrics response time < 300ms': (r) => r.timings.duration < 300,
      'workflow metrics contains summary': (r) => {
        const body = r.json('data');
        return body && body.summary;
      },
    });
    
    errorRate.add(!metricsCheck);
    responseTime.add(metricsResponse.timings.duration);
  }
}

function testUserManagementOperations(authToken, config) {
  // Test user profile retrieval
  const profileResponse = makeAuthenticatedRequest(
    `${config.baseUrl}${config.endpoints.auth.profile}`
  );
  
  const profileCheck = check(profileResponse, {
    'user profile status is 200': (r) => r.status === 200,
    'user profile response time < 150ms': (r) => r.timings.duration < 150,
    'user profile contains user data': (r) => {
      const body = r.json('data');
      return body && body.id && body.email;
    },
  });
  
  errorRate.add(!profileCheck);
  responseTime.add(profileResponse.timings.duration);
  
  // Test user's workflow list
  const userWorkflowsResponse = makeAuthenticatedRequest(
    `${config.baseUrl}${config.endpoints.workflows.list}?user=me`
  );
  
  const userWorkflowsCheck = check(userWorkflowsResponse, {
    'user workflows list status is 200': (r) => r.status === 200,
    'user workflows list response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!userWorkflowsCheck);
  responseTime.add(userWorkflowsResponse.timings.duration);
}

function testAnalyticsOperations(authToken, config) {
  // Test analytics dashboard
  const dashboardResponse = makeAuthenticatedRequest(
    `${config.baseUrl}${config.endpoints.analytics.dashboard}`
  );
  
  const dashboardCheck = check(dashboardResponse, {
    'analytics dashboard status is 200': (r) => r.status === 200,
    'analytics dashboard response time < 500ms': (r) => r.timings.duration < 500,
    'analytics dashboard contains metrics': (r) => {
      const body = r.json('data');
      return body && body.summary;
    },
  });
  
  errorRate.add(!dashboardCheck);
  responseTime.add(dashboardResponse.timings.duration);
  
  // Test real-time analytics
  const realtimeResponse = makeAuthenticatedRequest(
    `${config.baseUrl}${config.endpoints.analytics.realtime}`
  );
  
  const realtimeCheck = check(realtimeResponse, {
    'real-time analytics status is 200': (r) => r.status === 200,
    'real-time analytics response time < 300ms': (r) => r.timings.duration < 300,
  });
  
  errorRate.add(!realtimeCheck);
  responseTime.add(realtimeResponse.timings.duration);
}
```

### Stress Testing Scenario

```javascript
// performance-tests/scenarios/stress-test.js
import { check, sleep } from 'k6';
import { makeAuthenticatedRequest, config, errorRate, responseTime } from '../config/main.js';

export let stressTestOptions = {
  stages: [
    { duration: '2m', target: 500 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 1000 },
    { duration: '5m', target: 1000 },
    { duration: '2m', target: 1500 },
    { duration: '5m', target: 1500 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // More relaxed for stress test
    http_req_failed: ['rate<0.05'], // Allow up to 5% errors during stress
    errors: ['rate<0.05'],
  },
};

export default function (data) {
  const { authToken, config } = data;
  
  // Test 1: High-frequency operations
  testHighFrequencyOperations(authToken, config);
  
  // Test 2: Concurrent workflow executions
  testConcurrentExecutions(authToken, config);
  
  // Test 3: Resource-intensive operations
  testResourceIntensiveOperations(authToken, config);
  
  // Shorter think time for stress testing
  sleep(Math.random() * 1 + 0.5); // 0.5-1.5 seconds
}

function testHighFrequencyOperations(authToken, config) {
  // Rapid workflow creation
  for (let i = 0; i < 3; i++) {
    const workflowData = {
      name: `Stress Test Workflow ${__VU}-${i}-${Date.now()}`,
      description: 'Stress testing workflow',
      triggers: [{ type: 'manual' }],
      actions: [{ type: 'api_call', config: { url: 'https://httpbin.org/get' } }],
    };
    
    const response = makeAuthenticatedRequest(
      `${config.baseUrl}${config.endpoints.workflows.create}`,
      {
        method: 'POST',
        body: workflowData,
      }
    );
    
    const checkResult = check(response, {
      'stress workflow creation': (r) => r.status === 201 || r.status === 429, // Allow 429 (rate limit)
    });
    
    errorRate.add(!checkResult);
    responseTime.add(response.timings.duration);
  }
}

function testConcurrentExecutions(authToken, config) {
  // Create a workflow for concurrent execution
  const workflowData = {
    name: `Stress Test Concurrent Workflow ${__VU}-${Date.now()}`,
    description: 'Testing concurrent executions',
    triggers: [{ type: 'api' }],
    actions: [{ 
      type: 'api_call', 
      config: { 
        url: 'https://httpbin.org/delay/0.5', // 500ms delay
        method: 'GET' 
      } 
    }],
  };
  
  const createResponse = makeAuthenticatedRequest(
    `${config.baseUrl}${config.endpoints.workflows.create}`,
    {
      method: 'POST',
      body: workflowData,
    }
  );
  
  if (createResponse.status === 201) {
    const workflowId = createResponse.json('data.id');
    
    // Execute workflow multiple times concurrently
    for (let i = 0; i < 2; i++) {
      const executeResponse = makeAuthenticatedRequest(
        `${config.baseUrl}${config.endpoints.workflows.execute.replace('{id}', workflowId)}`,
        {
          method: 'POST',
          body: { trigger: 'api', data: { execution: i } },
        }
      );
      
      const checkResult = check(executeResponse, {
        'concurrent execution': (r) => r.status === 200 || r.status === 429,
      });
      
      errorRate.add(!checkResult);
      responseTime.add(executeResponse.timings.duration);
    }
  }
}

function testResourceIntensiveOperations(authToken, config) {
  // Test large data operations
  const largeData = {
    name: `Resource Intensive Workflow ${__VU}-${Date.now()}`,
    description: 'Testing resource intensive operations',
    triggers: [{ type: 'webhook' }],
    actions: [
      {
        type: 'data_transform',
        config: {
          operation: 'process',
          data: Array(100).fill().map((_, i) => ({ id: i, data: 'x'.repeat(1000) })), // Large data
        },
      },
      {
        type: 'api_call',
        config: {
          url: 'https://httpbin.org/post',
          method: 'POST',
          body: { largePayload: Array(50).fill().map((_, i) => ({ key: `key${i}`, value: 'x'.repeat(500) })) },
        },
      },
    ],
  };
  
  const response = makeAuthenticatedRequest(
    `${config.baseUrl}${config.endpoints.workflows.create}`,
    {
      method: 'POST',
      body: largeData,
    }
  );
  
  const checkResult = check(response, {
    'resource intensive creation': (r) => r.status === 201 || r.status === 429,
  });
  
  errorRate.add(!checkResult);
  responseTime.add(response.timings.duration);
}
```

### Endurance Testing Scenario

```javascript
// performance-tests/scenarios/endurance-test.js
import { check, sleep } from 'k6';
import { makeAuthenticatedRequest, config, errorRate, responseTime } from '../config/main.js';

export let enduranceTestOptions = {
  stages: [
    { duration: '5m', target: 200 },
    { duration: '1h', target: 200 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<400', 'p(99)<800'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
  rps: 50, // Requests per second
};

let workflowIds = [];

export default function (data) {
  const { authToken, config } = data;
  
  // Test 1: Sustained workflow operations
  testSustainedWorkflowOperations(authToken, config);
  
  // Test 2: Memory and resource management
  testResourceManagement(authToken, config);
  
  // Test 3: Database connection management
  testDatabaseConnectionManagement(authToken, config);
  
  // Longer think time for endurance testing
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

function testSustainedWorkflowOperations(authToken, config) {
  // Create workflow if we don't have enough
  if (workflowIds.length < 5) {
    const workflowData = {
      name: `Endurance Test Workflow ${workflowIds.length}-${Date.now()}`,
      description: 'Sustained testing workflow',
      triggers: [{ type: 'manual' }],
      actions: [{ type: 'api_call', config: { url: 'https://httpbin.org/get' } }],
    };
    
    const createResponse = makeAuthenticatedRequest(
      `${config.baseUrl}${config.endpoints.workflows.create}`,
      {
        method: 'POST',
        body: workflowData,
      }
    );
    
    if (createResponse.status === 201) {
      const workflowId = createResponse.json('data.id');
      workflowIds.push(workflowId);
    }
  }
  
  // Execute existing workflows
  if (workflowIds.length > 0) {
    const workflowId = workflowIds[Math.floor(Math.random() * workflowIds.length)];
    
    const executeResponse = makeAuthenticatedRequest(
      `${config.baseUrl}${config.endpoints.workflows.execute.replace('{id}', workflowId)}`,
      {
        method: 'POST',
        body: { trigger: 'manual' },
      }
    );
    
    const checkResult = check(executeResponse, {
      'endurance execution': (r) => r.status === 200,
    });
    
    errorRate.add(!checkResult);
    responseTime.add(executeResponse.timings.duration);
  }
  
  // Test listing operations (more common in sustained load)
  const listResponse = makeAuthenticatedRequest(
    `${config.baseUrl}${config.endpoints.workflows.list}?page=1&limit=10`
  );
  
  const listCheck = check(listResponse, {
    'endurance list': (r) => r.status === 200,
    'endurance list time < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!listCheck);
  responseTime.add(listResponse.timings.duration);
}

function testResourceManagement(authToken, config) {
  // Test profile endpoint (lightweight operation)
  const profileResponse = makeAuthenticatedRequest(
    `${config.baseUrl}${config.endpoints.auth.profile}`
  );
  
  const profileCheck = check(profileResponse, {
    'endurance profile': (r) => r.status === 200,
    'endurance profile time < 100ms': (r) => r.timings.duration < 100,
  });
  
  errorRate.add(!profileCheck);
  responseTime.add(profileResponse.timings.duration);
  
  // Test analytics (medium weight operation)
  const analyticsResponse = makeAuthenticatedRequest(
    `${config.baseUrl}${config.endpoints.analytics.dashboard}`
  );
  
  const analyticsCheck = check(analyticsResponse, {
    'endurance analytics': (r) => r.status === 200,
    'endurance analytics time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!analyticsCheck);
  responseTime.add(analyticsResponse.timings.duration);
}

function testDatabaseConnectionManagement(authToken, config) {
  // Test database-heavy operations
  const healthResponse = makeAuthenticatedRequest(
    `${config.baseUrl}/health/database`
  );
  
  const healthCheck = check(healthResponse, {
    'endurance database health': (r) => r.status === 200,
    'endurance database time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!healthCheck);
  responseTime.add(healthResponse.timings.duration);
}
```

### Spike Testing Scenario

```javascript
// performance-tests/scenarios/spike-test.js
import { check, sleep } from 'k6';
import { makeAuthenticatedRequest, config, errorRate, responseTime } from '../config/main.js';

export let spikeTestOptions = {
  stages: [
    { duration: '1m', target: 100 },    // Normal load
    { duration: '10s', target: 1000 },  // Spike to 10x
    { duration: '2m', target: 1000 },   // Sustained spike
    { duration: '10s', target: 100 },   // Drop back to normal
    { duration: '2m', target: 100 },    // Back to normal
    { duration: '10s', target: 0 },     // Spike to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // More relaxed during spike
    http_req_failed: ['rate<0.10'], // Allow up to 10% errors during spike
    errors: ['rate<0.10'],
  },
};

let baselineWorkflows = [];

export default function (data) {
  const { authToken, config } = data;
  
  // Test 1: Rapid creation during spike
  testSpikeCreation(authToken, config);
  
  // Test 2: Bulk operations
  testBulkOperations(authToken, config);
  
  // Test 3: Auto-scaling behavior
  testAutoScalingBehavior(authToken, config);
  
  // Very short think time during spike
  sleep(Math.random() * 0.5 + 0.1); // 0.1-0.6 seconds
}

function testSpikeCreation(authToken, config) {
  // Create multiple workflows quickly during spike
  for (let i = 0; i < 5; i++) {
    const workflowData = {
      name: `Spike Test Workflow ${__VU}-${i}-${Date.now()}`,
      description: 'Rapid creation during spike test',
      triggers: [{ type: 'webhook' }],
      actions: [{ type: 'api_call', config: { url: 'https://httpbin.org/delay/0.1' } }],
    };
    
    const response = makeAuthenticatedRequest(
      `${config.baseUrl}${config.endpoints.workflows.create}`,
      {
        method: 'POST',
        body: workflowData,
      }
    );
    
    // During spike, we expect some rate limiting (429) or successes
    const checkResult = check(response, {
      'spike creation': (r) => r.status === 201 || r.status === 429,
    });
    
    errorRate.add(!checkResult);
    responseTime.add(response.timings.duration);
  }
}

function testBulkOperations(authToken, config) {
  // Bulk listing during spike
  const listResponse = makeAuthenticatedRequest(
    `${config.baseUrl}${config.endpoints.workflows.list}?page=1&limit=50`
  );
  
  const checkResult = check(listResponse, {
    'spike bulk list': (r) => r.status === 200 || r.status === 429,
  });
  
  errorRate.add(!checkResult);
  responseTime.add(listResponse.timings.duration);
}

function testAutoScalingBehavior(authToken, config) {
  // Test health endpoints more frequently during spike
  const healthResponse = makeAuthenticatedRequest(
    `${config.baseUrl}/health`
  );
  
  const healthCheck = check(healthResponse, {
    'spike health': (r) => r.status === 200 || r.status === 503, // Allow 503 during scaling
  });
  
  errorRate.add(!healthCheck);
  responseTime.add(healthResponse.timings.duration);
}
```

## 2. JMeter Performance Testing

### JMeter Test Plan Configuration

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.2">
  <hashTree>
    <!-- Test Plan -->
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="Silhouette Workflow Performance Test" enabled="true">
      <stringProp name="TestPlan.user_define_classpath"></stringProp>
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.comments">Comprehensive performance testing for Silhouette Workflow Creation platform</boolProp>
      <stringProp name="TestPlan.user_define_classpath"></stringProp>
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
        <collectionProp name="Arguments.arguments">
          <elementProp name="baseUrl" elementType="Argument">
            <stringProp name="Argument.name">baseUrl</stringProp>
            <stringProp name="Argument.value">http://localhost:8000/api</stringProp>
            <stringProp name="Argument.metadata">=</stringProp>
          </elementProp>
          <elementProp name="testUser" elementType="Argument">
            <stringProp name="Argument.name">testUser</stringProp>
            <stringProp name="Argument.value">test@silhouette-workflow.com</stringProp>
            <stringProp name="Argument.metadata">=</stringProp>
          </elementProp>
          <elementProp name="testPassword" elementType="Argument">
            <stringProp name="Argument.name">testPassword</stringProp>
            <stringProp name="Argument.value">testpassword123</stringProp>
            <stringProp name="Argument.metadata">=</stringProp>
          </elementProp>
        </collectionProp>
      </elementProp>
    </TestPlan>
    
    <hashTree>
      <!-- Thread Group for Load Testing -->
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Load Test Thread Group" enabled="true">
        <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControllerGui" testclass="LoopController" testname="Loop Controller" enabled="true">
          <boolProp name="LoopController.continue_forever">false</boolProp>
          <stringProp name="LoopController.loops">1</stringProp>
        </elementProp>
        <stringProp name="ThreadGroup.num_threads">100</stringProp>
        <stringProp name="ThreadGroup.ramp_time">60</stringProp>
        <stringProp name="ThreadGroup.duration">300</stringProp>
        <stringProp name="ThreadGroup.delay">0</stringProp>
        <boolProp name="ThreadGroup.scheduler">true</boolProp>
      </ThreadGroup>
      
      <hashTree>
        <!-- CSV Data Set Config for test data -->
        <ConfigTestElement guiclass="CsvDataSetGui" testclass="ConfigTestElement" testname="CSV Data Set Config" enabled="true">
          <stringProp name="delimiter">,</stringProp>
          <stringProp name="fileEncoding">UTF-8</stringProp>
          <stringProp name="filename">${__P(workspace)}/performance-tests/data/test-data.csv</stringProp>
          <boolProp name="ignoreFirstLine">false</boolProp>
          <boolProp name="quotedData">false</boolProp>
          <boolProp name="recycle">true</boolProp>
          <stringProp name="shareMode">shareMode.all</stringProp>
          <stringProp name="variableNames">workflow_name,workflow_description,action_type,api_url</stringProp>
        </ConfigTestElement>
        
        <!-- HTTP Header Manager -->
        <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="HTTP Header Manager" enabled="true">
          <collectionProp name="HeaderManager.headers">
            <elementProp name="" elementType="Header">
              <stringProp name="Header.name">Content-Type</stringProp>
              <stringProp name="Header.value">application/json</stringProp>
            </elementProp>
            <elementProp name="" elementType="Header">
              <stringProp name="Header.name">Accept</stringProp>
              <stringProp name="Header.value">application/json</stringProp>
            </elementProp>
          </collectionProp>
        </HeaderManager>
        
        <!-- HTTP Cookie Manager -->
        <CookieManager guiclass="CookiePanel" testclass="CookieManager" testname="HTTP Cookie Manager" enabled="true">
          <collectionProp name="CookieManager.cookies"/>
          <boolProp name="CookieManager.clearEachIteration">false</boolProp>
          <boolProp name="CookieManager.controlledByThreadGroup">false</boolProp>
        </CookieManager>
        
        <!-- Authentication Setup -->
        <hashTree>
          <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="Login Request" enabled="true">
            <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
              <collectionProp name="Arguments.arguments">
                <elementProp name="email" elementType="Argument">
                  <stringProp name="Argument.name">email</stringProp>
                  <stringProp name="Argument.value">${testUser}</stringProp>
                  <stringProp name="Argument.metadata">=</stringProp>
                </elementProp>
                <elementProp name="password" elementType="Argument">
                  <stringProp name="Argument.name">password</stringProp>
                  <stringProp name="Argument.value">${testPassword}</stringProp>
                  <stringProp name="Argument.metadata">=</stringProp>
                </elementProp>
              </collectionProp>
            </elementProp>
            <stringProp name="HTTPSampler.domain">${baseUrl}</stringProp>
            <stringProp name="HTTPSampler.port"></stringProp>
            <stringProp name="HTTPSampler.path">/auth/login</stringProp>
            <stringProp name="HTTPSampler.method">POST</stringProp>
            <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
            <boolProp name="HTTPSampler.auto_redirects">false</boolProp>
            <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
            <boolProp name="HTTPSampler.DO_MULTIPART_POST">false</boolProp>
            <stringProp name="HTTPSampler.embedded_url_re"></stringProp>
            <stringProp name="HTTPSampler.connect_timeout"></stringProp>
            <stringProp name="HTTPSampler.response_timeout"></stringProp>
          </HTTPSamplerProxy>
          
          <hashTree>
            <!-- JSON Extractor to get auth token -->
            <JSONExtractor guiclass="JSONPostProcessorGui" testclass="JSONExtractor" testname="JSON Extractor - Auth Token" enabled="true">
              <stringProp name="JSONExtractor.referenceNames">authToken</stringProp>
              <stringProp name="JSONExtractor.jsonPathExpressions">$.data.token</stringProp>
              <stringProp name="JSONExtractor.match_numbers">1</stringProp>
              <stringProp name="JSONExtractor.defaultValues">NOT_FOUND</stringProp>
            </JSONExtractor>
            
            <!-- Response Assertion for login -->
            <ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Response Assertion - Login Success" enabled="true">
              <collectionProp name="Asserion.test_strings">
                <stringProp name="49586">200</stringProp>
              </collectionProp>
              <stringProp name="Assertion.custom_message"></stringProp>
              <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
              <boolProp name="Assertion.assume_success">false</boolProp>
              <intProp name="Assertion.test_type">2</intProp>
            </ResponseAssertion>
          </hashTree>
        </hashTree>
        
        <!-- Add Auth Token to Headers -->
        <hashTree>
          <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="Authorization Header" enabled="true">
            <collectionProp name="HeaderManager.headers">
              <elementProp name="" elementType="Header">
                <stringProp name="Header.name">Authorization</stringProp>
                <stringProp name="Header.value">Bearer ${authToken}</stringProp>
              </elementProp>
            </collectionProp>
          </HeaderManager>
        </hashTree>
        
        <!-- Workflow Operations Test -->
        <hashTree>
          <RandomVariableConfig guiclass="TestBeanGUI" testclass="RandomVariableConfig" testname="Random Workflow Name" enabled="true">
            <stringProp name="maximumValue">9999</stringProp>
            <stringProp name="minimumValue">1000</stringProp>
            <stringProp name="outputFormat">workflow_${randomNumber}</stringProp>
            <boolProp name="perThread">true</boolProp>
            <stringProp name="randomSeed"></stringProp>
            <stringProp name="variableName">workflowName</stringProp>
          </RandomVariableConfig>
          
          <!-- Create Workflow -->
          <hashTree>
            <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="Create Workflow" enabled="true">
              <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
                <collectionProp name="Arguments.arguments">
                  <elementProp name="name" elementType="Argument">
                    <stringProp name="Argument.name">name</stringProp>
                    <stringProp name="Argument.value">${workflowName}</stringProp>
                    <stringProp name="Argument.metadata">=</stringProp>
                  </elementProp>
                  <elementProp name="description" elementType="Argument">
                    <stringProp name="Argument.name">description</stringProp>
                    <stringProp name="Argument.value">Performance test workflow created at ${__time()}</stringProp>
                    <stringProp name="Argument.metadata">=</stringProp>
                  </elementProp>
                  <elementProp name="triggers" elementType="Argument">
                    <stringProp name="Argument.name">triggers</stringProp>
                    <stringProp name="Argument.value">[{"type": "manual"}]</stringProp>
                    <stringProp name="Argument.metadata">=</stringProp>
                  </elementProp>
                  <elementProp name="actions" elementType="Argument">
                    <stringProp name="Argument.name">actions</stringProp>
                    <stringProp name="Argument.value">[{"type": "api_call", "config": {"url": "https://httpbin.org/get", "method": "GET"}}]</stringProp>
                    <stringProp name="Argument.metadata">=</stringProp>
                  </elementProp>
                </collectionProp>
              </elementProp>
              <stringProp name="HTTPSampler.domain">${baseUrl}</stringProp>
              <stringProp name="HTTPSampler.port"></stringProp>
              <stringProp name="HTTPSampler.path">/workflows</stringProp>
              <stringProp name="HTTPSampler.method">POST</stringProp>
              <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
              <boolProp name="HTTPSampler.auto_redirects">false</boolProp>
              <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
              <boolProp name="HTTPSampler.DO_MULTIPART_POST">false</boolProp>
              <stringProp name="HTTPSampler.embedded_url_re"></stringProp>
              <stringProp name="HTTPSampler.connect_timeout"></stringProp>
              <stringProp name="HTTPSampler.response_timeout"></stringProp>
            </HTTPSamplerProxy>
            
            <hashTree>
              <!-- JSON Extractor to get workflow ID -->
              <JSONExtractor guiclass="JSONPostProcessorGui" testclass="JSONExtractor" testname="JSON Extractor - Workflow ID" enabled="true">
                <stringProp name="JSONExtractor.referenceNames">workflowId</stringProp>
                <stringProp name="JSONExtractor.jsonPathExpressions">$.data.id</stringProp>
                <stringProp name="JSONExtractor.match_numbers">1</stringProp>
                <stringProp name="JSONExtractor.defaultValues">NOT_FOUND</stringProp>
              </JSONExtractor>
              
              <!-- Response Assertions -->
              <ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Response Assertion - Create Success" enabled="true">
                <collectionProp name="Asserion.test_strings">
                  <stringProp name="49586">201</stringProp>
                </collectionProp>
                <stringProp name="Assertion.custom_message">Workflow creation failed</stringProp>
                <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
                <boolProp name="Assertion.assume_success">false</boolProp>
                <intProp name="Assertion.test_type">8</intProp>
              </ResponseAssertion>
            </hashTree>
          </hashTree>
          
          <!-- Execute Workflow -->
          <hashTree>
            <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="Execute Workflow" enabled="true">
              <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
                <collectionProp name="Arguments.arguments">
                  <elementProp name="trigger" elementType="Argument">
                    <stringProp name="Argument.name">trigger</stringProp>
                    <stringProp name="Argument.value">manual</stringProp>
                    <stringProp name="Argument.metadata">=</stringProp>
                  </elementProp>
                </collectionProp>
              </elementProp>
              <stringProp name="HTTPSampler.domain">${baseUrl}</stringProp>
              <stringProp name="HTTPSampler.port"></stringProp>
              <stringProp name="HTTPSampler.path">/workflows/${workflowId}/execute</stringProp>
              <stringProp name="HTTPSampler.method">POST</stringProp>
              <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
              <boolProp name="HTTPSampler.auto_redirects">false</boolProp>
              <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
              <boolProp name="HTTPSampler.DO_MULTIPART_POST">false</boolProp>
              <stringProp name="HTTPSampler.embedded_url_re"></stringProp>
              <stringProp name="HTTPSampler.connect_timeout"></stringProp>
              <stringProp name="HTTPSampler.response_timeout"></stringProp>
            </HTTPSamplerProxy>
            
            <hashTree>
              <ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Response Assertion - Execute Success" enabled="true">
                <collectionProp name="Asserion.test_strings">
                  <stringProp name="49586">200</stringProp>
                </collectionProp>
                <stringProp name="Assertion.custom_message">Workflow execution failed</stringProp>
                <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
                <boolProp name="Assertion.assume_success">false</boolProp>
                <intProp name="Assertion.test_type">8</intProp>
              </ResponseAssertion>
            </hashTree>
          </hashTree>
          
          <!-- List Workflows -->
          <hashTree>
            <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="List Workflows" enabled="true">
              <stringProp name="HTTPSampler.domain">${baseUrl}</stringProp>
              <stringProp name="HTTPSampler.port"></stringProp>
              <stringProp name="HTTPSampler.path">/workflows?page=1&limit=20</stringProp>
              <stringProp name="HTTPSampler.method">GET</stringProp>
              <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
              <boolProp name="HTTPSampler.auto_redirects">false</boolProp>
              <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
              <boolProp name="HTTPSampler.DO_MULTIPART_POST">false</boolProp>
              <stringProp name="HTTPSampler.embedded_url_re"></stringProp>
              <stringProp name="HTTPSampler.connect_timeout"></stringProp>
              <stringProp name="HTTPSampler.response_timeout"></stringProp>
            </HTTPSamplerProxy>
            
            <hashTree>
              <ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Response Assertion - List Success" enabled="true">
                <collectionProp name="Asserion.test_strings">
                  <stringProp name="49586">200</stringProp>
                </collectionProp>
                <stringProp name="Assertion.custom_message">Workflow listing failed</stringProp>
                <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
                <boolProp name="Assertion.assume_success">false</boolProp>
                <intProp name="Assertion.test_type">8</intProp>
              </ResponseAssertion>
            </hashTree>
          </hashTree>
          
          <!-- Think Time -->
          <hashTree>
            <GaussianRandomTimer guiclass="GaussianRandomTimerGui" testclass="GaussianRandomTimer" testname="Think Time" enabled="true">
              <stringProp name="RandomTimer.range">2000.0</stringProp>
              <stringProp name="RandomTimer.offset">1000.0</stringProp>
            </GaussianRandomTimer>
          </hashTree>
        </hashTree>
      </hashTree>
      
      <!-- Performance Listeners -->
      <hashTree>
        <ResultCollector guiclass="SummaryReport" testclass="ResultCollector" testname="Summary Report" enabled="true">
          <boolProp name="ResultCollector.error_logging">false</boolProp>
          <objProp>
            <name>saveConfig</name>
            <value class="SampleSaveConfiguration">
              <time>true</time>
              <latency>true</latency>
              <timestamp>true</timestamp>
              <success>true</success>
              <label>true</label>
              <code>true</code>
              <message>true</message>
              <threadName>true</threadName>
              <dataType>true</dataType>
              <encoding>false</encoding>
              <assertions>true</assertions>
              <subresults>true</subresults>
              <responseData>false</responseData>
              <samplerData>false</samplerData>
              <xml>false</xml>
              <fieldNames>true</fieldNames>
              <responseHeaders>false</responseHeaders>
              <requestHeaders>false</requestHeaders>
              <responseDataOnError>false</responseDataOnError>
              <saveAssertionResultsFailureMessage>true</saveAssertionResultsFailureMessage>
              <assertionsResultsToSave>0</assertionsResultsToSave>
              <bytes>true</bytes>
              <sentBytes>true</sentBytes>
              <url>true</url>
              <threadCounts>true</threadCounts>
              <idleTime>true</idleTime>
              <connectTime>true</connectTime>
            </value>
          </objProp>
          <stringProp name="filename">${__P(workspace)}/performance-tests/results/jmeter-results.jtl</stringProp>
        </ResultCollector>
        
        <ResultCollector guiclass="StatVisualizer" testclass="ResultCollector" testname="Active Threads Over Time" enabled="true">
          <boolProp name="ResultCollector.error_logging">false</boolProp>
          <objProp>
            <name>saveConfig</name>
            <value class="SampleSaveConfiguration">
              <time>true</time>
              <latency>true</latency>
              <timestamp>true</timestamp>
              <success>true</success>
              <label>true</label>
              <code>true</code>
              <message>true</message>
              <threadName>true</threadName>
              <dataType>true</dataType>
              <encoding>false</encoding>
              <assertions>true</assertions>
              <subresults>true</subresults>
              <responseData>false</responseData>
              <samplerData>false</samplerData>
              <xml>false</xml>
              <fieldNames>true</fieldNames>
              <responseHeaders>false</responseHeaders>
              <requestHeaders>false</requestHeaders>
              <responseDataOnError>false</responseDataOnError>
              <saveAssertionResultsFailureMessage>true</saveAssertionResultsFailureMessage>
              <assertionsResultsToSave>0</assertionsResultsToSave>
              <bytes>true</bytes>
              <sentBytes>true</sentBytes>
              <url>true</url>
              <threadCounts>true</threadCounts>
              <idleTime>true</idleTime>
              <connectTime>true</connectTime>
            </value>
          </objProp>
          <stringProp name="filename">${__P(workspace)}/performance-tests/results/active-threads.jtl</stringProp>
        </ResultCollector>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>
```

## 3. Artillery Performance Testing

### Artillery Configuration

```yaml
# performance-tests/config/artillery.yml
config:
  target: 'http://localhost:8000'
  phases:
    # Load test
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Ramp up load"
    - duration: 300
      arrivalRate: 100
      name: "Sustained load"
    - duration: 120
      arrivalRate: 50
      name: "Ramp down"
  
  processor: "./load-test-processor.js"
  variables:
    baseUrl: "/api"
    authToken: ""
  
  # Custom metrics
  ensure:
    p95: 500
    p99: 1000
    maxErrorRate: 1

scenarios:
  - name: "Complete User Journey"
    weight: 100
    flow:
      - post:
          url: "{{ baseUrl }}/auth/login"
          json:
            email: "test@silhouette-workflow.com"
            password: "testpassword123"
          capture:
            - json: "$.data.token"
              as: "authToken"
          expect:
            - statusCode: 200
            - hasProperty: "data.token"
      
      - think: 1
      
      - get:
          url: "{{ baseUrl }}/auth/profile"
          headers:
            Authorization: "Bearer {{ authToken }}"
          expect:
            - statusCode: 200
      
      - think: 0.5
      
      - post:
          url: "{{ baseUrl }}/workflows"
          headers:
            Authorization: "Bearer {{ authToken }}"
            Content-Type: "application/json"
          json:
            name: "Artillery Test Workflow {{ $randomString() }}"
            description: "Performance test workflow created by Artillery"
            triggers:
              - type: "manual"
            actions:
              - type: "api_call"
                config:
                  url: "https://httpbin.org/get"
                  method: "GET"
          capture:
            - json: "$.data.id"
              as: "workflowId"
          expect:
            - statusCode: 201
            - hasProperty: "data.id"
      
      - think: 0.5
      
      - get:
          url: "{{ baseUrl }}/workflows"
          headers:
            Authorization: "Bearer {{ authToken }}"
          expect:
            - statusCode: 200
            - hasProperty: "data"
      
      - think: 0.5
      
      - post:
          url: "{{ baseUrl }}/workflows/{{ workflowId }}/execute"
          headers:
            Authorization: "Bearer {{ authToken }}"
            Content-Type: "application/json"
          json:
            trigger: "manual"
          expect:
            - statusCode: 200
            - hasProperty: "data.id"
      
      - think: 1
      
      - get:
          url: "{{ baseUrl }}/workflows/{{ workflowId }}/metrics"
          headers:
            Authorization: "Bearer {{ authToken }}"
          expect:
            - statusCode: 200
            - hasProperty: "data.summary"
      
      - think: 2

  - name: "API Heavy Workload"
    weight: 30
    flow:
      - post:
          url: "{{ baseUrl }}/auth/login"
          json:
            email: "test@silhouette-workflow.com"
            password: "testpassword123"
          capture:
            - json: "$.data.token"
              as: "authToken"
      
      - loop:
          - get:
              url: "{{ baseUrl }}/workflows"
              headers:
                Authorization: "Bearer {{ authToken }}"
          - get:
              url: "{{ baseUrl }}/analytics/dashboard"
              headers:
                Authorization: "Bearer {{ authToken }}"
          - get:
              url: "{{ baseUrl }}/analytics/realtime"
              headers:
                Authorization: "Bearer {{ authToken }}"
        count: 5
      
      - think: 1

  - name: "Workflow Creation Storm"
    weight: 20
    flow:
      - post:
          url: "{{ baseUrl }}/auth/login"
          json:
            email: "test@silhouette-workflow.com"
            password: "testpassword123"
          capture:
            - json: "$.data.token"
              as: "authToken"
      
      - loop:
          - post:
              url: "{{ baseUrl }}/workflows"
              headers:
                Authorization: "Bearer {{ authToken }}"
                Content-Type: "application/json"
              json:
                name: "Storm Test {{ $randomString() }}"
                description: "Testing creation storm"
                triggers:
                  - type: "manual"
                actions:
                  - type: "api_call"
                    config:
                      url: "https://httpbin.org/post"
                      method: "POST"
        count: 10
      
      - think: 3
```

### Artillery Processor

```javascript
// performance-tests/config/load-test-processor.js
const crypto = require('crypto');

module.exports = {
  /**
   * Custom function to generate random workflow names
   */
  $randomString: function (context, events, done) {
    const adjectives = ['Fast', 'Reliable', 'Efficient', 'Smart', 'Automated'];
    const nouns = ['Workflow', 'Process', 'Automation', 'Pipeline', 'System'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(4).toString('hex');
    
    return done(`${adjective} ${noun} ${timestamp} ${randomId}`);
  },

  /**
   * Custom function to validate performance thresholds
   */
  validatePerformance: function (context, events, done) {
    const response = context.response;
    
    // Check response time
    if (response.timings && response.timings.duration > 5000) {
      events.emit('counter', 'performance.slow_responses', 1);
      console.warn(`Slow response detected: ${response.timings.duration}ms`);
    }
    
    // Check status code
    if (response.statusCode >= 500) {
      events.emit('counter', 'performance.server_errors', 1);
    } else if (response.statusCode >= 400) {
      events.emit('counter', 'performance.client_errors', 1);
    }
    
    return done();
  },

  /**
   * Custom function to setup auth token
   */
  setupAuth: async function (context, events, done) {
    try {
      const response = await context.http.post(
        `${context.vars.baseUrl}/auth/login`,
        {
          email: 'test@silhouette-workflow.com',
          password: 'testpassword123',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.statusCode === 200) {
        const token = JSON.parse(response.body).data.token;
        context.vars.authToken = token;
        events.emit('counter', 'auth.setup_success', 1);
      } else {
        events.emit('counter', 'auth.setup_failed', 1);
      }
    } catch (error) {
      console.error('Auth setup failed:', error);
      events.emit('counter', 'auth.setup_error', 1);
    }
    
    return done();
  },

  /**
   * Custom function to simulate user think time
   */
  userThinkTime: function (context, events, done) {
    // Simulate human-like think time with some randomness
    const baseTime = 1000; // 1 second base
    const variation = Math.random() * 2000; // 0-2 seconds variation
    const thinkTime = baseTime + variation;
    
    setTimeout(done, thinkTime);
  },

  /**
   * Custom function to check system health during test
   */
  healthCheck: function (context, events, done) {
    setTimeout(async function() {
      try {
        const response = await context.http.get(
          `${context.vars.baseUrl}/health`,
          {
            headers: {
              'Authorization': `Bearer ${context.vars.authToken}`,
            },
          }
        );
        
        if (response.statusCode === 200) {
          events.emit('counter', 'health.checks_success', 1);
        } else {
          events.emit('counter', 'health.checks_failed', 1);
        }
      } catch (error) {
        events.emit('counter', 'health.checks_error', 1);
      }
      
      return done();
    }, Math.random() * 5000); // Random interval up to 5 seconds
  },

  /**
   * Custom function to track workflow execution times
   */
  trackExecution: function (context, events, done) {
    const startTime = Date.now();
    
    // This would be called after workflow execution
    return function() {
      const duration = Date.now() - startTime;
      
      if (duration > 2000) {
        events.emit('counter', 'workflow.slow_executions', 1);
        console.warn(`Slow workflow execution: ${duration}ms`);
      }
      
      events.emit('histogram', 'workflow.execution_time', duration);
      return done();
    };
  }
};
```

## 4. Performance Monitoring y Alerting

### Prometheus Metrics Configuration

```yaml
# performance-tests/monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "performance-alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  # Application performance metrics
  - job_name: 'silhouette-workflow-performance'
    static_configs:
      - targets: ['silhouette-workflow:9090']
    metrics_path: /metrics
    scrape_interval: 10s
    
  # K6 performance test metrics
  - job_name: 'k6-performance-test'
    static_configs:
      - targets: ['k6-dashboard:8080']
    metrics_path: /metrics
    scrape_interval: 5s
    
  # JMeter performance test metrics
  - job_name: 'jmeter-performance-test'
    static_configs:
      - targets: ['jmeter-dashboard:8080']
    metrics_path: /metrics
    scrape_interval: 5s
    
  # System performance metrics
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 15s
    
  # Database performance metrics
  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']
    scrape_interval: 15s
    
  # Redis performance metrics
  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']
    scrape_interval: 15s
```

### Performance Alert Rules

```yaml
# performance-tests/monitoring/performance-alerts.yml
groups:
- name: performance-alerts
  rules:
  # High-level performance alerts
  - alert: HighResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
    for: 3m
    labels:
      severity: warning
      service: silhouette-workflow
    annotations:
      summary: "High response time detected"
      description: "95th percentile response time is {{ $value }}s, threshold is 0.5s"
      runbook_url: "https://docs.silhouette-workflow.com/runbooks/high-response-time"
      
  - alert: VeryHighResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1.0
    for: 2m
    labels:
      severity: critical
      service: silhouette-workflow
    annotations:
      summary: "Very high response time detected"
      description: "95th percentile response time is {{ $value }}s, threshold is 1.0s"
      runbook_url: "https://docs.silhouette-workflow.com/runbooks/very-high-response-time"
      
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
    for: 2m
    labels:
      severity: critical
      service: silhouette-workflow
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }}, threshold is 5%"
      runbook_url: "https://docs.silhouette-workflow.com/runbooks/high-error-rate"
      
  - alert: HighThroughputDrop
    expr: rate(http_requests_total[5m]) < (rate(http_requests_total[1h]) * 0.7)
    for: 5m
    labels:
      severity: warning
      service: silhouette-workflow
    annotations:
      summary: "Significant throughput drop detected"
      description: "Current throughput is {{ $value }} requests/sec, 30% below 1h average"
      
  # Resource utilization alerts
  - alert: HighCPUUsage
    expr: (rate(container_cpu_usage_seconds_total{pod=~"silhouette-workflow.*"}[5m]) * 100) > 80
    for: 5m
    labels:
      severity: warning
      service: silhouette-workflow
    annotations:
      summary: "High CPU usage detected"
      description: "CPU usage is {{ $value }}% for pod {{ $labels.pod }}"
      
  - alert: VeryHighCPUUsage
    expr: (rate(container_cpu_usage_seconds_total{pod=~"silhouette-workflow.*"}[5m]) * 100) > 95
    for: 2m
    labels:
      severity: critical
      service: silhouette-workflow
    annotations:
      summary: "Very high CPU usage detected"
      description: "CPU usage is {{ $value }}% for pod {{ $labels.pod }}"
      
  - alert: HighMemoryUsage
    expr: (container_memory_working_set_bytes{pod=~"silhouette-workflow.*"} / container_spec_memory_limit_bytes{pod=~"silhouette-workflow.*"} * 100) > 85
    for: 5m
    labels:
      severity: warning
      service: silhouette-workflow
    annotations:
      summary: "High memory usage detected"
      description: "Memory usage is {{ $value }}% for pod {{ $labels.pod }}"
      
  - alert: VeryHighMemoryUsage
    expr: (container_memory_working_set_bytes{pod=~"silhouette-workflow.*"} / container_spec_memory_limit_bytes{pod=~"silhouette-workflow.*"} * 100) > 95
    for: 2m
    labels:
      severity: critical
      service: silhouette-workflow
    annotations:
      summary: "Very high memory usage detected"
      description: "Memory usage is {{ $value }}% for pod {{ $labels.pod }}"
      
  # Database performance alerts
  - alert: DatabaseConnectionHigh
    expr: pg_stat_database_numbackends / pg_settings_max_connections * 100 > 80
    for: 3m
    labels:
      severity: warning
      service: database
    annotations:
      summary: "High database connection usage"
      description: "Database connections usage is {{ $value }}%"
      
  - alert: DatabaseSlowQueries
    expr: rate(pg_stat_database_blk_read_time[5m]) > 1000
    for: 3m
    labels:
      severity: warning
      service: database
    annotations:
      summary: "High database I/O time"
      description: "Database I/O time rate is {{ $value }}ms"
      
  # Redis performance alerts
  - alert: RedisHighMemoryUsage
    expr: redis_memory_used_bytes / redis_memory_max_bytes * 100 > 80
    for: 3m
    labels:
      severity: warning
      service: redis
    annotations:
      summary: "High Redis memory usage"
      description: "Redis memory usage is {{ $value }}%"
      
  - alert: RedisHighLatency
    expr: rate(redis_command_duration_seconds_sum[5m]) / rate(redis_command_duration_seconds_count[5m]) > 0.1
    for: 3m
    labels:
      severity: warning
      service: redis
    annotations:
      summary: "High Redis latency"
      description: "Redis command latency is {{ $value }}s"
      
  # Performance test specific alerts
  - alert: PerformanceTestFailure
    expr: k6_http_req_duration_p95 > 500
    for: 1m
    labels:
      severity: warning
      service: performance-test
    annotations:
      summary: "Performance test regression detected"
      description: "P95 response time in performance test is {{ $value }}ms"
      
  - alert: PerformanceTestCriticalFailure
    expr: k6_http_req_duration_p95 > 1000
    for: 30s
    labels:
      severity: critical
      service: performance-test
    annotations:
      summary: "Critical performance test failure"
      description: "P95 response time in performance test is {{ $value }}ms"
      
  - alert: PerformanceTestHighErrorRate
    expr: k6_http_req_failed_rate > 0.05
    for: 1m
    labels:
      severity: warning
      service: performance-test
    annotations:
      summary: "High error rate in performance test"
      description: "Error rate in performance test is {{ $value | humanizePercentage }}"
```

### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "id": null,
    "title": "Silhouette Workflow Performance Dashboard",
    "tags": ["performance", "silhouette", "workflow"],
    "timezone": "UTC",
    "refresh": "30s",
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "panels": [
      {
        "id": 1,
        "title": "Response Time Percentiles",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P50",
            "refId": "A"
          },
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P95",
            "refId": "B"
          },
          {
            "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P99",
            "refId": "C"
          }
        ],
        "yAxes": [
          {
            "label": "Response Time (s)",
            "min": 0
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 2,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "Requests/sec",
            "refId": "A"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec",
            "min": 0
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 0
        }
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"4..|5..\"}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "Error Rate %",
            "refId": "A"
          }
        ],
        "yAxes": [
          {
            "label": "Error Rate (%)",
            "min": 0,
            "max": 100
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 8
        }
      },
      {
        "id": 4,
        "title": "Active Users",
        "type": "graph",
        "targets": [
          {
            "expr": "k6_vus",
            "legendFormat": "Active Users",
            "refId": "A"
          }
        ],
        "yAxes": [
          {
            "label": "Users",
            "min": 0
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 8
        }
      },
      {
        "id": 5,
        "title": "Database Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(pg_stat_database_blk_read_time[5m])",
            "legendFormat": "Read Time",
            "refId": "A"
          },
          {
            "expr": "rate(pg_stat_database_blk_write_time[5m])",
            "legendFormat": "Write Time",
            "refId": "B"
          }
        ],
        "yAxes": [
          {
            "label": "Time (ms)",
            "min": 0
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 16
        }
      },
      {
        "id": 6,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "container_memory_working_set_bytes{pod=~\"silhouette-workflow.*\"} / container_spec_memory_limit_bytes{pod=~\"silhouette-workflow.*\"} * 100",
            "legendFormat": "Memory Usage %",
            "refId": "A"
          }
        ],
        "yAxes": [
          {
            "label": "Memory Usage (%)",
            "min": 0,
            "max": 100
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 16
        }
      },
      {
        "id": 7,
        "title": "Performance Test Results",
        "type": "table",
        "targets": [
          {
            "expr": "k6_http_req_duration_p95",
            "legendFormat": "P95 Response Time",
            "refId": "A"
          },
          {
            "expr": "k6_http_req_failed_rate * 100",
            "legendFormat": "Error Rate %",
            "refId": "B"
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 24,
          "x": 0,
          "y": 24
        }
      }
    ]
  }
}
```

## 5. Performance Regression Detection

### Automated Performance Baseline

```typescript
// performance-tests/utils/regression-detector.ts
import { PerformanceMetrics, RegressionResult } from './types';

export class PerformanceRegressionDetector {
  private baseline: PerformanceMetrics;
  private thresholds: RegressionThresholds;
  private history: PerformanceMetrics[] = [];

  constructor(baseline: PerformanceMetrics, thresholds: RegressionThresholds) {
    this.baseline = baseline;
    this.thresholds = thresholds;
  }

  async detectRegression(currentMetrics: PerformanceMetrics): Promise<RegressionResult> {
    const results: RegressionResult = {
      timestamp: new Date(),
      overall: true,
      regressions: [],
      improvements: [],
      warnings: [],
    };

    // Check response time regression
    const responseTimeRegression = this.checkResponseTimeRegression(currentMetrics);
    if (responseTimeRegression.regressed) {
      results.regressions.push(responseTimeRegression);
      results.overall = false;
    } else if (responseTimeRegression.improved) {
      results.improvements.push(responseTimeRegression);
    }

    // Check throughput regression
    const throughputRegression = this.checkThroughputRegression(currentMetrics);
    if (throughputRegression.regressed) {
      results.regressions.push(throughputRegression);
      results.overall = false;
    } else if (throughputRegression.improved) {
      results.improvements.push(throughputRegression);
    }

    // Check error rate regression
    const errorRateRegression = this.checkErrorRateRegression(currentMetrics);
    if (errorRateRegression.regressed) {
      results.regressions.push(errorRateRegression);
      results.overall = false;
    } else if (errorRateRegression.improved) {
      results.improvements.push(errorRateRegression);
    }

    // Check resource utilization
    const resourceRegression = this.checkResourceRegression(currentMetrics);
    if (resourceRegression.regressed) {
      results.regressions.push(resourceRegression);
      results.overall = false;
    } else if (resourceRegression.improved) {
      results.improvements.push(resourceRegression);
    }

    // Store metrics for future comparison
    this.history.push(currentMetrics);
    if (this.history.length > 100) {
      this.history.shift(); // Keep only last 100 measurements
    }

    return results;
  }

  private checkResponseTimeRegression(metrics: PerformanceMetrics): MetricRegression {
    const baseline = this.baseline.responseTime;
    const current = metrics.responseTime;
    const changes: any = {};

    // Check P50 response time
    changes.p50 = this.calculateChange(baseline.p50, current.p50);
    if (Math.abs(changes.p50.percentChange) > this.thresholds.responseTime.p50) {
      return {
        metric: 'Response Time P50',
        baseline: baseline.p50,
        current: current.p50,
        change: changes.p50,
        regressed: changes.p50.percentChange > this.thresholds.responseTime.p50,
        improved: changes.p50.percentChange < -this.thresholds.responseTime.p50,
        threshold: this.thresholds.responseTime.p50,
        message: `P50 response time changed by ${changes.p50.percentChange.toFixed(2)}%`,
      };
    }

    // Check P95 response time
    changes.p95 = this.calculateChange(baseline.p95, current.p95);
    if (Math.abs(changes.p95.percentChange) > this.thresholds.responseTime.p95) {
      return {
        metric: 'Response Time P95',
        baseline: baseline.p95,
        current: current.p95,
        change: changes.p95,
        regressed: changes.p95.percentChange > this.thresholds.responseTime.p95,
        improved: changes.p95.percentChange < -this.thresholds.responseTime.p95,
        threshold: this.thresholds.responseTime.p95,
        message: `P95 response time changed by ${changes.p95.percentChange.toFixed(2)}%`,
      };
    }

    // Check P99 response time
    changes.p99 = this.calculateChange(baseline.p99, current.p99);
    if (Math.abs(changes.p99.percentChange) > this.thresholds.responseTime.p99) {
      return {
        metric: 'Response Time P99',
        baseline: baseline.p99,
        current: current.p99,
        change: changes.p99,
        regressed: changes.p99.percentChange > this.thresholds.responseTime.p99,
        improved: changes.p99.percentChange < -this.thresholds.responseTime.p99,
        threshold: this.thresholds.responseTime.p99,
        message: `P99 response time changed by ${changes.p99.percentChange.toFixed(2)}%`,
      };
    }

    return {
      metric: 'Response Time',
      baseline: baseline,
      current: current,
      change: changes,
      regressed: false,
      improved: false,
      threshold: this.thresholds.responseTime,
      message: 'No significant response time changes detected',
    };
  }

  private checkThroughputRegression(metrics: PerformanceMetrics): MetricRegression {
    const baseline = this.baseline.throughput;
    const current = metrics.throughput;
    const change = this.calculateChange(baseline, current);

    if (Math.abs(change.percentChange) > this.thresholds.throughput) {
      return {
        metric: 'Throughput',
        baseline: baseline,
        current: current,
        change: change,
        regressed: change.percentChange < -this.thresholds.throughput,
        improved: change.percentChange > this.thresholds.throughput,
        threshold: this.thresholds.throughput,
        message: `Throughput changed by ${change.percentChange.toFixed(2)}%`,
      };
    }

    return {
      metric: 'Throughput',
      baseline: baseline,
      current: current,
      change: change,
      regressed: false,
      improved: false,
      threshold: this.thresholds.throughput,
      message: 'No significant throughput changes detected',
    };
  }

  private checkErrorRateRegression(metrics: PerformanceMetrics): MetricRegression {
    const baseline = this.baseline.errorRate;
    const current = metrics.errorRate;
    const change = this.calculateChange(baseline, current);

    if (change.percentChange > this.thresholds.errorRate) {
      return {
        metric: 'Error Rate',
        baseline: baseline,
        current: current,
        change: change,
        regressed: change.percentChange > this.thresholds.errorRate,
        improved: change.percentChange < -this.thresholds.errorRate,
        threshold: this.thresholds.errorRate,
        message: `Error rate increased by ${change.percentChange.toFixed(2)}%`,
      };
    }

    return {
      metric: 'Error Rate',
      baseline: baseline,
      current: current,
      change: change,
      regressed: false,
      improved: false,
      threshold: this.thresholds.errorRate,
      message: 'No significant error rate changes detected',
    };
  }

  private checkResourceRegression(metrics: PerformanceMetrics): MetricRegression {
    const baseline = this.baseline.resources;
    const current = metrics.resources;
    const changes: any = {};

    // Check CPU usage
    changes.cpu = this.calculateChange(baseline.cpu, current.cpu);
    if (Math.abs(changes.cpu.percentChange) > this.thresholds.resources.cpu) {
      return {
        metric: 'CPU Usage',
        baseline: baseline.cpu,
        current: current.cpu,
        change: changes.cpu,
        regressed: changes.cpu.percentChange > this.thresholds.resources.cpu,
        improved: changes.cpu.percentChange < -this.thresholds.resources.cpu,
        threshold: this.thresholds.resources.cpu,
        message: `CPU usage changed by ${changes.cpu.percentChange.toFixed(2)}%`,
      };
    }

    // Check memory usage
    changes.memory = this.calculateChange(baseline.memory, current.memory);
    if (Math.abs(changes.memory.percentChange) > this.thresholds.resources.memory) {
      return {
        metric: 'Memory Usage',
        baseline: baseline.memory,
        current: current.memory,
        change: changes.memory,
        regressed: changes.memory.percentChange > this.thresholds.resources.memory,
        improved: changes.memory.percentChange < -this.thresholds.resources.memory,
        threshold: this.thresholds.resources.memory,
        message: `Memory usage changed by ${changes.memory.percentChange.toFixed(2)}%`,
      };
    }

    return {
      metric: 'Resources',
      baseline: baseline,
      current: current,
      change: changes,
      regressed: false,
      improved: false,
      threshold: this.thresholds.resources,
      message: 'No significant resource usage changes detected',
    };
  }

  private calculateChange(baseline: number, current: number): ChangeDetail {
    const absoluteChange = current - baseline;
    const percentChange = baseline !== 0 ? (absoluteChange / baseline) * 100 : 0;
    const relativeChange = current / baseline;

    return {
      absolute: absoluteChange,
      percent: percentChange,
      relative: relativeChange,
      percentChange: percentChange, // For backward compatibility
    };
  }

  generateReport(results: RegressionResult): string {
    let report = `## Performance Regression Report\n\n`;
    report += `**Timestamp:** ${results.timestamp.toISOString()}\n\n`;
    report += `**Overall Status:** ${results.overall ? '✅ PASS' : '❌ FAIL'}\n\n`;

    if (results.regressions.length > 0) {
      report += `### 🚨 Regressions Detected\n\n`;
      results.regressions.forEach(regression => {
        report += `- **${regression.metric}**: ${regression.message}\n`;
        report += `  - Baseline: ${regression.baseline}\n`;
        report += `  - Current: ${regression.current}\n`;
        report += `  - Change: ${regression.change.percentChange.toFixed(2)}%\n\n`;
      });
    }

    if (results.improvements.length > 0) {
      report += `### ✅ Improvements Detected\n\n`;
      results.improvements.forEach(improvement => {
        report += `- **${improvement.metric}**: ${improvement.message}\n`;
        report += `  - Baseline: ${improvement.baseline}\n`;
        report += `  - Current: ${improvement.current}\n`;
        report += `  - Change: ${improvement.change.percentChange.toFixed(2)}%\n\n`;
      });
    }

    if (results.warnings.length > 0) {
      report += `### ⚠️ Warnings\n\n`;
      results.warnings.forEach(warning => {
        report += `- ${warning}\n`;
      });
      report += `\n`;
    }

    return report;
  }
}

interface PerformanceMetrics {
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: number;
  errorRate: number;
  resources: {
    cpu: number;
    memory: number;
  };
  timestamp: Date;
}

interface RegressionThresholds {
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: number;
  errorRate: number;
  resources: {
    cpu: number;
    memory: number;
  };
}

interface RegressionResult {
  timestamp: Date;
  overall: boolean;
  regressions: MetricRegression[];
  improvements: MetricRegression[];
  warnings: string[];
}

interface MetricRegression {
  metric: string;
  baseline: number | any;
  current: number | any;
  change: ChangeDetail | any;
  regressed: boolean;
  improved: boolean;
  threshold: number | any;
  message: string;
}

interface ChangeDetail {
  absolute: number;
  percent: number;
  relative: number;
  percentChange: number; // For backward compatibility
}
```

## Conclusión

El **Performance Testing Framework** de Silhouette Workflow Creation proporciona un sistema integral de testing de rendimiento que garantiza que la plataforma mantenga un rendimiento óptimo bajo cualquier condición de carga. Con testing automatizado, monitoreo continuo y detección proactiva de regresiones, este framework establece un estándar de rendimiento de clase empresarial.

### Beneficios Principales

1. **Cobertura Integral**: Load, stress, endurance, spike, volume y scalability testing
2. **Herramientas Múltiples**: K6, JMeter y Artillery para diferentes escenarios
3. **Monitoreo Continuo**: Prometheus + Grafana con alertas automáticas
4. **Detección Proactiva**: Regresión automática de performance baseline
5. **Reportes Automáticos**: Análisis detallado de tendencias y recomendaciones
6. **Real-world Simulation**: Testing con comportamiento real de usuarios
7. **Escalabilidad Validada**: Testing automático de auto-scaling y load balancing

### Métricas de Éxito

- **P95 Response Time**: <500ms bajo carga normal
- **P99 Response Time**: <1000ms bajo carga normal
- **Throughput**: 1000+ requests/second
- **Error Rate**: <1% bajo carga normal
- **Availability**: 99.9%+ durante testing
- **Memory Stability**: Sin memory leaks en endurance testing
- **Auto-scaling**: <30 segundos para scale out

---

**Autor**: Silhouette Anonimo  
**Versión**: 1.0.0  
**Fecha**: 2025-11-09  
**Estado**: Implementación Completa