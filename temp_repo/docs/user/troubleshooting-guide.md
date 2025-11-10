# Guía de Troubleshooting - Silhouette Workflow Platform

## 🔧 Introducción al Troubleshooting

Esta guía te ayudará a diagnosticar y resolver problemas comunes en Silhouette Workflow Platform. Incluye herramientas de diagnóstico, soluciones paso a paso y mejores prácticas para mantener la plataforma funcionando de manera óptima.

### Herramientas de Diagnóstico

```bash
# Scripts de diagnóstico disponibles
/workspace/silhouette-workflow-creation/scripts/diagnostics/
├── system-health-check.sh      # Verificar estado general del sistema
├── database-diagnostics.sh     # Diagnóstico de base de datos
├── network-connectivity.sh     # Verificar conectividad
├── performance-analyzer.sh     # Análisis de performance
├── log-analyzer.sh            # Análisis de logs
└── workflow-debugger.sh       # Debug de workflows
```

### Flujo de Troubleshooting

```
1️⃣ IDENTIFICACIÓN DEL PROBLEMA
   ├── Recopilar síntomas
   ├── Identificar componente afectado
   └── Verificar scope del problema

2️⃣ DIAGNÓSTICO RÁPIDO
   ├── Verificar health checks
   ├── Revisar logs recientes
   └── Comprobar métricas básicas

3️⃣ ANÁLISIS PROFUNDO
   ├── Revisar logs detallados
   ├── Analizar métricas de performance
   └── Verificar configuración

4️⃣ IMPLEMENTACIÓN DE SOLUCIÓN
   ├── Aplicar fix temporal si es necesario
   ├── Implementar solución permanente
   └── Verificar que el problema se resolvió

5️⃣ PREVENCIÓN
   ├── Documentar la solución
   ├── Actualizar documentación
   └── Configurar alertas preventivas
```

---

## 🚨 Problemas Críticos de Servicios

### 1. Servicios no levantan (Docker)

#### Síntomas
- `docker-compose up` falla o se detiene
- Servicios en estado "Exited" o "Restarting"
- Puertos ya en uso

#### Diagnóstico

```bash
# Verificar estado de todos los servicios
docker-compose ps

# Revisar logs de servicios específicos
docker-compose logs backend
docker-compose logs postgres
docker-compose logs redis

# Verificar uso de puertos
netstat -tulpn | grep :3000
netstat -tulpn | grep :5432
netstat -tulpn | grep :6379

# Verificar recursos del sistema
docker system df
free -h
df -h
```

#### Solución Paso a Paso

**Paso 1: Liberar puertos ocupados**
```bash
# Encontrar y terminar procesos que usan los puertos
sudo lsof -i :3000
sudo kill -9 <PID>

sudo lsof -i :5432
sudo kill -9 <PID>

sudo lsof -i :6379
sudo kill -9 <PID>
```

**Paso 2: Limpiar contenedores y volúmenes**
```bash
# Parar todos los servicios
docker-compose down

# Limpiar contenedores, redes y volúmenes no utilizados
docker system prune -f
docker volume prune -f

# Opcional: Limpiar todo (CUIDADO: elimina todas las imágenes)
# docker system prune -a
```

**Paso 3: Reconstruir servicios**
```bash
# Reconstruir imágenes desde cero
docker-compose build --no-cache

# Levantar servicios con logs en tiempo real
docker-compose up -d --force-recreate
```

**Paso 4: Verificar que los servicios están corriendo**
```bash
# Verificar estado
docker-compose ps

# Health check individual
curl -f http://localhost:3000/api/system/health
curl -f http://localhost:5432  # PostgreSQL
redis-cli ping  # Redis
```

#### Prevención
```bash
# Script para verificar puertos antes de levantar
#!/bin/bash
echo "Verificando puertos..."

ports=(3000 5432 6379 3001 9090)
for port in "${ports[@]}"; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ Puerto $port está en uso"
    lsof -i :$port
  else
    echo "✅ Puerto $port disponible"
  fi
done
```

### 2. Error de Conexión a Base de Datos

#### Síntomas
- "Connection refused" errors
- "Authentication failed" errors
- Aplicación no puede conectar a PostgreSQL

#### Diagnóstico

```bash
# Verificar estado de PostgreSQL
docker-compose exec postgres pg_isready -U haas

# Probar conexión manual
docker-compose exec postgres psql -U haas -d haasdb -c "SELECT version();"

# Revisar logs de PostgreSQL
docker-compose logs postgres | tail -20

# Verificar variables de entorno
docker-compose exec backend env | grep POSTGRES
```

#### Solución Paso a Paso

**Paso 1: Verificar configuración**
```bash
# Revisar variables de entorno
cat .env | grep POSTGRES

# Verificar que coinciden con docker-compose.yml
grep POSTGRES docker-compose.yml
```

**Paso 2: Reiniciar PostgreSQL**
```bash
# Reiniciar solo PostgreSQL
docker-compose restart postgres

# Esperar a que esté listo
docker-compose exec postgres pg_isready -U haas
```

**Paso 3: Recrear base de datos si es necesario**
```bash
# Detener servicios que usan la DB
docker-compose stop backend

# Recrear base de datos
docker-compose exec postgres psql -U haas -c "DROP DATABASE IF EXISTS haasdb;"
docker-compose exec postgres psql -U haas -c "CREATE DATABASE haasdb;"

# Volver a levantar backend
docker-compose start backend
```

**Paso 4: Ejecutar migraciones**
```bash
# Ejecutar migraciones de esquema
docker-compose exec backend npm run db:migrate

# Verificar que las tablas se crearon
docker-compose exec postgres psql -U haas -d haasdb -c "\dt"
```

#### Configuración de Conexión Robusta
```typescript
// backend/src/config/database.ts
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'haas',
  password: process.env.POSTGRES_PASSWORD || 'haaspass',
  database: process.env.POSTGRES_DB || 'haasdb',
  synchronize: false, // Usar migraciones en producción
  logging: process.env.NODE_ENV === 'development',
  entities: ['src/types/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : false,
});

// Retry connection logic
export const connectWithRetry = async (maxRetries = 10) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await AppDataSource.initialize();
      console.log('✅ Database connected successfully');
      return;
    } catch (error) {
      console.log(`❌ Database connection attempt ${i + 1} failed:`, error.message);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};
```

### 3. Frontend no carga

#### Síntomas
- Página en blanco en el navegador
- Error 502 Bad Gateway
- Errores de JavaScript en consola

#### Diagnóstico

```bash
# Verificar logs del frontend
docker-compose logs frontend

# Verificar conectividad entre servicios
curl -I http://localhost:3000
curl -I http://localhost:3000/api/system/health

# Verificar que el backend está funcionando
curl -f http://localhost:3000/api/system/health
```

#### Solución Paso a Paso

**Paso 1: Verificar que el backend está funcionando**
```bash
# Si el backend no funciona, arreglarlo primero
curl -f http://localhost:3000/api/system/health
# Si falla: revisar logs del backend y corregir errores
```

