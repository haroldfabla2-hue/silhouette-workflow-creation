#!/bin/bash

# ==================================================
# SILHOUETTE WORKFLOW CREATION - Docker Compose Deployment Script
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

# Logging functions
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

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
COMPOSE_PROJECT_NAME="silhouette"

# Function to show usage
usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Commands:
    start       Start all services
    stop        Stop all services
    restart     Restart all services
    build       Build all images
    logs        Show logs from all services
    status      Show status of all services
    health      Check health of all services
    deploy      Full deployment (build + start)
    backup      Create backup of data volumes
    restore     Restore from backup
    cleanup     Clean up old containers and images
    update      Update and restart services

Options:
    -h, --help          Show this help
    -v, --verbose       Enable verbose output
    --no-cache          Build without cache
    --parallel          Run operations in parallel

Examples:
    $0 deploy --verbose
    $0 logs -f backend
    $0 health
    $0 backup

EOF
    exit 0
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check if .env.production file exists
    if [[ ! -f "$PROJECT_ROOT/$ENV_FILE" ]]; then
        error "Environment file not found: $ENV_FILE"
        exit 1
    fi
    
    # Check if docker-compose.prod.yml exists
    if [[ ! -f "$PROJECT_ROOT/$COMPOSE_FILE" ]]; then
        error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    success "All prerequisites met"
}

# Build images
build_images() {
    local no_cache=${1:-false}
    
    info "Building Docker images..."
    cd "$PROJECT_ROOT"
    
    local build_args=(
        -f "$COMPOSE_FILE"
        --project-name "$COMPOSE_PROJECT_NAME"
    )
    
    if [[ "$no_cache" == "true" ]]; then
        build_args+=(--no-cache)
    fi
    
    build_args+=(build)
    
    if [[ "${VERBOSE:-false}" == "true" ]]; then
        docker compose "${build_args[@]}"
    else
        docker compose "${build_args[@]}" > /dev/null 2>&1
    fi
    
    success "Images built successfully"
}

# Start services
start_services() {
    info "Starting services..."
    cd "$PROJECT_ROOT"
    
    docker compose -f "$COMPOSE_FILE" --project-name "$COMPOSE_PROJECT_NAME" up -d
    
    success "Services started successfully"
}

# Stop services
stop_services() {
    info "Stopping services..."
    cd "$PROJECT_ROOT"
    
    docker compose -f "$COMPOSE_FILE" --project-name "$COMPOSE_PROJECT_NAME" down
    
    success "Services stopped successfully"
}

# Restart services
restart_services() {
    info "Restarting services..."
    cd "$PROJECT_ROOT"
    
    docker compose -f "$COMPOSE_FILE" --project-name "$COMPOSE_PROJECT_NAME" restart
    
    success "Services restarted successfully"
}

# Show logs
show_logs() {
    local service=${1:-}
    local follow=${2:-false}
    
    cd "$PROJECT_ROOT"
    
    local log_args=(
        -f "$COMPOSE_FILE"
        --project-name "$COMPOSE_PROJECT_NAME"
        logs
    )
    
    if [[ "$follow" == "true" ]]; then
        log_args+=(-f)
    fi
    
    if [[ -n "$service" ]]; then
        log_args+=("$service")
    fi
    
    docker compose "${log_args[@]}"
}

# Show status
show_status() {
    info "Service status:"
    cd "$PROJECT_ROOT"
    
    docker compose -f "$COMPOSE_FILE" --project-name "$COMPOSE_PROJECT_NAME" ps
}

