# Framework Silhouette V4.0 - API Reference

## Core Classes

### EOCMain
Clase principal para inicializar y gestionar el framework.

```javascript
const eoc = new EOCMain();
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `initialize()` | None | `Promise<boolean>` | Inicializa todos los componentes |
| `start()` | None | `Promise<void>` | Inicia el framework |
| `stop()` | None | `Promise<void>` | Detiene el framework |
| `getStatus()` | None | `Object` | Estado actual del sistema |
| `triggerOptimization()` | None | `Promise<void>` | Fuerza optimización |

#### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `initialized` | `{ timestamp }` | Framework inicializado |
| `started` | `{ startTime, teams }` | Framework iniciado |
| `stopped` | `{ uptime, metrics }` | Framework detenido |
| `optimization` | `{ improvements, efficiency }` | Optimización ejecutada |
| `error` | `{ error, component }` | Error crítico |

### ContinuousOptimizationDirector
Director principal del sistema de optimización.

```javascript
const director = new ContinuousOptimizationDirector();
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `start()` | None | `Promise<void>` | Inicia el director |
| `stop()` | None | `Promise<void>` | Detiene el director |
| `optimize()` | None | `Promise<Object>` | Ejecuta optimización |
| `getMetrics()` | None | `Object` | Métricas actuales |

### DynamicWorkflowsCoordinator
Coordinador de workflows dinámicos.

```javascript
const coordinator = new DynamicWorkflowsCoordinator();
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `initializeTeams()` | None | `Promise<void>` | Inicializa equipos |
| `startWorkflows()` | None | `Promise<void>` | Inicia workflows |
| `coordinateTeams()` | None | `Promise<void>` | Coordina equipos |
| `getTeamStatus()` | `teamId` | `Object` | Estado de equipo específico |

## Team Workflows

### Base Team Structure
Todos los equipos extienden una estructura base:

```javascript
class CustomTeam {
    constructor() {
        this.state = { /* estado interno */ };
        this.aiModels = { /* modelos AI */ };
        this.metrics = { /* métricas */ };
    }
    
    async initialize() { /* inicialización */ }
    async start() { /* inicio de operaciones */ }
    async pause() { /* pausar operaciones */ }
    async resume() { /* continuar operaciones */ }
    async stop() { /* detener */ }
}
```

### Available Teams

#### MarketingTeam
- **Propósito**: Gestión de campañas y marketing
- **AI Models**: campaignAnalyzer, marketPredictor, contentOptimizer
- **Workflows**: campaignPlanning, contentCreation, performanceAnalysis

#### SalesTeam  
- **Propósito**: Gestión de pipeline de ventas
- **AI Models**: leadScorer, opportunityAnalyzer, salesPredictor
- **Workflows**: leadManagement, opportunityTracking, salesForecasting

#### ITInfrastructureTeam
- **Propósito**: Gestión de infraestructura IT
- **AI Models**: infrastructureAnalyzer, autoHealingSystem, predictiveMaintenance
- **Workflows**: systemMonitoring, capacityPlanning, securityManagement

#### LegalTeam
- **Propósito**: Gestión legal y compliance
- **AI Models**: contractAnalyzer, complianceMonitor, riskAssessment
- **Workflows**: contractReview, complianceCheck, riskManagement

#### DataScienceTeam
- **Propósito**: Análisis de datos y ML
- **AI Models**: autoMLEngine, predictiveModeler, insightGenerator
- **Workflows**: dataExploration, modelDevelopment, insightGeneration

#### StrategicPlanningTeam
- **Propósito**: Planificación estratégica
- **AI Models**: strategyAnalyzer, marketPredictor, riskAssessor
- **Workflows**: strategicAnalysis, planningOptimization, riskManagement

### Phase 3 Teams (21+ additional teams)
- **FinanceWorkflow**: Gestión financiera y análisis
- **HRWorkflow**: Gestión de recursos humanos
- **OperationsWorkflow**: Optimización de operaciones
- **ProductWorkflow**: Gestión de productos
- **CustomerSuccessWorkflow**: Gestión de clientes

## Configuration

### Framework Configuration
```javascript
const config = {
    // Timing
    monitoringInterval: 30000,    // 30 segundos
    reportInterval: 300000,       // 5 minutos
    optimizationInterval: 60000,  // 1 minuto
    
    // Performance
    maxConcurrentOptimizations: 10,
    performanceThreshold: 0.8,
    errorRecoveryEnabled: true,
    
    // Logging
    logLevel: 'info',             // debug, info, warn, error
    enableMetrics: true,
    enableNotifications: true,
    
    // AI Models
    aiConfidenceThreshold: 0.8,
    autoLearningEnabled: true,
    modelRetrainInterval: 3600000  // 1 hora
};
```

## Events and Communication

### Event System
El framework usa un sistema de eventos para comunicación entre componentes:

```javascript
const EventEmitter = require('events');

class FrameworkEvent extends EventEmitter {
    // Framework events
    framework:started
    framework:stopped
    framework:error
    
    // Team events
    team:initialized
    team:started
    team:paused
    team:resumed
    team:stopped
    
