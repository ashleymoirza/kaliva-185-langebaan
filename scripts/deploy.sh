#!/usr/bin/env bash
# Kaliva 185 Langebaan — Deployment Script
# Usage: ./deploy.sh [staging|production] [version-tag]
# Run from the project root on the VPS

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-staging}"
VERSION="${2:-latest}"
PROJECT_NAME="kaliva185"
DEPLOY_USER="kaliva"
DEPLOY_BASE="/var/www"
APP_DIR="${DEPLOY_BASE}/${PROJECT_NAME}-${ENVIRONMENT}"
SHARED_DIR="${DEPLOY_BASE}/${PROJECT_NAME}-shared"
BACKUP_DIR="${DEPLOY_BASE}/${PROJECT_NAME}-backups"
NGINX_CONF_SOURCE="/opt/kaliva185-deploy/nginx/kaliva185.conf"
NGINX_CONF_DEST="/etc/nginx/sites-available/kaliva185-${ENVIRONMENT}"
SYSTEMD_SERVICE_SOURCE="/opt/kaliva185-deploy/systemd/kaliva185-${ENVIRONMENT}.service"
SYSTEMD_SERVICE_DEST="/etc/systemd/system/kaliva185-${ENVIRONMENT}.service"
ENV_FILE_SOURCE="/opt/kaliva185-deploy/env/${ENVIRONMENT}.env"
ENV_FILE_DEST="/etc/kaliva185/${ENVIRONMENT}.env"

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Check if running as root (required for systemd/nginx operations)
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (sudo)"
        exit 1
    fi
}

# Validate environment argument
validate_environment() {
    if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
        log_error "Invalid environment: $ENVIRONMENT. Use 'staging' or 'production'"
        exit 1
    fi
}

# Check required files exist
check_required_files() {
    local missing=0
    for file in "$NGINX_CONF_SOURCE" "$SYSTEMD_SERVICE_SOURCE" "$ENV_FILE_SOURCE"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file not found: $file"
            missing=1
        fi
    done
    if [[ $missing -eq 1 ]]; then
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    log_info "Creating directories..."
    mkdir -p "$APP_DIR" "$SHARED_DIR" "$BACKUP_DIR" "/etc/kaliva185" "/var/log/kaliva185"
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_BASE" "/var/log/kaliva185" "/etc/kaliva185"
    chmod 750 "/etc/kaliva185"
}

# Backup current deployment
backup_current() {
    if [[ -d "$APP_DIR/.next" ]]; then
        local timestamp=$(date +%Y%m%d-%H%M%S)
        local backup_name="${PROJECT_NAME}-${ENVIRONMENT}-${timestamp}"
        log_info "Backing up current deployment to $BACKUP_DIR/$backup_name"
        cp -r "$APP_DIR" "$BACKUP_DIR/$backup_name"
        # Keep only last 5 backups
        ls -dt "$BACKUP_DIR/${PROJECT_NAME}-${ENVIRONMENT}-"* | tail -n +6 | xargs rm -rf
    fi
}

# Deploy application files
deploy_app() {
    log_info "Deploying application files..."

    # Copy standalone build
    if [[ -d ".next/standalone" ]]; then
        rsync -av --delete .next/standalone/ "$APP_DIR/"
    else
        log_error "No standalone build found. Run 'npm run build' first."
        exit 1
    fi

    # Copy static files
    if [[ -d ".next/static" ]]; then
        mkdir -p "$APP_DIR/.next/static"
        rsync -av --delete .next/static/ "$APP_DIR/.next/static/"
    fi

    # Copy public assets
    if [[ -d "public" ]]; then
        rsync -av --delete public/ "$APP_DIR/public/"
    fi

    # Copy prisma schema for migrations
    if [[ -d "prisma" ]]; then
        rsync -av --delete prisma/ "$APP_DIR/prisma/"
    fi

    # Set ownership
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"
}

# Configure environment
configure_environment() {
    log_info "Configuring environment..."

    if [[ -f "$ENV_FILE_DEST" ]]; then
        log_warning "Environment file already exists at $ENV_FILE_DEST. Skipping copy."
        log_warning "If you need to update it, edit it manually or remove it first."
    else
        cp "$ENV_FILE_SOURCE" "$ENV_FILE_DEST"
        chown "$DEPLOY_USER:$DEPLOY_USER" "$ENV_FILE_DEST"
        chmod 600 "$ENV_FILE_DEST"
        log_warning "IMPORTANT: Edit $ENV_FILE_DEST with real values before starting the service!"
    fi
}

