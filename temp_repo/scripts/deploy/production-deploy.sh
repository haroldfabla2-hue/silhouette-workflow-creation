#!/bin/bash

# ==================================================
# SILHOUETTE WORKFLOW CREATION - Production Deployment Script
# ==================================================
# Author: Silhouette Anonimo
# Version: 1.0.0
# This script handles the complete production deployment process using Docker Compose

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="/var/log/silhouette/deployment-$(date +%Y%m%d-%H%M%S).log"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

info() { log "INFO" "${BLUE}$*${NC}"; }
success() { log "SUCCESS" "${GREEN}$*${NC}"; }
warning() { log "WARNING" "${YELLOW}$*${NC}"; }
error() { log "ERROR" "${RED}$*${NC}"; }

# Usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS] <environment> <action>

Environments:
    staging    Deploy to staging environment
    production Deploy to production environment

Actions:
    deploy     Full deployment
    rollback   Rollback to previous version
    health     Check deployment health
    backup     Create backup before deployment
    restore    Restore from backup
    cleanup    Clean up old resources

Options:
    -h, --help              Show this help message
    -v, --verbose           Enable verbose output
    --dry-run               Show what would be done without executing
    --skip-backup           Skip backup creation
    --image-tag TAG         Specific image tag to deploy
    --timeout TIMEOUT       Deployment timeout (default: 15m)
    --namespace NS          Kubernetes namespace (default: silhouette-production)

Examples:
    $0 production deploy --image-tag v5.0.0
    $0 production rollback --dry-run
    $0 staging health
    $0 production backup

EOF
    exit 0
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if helm is available
    if ! command -v helm &> /dev/null; then
        error "helm is not installed or not in PATH"
        exit 1
    fi
    
    # Check if aws CLI is available (if using AWS)
    if [[ "${USE_AWS:-false}" == "true" ]] && ! command -v aws &> /dev/null; then
        error "aws CLI is not installed or not in PATH"
        exit 1
    fi
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check helm connection
    if ! helm list &> /dev/null; then
        error "Cannot connect to Helm"
        exit 1
    fi
    
    success "All prerequisites met"
}

# Create backup
create_backup() {
    local environment=$1
    local backup_name="silhouette-$environment-$(date +%Y%m%d-%H%M%S)"
    
    info "Creating backup: $backup_name"
    
    # Database backup
    if kubectl get pvc postgresql-pvc -n $NAMESPACE &> /dev/null; then
        info "Backing up PostgreSQL data..."
        kubectl create job --from=cronjob/postgres-backup postgres-backup-$backup_name -n $NAMESPACE || true
    fi
    
    # Redis backup
    if kubectl get pvc redis-pvc -n $NAMESPACE &> /dev/null; then
        info "Backing up Redis data..."
        kubectl create job --from=cronjob/redis-backup redis-backup-$backup_name -n $NAMESPACE || true
    fi
    
    # Configuration backup
    info "Backing up configurations..."
    kubectl get all,configmaps,secrets,pvc -n $NAMESPACE -o yaml > /tmp/$backup_name-resources.yaml
    
    # Store backup to S3
    if [[ "${USE_AWS:-false}" == "true" ]]; then
        info "Uploading backup to S3..."
        aws s3 cp /tmp/$backup_name-resources.yaml s3://silhouette-backups/$environment/$backup_name-resources.yaml
        rm /tmp/$backup_name-resources.yaml
    fi
    
    # Cleanup old backups
    cleanup_old_backups "$environment"
    
    success "Backup completed: $backup_name"
}

# Restore from backup
restore_backup() {
    local environment=$1
    local backup_name=$2
    
    if [[ -z "$backup_name" ]]; then
        error "Backup name is required for restore"
        exit 1
    fi
    
    info "Restoring from backup: $backup_name"
    
    # Download backup from S3 if not local
    if [[ "${USE_AWS:-false}" == "true" ]]; then
        info "Downloading backup from S3..."
        aws s3 cp s3://silhouette-backups/$environment/$backup_name-resources.yaml /tmp/$backup_name-resources.yaml
    fi
    
    # Apply backup
    info "Restoring resources..."
    kubectl apply -f /tmp/$backup_name-resources.yaml -n $NAMESPACE
    
    # Restore database
    if kubectl get job postgres-restore-$backup_name -n $NAMESPACE &> /dev/null; then
        info "Restoring PostgreSQL data..."
        kubectl create job --from=cronjob/postgres-restore postgres-restore-$backup_name -n $NAMESPACE
    fi
    
    # Restore Redis
    if kubectl get job redis-restore-$backup_name -n $NAMESPACE &> /dev/null; then
        info "Restoring Redis data..."
        kubectl create job --from=cronjob/redis-restore redis-restore-$backup_name -n $NAMESPACE
    fi
    
    # Cleanup
    rm -f /tmp/$backup_name-resources.yaml
    
    success "Restore completed: $backup_name"
}