**Paso 2: Reiniciar frontend**
```bash
# Reiniciar solo el servicio de frontend
docker-compose restart frontend

# Verificar logs en tiempo real
docker-compose logs -f frontend
```

**Paso 3: Verificar configuración de CORS**
```typescript
// backend/src/middleware/cors.ts
import cors from 'cors';

export const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://silhouette.tuempresa.com',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

export const corsMiddleware = cors(corsOptions);
```

**Paso 4: Limpiar caché del navegador**
```javascript
// En la consola del navegador (F12)
localStorage.clear();
sessionStorage.clear();
indexedDB.deleteDatabase('silhouette-cache');

// O manualmente: F12 > Application > Storage > Clear Storage
```

#### Configuración de Proxy (Si usa nginx)
```nginx
# /etc/nginx/sites-available/silhouette-frontend
server {
    listen 3000;
    server_name localhost;

    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 👤 Problemas de Autenticación

### 1. "Token expired" frecuente

#### Síntomas
- Users receive "Token expired" errors frequently
- Sessions cut unexpectedly
- Workflows interrupt during execution

#### Diagnóstico

```bash
# Verificar configuración JWT
grep -i jwt .env

# Revisar logs de autenticación
docker-compose logs backend | grep -i "jwt\|auth\|token"

# Verificar sincronización de tiempo
date
docker-compose exec backend date

# Verificar configuración de TTL
grep -i expires .env
```

#### Solución

**Paso 1: Ajustar configuración JWT**
```bash
# Aumentar TTL de tokens
echo "JWT_EXPIRES_IN=12h" >> .env
echo "JWT_REFRESH_EXPIRES_IN=7d" >> .env

# O para desarrollo
echo "JWT_EXPIRES_IN=24h" >> .env
echo "JWT_REFRESH_EXPIRES_IN=30d" >> .env
```

**Paso 2: Verificar sincronización de tiempo**
```bash
# Sincronizar tiempo del sistema
sudo ntpdate -s time.nist.gov
# O
sudo timedatectl set-ntp true

# Verificar que Docker containers tengan la hora correcta
docker-compose exec backend date
```

**Paso 3: Implementar token refresh automático**
```typescript
// frontend/src/hooks/useAuth.ts
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));

  useEffect(() => {
    if (token) {
      // Configurar refresh automático 5 minutos antes de expirar
      const refreshTime = (getTokenExpirationTime(token) - 300) * 1000;
      const timeoutId = setTimeout(refreshAccessToken, refreshTime);

      return () => clearTimeout(timeoutId);
    }
  }, [token]);

  const getTokenExpirationTime = (token: string): number => {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp;
  };

  const refreshAccessToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.data.accessToken);
        setRefreshToken(data.data.refreshToken);
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
      } else {
        // Si refresh falla, logout
        logout();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  const logout = () => {
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  return { token, refreshToken, logout, refreshAccessToken };
};
```

**Paso 4: Reiniciar servicios**
```bash
docker-compose restart backend frontend
```

### 2. "Invalid credentials" o "Authentication failed"

#### Síntomas
- Users cannot log in despite correct credentials
- "Invalid email or password" errors
- Database connection errors during login

#### Diagnóstico

```bash
# Verificar que la base de datos está funcionando
docker-compose exec postgres psql -U haas -d haasdb -c "SELECT count(*) FROM users;"

# Revisar logs de autenticación
docker-compose logs backend | grep -i "login\|auth\|password"

# Verificar que el servicio de Redis funciona (para sesiones)
docker-compose exec redis redis-cli ping
```

#### Solución

**Paso 1: Verificar configuración de bcrypt**
```bash
# Verificar configuración
grep -i bcrypt .env
grep -i salt .env

# Verificar que los usuarios tienen passwords hasheados
docker-compose exec postgres psql -U haas -d haasdb -c \
"SELECT id, email, LENGTH(password_hash) as hash_length FROM users LIMIT 5;"
```

**Paso 2: Verificar configuración de base de datos**
```bash
# Probar conexión manual
docker-compose exec backend node -e "
const { Client } = require('pg');
const client = new Client({
  host: 'postgres',
  port: 5432,
  user: 'haas',
  password: 'haaspass',
  database: 'haasdb'
});
client.connect()
  .then(() => console.log('✅ DB connected'))
  .catch(err => console.error('❌ DB connection error:', err))
  .finally(() => client.end());
"
```

**Paso 3: Verificar configuración de Redis**
```bash
# Test Redis connection
docker-compose exec redis redis-cli set test "connection" EX 10
docker-compose exec redis redis-cli get test
docker-compose exec redis redis-cli del test
```

**Paso 4: Crear usuario de prueba**
```sql
-- Crear usuario de prueba directamente en DB
INSERT INTO users (id, email, password_hash, name, org_id, role, is_active, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'test@example.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY9WU2rWNVj5C76', -- password: testpass
  'Test User',
  (SELECT id FROM organizations LIMIT 1),
  'admin',
  true,
  NOW(),
  NOW()
);
```

### 3. "Session expired" o problemas de sesión

#### Síntomas
- Users are logged out unexpectedly
- "Session not found" errors
- Workflows lose context

#### Diagnóstico

```bash
# Verificar configuración de Redis (para sesiones)
docker-compose exec redis redis-cli info | grep used_memory

# Revisar logs de sesión
docker-compose logs backend | grep -i "session\|cookie"

# Verificar configuración de cookies
grep -i cookie .env
```

#### Solución

**Paso 1: Verificar configuración de Redis**
```bash
# Limpiar sesiones expiradas
docker-compose exec redis redis-cli --scan --pattern "session:*" | xargs -r docker-compose exec redis redis-cli del

# Verificar uso de memoria
docker-compose exec redis redis-cli info memory
```

**Paso 2: Ajustar configuración de sesión**
```typescript
// backend/src/config/session.ts
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retry_unfulfilled_commands: true,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis client connected');
});

export const sessionConfig = {
  store: new RedisStore({ 
    client: redisClient,
    prefix: 'session:',
  }),
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  name: 'silhouette.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true en producción
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 horas
    sameSite: 'lax',
  },
};
```

**Paso 3: Implementar cleanup de sesiones**
```bash
# Script para limpiar sesiones expiradas
#!/bin/bash
# cleanup-sessions.sh

echo "Limpiando sesiones expiradas..."

