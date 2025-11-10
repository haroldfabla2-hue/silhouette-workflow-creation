#!/bin/sh

# ==================================================
# SILHOUETTE WORKFLOW CREATION - Docker Entrypoint Script
# ==================================================
# Author: Silhouette Anonimo
# Version: 1.0.0

set -e

echo "🚀 Starting Silhouette Workflow Creation..."

# Function to wait for a service to be ready
wait_for_service() {
    local service_name=$1
    local check_command=$2
    local max_attempts=30
    local attempt=1

    echo "⏳ Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if eval $check_command; then
            echo "✅ $service_name is ready!"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts: $service_name not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ Failed to connect to $service_name after $max_attempts attempts"
    return 1
}

# Ensure required directories exist
echo "📁 Creating required directories..."
mkdir -p logs uploads tmp

# Set proper permissions
chmod 755 logs uploads tmp

# Set environment variables
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}
export HOSTNAME=${HOSTNAME:-0.0.0.0}

# Print startup information
echo "🌟 Application Details:"
echo "   Name: $APP_NAME"
echo "   Version: $APP_VERSION"
echo "   Author: $APP_AUTHOR"
echo "   Environment: $NODE_ENV"
echo "   Port: $PORT"
echo "   Host: $HOSTNAME"

# Wait for database services if in production mode
if [ "$NODE_ENV" = "production" ]; then
    echo "🔍 Checking database connectivity..."
    
    # Wait for PostgreSQL
    if command -v pg_isready >/dev/null 2>&1; then
        wait_for_service "PostgreSQL" "pg_isready -h ${POSTGRES_HOST:-localhost} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-haas}"
    fi
    
    # Wait for Redis
    if command -v redis-cli >/dev/null 2>&1; then
        wait_for_service "Redis" "redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} -a $REDIS_PASSWORD ping"
    fi
    
    # Wait for Neo4j
    if command -v cypher-shell >/dev/null 2>&1; then
        wait_for_service "Neo4j" "cypher-shell -u neo4j -p ${NEO4J_PASSWORD:-haaspass} 'RETURN 1'"
    fi
    
    # Wait for RabbitMQ
    if command -v rabbitmq-diagnostics >/dev/null 2>&1; then
        wait_for_service "RabbitMQ" "rabbitmq-diagnostics ping"
    fi
else
    # Development mode - use wait-for-it scripts
    echo "⏳ Waiting for database services (development mode)..."
    if [ -f "./scripts/wait-for-it.sh" ]; then
        ./scripts/wait-for-it.sh postgres:5432 -t 60 || echo "PostgreSQL not ready"
        ./scripts/wait-for-it.sh redis:6379 -t 60 || echo "Redis not ready"
        ./scripts/wait-for-it.sh neo4j:7687 -t 60 || echo "Neo4j not ready"
        ./scripts/wait-for-it.sh rabbitmq:5672 -t 60 || echo "RabbitMQ not ready"
    fi
fi

# Wait for Silhouette framework if available
if [ ! -z "$SILHOUETTE_API_URL" ]; then
    echo "⏳ Waiting for Silhouette framework..."
    if [ -f "./scripts/wait-for-it.sh" ]; then
        ./scripts/wait-for-it.sh ${SILHOUETTE_API_URL} -t 120 || echo "Silhouette framework not ready"
    fi
fi

# Initialize database if needed
if [ "$INIT_DATABASE" = "true" ]; then
    echo "🗄️ Initializing database..."
    npm run db:init || echo "Database initialization completed with warnings"
fi

# Run migrations if needed
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "🔄 Running database migrations..."
    npm run db:migrate || echo "Migrations completed with warnings"
fi

# Start the application
echo "🎯 Starting application with command: $@"
exec "$@"