#!/bin/bash
# Blue-Green Deployment Script
# Manages zero-downtime deployments using blue-green strategy

set -euo pipefail

# Configuration
PROJECT_DIR="${PROJECT_DIR:-/opt/theeeecopy}"
BLUE_PORT="${BLUE_PORT:-3001}"
GREEN_PORT="${GREEN_PORT:-3002}"
NGINX_CONFIG="${NGINX_CONFIG:-/etc/nginx/sites-available/theeeecopy}"
APP_NAME="theeeecopy"
HEALTH_ENDPOINT="${HEALTH_ENDPOINT:-/health}"
START_COMMAND="${START_COMMAND:-pnpm}"
START_COMMAND_ARGS="${START_COMMAND_ARGS:---filter @the-copy/backend start:prod}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get current active environment from nginx config
get_active_environment() {
    if [ ! -f "$NGINX_CONFIG" ]; then
        echo "none"
        return
    fi
    
    # Use portable grep with basic regex
    local active_port=$(grep -o 'localhost:[0-9][0-9]*' "$NGINX_CONFIG" | head -1 | cut -d: -f2)
    
    if [ "$active_port" = "$BLUE_PORT" ]; then
        echo "blue"
    elif [ "$active_port" = "$GREEN_PORT" ]; then
        echo "green"
    else
        echo "none"
    fi
}

# Get target environment (opposite of active)
get_target_environment() {
    local active=$(get_active_environment)
    
    if [ "$active" = "blue" ]; then
        echo "green"
    elif [ "$active" = "green" ]; then
        echo "blue"
    else
        # If no active environment, default to blue
        echo "blue"
    fi
}

# Get port for environment
get_port_for_env() {
    local env=$1
    if [ "$env" = "blue" ]; then
        echo "$BLUE_PORT"
    else
        echo "$GREEN_PORT"
    fi
}

# Check if port is in use
is_port_in_use() {
    local port=$1
    if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Wait for application to be ready
wait_for_app() {
    local port=$1
    local max_attempts=30
    local attempt=1
    
    log_info "Waiting for application on port $port to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:$port${HEALTH_ENDPOINT}" > /dev/null 2>&1; then
            log_info "Application is ready on port $port"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "Application failed to start on port $port after $max_attempts attempts"
    return 1
}

verify_runtime() {
    local port=$1

    log_info "Verifying editor runtime on port $port..."

    if BACKEND_HEALTH_BASE_URL="http://127.0.0.1:$port" \
        node apps/backend/scripts/verify-runtime-health.mjs; then
        log_info "Editor runtime verification passed on port $port"
        return 0
    fi

    log_error "Editor runtime verification failed on port $port"
    return 1
}

# Start application on specific port
start_app() {
    local env=$1
    local port=$2
    
    log_info "Starting $env environment on port $port..."
    
    cd "$PROJECT_DIR"
    
    # Set environment variables
    export PORT=$port
    export NODE_ENV=production
    
    # Stop existing PM2 process for this environment if exists
    pm2 delete "${APP_NAME}-${env}" 2>/dev/null || true
    
    # Start the application with PM2
    local -a start_args
    IFS=' ' read -r -a start_args <<< "$START_COMMAND_ARGS"
    pm2 start "${START_COMMAND}" --name "${APP_NAME}-${env}" -- "${start_args[@]}"
    pm2 save
    
    # Wait for app to be ready
    if ! wait_for_app "$port"; then
        log_error "Failed to start $env environment"
        return 1
    fi

    if ! verify_runtime "$port"; then
        log_error "Failed runtime verification for $env environment"
        return 1
    fi
    
    log_info "$env environment started successfully on port $port"
    return 0
}

# Stop application for specific environment
stop_app() {
    local env=$1
    
    log_info "Stopping $env environment..."
    pm2 delete "${APP_NAME}-${env}" 2>/dev/null || true
    log_info "$env environment stopped"
}

# Update nginx configuration
update_nginx() {
    local port=$1
    
    log_info "Updating nginx configuration to point to port $port..."
    
    # Ensure nginx sites-available directory exists
    if [ ! -d "$(dirname "$NGINX_CONFIG")" ]; then
        log_error "Nginx configuration directory does not exist: $(dirname "$NGINX_CONFIG")"
        return 1
    fi
    
    # Create nginx config if it doesn't exist
    if [ ! -f "$NGINX_CONFIG" ]; then
        sudo tee "$NGINX_CONFIG" > /dev/null <<EOF
upstream theeeecopy_backend {
    server localhost:$port;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://theeeecopy_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /health {
        proxy_pass http://theeeecopy_backend/health;
        access_log off;
    }
}
EOF
    else
        # Update existing config - use portable sed syntax
        sudo sed -i "s/server localhost:[0-9][0-9]*/server localhost:$port/" "$NGINX_CONFIG"
    fi
    
    # Test nginx configuration
    if sudo nginx -t >/dev/null 2>&1; then
        sudo systemctl reload nginx
        log_info "Nginx configuration updated and reloaded successfully"
        return 0
    else
        log_error "Nginx configuration test failed"
        return 1
    fi
}

# Perform blue-green deployment
deploy() {
    log_info "Starting Blue-Green Deployment..."
    
    local active_env=$(get_active_environment)
    local target_env=$(get_target_environment)
    local target_port=$(get_port_for_env "$target_env")
    
    log_info "Active environment: $active_env"
    log_info "Target environment: $target_env (port: $target_port)"
    
    # Start the target environment
    if ! start_app "$target_env" "$target_port"; then
        log_error "Deployment failed: Could not start $target_env environment"
        return 1
    fi
    
    # Switch traffic to target environment
    if ! update_nginx "$target_port"; then
        log_error "Deployment failed: Could not update nginx configuration"
        stop_app "$target_env"
        return 1
    fi
    
    # Give some time for connections to drain
    log_info "Waiting for connections to drain..."
    sleep 5
    
    # Stop the old environment if it exists and is different from target
    if [ "$active_env" != "none" ] && [ "$active_env" != "$target_env" ]; then
        stop_app "$active_env"
    fi
    
    log_info "Deployment completed successfully!"
    log_info "Active environment is now: $target_env on port $target_port"
    
    return 0
}

# Rollback to previous environment
rollback() {
    log_warn "Starting rollback..."
    
    local active_env=$(get_active_environment)
    local previous_env=""
    
    if [ "$active_env" = "blue" ]; then
        previous_env="green"
    elif [ "$active_env" = "green" ]; then
        previous_env="blue"
    else
        log_error "Cannot rollback: No active environment found"
        return 1
    fi
    
    local previous_port=$(get_port_for_env "$previous_env")
    
    log_info "Rolling back from $active_env to $previous_env (port: $previous_port)"
    
    # Check if previous environment is running
    if ! is_port_in_use "$previous_port"; then
        log_info "Previous environment not running, starting it..."
        if ! start_app "$previous_env" "$previous_port"; then
            log_error "Rollback failed: Could not start $previous_env environment"
            return 1
        fi
    fi
    
    # Switch traffic back
    if ! update_nginx "$previous_port"; then
        log_error "Rollback failed: Could not update nginx configuration"
        return 1
    fi
    
    log_info "Rollback completed successfully!"
    log_info "Active environment is now: $previous_env on port $previous_port"
    
    return 0
}

# Show current status
status() {
    local active_env=$(get_active_environment)
    
    echo "==================================="
    echo "Blue-Green Deployment Status"
    echo "==================================="
    echo "Active Environment: $active_env"
    echo ""
    echo "Blue Environment (port $BLUE_PORT):"
    if is_port_in_use "$BLUE_PORT"; then
        echo "  Status: Running ✓"
    else
        echo "  Status: Stopped"
    fi
    echo ""
    echo "Green Environment (port $GREEN_PORT):"
    if is_port_in_use "$GREEN_PORT"; then
        echo "  Status: Running ✓"
    else
        echo "  Status: Stopped"
    fi
    echo "==================================="
}

# Main function
main() {
    local command="${1:-}"
    
    case "$command" in
        deploy)
            deploy
            ;;
        rollback)
            rollback
            ;;
        status)
            status
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|status}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Deploy to inactive environment and switch traffic"
            echo "  rollback - Switch traffic back to previous environment"
            echo "  status   - Show current deployment status"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
