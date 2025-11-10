#!/bin/bash

# ==================================================
# SILHOUETTE WORKFLOW CREATION - Deployment Verification Script
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
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message"
}

info() { log "INFO" "${BLUE}$*${NC}"; }
success() { 
    log "SUCCESS" "${GREEN}✅ $*${NC}"
    ((PASSED_CHECKS++))
}
warning() { 
    log "WARNING" "${YELLOW}⚠️  $*${NC}"
    ((WARNING_CHECKS++))
}
error() { 
    log "ERROR" "${RED}❌ $*${NC}"
    ((FAILED_CHECKS++))
}
pass() { 
    log "PASS" "${GREEN}✓ $*${NC}"
    ((PASSED_CHECKS++))
}

show_header() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║    🔍 SILHOUETTE DEPLOYMENT VERIFICATION 🔍                  ║"
    echo "║                                                               ║"
    echo "║                    Author: Silhouette Anonimo                ║"
    echo "║                     Version: 1.0.0                           ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

check_file_exists() {
    local file=$1
    local description=$2
    
    ((TOTAL_CHECKS++))
    if [[ -f "$PROJECT_ROOT/$file" ]]; then
        pass "$description exists: $file"
        return 0
    else
        error "$description missing: $file"
        return 1
    fi
}

check_directory_exists() {
    local dir=$1
    local description=$2
    
    ((TOTAL_CHECKS++))
    if [[ -d "$PROJECT_ROOT/$dir" ]]; then
        pass "$description exists: $dir"
        return 0
    else
        error "$description missing: $dir"
        return 1
    fi
}

check_docker() {
    ((TOTAL_CHECKS++))
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            pass "Docker is installed and running"
            return 0
        else
            error "Docker is installed but not running"
            return 1
        fi
    else
        error "Docker is not installed"
        return 1
    fi
}

check_docker_compose() {
    ((TOTAL_CHECKS++))
    if docker compose version &> /dev/null; then
        pass "Docker Compose v2 is available"
        COMPOSE_CMD="docker compose"
        return 0
    elif command -v docker-compose &> /dev/null; then
        pass "Docker Compose v1 is available"
        COMPOSE_CMD="docker-compose"
        return 0
    else
        error "Docker Compose is not available"
        return 1
    fi
}