    // Optimization events
    optimization:started
    optimization:completed
    optimization:error
    
    // Metrics events
    metrics:updated
    metrics:threshold
}
```

### Inter-Team Communication
```javascript
// Enviar evento a otro equipo
this.emit('team:coordination', {
    from: 'ITInfrastructureTeam',
    to: 'DataScienceTeam',
    type: 'data_request',
    payload: { query: 'system_metrics' }
});

// Escuchar eventos de otros equipos
this.on('team:coordination', async (event) => {
    if (event.type === 'data_request') {
        // Procesar solicitud
    }
});
```

## Metrics and Monitoring

### Core Metrics
```javascript
const metrics = {
    // System metrics
    system: {
        uptime: 0,                    // Tiempo de actividad
        teamsActive: 0,              // Equipos activos
        totalWorkflows: 0,           // Total de workflows
        activeOptimizations: 0,      // Optimizaciones activas
    },
    
    // Performance metrics
    performance: {
        averageResponseTime: 0,      // Tiempo promedio de respuesta
        throughput: 0,               // Throughput por segundo
        errorRate: 0,                // Tasa de error
        availability: 0,             // Disponibilidad
    },
    
    // AI metrics
    ai: {
        modelAccuracy: 0,            // Precisión promedio de modelos
        predictionAccuracy: 0,       // Precisión de predicciones
        learningRate: 0,             // Tasa de aprendizaje
        knowledgeRetention: 0,       // Retención de conocimiento
    },
    
    // Business metrics
    business: {
        efficiency: 0,               // Eficiencia general
        costSavings: 0,              // Ahorro de costos
        timeSavings: 0,              // Ahorro de tiempo
        qualityImprovement: 0,       // Mejora de calidad
    }
};
```

### Custom Metrics
```javascript
// Agregar métrica personalizada
eoc.addCustomMetric('custom_metric', {
    value: 0,
    unit: 'points',
    description: 'Métrica personalizada',
    threshold: {
        warning: 80,
        critical: 90
    }
});
```

## Error Handling

### Error Types
1. **System Errors**: Errores del sistema general
2. **Team Errors**: Errores específicos de equipos
3. **AI Errors**: Errores en modelos de AI
4. **Workflow Errors**: Errores en workflows
5. **Configuration Errors**: Errores de configuración

### Error Recovery
```javascript
// Manejo automático de errores
try {
    await this.optimizeWorkflow();
} catch (error) {
    // El sistema会自动 调用 handleOptimizationError()
    await this.handleOptimizationError(workflowId, error);
}
```

### Custom Error Handler
```javascript
eoc.on('framework:error', (error) => {
    // Manejo personalizado de errores
    console.error('Framework Error:', error);
    
    // Enviar notificación
    if (error.severity === 'critical') {
        this.notifyAdministrators(error);
    }
});
```

## Best Practices

### 1. Team Development
```javascript
// Siempre implementar métodos requeridos
class NewTeam {
    async initialize() { /* requerido */ }
    async start() { /* requerido */ }
    async pause() { /* recomendado */ }
    async resume() { /* recomendado */ }
    async stop() { /* requerido */ }
}
```

### 2. Error Handling
```javascript
// Siempre usar try-catch en operaciones async
async processData(data) {
    try {
        const result = await this.aiModel.analyze(data);
        return result;
    } catch (error) {
        console.error('Error en procesamiento:', error);
        throw error; // Re-lanzar para manejo automático
    }
}
```

### 3. Metrics Collection
```javascript
// Siempre actualizar métricas
async performTask() {
    const startTime = Date.now();
    try {
        await this.executeTask();
        this.metrics.successCount++;
    } catch (error) {
        this.metrics.errorCount++;
        throw error;
    } finally {
        this.metrics.averageResponseTime = 
            (Date.now() - startTime) / this.metrics.totalOperations;
    }
}
```

### 4. Configuration
```javascript
// Usar configuración centralizada
const config = require('./config.json');
this.monitoringInterval = config.monitoringInterval || 30000;
```

## Examples

### Basic Usage
```javascript
const { EOCMain } = require('./index.js');

async function main() {
    const eoc = new EOCMain();
    
    try {
        await eoc.initialize();
        await eoc.start();
        
        // El framework se ejecuta automáticamente
        console.log('Framework running...');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
```

### Custom Team
```javascript
const BaseTeam = require('./BaseTeam');

class CustomTeam extends BaseTeam {
    constructor() {
        super();
        this.teamId = 'custom_team';
        this.specialty = 'custom_functionality';
    }
    
    async start() {
        // Lógica específica del equipo
        console.log('Custom team started');
    }
    
    async processCustomWorkflow(data) {
        // Lógica de workflow personalizada
        return { processed: true, data };
    }
}

module.exports = { CustomTeam };
```

### Event Listening
```javascript
eoc.on('optimization:completed', (result) => {
    console.log('Optimization completed:', result);
    
    if (result.improvement > 0.1) {
        console.log('Significant improvement achieved!');
    }
});

eoc.on('team:error', (error) => {
    console.warn('Team error detected:', error.teamId);
});
```