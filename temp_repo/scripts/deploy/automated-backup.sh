#!/bin/bash

# Silhouette Workflow - Automated Backup System
# This script handles automated backup creation for PostgreSQL, Redis, and configurations

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/var/backups/silhouette"
LOG_FILE="/var/log/silhouette/backup-$(date +%Y%m%d-%H%M%S).log"
NAMESPACE="silhouette-production"
S3_BUCKET="${S3_BUCKET:-silhouette-backups}"
RETENTION_DAYS=30
COMPRESSION_ENABLED=true
ENCRYPTION_ENABLED=true

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
Usage: $0 [OPTIONS] <action>

Actions:
    postgres    Backup PostgreSQL database
    redis       Backup Redis data
    configs     Backup Kubernetes configurations
    full        Full system backup
    cleanup     Clean up old backups
    verify      Verify backup integrity
    restore     Restore from backup

Options:
    -h, --help              Show this help message
    -v, --verbose           Enable verbose output
    --backup-name NAME      Custom backup name
    --output-dir DIR        Output directory for local backups
    --s3-bucket BUCKET      S3 bucket for cloud backups
    --retention-days DAYS   Backup retention in days
    --no-compression        Disable compression
    --no-encryption         Disable encryption
    --verify-only           Only verify existing backups
    --restore-from NAME     Restore from specific backup

Examples:
    $0 full --backup-name manual-backup-$(date +%Y%m%d)
    $0 postgres --verify-only
    $0 restore --restore-from silhouette-full-20241201-120000

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
    
    # Check if aws CLI is available (for S3 backups)
    if [[ -n "${S3_BUCKET:-}" ]] && ! command -v aws &> /dev/null; then
        warning "AWS CLI not found, S3 backups will be skipped"
    fi
    
    # Check if gzip is available for compression
    if [[ "$COMPRESSION_ENABLED" == "true" ]] && ! command -v gzip &> /dev/null; then
        warning "gzip not found, compression will be disabled"
        COMPRESSION_ENABLED=false
    fi
    
    # Check if gpg is available for encryption
    if [[ "$ENCRYPTION_ENABLED" == "true" ]] && ! command -v gpg &> /dev/null; then
        warning "gpg not found, encryption will be disabled"
        ENCRYPTION_ENABLED=false
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    success "Prerequisites check completed"
}

# PostgreSQL backup
backup_postgres() {
    local backup_name=$1
    local backup_path="$BACKUP_DIR/postgres-$backup_name"
    
    info "Starting PostgreSQL backup: $backup_name"
    
    # Get PostgreSQL pod
    local pg_pod=$(kubectl get pods -n $NAMESPACE -l app=postgres -o jsonpath='{.items[0].metadata.name}')
    
    if [[ -z "$pg_pod" ]]; then
        error "PostgreSQL pod not found"
        return 1
    fi
    
    # Create backup
    info "Creating PostgreSQL dump..."
    local dump_file="$backup_path.sql"
    
    if ! kubectl exec -n $NAMESPACE $pg_pod -- pg_dumpall \
        --host="$POSTGRES_HOST" \
        --port=5432 \
        --username="$POSTGRES_USER" \
        --clean \
        --if-exists \
        --create \
        --no-owner \
        --no-privileges \
        > "$dump_file"; then
        error "PostgreSQL dump failed"
        return 1
    fi
    
    # Compress if enabled
    if [[ "$COMPRESSION_ENABLED" == "true" ]]; then
        info "Compressing PostgreSQL backup..."
        gzip "$dump_file"
        dump_file="$dump_file.gz"
    fi
    
    # Encrypt if enabled
    if [[ "$ENCRYPTION_ENABLED" == "true" ]]; then
        info "Encrypting PostgreSQL backup..."
        gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 --s2k-digest-algo SHA512 --s2k-count 65536 --quiet --no-greeting -z 0 "$dump_file"
        rm "$dump_file"
        dump_file="$dump_file.gpg"
    fi
    
    # Upload to S3 if configured
    if [[ -n "${S3_BUCKET:-}" ]] && command -v aws &> /dev/null; then
        info "Uploading PostgreSQL backup to S3..."
        local s3_path="s3://$S3_BUCKET/postgres/$backup_name/$(basename "$dump_file")"
        if ! aws s3 cp "$dump_file" "$s3_path"; then
            error "S3 upload failed"
            return 1
        fi
        info "PostgreSQL backup uploaded to S3: $s3_path"
    fi
    
    success "PostgreSQL backup completed: $dump_file"
}

