#!/bin/bash
# scripts/setup-production-infrastructure.sh
# Complete production infrastructure setup script

set -e

# ==========================================
# Configuration
# ==========================================
ENVIRONMENT=${1:-production}
DOMAIN=${2:-yourdomain.com}
BLUE_PORT=3001
GREEN_PORT=3002
NGINX_USER=www-data
APP_USER=appuser

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
  exit 1
}

# ==========================================
# Pre-flight checks
# ==========================================
log "🔍 Running pre-flight checks..."

if [[ $EUID -ne 0 ]]; then
  error "This script must be run as root"
fi

command -v curl >/dev/null 2>&1 || error "curl is required"
command -v wget >/dev/null 2>&1 || error "wget is required"

log "✅ Pre-flight checks passed"

# ==========================================
# Update system
# ==========================================
log "🔄 Updating system packages..."
apt-get update
apt-get upgrade -y
apt-get install -y \
  curl \
  wget \
  git \
  build-essential \
  python3 \
  python3-pip \
  vim \
  htop \
  net-tools \
  supervisor \
  fail2ban \
  ufw

log "✅ System packages updated"

# ==========================================
# Install Node.js
# ==========================================
log "📦 Installing Node.js 24..."

if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
else
  info "Node.js already installed: $(node --version)"
fi

# Install pnpm
npm install -g pnpm@10.20.0

log "✅ Node.js and pnpm installed"

# ==========================================
# Install PostgreSQL
# ==========================================
log "📦 Installing PostgreSQL 15..."

if ! command -v psql &> /dev/null; then
  apt-get install -y postgresql postgresql-contrib

  # Start and enable service
  systemctl start postgresql
  systemctl enable postgresql

  info "PostgreSQL installation completed"
else
  info "PostgreSQL already installed: $(psql --version)"
fi

# ==========================================
# Install Redis
# ==========================================
log "📦 Installing Redis..."

if ! command -v redis-cli &> /dev/null; then
  apt-get install -y redis-server

  # Configure Redis for production
  cp /etc/redis/redis.conf /etc/redis/redis.conf.bak

  # Set Redis password
  REDIS_PASSWORD=$(openssl rand -base64 32)
  echo "📝 Redis password: $REDIS_PASSWORD"

  sed -i 's/# requirepass foobared/requirepass '$REDIS_PASSWORD'/' /etc/redis/redis.conf
  sed -i 's/^# maxmemory <bytes>/maxmemory 2gb/' /etc/redis/redis.conf
  sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf

  systemctl restart redis-server
  systemctl enable redis-server

  info "Redis password saved. Update .env files with: $REDIS_PASSWORD"
else
  info "Redis already installed"
fi

log "✅ Redis installed"

# ==========================================
# Install Nginx
# ==========================================
log "📦 Installing Nginx..."

if ! command -v nginx &> /dev/null; then
  apt-get install -y nginx

  systemctl start nginx
  systemctl enable nginx

  # Create needed directories
  mkdir -p /etc/nginx/sites-available
  mkdir -p /etc/nginx/sites-enabled
  mkdir -p /var/www/certbot

  info "Nginx installation completed"
else
  info "Nginx already installed: $(nginx -v 2>&1)"
fi

log "✅ Nginx installed"

# ==========================================
# Install Certbot (Let's Encrypt)
# ==========================================
log "🔒 Installing Certbot..."

if ! command -v certbot &> /dev/null; then
  apt-get install -y certbot python3-certbot-nginx

  # Create renewal hook
  mkdir -p /etc/letsencrypt/renewal-hooks/post
  cat > /etc/letsencrypt/renewal-hooks/post/nginx.sh <<'EOF'
#!/bin/bash
systemctl reload nginx
EOF
  chmod +x /etc/letsencrypt/renewal-hooks/post/nginx.sh

  # Enable auto-renewal
  systemctl enable certbot.timer
  systemctl start certbot.timer

  info "Certbot installation completed"
else
  info "Certbot already installed"
fi

log "✅ Certbot installed"

# ==========================================
# Install PM2
# ==========================================
log "📦 Installing PM2..."

if ! npm list -g pm2 &> /dev/null; then
  npm install -g pm2@latest
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:max_size 100M
else
  info "PM2 already installed"
fi

log "✅ PM2 installed"

# ==========================================
# Create application user
# ==========================================
log "👤 Creating application user..."

if ! id "$APP_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$APP_USER"
  usermod -aG sudo "$APP_USER"
  
  info "Created user: $APP_USER"
else
  info "User already exists: $APP_USER"
fi

# ==========================================
# Create directories
# ==========================================
log "📁 Creating application directories..."

mkdir -p /opt/theecopy-blue
mkdir -p /opt/theecopy-green
mkdir -p /var/log/theecopy
mkdir -p /var/log/nginx
mkdir -p /opt/backups
mkdir -p /opt/theecopy-blue/logs
mkdir -p /opt/theecopy-green/logs

# Set permissions
chown -R "$APP_USER:$APP_USER" /opt/theecopy-blue
chown -R "$APP_USER:$APP_USER" /opt/theecopy-green
chown -R "$APP_USER:$APP_USER" /var/log/theecopy
chown -R "$NGINX_USER:$NGINX_USER" /var/log/nginx

# Set proper permissions
chmod 755 /opt/theecopy-blue
chmod 755 /opt/theecopy-green
chmod 755 /var/log/theecopy

log "✅ Directories created"

# ==========================================
# Firewall configuration
# ==========================================
log "🔥 Configuring firewall..."

ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 3001/tcp    # Blue backend (internal)
ufw allow 3002/tcp    # Green backend (internal)
ufw allow 5432/tcp    # PostgreSQL (internal)
ufw allow 6379/tcp    # Redis (internal)

log "✅ Firewall configured"

# ==========================================
# Create log rotation
# ==========================================
log "📋 Configuring log rotation..."

cat > /etc/logrotate.d/theecopy <<EOF
/var/log/theecopy/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $APP_USER $APP_USER
    sharedscripts
    postrotate
        systemctl reload theecopy > /dev/null 2>&1 || true
    endscript
}
EOF

log "✅ Log rotation configured"

# ==========================================
# Configure fail2ban
# ==========================================
log "🔐 Configuring fail2ban..."

systemctl start fail2ban
systemctl enable fail2ban

cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
EOF

fail2ban-client reload

log "✅ fail2ban configured"

# ==========================================
# Create systemd services
# ==========================================
log "🔧 Creating systemd services..."

cat > /etc/systemd/system/theecopy.service <<EOF
[Unit]
Description=The Copy Application
After=network.target postgresql.service redis.service
Wants=theecopy-blue.service theecopy-green.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/true
ExecStop=/bin/true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

log "✅ Systemd services created"

# ==========================================
# Create summary
# ==========================================
log "📊 Installation Summary"

cat <<EOF

╔══════════════════════════════════════════════════════════════╗
║   The Copy - Production Infrastructure Setup Complete        ║
╚══════════════════════════════════════════════════════════════╝

✅ Installed Components:
   • Node.js $(node --version)
   • pnpm $(pnpm --version)
   • PostgreSQL $(psql --version | head -n1)
   • Redis
   • Nginx $(nginx -v 2>&1)
   • PM2 $(pm2 --version)
   • Certbot
   • fail2ban

📁 Application Directories:
   • Blue:  /opt/theecopy-blue
   • Green: /opt/theecopy-green
   • Logs:  /var/log/theecopy

🔐 Security:
   • Firewall enabled (UFW)
   • fail2ban configured
   • SSH hardening recommended

📋 Next Steps:
   1. Copy .env.blue and .env.green with real credentials
   2. Run SSL certificate setup: ./scripts/setup-ssl.sh
   3. Configure Nginx: ./scripts/setup-nginx.sh
   4. Deploy application: ./scripts/deploy-production.sh
   5. Setup monitoring: ./scripts/setup-monitoring.sh
   6. Verify services: pm2 status

🚀 Start Services:
   pm2 start ecosystem.config.js

📊 Monitor Services:
   pm2 monit

📝 View Logs:
   pm2 logs theecopy-blue
   pm2 logs theecopy-green
   tail -f /var/log/nginx/access.log

EOF

log "🎉 Infrastructure setup completed successfully!"
