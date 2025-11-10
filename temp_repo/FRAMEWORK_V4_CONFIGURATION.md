# Framework Silhouette Enterprise V4.0 - Configuración y Variables de Entorno

## 🔧 CONFIGURACIÓN DEL FRAMEWORK V4.0

### Variables de Entorno Principales

```env
# ================================
# FRAMEWORK V4.0 CONFIGURATION
# ================================

# Habilitar Framework V4.0
FRAMEWORK_V4_ENABLED=true

# Entorno de deployment
NODE_ENV=production

# ================================
# COORDINATOR ENGINE V4.0
# ================================

# Configuración del coordinador
MAX_CONCURRENT_TASKS=100
COORDINATOR_INTELLIGENT_ASSIGNMENT=true
COORDINATOR_LOAD_BALANCING=true
COORDINATOR_AUTO_RECOVERY=true

# ================================
# WORKFLOW ENGINE V4.0
# ================================

# Configuración de workflows
WORKFLOW_DYNAMIC_OPTIMIZATION=true
WORKFLOW_AUTO_SCALING=true
WORKFLOW_DAG_SUPPORT=true

# ================================
# SISTEMA AUDIOVISUAL V4.0
# ================================

# Habilitar sistema audiovisual
AUDIOVISUAL_ENABLED=true

# Configuración de calidad
AUDIOVISUAL_QUALITY_MIN=90
AUDIOVISUAL_AUTO_APPROVAL=true

# Límites de producción
AUDIOVISUAL_MAX_CONCURRENT=5
AUDIOVISUAL_TIMEOUT=300000
AUDIOVISUAL_RETRIES=3

# ================================
# PROVEEDORES DE IA AUDIOVISUAL
# ================================

# Unsplash (Búsqueda de imágenes)
UNSPLASH_ENABLED=true
UNSPLASH_ACCESS_KEY=tu_clave_unsplash_aqui
UNSPLASH_RATE_LIMIT=50
UNSPLASH_QUALITY=high

# Runway AI (Generación de video)
RUNWAY_ENABLED=true
RUNWAY_API_KEY=tu_clave_runway_aqui
RUNWAY_MAX_DURATION=30

# Pika Labs (Generación de video)
PIKA_ENABLED=true
PIKA_API_KEY=tu_clave_pika_aqui

# Luma AI (Efectos visuales)
LUMA_ENABLED=true
LUMA_API_KEY=tu_clave_luma_aqui

# ================================
# AUTO OPTIMIZER V4.0
# ================================

# Habilitar optimización automática
AUTO_OPTIMIZATION_ENABLED=true
AUTO_OPTIMIZATION_ML=true
AUTO_SCALING_ENABLED=true

# Umbrales de rendimiento
PERFORMANCE_THRESHOLD=80

# Auto-scaling
AUTO_SCALING_MIN_REPLICAS=1
AUTO_SCALING_MAX_REPLICAS=10
AUTO_SCALING_TARGET_CPU=70
AUTO_SCALING_TARGET_MEMORY=80

# Machine Learning
ML_OPTIMIZATION_ENABLED=true
ML_MODEL_PATH=./models/optimization
ML_TRAINING_INTERVAL=3600000

# ================================
# MONITOREO Y MÉTRICAS V4.0
# ================================

# Habilitar monitoreo
MONITORING_ENABLED=true
METRICS_INTERVAL=30000
METRICS_RETENTION=7d

# Alertas
ALERTS_ENABLED=true
ALERT_EMAIL=admin@tuempresa.com
SLACK_WEBHOOK=https://hooks.slack.com/...

# ================================
# CONFIGURACIÓN DE DEPLOYMENT
# ================================

# Entorno de deployment
DEPLOYMENT_ENV=production

# Docker
DOCKER_IMAGE_TAG=4.0.0
DOCKER_REGISTRY=tu-registry.com

# Kubernetes
K8S_NAMESPACE=silhouette-framework
K8S_REPLICAS=3

# ================================
# INTEGRACIÓN CON SISTEMA ACTUAL
# ================================

# Compatibilidad con APIs existentes
FRAMEWORK_V4_COMPATIBILITY=true
BACKWARD_COMPATIBILITY=true

# Migración gradual
MIGRATION_MODE=gradual
LEGACY_APIS_ENABLED=true

# ================================
# DESARROLLO Y TESTING
# ================================

# Modo desarrollo
DEV_MODE=false
LOG_LEVEL=info

# Debugging
DEBUG_FRAMEWORK_V4=false
ENABLE_METRICS_DEBUG=false

# Testing
ENABLE_V4_TESTING=false
MOCK_AI_PROVIDERS=true
```

## 🚀 GUÍA DE CONFIGURACIÓN RÁPIDA

### Configuración Mínima (Desarrollo)
```env
FRAMEWORK_V4_ENABLED=true
COORDINATOR_INTELLIGENT_ASSIGNMENT=true
WORKFLOW_DYNAMIC_OPTIMIZATION=true
AUTO_OPTIMIZATION_ENABLED=true
```

### Configuración Completa (Producción)
```env
FRAMEWORK_V4_ENABLED=true
COORDINATOR_INTELLIGENT_ASSIGNMENT=true
COORDINATOR_LOAD_BALANCING=true
COORDINATOR_AUTO_RECOVERY=true
WORKFLOW_DYNAMIC_OPTIMIZATION=true
WORKFLOW_AUTO_SCALING=true
WORKFLOW_DAG_SUPPORT=true
AUDIOVISUAL_ENABLED=true
AUDIOVISUAL_QUALITY_MIN=90
AUTO_OPTIMIZATION_ENABLED=true
AUTO_OPTIMIZATION_ML=true
AUTO_SCALING_ENABLED=true
MONITORING_ENABLED=true
ALERTS_ENABLED=true
```

## 📊 ENDPOINTS DISPONIBLES

### Framework V4.0
- `GET /api/framework-v4/status` - Estado general del framework
- `GET /api/framework-v4/health` - Health check
- `GET /api/framework-v4/config` - Configuración actual

### Coordinador V4.0
- `POST /api/framework-v4/tasks` - Crear tarea
- `GET /api/framework-v4/tasks/status` - Estado de tareas
- `GET /api/framework-v4/teams/status` - Estado de equipos

### Workflow Engine V4.0
- `POST /api/framework-v4/workflows` - Crear workflow
- `POST /api/framework-v4/workflows/:id/execute` - Ejecutar workflow
- `GET /api/framework-v4/workflows` - Listar workflows
- `POST /api/framework-v4/workflows/:id/pause` - Pausar workflow
- `POST /api/framework-v4/workflows/:id/resume` - Reanudar workflow

### Sistema Audiovisual V4.0
- `POST /api/framework-v4/audiovisual/projects` - Crear proyecto
- `POST /api/framework-v4/audiovisual/projects/:id/produce` - Ejecutar producción
- `GET /api/framework-v4/audiovisual/projects/:id` - Obtener proyecto
- `GET /api/framework-v4/audiovisual/projects` - Listar proyectos
- `POST /api/framework-v4/audiovisual/projects/:id/generate-video` - Generar video

### Auto Optimizer V4.0
- `GET /api/framework-v4/optimizer/metrics` - Métricas de optimización
- `POST /api/framework-v4/optimizer/optimize` - Ejecutar optimización manual
- `GET /api/framework-v4/optimizer/history` - Historial de optimizaciones

## 🔐 CONFIGURACIÓN DE SEGURIDAD

### Variables de Seguridad
```env
# JWT para autenticación
JWT_SECRET=tu_jwt_secret_super_seguro_2025

# Clave de API del framework
API_KEY=tu_api_key_framework_2025

# Encriptación
ENCRYPTION_KEY=tu_encriptacion_super_seguro_2025
```

## 📈 CONFIGURACIÓN DE MONITOREO

### Grafana (Opcional)
```env
GRAFANA_ENABLED=true
GRAFANA_URL=http://localhost:3000
GRAFANA_ADMIN_PASSWORD=admin123
```

### Prometheus (Opcional)
```env
PROMETHEUS_ENABLED=true
PROMETHEUS_URL=http://localhost:9090
```