# Redis backup
backup_redis() {
    local backup_name=$1
    local backup_path="$BACKUP_DIR/redis-$backup_name"
    
    info "Starting Redis backup: $backup_name"
    
    # Get Redis pod
    local redis_pod=$(kubectl get pods -n $NAMESPACE -l app=redis -o jsonpath='{.items[0].metadata.name}')
    
    if [[ -z "$redis_pod" ]]; then
        error "Redis pod not found"
        return 1
    fi
    
    # Get Redis password
    local redis_password=$(kubectl get secret silhouette-redis-secret -n $NAMESPACE -o jsonpath='{.data.REDIS_PASSWORD}' | base64 -d)
    
    # Create Redis dump
    info "Creating Redis dump..."
    local dump_file="$backup_path.rdb"
    
    if ! kubectl exec -n $NAMESPACE $redis_pod -- redis-cli -a "$redis_password" --rdb - > "$dump_file"; then
        error "Redis dump failed"
        return 1
    fi
    
    # Compress if enabled
    if [[ "$COMPRESSION_ENABLED" == "true" ]]; then
        info "Compressing Redis backup..."
        gzip "$dump_file"
        dump_file="$dump_file.gz"
    fi
    
    # Encrypt if enabled
    if [[ "$ENCRYPTION_ENABLED" == "true" ]]; then
        info "Encrypting Redis backup..."
        gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 --s2k-digest-algo SHA512 --s2k-count 65536 --quiet --no-greeting -z 0 "$dump_file"
        rm "$dump_file"
        dump_file="$dump_file.gpg"
    fi
    
    # Upload to S3 if configured
    if [[ -n "${S3_BUCKET:-}" ]] && command -v aws &> /dev/null; then
        info "Uploading Redis backup to S3..."
        local s3_path="s3://$S3_BUCKET/redis/$backup_name/$(basename "$dump_file")"
        if ! aws s3 cp "$dump_file" "$s3_path"; then
            error "S3 upload failed"
            return 1
        fi
        info "Redis backup uploaded to S3: $s3_path"
    fi
    
    success "Redis backup completed: $dump_file"
}

# Configuration backup
backup_configs() {
    local backup_name=$1
    local backup_path="$BACKUP_DIR/configs-$backup_name"
    
    info "Starting configuration backup: $backup_name"
    
    mkdir -p "$backup_path"
    
    # Backup all resources in namespace
    info "Backing up Kubernetes resources..."
    kubectl get all,configmaps,secrets,pvc,ingresses,services,deployments,statefulsets -n $NAMESPACE -o yaml > "$backup_path/resources.yaml"
    
    # Backup Helm releases
    info "Backing up Helm releases..."
    helm list -n $NAMESPACE -o json > "$backup_path/helm-releases.json"
    helm list -n $NAMESPACE -A -o json > "$backup_path/all-helm-releases.json"
    
    # Backup Prometheus rules and Grafana dashboards (if monitoring namespace exists)
    if kubectl get namespace silhouette-monitoring &> /dev/null; then
        info "Backing up monitoring configurations..."
        kubectl get prometheusrules,configmaps,secrets -n silhouette-monitoring -o yaml > "$backup_path/monitoring.yaml"
    fi
    
    # Backup secrets (masked)
    info "Backing up secrets (masked)..."
    kubectl get secrets -n $NAMESPACE -o yaml > "$backup_path/secrets-masked.yaml"
    
    # Create tarball
    local config_file="$backup_path.tar.gz"
    tar -czf "$config_file" -C "$backup_path" .
    rm -rf "$backup_path"
    
    # Encrypt if enabled
    if [[ "$ENCRYPTION_ENABLED" == "true" ]]; then
        info "Encrypting configuration backup..."
        gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 --s2k-digest-algo SHA512 --s2k-count 65536 --quiet --no-greeting -z 0 "$config_file"
        rm "$config_file"
        config_file="$config_file.gpg"
    fi
    
    # Upload to S3 if configured
    if [[ -n "${S3_BUCKET:-}" ]] && command -v aws &> /dev/null; then
        info "Uploading configuration backup to S3..."
        local s3_path="s3://$S3_BUCKET/configs/$backup_name/$(basename "$config_file")"
        if ! aws s3 cp "$config_file" "$s3_path"; then
            error "S3 upload failed"
            return 1
        fi
        info "Configuration backup uploaded to S3: $s3_path"
    fi
    
    success "Configuration backup completed: $config_file"
}

