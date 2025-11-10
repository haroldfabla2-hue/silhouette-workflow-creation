#!/bin/bash

# ==================================================
# SILHOUETTE WORKFLOW CREATION - Quick Setup Script
# ==================================================
# Author: Silhouette Anonimo
# Version: 1.0.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message"
}

info() { log "INFO" "${BLUE}$*${NC}"; }
success() { log "SUCCESS" "${GREEN}$*${NC}"; }
warning() { log "WARNING" "${YELLOW}$*${NC}"; }
error() { log "ERROR" "${RED}$*${NC}"; }

show_banner() {
    echo -e "${BLUE}"
    cat << 'EOF'
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║    🚀 SILHOUETTE WORKFLOW CREATION - PRODUCTION SETUP 🚀     ║
║                                                               ║
║                    Author: Silhouette Anonimo                 ║
║                     Version: 1.0.0                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

check_system_requirements() {
    info "Checking system requirements..."
    
    # Check OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        info "✅ Linux detected"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        info "✅ macOS detected"
    else
        warning "⚠️  OS not fully tested: $OSTYPE"
    fi
    
    # Check available disk space (minimum 10GB)
    local available_space=$(df . | awk 'NR==2 {print $4}')
    local required_space=10485760  # 10GB in KB
    
    if [[ $available_space -gt $required_space ]]; then
        info "✅ Sufficient disk space available"
    else
        error "❌ Insufficient disk space. At least 10GB required."
        exit 1
    fi
    
    # Check available memory (minimum 8GB)
    if command -v free >/dev/null 2>&1; then
        local available_mem=$(free -m | awk 'NR==2{print $7}')
        if [[ $available_mem -gt 8192 ]]; then
            info "✅ Sufficient memory available"
        else
            warning "⚠️  Less than 8GB memory available. May experience performance issues."
        fi
    fi
}

check_docker() {
    info "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        error "❌ Docker is not installed"
        echo ""
        echo "Please install Docker:"
        echo "  Linux: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
        echo "  macOS: Download from https://www.docker.com/products/docker-desktop"
        echo ""
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        error "❌ Docker is not running or not accessible"
        echo "Please start Docker and ensure you have proper permissions."
        exit 1
    fi
    
    success "✅ Docker is installed and running"
    
    # Check Docker Compose
    if docker compose version >/dev/null 2>&1; then
        info "✅ Docker Compose (v2) is available"
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        info "✅ Docker Compose (v1) is available"
        COMPOSE_CMD="docker-compose"
    else
        error "❌ Docker Compose is not installed"
        exit 1
    fi
}

setup_environment() {
    info "Setting up environment..."
    
    # Create .env.production if it doesn't exist
    if [[ ! -f "$PROJECT_ROOT/$ENV_FILE" ]]; then
        info "Creating environment file..."
        cat > "$PROJECT_ROOT/$ENV_FILE" << 'EOF'
# ==================================================
# SILHOUETTE WORKFLOW CREATION - PRODUCTION ENVIRONMENT
# ==================================================
# Generated for Silhouette Anonimo
# Version: 1.0.0

# ==================================================
# DATABASE CONFIGURATION
# ==================================================

POSTGRES_USER=haas
POSTGRES_PASSWORD=CHANGE_THIS_SECURE_PASSWORD
POSTGRES_DB=haasdb
POSTGRES_PORT=5432

REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD
REDIS_PORT=6379

NEO4J_PASSWORD=CHANGE_THIS_NEO4J_PASSWORD
NEO4J_HTTP_PORT=7474
NEO4J_BOLT_PORT=7687

RABBITMQ_USER=haas
RABBITMQ_PASSWORD=CHANGE_THIS_RABBITMQ_PASSWORD
RABBITMQ_PORT=5672
RABBITMQ_MGMT_PORT=15672

# ==================================================
# SECURITY & ENCRYPTION
# ==================================================

JWT_SECRET_KEY=CHANGE_THIS_VERY_SECURE_JWT_SECRET_KEY_256_BITS
ENCRYPTION_KEY=CHANGE_THIS_ENCRYPTION_KEY_32_CHARS

# ==================================================
# APPLICATION CONFIGURATION
# ==================================================

APP_NAME=Silhouette Workflow Creation
APP_VERSION=1.0.0
APP_AUTHOR=Silhouette Anonimo
APP_ENVIRONMENT=production

NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3002

# ==================================================
# MONITORING
# ==================================================

GRAFANA_ADMIN_PASSWORD=CHANGE_THIS_GRAFANA_PASSWORD
GRAFANA_PORT=3003
PROMETHEUS_PORT=9090

# ==================================================
# LOGGING
# ==================================================

LOG_LEVEL=info
LOG_FORMAT=json
EOF
        success "✅ Environment file created: $ENV_FILE"
        warning "⚠️  Please update the password variables in $ENV_FILE before deployment"
    else
        info "✅ Environment file already exists"
    fi
    
    # Create necessary directories
    mkdir -p "$PROJECT_ROOT/backups"
    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/ssl"
    
    success "✅ Directories created"
}

build_images() {
    info "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    $COMPOSE_CMD -f "$COMPOSE_FILE" build --no-cache
    
    success "✅ Images built successfully"
}

start_services() {
    info "Starting services..."
    
    cd "$PROJECT_ROOT"
    
    # Start database services first
    info "Starting database services..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" up -d postgres redis neo4j rabbitmq
    
    # Wait for databases to be ready
    info "Waiting for databases to be ready..."
    sleep 60
    
    # Start application services
    info "Starting application services..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" up -d backend frontend
    
    # Start monitoring services (optional)
    if [[ "${INCLUDE_MONITORING:-true}" == "true" ]]; then
        info "Starting monitoring services..."
        $COMPOSE_CMD -f "$COMPOSE_FILE" --profile monitoring up -d prometheus grafana
    fi
    
    success "✅ Services started"
}

wait_for_health() {
    info "Waiting for services to be healthy..."
    
    local timeout=300  # 5 minutes
    local elapsed=0
    local interval=10
    
    while [[ $elapsed -lt $timeout ]]; do
        if check_health; then
            success "All services are healthy!"
            return 0
        fi
        
        info "Waiting for services... ($elapsed/$timeout seconds elapsed)"
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    error "Services did not become healthy within $timeout seconds"
    return 1
}

check_health() {
    cd "$PROJECT_ROOT"
    
    # Check if containers are running
    local running_containers=$($COMPOSE_CMD -f "$COMPOSE_FILE" ps --services --filter "status=running" | wc -l)
    local total_containers=$($COMPOSE_CMD -f "$COMPOSE_FILE" ps --services | wc -l)
    
    if [[ $running_containers -eq $total_containers ]] && [[ $total_containers -gt 0 ]]; then
        return 0
    else
        return 1
    fi
}

show_status() {
    info "Service status:"
    cd "$PROJECT_ROOT"
    $COMPOSE_CMD -f "$COMPOSE_FILE" ps
    
    echo ""
    info "Service URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:3001"
    echo "  Grafana: http://localhost:3003 (if monitoring enabled)"
    echo "  Prometheus: http://localhost:9090 (if monitoring enabled)"
    echo "  Neo4j Browser: http://localhost:7474"
    echo "  RabbitMQ Management: http://localhost:15672"
}

show_next_steps() {
    echo ""
    success "🎉 Silhouette Workflow Creation is now running!"
    echo ""
    echo "Next steps:"
    echo "1. Update passwords in $ENV_FILE"
    echo "2. Configure SSL certificates (optional)"
    echo "3. Set up monitoring and alerts"
    echo "4. Configure backup schedules"
    echo "5. Review security settings"
    echo ""
    echo "Useful commands:"
    echo "  View logs: ./scripts/deploy/docker-deploy.sh logs"
    echo "  Check health: ./scripts/deploy/docker-deploy.sh health"
    echo "  Stop services: ./scripts/deploy/docker-deploy.sh stop"
    echo "  Create backup: ./scripts/deploy/docker-deploy.sh backup"
    echo ""
    echo "For more information, see the deployment documentation."
}

main() {
    show_banner
    
    # Parse arguments
    local skip_build=false
    local skip_monitoring=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-build)
                skip_build=true
                shift
                ;;
            --no-monitoring)
                skip_monitoring=true
                export INCLUDE_MONITORING=false
                shift
                ;;
            -h|--help)
                cat << EOF
Usage: $0 [OPTIONS]

Options:
    --skip-build       Skip image building (use existing images)
    --no-monitoring    Don't start monitoring services
    -h, --help         Show this help

Examples:
    $0
    $0 --skip-build
    $0 --no-monitoring

EOF
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run setup steps
    check_system_requirements
    check_docker
    setup_environment
    
    if [[ "$skip_build" != "true" ]]; then
        build_images
    else
        info "Skipping image build (--skip-build specified)"
    fi
    
    start_services
    
    if wait_for_health; then
        show_status
        show_next_steps
    else
        error "Deployment completed but some services may not be healthy"
        show_status
        exit 1
    fi
}

# Run main function
main "$@"