## 🌐 CONFIGURACIÓN DE RED

### Puertos del Sistema
- **Backend API:** 3001
- **Frontend:** 3000
- **Framework V4.0:** 3001/api/framework-v4
- **Grafana:** 3003
- **Neo4j:** 7474
- **RabbitMQ:** 15672

### CORS
```env
CORS_ORIGINS=http://localhost:3000,https://tu-dominio.com
FRONTEND_URL=http://localhost:3000
```

## 🗄️ CONFIGURACIÓN DE BASE DE DATOS

### PostgreSQL
```env
DATABASE_URL=postgresql://haas:haaspass@localhost:5432/haasdb
POSTGRES_USER=haas
POSTGRES_PASSWORD=haaspass
POSTGRES_DB=haasdb
```

### Redis
```env
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=haaspass
```

### Neo4j
```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=haaspass
NEO4J_AUTH=neo4j/haaspass
```

### RabbitMQ
```env
RABBITMQ_URL=amqp://haas:haaspass@localhost:5672
RABBITMQ_USER=haas
RABBITMQ_PASSWORD=haaspass
RABBITMQ_MANAGEMENT_PASSWORD=haaspass
```

## 🚨 CONFIGURACIÓN DE ALERTAS

### Email
```env
ALERT_EMAIL=admin@tuempresa.com,devops@tuempresa.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-password-app
```

### Slack
```env
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_CHANNEL=#alerts
```

## 🔄 MIGRACIÓN DESDE SISTEMA ACTUAL

### Compatibilidad
```env
# Mantener APIs existentes funcionando
LEGACY_APIS_ENABLED=true
BACKWARD_COMPATIBILITY=true

# Migración gradual
MIGRATION_MODE=gradual
ENABLE_V4_FEATURES=true
```

### Ejemplo de Migración Gradual
1. **Fase 1:** Habilitar Framework V4.0 sin afectar APIs existentes
2. **Fase 2:** Migrar endpoints específicos uno por uno
3. **Fase 3:** Activar nuevas características V4.0
4. **Fase 4:** Desactivar APIs legacy (opcional)

## 📋 CHECKLIST DE CONFIGURACIÓN

- [ ] Configurar variables de entorno base
- [ ] Configurar proveedores de IA (Opcional)
- [ ] Configurar alertas y monitoreo
- [ ] Configurar base de datos
- [ ] Configurar seguridad
- [ ] Probar endpoints V4.0
- [ ] Verificar compatibilidad con sistema actual
- [ ] Configurar deployment en producción

## 🆘 TROUBLESHOOTING

### Problemas Comunes

1. **Framework V4.0 no inicia**
   - Verificar `FRAMEWORK_V4_ENABLED=true`
   - Revisar logs de inicialización
   - Verificar variables de entorno requeridas

2. **APIs no compatibles**
   - Verificar `BACKWARD_COMPATIBILITY=true`
   - Revisar `MIGRATION_MODE=gradual`
   - Usar headers de versión: `X-Framework-Version: 4.0.0`

3. **Sistema audiovisual no funciona**
   - Verificar `AUDIOVISUAL_ENABLED=true`
   - Configurar claves API de proveedores
   - Revisar límites de rate

4. **Optimización automática no funciona**
   - Verificar `AUTO_OPTIMIZATION_ENABLED=true`
   - Configurar thresholds apropiados
   - Revisar métricas del sistema

### Logs Útiles
```bash
# Ver logs del framework
docker logs silhouette-framework-v4 | grep "Framework V4.0"

# Ver logs de optimización
docker logs silhouette-framework-v4 | grep "Auto Optimizer"

# Ver logs del sistema audiovisual
docker logs silhouette-framework-v4 | grep "AudioVisual"
```

## 📞 SOPORTE

Para soporte técnico del Framework V4.0:
- **Email:** soporte@silhouette-framework.com
- **Discord:** https://discord.gg/silhouette
- **Documentación:** https://docs.silhouette-framework.com
- **GitHub Issues:** https://github.com/haroldfabla2-hue/silhouette-mcp-enterprise-agents/issues