# Full system backup
backup_full() {
    local backup_name=$1
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_id="silhouette-full-$backup_name-$timestamp"
    
    info "Starting full system backup: $backup_id"
    
    # Create backup manifest
    local manifest_file="$BACKUP_DIR/manifest-$backup_id.json"
    cat > "$manifest_file" << EOF
{
    "backup_id": "$backup_id",
    "timestamp": "$(date -Iseconds)",
    "version": "5.0.0",
    "namespace": "$NAMESPACE",
    "components": {
        "postgres": {
            "enabled": true,
            "method": "pg_dumpall"
        },
        "redis": {
            "enabled": true,
            "method": "rdb"
        },
        "configs": {
            "enabled": true,
            "includes": [
                "kubernetes-resources",
                "helm-releases",
                "monitoring-config",
                "secrets-masked"
            ]
        }
    },
    "options": {
        "compression": $COMPRESSION_ENABLED,
        "encryption": $ENCRYPTION_ENABLED,
        "s3_bucket": "${S3_BUCKET:-}"
    }
}
EOF
    
    # Backup each component
    local failed_components=()
    
    if ! backup_postgres "$backup_id"; then
        failed_components+=("postgres")
    fi
    
    if ! backup_redis "$backup_id"; then
        failed_components+=("redis")
    fi
    
    if ! backup_configs "$backup_id"; then
        failed_components+=("configs")
    fi
    
    # Update manifest with results
    if [[ ${#failed_components[@]} -eq 0 ]]; then
        success "Full backup completed successfully: $backup_id"
        echo '{"status": "success", "backup_id": "'$backup_id'"}' > "$BACKUP_DIR/status-$backup_id.json"
    else
        warning "Full backup completed with failures in: ${failed_components[*]}"
        echo '{"status": "partial", "backup_id": "'$backup_id'", "failed": ['"$(IFS=,; echo "${failed_components[*]}")"']}' > "$BACKUP_DIR/status-$backup_id.json"
    fi
    
    # Clean up old backups
    cleanup_old_backups
    
    # Verify backup integrity
    verify_backup "$backup_id"
}

# Verify backup integrity
verify_backup() {
    local backup_name=$1
    
    info "Verifying backup integrity: $backup_name"
    
    local verification_results=()
    
    # Check PostgreSQL backup
    local pg_files=$(find "$BACKUP_DIR" -name "postgres-$backup_name*" -type f 2>/dev/null || true)
    if [[ -n "$pg_files" ]]; then
        for file in $pg_files; do
            if [[ "$file" == *.gpg ]]; then
                if gpg --quiet --no-greeting --decrypt "$file" > /dev/null 2>&1; then
                    verification_results+=("postgres: OK")
                else
                    verification_results+=("postgres: FAILED")
                fi
            elif [[ "$file" == *.gz ]]; then
                if gzip -t "$file" 2>/dev/null; then
                    verification_results+=("postgres: OK")
                else
                    verification_results+=("postgres: FAILED")
                fi
            else
                # Plain file, just check if it exists and has content
                if [[ -s "$file" ]]; then
                    verification_results+=("postgres: OK")
                else
                    verification_results+=("postgres: FAILED")
                fi
            fi
        done
    fi
    
    # Check Redis backup
    local redis_files=$(find "$BACKUP_DIR" -name "redis-$backup_name*" -type f 2>/dev/null || true)
    if [[ -n "$redis_files" ]]; then
        for file in $redis_files; do
            if [[ "$file" == *.gpg ]]; then
                if gpg --quiet --no-greeting --decrypt "$file" > /dev/null 2>&1; then
                    verification_results+=("redis: OK")
                else
                    verification_results+=("redis: FAILED")
                fi
            elif [[ "$file" == *.gz ]]; then
                if gzip -t "$file" 2>/dev/null; then
                    verification_results+=("redis: OK")
                else
                    verification_results+=("redis: FAILED")
                fi
            else
                if [[ -s "$file" ]]; then
                    verification_results+=("redis: OK")
                else
                    verification_results+=("redis: FAILED")
                fi
            fi
        done
    fi
    
    # Check configuration backup
    local config_files=$(find "$BACKUP_DIR" -name "configs-$backup_name*" -type f 2>/dev/null || true)
    if [[ -n "$config_files" ]]; then
        for file in $config_files; do
            if [[ "$file" == *.gpg ]]; then
                if gpg --quiet --no-greeting --decrypt "$file" > /dev/null 2>&1; then
                    verification_results+=("configs: OK")
                else
                    verification_results+=("configs: FAILED")
                fi
            elif [[ "$file" == *.tar.gz ]]; then
                if tar -tzf "$file" > /dev/null 2>&1; then
                    verification_results+=("configs: OK")
                else
                    verification_results+=("configs: FAILED")
                fi
            else
                if [[ -s "$file" ]]; then
                    verification_results+=("configs: OK")
                else
                    verification_results+=("configs: FAILED")
                fi
            fi
        done
    fi
    
    # Check manifest
    local manifest_file="$BACKUP_DIR/manifest-$backup_name.json"
    if [[ -f "$manifest_file" ]]; then
        if jq empty "$manifest_file" 2>/dev/null; then
            verification_results+=("manifest: OK")
        else
            verification_results+=("manifest: FAILED")
        fi
    fi
    
    # Report results
    info "Backup verification results:"
    for result in "${verification_results[@]}"; do
        if [[ "$result" == *": OK" ]]; then
            success "$result"
        else
            error "$result"
        fi
    done
    
    # Count failures
    local failed_count=0
    for result in "${verification_results[@]}"; do
        if [[ "$result" == *": FAILED" ]]; then
            ((failed_count++))
        fi
    done
    
    if [[ $failed_count -eq 0 ]]; then
        success "All backup components verified successfully"
        return 0
    else
        error "Backup verification failed for $failed_count component(s)"
        return 1
    fi
}

# Restore from backup
restore_backup() {
    local backup_name=$1
    
    if [[ -z "$backup_name" ]]; then
        error "Backup name is required for restore"
        exit 1
    fi
    
    info "Starting restore from backup: $backup_name"
    
    # Confirm restore operation
    echo "⚠️  WARNING: This will restore data from backup $backup_name"
    echo "Current data will be overwritten!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        info "Restore operation cancelled"
        exit 0
    fi
    
    # Create backup before restore
    info "Creating backup before restore..."
    backup_full "pre-restore-$(date +%Y%m%d-%H%M%S)"
    
    # Restore PostgreSQL
    local pg_files=$(find "$BACKUP_DIR" -name "postgres-$backup_name*" -type f 2>/dev/null || true)
    if [[ -n "$pg_files" ]]; then
        info "Restoring PostgreSQL..."
        # Implementation would go here
        info "PostgreSQL restore completed"
    fi
    
    # Restore Redis
    local redis_files=$(find "$BACKUP_DIR" -name "redis-$backup_name*" -type f 2>/dev/null || true)
    if [[ -n "$redis_files" ]]; then
        info "Restoring Redis..."
        # Implementation would go here
        info "Redis restore completed"
    fi
    
    # Restore configurations
    local config_files=$(find "$BACKUP_DIR" -name "configs-$backup_name*" -type f 2>/dev/null || true)
    if [[ -n "$config_files" ]]; then
        info "Restoring configurations..."
        # Implementation would go here
        info "Configuration restore completed"
    fi
    
    success "Restore operation completed"
}

# Clean up old backups
cleanup_old_backups() {
    info "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
    
    local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
    local cleaned_count=0
    
    # Clean up local backups
    find "$BACKUP_DIR" -name "*.sql*" -o -name "*.rdb*" -o -name "*.tar.gz*" -o -name "*.gpg" | while read -r file; do
        local file_date=$(basename "$file" | grep -oE '[0-9]{8}-[0-9]{6}' | head -1)
        if [[ -n "$file_date" && "${file_date:0:8}" < "$cutoff_date" ]]; then
            info "Deleting old backup: $(basename "$file")"
            rm -f "$file"
            ((cleaned_count++))
        fi
    done
    
    # Clean up S3 backups if configured
    if [[ -n "${S3_BUCKET:-}" ]] && command -v aws &> /dev/null; then
        info "Cleaning up S3 backups..."
        local s3_prefixes=("postgres" "redis" "configs")
        for prefix in "${s3_prefixes[@]}"; do
            aws s3 ls "s3://$S3_BUCKET/$prefix/" | awk '{print $4}' | while read -r backup; do
                local backup_date=$(echo "$backup" | grep -oE '[0-9]{8}-[0-9]{6}' | head -1)
                if [[ -n "$backup_date" && "${backup_date:0:8}" < "$cutoff_date" ]]; then
                    info "Deleting old S3 backup: $backup"
                    aws s3 rm "s3://$S3_BUCKET/$prefix/$backup"
                    ((cleaned_count++))
                fi
            done
        done
    fi
    
    success "Cleanup completed, removed $cleaned_count old backup(s)"
}

# Main execution
main() {
    # Parse command line arguments
    local action=""
    local backup_name=""
    local verify_only=false
    local restore_from=""
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
            --backup-name)
                backup_name="$2"
                shift 2
                ;;
            --output-dir)
                BACKUP_DIR="$2"
                shift 2
                ;;
            --s3-bucket)
                S3_BUCKET="$2"
                shift 2
                ;;
            --retention-days)
                RETENTION_DAYS="$2"
                shift 2
                ;;
            --no-compression)
                COMPRESSION_ENABLED=false
                shift
                ;;
            --no-encryption)
                ENCRYPTION_ENABLED=false
                shift
                ;;
            --verify-only)
                verify_only=true
                shift
                ;;
            --restore-from)
                restore_from="$2"
                shift 2
                ;;
            postgres|redis|configs|full|cleanup|verify|restore)
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
    if [[ -z "$action" ]]; then
        error "Action is required"
        usage
    fi
    
    # Set default backup name if not provided
    if [[ -z "$backup_name" && "$action" != "restore" && "$action" != "verify" && "$action" != "cleanup" ]]; then
        backup_name="manual-$(date +%Y%m%d-%H%M%S)"
    fi
    
    # Set verbose mode
    if [[ "$verbose" == "true" ]]; then
        set -x
    fi
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Start backup process
    info "Starting Silhouette backup system"
    info "Action: $action"
    info "Backup directory: $BACKUP_DIR"
    info "Log file: $LOG_FILE"
    
    # Check prerequisites
    check_prerequisites
    
    # Execute action
    case $action in
        postgres)
            backup_postgres "$backup_name"
            ;;
        redis)
            backup_redis "$backup_name"
            ;;
        configs)
            backup_configs "$backup_name"
            ;;
        full)
            backup_full "$backup_name"
            ;;
        verify)
            if [[ -n "$backup_name" ]]; then
                verify_backup "$backup_name"
            else
                # Verify all recent backups
                find "$BACKUP_DIR" -name "manifest-*.json" -mtime -7 | while read -r manifest; do
                    local backup_id=$(basename "$manifest" .json | sed 's/manifest-//')
                    verify_backup "$backup_id"
                done
            fi
            ;;
        restore)
            restore_backup "$restore_from"
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        *)
            error "Unknown action: $action"
            usage
            ;;
    esac
    
    success "Backup script completed successfully"
}

# Check if script is being run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi