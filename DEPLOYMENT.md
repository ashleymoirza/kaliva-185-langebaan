# Kaliva 185 Langebaan — Deployment Guide

## Overview

This guide covers deploying the Kaliva 185 Langebaan booking platform to a VPS (105.29.227.42) using Nginx reverse proxy, Docker Compose, and systemd.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VPS (105.29.227.42)                      │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   Nginx      │    │   Nginx      │    │   Nginx      │     │
│  │  (Port 80)   │───▶│  (Port 443)  │───▶│  Upstream    │     │
│  │  HTTP→HTTPS  │    │  SSL/TLS     │    │  :3000       │     │
│  └──────────────┘    └──────────────┘    └──────┬───────┘     │
│                                                 │              │
│                    ┌────────────────────────────┼────────┐    │
│                    ▼                            ▼        ▼    │
│             ┌─────────────┐              ┌──────────┐  ┌─────┐ │
│             │  Next.js    │              │  Next.js │  │Worker│ │
│             │  Staging    │              │  Prod    │  │     │ │
│             │  :3001      │              │  :3002   │  │     │ │
│             └──────┬──────┘              └────┬─────┘  └─────┘ │
│                    │                          │                │
│         ┌──────────┴──────────┐    ┌─────────┴────────┐        │
│         ▼                     ▼    ▼                 ▼        │
│   ┌──────────┐         ┌──────────┐            ┌──────────┐   │
│   │PostgreSQL│         │  Redis   │            │  Ollama  │   │
│   │  :5432   │         │  :6379   │            │  :11434  │   │
│   └──────────┘         └──────────┘            └──────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### VPS Requirements
- **OS**: Ubuntu 22.04+ or Debian 12+
- **CPU**: 4+ vCPUs (AMD EPYC recommended)
- **RAM**: 8GB+ (16GB recommended for Ollama)
- **Storage**: 50GB+ SSD
- **Network**: Public IPv4 (105.29.227.42)

### Domains
- **Staging**: `staging.kaliva185.duckdns.org` → 105.29.227.42
- **Production**: `kaliva185.duckdns.org` → 105.29.227.42
- **www**: `www.kaliva185.duckdns.org` → 105.29.227.42

### SSL Certificates
Use Let's Encrypt (certbot) for automatic SSL:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d staging.kaliva185.duckdns.org -d kaliva185.duckdns.org -d www.kaliva185.duckdns.org
```

## Quick Start (Docker Compose)

### 1. Clone and Prepare
```bash
# On VPS
git clone <repo-url> /opt/kaliva185
cd /opt/kaliva185

# Copy environment templates
cp env/staging.env.example .env.staging
cp env/production.env.example .env.production

# Edit with REAL values (NEVER commit these!)
nano .env.staging
nano .env.production
```

### 2. Configure Environment Variables

**Required for Staging (.env.staging):**
```bash
# Database
POSTGRES_PASSWORD="secure-random-password"

# Admin
ADMIN_SESSION_SECRET="$(openssl rand -base64 48)"
ADMIN_PASSWORD_HASH="$(node -e "console.log(require('bcryptjs').hashSync('yourpass',12))")"

# Ozow Sandbox (get from https://sandbox.ozow.com)
OZOW_SITE_CODE="your-sandbox-site-code"
OZOW_PRIVATE_KEY="your-sandbox-private-key"

# PayFast Sandbox
PAYFAST_MERCHANT_ID="10000100"
PAYFAST_MERCHANT_KEY="46f0cd694581a"

# Stripe Test
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Ollama
OLLAMA_BASE_URL="http://ollama:11434"
OLLAMA_MODEL="llama3.2:3b"
```

### 3. Deploy with Docker Compose
```bash
# Pull latest images
docker-compose pull

# Build application
docker-compose build

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec app-staging npx prisma migrate deploy
docker-compose exec app-production npx prisma migrate deploy

# Pull Ollama model
docker-compose exec ollama ollama pull llama3.2:3b
```

### 4. Verify Deployment
```bash
# Check service health
docker-compose ps

# Check logs
docker-compose logs -f app-staging
docker-compose logs -f nginx

# Test endpoints
curl https://staging.kaliva185.duckdns.org/api/health
curl https://kaliva185.duckdns.org/api/health
```

## Manual Deployment (systemd + Nginx)

Use this method if you prefer not to use Docker for the Next.js app.

### 1. VPS Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y nginx postgresql-16 redis-server nodejs npm certbot python3-certbot-nginx

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Create deploy user
sudo useradd -m -s /bin/bash kaliva
sudo usermod -aG sudo kaliva
```

### 2. Database Setup
```bash
sudo -u postgres psql <<EOF
CREATE USER kaliva WITH PASSWORD 'secure-password';
CREATE DATABASE kaliva185_staging OWNER kaliva;
CREATE DATABASE kaliva185_prod OWNER kaliva;
GRANT ALL PRIVILEGES ON DATABASE kaliva185_staging TO kaliva;
GRANT ALL PRIVILEGES ON DATABASE kaliva185_prod TO kaliva;
\c kaliva185_staging
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\c kaliva185_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF
```

### 3. Build Application
```bash
# On local machine or CI/CD
npm ci
npm run build

# Verify standalone output exists
ls -la .next/standalone/
```

### 4. Deploy Files
```bash
# On VPS
sudo mkdir -p /var/www/kaliva185-staging /var/www/kaliva185-prod
sudo chown -R kaliva:kaliva /var/www/kaliva185-*

# Copy files (from local machine)
rsync -avz .next/standalone/ kaliva@105.29.227.42:/var/www/kaliva185-staging/
rsync -avz .next/static/ kaliva@105.29.227.42:/var/www/kaliva185-staging/.next/static/
rsync -avz public/ kaliva@105.29.227.42:/var/www/kaliva185-staging/public/
rsync -avz prisma/ kaliva@105.29.227.42:/var/www/kaliva185-staging/prisma/

# Repeat for production
```

### 5. Configure Environment
```bash
sudo mkdir -p /etc/kaliva185
sudo cp env/staging.env.example /etc/kaliva185/staging.env
sudo cp env/production.env.example /etc/kaliva185/production.env
sudo chown kaliva:kaliva /etc/kaliva185/*.env
sudo chmod 600 /etc/kaliva185/*.env

# EDIT THESE FILES WITH REAL VALUES!
sudo nano /etc/kaliva185/staging.env
sudo nano /etc/kaliva185/production.env
```

### 6. Configure Nginx
```bash
# Copy nginx config
sudo cp nginx/kaliva185.conf /etc/nginx/sites-available/kaliva185
sudo ln -sf /etc/nginx/sites-available/kaliva185 /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Configure Systemd
```bash
# Copy service files
sudo cp systemd/kaliva185-staging.service /etc/systemd/system/
sudo cp systemd/kaliva185-production.service /etc/systemd/system/

# Reload and enable
sudo systemctl daemon-reload
sudo systemctl enable kaliva185-staging kaliva185-production

# Start services
sudo systemctl start kaliva185-staging kaliva185-production

# Check status
sudo systemctl status kaliva185-staging
sudo systemctl status kaliva185-production
```

### 8. Run Migrations
```bash
cd /var/www/kaliva185-staging
sudo -u kaliva npx prisma migrate deploy

cd /var/www/kaliva185-prod
sudo -u kaliva npx prisma migrate deploy
```

### 9. Setup Ollama
```bash
# Pull model
ollama pull llama3.2:3b

# Verify
curl http://localhost:11434/api/tags
```

### 10. Configure SSL
```bash
# Get certificates
sudo certbot --nginx -d staging.kaliva185.duckdns.org -d kaliva185.duckdns.org -d www.kaliva185.duckdns.org

# Test auto-renewal
sudo certbot renew --dry-run
```

## Environment Variables Reference

| Variable | Staging | Production | Description |
|----------|---------|------------|-------------|
| `NEXT_PUBLIC_SITE_URL` | `https://staging.kaliva185.duckdns.org` | `https://kaliva185.duckdns.org` | Public site URL |
| `DATABASE_URL` | `postgresql://.../kaliva185_staging` | `postgresql://.../kaliva185_prod` | PostgreSQL connection |
| `ADMIN_SESSION_SECRET` | 32+ char random | 32+ char random | Session encryption |
| `ADMIN_PASSWORD_HASH` | bcrypt hash | bcrypt hash | Admin password hash |
| `OZOW_SITE_CODE` | Sandbox code | Production code | Ozow merchant ID |
| `OZOW_PRIVATE_KEY` | Sandbox key | Production key | Ozow private key |
| `OZOW_API_URL` | `https://api-sandbox.ozow.com` | `https://api.ozow.com` | Ozow API endpoint |
| `OZOW_IS_TEST` | `true` | `false` | Test mode flag |
| `PAYFAST_SANDBOX` | `true` | `false` | PayFast test mode |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | `http://localhost:11434` | Ollama API URL |
| `OLLAMA_MODEL` | `llama3.2:3b` | `llama3.2:3b` | Ollama model name |
| `REDIS_URL` | `redis://localhost:6379` | `redis://localhost:6379` | Redis connection |