# Check health
check_health() {
    info "Checking service health..."
    
    local services=("postgres" "redis" "neo4j" "rabbitmq" "backend" "frontend")
    local healthy_count=0
    local total_count=${#services[@]}
    
    for service in "${services[@]}"; do
        if docker compose -f "$COMPOSE_FILE" --project-name "$COMPOSE_PROJECT_NAME" ps "$service" | grep -q "healthy\|Up"; then
            success "$service: Healthy"
            ((healthy_count++))
        else
            error "$service: Unhealthy"
        fi
    done
    
    info "Health summary: $healthy_count/$total_count services healthy"
    
    if [[ $healthy_count -eq $total_count ]]; then
        success "All services are healthy"
        return 0
    else
        warning "Some services are not healthy"
        return 1
    fi
}

# Create backup
create_backup() {
    local backup_name="silhouette-backup-$(date +%Y%m%d-%H%M%S)"
    local backup_dir="$PROJECT_ROOT/backups/$backup_name"
    
    info "Creating backup: $backup_name"
    
    # Create backup directory
    mkdir -p "$backup_dir"
    
    # Backup volumes
    local volumes=("postgres_data_prod" "redis_data_prod" "neo4j_data_prod" "rabbitmq_data_prod")
    
    for volume in "${volumes[@]}"; do
        info "Backing up volume: $volume"
        docker run --rm -v "${COMPOSE_PROJECT_NAME}_$volume":/source -v "$backup_dir":/backup alpine tar czf "/backup/${volume}.tar.gz" -C /source .
    done
    
    # Backup configurations
    info "Backing up configurations..."
    cp -r "$PROJECT_ROOT/config" "$backup_dir/"
    cp "$PROJECT_ROOT/$COMPOSE_FILE" "$backup_dir/"
    cp "$PROJECT_ROOT/$ENV_FILE" "$backup_dir/"
    
    # Compress backup
    cd "$PROJECT_ROOT/backups"
    tar czf "${backup_name}.tar.gz" "$backup_name"
    rm -rf "$backup_name"
    
    success "Backup created: $backup_name.tar.gz"
    
    # Clean old backups
    cleanup_old_backups
}

# Restore from backup
restore_backup() {
    local backup_file=$1
    
    if [[ -z "$backup_file" ]]; then
        error "Backup file name is required"
        return 1
    fi
    
    local backup_path="$PROJECT_ROOT/backups/$backup_file"
    
    if [[ ! -f "$backup_path" ]]; then
        error "Backup file not found: $backup_path"
        return 1
    fi
    
    info "Restoring from backup: $backup_file"
    
    # Stop services
    stop_services
    
    # Extract backup
    local temp_dir=$(mktemp -d)
    cd "$temp_dir"
    tar xzf "$backup_path"
    
    # Stop containers to allow volume restoration
    cd "$PROJECT_ROOT"
    
    # Restore volumes
    local volumes=("postgres_data_prod" "redis_data_prod" "neo4j_data_prod" "rabbitmq_data_prod")
    
    for volume in "${volumes[@]}"; do
        info "Restoring volume: $volume"
        docker run --rm -v "${COMPOSE_PROJECT_NAME}_$volume":/target -v "$temp_dir":/source alpine sh -c "rm -rf /target/* && tar xzf /source/${volume}.tar.gz -C /target"
    done
    
    # Clean up
    rm -rf "$temp_dir"
    
    # Start services
    start_services
    
    success "Restore completed successfully"
}

# Cleanup old resources
cleanup_resources() {
    info "Cleaning up old resources..."
    
    # Remove stopped containers
    docker container prune -f
    
    # Remove dangling images
    docker image prune -f
    
    # Remove unused volumes (be careful with this)
    read -p "This will remove unused volumes. Continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker volume prune -f
    fi
    
    # Remove old backups (older than 30 days)
    find "$PROJECT_ROOT/backups" -name "*.tar.gz" -mtime +30 -delete 2>/dev/null || true
    
    success "Cleanup completed"
}

# Clean old backups
cleanup_old_backups() {
    local retention_days=30
    find "$PROJECT_ROOT/backups" -name "*.tar.gz" -mtime +$retention_days -delete 2>/dev/null || true
}

# Update services
update_services() {
    info "Updating services..."
    
    # Pull latest images
    info "Pulling latest images..."
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" --project-name "$COMPOSE_PROJECT_NAME" pull
    
    # Rebuild with cache
    build_images false
    
    # Restart services
    restart_services
    
    success "Update completed"
}

# Wait for services to be ready
wait_for_services() {
    info "Waiting for services to be ready..."
    
    local timeout=300  # 5 minutes
    local elapsed=0
    local interval=10
    
    while [[ $elapsed -lt $timeout ]]; do
        if check_health > /dev/null 2>&1; then
            success "All services are ready"
            return 0
        fi
        
        info "Waiting for services... ($elapsed/$timeout seconds)"
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    error "Services did not become ready within $timeout seconds"
    return 1
}

# Full deployment
deploy() {
    info "Starting full deployment..."
    
    # Build images
    if [[ "${NO_CACHE:-false}" == "true" ]]; then
        build_images true
    else
        build_images false
    fi
    
    # Stop existing services
    stop_services
    
    # Start services
    start_services
    
    # Wait for services to be ready
    wait_for_services
    
    # Show final status
    show_status
    
    success "Deployment completed successfully"
}

# Main function
main() {
    local command=""
    local verbose=false
    local no_cache=false
    local parallel=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            --no-cache)
                no_cache=true
                shift
                ;;
            --parallel)
                parallel=true
                shift
                ;;
            start|stop|restart|build|logs|status|health|deploy|backup|restore|cleanup|update)
                command="$1"
                shift
                ;;
            -f)
                show_logs "" true
                exit 0
                ;;
            *)
                error "Unknown argument: $1"
                usage
                ;;
        esac
    done
    
    # Set global variables
    export VERBOSE="$verbose"
    export NO_CACHE="$no_cache"
    export PARALLEL="$parallel"
    
    # Validate command
    if [[ -z "$command" ]]; then
        error "Command is required"
        usage
    fi
    
    # Create necessary directories
    mkdir -p "$PROJECT_ROOT/backups"
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Start execution
    info "Starting Silhouette deployment"
    info "Command: $command"
    info "Project root: $PROJECT_ROOT"
    
    # Check prerequisites
    check_prerequisites
    
    # Execute command
    case $command in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        build)
            build_images "$no_cache"
            ;;
        logs)
            show_logs "" false
            ;;
        status)
            show_status
            ;;
        health)
            check_health
            ;;
        deploy)
            deploy
            ;;
        backup)
            create_backup
            ;;
        restore)
            backup_file=$1
            if [[ -z "$backup_file" ]]; then
                error "Please specify backup file: $0 restore <backup-file>"
                exit 1
            fi
            restore_backup "$backup_file"
            ;;
        cleanup)
            cleanup_resources
            ;;
        update)
            update_services
            ;;
        *)
            error "Unknown command: $command"
            usage
            ;;
    esac
    
    success "Command completed successfully"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi