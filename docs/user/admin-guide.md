# Guía de Administración - Silhouette Workflow Platform

## 🏢 Introducción a la Administración

Esta guía está diseñada para administradores de sistemas, DevOps engineers y responsables de TI que necesitan gestionar, configurar y mantener la plataforma Silhouette Workflow en un entorno empresarial.

### Roles de Administración

```
👑 SUPER ADMIN
  • Control total del sistema
  • Gestión de organizaciones
  • Configuración global de la plataforma
  • Auditoría y compliance
  • Gestión de infraestructura

🏢 ORG ADMIN  
  • Gestión completa de su organización
  • Configuración de equipos y usuarios
  • Políticas de seguridad
  • Gestión de integraciones
  • Reportes ejecutivos

🔧 TECH ADMIN
  • Gestión técnica de workflows
  • Configuración de infraestructura
  • Monitoreo y troubleshooting
  • Gestión de integraciones
  • Backup y disaster recovery

📊 ANALYTICS ADMIN
  • Configuración de dashboards
  • Gestión de reportes
  • Configuración de alertas
  • Análisis de uso
  • Métricas de negocio

👤 USER ADMIN
  • Gestión de usuarios
  • Asignación de roles
  • Gestión de permisos
  • Onboarding de usuarios
  • Soporte básico
```

---

## 🛠️ Configuración Inicial del Sistema

### 1. Configuración Post-Instalación

#### Variables de Entorno Críticas

```bash
# Base de datos principal
DATABASE_URL=postgresql://haas:haaspass@postgres:5432/haasdb
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# Redis para caching y sessions
REDIS_URL=redis://:haaspass@redis:6379
REDIS_CLUSTER_NODES=redis:6379
REDIS_TTL=3600

# JWT y seguridad
JWT_SECRET_KEY=haas-super-secret-key-2025-production
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=30d
BCRYPT_ROUNDS=12
SESSION_SECRET=haas-session-secret-2025

# Encriptación
ENCRYPTION_KEY=haas-encryption-key-2025-production
ENCRYPTION_ALGORITHM=aes-256-gcm

# Email y notificaciones
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@tuempresa.com
SMTP_PASS=your-smtp-password
SMTP_FROM_NAME="Silhouette Platform"
SMTP_FROM_EMAIL=noreply@tuempresa.com

# Configuración de la aplicación
NODE_ENV=production
API_PORT=3000
API_HOST=0.0.0.0
FRONTEND_URL=https://silhouette.tuempresa.com
API_URL=https://api.silhouette.tuempresa.com

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESS_REQUESTS=true

# Configuración de logs
LOG_LEVEL=info
LOG_FORMAT=combined
LOG_FILE=./logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5
LOG_DATE_PATTERN=YYYY-MM-DD

# Configuración de monitoreo
PROMETHEUS_ENABLED=true
GRAFANA_URL=http://grafana:3001
PROMETHEUS_URL=http://prometheus:9090
JAEGER_URL=http://jaeger:14268

# Integraciones externas
OPENAI_API_KEY=sk-...
STRIPE_API_KEY=sk_live_...
SLACK_WEBHOOK_URL=your-slack-webhook-url-here
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...

# Configuración de backup
BACKUP_S3_BUCKET=silhouette-backups-prod
BACKUP_ENCRYPTION_KEY=backup-encryption-key-2025
BACKUP_RETENTION_DAYS=90
BACKUP_SCHEDULE=0 2 * * *
```

#### Configuración de Base de Datos

```sql
-- Configuración de PostgreSQL para producción
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Configuración de índices para performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_org_id 
ON workflows(org_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_status 
ON workflows(status) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_workflow_id 
ON workflow_executions(workflow_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at 
ON audit_logs(created_at);

-- Habilitar extensions necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

#### Configuración de Redis

```bash
# /etc/redis/redis.conf para producción
maxmemory 1gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
tcp-keepalive 300
timeout 0
tcp-backlog 511
```

### 2. Configuración de Seguridad

#### Configuración de Nginx como Reverse Proxy

```nginx
# /etc/nginx/sites-available/silhouette
upstream backend {
    server backend:3000;
    keepalive 32;
}

