#!/bin/sh

# ==================================================
# SILHOUETTE WORKFLOW CREATION - Health Check Script
# ==================================================
# Author: Silhouette Anonimo
# Version: 1.0.0

set -e

# Configuration
HEALTH_CHECK_URL=${HEALTH_CHECK_URL:-http://localhost:${PORT:-3000}/health}
HEALTH_CHECK_TIMEOUT=${HEALTH_CHECK_TIMEOUT:-10}
HEALTH_CHECK_RETRIES=${HEALTH_CHECK_RETRIES:-3}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🏥 Silhouette Health Check"
echo "URL: $HEALTH_CHECK_URL"
echo "Timeout: ${HEALTH_CHECK_TIMEOUT}s"
echo "Retries: $HEALTH_CHECK_RETRIES"
echo "================================"

# Function to check HTTP endpoint
check_http_endpoint() {
    local url=$1
    local timeout=$2
    local max_retries=$3
    local attempt=1
    
    while [ $attempt -le $max_retries ]; do
        echo "Attempt $attempt/$max_retries: Checking $url..."
        
        # Use curl with timeout and check response
        if curl -f -s -m $timeout "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Health check passed!${NC}"
            echo "Service is healthy and responding correctly."
            return 0
        else
            echo -e "${YELLOW}⚠️ Health check failed on attempt $attempt${NC}"
            if [ $attempt -lt $max_retries ]; then
                echo "Waiting 2 seconds before retry..."
                sleep 2
            fi
        fi
        
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ Health check failed after $max_retries attempts${NC}"
    echo "Service may be starting up or experiencing issues."
    return 1
}

# Function to check database connectivity
check_database() {
    echo "🗄️ Checking database connectivity..."
    
    # Check PostgreSQL
    if command -v pg_isready >/dev/null 2>&1; then
        if pg_isready -h ${POSTGRES_HOST:-localhost} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-haas} -t 5 >/dev/null 2>&1; then
            echo "✅ PostgreSQL: Connected"
        else
            echo "❌ PostgreSQL: Connection failed"
            return 1
        fi
    fi
    
    # Check Redis
    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} -a $REDIS_PASSWORD --no-auth-warning ping >/dev/null 2>&1; then
            echo "✅ Redis: Connected"
        else
            echo "❌ Redis: Connection failed"
            return 1
        fi
    fi
    
    # Check Neo4j
    if command -v cypher-shell >/dev/null 2>&1; then
        if cypher-shell -u neo4j -p ${NEO4J_PASSWORD:-haaspass} -d system "RETURN 1" >/dev/null 2>&1; then
            echo "✅ Neo4j: Connected"
        else
            echo "❌ Neo4j: Connection failed"
            return 1
        fi
    fi
    
    # Check RabbitMQ
    if command -v rabbitmq-diagnostics >/dev/null 2>&1; then
        if rabbitmq-diagnostics ping >/dev/null 2>&1; then
            echo "✅ RabbitMQ: Connected"
        else
            echo "❌ RabbitMQ: Connection failed"
            return 1
        fi
    fi
    
    echo -e "${GREEN}✅ All databases are healthy${NC}"
    return 0
}

# Function to check system resources
check_system_resources() {
    echo "💻 Checking system resources..."
    
    # Check memory usage
    memory_usage=$(free | grep Mem | awk '{printf("%.1f"), $3/$2 * 100.0}')
    echo "Memory usage: ${memory_usage}%"
    
    # Check disk usage
    disk_usage=$(df -h / | awk 'NR==2{printf "%s", $5}')
    echo "Disk usage: $disk_usage"
    
    # Check CPU load (simple check)
    load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    echo "Load average: $load_avg"
    
    return 0
}

# Main health check logic
main() {
    echo "🔍 Starting comprehensive health check..."
    
    # Check system resources first
    check_system_resources
    echo ""
    
    # Check databases
    if ! check_database; then
        echo -e "${RED}❌ Database health check failed${NC}"
        exit 1
    fi
    echo ""
    
    # Check application endpoint
    if ! check_http_endpoint "$HEALTH_CHECK_URL" "$HEALTH_CHECK_TIMEOUT" "$HEALTH_CHECK_RETRIES"; then
        echo -e "${RED}❌ Application health check failed${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}🎉 All health checks passed successfully!${NC}"
    echo "Service is ready to receive requests."
    exit 0
}

# Run the health check
main "$@"