# Limpiar sesiones de Redis que han expirado
sessions_cleaned=$(docker-compose exec redis redis-cli EVAL "
local keys = redis.call('KEYS', 'session:*')
local count = 0
for i=1,#keys do
  local ttl = redis.call('TTL', keys[i])
  if ttl == -1 then
    redis.call('DEL', keys[i])
    count = count + 1
  end
end
return count
" 0)

echo "Sesiones limpiadas: $sessions_cleaned"

# Verificar memoria usada
memory_info=$(docker-compose exec redis redis-cli info memory | grep used_memory_human)
echo "Memoria usada: $memory_info"
```

---

## ⚡ Problemas de Performance

### 1. API responde lentamente

#### Síntomas
- Timeouts en requests
- UI carga lentamente
- Workflows tardan en iniciarse

#### Diagnóstico

```bash
# Verificar métricas de performance
curl http://localhost:3000/api/system/metrics

# Revisar uso de recursos
docker stats --no-stream

# Verificar consultas lentas en PostgreSQL
docker-compose exec postgres psql -U haas -d haasdb -c "
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
"

# Revisar caché Redis
docker-compose exec redis redis-cli info stats | grep keyspace
```

#### Solución

**Paso 1: Identificar consultas problemáticas**
```sql
-- Habilitar pg_stat_statements si no está habilitado
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Ver consultas más lentas
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_time > 100 -- consultas que tardan más de 100ms
ORDER BY mean_time DESC 
LIMIT 10;
```

**Paso 2: Optimizar consultas**
```sql
-- Crear índices para consultas frecuentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_org_id_status 
ON workflows(org_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_workflow_id_created_at 
ON workflow_executions(workflow_id, created_at DESC);

-- Optimizar consultas de análisis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_org_id_created_at 
ON audit_logs(org_id, created_at DESC);
```

**Paso 3: Optimizar configuración de PostgreSQL**
```sql
-- Configuración de performance
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';

-- Aplicar cambios
SELECT pg_reload_conf();
```

**Paso 4: Optimizar conexión pooling**
```typescript
// backend/src/config/database.ts (continuación)
const poolConfig = {
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'haas',
  password: process.env.POSTGRES_PASSWORD || 'haaspass',
  database: process.env.POSTGRES_DB || 'haasdb',
  max: 20, // máximo de conexiones en el pool
  min: 5,  // mínimo de conexiones en el pool
  acquire: 30000, // timeout para acquire
  idle: 10000,    // tiempo antes de cerrar conexión idle
  evict: 5000,    // interval para limpiar conexiones idle
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  createRetryIntervalMillis: 200,
  reapIntervalMillis: 1000,
  idleTimeoutMillis: 30000,
  connectTimeoutMillis: 10000,
};

export const pgPool = new Pool(poolConfig);

// Verificar salud del pool
setInterval(async () => {
  try {
    const client = await pgPool.connect();
    await client.query('SELECT 1');
    client.release();
  } catch (error) {
    console.error('Database pool health check failed:', error);
  }
}, 30000); // cada 30 segundos
```

**Paso 5: Implementar caching estratégico**
```typescript
// backend/src/services/cache.service.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  static async set<T>(key: string, value: T, ttl: number = 3600): Promise<boolean> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  static async del(key: string): Promise<boolean> {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  static async flushPattern(pattern: string): Promise<boolean> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Cache flush pattern error:', error);
      return false;
    }
  }
}

// Usar en servicios
export const cacheWorkflow = (workflowId: string, ttl: number = 300) => {
  return CacheService.set(`workflow:${workflowId}`, ttl);
};
```

### 2. Memory leaks

#### Síntomas
- Aumenta el uso de memoria progresivamente
- Application se vuelve más lenta con el tiempo
- Eventual Out of Memory errors

#### Diagnóstico

```bash
# Monitorear uso de memoria
docker stats --no-stream

# Analizar heap de Node.js
docker-compose exec backend node --inspect-brk=0.0.0.0:9229 --max-old-space-size=2048 src/server.ts

# Usar nodememwatch o similar en producción
# Verificar event listeners no liberados
docker-compose exec backend node -e "
const util = require('util');
const inspector = require('inspector');
console.log(inspector.url());
"
```

#### Solución

**Paso 1: Configurar límites de memoria**
```dockerfile
# Dockerfile (backend)
FROM node:18-alpine

# Configurar límites de memoria
ENV NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size"
ENV UV_THREADPOOL_SIZE=4

# Habilitar garbage collection agresivo
ENV NODE_ENV=production
```

**Paso 2: Implementar proper cleanup**
```typescript
// backend/src/services/workflow.service.ts
export class WorkflowService {
  private static readonly MAX_CONCURRENT_WORKFLOWS = 50;
  private static activeWorkflows = new Set<string>();
  private static workflowQueue: Array<() => Promise<any>> = [];