# Deploy application
deploy_application() {
    local environment=$1
    local image_tag=${IMAGE_TAG:-latest}
    local timeout=${TIMEOUT:-15m}
    
    info "Starting deployment to $environment (image: $image_tag)"
    
    # Pre-deployment checks
    info "Running pre-deployment checks..."
    if ! run_pre_deployment_checks "$environment"; then
        error "Pre-deployment checks failed"
        exit 1
    fi
    
    # Create backup if not skipped
    if [[ "${SKIP_BACKUP:-false}" != "true" ]]; then
        create_backup "$environment"
    fi
    
    # Scale down replicas
    info "Scaling down replicas..."
    kubectl scale deployment $HELM_RELEASE-backend -n $NAMESPACE --replicas=0 --timeout=5m
    kubectl scale deployment $HELM_RELEASE-frontend -n $NAMESPACE --replicas=0 --timeout=5m
    
    # Update Helm values
    local values_file="$PROJECT_ROOT/config/helm/silhouette-workflow/values-$environment.yaml"
    if [[ ! -f "$values_file" ]]; then
        error "Values file not found: $values_file"
        exit 1
    fi
    
    # Update image tags
    sed -i "s|tag: .*|tag: $image_tag|g" "$values_file"
    
    # Deploy with Helm
    info "Deploying with Helm..."
    local helm_args=(
        upgrade
        --install
        "$HELM_RELEASE"
        "$PROJECT_ROOT/config/helm/silhouette-workflow"
        --namespace "$NAMESPACE"
        --create-namespace
        --values "$values_file"
        --set global.environment="$environment"
        --set backend.image.tag="$image_tag"
        --set frontend.image.tag="$image_tag"
        --wait
        --timeout="$timeout"
    )
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        info "DRY RUN: Would execute: helm ${helm_args[*]}"
    else
        if ! helm "${helm_args[@]}"; then
            error "Helm deployment failed"
            rollback_application "$environment" "$image_tag"
            exit 1
        fi
    fi
    
    # Post-deployment validation
    if ! run_post_deployment_validation "$environment"; then
        error "Post-deployment validation failed"
        rollback_application "$environment" "$image_tag"
        exit 1
    fi
    
    # Scale up replicas
    info "Scaling up replicas..."
    kubectl scale deployment $HELM_RELEASE-backend -n $NAMESPACE --replicas=3 --timeout=5m
    kubectl scale deployment $HELM_RELEASE-frontend -n $NAMESPACE --replicas=2 --timeout=5m
    
    # Wait for readiness
    info "Waiting for application to be ready..."
    kubectl wait --for=condition=available --timeout=10m deployment/$HELM_RELEASE-backend -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=10m deployment/$HELM_RELEASE-frontend -n $NAMESPACE
    
    success "Deployment completed successfully"
    
    # Run smoke tests
    run_smoke_tests "$environment"
    
    # Send notifications
    send_deployment_notification "$environment" "success" "$image_tag"
}

# Rollback application
rollback_application() {
    local environment=$1
    local previous_tag=$2
    
    info "Rolling back to previous version..."
    
    # Get previous release
    local previous_release=$(helm history $HELM_RELEASE -n $NAMESPACE --max=2 --output json | jq -r '.[0].revision')
    
    if [[ "$previous_release" != "null" ]]; then
        helm rollback $HELM_RELEASE $previous_release -n $NAMESPACE --wait --timeout=10m
        success "Rollback completed to revision $previous_release"
    else
        warning "No previous release found for rollback"
    fi
    
    # Send notification
    send_deployment_notification "$environment" "rollback" "$previous_tag"
}