upstream frontend {
    server frontend:3000;
    keepalive 32;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;
limit_req_zone $binary_remote_addr zone=upload:10m rate=1r/m;

server {
    listen 80;
    server_name api.silhouette.tuempresa.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.silhouette.tuempresa.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/silhouette.crt;
    ssl_certificate_key /etc/ssl/private/silhouette.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;";

    # API Routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Auth Routes (stricter rate limiting)
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # File uploads
    location /api/upload/ {
        limit_req zone=upload burst=2 nodelay;
        client_max_body_size 100M;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support for real-time features
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://backend;
    }
}

# Frontend
server {
    listen 443 ssl http2;
    server_name silhouette.tuempresa.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/silhouette.crt;
    ssl_certificate_key /etc/ssl/private/silhouette.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Configuración de Firewalls

```bash
#!/bin/bash
# /etc/ufw/silhouette.rules

# Reset UFW
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (restrict to specific IP)
ufw allow from YOUR_ADMIN_IP to any port 22

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow specific application ports
ufw allow 3000/tcp comment "Backend API"
ufw allow 3001/tcp comment "Frontend"
ufw allow 5432/tcp comment "PostgreSQL" # Only from internal network
ufw allow 6379/tcp comment "Redis" # Only from internal network

# Allow monitoring ports (internal only)
ufw allow from 10.0.0.0/8 to any port 9090 comment "Prometheus"
ufw allow from 10.0.0.0/8 to any port 3001 comment "Grafana"

# Rate limiting
ufw limit ssh
ufw limit 443/tcp

# Enable UFW
ufw --force enable
```

---

## 👥 Gestión de Usuarios y Equipos

### 1. Estructura Organizacional

#### Jerarquía de Roles

```typescript
interface RoleHierarchy {
  super_admin: {
    level: 100;
    permissions: string[];
    canManage: ['org_admin', 'tech_admin', 'analytics_admin', 'user_admin'];
    description: 'Super administrator with system-wide access';
  };
  org_admin: {
    level: 80;
    permissions: string[];
    canManage: ['tech_admin', 'analytics_admin', 'user_admin', 'developer', 'analyst', 'viewer'];
    description: 'Organization administrator';
  };
  tech_admin: {
    level: 60;
    permissions: string[];
    canManage: ['developer', 'analyst', 'viewer'];
    description: 'Technical administrator';
  };
  analytics_admin: {
    level: 60;
    permissions: string[];
    canManage: ['analyst', 'viewer'];
    description: 'Analytics administrator';
  };
  user_admin: {
    level: 60;
    permissions: string[];
    canManage: ['analyst', 'viewer'];
    description: 'User management administrator';
  };
  developer: {
    level: 40;
    permissions: string[];
    canCreate: ['workflows', 'credentials'];
    canExecute: ['workflows'];
    description: 'Workflow developer';
  };
  analyst: {
    level: 20;
    permissions: string[];
    canExecute: ['workflows'];
    canView: ['analytics', 'reports'];
    description: 'Data analyst';
  };
  viewer: {
    level: 10;
    permissions: string[];
    canView: ['workflows', 'analytics'];
    description: 'Read-only user';
  };
}
```

#### Gestión de Organizaciones

```sql
-- Crear nueva organización
INSERT INTO organizations (
  id,
  name,
  slug,
  description,
  domain,
  settings,
  billing_plan,
  status,
  created_at,
  updated_at
) VALUES (
  'org-uuid-12345',
  'Tu Empresa S.L.',
  'tu-empresa',
  'Empresa líder en tecnología',
  'tuempresa.com',
  '{
    "timezone": "Europe/Madrid",
    "language": "es",
    "date_format": "DD/MM/YYYY",
    "time_format": "24h",
    "currency": "EUR",
    "features": {
      "ai_ml": true,
      "advanced_analytics": true,
      "custom_integrations": true,
      "sso": false,
      "audit_logs": true
    },
    "limits": {
      "workflows": 1000,
      "users": 100,
      "executions_per_month": 100000,
      "storage_gb": 50,
      "api_calls_per_month": 1000000
    }
  }',
  'enterprise',
  'active',
  NOW(),
  NOW()
);

-- Configurar dominios de la organización
INSERT INTO organization_domains (
  id,
  org_id,
  domain,
  is_primary,
  verification_status,
  verified_at
) VALUES (
  'domain-uuid-12345',
  'org-uuid-12345',
  'tuempresa.com',
  true,
  'verified',
  NOW()
);
```

### 2. Gestión de Usuarios

#### Creación de Usuarios

```json
{
  "userRequest": {
    "email": "admin@tuempresa.com",
    "password": "TempPassword123!",
    "name": "Juan Pérez",
    "role": "org_admin",
    "orgId": "org-uuid-12345",
    "profile": {
      "firstName": "Juan",
      "lastName": "Pérez",
      "title": "Administrador de Sistemas",
      "department": "IT",
      "location": "Madrid, España",
      "phone": "+34 600 123 456",
      "timezone": "Europe/Madrid",
      "language": "es"
    },
    "settings": {
      "emailNotifications": true,
      "pushNotifications": true,
      "twoFactorAuth": false,
      "theme": "light",
      "dashboard": "default"
    },
    "permissions": {
      "workflows": {
        "create": true,
        "read": true,
        "update": true,
        "delete": true,
        "execute": true
      },
      "users": {
        "create": true,
        "read": true,
        "update": true,
        "delete": true
      },
      "analytics": {
        "read": true,
        "export": true,
        "dashboards": true
      },
      "admin": {
        "org_settings": true,
        "billing": true,
        "integrations": true
      }
    }
  }
}
```

#### Gestión de Permisos

```typescript
interface PermissionMatrix {
  workflows: {
    create: RolePermission[];
    read: RolePermission[];
    update: RolePermission[];
    delete: RolePermission[];
    execute: RolePermission[];
    share: RolePermission[];
  };
  credentials: {
    create: RolePermission[];
    read: RolePermission[];
    update: RolePermission[];
    delete: RolePermission[];
    use: RolePermission[];
  };
  analytics: {
    read: RolePermission[];
    export: RolePermission[];
    dashboards: RolePermission[];
    reports: RolePermission[];
  };
  users: {
    create: RolePermission[];
    read: RolePermission[];
    update: RolePermission[];
    delete: RolePermission[];
    manage_roles: RolePermission[];
  };
  admin: {
    org_settings: RolePermission[];
    billing: RolePermission[];
    integrations: RolePermission[];
    audit_logs: RolePermission[];
  };
}

type RolePermission = {
  role: string;
  allowed: boolean;
  conditions?: string[];
};
```

#### Configuración de Equipos

```json
{
  "teamRequest": {
    "name": "Desarrollo Backend",
    "description": "Equipo responsable del desarrollo backend",
    "orgId": "org-uuid-12345",
    "lead": "user-uuid-12345",
    "members": [
      {
        "userId": "user-uuid-12345",
        "role": "team_lead",
        "permissions": {
          "team_management": true,
          "workflows": {
            "create": true,
            "read": true,
            "update": true,
            "delete": true,
            "execute": true
          }
        }
      },
      {
        "userId": "user-uuid-23456",
        "role": "developer",
        "permissions": {
          "workflows": {
            "create": true,
            "read": true,
            "update": true,
            "execute": true
          },
          "credentials": {
            "read": true,
            "use": true
          }
        }
      },
      {
        "userId": "user-uuid-34567",
        "role": "analyst",
        "permissions": {
          "workflows": {
            "read": true,
            "execute": true
          },
          "analytics": {
            "read": true,
            "export": true
          }
        }
      }
    ],
    "settings": {
      "defaultWorkflowPermissions": {
        "create": true,
        "read": true,
        "update": true,
        "execute": true
      },
      "notificationSettings": {
        "email": true,
        "slack": true,
        "workflowFailure": true,
        "workflowCompletion": false,
        "weeklySummary": true
      },
      "workingHours": {
        "timezone": "Europe/Madrid",
        "start": "09:00",
        "end": "18:00",
        "workDays": ["monday", "tuesday", "wednesday", "thursday", "friday"]
      }
    }
  }
}
```

### 3. Single Sign-On (SSO)

#### Configuración SAML 2.0

```json
{
  "ssoConfig": {
    "provider": "saml",
    "enabled": true,
    "settings": {
      "entryPoint": "https://idp.tuempresa.com/saml2/login",
      "issuer": "https://silhouette.tuempresa.com/saml/metadata",
      "cert": "-----BEGIN CERTIFICATE-----\nMIID...certificate content...",
      "callbackUrl": "https://silhouette.tuempresa.com/auth/saml/callback",
      "logoutUrl": "https://silhouette.tuempresa.com/auth/logout",
      "signatureAlgorithm": "sha256",
      "digestAlgorithm": "sha256"
    },
    "attributeMapping": {
      "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      "name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
      "firstName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
      "lastName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
      "title": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/title",
      "department": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/department",
      "groups": "http://schemas.xmlsoap.org/claims/Group"
    },
    "roleMapping": {
      "admin_group": "org_admin",
      "developer_group": "developer", 
      "analyst_group": "analyst",
      "viewer_group": "viewer"
    }
  }
}
```

#### Configuración OAuth 2.0

```json
{
  "oauthConfig": {
    "provider": "oauth2",
    "enabled": true,
    "providers": {
      "google": {
        "clientId": "google-client-id",
        "clientSecret": "google-client-secret",
        "redirectUri": "https://silhouette.tuempresa.com/auth/google/callback",
        "scopes": ["openid", "email", "profile"],
        "domain": "tuempresa.com"
      },
      "azure": {
        "clientId": "azure-client-id",
        "clientSecret": "azure-client-secret", 
        "redirectUri": "https://silhouette.tuempresa.com/auth/azure/callback",
        "tenantId": "azure-tenant-id",
        "scopes": ["openid", "email", "profile", "User.Read", "Group.Read.All"]
      }
    }
  }
}
```

---

## 🔐 Gestión de Seguridad

### 1. Autenticación y Autorización

#### Configuración de JWT

```typescript
interface JWTConfig {
  secretKey: string;
  algorithms: string[];
  expiresIn: string;
  refreshExpiresIn: string;
  issuer: string;
  audience: string;
  accessTokenTtl: number; // 8 hours
  refreshTokenTtl: number; // 30 days
  maxRefreshTokens: number; // 5 active refresh tokens per user
  rotationEnabled: boolean;
  blacklistEnabled: boolean;
}

const jwtConfig: JWTConfig = {
  secretKey: process.env.JWT_SECRET_KEY!,
  algorithms: ['HS256'],
  expiresIn: '8h',
  refreshExpiresIn: '30d',
  issuer: 'silhouette-platform',
  audience: 'silhouette-api',
  accessTokenTtl: 8 * 60 * 60, // 8 hours in seconds
  refreshTokenTtl: 30 * 24 * 60 * 60, // 30 days in seconds
  maxRefreshTokens: 5,
  rotationEnabled: true,
  blacklistEnabled: true
};
```

#### Middleware de Autorización

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/auth.service';

export const authorize = (requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'Token de acceso requerido',
          error: 'MISSING_TOKEN'
        });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!) as any;
      
      // Obtener información del usuario y sus permisos
      const user = await AuthService.getUserById(decoded.sub);
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no válido o inactivo',
          error: 'INVALID_USER'
        });
      }

      // Verificar permisos
      const userPermissions = await AuthService.getUserPermissions(user.id);
      const hasPermissions = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermissions) {
        return res.status(403).json({
          success: false,
          message: 'Permisos insuficientes',
          error: 'INSUFFICIENT_PERMISSIONS',
          required: requiredPermissions,
          userPermissions
        });
      }

      // Adjuntar usuario a la request
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
        permissions: userPermissions
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          message: 'Token expirado',
          error: 'TOKEN_EXPIRED'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Token inválido',
        error: 'INVALID_TOKEN'
      });
    }
  };
};
```

### 2. Rate Limiting

#### Configuración de Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// Rate limiting general
export const generalLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:general:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Demasiadas solicitudes, inténtelo de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/system/health';
  }
});

// Rate limiting para autenticación
export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    error: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Demasiados intentos de autenticación, inténtelo de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Rate limiting para uploads
export const uploadLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:upload:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 uploads per hour
  message: {
    success: false,
    error: 'UPLOAD_RATE_LIMIT_EXCEEDED',
    message: 'Límite de uploads excedido, inténtelo de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false
});
```