  static async executeWorkflow(workflowId: string, data: any): Promise<any> {
    // Verificar límites de concurrencia
    if (this.activeWorkflows.size >= this.MAX_CONCURRENT_WORKFLOWS) {
      return new Promise((resolve, reject) => {
        this.workflowQueue.push(async () => {
          try {
            const result = await this.executeWorkflowInternal(workflowId, data);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    return this.executeWorkflowInternal(workflowId, data);
  }

  private static async executeWorkflowInternal(workflowId: string, data: any): Promise<any> {
    this.activeWorkflows.add(workflowId);
    
    try {
      const result = await this.runWorkflow(workflowId, data);
      return result;
    } finally {
      this.activeWorkflows.delete(workflowId);
      this.processQueue();
    }
  }

  private static async processQueue(): Promise<void> {
    if (this.workflowQueue.length > 0 && this.activeWorkflows.size < this.MAX_CONCURRENT_WORKFLOWS) {
      const job = this.workflowQueue.shift();
      if (job) {
        job();
      }
    }
  }

  // Cleanup en shutdown
  static cleanup(): void {
    this.workflowQueue = [];
    this.activeWorkflows.clear();
  }
}

// En server.ts
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, cleaning up...');
  WorkflowService.cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, cleaning up...');
  WorkflowService.cleanup();
  process.exit(0);
});
```

**Paso 3: Implementar memory monitoring**
```typescript
// backend/src/utils/memory-monitor.ts
export class MemoryMonitor {
  private static intervalId: NodeJS.Timeout;

  static start(): void {
    this.intervalId = setInterval(() => {
      const usage = process.memoryUsage();
      const memoryUsageMB = usage.rss / 1024 / 1024;
      
      console.log('Memory usage:', {
        rss: `${memoryUsageMB.toFixed(2)} MB`,
        heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
      });

      // Alertar si el uso de memoria es muy alto
      if (memoryUsageMB > 800) { // 80% de 1GB
        console.warn('⚠️ High memory usage detected:', memoryUsageMB);
        // Forzar garbage collection si está disponible
        if (global.gc) {
          global.gc();
          console.log('🗑️ Garbage collection triggered');
        }
      }
    }, 30000); // cada 30 segundos
  }

  static stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

// Iniciar monitoring en server.ts
if (process.env.NODE_ENV === 'production') {
  MemoryMonitor.start();
}
```

**Paso 4: Configurar restart automático**
```yaml
# docker-compose.yml (agregar restart policy)
services:
  backend:
    restart: unless-stopped
    mem_limit: 1g
    mem_reservation: 512m
    cpu_limit: "1.0"
    cpu_reservation: "0.5"
```

### 3. Database connection pool exhaustion

#### Síntomas
- "FATAL: remaining connection slots are reserved" errors
- Applications can't connect to database
- Workflows fail to execute

#### Diagnóstico

```sql
-- Verificar conexiones activas
SELECT count(*) as active_connections, 
       state,
       usename,
       application_name
FROM pg_stat_activity 
WHERE state IS NOT NULL
GROUP BY state, usename, application_name
ORDER BY active_connections DESC;

-- Verificar configuración de conexiones
SHOW max_connections;
SHOW shared_buffers;
SHOW work_mem;
```

#### Solución

**Paso 1: Aumentar max connections temporalmente**
```sql
-- Ver connections actuales
SELECT setting FROM pg_settings WHERE name = 'max_connections';

-- Aumentar max connections (temporal)
ALTER SYSTEM SET max_connections = 300;
SELECT pg_reload_conf();
```

**Paso 2: Optimizar connection pool en aplicación**
```typescript
// backend/src/config/database.ts (configuración optimizada)
const poolConfig = {
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'haas',
  password: process.env.POSTGRES_PASSWORD || 'haaspass',
  database: process.env.POSTGRES_DB || 'haasdb',
  max: 10,        // reducir de 20 a 10
  min: 2,         // mantener mínimo bajo
  acquire: 60000, // aumentar timeout
  idle: 30000,    // conexiones idle se liberan más rápido
  evict: 1000,    // limpiar más frecuentemente
  createTimeoutMillis: 60000,
  destroyTimeoutMillis: 10000,
  createRetryIntervalMillis: 500,
  reapIntervalMillis: 1000,
  idleTimeoutMillis: 60000, // 1 minuto
  connectTimeoutMillis: 10000,
};
```

**Paso 3: Implementar connection health checks**
```typescript
// backend/src/utils/db-healthcheck.ts
import { Pool } from 'pg';

export class DatabaseHealthCheck {
  private pool: Pool;
  private lastCheck: Date = new Date();
  private isHealthy: boolean = true;
  private failureCount: number = 0;

  constructor(pool: Pool) {
    this.pool = pool;
    this.startHealthCheck();
  }

  private startHealthCheck(): void {
    setInterval(async () => {
      try {
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();
        
        this.lastCheck = new Date();
        this.isHealthy = true;
        this.failureCount = 0;
      } catch (error) {
        console.error('Database health check failed:', error);
        this.failureCount++;
        
        if (this.failureCount >= 3) {
          this.isHealthy = false;
          console.error('❌ Database is unhealthy');
          
          // Intentar reconectar
          this.reconnect();
        }
      }
    }, 30000); // cada 30 segundos
  }

  private async reconnect(): Promise<void> {
    try {
      // Terminar todas las conexiones existentes
      await this.pool.end();
      
      // Crear nuevo pool
      this.pool = new Pool(poolConfig);
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      console.log('✅ Database reconnected successfully');
      this.isHealthy = true;
      this.failureCount = 0;
    } catch (error) {
      console.error('❌ Database reconnection failed:', error);
    }
  }

  isConnectionHealthy(): boolean {
    return this.isHealthy;
  }

  getLastCheck(): Date {
    return this.lastCheck;
  }
}
```

**Paso 4: Limpiar conexiones zombi**
```sql
-- Crear función para limpiar conexiones idle
CREATE OR REPLACE FUNCTION cleanup_idle_connections()
RETURNS void AS $$
BEGIN
  -- Terminar conexiones idle por más de 1 hora
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity 
  WHERE state = 'idle in transaction' 
    AND state_change < now() - interval '1 hour'
    AND usename != 'postgres';
END;
$$ LANGUAGE plpgsql;

-- Programar limpieza automática (cada 30 minutos)
SELECT cron.schedule('cleanup-db-connections', '*/30 * * * *', 'SELECT cleanup_idle_connections();');
```

---

## 🔄 Problemas de Workflows

### 1. Workflows fallan al ejecutar

#### Síntomas
- Workflows en estado "failed"
- Error nodes en executions
- Timeouts frecuentes

#### Diagnóstico

```bash
# Revisar logs de workflow execution
docker-compose logs backend | grep -i "workflow\|execution"

# Verificar estado de servicios externos
curl -I https://api.github.com/status
curl -I https://httpbin.org/status/200

# Verificar conectividad de red
ping postgres
ping redis
ping google.com
```

#### Solución

**Paso 1: Revisar logs detallados**
```bash
# Ver logs específicos de un workflow
docker-compose logs backend | grep -A 10 -B 5 "workflow-id-12345"

# Ver logs de error específicos
docker-compose logs backend | grep -i error | tail -20

# Ver logs de Node.js
docker-compose logs backend 2>&1 | grep -E "(Error|Exception|Stack)"
```

**Paso 2: Implementar retry logic**
```typescript
// backend/src/services/execution-engine.service.ts
export class ExecutionEngineService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 segundo
  private static readonly RETRY_MULTIPLIER = 2;

  static async executeNode(nodeConfig: any, data: any): Promise<any> {
    let lastError: Error;
    let delay = this.RETRY_DELAY;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`Executing node ${nodeConfig.id}, attempt ${attempt}`);
        
        const result = await this.executeNodeInternal(nodeConfig, data);
        
        // Si llegamos aquí, fue exitoso
        console.log(`✅ Node ${nodeConfig.id} executed successfully on attempt ${attempt}`);
        return result;
        
      } catch (error) {
        lastError = error;
        console.error(`❌ Node ${nodeConfig.id} failed on attempt ${attempt}:`, error.message);
        
        if (attempt < this.MAX_RETRIES) {
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
          delay *= this.RETRY_MULTIPLIER; // Exponential backoff
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    throw new Error(`Node ${nodeConfig.id} failed after ${this.MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
  }

  private static async executeNodeInternal(nodeConfig: any, data: any): Promise<any> {
    switch (nodeConfig.type) {
      case 'http-request':
        return await this.executeHttpNode(nodeConfig, data);
      case 'database':
        return await this.executeDatabaseNode(nodeConfig, data);
      case 'transform':
        return await this.executeTransformNode(nodeConfig, data);
      default:
        throw new Error(`Unknown node type: ${nodeConfig.type}`);
    }
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**Paso 3: Implementar circuit breaker**
```typescript
// backend/src/utils/circuit-breaker.ts
interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitorTimeout: number;
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        console.log('🔄 Circuit breaker moved to HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      console.log(`🔴 Circuit breaker opened after ${this.failures} failures`);
    }
  }

  isOpen(): boolean {
    return this.state === 'OPEN';
  }

  getState(): string {
    return this.state;
  }
}

// Usar circuit breaker para servicios externos
const githubCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  recoveryTimeout: 60000, // 1 minuto
  monitorTimeout: 30000,
});

export const safeGithubRequest = async (url: string, options: any) => {
  return githubCircuitBreaker.execute(async () => {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    return response.json();
  });
};
```

**Paso 4: Implementar fallback mechanisms**
```typescript
// backend/src/services/fallback.service.ts
export class FallbackService {
  static async executeWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      return await primaryOperation();
    } catch (primaryError) {
      console.warn(`Primary operation ${operationName} failed, using fallback:`, primaryError.message);
      
      try {
        return await fallbackOperation();
      } catch (fallbackError) {
        console.error(`Both primary and fallback operations failed for ${operationName}:`, fallbackError.message);
        throw new Error(`Operation ${operationName} failed completely`);
      }
    }
  }

  // Fallback para datos externos
  static async getGithubUserFallback(username: string): Promise<any> {
    return this.executeWithFallback(
      () => this.getGithubUserPrimary(username),
      () => this.getGithubUserCache(username),
      'getGithubUser'
    );
  }

  private static async getGithubUserPrimary(username: string): Promise<any> {
    const response = await fetch(`https://api.github.com/users/${username}`);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    return response.json();
  }

  private static async getGithubUserCache(username: string): Promise<any> {
    // Intentar obtener de caché
    const cached = await CacheService.get(`github:user:${username}`);
    if (cached) {
      return { ...cached, source: 'cache' };
    }

    // Si no hay caché, retornar datos por defecto
    return {
      login: username,
      name: 'User not found',
      bio: 'Data not available due to API issues',
      source: 'fallback'
    };
  }
}
```

### 2. Workflows se quedan en estado "Pending" o "Running"

#### Síntomas
- Workflows no progresan más allá de "Pending"
- Workflows en "Running" indefinidamente
- Deadlocks en la ejecución

#### Diagnóstico

```sql
-- Ver workflows en estados problemáticos
SELECT 
  id, 
  status, 
  created_at, 
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) as stuck_seconds
FROM workflows 
WHERE status IN ('pending', 'running')
ORDER BY updated_at ASC;