# Check application health
check_health() {
    local environment=$1
    
    info "Checking application health..."
    
    # Check pod status
    info "Checking pod status..."
    kubectl get pods -n $NAMESPACE -l app.kubernetes.io/instance=$HELM_RELEASE
    
    # Check service status
    info "Checking service status..."
    kubectl get services -n $NAMESPACE -l app.kubernetes.io/instance=$HELM_RELEASE
    
    # Check ingress status
    info "Checking ingress status..."
    kubectl get ingress -n $NAMESPACE -l app.kubernetes.io/instance=$HELM_RELEASE
    
    # Check resource usage
    info "Checking resource usage..."
    kubectl top pods -n $NAMESPACE || warning "Metrics server not available"
    
    # Run health endpoint tests
    local backend_url=$(kubectl get service $HELM_RELEASE-backend -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    local frontend_url=$(kubectl get service $HELM_RELEASE-frontend -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    
    if [[ -n "$backend_url" ]]; then
        info "Testing backend health endpoint..."
        if curl -f -s "http://$backend_url/health" > /dev/null; then
            success "Backend health check passed"
        else
            error "Backend health check failed"
        fi
    fi
    
    if [[ -n "$frontend_url" ]]; then
        info "Testing frontend health endpoint..."
        if curl -f -s "http://$frontend_url/_next/health" > /dev/null; then
            success "Frontend health check passed"
        else
            error "Frontend health check failed"
        fi
    fi
}

# Run pre-deployment checks
run_pre_deployment_checks() {
    local environment=$1
    
    # Check if namespace exists
    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        error "Namespace $NAMESPACE does not exist"
        return 1
    fi
    
    # Check if release exists
    if ! helm list -n $NAMESPACE | grep -q "^$HELM_RELEASE"; then
        warning "Helm release $HELM_RELEASE does not exist in $NAMESPACE"
    fi
    
    # Check cluster resources
    info "Checking cluster resources..."
    local available_cpu=$(kubectl get nodes -o jsonpath='{.items[*].status.allocatable.cpu}' | awk '{sum+=$1} END {print sum}')
    local available_memory=$(kubectl get nodes -o jsonpath='{.items[*].status.allocatable.memory}' | awk '{sum+=$1} END {print sum}')
    
    info "Available CPU: $available_cpu"
    info "Available Memory: $available_memory"
    
    # Check required secrets
    local required_secrets=("silhouette-postgres-secret" "silhouette-redis-secret" "silhouette-jwt-secret")
    for secret in "${required_secrets[@]}"; do
        if ! kubectl get secret $secret -n $NAMESPACE &> /dev/null; then
            error "Required secret $secret not found"
            return 1
        fi
    done
    
    # Check image availability
    if [[ -n "${IMAGE_TAG:-}" ]]; then
        info "Checking image availability..."
        if ! docker pull "$IMAGE_TAG" &> /dev/null; then
            error "Image $IMAGE_TAG not available"
            return 1
        fi
    fi
    
    return 0
}

# Run post-deployment validation
run_post_deployment_validation() {
    local environment=$1
    
    # Check pod status
    local backend_pods=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/instance=$HELM_RELEASE,app.kubernetes.io/component=backend --no-headers | wc -l)
    local frontend_pods=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/instance=$HELM_RELEASE,app.kubernetes.io/component=frontend --no-headers | wc -l)
    
    if [[ $backend_pods -eq 0 ]]; then
        error "No backend pods found"
        return 1
    fi
    
    if [[ $frontend_pods -eq 0 ]]; then
        error "No frontend pods found"
        return 1
    fi
    
    # Check for failed pods
    local failed_pods=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/instance=$HELM_RELEASE --field-selector=status.phase=Failed --no-headers | wc -l)
    if [[ $failed_pods -gt 0 ]]; then
        error "Found $failed_pods failed pods"
        return 1
    fi
    
    # Check services
    local backend_service=$(kubectl get service $HELM_RELEASE-backend -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    local frontend_service=$(kubectl get service $HELM_RELEASE-frontend -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    
    if [[ -z "$backend_service" && -z "$frontend_service" ]]; then
        error "No services have load balancer ingress"
        return 1
    fi
    
    return 0
}

# Run smoke tests
run_smoke_tests() {
    local environment=$1
    
    info "Running smoke tests..."
    
    # Install newman if not available
    if ! command -v newman &> /dev/null; then
        info "Installing Newman for API testing..."
        npm install -g newman
    fi
    
    # Run API tests
    local test_file="$PROJECT_ROOT/tests/api/smoke-tests.json"
    if [[ -f "$test_file" ]]; then
        local env_file="$PROJECT_ROOT/tests/environments/$environment.postman_environment.json"
        if [[ -f "$env_file" ]]; then
            info "Running API smoke tests..."
            if newman run "$test_file" --environment "$env_file" --reporters cli,html --reporter-html-export "/tmp/smoke-test-report.html"; then
                success "Smoke tests passed"
            else
                warning "Some smoke tests failed"
            fi
        else
            warning "Environment file not found: $env_file"
        fi
    else
        warning "Test file not found: $test_file"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    local environment=$1
    
    if [[ "${USE_AWS:-false}" == "true" ]]; then
        info "Cleaning up old backups..."
        aws s3 ls s3://silhouette-backups/$environment/ | awk '{print $4}' | while read -r backup; do
            local backup_date=$(echo "$backup" | grep -oE '[0-9]{8}-[0-9]{6}')
            if [[ -n "$backup_date" ]]; then
                local backup_timestamp=$(date -d "${backup_date:0:8} ${backup_date:9:2}:${backup_date:11:2}:${backup_date:13:2}" +%s)
                local cutoff_timestamp=$(date -d "$BACKUP_RETENTION_DAYS days ago" +%s)
                if [[ $backup_timestamp -lt $cutoff_timestamp ]]; then
                    info "Deleting old backup: $backup"
                    aws s3 rm s3://silhouette-backups/$environment/$backup
                fi
            fi
        done
    fi
}

# Send deployment notification
send_deployment_notification() {
    local environment=$1
    local status=$2
    local image_tag=$3
    
    local message=""
    case $status in
        "success")
            message="✅ Deployment to $environment completed successfully (tag: $image_tag)"
            ;;
        "rollback")
            message="🔄 Rollback to $environment completed (tag: $image_tag)"
            ;;
        "failed")
            message="❌ Deployment to $environment failed (tag: $image_tag)"
            ;;
    esac
    
    # Send to Slack if webhook is configured
    if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK" || true
    fi
    
    # Send to email if configured
    if [[ -n "${EMAIL_NOTIFICATION:-}" ]]; then
        echo "$message" | mail -s "Silhouette Deployment Notification" "$EMAIL_NOTIFICATION" || true
    fi
    
    info "Notification sent: $message"
}