# Configure Nginx
configure_nginx() {
    log_info "Configuring Nginx..."

    # Determine which server block to enable based on environment
    local nginx_conf="/etc/nginx/sites-available/kaliva185-${ENVIRONMENT}"

    # Copy the main config
    cp "$NGINX_CONF_SOURCE" "$nginx_conf"

    # Enable site
    ln -sf "$nginx_conf" "/etc/nginx/sites-enabled/kaliva185-${ENVIRONMENT}"

    # Test Nginx configuration
    if nginx -t; then
        log_success "Nginx configuration test passed"
    else
        log_error "Nginx configuration test failed"
        exit 1
    fi
}

# Configure systemd service
configure_systemd() {
    log_info "Configuring systemd service..."

    cp "$SYSTEMD_SERVICE_SOURCE" "$SYSTEMD_SERVICE_DEST"
    systemctl daemon-reload
    systemctl enable "kaliva185-${ENVIRONMENT}"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    cd "$APP_DIR"
    sudo -u "$DEPLOY_USER" npx prisma migrate deploy
}

# Health check
health_check() {
    local max_attempts=30
    local attempt=1
    local url="http://localhost:3000/api/health"

    log_info "Waiting for application to be healthy..."

    while [[ $attempt -le $max_attempts ]]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            log_success "Health check passed!"
            return 0
        fi
        log_info "Attempt $attempt/$max_attempts: waiting for app..."
        sleep 2
        ((attempt++))
    done

    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Start/restart service
start_service() {
    log_info "Starting service kaliva185-${ENVIRONMENT}..."

    systemctl restart "kaliva185-${ENVIRONMENT}"

    if health_check; then
        log_success "Service started successfully"
    else
        log_error "Service failed to start properly"
        journalctl -u "kaliva185-${ENVIRONMENT}" --no-pager -n 50
        exit 1
    fi
}

# Reload Nginx
reload_nginx() {
    log_info "Reloading Nginx..."
    systemctl reload nginx
}

# Post-deployment verification
verify_deployment() {
    log_info "Verifying deployment..."

    local base_url
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        base_url="https://staging.kaliva185.duckdns.org"
    else
        base_url="https://kaliva185.duckdns.org"
    fi

    # Check main page
    if curl -sf -o /dev/null -w "%{http_code}" "$base_url" | grep -q "^200$"; then
        log_success "Main page accessible"
    else
        log_warning "Main page check failed (may need DNS/SSL setup)"
    fi

    # Check API health
    if curl -sf -o /dev/null -w "%{http_code}" "$base_url/api/health" | grep -q "^200$"; then
        log_success "API health endpoint accessible"
    else
        log_warning "API health check failed"
    fi

    log_info "Deployment verification complete"
}

# Rollback function
rollback() {
    log_warning "Rolling back to previous deployment..."

    local latest_backup=$(ls -dt "$BACKUP_DIR/${PROJECT_NAME}-${ENVIRONMENT}-"* 2>/dev/null | head -1)

    if [[ -z "$latest_backup" ]]; then
        log_error "No backup found to rollback to"
        exit 1
    fi

    log_info "Restoring from $latest_backup"
    rm -rf "$APP_DIR"
    cp -r "$latest_backup" "$APP_DIR"
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

    systemctl restart "kaliva185-${ENVIRONMENT}"

    if health_check; then
        log_success "Rollback completed successfully"
    else
        log_error "Rollback failed"
        exit 1
    fi
}

# Main deployment flow
main() {
    log_info "Starting deployment for $ENVIRONMENT (version: $VERSION)"

    check_root
    validate_environment
    check_required_files
    create_directories
    backup_current
    deploy_app
    configure_environment
    configure_nginx
    configure_systemd
    run_migrations
    start_service
    reload_nginx
    verify_deployment

    log_success "Deployment completed successfully!"
    log_info "Environment: $ENVIRONMENT"
    log_info "App directory: $APP_DIR"
    log_info "Environment file: $ENV_FILE_DEST (EDIT THIS WITH REAL VALUES)"
}

# Handle command line arguments
case "${1:-}" in
    rollback)
        check_root
        validate_environment
        rollback
        ;;
    *)
        main
        ;;
esac