-- Ver ejecuciones atascadas
SELECT 
  we.id,
  we.workflow_id,
  we.status,
  we.started_at,
  w.name as workflow_name
FROM workflow_executions we
JOIN workflows w ON w.id = we.workflow_id
WHERE we.status = 'running'
  AND we.started_at < NOW() - INTERVAL '10 minutes';
```

#### Solución

**Paso 1: Implementar timeout para workflows**
```sql
-- Agregar columna de timeout a workflows
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS timeout_seconds INTEGER DEFAULT 3600;

-- Agregar timeout a workflow_executions
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS timeout_seconds INTEGER DEFAULT 1800;

-- Crear función para actualizar workflows atascados
CREATE OR REPLACE FUNCTION update_stuck_workflows()
RETURNS void AS $$
BEGIN
  -- Actualizar workflows en estado pending/running por más de 1 hora
  UPDATE workflows 
  SET status = 'failed', 
      updated_at = NOW()
  WHERE status IN ('pending', 'running')
    AND updated_at < NOW() - INTERVAL '1 hour';
    
  -- Actualizar ejecuciones atascadas
  UPDATE workflow_executions 
  SET status = 'failed', 
      updated_at = NOW(),
      error_message = 'Workflow timed out'
  WHERE status = 'running'
    AND started_at < NOW() - INTERVAL '30 minutes';
    
  RAISE NOTICE 'Updated stuck workflows and executions';
END;
$$ LANGUAGE plpgsql;

-- Programar ejecución cada 5 minutos
SELECT cron.schedule('update-stuck-workflows', '*/5 * * * *', 'SELECT update_stuck_workflows();');
```

**Paso 2: Implementar workflow queue system**
```typescript
// backend/src/services/workflow-queue.service.ts
import Bull from 'bull';
import { WorkflowExecution } from '../types/workflow-execution.entity';

interface QueueJob {
  executionId: string;
  workflowId: string;
  data: any;
  priority: number;
}

export class WorkflowQueueService {
  private workflowQueue: Bull.Queue;

  constructor() {
    this.workflowQueue = new Bull('workflow-execution', {
      redis: {
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: 10, // Mantener últimos 10 jobs completados
        removeOnFail: 5,      // Mantener últimos 5 jobs fallidos
        attempts: 3,          // Reintentos automáticos
        backoff: {
          type: 'exponential',
          delay: 2000,        // 2 segundos inicial
        },
      },
    });

    this.setupProcessors();
  }

  private setupProcessors(): void {
    this.workflowQueue.process('execute-workflow', 5, async (job) => {
      const { executionId, workflowId, data } = job.data as QueueJob;
      
      try {
        console.log(`🚀 Starting workflow execution: ${executionId}`);
        
        // Actualizar estado a running
        await this.updateExecutionStatus(executionId, 'running');
        
        // Ejecutar workflow
        const result = await this.executeWorkflowInternal(workflowId, data);
        
        // Marcar como completado
        await this.updateExecutionStatus(executionId, 'completed', result);
        
        console.log(`✅ Workflow execution completed: ${executionId}`);
        return result;
        
      } catch (error) {
        console.error(`❌ Workflow execution failed: ${executionId}`, error);
        
        // Marcar como fallido
        await this.updateExecutionStatus(executionId, 'failed', null, error.message);
        throw error;
      }
    });

    // Configurar eventos
    this.workflowQueue.on('completed', (job) => {
      console.log(`✅ Job ${job.id} completed`);
    });

    this.workflowQueue.on('failed', (job, err) => {
      console.error(`❌ Job ${job.id} failed:`, err);
    });

    this.workflowQueue.on('stalled', (job) => {
      console.warn(`⚠️ Job ${job.id} stalled`);
    });
  }

  async addWorkflowJob(execution: WorkflowExecution, data: any): Promise<void> {
    await this.workflowQueue.add(
      'execute-workflow',
      {
        executionId: execution.id,
        workflowId: execution.workflowId,
        data,
        priority: execution.priority || 0,
      },
      {
        delay: execution.scheduledAt ? 
          new Date(execution.scheduledAt).getTime() - Date.now() : 
          0,
        priority: execution.priority || 0,
      }
    );
  }

  private async updateExecutionStatus(
    executionId: string, 
    status: string, 
    result?: any, 
    errorMessage?: string
  ): Promise<void> {
    // Implementar actualización en base de datos
    // ... código de actualización
  }

  private async executeWorkflowInternal(workflowId: string, data: any): Promise<any> {
    // Implementar ejecución de workflow
    // ... código de ejecución
  }

  // Limpiar jobs atascados
  async cleanupStalledJobs(): Promise<void> {
    const stalled = await this.workflowQueue.getStalledJobs();
    
    for (const job of stalled) {
      console.log(`🧹 Cleaning up stalled job: ${job.id}`);
      await job.moveToFailed(new Error('Job was stalled and cleaned up'));
    }
  }
}
```

**Paso 3: Implementar workflow monitoring**
```typescript
// backend/src/services/workflow-monitor.service.ts
export class WorkflowMonitorService {
  private static intervalId: NodeJS.Timeout;

  static start(): void {
    this.intervalId = setInterval(() => {
      this.checkStuckWorkflows();
    }, 60000); // cada minuto
  }

  static stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private static async checkStuckWorkflows(): Promise<void> {
    try {
      // Buscar workflows que han estado en pending/running por más de 10 minutos
      const stuckWorkflows = await this.getStuckWorkflows();
      
      for (const workflow of stuckWorkflows) {
        console.warn(`⚠️ Workflow ${workflow.id} seems stuck (status: ${workflow.status})`);
        
        // Intentar reintento automático para workflows pending
        if (workflow.status === 'pending') {
          await this.retryStuckWorkflow(workflow.id);
        }
        
        // Log para análisis
        await this.logWorkflowIssue(workflow.id, 'stuck', workflow.status);
      }
    } catch (error) {
      console.error('Error checking stuck workflows:', error);
    }
  }

  private static async getStuckWorkflows(): Promise<any[]> {
    // Implementar consulta a base de datos
    // return await getRepository(Workflow).find({
    //   where: { status: In(['pending', 'running']) },
    //   andWhere: 'updated_at < NOW() - INTERVAL \'10 minutes\''
    // });
    return [];
  }

  private static async retryStuckWorkflow(workflowId: string): Promise<void> {
    // Implementar reintento del workflow
    console.log(`🔄 Retrying stuck workflow: ${workflowId}`);
  }

  private static async logWorkflowIssue(workflowId: string, type: string, status: string): Promise<void> {
    // Implementar logging de issues
    console.log(`📝 Logging workflow issue: ${workflowId} - ${type} - ${status}`);
  }
}
```

---

## 🔗 Problemas de Conectividad

### 1. "Connection timeout" con servicios externos

#### Síntomas
- HTTP requests fallan con timeout
- Workflows que usan APIs externas fallan
- Conexiones lentas o intermitentes

#### Diagnóstico

```bash
# Test conectividad básica
ping api.github.com
ping google.com

# Test DNS resolution
nslookup api.github.com
dig api.github.com

# Test HTTP connectivity
curl -I --connect-timeout 10 https://api.github.com

# Verificar logs de red
docker-compose logs | grep -i "timeout\|connection\|network"
```

#### Solución

**Paso 1: Configurar timeouts apropiados**
```typescript
// backend/src/config/http-client.ts
import axios, { AxiosRequestConfig } from 'axios';

const httpClient = axios.create({
  timeout: 30000, // 30 segundos para requests
  connectTimeout: 5000, // 5 segundos para conectar
  readTimeout: 25000, // 25 segundos para leer respuesta
  headers: {
    'User-Agent': 'Silhouette-Workflow-Platform/1.0',
    'Accept': 'application/json',
  },
});

// Configurar retry logic
httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // No reintentar si ya hemos intentado varias veces
    if (config.__retryCount >= 3) {
      return Promise.reject(error);
    }
    
    // Solo reintentar en errores de red o 5xx
    if (error.code === 'ECONNABORTED' || 
        error.code === 'ENOTFOUND' ||
        (error.response && error.response.status >= 500)) {
      
      config.__retryCount = (config.__retryCount || 0) + 1;
      
      // Exponential backoff
      const delay = Math.pow(2, config.__retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`🔄 Retrying request (attempt ${config.__retryCount}) in ${delay}ms`);
      return httpClient(config);
    }
    
    return Promise.reject(error);
  }
);

export default httpClient;
```

**Paso 2: Implementar health checks para servicios externos**
```typescript
// backend/src/services/external-service-monitor.ts
interface ServiceHealth {
  name: string;
  url: string;
  isHealthy: boolean;
  lastCheck: Date;
  responseTime: number;
  consecutiveFailures: number;
}

export class ExternalServiceMonitor {
  private services: Map<string, ServiceHealth> = new Map();
  private checkInterval: NodeJS.Timeout;

  constructor() {
    this.initializeServices();
    this.startPeriodicChecks();
  }

  private initializeServices(): void {
    const services = [
      { name: 'github', url: 'https://api.github.com' },
      { name: 'google', url: 'https://www.google.com' },
      { name: 'httpbin', url: 'https://httpbin.org/status/200' },
    ];

    services.forEach(service => {
      this.services.set(service.name, {
        ...service,
        isHealthy: true,
        lastCheck: new Date(),
        responseTime: 0,
        consecutiveFailures: 0,
      });
    });
  }

  private startPeriodicChecks(): void {
    this.checkInterval = setInterval(() => {
      this.checkAllServices();
    }, 60000); // cada minuto
  }

  private async checkAllServices(): Promise<void> {
    const promises = Array.from(this.services.entries()).map(([name, service]) =>
      this.checkService(name, service)
    );
    
    await Promise.allSettled(promises);
  }

  private async checkService(name: string, service: ServiceHealth): Promise<void> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(service.url, {
        method: 'HEAD',
        timeout: 10000, // 10 segundos max para health check
      });
      
      const responseTime = Date.now() - startTime;
      
      service.isHealthy = response.ok;
      service.lastCheck = new Date();
      service.responseTime = responseTime;
      service.consecutiveFailures = 0;
      
      if (response.ok) {
        console.log(`✅ ${name} is healthy (${responseTime}ms)`);
      } else {
        console.warn(`⚠️ ${name} returned ${response.status}`);
        service.consecutiveFailures++;
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      service.isHealthy = false;
      service.lastCheck = new Date();
      service.responseTime = responseTime;
      service.consecutiveFailures++;
      
      console.error(`❌ ${name} health check failed:`, error.message);
    }
  }

  isServiceHealthy(serviceName: string): boolean {
    const service = this.services.get(serviceName);
    return service ? service.isHealthy : false;
  }

  getServiceStatus(serviceName: string): ServiceHealth | null {
    return this.services.get(serviceName) || null;
  }

  getAllServicesStatus(): Record<string, ServiceHealth> {
    const status: Record<string, ServiceHealth> = {};
    this.services.forEach((service, name) => {
      status[name] = { ...service };
    });
    return status;
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// Usar monitor
export const serviceMonitor = new ExternalServiceMonitor();

// Middleware para verificar servicios antes de usar
export const requireExternalService = (serviceName: string) => {
  return (req: any, res: any, next: any) => {
    if (!serviceMonitor.isServiceHealthy(serviceName)) {
      return res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: `External service ${serviceName} is currently unavailable`,
        service: serviceMonitor.getServiceStatus(serviceName),
      });
    }
    next();
  };
};
```

**Paso 3: Configurar DNS y red**
```bash
# /etc/systemd/resolved.conf
[Resolve]
DNS=8.8.8.8 8.8.4.4 1.1.1.1
FallbackDNS=208.67.222.222
Domains=~.
DNSSEC=yes
DNSOverTLS=yes
Cache=yes
DNSStubListener=yes
```

```bash
# /etc/docker/daemon.json
{
  "dns": ["8.8.8.8", "1.1.1.1"],
  "dns-opts": ["ndots:2", "timeout:3"],
  "dns-search": ["local", "cluster.local"]
}
```

**Paso 4: Implementar service discovery fallback**
```typescript
// backend/src/services/service-discovery.ts
interface ServiceEndpoint {
  url: string;
  priority: number;
  isHealthy: boolean;
  lastUsed: Date;
}

export class ServiceDiscovery {
  private static services: Map<string, ServiceEndpoint[]> = new Map();

