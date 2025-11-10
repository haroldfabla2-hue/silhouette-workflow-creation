# Silhouette Agency - Production Deployment Guide

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Deployment](#detailed-deployment)
- [Configuration](#configuration)
- [Monitoring](#monitoring)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This guide provides comprehensive instructions for deploying **Silhouette Agency** to production using Docker Compose. The application is a complete workflow automation platform with real-time collaboration, automated QA system, and enterprise-grade security.

**Author:** Silhouette Anonimo  
**Version:** 1.0.0

### Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Databases     │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│  PostgreSQL     │
│   Port: 3000    │    │   Port: 3001    │    │  Redis          │
└─────────────────┘    └─────────────────┘    │  Neo4j          │
                                               │  RabbitMQ       │
┌─────────────────┐    ┌─────────────────┐    └─────────────────┘
│   Monitoring    │    │   Reverse       │
│   Prometheus    │    │   Proxy         │
│   Grafana       │    │   Nginx         │
└─────────────────┘    └─────────────────┘
```

## 🔧 Prerequisites

### System Requirements

- **OS:** Linux (Ubuntu 20.04+), macOS 10.15+, or Windows 10+ with WSL2
- **Memory:** 8GB RAM minimum (16GB recommended)
- **Storage:** 50GB free space minimum (100GB recommended)
- **CPU:** 4 cores minimum (8 cores recommended)

### Software Requirements

- **Docker:** 20.10+ 
- **Docker Compose:** 1.29+ or Docker Compose v2
- **Git:** Latest version
- **curl:** For health checks

### Network Requirements

- **Ports:** 80, 443, 3000, 3001, 5432, 6379, 7474, 7687, 15672, 9090, 3003
- **Internet:** Required for initial setup and updates

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd silhouette-workflow-creation

# Run the automated setup script
./scripts/setup-production.sh

# Access the application
open http://localhost:3000
```

### Option 2: Manual Setup

```bash
# 1. Set up environment variables
cp .env.production .env.production.local
# Edit .env.production.local with your configuration

# 2. Build and start services
./scripts/deploy/docker-deploy.sh deploy

# 3. Check status
./scripts/deploy/docker-deploy.sh health
```

## 📖 Detailed Deployment

### Step 1: Environment Configuration

1. **Copy environment template:**
   ```bash
   cp .env.production .env.production.local
   ```

2. **Update critical variables:**
   ```bash
   # Database passwords
   POSTGRES_PASSWORD=your-secure-password
   REDIS_PASSWORD=your-secure-password
   NEO4J_PASSWORD=your-secure-password
   RABBITMQ_PASSWORD=your-secure-password
   
   # Security keys
   JWT_SECRET_KEY=your-256-bit-secret-key
   ENCRYPTION_KEY=your-32-character-key
   
   # External APIs
   OPENAI_API_KEY=sk-your-openai-api-key
   ```

3. **Configure domain (for production):**
   ```bash
   # Update these URLs to your domain
   NEXT_PUBLIC_API_URL=https://your-domain.com/api
   NEXT_PUBLIC_WS_URL=wss://your-domain.com/ws
   ```

### Step 2: SSL/TLS Configuration (Production)

1. **Generate self-signed certificates (development):**
   ```bash
   mkdir -p config/nginx/ssl
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout config/nginx/ssl/key.pem \
     -out config/nginx/ssl/cert.pem \
     -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"
   ```

2. **For production, use Let's Encrypt:**
   ```bash
   # Install certbot
   sudo apt install certbot
   
   # Generate certificates
   sudo certbot certonly --standalone -d your-domain.com
   sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem config/nginx/ssl/
   sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem config/nginx/ssl/
   ```

### Step 3: Database Initialization

The application will automatically initialize databases on first startup. For manual initialization:

```bash
# Run database migrations
docker compose -f docker-compose.prod.yml exec backend npm run db:migrate

# Seed initial data (optional)
docker compose -f docker-compose.prod.yml exec backend npm run db:seed
```

### Step 4: Start Services

```bash
# Using the deployment script
./scripts/deploy/docker-deploy.sh deploy

# Or using Docker Compose directly
docker compose -f docker-compose.prod.yml up -d

# With monitoring
docker compose -f docker-compose.prod.yml --profile monitoring up -d
```

### Step 5: Verify Deployment

```bash
# Check service status
./scripts/deploy/docker-deploy.sh status

# Run health checks
./scripts/deploy/docker-deploy.sh health

# View logs
./scripts/deploy/docker-deploy.sh logs -f
```

## ⚙️ Configuration

### Environment Variables

Key configuration options in `.env.production`:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `POSTGRES_PASSWORD` | PostgreSQL root password | - | Yes |
| `REDIS_PASSWORD` | Redis authentication password | - | Yes |
| `JWT_SECRET_KEY` | JWT signing secret (256-bit) | - | Yes |
| `OPENAI_API_KEY` | OpenAI API key for AI features | - | Optional |
| `NEXT_PUBLIC_API_URL` | Backend API URL | http://localhost:3001 | Yes |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password | admin | Yes |

### Service Configuration

#### Backend Services

- **Port:** 3001
- **Health Check:** http://localhost:3001/health
- **API Documentation:** http://localhost:3001/api/docs

#### Frontend Services

- **Port:** 3000
- **Health Check:** http://localhost:3000/_next/health
- **Build:** Next.js production build

#### Database Services

- **PostgreSQL:** Port 5432
- **Redis:** Port 6379
- **Neo4j:** HTTP 7474, Bolt 7687
- **RabbitMQ:** AMQP 5672, Management 15672

### Performance Tuning

#### Backend Optimization

```yaml
# In docker-compose.prod.yml
backend:
  environment:
    NODE_ENV: production
    MAX_CONCURRENT_WORKFLOWS: 100
    QA_BATCH_SIZE: 50
    QA_MAX_CONCURRENT: 10
  deploy:
    resources:
      limits:
        memory: 1G
      reservations:
        memory: 512M
```

#### Database Optimization

```yaml
# PostgreSQL
postgres:
  environment:
    POSTGRES_SHARED_PRELOAD_LIBRARIES: pg_stat_statements
  command: >
    postgres -c shared_preload_libraries=pg_stat_statements
    -c pg_stat_statements.track=all

# Redis
redis:
  command: >
    redis-server --requirepass haaspass
    --appendonly yes
    --maxmemory 512mb
    --maxmemory-policy allkeys-lru
```

## 📊 Monitoring

### Built-in Monitoring

The deployment includes comprehensive monitoring:

- **Prometheus:** Metrics collection (Port 9090)
- **Grafana:** Visualization and dashboards (Port 3003)
- **Health Checks:** Automated health monitoring
- **Logging:** Centralized log aggregation

### Access Monitoring Dashboards

```bash
# Grafana Dashboard
open http://localhost:3003
# Default: admin/admin (change on first login)

# Prometheus
open http://localhost:9090
```

### Custom Metrics

Key metrics tracked:

- **Application:** Response time, error rate, throughput
- **Database:** Connection pool, query performance
- **System:** CPU, memory, disk usage
- **Business:** Workflow executions, QA verification results

### Alerting

Configure alerts in `config/prometheus/rules/silhouette.yml`:

```yaml
- alert: HighResponseTime
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
  for: 5m
  labels:
    severity: warning
```

## 🔧 Maintenance

### Regular Maintenance Tasks

#### Daily
- Check service health
- Review error logs
- Monitor resource usage

#### Weekly
- Update security patches
- Review performance metrics
- Clean up old logs

#### Monthly
- Backup verification
- Security audit
- Capacity planning review

### Backup and Recovery

#### Create Backup

```bash
# Automated backup
./scripts/deploy/docker-deploy.sh backup

# Manual backup
docker run --rm -v silhouette_postgres_data_prod:/data -v $(pwd):/backup alpine \
  tar czf /backup/postgres-$(date +%Y%m%d).tar.gz -C /data .
```

#### Restore from Backup

```bash
# List available backups
ls backups/

# Restore specific backup
./scripts/deploy/docker-deploy.sh restore silhouette-backup-20231109-120000.tar.gz
```

### Updates and Upgrades

#### Update Application

```bash
# Pull latest changes
git pull origin main

# Update and restart
./scripts/deploy/docker-deploy.sh update
```

#### Update Dependencies

```bash
# Update base images
docker compose -f docker-compose.prod.yml pull

# Rebuild with latest dependencies
./scripts/deploy/docker-deploy.sh build --no-cache
```

## 🐛 Troubleshooting

### Common Issues

#### Services Won't Start

1. **Check Docker daemon:**
   ```bash
   docker info
   sudo systemctl status docker
   ```

2. **Check port conflicts:**
   ```bash
   netstat -tlnp | grep :3000
   netstat -tlnp | grep :3001
   ```

3. **Check logs:**
   ```bash
   ./scripts/deploy/docker-deploy.sh logs
   ```

#### Database Connection Issues

1. **Check database status:**
   ```bash
   docker compose -f docker-compose.prod.yml exec postgres pg_isready
   docker compose -f docker-compose.prod.yml exec redis redis-cli ping
   ```

2. **Check network connectivity:**
   ```bash
   docker network ls
   docker network inspect silhouette_silhouette-network-prod
   ```

#### High Memory Usage

1. **Check container resources:**
   ```bash
   docker stats
   ```

2. **Adjust memory limits in docker-compose.prod.yml:**
   ```yaml
   deploy:
     resources:
       limits:
         memory: 1G
   ```

#### SSL Certificate Issues

1. **Check certificate validity:**
   ```bash
   openssl x509 -in config/nginx/ssl/cert.pem -text -noout
   ```

2. **Renew Let's Encrypt certificates:**
   ```bash
   sudo certbot renew
   sudo cp /etc/letsencrypt/live/your-domain.com/* config/nginx/ssl/
   ```

### Performance Issues

#### Slow Response Times

1. **Check application metrics:**
   - Grafana dashboard
   - Prometheus queries

2. **Check database performance:**
   ```bash
   docker compose -f docker-compose.prod.yml exec postgres \
     psql -U haas -d haasdb -c "SELECT * FROM pg_stat_activity;"
   ```

3. **Check resource usage:**
   ```bash
   htop
   df -h
   free -m
   ```

### Recovery Procedures

#### Complete Service Recovery

1. **Stop all services:**
   ```bash
   ./scripts/deploy/docker-deploy.sh stop
   ```

2. **Remove containers and volumes:**
   ```bash
   docker compose -f docker-compose.prod.yml down -v
   ```

3. **Clean Docker system:**
   ```bash
   docker system prune -a
   ```

4. **Restore from backup (if needed):**
   ```bash
   ./scripts/deploy/docker-deploy.sh restore <backup-name>
   ```

5. **Rebuild and start:**
   ```bash
   ./scripts/deploy/docker-deploy.sh deploy
   ```

### Getting Help

#### Log Collection

For support, collect the following information:

```bash
# System information
uname -a
docker --version
docker compose version

# Service status
./scripts/deploy/docker-deploy.sh status

# Recent logs
./scripts/deploy/docker-deploy.sh logs --tail=100

# Resource usage
docker stats --no-stream
```

#### Support Channels

- **Documentation:** Check this guide and inline code comments
- **Issues:** Create detailed bug reports with logs
- **Community:** Join our community discussions

## 🔐 Security Considerations

### Production Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secret keys (256-bit)
- [ ] Configure SSL/TLS certificates
- [ ] Enable firewall rules
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Implement rate limiting
- [ ] Enable audit logging
- [ ] Use secrets management
- [ ] Regular security scans

### Network Security

```bash
# Configure firewall (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Container Security

- Run containers as non-root users
- Use specific base images (avoid `latest`)
- Scan images for vulnerabilities
- Limit container capabilities
- Use read-only filesystems where possible

## 📈 Scaling

### Horizontal Scaling

```yaml
# Scale backend instances
docker compose -f docker-compose.prod.yml up -d --scale backend=3

# Scale with load balancer
nginx:
  upstream backend {
    server backend_1:3001;
    server backend_2:3001;
    server backend_3:3001;
  }
```

### Vertical Scaling

```yaml
# Increase resource limits
backend:
  deploy:
    resources:
      limits:
        memory: 2G
        cpus: '2.0'
```

### Database Scaling

- **Read Replicas:** For PostgreSQL read scaling
- **Redis Cluster:** For high availability
- **Neo4j Cluster:** For graph database scaling

## 📚 Additional Resources

- [API Documentation](./docs/api/README.md)
- [Developer Guide](./docs/development/README.md)
- [Architecture Overview](./docs/architecture/README.md)
- [Security Guide](./docs/security/README.md)
- [Performance Tuning](./docs/performance/README.md)

---

**Author:** Silhouette Anonimo  
**Version:** 1.0.0  
**Last Updated:** 2025-11-09

For the latest updates and documentation, visit the project repository.