### 3. Encriptación de Datos

#### Configuración de Encriptación

```typescript
import crypto from 'crypto';

interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations: number;
}

const encryptionConfig: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 12,
  saltLength: 16,
  iterations: 100000
};

export class EncryptionService {
  private key: Buffer;

  constructor() {
    this.key = crypto.scryptSync(
      process.env.ENCRYPTION_KEY!, 
      'salt', 
      encryptionConfig.keyLength
    );
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(encryptionConfig.ivLength);
    const cipher = crypto.createCipher(encryptionConfig.algorithm, this.key);
    cipher.setAAD(Buffer.from('additional-auth-data'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]).toString('base64');
  }

  decrypt(encryptedData: string): string {
    const buffer = Buffer.from(encryptedData, 'base64');
    
    const iv = buffer.subarray(0, encryptionConfig.ivLength);
    const authTag = buffer.subarray(
      encryptionConfig.ivLength, 
      encryptionConfig.ivLength + 16
    );
    const encrypted = buffer.subarray(encryptionConfig.ivLength + 16);

    const decipher = crypto.createDecipher(encryptionConfig.algorithm, this.key);
    decipher.setAAD(Buffer.from('additional-auth-data'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

### 4. Auditoría y Compliance

#### Configuración de Audit Logs

```sql
-- Crear tabla de audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  severity VARCHAR(20) DEFAULT 'info',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);

