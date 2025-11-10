#!/bin/bash

# ==================================================
# INSTALACIÓN AUTOMÁTICA - SILHOUETTE CON VALORES SEGUROS
# ==================================================
# Este script configura automáticamente Silhouette con valores seguros

set -e  # Salir en caso de error

echo "🎭 SILHOUETTE WORKFLOW CREATION - INSTALACIÓN AUTOMÁTICA"
echo "========================================================="

# Verificar si estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Ejecuta este script desde el directorio del proyecto"
    exit 1
fi

# Crear archivo .env con valores seguros
echo "🔐 Configurando variables de entorno con valores seguros..."

cat > .env << 'EOF'
# ==================================================
# SILHOUETTE WORKFLOW CREATION - CONFIGURACIÓN AUTOMÁTICA
# ==================================================

# Application Configuration
NODE_ENV=production
APP_NAME=Silhouette Workflow Creation
APP_VERSION=1.0.0
API_BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Security & Encryption
JWT_SECRET_KEY=GrOMWvS1WDUfSRdSMM7yD4sCT5RPlrg97SHkDEDPH2RBwNnjo4vsBOY2a0LBTF6/
JWT_REFRESH_SECRET_KEY=haas-refresh-secret-key-2025-change-in-production
ENCRYPTION_KEY=SoRIvzQI4Be/9z/+n/yZSp7WH+HAZpugaP+9h17sgz8=
BCRYPT_ROUNDS=12

# Database Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=haas
POSTGRES_PASSWORD=v6Ard2BhyygnhfzqoXR935n8oReEwRPc+wcEZEdhgeQ=
POSTGRES_DB=haasdb
POSTGRES_SSL=false
DATABASE_URL=postgresql://haas:v6Ard2BhyygnhfzqoXR935n8oReEwRPc+wcEZEdhgeQ=@postgres:5432/haasdb

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=uHuFU3vfkvCHNDl9Z+XsB2sKiP1RsW1ifSWlxCzL9zs=
REDIS_DB=0
REDIS_URL=redis://:uHuFU3vfkvCHNDl9Z+XsB2sKiP1RsW1ifSWlxCzL9zs=@redis:6379

# Neo4j Graph Database Configuration
NEO4J_HOST=neo4j
NEO4J_PORT=7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=PoAhse0FH0Q3s1Q5rGJcLJJvWf/hSWyqNr4k7at5jnI=
NEO4J_DATABASE=neo4j
NEO4J_URI=bolt://neo4j:PoAhse0FH0Q3s1Q5rGJcLJJvWf/hSWyqNr4k7at5jnI=@neo4j:7687
NEO4J_AUTH=neo4j/PoAhse0FH0Q3s1Q5rGJcLJJvWf/hSWyqNr4k7at5jnI=

# RabbitMQ Message Queue
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=haas
RABBITMQ_PASSWORD=Wpd0yc+Yk4dyTmmRr/3r6XQUMlZ6xEuEcYY+gYYHhDI=
RABBITMQ_URL=amqp://haas:Wpd0yc+Yk4dyTmmRr/3r6XQUMlZ6xEuEcYY+gYYHhDI=@rabbitmq:5672

# Silhouette Framework Integration
SILHOUETTE_API_URL=http://localhost:4001
SILHOUETTE_TEAMS_API=http://localhost:4002
SILHOUETTE_TASKS_API=http://localhost:4003
SILHOUETTE_FRAMEWORK_ENABLED=true
SILHOUETTE_AUTO_SCALING=true

# AI/ML Services (Optional)
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-your-anthropic-api-key-here
AI_MODEL=gpt-4-turbo
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=4000

# External Integrations
GITHUB_TOKEN=ghp_your-github-token-here
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret
DISCORD_BOT_TOKEN=your-discord-bot-token

# Cloud Services (Optional)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=silhouette-workflow-files

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@silhouette.com
FROM_NAME=Silhouette Workflow Creation

# File Storage
UPLOAD_MAX_SIZE=50MB
ALLOWED_FILE_TYPES=json,csv,xlsx,pdf,png,jpg,gif,svg
FILE_STORAGE_PATH=./uploads
CDN_URL=http://localhost:3000/files

# Real-time & WebSocket
WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=3002
COLLABORATION_ENABLED=true
MAX_COLLABORATORS_PER_WORKFLOW=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
API_RATE_LIMIT_ENABLED=true

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE_ENABLED=false
LOG_CONSOLE_ENABLED=true
LOG_FILE_PATH=./logs/app.log

# Monitoring & Metrics
PROMETHEUS_ENABLED=false
GRAFANA_ENABLED=false
GRAFANA_ADMIN_PASSWORD=admin123
SENTRY_DSN=your-sentry-dsn-here
NEW_RELIC_LICENSE_KEY=your-newrelic-key

# Development Tools
DEBUG=silhouette:*
HOT_RELOAD=true
SOURCE_MAPS=true
MOCK_SILHOUETTE_API=false

# Testing Configuration
TEST_DATABASE_URL=postgresql://haas:v6Ard2BhyygnhfzqoXR935n8oReEwRPc+wcEZEdhgeQ=@postgres:5432/haasdb_test
TEST_REDIS_URL=redis://:uHuFU3vfkvCHNDl9Z+XsB2sKiP1RsW1ifSWlxCzL9zs=@redis:6379/1
MOCK_EXTERNAL_SERVICES=true

# Performance Configuration
CACHE_TTL=3600
SESSION_TIMEOUT=86400
MAX_WORKFLOW_NODES=1000
MAX_WORKFLOW_EXECUTIONS_PER_DAY=10000

# Feature Flags
FEATURE_AI_AGENT_ENABLED=true
FEATURE_TEAM_COLLABORATION=true
FEATURE_ADVANCED_ANALYTICS=true
FEATURE_COST_TRACKING=true
FEATURE_AUDIT_LOGS=true
FEATURE_GIT_INTEGRATION=true
FEATURE_DARK_MODE=true

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30
HEALTH_CHECK_TIMEOUT=5000
HEALTH_CHECK_RETRIES=3
EOF

echo "✅ Variables de entorno configuradas"

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Instala Docker primero."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado. Instala Docker Compose primero."
    exit 1
fi

echo "🐳 Construyendo e iniciando contenedores..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

echo ""
echo "🎉 ¡INSTALACIÓN COMPLETADA!"
echo "================================"
echo ""
echo "🌐 URLs de acceso:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:3001"
echo "   API Doc:   http://localhost:3001/api/docs"
echo ""
echo "🔐 Credenciales por defecto:"
echo "   Usuario: admin@silhouette.com"
echo "   Password: admin123"
echo ""
echo "📊 Monitoreo (opcional):"
echo "   Grafana: http://localhost:3000:3000 (admin/admin123)"
echo ""
echo "✅ Silhouette está listo para usar con chat inteligente y workflows automáticos!"
echo ""
echo "Para ver los logs: docker-compose logs -f"