  static initialize(): void {
    // Configurar endpoints para servicios comunes
    this.services.set('github', [
      { url: 'https://api.github.com', priority: 1, isHealthy: true, lastUsed: new Date() },
      { url: 'https://api.github.com', priority: 1, isHealthy: true, lastUsed: new Date() }, // Backup
    ]);

    this.services.set('httpbin', [
      { url: 'https://httpbin.org', priority: 1, isHealthy: true, lastUsed: new Date() },
      { url: 'https://postman-echo.com', priority: 2, isHealthy: true, lastUsed: new Date() }, // Backup
    ]);
  }

  static async getServiceUrl(serviceName: string): Promise<string> {
    const endpoints = this.services.get(serviceName) || [];
    
    // Filtrar endpoints saludables y ordenarlos por prioridad
    const healthyEndpoints = endpoints
      .filter(ep => ep.isHealthy)
      .sort((a, b) => a.priority - b.priority);

    if (healthyEndpoints.length === 0) {
      throw new Error(`No healthy endpoints available for service: ${serviceName}`);
    }

    // Usar el primer endpoint saludable
    const selectedEndpoint = healthyEndpoints[0];
    selectedEndpoint.lastUsed = new Date();

    return selectedEndpoint.url;
  }

  static markEndpointUnhealthy(serviceName: string, url: string): void {
    const endpoints = this.services.get(serviceName) || [];
    const endpoint = endpoints.find(ep => ep.url === url);
    
    if (endpoint) {
      endpoint.isHealthy = false;
      console.warn(`🔴 Marked endpoint as unhealthy: ${serviceName} - ${url}`);
    }
  }

  static markEndpointHealthy(serviceName: string, url: string): void {
    const endpoints = this.services.get(serviceName) || [];
    const endpoint = endpoints.find(ep => ep.url === url);
    
    if (endpoint) {
      endpoint.isHealthy = true;
      console.log(`✅ Marked endpoint as healthy: ${serviceName} - ${url}`);
    }
  }
}
```

---

## 🛠️ Scripts de Automatización

### Script de Diagnóstico Completo

```bash
#!/bin/bash
# /workspace/silhouette-workflow-creation/scripts/comprehensive-diagnostics.sh

set -e

echo "🔍 Iniciando diagnóstico completo de Silhouette Workflow Platform"
echo "=============================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# 1. Verificar estado de Docker
echo -e "\n🐳 Verificando estado de Docker..."
docker ps | grep -q "silhouette" && print_status 0 "Docker containers running" || print_status 1 "No Silhouette containers found"

# 2. Verificar puertos
echo -e "\n🔌 Verificando puertos..."
for port in 3000 5432 6379; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_status 0 "Puerto $port está en uso"
    else
        print_status 1 "Puerto $port no está en uso"
    fi
done

# 3. Verificar conectividad a base de datos
echo -e "\n🗄️ Verificando base de datos..."
if docker-compose exec -T postgres pg_isready -U haas >/dev/null 2>&1; then
    print_status 0 "PostgreSQL está disponible"
    
    # Test de conexión
    if docker-compose exec -T postgres psql -U haas -d haasdb -c "SELECT 1;" >/dev/null 2>&1; then
        print_status 0 "Conexión a base de datos exitosa"
    else
        print_status 1 "Error de conexión a base de datos"
    fi
else
    print_status 1 "PostgreSQL no está disponible"
fi

# 4. Verificar Redis
echo -e "\n💾 Verificando Redis..."
if docker-compose exec -T redis redis-cli ping | grep -q PONG; then
    print_status 0 "Redis está respondiendo"
else
    print_status 1 "Redis no está respondiendo"
fi

# 5. Verificar APIs
echo -e "\n🌐 Verificando APIs..."
if curl -f -s http://localhost:3000/api/system/health >/dev/null; then
    print_status 0 "Backend API está funcionando"
else
    print_status 1 "Backend API no está disponible"
fi

if curl -f -s http://localhost:3000 >/dev/null; then
    print_status 0 "Frontend está disponible"
else
    print_status 1 "Frontend no está disponible"
fi

# 6. Verificar espacio en disco
echo -e "\n💿 Verificando espacio en disco..."
disk_usage=$(df -h . | awk 'NR==2{print $5}' | sed 's/%//')
if [ $disk_usage -lt 80 ]; then
    print_status 0 "Espacio en disco OK (${disk_usage}% usado)"
else
    print_status 1 "Espacio en disco bajo (${disk_usage}% usado)"
fi

# 7. Verificar memoria
echo -e "\n🧠 Verificando memoria..."
memory_usage=$(free | awk 'FNR==2{printf "%.0f", $3*100/$2 }')
if [ $memory_usage -lt 80 ]; then
    print_status 0 "Uso de memoria OK (${memory_usage}%)"
else
    print_status 1 "Uso de memoria alto (${memory_usage}%)"
fi

# 8. Verificar logs por errores recientes
echo -e "\n📋 Verificando logs por errores..."
error_count=$(docker-compose logs --tail=1000 backend 2>/dev/null | grep -i error | wc -l)
if [ $error_count -eq 0 ]; then
    print_status 0 "No hay errores recientes en logs"
else
    print_status 1 "Encontrados $error_count errores en logs recientes"
fi

# 9. Verificar health checks
echo -e "\n❤️ Verificando health checks..."
health_endpoints=(
    "http://localhost:3000/api/auth/health"
    "http://localhost:3000/api/workflows/health"
    "http://localhost:3000/api/credentials/health"
    "http://localhost:3000/api/ai/health"
)

for endpoint in "${health_endpoints[@]}"; do
    if curl -f -s "$endpoint" >/dev/null; then
        endpoint_name=$(basename $(dirname "$endpoint"))
        print_status 0 "Health check $endpoint_name OK"
    else
        endpoint_name=$(basename $(dirname "$endpoint"))
        print_status 1 "Health check $endpoint_name FAILED"
    fi
done

# 10. Verificar conectividad externa
echo -e "\n🌍 Verificando conectividad externa..."
if curl -f -s --connect-timeout 5 https://api.github.com >/dev/null; then
    print_status 0 "Conectividad a GitHub API OK"
else
    print_status 1 "Sin conectividad a GitHub API"
fi

# 11. Resumen de recursos
echo -e "\n📊 Resumen de recursos:"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')% usado"
echo "Memoria: $(free -h | awk 'FNR==2{printf "%s/%s (%.1f%%)\n", $3,$2,$3*100/$2 }')"
echo "Disco: $(df -h . | awk 'NR==2{printf "%s/%s (%s)\n", $3,$2,$5}')"

# 12. Generar reporte
echo -e "\n📄 Generando reporte..."
{
    echo "Reporte de Diagnóstico - $(date)"
    echo "================================="
    echo "Docker containers: $(docker-compose ps --services | wc -l)"
    echo "DB status: $(docker-compose exec -T postgres pg_isready -U haas 2>/dev/null && echo 'OK' || echo 'FAILED')"
    echo "Redis status: $(docker-compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG && echo 'OK' || echo 'FAILED')"
    echo "API status: $(curl -f -s http://localhost:3000/api/system/health >/dev/null && echo 'OK' || echo 'FAILED')"
    echo "Frontend status: $(curl -f -s http://localhost:3000 >/dev/null && echo 'OK' || echo 'FAILED')"
    echo "Disk usage: ${disk_usage}%"
    echo "Memory usage: ${memory_usage}%"
    echo "Errors in logs: $error_count"
} > /workspace/silhouette-workflow-creation/diagnostics-report-$(date +%Y%m%d-%H%M%S).txt