-- Particionado por fecha (opcional para mejor performance)
CREATE TABLE audit_logs_2025_11 PARTITION OF audit_logs
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
```

#### Configuración de Compliance

```json
{
  "complianceConfig": {
    "soc2": {
      "enabled": true,
      "controls": {
        "cc1.1": {
          "description": "The entity maintains documentation of its authorization control framework",
          "status": "compliant",
          "lastReview": "2025-10-15T10:00:00Z",
          "nextReview": "2026-01-15T10:00:00Z"
        },
        "cc2.1": {
          "description": "The entity uses logical and physical access controls to safeguard the system",
          "status": "compliant",
          "lastReview": "2025-10-15T10:00:00Z",
          "nextReview": "2026-01-15T10:00:00Z"
        }
      },
      "evidence": [
        {
          "controlId": "cc1.1",
          "evidenceType": "documentation",
          "description": "Access control policy",
          "lastUpdated": "2025-10-15T10:00:00Z"
        }
      ]
    },
    "gdpr": {
      "enabled": true,
      "dataProcessing": {
        "lawfulBasis": "consent",
        "retentionPeriod": "7 years",
        "dataMinimization": true,
        "purposeLimitation": true,
        "storageLimitation": true
      },
      "dataSubjectRights": {
        "rightToAccess": true,
        "rightToRectification": true,
        "rightToErasure": true,
        "rightToPortability": true,
        "rightToObject": true
      },
      "dpo": {
        "name": "Data Protection Officer",
        "email": "dpo@tuempresa.com",
        "phone": "+34 600 123 456"
      }
    },
    "hipaa": {
      "enabled": false,
      "applicable": false,
      "note": "No PHI data processed"
    }
  }
}
```

---

## 📊 Monitoreo y Analytics

### 1. Configuración de Monitoring

#### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "silhouette_rules.yml"

scrape_configs:
  - job_name: 'silhouette-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/api/system/metrics'
    scrape_interval: 30s

  - job_name: 'silhouette-frontend'
    static_configs:
      - targets: ['frontend:3000']
    metrics_path: '/api/system/metrics'
    scrape_interval: 30s

  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres:5432']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 30s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### Grafana Dashboards

```json
{
  "dashboard": {
    "dashboardId": "silhouette-overview",
    "title": "Silhouette Platform Overview",
    "description": "Main dashboard for Silhouette Workflow Platform",
    "tags": ["silhouette", "workflow", "platform"],
    "timezone": "browser",
    "refresh": "30s",
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "panels": [
      {
        "id": 1,
        "title": "System Health",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=\"silhouette-backend\"}",
            "legendFormat": "Backend"
          },
          {
            "expr": "up{job=\"silhouette-frontend\"}",
            "legendFormat": "Frontend"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "green", "value": 1}
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Workflow Executions",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(workflow_executions_total[5m])",
            "legendFormat": "Executions/min"
          }
        ]
      },
      {
        "id": 3,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P50"
          }
        ]
      }
    ]
  }
}
```

### 2. Alertas y Notificaciones

#### Configuración de Alertas

```yaml
# silhouette_alerts.yml
groups:
  - name: silhouette.rules
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} for the last 5 minutes"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: LowWorkflowSuccessRate
        expr: rate(workflow_executions_total{status="success"}[5m]) / rate(workflow_executions_total[5m]) < 0.95
        for: 5m
        labels:
          severity: warning
          team: developers
        annotations:
          summary: "Low workflow success rate"
          description: "Success rate is {{ $value | humanizePercentage }}"

      - alert: DatabaseConnectionHigh
        expr: postgresql_connections_active / postgresql_connections_max > 0.8
        for: 2m
        labels:
          severity: critical
          team: dba
        annotations:
          summary: "High database connection usage"
          description: "Database connections are at {{ $value | humanizePercentage }}"
```

#### Configuración de Notificaciones

```json
{
  "notificationConfig": {
    "email": {
      "enabled": true,
      "smtp": {
        "host": "smtp.gmail.com",
        "port": 587,
        "secure": false,
        "auth": {
          "user": "alerts@tuempresa.com",
          "pass": "app-specific-password"
        }
      },
      "recipients": {
        "critical": ["ops-team@tuempresa.com", "manager@tuempresa.com"],
        "warning": ["ops-team@tuempresa.com"],
        "info": ["ops-team@tuempresa.com"]
      }
    },
    "slack": {
      "enabled": true,
      "webhookUrl": "your-slack-webhook-url-here",
      "channels": {
        "critical": "#alerts-critical",
        "warning": "#alerts-warning", 
        "info": "#alerts-info"
      }
    },
    "pagerduty": {
      "enabled": false,
      "integrationKey": "your-pagerduty-integration-key"
    }
  }
}
```

---

## 🔧 Troubleshooting Común

### 1. Problemas de Autenticación

#### Problema: "Token expired" frecuente

**Síntomas:**
- Usuarios reciben errores de token expirado frecuentemente
- Sesiones se cortan inesperadamente
- Interrupciones en workflows en ejecución

**Diagnóstico:**
```bash
# Verificar configuración JWT
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/auth/verify