## Monitoring & Logs

### Application Logs
```bash
# systemd
journalctl -u kaliva185-staging -f
journalctl -u kaliva185-production -f

# Docker
docker-compose logs -f app-staging
docker-compose logs -f app-production
```

### Nginx Logs
```bash
# Access logs
tail -f /var/log/nginx/kaliva185-staging-access.log
tail -f /var/log/nginx/kaliva185-prod-access.log

# Error logs
tail -f /var/log/nginx/kaliva185-staging-error.log
tail -f /var/log/nginx/kaliva185-prod-error.log
```

### Health Checks
```bash
# Application health
curl https://staging.kaliva185.duckdns.org/api/health
curl https://kaliva185.duckdns.org/api/health

# Ollama health
curl http://localhost:11434/api/tags

# Database
pg_isready -U kaliva -h localhost -d kaliva185_staging
pg_isready -U kaliva -h localhost -d kaliva185_prod

# Redis
redis-cli ping
```

## Backup & Recovery

### Database Backup
```bash
# Staging
pg_dump -U kaliva -h localhost kaliva185_staging > backup_staging_$(date +%F).sql

# Production
pg_dump -U kaliva -h localhost kaliva185_prod > backup_prod_$(date +%F).sql

# Automated (add to crontab)
0 2 * * * pg_dump -U kaliva kaliva185_prod | gzip > /backups/prod_$(date +\%F).sql.gz
```

### Application Backup
```bash
# Backup current deployment before update
tar -czf /backups/app_$(date +%F).tar.gz /var/www/kaliva185-prod
```

### Rollback
```bash
# Using deploy script
sudo ./scripts/deploy.sh production rollback

# Manual rollback
systemctl stop kaliva185-production
rm -rf /var/www/kaliva185-prod
tar -xzf /backups/app_2024-01-15.tar.gz -C /
systemctl start kaliva185-production
```

## Troubleshooting

### Common Issues

**1. Application won't start**
```bash
# Check logs
journalctl -u kaliva185-staging -n 100

# Check environment file exists and is readable
cat /etc/kaliva185/staging.env

# Check database connectivity
psql -U kaliva -h localhost -d kaliva185_staging -c "SELECT 1;"
```

**2. 502 Bad Gateway**
```bash
# Check if app is running on port 3000
ss -tlnp | grep :3000

# Check nginx error log
tail -f /var/log/nginx/kaliva185-staging-error.log
```

**3. SSL Certificate Issues**
```bash
# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/staging.kaliva185.duckdns.org/fullchain.pem -text -noout

# Renew manually
sudo certbot renew --force-renewal
```

**4. Ollama Not Responding**
```bash
# Check Ollama service
systemctl status ollama

# Check model is loaded
curl http://localhost:11434/api/tags

# Pull model if missing
ollama pull llama3.2:3b
```

**5. Database Migration Failures**
```bash
# Check migration status
npx prisma migrate status

# Reset and reapply (DESTRUCTIVE - staging only)
npx prisma migrate reset --force
npx prisma migrate deploy
```

## Security Checklist

- [ ] All environment files have `chmod 600`
- [ ] Database passwords are strong and unique
- [ ] Admin session secrets are 32+ characters
- [ ] Ozow private keys are kept secret
- [ ] SSL certificates are valid and auto-renewing
- [ ] Nginx rate limiting is configured
- [ ] Firewall allows only 80, 443, 22 (SSH)
- [ ] Fail2ban is configured for SSH
- [ ] Regular security updates applied
- [ ] Database backups are encrypted offsite

## CI/CD Pipeline (GitHub Actions Example)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Staging

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/kaliva185
            git pull
            docker-compose build app-staging
            docker-compose up -d app-staging
            docker-compose exec app-staging npx prisma migrate deploy
```

## Support

For issues:
1. Check logs: `journalctl -u kaliva185-staging -f`
2. Verify health endpoints
3. Review this guide's troubleshooting section
4. Check GitHub issues for known problems

---

**Last Updated**: November 2026
**Version**: 1.0.0