check_environment_file() {
    ((TOTAL_CHECKS++))
    if [[ -f "$PROJECT_ROOT/$ENV_FILE" ]]; then
        # Check for required variables
        local required_vars=("POSTGRES_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET_KEY" "ENCRYPTION_KEY")
        local missing_vars=()
        
        for var in "${required_vars[@]}"; do
            if ! grep -q "^${var}=" "$PROJECT_ROOT/$ENV_FILE" || grep -q "^${var}=CHANGE_THIS" "$PROJECT_ROOT/$ENV_FILE"; then
                missing_vars+=("$var")
            fi
        done
        
        if [[ ${#missing_vars[@]} -eq 0 ]]; then
            pass "Environment file is properly configured"
            return 0
        else
            warning "Environment file exists but has unconfigured variables: ${missing_vars[*]}"
            return 1
        fi
    else
        error "Environment file missing: $ENV_FILE"
        return 1
    fi
}

check_docker_compose_file() {
    ((TOTAL_CHECKS++))
    if [[ -f "$PROJECT_ROOT/$COMPOSE_FILE" ]]; then
        # Validate YAML syntax
        if command -v yamllint &> /dev/null; then
            if yamllint "$PROJECT_ROOT/$COMPOSE_FILE" &> /dev/null; then
                pass "Docker Compose file is valid YAML"
            else
                warning "Docker Compose file has YAML syntax issues"
            fi
        else
            pass "Docker Compose file exists (yamllint not available for validation)"
        fi
        return 0
    else
        error "Docker Compose file missing: $COMPOSE_FILE"
        return 1
    fi
}

check_required_files() {
    info "Checking required configuration files..."
    
    check_file_exists "$COMPOSE_FILE" "Docker Compose file"
    check_file_exists "$ENV_FILE" "Environment file"
    check_file_exists "config/nginx/nginx.prod.conf" "Nginx configuration"
    check_file_exists "config/prometheus/prometheus.yml" "Prometheus configuration"
    check_file_exists "config/grafana/provisioning/datasources/prometheus.yml" "Grafana configuration"
}

check_required_directories() {
    info "Checking required directories..."
    
    check_directory_exists "backups" "Backups directory"
    check_directory_exists "logs" "Logs directory"
    check_directory_exists "scripts" "Scripts directory"
    check_directory_exists "config" "Config directory"
}

check_docker_images() {
    ((TOTAL_CHECKS++))
    if [[ -f "$PROJECT_ROOT/backend/Dockerfile.prod" ]]; then
        pass "Backend Dockerfile exists"
    else
        error "Backend Dockerfile missing"
    fi
    
    ((TOTAL_CHECKS++))
    if [[ -f "$PROJECT_ROOT/frontend/Dockerfile.prod" ]]; then
        pass "Frontend Dockerfile exists"
    else
        error "Frontend Dockerfile missing"
    fi
}

check_scripts() {
    info "Checking deployment scripts..."
    
    check_file_exists "scripts/setup-production.sh" "Setup script"
    check_file_exists "scripts/deploy/docker-deploy.sh" "Deployment script"
    check_file_exists "scripts/docker-entrypoint.sh" "Docker entrypoint script"
    check_file_exists "scripts/health-check.sh" "Health check script"
    
    # Check if scripts are executable
    ((TOTAL_CHECKS++))
    if [[ -x "$PROJECT_ROOT/scripts/setup-production.sh" ]]; then
        pass "Setup script is executable"
    else
        error "Setup script is not executable"
    fi
}

check_port_availability() {
    info "Checking port availability..."
    
    local ports=(80 443 3000 3001 5432 6379 7474 7687 15672 9090 3003)
    local available_ports=0
    
    for port in "${ports[@]}"; do
        if ! netstat -tuln 2>/dev/null | grep -q ":$port " && ! lsof -i ":$port" &> /dev/null; then
            ((available_ports++))
        fi
    done
    
    ((TOTAL_CHECKS++))
    if [[ $available_ports -eq ${#ports[@]} ]]; then
        pass "All required ports are available"
    else
        warning "Some ports may be in use ($available_ports/${#ports[@]} available)"
    fi
}

check_system_resources() {
    info "Checking system resources..."
    
    # Check memory
    ((TOTAL_CHECKS++))
    if command -v free &> /dev/null; then
        local available_mem_kb=$(free | awk 'NR==2{print $7}')
        local available_mem_gb=$((available_mem_kb / 1024 / 1024))
        
        if [[ $available_mem_gb -ge 8 ]]; then
            pass "Sufficient memory available: ${available_mem_gb}GB"
        elif [[ $available_mem_gb -ge 4 ]]; then
            warning "Moderate memory available: ${available_mem_gb}GB (8GB+ recommended)"
        else
            error "Insufficient memory: ${available_mem_gb}GB (8GB+ required)"
        fi
    else
        warning "Cannot check memory (free command not available)"
    fi
    
    # Check disk space
    ((TOTAL_CHECKS++))
    local available_space_kb=$(df . | awk 'NR==2{print $4}')
    local available_space_gb=$((available_space_kb / 1024 / 1024))
    
    if [[ $available_space_gb -ge 50 ]]; then
        pass "Sufficient disk space: ${available_space_gb}GB"
    elif [[ $available_space_gb -ge 20 ]]; then
        warning "Moderate disk space: ${available_space_gb}GB (50GB+ recommended)"
    else
        error "Insufficient disk space: ${available_space_gb}GB (50GB+ required)"
    fi
}

check_security_configuration() {
    info "Checking security configuration..."
    
    # Check if SSL directory exists
    ((TOTAL_CHECKS++))
    if [[ -d "$PROJECT_ROOT/config/nginx/ssl" ]]; then
        pass "SSL directory exists"
        
        # Check for SSL certificates
        if [[ -f "$PROJECT_ROOT/config/nginx/ssl/cert.pem" && -f "$PROJECT_ROOT/config/nginx/ssl/key.pem" ]]; then
            pass "SSL certificates found"
        else
            warning "SSL certificates not found (required for HTTPS)"
        fi
    else
        warning "SSL directory does not exist"
    fi
    
    # Check for security headers in Nginx config
    ((TOTAL_CHECKS++))
    if grep -q "X-Frame-Options" "$PROJECT_ROOT/config/nginx/nginx.prod.conf" 2>/dev/null; then
        pass "Security headers configured in Nginx"
    else
        warning "Security headers not found in Nginx configuration"
    fi
}

check_monitoring_configuration() {
    info "Checking monitoring configuration..."
    
    # Check Prometheus rules
    ((TOTAL_CHECKS++))
    if [[ -f "$PROJECT_ROOT/config/prometheus/rules/silhouette.yml" ]]; then
        pass "Prometheus alerting rules configured"
    else
        warning "Prometheus alerting rules not found"
    fi
    
    # Check Grafana dashboards
    ((TOTAL_CHECKS++))
    if [[ -f "$PROJECT_ROOT/config/grafana/dashboards/silhouette-overview.json" ]]; then
        pass "Grafana dashboard configured"
    else
        warning "Grafana dashboard not found"
    fi
}

test_docker_compose_syntax() {
    info "Testing Docker Compose configuration..."
    
    ((TOTAL_CHECKS++))
    if cd "$PROJECT_ROOT" && $COMPOSE_CMD -f "$COMPOSE_FILE" config -q; then
        pass "Docker Compose configuration is valid"
    else
        error "Docker Compose configuration has errors"
    fi
}

run_comprehensive_check() {
    info "Running comprehensive deployment verification..."
    
    # Basic checks
    check_docker
    check_docker_compose
    check_system_resources
    check_port_availability
    
    # Configuration checks
    check_required_files
    check_required_directories
    check_docker_images
    check_scripts
    check_environment_file
    check_docker_compose_file
    
    # Advanced checks
    check_security_configuration
    check_monitoring_configuration
    test_docker_compose_syntax
}

show_summary() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "                    VERIFICATION SUMMARY"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "Total Checks:    $TOTAL_CHECKS"
    echo "Passed:          $PASSED_CHECKS"
    echo "Warnings:        $WARNING_CHECKS"
    echo "Failed:          $FAILED_CHECKS"
    echo ""
    
    local success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo "Success Rate:    $success_rate%"
    echo ""
    
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        if [[ $WARNING_CHECKS -eq 0 ]]; then
            echo -e "${GREEN}🎉 PERFECT! All checks passed successfully!${NC}"
            echo ""
            echo "Your Silhouette deployment is ready for production!"
            echo "Next steps:"
            echo "1. Run: ./scripts/setup-production.sh"
            echo "2. Configure SSL certificates if needed"
            echo "3. Update monitoring and alerting"
        else
            echo -e "${YELLOW}⚠️  Good! Minor issues detected but deployment is feasible.${NC}"
            echo ""
            echo "Review the warnings above and consider addressing them."
        fi
    else
        echo -e "${RED}❌ Issues detected that need to be resolved before deployment.${NC}"
        echo ""
        echo "Please fix the failed checks and run this script again."
    fi
    
    echo ""
    echo "For detailed help, see: ./DEPLOYMENT.md"
    echo "═══════════════════════════════════════════════════════════════"
}

main() {
    show_header
    
    # Change to project directory
    cd "$PROJECT_ROOT"
    
    # Run all checks
    run_comprehensive_check
    
    # Show summary
    show_summary
    
    # Exit with appropriate code
    if [[ $FAILED_CHECKS -gt 0 ]]; then
        exit 1
    elif [[ $WARNING_CHECKS -gt 0 ]]; then
        exit 2
    else
        exit 0
    fi
}

# Run main function
main "$@"