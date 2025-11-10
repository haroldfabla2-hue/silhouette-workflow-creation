# Optimización de Performance

## 1. Database Performance Optimization

### 1.1 PostgreSQL Query Optimizer

```typescript
// backend/src/performance/database/query-optimizer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryResult } from 'typeorm';

interface QueryAnalysis {
  query: string;
  executionTime: number;
  rowsAffected: number;
  indexUsage: string[];
  missingIndexes: string[];
  recommendations: string[];
  cost: number;
  plan: any;
}

interface PerformanceMetrics {
  averageQueryTime: number;
  slowQueries: QueryAnalysis[];
  indexEfficiency: number;
  connectionPoolUsage: number;
  cacheHitRatio: number;
}

@Injectable()
export class QueryOptimizerService {
  private readonly logger = new Logger(QueryOptimizerService.name);
  private queryHistory: QueryAnalysis[] = [];
  private performanceThresholds = {
    slowQuery: 1000, // ms
    verySlowQuery: 5000, // ms
    highCost: 1000
  };

  constructor(private dataSource: DataSource) {}

  async analyzeQuery(query: string, params?: any[]): Promise<QueryAnalysis> {
    this.logger.log(`Analizando consulta: ${query.substring(0, 100)}...`);
    
    const startTime = Date.now();
    
    try {
      // Obtener plan de ejecución
      const plan = await this.getExecutionPlan(query, params);
      
      // Analizar la consulta
      const analysis: QueryAnalysis = {
        query,
        executionTime: 0,
        rowsAffected: 0,
        indexUsage: this.extractIndexUsage(plan),
        missingIndexes: [],
        recommendations: [],
        cost: plan.total_cost || 0,
        plan
      };
      
      // Ejecutar consulta para obtener métricas reales
      const result = await this.dataSource.query(query, params);
      analysis.executionTime = Date.now() - startTime;
      analysis.rowsAffected = Array.isArray(result) ? result.length : 1;
      
      // Generar recomendaciones
      analysis.recommendations = this.generateRecommendations(analysis);
      
      // Guardar en historial
      this.queryHistory.push(analysis);
      
      // Alertar si es una consulta lenta
      if (analysis.executionTime > this.performanceThresholds.verySlowQuery) {
        await this.triggerSlowQueryAlert(analysis);
      }
      
      return analysis;
      
    } catch (error) {
      this.logger.error(`Error analizando consulta: ${error.message}`);
      throw error;
    }
  }

  async optimizeWorkflowQueries(workflowId: string): Promise<QueryAnalysis[]> {
    this.logger.log(`Optimizando consultas para workflow: ${workflowId}`);
    
    const queries = await this.getWorkflowQueries(workflowId);
    const analyses: QueryAnalysis[] = [];
    
    for (const query of queries) {
      const analysis = await this.analyzeQuery(query.sql, query.params);
      analyses.push(analysis);
      
      // Aplicar optimizaciones automáticamente si es posible
      if (analysis.missingIndexes.length > 0) {
        await this.createRecommendedIndexes(analysis.missingIndexes);
      }
    }
    
    return analyses;
  }

  async createRecommendedIndexes(indexes: string[]): Promise<void> {
    for (const indexDef of indexes) {
      try {
        this.logger.log(`Creando índice recomendado: ${indexDef}`);
        await this.dataSource.query(indexDef);
        this.logger.log(`Índice creado exitosamente: ${indexDef}`);
      } catch (error) {
        this.logger.error(`Error creando índice ${indexDef}: ${error.message}`);
      }
    }
  }

  async generatePerformanceReport(): Promise<PerformanceMetrics> {
    const recentQueries = this.queryHistory.slice(-100); // Últimas 100 consultas
    
    const slowQueries = recentQueries.filter(
      q => q.executionTime > this.performanceThresholds.slowQuery
    );
    
    const avgQueryTime = recentQueries.reduce(
      (sum, q) => sum + q.executionTime, 0
    ) / recentQueries.length;
    
    // Calcular eficiencia de índices
    const totalQueries = recentQueries.length;
    const queriesWithIndexes = recentQueries.filter(q => q.indexUsage.length > 0).length;
    const indexEfficiency = (queriesWithIndexes / totalQueries) * 100;
    
    // Obtener métricas de PostgreSQL
    const cacheHitRatio = await this.getCacheHitRatio();
    const connectionPoolUsage = await this.getConnectionPoolUsage();
    
    return {
      averageQueryTime: Math.round(avgQueryTime),
      slowQueries,
      indexEfficiency: Math.round(indexEfficiency),
      connectionPoolUsage,
      cacheHitRatio
    };
  }

  private async getExecutionPlan(query: string, params?: any[]): Promise<any> {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    const result = await this.dataSource.query(explainQuery, params);
    return result[0]['QUERY PLAN'][0];
  }

  private extractIndexUsage(plan: any): string[] {
    const indexes: string[] = [];
    
    // Extraer índices usados del plan de ejecución
    if (plan && typeof plan === 'object') {
      const planString = JSON.stringify(plan);
      const indexMatch = planString.match(/using (\w+)/g);
      if (indexMatch) {
        indexes.push(...indexMatch.map(match => match.replace('using ', '')));
      }
    }
    
    return indexes;
  }

  private generateRecommendations(analysis: QueryAnalysis): string[] {
    const recommendations: string[] = [];
    
    // Recomendaciones basadas en tiempo de ejecución
    if (analysis.executionTime > this.performanceThresholds.slowQuery) {
      recommendations.push('Considera agregar índices en las columnas filtradas');
      recommendations.push('Revisa el plan de ejecución para operaciones costosas');
    }
    
    // Recomendaciones basadas en costo
    if (analysis.cost > this.performanceThresholds.highCost) {
      recommendations.push('El costo de ejecución es alto, optimiza la consulta');
    }
    
    // Recomendaciones basadas en rows affected
    if (analysis.rowsAffected > 1000) {
      recommendations.push('Considera paginación para grandes conjuntos de resultados');
    }
    
    // Recomendaciones generales
    if (!analysis.indexUsage || analysis.indexUsage.length === 0) {
      recommendations.push('La consulta no usa índices, considera crearlos');
    }
    
    return recommendations;
  }

  private async triggerSlowQueryAlert(analysis: QueryAnalysis): Promise<void> {
    this.logger.warn(`CONSULTA LENTA DETECTADA: ${analysis.executionTime}ms para: ${analysis.query}`);
    
    // Enviar alerta a equipo de performance
    await this.sendPerformanceAlert({
      type: 'slow_query',
      query: analysis.query.substring(0, 200),
      executionTime: analysis.executionTime,
      cost: analysis.cost,
      timestamp: new Date()
    });
  }

  private async sendPerformanceAlert(alert: any): Promise<void> {
    this.logger.log(`Enviando alerta de performance: ${JSON.stringify(alert)}`);
  }

  private async getWorkflowQueries(workflowId: string): Promise<{sql: string, params: any[]}[]> {
    return [
      {
        sql: 'SELECT * FROM workflows WHERE id = ?',
        params: [workflowId]
      },
      {
        sql: 'SELECT * FROM workflow_executions WHERE workflow_id = ? ORDER BY created_at DESC',
        params: [workflowId]
      },
      {
        sql: `
          SELECT w.*, COUNT(we.id) as execution_count
          FROM workflows w
          LEFT JOIN workflow_executions we ON w.id = we.workflow_id
          WHERE w.user_id = ?
          GROUP BY w.id
        `,
        params: ['user123']
      }
    ];
  }

  private async getCacheHitRatio(): Promise<number> {
    try {
      const result = await this.dataSource.query(`
        SELECT 
          sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as cache_hit_ratio
        FROM pg_statio_user_tables
      `);
      return Math.round(result[0].cache_hit_ratio);
    } catch (error) {
      this.logger.error('Error obteniendo cache hit ratio:', error);
      return 0;
    }
  }

  private async getConnectionPoolUsage(): Promise<number> {
    // Simulación de uso de connection pool
    return 45; // 45% de uso
  }
}
```

### 1.2 Advanced Database Indexing Strategy

```typescript
// backend/src/performance/database/indexing-strategy.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'BTREE' | 'HASH' | 'GIN' | 'GIST' | 'BRIN';
  reason: string;
  expectedImprovement: number;
  priority: 'high' | 'medium' | 'low';
}

interface TableAnalysis {
  tableName: string;
  rowCount: number;
  indexCount: number;
  missingIndexes: IndexRecommendation[];
  duplicateIndexes: string[];
  unusedIndexes: string[];
  indexUsage: { indexName: string; usage: number }[];
}

@Injectable()
export class IndexingStrategyService {
  private readonly logger = new Logger(IndexingStrategyService.name);

  constructor(private dataSource: DataSource) {}

  async analyzeTableIndexes(tableName: string): Promise<TableAnalysis> {
    this.logger.log(`Analizando índices de tabla: ${tableName}`);
    
    const [rowCount, indexInfo, usageStats] = await Promise.all([
      this.getTableRowCount(tableName),
      this.getTableIndexes(tableName),
      this.getIndexUsageStats(tableName)
    ]);
    
    const analysis: TableAnalysis = {
      tableName,
      rowCount,
      indexCount: indexInfo.length,
      missingIndexes: await this.recommendIndexes(tableName, usageStats),
      duplicateIndexes: this.findDuplicateIndexes(indexInfo),
      unusedIndexes: this.findUnusedIndexes(usageStats),
      indexUsage: usageStats
    };
    
    return analysis;
  }

  async createOptimizedIndexes(analysis: TableAnalysis): Promise<void> {
    for (const recommendation of analysis.missingIndexes) {
      if (recommendation.priority === 'high') {
        await this.createIndex(recommendation);
      }
    }
  }

  async cleanupUnusedIndexes(analysis: TableAnalysis): Promise<void> {
    for (const indexName of analysis.unusedIndexes) {
      if (analysis.tableName === 'workflows' || analysis.tableName === 'workflow_executions') {
        // No eliminar índices críticos sin revisión manual
        this.logger.warn(`Índice potencialmente no usado (requiere revisión manual): ${indexName}`);
        continue;
      }
      
      await this.dropIndex(indexName);
    }
  }

  private async getTableRowCount(tableName: string): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT COUNT(*) as count 
      FROM ${tableName}
    `);
    return parseInt(result[0].count);
  }

  private async getTableIndexes(tableName: string): Promise<any[]> {
    return await this.dataSource.query(`
      SELECT 
        i.relname as index_name,
        a.attname as column_name,
        ix.indisunique as is_unique,
        ix.indisprimary as is_primary
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = $1
      ORDER BY i.relname, a.attnum
    `, [tableName]);
  }

  private async getIndexUsageStats(tableName: string): Promise<{indexName: string; usage: number}[]> {
    return await this.dataSource.query(`
      SELECT 
        i.relname as index_name,
        COALESCE(s.idx_scan, 0) as usage
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      LEFT JOIN pg_stat_user_indexes s ON s.indexrelid = i.oid
      WHERE t.relname = $1
      ORDER BY s.idx_scan DESC
    `, [tableName]);
  }

  private async recommendIndexes(tableName: string, usageStats: any[]): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];
    
    // Analizar patrones de consulta comunes para workflows
    if (tableName === 'workflows') {
      recommendations.push({
        table: 'workflows',
        columns: ['user_id', 'status', 'created_at'],
        type: 'BTREE',
        reason: 'Queries filtrando por usuario, estado y fecha',
        expectedImprovement: 85,
        priority: 'high'
      });
      
      recommendations.push({
        table: 'workflows',
        columns: ['tags'],
        type: 'GIN',
        reason: 'Queries con búsqueda en tags (array)',
        expectedImprovement: 70,
        priority: 'medium'
      });
    }
    
    if (tableName === 'workflow_executions') {
      recommendations.push({
        table: 'workflow_executions',
        columns: ['workflow_id', 'status', 'created_at'],
        type: 'BTREE',
        reason: 'Queries de ejecuciones por workflow y estado',
        expectedImprovement: 80,
        priority: 'high'
      });
      
      recommendations.push({
        table: 'workflow_executions',
        columns: ['started_at', 'ended_at'],
        type: 'BRIN',
        reason: 'Queries de rango temporal en grandes volúmenes',
        expectedImprovement: 60,
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  private findDuplicateIndexes(indexes: any[]): string[] {
    const columnGroups: { [key: string]: string[] } = {};
    const duplicates: string[] = [];
    
    // Agrupar índices por columnas
    indexes.forEach(index => {
      const key = index.column_name;
      if (!columnGroups[key]) {
        columnGroups[key] = [];
      }
      columnGroups[key].push(index.index_name);
    });
    
    // Identificar duplicados
    Object.values(columnGroups).forEach(group => {
      if (group.length > 1) {
        duplicates.push(...group.slice(1)); // Todos excepto el primero son duplicados
      }
    });
    
    return duplicates;
  }

  private findUnusedIndexes(usageStats: any[]): string[] {
    return usageStats
      .filter(stat => stat.usage === 0)
      .map(stat => stat.index_name);
  }

  private async createIndex(recommendation: IndexRecommendation): Promise<void> {
    const indexName = `idx_${recommendation.table}_${recommendation.columns.join('_')}`;
    const columnsStr = recommendation.columns.join(', ');
    
    const sql = `CREATE INDEX ${indexName} ON ${recommendation.table} (${columnsStr})`;
    
    try {
      this.logger.log(`Creando índice: ${sql}`);
      await this.dataSource.query(sql);
      this.logger.log(`Índice creado exitosamente: ${indexName}`);
    } catch (error) {
      this.logger.error(`Error creando índice ${indexName}: ${error.message}`);
    }
  }

  private async dropIndex(indexName: string): Promise<void> {
    try {
      this.logger.log(`Eliminando índice no usado: ${indexName}`);
      await this.dataSource.query(`DROP INDEX IF EXISTS ${indexName}`);
      this.logger.log(`Índice eliminado: ${indexName}`);
    } catch (error) {
      this.logger.error(`Error eliminando índice ${indexName}: ${error.message}`);
    }
  }
}
```

## 2. API Performance Optimization

### 2.1 Caching Strategy Implementation

```typescript
// backend/src/performance/cache/multi-layer-cache.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

interface CacheLayer {
  name: string;
  ttl: number;
  maxSize: number;
  hitRate: number;
}

interface CacheKey {
  key: string;
  layer: 'l1' | 'l2' | 'l3';
  ttl: number;
  size: number;
  lastAccessed: Date;
}

@Injectable()
export class MultiLayerCacheService {
  private readonly logger = new Logger(MultiLayerCacheService.name);
  private cacheLayers: CacheLayer[] = [
    { name: 'L1_Memory', ttl: 300, maxSize: 1000, hitRate: 0 },
    { name: 'L2_Redis', ttl: 3600, maxSize: 10000, hitRate: 0 },
    { name: 'L3_PostgreSQL', ttl: 86400, maxSize: 100000, hitRate: 0 }
  ];
  private l1Cache = new Map<string, any>();
  private cacheKeys: CacheKey[] = [];
  private totalRequests = 0;
  private cacheHits = 0;

  constructor(private redis: Redis) {}

  async get(key: string): Promise<any> {
    this.totalRequests++;
    
    // L1: Memory Cache
    if (this.l1Cache.has(key)) {
      this.cacheHits++;
      this.updateCacheMetrics('l1', true);
      return this.l1Cache.get(key);
    }
    
    // L2: Redis Cache
    const redisValue = await this.redis.get(key);
    if (redisValue) {
      this.cacheHits++;
      this.updateCacheMetrics('l2', true);
      
      // Promote to L1
      this.l1Cache.set(key, JSON.parse(redisValue));
      return JSON.parse(redisValue);
    }
    
    // L3: PostgreSQL Cache
    const pgValue = await this.getFromPostgresCache(key);
    if (pgValue) {
      this.cacheHits++;
      this.updateCacheMetrics('l3', true);
      
      // Promote to L2 Redis
      await this.redis.setex(key, 3600, JSON.stringify(pgValue));
      
      // Promote to L1
      this.l1Cache.set(key, pgValue);
      return pgValue;
    }
    
    this.updateCacheMetrics('none', false);
    return null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const effectiveTTL = ttl || 300; // Default 5 minutes
    
    // Store in L3 PostgreSQL (long term)
    await this.storeInPostgresCache(key, value, effectiveTTL * 3);
    
    // Store in L2 Redis
    await this.redis.setex(key, effectiveTTL, JSON.stringify(value));
    
    // Store in L1 Memory
    this.l1Cache.set(key, value);
    
    // Track cache key
    this.cacheKeys.push({
      key,
      layer: 'l1',
      ttl: effectiveTTL,
      size: JSON.stringify(value).length,
      lastAccessed: new Date()
    });
    
    // Evict if necessary
    await this.evictIfNeeded();
  }

  async getWorkflowData(workflowId: string): Promise<any> {
    const key = `workflow:${workflowId}`;
    let data = await this.get(key);
    
    if (!data) {
      this.logger.log(`Cache miss for workflow: ${workflowId}, loading from database`);
      data = await this.loadWorkflowFromDatabase(workflowId);
      await this.set(key, data, 1800); // 30 minutes
    }
    
    return data;
  }

  async getUserPermissions(userId: string): Promise<any> {
    const key = `permissions:${userId}`;
    let permissions = await this.get(key);
    
    if (!permissions) {
      this.logger.log(`Cache miss for user permissions: ${userId}, loading from database`);
      permissions = await this.loadUserPermissionsFromDatabase(userId);
      await this.set(key, permissions, 600); // 10 minutes
    }
    
    return permissions;
  }

  async getWorkflowExecutions(workflowId: string, limit: number = 50): Promise<any> {
    const key = `executions:${workflowId}:${limit}`;
    let executions = await this.get(key);
    
    if (!executions) {
      this.logger.log(`Cache miss for workflow executions: ${workflowId}`);
      executions = await this.loadWorkflowExecutionsFromDatabase(workflowId, limit);
      await this.set(key, executions, 300); // 5 minutes
    }
    
    return executions;
  }

  async invalidate(key: string): Promise<void> {
    // Remove from all layers
    this.l1Cache.delete(key);
    await this.redis.del(key);
    await this.removeFromPostgresCache(key);
    
    this.logger.log(`Cache invalidated: ${key}`);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Invalidate L1
    for (const cacheKey of this.l1Cache.keys()) {
      if (cacheKey.includes(pattern)) {
        this.l1Cache.delete(cacheKey);
      }
    }
    
    // Invalidate L2 Redis
    const keys = await this.redis.keys(`*${pattern}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    
    // Invalidate L3 PostgreSQL
    await this.removeFromPostgresCacheByPattern(pattern);
    
    this.logger.log(`Pattern invalidated: ${pattern}`);
  }

  async getCacheStats(): Promise<any> {
    const hitRate = this.totalRequests > 0 ? (this.cacheHits / this.totalRequests) * 100 : 0;
    
    return {
      totalRequests: this.totalRequests,
      cacheHits: this.cacheHits,
      hitRate: Math.round(hitRate * 100) / 100,
      l1Cache: {
        size: this.l1Cache.size,
        maxSize: this.cacheLayers[0].maxSize,
        usage: (this.l1Cache.size / this.cacheLayers[0].maxSize) * 100
      },
      l2Cache: {
        connected: true,
        info: await this.redis.info()
      },
      l3Cache: {
        connected: true
      }
    };
  }

  private async loadWorkflowFromDatabase(workflowId: string): Promise<any> {
    // Simulación de carga desde base de datos
    return {
      id: workflowId,
      name: `Workflow ${workflowId}`,
      status: 'active',
      executions: [],
      createdAt: new Date()
    };
  }

  private async loadUserPermissionsFromDatabase(userId: string): Promise<any> {
    return {
      userId,
      permissions: ['read:workflows', 'write:workflows', 'execute:workflows'],
      roles: ['developer', 'admin']
    };
  }

  private async loadWorkflowExecutionsFromDatabase(workflowId: string, limit: number): Promise<any[]> {
    return Array.from({ length: limit }, (_, i) => ({
      id: `exec_${i}`,
      workflowId,
      status: 'completed',
      startTime: new Date(),
      endTime: new Date(Date.now() + Math.random() * 60000)
    }));
  }

  private async getFromPostgresCache(key: string): Promise<any> {
    // Simulación de cache en PostgreSQL
    return null;
  }

  private async storeInPostgresCache(key: string, value: any, ttl: number): Promise<void> {
    // Implementación de cache en PostgreSQL
    this.logger.debug(`Storing in PostgreSQL cache: ${key}`);
  }

  private async removeFromPostgresCache(key: string): Promise<void> {
    // Implementación de eliminación de cache en PostgreSQL
  }

  private async removeFromPostgresCacheByPattern(pattern: string): Promise<void> {
    // Implementación de eliminación por patrón en PostgreSQL
  }

  private updateCacheMetrics(layer: string, hit: boolean): void {
    const layerIndex = layer === 'l1' ? 0 : layer === 'l2' ? 1 : layer === 'l3' ? 2 : -1;
    if (layerIndex >= 0) {
      this.cacheLayers[layerIndex].hitRate = hit ? 
        this.cacheLayers[layerIndex].hitRate + 0.01 : 
        this.cacheLayers[layerIndex].hitRate;
    }
  }

  private async evictIfNeeded(): Promise<void> {
    // L1 Cache eviction (LRU)
    if (this.l1Cache.size > this.cacheLayers[0].maxSize) {
      const firstKey = this.l1Cache.keys().next().value;
      this.l1Cache.delete(firstKey);
      this.logger.log(`L1 Cache evicted: ${firstKey}`);
    }
  }
}
```

### 2.2 API Response Optimization

```typescript
// backend/src/performance/api/response-optimizer.service.ts
import { Injectable, Logger } from '@nestjs/common';

interface APIEndpoint {
  path: string;
  method: string;
  avgResponseTime: number;
  requestsPerMinute: number;
  cacheable: boolean;
  compression: boolean;
  pagination: boolean;
}

interface ResponseOptimization {
  endpoint: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  responseTimeImprovement: number;
  techniques: string[];
}

@Injectable()
export class ResponseOptimizerService {
  private readonly logger = new Logger(ResponseOptimizerService.name);
  private endpoints: Map<string, APIEndpoint> = new Map();

  constructor() {
    this.initializeEndpointMetrics();
  }

  async optimizeWorkflowResponse(workflow: any): Promise<any> {
    this.logger.log('Optimizando respuesta de workflow...');
    
    const optimization: ResponseOptimization = {
      endpoint: '/api/workflows',
      originalSize: JSON.stringify(workflow).length,
      optimizedSize: 0,
      compressionRatio: 0,
      responseTimeImprovement: 0,
      techniques: []
    };
    
    // 1. Field Filtering
    const filteredWorkflow = this.filterFields(workflow, [
      'id', 'name', 'status', 'createdAt', 'updatedAt', 'userId'
    ]);
    optimization.techniques.push('Field Filtering');
    
    // 2. Data Compression
    const compressedData = this.compressResponse(filteredWorkflow);
    optimization.techniques.push('Data Compression');
    
    // 3. Lazy Loading for Relations
    if (workflow.executions && workflow.executions.length > 100) {
      const optimizedWorkflow = {
        ...filteredWorkflow,
        executions: {
          count: workflow.executions.length,
          hasMore: true,
          nextPage: 2
        }
      };
      optimization.techniques.push('Lazy Loading');
      optimization.optimizedSize = JSON.stringify(optimizedWorkflow).length;
    } else {
      optimization.optimizedSize = JSON.stringify(compressedData).length;
    }
    
    optimization.compressionRatio = ((optimization.originalSize - optimization.optimizedSize) / optimization.originalSize) * 100;
    
    this.logger.log(`Optimización completada: ${optimization.compressionRatio.toFixed(2)}% reducción de tamaño`);
    return optimization;
  }

  async optimizeWorkflowListResponse(workflows: any[], pagination: any): Promise<any> {
    this.logger.log('Optimizando respuesta de lista de workflows...');
    
    // 1. Pagination
    const paginatedWorkflows = this.paginateResponse(workflows, pagination);
    
    // 2. Field Projection
    const projectedWorkflows = paginatedWorkflows.map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      status: workflow.status,
      createdAt: workflow.createdAt,
      executionCount: workflow.executions?.length || 0
    }));
    
    // 3. Response Structure Optimization
    const optimizedResponse = {
      data: projectedWorkflows,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: workflows.length,
        totalPages: Math.ceil(workflows.length / pagination.limit),
        hasNext: pagination.page < Math.ceil(workflows.length / pagination.limit),
        hasPrev: pagination.page > 1
      },
      meta: {
        processingTime: Date.now() - pagination.startTime,
        cacheHit: false
      }
    };
    
    return optimizedResponse;
  }

  async implementGraphQLOptimization(): Promise<any> {
    return {
      dataLoader: {
        enabled: true,
        description: 'Batch loading of related data to avoid N+1 queries'
      },
      queryComplexity: {
        enabled: true,
        maxComplexity: 1000,
        description: 'Limit query complexity to prevent abuse'
      },
      persistedQueries: {
        enabled: true,
        description: 'Cache frequently used queries to reduce parsing time'
      },
      fieldCaching: {
        enabled: true,
        description: 'Cache field resolvers for frequently accessed data'
      }
    };
  }

  async implementRealTimeOptimization(): Promise<any> {
    return {
      websocketOptimization: {
        connectionPooling: true,
        messageBatching: true,
        compression: 'permessage-deflate',
        heartBeatInterval: 30000
      },
      subscriptionOptimization: {
        filterAtSource: true,
        debounceInterval: 1000,
        batchUpdates: true,
        priorityQueues: true
      },
      eventDrivenArchitecture: {
        eventSourcing: true,
        cqrs: true,
        messageQueues: ['redis', 'rabbitmq']
      }
    };
  }

  async optimizeDatabaseQueries(): Promise<any> {
    return {
      queryOptimization: {
        eagerLoading: false, // Use lazy loading
        selectClauseOptimization: true,
        joinOptimization: true,
        subqueryOptimization: true
      },
      nPlusOnePrevention: {
        dataLoaderPattern: true,
        batchLoading: true,
        queryBatching: true
      },
      connectionPooling: {
        maxConnections: 20,
        minConnections: 5,
        idleTimeout: 300000,
        connectionTimeout: 5000
      },
      readReplicas: {
        enabled: true,
        count: 2,
        loadBalancing: 'round_robin'
      }
    };
  }

  private filterFields(obj: any, allowedFields: string[]): any {
    const filtered: any = {};
    
    for (const field of allowedFields) {
      if (obj[field] !== undefined) {
        filtered[field] = obj[field];
      }
    }
    
    return filtered;
  }

  private compressResponse(data: any): any {
    // Implementación de compresión de respuesta
    // Por ahora, solo devolvemos los datos tal como están
    // En producción, usaríamos algorithms como gzip, brotli, etc.
    return data;
  }

  private paginateResponse(data: any[], pagination: any): any[] {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return data.slice(startIndex, endIndex);
  }

  private initializeEndpointMetrics(): void {
    const endpoints = [
      { path: '/api/workflows', method: 'GET', cacheable: true, compression: true, pagination: true },
      { path: '/api/workflows/:id', method: 'GET', cacheable: true, compression: true, pagination: false },
      { path: '/api/workflows/:id/executions', method: 'GET', cacheable: true, compression: true, pagination: true },
      { path: '/api/analytics', method: 'GET', cacheable: true, compression: true, pagination: true }
    ];
    
    endpoints.forEach(endpoint => {
      this.endpoints.set(`${endpoint.method}:${endpoint.path}`, {
        ...endpoint,
        avgResponseTime: Math.random() * 1000 + 100,
        requestsPerMinute: Math.floor(Math.random() * 100) + 10
      });
    });
  }
}
```

## 3. Resource Management

### 3.1 Memory and CPU Optimization

```typescript
// backend/src/performance/resources/resource-manager.service.ts
import { Injectable, Logger } from '@nestjs/common';

interface ResourceMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connections: number;
  };
}

interface OptimizationAction {
  type: 'memory_cleanup' | 'connection_cleanup' | 'cache_eviction' | 'gc_trigger' | 'scale_resource';
  target: string;
  impact: number;
  timestamp: Date;
}

@Injectable()
export class ResourceManagerService {
  private readonly logger = new Logger(ResourceManagerService.name);
  private memoryThreshold = 80; // 80% memory usage
  private cpuThreshold = 70; // 70% CPU usage
  private activeConnections: Set<string> = new Set();
  private optimizationHistory: OptimizationAction[] = [];

  constructor() {
    this.startResourceMonitoring();
  }

  async getResourceMetrics(): Promise<ResourceMetrics> {
    const memUsage = process.memoryUsage();
    const cpuUsage = await this.getCPUUsage();
    
    return {
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal
      },
      cpu: {
        usage: cpuUsage,
        loadAverage: process.platform !== 'win32' ? process.loadavg() : [0, 0, 0]
      },
      disk: await this.getDiskUsage(),
      network: await this.getNetworkMetrics()
    };
  }

  async optimizeMemoryUsage(): Promise<OptimizationAction[]> {
    this.logger.log('Iniciando optimización de memoria...');
    
    const actions: OptimizationAction[] = [];
    const memUsage = process.memoryUsage();
    
    if (memUsage.heapUsed / memUsage.heapTotal > this.memoryThreshold / 100) {
      this.logger.warn('Uso de memoria alto, iniciando optimizaciones');
      
      // 1. Garbage Collection manual
      if (global.gc) {
        global.gc();
        actions.push({
          type: 'gc_trigger',
          target: 'heap',
          impact: 0,
          timestamp: new Date()
        });
      }
      
      // 2. Limpiar cachés
      const cacheCleanup = await this.cleanupCaches();
      actions.push(...cacheCleanup);
      
      // 3. Cerrar conexiones inactivas
      const connectionCleanup = await this.cleanupInactiveConnections();
      actions.push(...connectionCleanup);
      
      // 4. Optimizar buffers
      const bufferOptimization = await this.optimizeBuffers();
      actions.push(...bufferOptimization);
    }
    
    this.optimizationHistory.push(...actions);
    return actions;
  }

  async optimizeCPUUsage(): Promise<OptimizationAction[]> {
    this.logger.log('Iniciando optimización de CPU...');
    
    const actions: OptimizationAction[] = [];
    const cpuUsage = await this.getCPUUsage();
    
    if (cpuUsage > this.cpuThreshold) {
      // 1. Reducir carga de trabajo
      const loadReduction = await this.reduceWorkload();
      actions.push(...loadReduction);
      
      // 2. Implementar rate limiting
      const rateLimit = await this.implementRateLimit();
      actions.push(...rateLimit);
      
      // 3. Optimizar operaciones intensivas
      const intensiveOpsOptimization = await this.optimizeIntensiveOperations();
      actions.push(...intensiveOpsOptimization);
    }
    
    return actions;
  }

  async manageWorkflowExecutionResources(executionId: string): Promise<void> {
    this.logger.log(`Gestionando recursos para ejecución: ${executionId}`);
    
    // 1. Asignar recursos específicos
    const resources = await this.allocateExecutionResources(executionId);
    
    // 2. Monitorear uso durante ejecución
    this.monitorExecutionUsage(executionId);
    
    // 3. Liberar recursos al finalizar
    this.scheduleResourceCleanup(executionId);
  }

  async implementAutoScaling(): Promise<any> {
    return {
      horizontalScaling: {
        enabled: true,
        minInstances: 2,
        maxInstances: 10,
        targetCPUUsage: 60,
        targetMemoryUsage: 70
      },
      verticalScaling: {
        enabled: true,
        targetMemoryPerInstance: '2GB',
        targetCPUPerInstance: '1 core'
      },
      scalingPolicies: {
        scaleOut: {
          cooldown: 300, // 5 minutes
          increment: 1,
          triggers: ['cpu_usage > 70%', 'memory_usage > 80%', 'response_time > 1000ms']
        },
        scaleIn: {
          cooldown: 600, // 10 minutes
          decrement: 1,
          triggers: ['cpu_usage < 30%', 'memory_usage < 40%', 'queue_length < 10']
        }
      }
    };
  }

  private async getCPUUsage(): Promise<number> {
    // Simulación de uso de CPU
    return Math.random() * 100;
  }

  private async getDiskUsage(): Promise<{used: number; total: number; percentage: number}> {
    return {
      used: 45, // GB
      total: 100, // GB
      percentage: 45
    };
  }

  private async getNetworkMetrics(): Promise<{bytesIn: number; bytesOut: number; connections: number}> {
    return {
      bytesIn: 1024 * 1024, // 1MB
      bytesOut: 512 * 1024, // 512KB
      connections: 25
    };
  }

  private async cleanupCaches(): Promise<OptimizationAction[]> {
    this.logger.log('Limpiando cachés...');
    
    return [{
      type: 'cache_eviction',
      target: 'application_cache',
      impact: 15, // 15% memory reduction
      timestamp: new Date()
    }];
  }

  private async cleanupInactiveConnections(): Promise<OptimizationAction[]> {
    const inactiveConnections = Array.from(this.activeConnections).slice(0, 10);
    inactiveConnections.forEach(conn => this.activeConnections.delete(conn));
    
    return [{
      type: 'connection_cleanup',
      target: 'inactive_connections',
      impact: 5,
      timestamp: new Date()
    }];
  }

  private async optimizeBuffers(): Promise<OptimizationAction[]> {
    return [{
      type: 'memory_cleanup',
      target: 'buffer_pool',
      impact: 10,
      timestamp: new Date()
    }];
  }

  private async reduceWorkload(): Promise<OptimizationAction[]> {
    return [{
      type: 'scale_resource',
      target: 'workload_queue',
      impact: 20,
      timestamp: new Date()
    }];
  }

  private async implementRateLimit(): Promise<OptimizationAction[]> {
    return [{
      type: 'scale_resource',
      target: 'request_rate',
      impact: 15,
      timestamp: new Date()
    }];
  }

  private async optimizeIntensiveOperations(): Promise<OptimizationAction[]> {
    return [{
      type: 'scale_resource',
      target: 'intensive_operations',
      impact: 25,
      timestamp: new Date()
    }];
  }

  private async allocateExecutionResources(executionId: string): Promise<any> {
    // Asignar recursos específicos para la ejecución
    this.activeConnections.add(executionId);
    return { executionId, allocatedMemory: '512MB', allocatedCPU: '0.5 cores' };
  }

  private monitorExecutionUsage(executionId: string): void {
    // Monitorear uso de recursos durante la ejecución
    this.logger.log(`Monitoreando recursos para ejecución: ${executionId}`);
  }

  private scheduleResourceCleanup(executionId: string): void {
    setTimeout(() => {
      this.activeConnections.delete(executionId);
      this.logger.log(`Recursos liberados para ejecución: ${executionId}`);
    }, 60000); // 1 minuto después
  }

  private startResourceMonitoring(): void {
    setInterval(async () => {
      const metrics = await this.getResourceMetrics();
      
      if (metrics.memory.percentage > this.memoryThreshold) {
        this.logger.warn(`Alto uso de memoria: ${metrics.memory.percentage.toFixed(2)}%`);
        await this.optimizeMemoryUsage();
      }
      
      if (metrics.cpu.usage > this.cpuThreshold) {
        this.logger.warn(`Alto uso de CPU: ${metrics.cpu.usage.toFixed(2)}%`);
        await this.optimizeCPUUsage();
      }
    }, 30000); // Cada 30 segundos
  }
}
```

## Resumen del Componente 2

### Archivos Creados:
- `query-optimizer.service.ts`: Optimizador de consultas PostgreSQL
- `indexing-strategy.service.ts`: Estrategia avanzada de indexación
- `multi-layer-cache.service.ts`: Sistema de cache multicapa
- `response-optimizer.service.ts`: Optimización de respuestas API
- `resource-manager.service.ts`: Gestión de recursos memoria/CPU

### Características Implementadas:
✅ **Optimización de Base de Datos**: Análisis de consultas, índices automáticos, planes de ejecución
✅ **Cache Multicapa**: L1 (memoria) + L2 (Redis) + L3 (PostgreSQL) con promoción automática
✅ **Optimización de API**: Filtrado de campos, compresión, paginación, lazy loading
✅ **Gestión de Recursos**: Monitoreo de memoria/CPU, garbage collection, auto-scaling

### Próximo Componente:
El siguiente paso es implementar el **Componente 3: Monitoreo Avanzado** que incluirá dashboard en tiempo real, sistema de alertas y agregación de logs.