echo -e "\n${GREEN}✅ Diagnóstico completado${NC}"
echo "Reporte guardado en: diagnostics-report-$(date +%Y%m%d-%H%M%S).txt"
```

### Script de Limpieza y Mantenimiento

```bash
#!/bin/bash
# /workspace/silhouette-workflow-creation/scripts/maintenance-cleanup.sh

set -e

echo "🧹 Iniciando mantenimiento y limpieza de Silhouette"

# Función para logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 1. Limpiar logs antiguos
log "Limpiando logs antiguos..."
find /workspace/silhouette-workflow-creation/logs -name "*.log" -mtime +30 -delete 2>/dev/null || true
log "Logs antiguos limpiados"

# 2. Limpiar imágenes Docker no utilizadas
log "Limpiando imágenes Docker no utilizadas..."
docker image prune -f >/dev/null 2>&1 || true
log "Imágenes Docker limpiadas"

# 3. Limpiar contenedores detenidos
log "Limpiando contenedores detenidos..."
docker container prune -f >/dev/null 2>&1 || true
log "Contenedores limpiados"

# 4. Limpiar volúmenes huérfanos
log "Limpiando volúmenes huérfanos..."
docker volume prune -f >/dev/null 2>&1 || true
log "Volúmenes limpiados"

# 5. Optimizar base de datos
log "Optimizando base de datos..."
docker-compose exec -T postgres psql -U haas -d haasdb -c "
VACUUM ANALYZE;
REINDEX DATABASE haasdb;
" >/dev/null 2>&1 || log "⚠️ Error optimizando base de datos"
log "Base de datos optimizada"

# 6. Limpiar cache de Redis
log "Limpiando cache de Redis..."
docker-compose exec -T redis redis-cli FLUSHDB >/dev/null 2>&1 || log "⚠️ Error limpiando Redis"
log "Cache de Redis limpiado"

# 7. Reiniciar servicios si es necesario
log "Reiniciando servicios para limpiar memoria..."
docker-compose restart backend >/dev/null 2>&1 || log "⚠️ Error reiniciando backend"
sleep 5
docker-compose restart frontend >/dev/null 2>&1 || log "⚠️ Error reiniciando frontend"
log "Servicios reiniciados"

# 8. Verificar que todo está funcionando
log "Verificando que los servicios están funcionando..."
sleep 10

if curl -f -s http://localhost:3000/api/system/health >/dev/null; then
    log "✅ Todos los servicios están funcionando correctamente"
else
    log "❌ Algunos servicios no están respondiendo"
    exit 1
fi

# 9. Generar reporte de mantenimiento
log "Generando reporte de mantenimiento..."
{
    echo "Reporte de Mantenimiento - $(date)"
    echo "=================================="
    echo "Logs limpiados: Últimos 30 días"
    echo "Docker images: No utilizadas removidas"
    echo "Docker containers: Detenidos removidos"
    echo "Docker volumes: Huérfanos removidos"
    echo "Database: VACUUM y REINDEX ejecutados"
    echo "Redis: Cache limpiado"
    echo "Services: Reiniciados para limpieza de memoria"
    echo "Status: Todos los servicios OK"
} > /workspace/silhouette-workflow-creation/maintenance-report-$(date +%Y%m%d-%H%M%S).txt

log "✅ Mantenimiento completado"
log "Reporte guardado en: maintenance-report-$(date +%Y%m%d-%H%M%S).txt"
```

---

## 📋 Checklist de Troubleshooting

### Diagnóstico Inicial
- [ ] Verificar que todos los servicios están corriendo (`docker-compose ps`)
- [ ] Revisar logs de servicios problemáticos (`docker-compose logs service-name`)
- [ ] Verificar conectividad de red (DNS, puertos, firewall)
- [ ] Comprobar uso de recursos (CPU, memoria, disco)
- [ ] Verificar configuración de variables de entorno

### Problemas de Autenticación
- [ ] Verificar configuración JWT (secret, expiresIn)
- [ ] Comprobar sincronización de tiempo del sistema
- [ ] Revisar configuración de sesiones (Redis)
- [ ] Verificar base de datos de usuarios
- [ ] Limpiar tokens/cachés expirados

### Problemas de Performance
- [ ] Analizar consultas lentas en PostgreSQL
- [ ] Verificar configuración de connection pooling
- [ ] Revisar uso de memoria y leaks
- [ ] Comprobar eficacia de índices
- [ ] Analizar métricas de caching (Redis)

### Problemas de Workflows
- [ ] Revisar logs de ejecución detallados
- [ ] Verificar conectividad a servicios externos
- [ ] Implementar retry logic y circuit breakers
- [ ] Comprobar timeouts y configuraciones
- [ ] Verificar queue system y procesamiento

### Problemas de Infraestructura
- [ ] Verificar límites de recursos (CPU, memoria)
- [ ] Comprobar espacio en disco
- [ ] Revisar configuración de red
- [ ] Verificar configuración de backup
- [ ] Comprobar health checks

### Monitoreo y Alertas
- [ ] Configurar alertas de performance
- [ ] Implementar monitoring de servicios externos
- [ ] Configurar logging estructurado
- [ ] Establecer SLAs y thresholds
- [ ] Configurar dashboard de métricas

---

## 🏁 Conclusión

Esta guía de troubleshooting proporciona un enfoque sistemático para identificar, diagnosticar y resolver problemas comunes en Silhouette Workflow Platform. Recuerda siempre:

### Principios Fundamentales
1. **Empezar por lo básico**: Verificar servicios, conectividad y recursos
2. **Usar logs efectivamente**: Son tu mejor herramienta de diagnóstico
3. **Implementar monitoreo proactivo**: Prevenir es mejor que remediar
4. **Documentar soluciones**: Para futuros problemas similares
5. **Tener un plan de rollback**: Por si las cosas no salen como esperabas

### Herramientas Esenciales
- `docker-compose logs` - Para ver qué está pasando
- `curl` - Para probar conectividad y APIs
- `psql` - Para diagnosticar problemas de base de datos
- `redis-cli` - Para verificar cache y sesiones
- `htop`/`docker stats` - Para monitoreo de recursos

### Recursos Adicionales
- 📖 [Documentación API](api-reference.md)
- 🔧 [Guía de Administración](admin-guide.md)
- 🚀 [Guía de Despliegue](deployment-guide.md)
- 📊 [Configuración de Analytics](analytics-configuration.md)
- 💬 [Comunidad de Soporte](https://discord.gg/silhouette)

**¡Con esta guía, estás preparado para manejar la mayoría de problemas que puedan surgir en Silhouette Workflow Platform! 🛠️**