# Cleanup old resources
cleanup_resources() {
    local environment=$1
    
    info "Cleaning up old resources..."
    
    # Remove old pods
    kubectl delete pods -n $NAMESPACE -l app.kubernetes.io/instance=$HELM_RELEASE --field-selector=status.phase=Succeeded --ignore-not-found=true
    
    # Remove completed jobs
    kubectl delete jobs -n $NAMESPACE --field-selector=status.successful=1 --ignore-not-found=true
    
    # Clean up old PVCs
    kubectl get pvc -n $NAMESPACE -o name | while read -r pvc; do
        local age=$(kubectl get "$pvc" -n $NAMESPACE -o jsonpath='{.metadata.creationTimestamp}')
        local age_days=$(( ($(date +%s) - $(date -d "$age" +%s)) / 86400 ))
        if [[ $age_days -gt 7 ]]; then
            info "Cleaning up old PVC: $pvc"
            kubectl delete "$pvc" -n $NAMESPACE --ignore-not-found=true
        fi
    done
    
    success "Cleanup completed"
}

# Main execution
main() {
    # Parse command line arguments
    local environment=""
    local action=""
    local verbose=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            --dry-run)
                export DRY_RUN=true
                shift
                ;;
            --skip-backup)
                export SKIP_BACKUP=true
                shift
                ;;
            --image-tag)
                export IMAGE_TAG="$2"
                shift 2
                ;;
            --timeout)
                export TIMEOUT="$2"
                shift 2
                ;;
            --namespace)
                export NAMESPACE="$2"
                shift 2
                ;;
            staging|production)
                environment="$1"
                shift
                ;;
            deploy|rollback|health|backup|restore|cleanup)
                action="$1"
                shift
                ;;
            *)
                error "Unknown argument: $1"
                usage
                ;;
        esac
    done
    
    # Validate arguments
    if [[ -z "$environment" || -z "$action" ]]; then
        error "Environment and action are required"
        usage
    fi
    
    # Set verbose mode
    if [[ "$verbose" == "true" ]]; then
        set -x
    fi
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Start deployment
    info "Starting Silhouette deployment script"
    info "Environment: $environment"
    info "Action: $action"
    info "Namespace: $NAMESPACE"
    info "Log file: $LOG_FILE"
    
    # Check prerequisites
    check_prerequisites
    
    # Execute action
    case $action in
        deploy)
            deploy_application "$environment"
            ;;
        rollback)
            rollback_application "$environment" "${IMAGE_TAG:-previous}"
            ;;
        health)
            check_health "$environment"
            ;;
        backup)
            create_backup "$environment"
            ;;
        restore)
            restore_backup "$environment" "${IMAGE_TAG:-}"
            ;;
        cleanup)
            cleanup_resources "$environment"
            ;;
        *)
            error "Unknown action: $action"
            usage
            ;;
    esac
    
    success "Deployment script completed successfully"
}

# Check if script is being run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi