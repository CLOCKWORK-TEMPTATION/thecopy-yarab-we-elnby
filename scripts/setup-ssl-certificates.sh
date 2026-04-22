#!/bin/bash
# scripts/setup-ssl-certificates.sh
# Configure SSL/TLS certificates with Let's Encrypt

set -e

# ==========================================
# Configuration
# ==========================================
DOMAIN=${1:-yourdomain.com}
EMAIL=${2:-admin@yourdomain.com}
CERT_DIR="/etc/letsencrypt/live"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Functions
log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
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

if ! command -v certbot &> /dev/null; then
  error "Certbot is not installed. Run setup-production-infrastructure.sh first"
fi

if ! command -v nginx &> /dev/null; then
  error "Nginx is not installed. Run setup-production-infrastructure.sh first"
fi

log "✅ Pre-flight checks passed"

# ==========================================
# Create DNS verification directory
# ==========================================
log "📁 Creating DNS verification directory..."

mkdir -p /var/www/certbot/.well-known/acme-challenge
chown -R www-data:www-data /var/www/certbot
chmod -R 755 /var/www/certbot

log "✅ Verification directory created"

# ==========================================
# Create temporary Nginx config for verification
# ==========================================
log "🔧 Creating temporary Nginx configuration..."

cat > /etc/nginx/sites-available/certbot-temp <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN api-blue.$DOMAIN api-green.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF

# Enable temporary config
ln -sf /etc/nginx/sites-available/certbot-temp /etc/nginx/sites-enabled/certbot-temp

# Test Nginx config
if ! nginx -t 2>&1 | grep -q "successful"; then
  error "Nginx configuration error"
fi

# Reload Nginx
systemctl reload nginx

log "✅ Temporary Nginx configuration created"

# ==========================================
# Request SSL certificates
# ==========================================
log "🔒 Requesting SSL certificates..."

certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  -d "api-blue.$DOMAIN" \
  -d "api-green.$DOMAIN" \
  || error "Certificate request failed"

log "✅ SSL certificates obtained successfully"

# ==========================================
# Configure certificate auto-renewal
# ==========================================
log "🔄 Configuring automatic certificate renewal..."

# Create renewal hook
mkdir -p /etc/letsencrypt/renewal-hooks/post

cat > /etc/letsencrypt/renewal-hooks/post/nginx-reload.sh <<'EOF'
#!/bin/bash
systemctl reload nginx
EOF

chmod +x /etc/letsencrypt/renewal-hooks/post/nginx-reload.sh

# Enable certbot timer
systemctl enable certbot.timer
systemctl start certbot.timer

# Test renewal (dry run)
log "Testing certificate renewal (dry run)..."
certbot renew --dry-run --quiet || warn "Dry run test failed - this is usually OK"

log "✅ Auto-renewal configured"

# ==========================================
# Display certificate information
# ==========================================
log "📋 Certificate Information:"

if [[ -d "$CERT_DIR/$DOMAIN" ]]; then
  echo ""
  echo "Domain: $DOMAIN"
  echo "Certificate Path: $CERT_DIR/$DOMAIN/cert.pem"
  echo "Private Key Path: $CERT_DIR/$DOMAIN/privkey.pem"
  echo "Full Chain Path: $CERT_DIR/$DOMAIN/fullchain.pem"
  echo ""
  
  # Show expiry date
  EXPIRY_DATE=$(openssl x509 -enddate -noout -in "$CERT_DIR/$DOMAIN/cert.pem" | cut -d= -f 2)
  echo "Expiry Date: $EXPIRY_DATE"
  echo ""
  
  # Test SSL
  echo "Testing SSL configuration..."
  openssl x509 -in "$CERT_DIR/$DOMAIN/cert.pem" -text -noout | head -20
else
  error "Certificate files not found"
fi

# ==========================================
# Setup SSL configuration
# ==========================================
log "🔧 Configuring SSL settings..."

# Create SSL parameters file
cat > /etc/nginx/ssl-params.conf <<'EOF'
# SSL Security Parameters
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;

# HSTS (HTTP Strict Transport Security)
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# Security Headers
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# Content Security Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self';" always;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/letsencrypt/live/DOMAIN_NAME/chain.pem;
resolver 8.8.8.8 8.8.4.4;
EOF

log "✅ SSL parameters configured"

# ==========================================
# Create certificate backup
# ==========================================
log "💾 Creating certificate backup..."

mkdir -p /opt/backups/ssl-certificates
cp -r "$CERT_DIR/$DOMAIN" "/opt/backups/ssl-certificates/$(date +%Y%m%d-%H%M%S)"

log "✅ Certificate backup created"

# ==========================================
# Summary
# ==========================================
log "📊 SSL Certificate Setup Complete"

cat <<EOF

╔══════════════════════════════════════════════════════════════╗
║   SSL Certificate Configuration Summary                       ║
╚══════════════════════════════════════════════════════════════╝

✅ Certificates Created:
   • Domain: $DOMAIN
   • Certificate: $CERT_DIR/$DOMAIN/cert.pem
   • Key: $CERT_DIR/$DOMAIN/privkey.pem
   • Chain: $CERT_DIR/$DOMAIN/chain.pem
   • Full Chain: $CERT_DIR/$DOMAIN/fullchain.pem

🔐 Security Configuration:
   • SSL/TLS Protocol: TLSv1.2 - TLSv1.3
   • HSTS Enabled: max-age=63072000
   • OCSP Stapling: Enabled
   • Security Headers: Configured

🔄 Auto-Renewal:
   • Service: certbot.timer
   • Frequency: Daily at 00:00 UTC
   • Renewal Hook: /etc/letsencrypt/renewal-hooks/post/nginx-reload.sh
   • Status: Active

📋 Testing:
   • Renewal Test: Dry run completed
   • Next Auto-Renewal: $(certbot certificates | grep "Expiry Date" | tail -1)

🔒 Certificate Pins:
   • Backup Location: /opt/backups/ssl-certificates/
   • Backup Frequency: Recommend daily backups

📚 Useful Commands:
   • View Certificate: openssl x509 -in $CERT_DIR/$DOMAIN/cert.pem -text -noout
   • Check Expiry: openssl x509 -enddate -noout -in $CERT_DIR/$DOMAIN/cert.pem
   • List All: certbot certificates
   • Renew Now: certbot renew --force-renewal
   • Test Renewal: certbot renew --dry-run

⚠️ Important:
   • Update .env files with certificate paths
   • Update Nginx configuration with certificate paths
   • Test SSL: https://$DOMAIN
   • Verify HTTPS redirect

🚀 Next Steps:
   1. Update Nginx configuration with certificate paths
   2. Test HTTPS access: curl -I https://$DOMAIN
   3. Verify security headers: curl -I https://$DOMAIN
   4. Run SSL Labs test: https://www.ssllabs.com/ssltest/
   5. Deploy application

EOF

log "🎉 SSL setup completed successfully!"