# Revisar logs de autenticación
docker-compose logs backend | grep -i "jwt\|auth\|token"

# Verificar configuración de TTL
grep JWT_EXPIRES_IN .env
```

**Solución:**
```bash
# 1. Ajustar configuración de JWT
echo "JWT_EXPIRES_IN=12h" >> .env  # Aumentar de 8h a 12h
echo "JWT_REFRESH_EXPIRES_IN=7d" >> .env  # Aumentar refresh token TTL

# 2. Verificar sincronización de tiempo
ntpdate -s time.nist.gov

# 3. Reiniciar servicios
docker-compose restart backend

# 4. Verificar configuración de sesiones
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

#### Problema: SSO no funciona

**Síntomas:**
- Users can't login via SSO
- "Invalid SAML response" errors
- 302 redirects loop

**Diagnóstico:**
```bash
# Verificar configuración SAML
curl -X GET "https://idp.tuempresa.com/saml2/metadata"

# Revisar logs de SAML
docker-compose logs backend | grep -i saml

# Verificar certificados
openssl x509 -in /path/to/cert.pem -text -noout
```

**Solución:**
```json
{
  "ssoDebugging": {
    "verifyIdPMetadata": "curl -X GET 'https://idp.tuempresa.com/saml2/metadata'",
    "checkCertValidity": "openssl x509 -in /path/to/cert.pem -text -noout",
    "validateSamlResponse": "Use SAML tracer browser extension for debugging"
  }
}
```

### 2. Problemas de Performance

#### Problema: Respuestas lentas de la API

**Síntomas:**
- Timeout en requests
- UI se carga lentamente
- Workflows tardan en iniciarse

**Diagnóstico:**
```bash
# Verificar métricas de performance
curl http://localhost:3000/api/system/metrics

# Revisar uso de recursos
docker stats

# Verificar consultas lentas en PostgreSQL
psql -d haasdb -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Revisar caché Redis
redis-cli info stats | grep keyspace
```

**Solución:**
```sql
-- 1. Optimizar consultas problemáticas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_status_created 
ON workflows(status, created_at DESC);

-- 2. Configurar connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';

-- 3. Optimizar Redis
redis-cli CONFIG SET maxmemory 1gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### 3. Problemas de Base de Datos

#### Problema: Conexiones a DB agotadas

**Síntomas:**
- "FATAL: remaining connection slots are reserved" errors
- Applications can't connect to database
- Workflows fallan al ejecutar

**Diagnóstico:**
```sql
-- Verificar conexiones activas
SELECT count(*) as active_connections, 
       state 
FROM pg_stat_activity 
GROUP BY state;

-- Verificar configuración de conexiones
SHOW max_connections;
SHOW shared_buffers;

-- Revisar queries bloqueadas
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
WHERE NOT blocked_locks.granted;
```

**Solución:**
```sql
-- 1. Terminar conexiones zombi
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle in transaction' 
AND state_change < now() - interval '5 minutes';

-- 2. Aumentar max connections (temporal)
ALTER SYSTEM SET max_connections = 300;

-- 3. Implementar connection pooling
-- En application code
const pool = new Pool({
  host: 'postgres',
  port: 5432,
  database: 'haasdb',
  user: 'haas',
  password: 'haaspass',
  max: 20, // maximum number of clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 4. Problemas de Workflows

#### Problema: Workflows fallan al ejecutar

**Síntomas:**
- Workflows en estado "failed"
- Nodos de error en ejecuciones
- Timeouts frecuentes

**Diagnóstico:**
```bash
# Verificar logs de workflow execution
docker-compose logs backend | grep -i "workflow\|execution"

# Revisar estado de servicios externos
curl -I https://api.github.com/status
curl -I https://api.stripe.com/v1

# Verificar conectividad de red
ping postgres
ping redis
```

**Solución:**
```json
{
  "workflowTroubleshooting": {
    "commonIssues": {
      "external_api_failures": {
        "solution": "Implement retry logic with exponential backoff",
        "example": "Use axios-retry or similar library"
      },
      "database_connection_issues": {
        "solution": "Check connection pool configuration",
        "command": "psql -h postgres -U haas -d haasdb -c 'SELECT 1;'"
      },
      "memory_issues": {
        "solution": "Increase memory limits and implement garbage collection",
        "config": "NODE_OPTIONS='--max-old-space-size=4096'"
      }
    }
  }
}
```

---

## 🏆 Mejores Prácticas de Administración

### 1. Seguridad

#### ✅ Hacer
```bash
# 1. Rotar secrets regularmente
./scripts/rotate-secrets.sh

# 2. Actualizar dependencias
npm audit fix
docker-compose pull

# 3. Habilitar 2FA para todos los admins
# Configurar TOTP en cuentas administrativas

# 4. Configurar backup encryption
./scripts/setup-backup-encryption.sh

# 5. Monitorear intentos de acceso fallidos
# Configurar alertas para múltiples failed logins
```

#### ❌ Evitar
```bash
# 1. No usar credenciales por defecto
# ❌ BAD: Using default passwords
# ✅ GOOD: Generate secure random passwords

# 2. No exponer secrets en código
# ❌ BAD: Hardcoded API keys
# ✅ GOOD: Environment variables

# 3. No deshabilitar SSL/TLS
# ❌ BAD: Accepting HTTP in production
# ✅ GOOD: Force HTTPS with HSTS

# 4. No ignorar alertas de seguridad
# ❌ BAD: Dismissing security warnings
# ✅ GOOD: Address security issues promptly
```

### 2. Performance

#### ✅ Hacer
```sql
-- 1. Monitorear índices regularmente
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;

-- 2. Optimizar consultas regularmente
EXPLAIN ANALYZE SELECT * FROM workflows WHERE status = 'active';

-- 3. Configurar connection pooling
-- Use pgBouncer or connection pool in application

-- 4. Implementar caching estratégico
-- Cache frequently accessed data in Redis

-- 5. Monitorear resource usage
-- Set up alerts for CPU, memory, disk usage
```

#### ❌ Evitar
```sql
-- 1. No crear índices sin necesidad
-- ❌ BAD: Indexing every column
-- ✅ GOOD: Index based on query patterns

-- 2. No usar SELECT * en producción
-- ❌ BAD: SELECT * FROM large_table
-- ✅ GOOD: SELECT specific columns needed

-- 3. No ignorar N+1 query problems
-- ❌ BAD: Query in loop
-- ✅ GOOD: Use JOINs or batch queries

-- 4. No configurar timeouts muy altos
-- ❌ BAD: No timeout limits
-- ✅ GOOD: Set appropriate timeouts
```

### 3. Monitoreo

#### ✅ Hacer
```json
{
  "monitoringBestPractices": {
    "keyMetrics": [
      "API response time (P95, P99)",
      "Error rate by endpoint",
      "Database connection pool usage",
      "Memory and CPU utilization",
      "Workflow execution success rate"
    ],
    "alertingRules": [
      "Response time > 2s for 5 minutes",
      "Error rate > 5% for 2 minutes", 
      "CPU usage > 80% for 10 minutes",
      "Database connections > 80% of max",
      "Disk usage > 85%"
    ],
    "dashboardFrequency": "Update every 30 seconds",
    "logRetention": "30 days for info, 90 days for error",
    "backupVerification": "Test restore monthly"
  }
}
```

#### ❌ Evitar
```json
{
  "monitoringAntiPatterns": {
    "tooManyMetrics": "Monitor only what's actionable",
    "noisyAlerts": "Configure meaningful thresholds",
    "ignoredAlerts": "Address alerts within SLA timeframes",
    "noRetention": "Keep logs for compliance and debugging",
    "manualMonitoring": "Automate monitoring and alerting"
  }
}
```

### 4. Backup y Disaster Recovery

#### ✅ Hacer
```bash
#!/bin/bash
# backup-strategy.sh

# 1. Automated daily backups
0 2 * * * /scripts/automated-backup.sh

# 2. Test backup restoration monthly
0 6 1 * * /scripts/test-backup-restore.sh

# 3. Cross-region backup replication
# Replicate backups to different region

# 4. Document RTO/RPO targets
# RTO: 4 hours, RPO: 1 hour

# 5. Regular DR drills
# Quarterly disaster recovery tests
```

#### ❌ Evitar
```bash
# 1. No confiar solo en backups locales
# ❌ BAD: Backups on same server
# ✅ GOOD: Cross-region backup storage

# 2. No probar la restauración
# ❌ BAD: Assuming backups work
# ✅ GOOD: Regular restore testing

# 3. No tener plan de DR documentado
# ❌ BAD: Ad-hoc disaster response
# ✅ GOOD: Documented DR procedures

# 4. No verificar integridad de backups
# ❌ BAD: No backup validation
# ✅ GOOD: Automated backup verification
```

---

## 🏁 Conclusión

La administración efectiva de Silhouette Workflow Platform requiere un enfoque integral que cubra seguridad, performance, monitoreo y compliance. Esta guía proporciona las herramientas y mejores prácticas necesarias para mantener una plataforma empresarial estable y segura.

### Checklist de Administración

#### Configuración Inicial
- [ ] Variables de entorno configuradas
- [ ] Base de datos optimizada
- [ ] SSL/TLS configurado
- [ ] Rate limiting implementado
- [ ] Logs configurados
- [ ] Backup strategy implementada

#### Seguridad
- [ ] Roles y permisos configurados
- [ ] SSO habilitado (si aplica)
- [ ] 2FA habilitado para admins
- [ ] Audit logs configurados
- [ ] Compliance framework activo
- [ ] Secrets rotation schedule

#### Monitoreo
- [ ] Métricas configuradas
- [ ] Dashboards implementados
- [ ] Alertas configuradas
- [ ] Logs centralizados
- [ ] Performance baselines establecidos
- [ ] Capacity planning documentado

#### Operaciones
- [ ] Backup automatizado
- [ ] Disaster recovery plan
- [ ] Incident response procedures
- [ ] Maintenance windows definidos
- [ ] Documentation actualizada
- [ ] Training programado

### Recursos Adicionales

- 📖 [API Reference](api-reference.md)
- 🔧 [Technical Documentation](technical-documentation.md)
- 🚀 [Deployment Guide](deployment-guide.md)
- 🔒 [Security Guide](security-guide.md)
- 📊 [Analytics Configuration](analytics-configuration.md)

**¡Con esta guía, estás preparado para administrar Silhouette Workflow Platform de manera profesional y eficiente! 🎯**
