# Deployment Guide - Facebook Earnings Platform

This guide covers deployment strategies for the Facebook Earnings Platform.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Deployment](#cloud-deployment)
5. [Database Setup](#database-setup)
6. [SSL/TLS Configuration](#ssltls-configuration)
7. [Monitoring](#monitoring)
8. [Backup Strategy](#backup-strategy)

## Prerequisites

### System Requirements
- Ubuntu 20.04+ or similar Linux distribution
- 2+ CPU cores
- 4GB+ RAM
- 50GB+ storage
- Docker & Docker Compose

### External Services Required
- PostgreSQL 15+ (managed service recommended)
- Redis 7+ (managed service recommended)
- Facebook Developer Account
- OpenAI API Account
- SendGrid Account (for emails)
- AWS Account (for S3 storage)

## Environment Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd facebook-earnings-platform
```

### 2. Configure Environment Variables

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` with production values:
```env
# Production Database
DATABASE_URL=postgresql://user:password@db-host:5432/fb_earnings

# Production Redis
REDIS_URL=redis://redis-host:6379

# Strong JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-strong-random-secret-key-here
JWT_EXPIRES_IN=7d

# Facebook OAuth
FACEBOOK_APP_ID=your-production-facebook-app-id
FACEBOOK_APP_SECRET=your-production-facebook-app-secret
FACEBOOK_CALLBACK_URL=https://yourdomain.com/api/auth/facebook/callback

# OpenAI
OPENAI_API_KEY=your-production-openai-api-key

# SendGrid
SENDGRID_API_KEY=your-production-sendgrid-key
FROM_EMAIL=noreply@yourdomain.com

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_BUCKET_NAME=fb-earnings-production
AWS_REGION=us-east-1

# Production URLs
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Secure Environment File
```bash
chmod 600 .env
```

## Docker Deployment

### 1. Build Production Images
```bash
docker-compose build --no-cache
```

### 2. Start Services
```bash
docker-compose up -d
```

### 3. Check Service Status
```bash
docker-compose ps
docker-compose logs -f
```

### 4. Run Database Migrations
```bash
docker-compose exec backend npm run migrate
```

### 5. Seed Database (optional)
```bash
docker-compose exec backend npm run seed
```

## Cloud Deployment

### AWS Deployment

#### 1. Setup EC2 Instance
```bash
# Launch Ubuntu 20.04 instance
# Instance type: t3.medium or larger
# Security groups: Allow ports 80, 443, 22
```

#### 2. Install Dependencies
```bash
# SSH into instance
ssh ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 3. Setup RDS PostgreSQL
```bash
# Create RDS PostgreSQL instance
# Engine: PostgreSQL 15
# Instance class: db.t3.micro (or larger)
# Storage: 50GB SSD
# Enable automatic backups
# Note connection string
```

#### 4. Setup ElastiCache Redis
```bash
# Create Redis cluster
# Engine: Redis 7.x
# Node type: cache.t3.micro (or larger)
# Note connection endpoint
```

#### 5. Deploy Application
```bash
# Clone repository
git clone <repository-url>
cd facebook-earnings-platform

# Create .env file with production values
nano .env

# Start services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f backend
```

### Heroku Deployment

#### 1. Install Heroku CLI
```bash
curl https://cli-assets.heroku.com/install.sh | sh
heroku login
```

#### 2. Create Heroku Apps
```bash
# Create main app
heroku create fb-earnings-app

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Add Redis
heroku addons:create heroku-redis:hobby-dev
```

#### 3. Configure Environment
```bash
heroku config:set JWT_SECRET=your-secret
heroku config:set FACEBOOK_APP_ID=your-app-id
heroku config:set FACEBOOK_APP_SECRET=your-secret
heroku config:set OPENAI_API_KEY=your-key
# ... set all required variables
```

#### 4. Deploy
```bash
# Backend
git subtree push --prefix packages/backend heroku main

# Or use container
heroku container:push web --recursive
heroku container:release web
```

### DigitalOcean Deployment

#### 1. Create Droplet
- Ubuntu 20.04
- 4GB RAM / 2 CPUs (minimum)
- Add SSH key

#### 2. Setup Managed Databases
- PostgreSQL 15 cluster
- Redis cluster

#### 3. Deploy with Docker
Follow same steps as AWS EC2 deployment

## Database Setup

### 1. Create Production Database
```sql
CREATE DATABASE fb_earnings;
CREATE USER fb_user WITH ENCRYPTED PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE fb_earnings TO fb_user;
```

### 2. Run Migrations
```bash
npm run migrate
```

### 3. Create Indexes (for performance)
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_earnings_date ON earnings(earning_date);
CREATE INDEX idx_earnings_account ON earnings(facebook_account_id);
CREATE INDEX idx_contents_account ON contents(facebook_account_id);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled ON scheduled_posts(scheduled_for);
```

## SSL/TLS Configuration

### Using Let's Encrypt (Recommended)

#### 1. Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx
```

#### 2. Setup Nginx Reverse Proxy
```bash
sudo apt install nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/fb-earnings
```

Add configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 3. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/fb-earnings /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 4. Get SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com
```

## Monitoring

### 1. Setup Application Logging
```bash
# Configure Winston for production
# Logs stored in /var/log/fb-earnings/
```

### 2. Setup Monitoring Tools

#### Install PM2 for Process Management
```bash
npm install -g pm2

# Start with PM2
pm2 start packages/backend/dist/index.js --name fb-earnings-api
pm2 startup
pm2 save
```

#### Setup Health Checks
```bash
# Health check endpoint
curl http://localhost:3001/health
```

### 3. Error Tracking
- Sentry integration (recommended)
- LogRocket for frontend monitoring
- AWS CloudWatch for AWS deployments

### 4. Performance Monitoring
- New Relic
- DataDog
- AWS CloudWatch

## Backup Strategy

### 1. Database Backups

#### Automated PostgreSQL Backups
```bash
# Create backup script
nano /usr/local/bin/backup-db.sh
```

Add:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/postgres"
DB_NAME="fb_earnings"

mkdir -p $BACKUP_DIR

pg_dump $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

```bash
chmod +x /usr/local/bin/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /usr/local/bin/backup-db.sh
```

#### RDS Automated Backups
- Enable automated backups in RDS console
- Set retention period (7-35 days)
- Enable point-in-time recovery

### 2. File Backups
```bash
# Backup uploaded media to S3
aws s3 sync /path/to/uploads s3://your-backup-bucket/uploads
```

### 3. Configuration Backups
- Store `.env` securely (encrypted)
- Version control for code
- Document all configuration changes

## Scaling

### Horizontal Scaling

#### 1. Load Balancer Setup
```bash
# Use AWS ELB, DigitalOcean Load Balancer, or Nginx
```

#### 2. Multiple Backend Instances
```bash
# Docker Compose scale
docker-compose up -d --scale backend=3
```

#### 3. Redis for Session Storage
- Use Redis for JWT token blacklist
- Use Bull queues for job distribution

### Vertical Scaling
- Increase instance size
- Optimize database queries
- Add read replicas for database

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Review logs weekly
- Test backups monthly
- Security audits quarterly

### Updates
```bash
# Pull latest code
git pull origin main

# Rebuild
docker-compose build --no-cache

# Restart with zero downtime
docker-compose up -d --no-deps --build backend
```

## Troubleshooting

### Check Logs
```bash
# Docker logs
docker-compose logs -f backend

# PM2 logs
pm2 logs fb-earnings-api

# System logs
journalctl -u docker -f
```

### Database Connection Issues
```bash
# Test connection
psql -h hostname -U username -d database_name

# Check connection pool
docker-compose exec backend node -e "require('./dist/config/database').authenticate()"
```

### Performance Issues
```bash
# Check resource usage
docker stats

# Database query analysis
EXPLAIN ANALYZE SELECT ...;
```

## Security Checklist

- [ ] Use strong JWT secret
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set secure headers (Helmet.js)
- [ ] Enable rate limiting
- [ ] Use environment variables for secrets
- [ ] Regular security updates
- [ ] Database password rotation
- [ ] API key rotation
- [ ] Firewall configuration
- [ ] SSH key-only access
- [ ] Regular vulnerability scans

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Error tracking enabled
- [ ] Load balancer configured
- [ ] CDN setup (optional)
- [ ] Email service configured
- [ ] Payment gateway configured
- [ ] Facebook app approved
- [ ] DNS configured
- [ ] Health checks working
- [ ] Documentation updated

## Support

For deployment issues:
1. Check logs
2. Verify environment variables
3. Test external service connections
4. Review security groups/firewall rules
5. Contact support if needed

---

Last updated: 2024
