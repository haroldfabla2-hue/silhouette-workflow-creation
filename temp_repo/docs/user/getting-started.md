# Guía de Inicio Rápido - Silhouette Workflow Platform

## 🚀 Bienvenido a Silhouette Workflow Platform

Esta guía te ayudará a configurar y comenzar a usar Silhouette Workflow Platform en menos de 10 minutos. Silhouette es una plataforma empresarial de automatización con capacidades avanzadas de IA que te permite crear, ejecutar y optimizar workflows de manera visual e inteligente.

---

## 📋 Requisitos Previos

### Requisitos del Sistema

- **Node.js**: Versión 18.0 o superior
- **Docker**: Versión 20.0 o superior  
- **Docker Compose**: Versión 2.0 o superior
- **PostgreSQL**: Versión 14 o superior (si instalas localmente)
- **Redis**: Versión 6.0 o superior (si instalas localmente)
- **Git**: Para clonar el repositorio

### Requisitos de Hardware

- **CPU**: 4 cores mínimo
- **RAM**: 8GB mínimo (16GB recomendado)
- **Almacenamiento**: 50GB disponible
- **Red**: Conexión estable a internet

---

## 🛠️ Instalación Rápida

### Opción 1: Instalación con Docker (Recomendada)

#### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-empresa/silhouette-workflow-platform.git
cd silhouette-workflow-platform
```

#### 2. Configurar Variables de Entorno

```bash
# Copiar archivo de configuración
cp .env.example .env

# Editar configuración
nano .env
```

**Configuración mínima requerida:**

```bash
# Base de datos
POSTGRES_USER=haas
POSTGRES_PASSWORD=haaspass
POSTGRES_DB=haasdb
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Redis
REDIS_PASSWORD=haaspass
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET_KEY=tu-clave-secreta-super-segura-2025
JWT_EXPIRES_IN=7d

# Encriptación
ENCRYPTION_KEY=tu-clave-de-encriptacion-2025

# Seguridad
BCRYPT_ROUNDS=12
SESSION_SECRET=tu-sesion-secreta-2025

# URLs
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3000
```

#### 3. Levantar los Servicios

```bash
# Construir e iniciar todos los servicios
docker-compose up -d

# Verificar que todos los servicios estén corriendo
docker-compose ps
```

**Deberías ver una salida similar a:**

```
       Name                     Command               State                    Ports                  
-------------------------------------------------------------------------------------------------------
silhouette_backend    docker-entrypoint.sh npm run ...   Up      0.0.0.0:3000->3000/tcp            
silhouette_frontend   docker-entrypoint.sh npm run ...   Up      0.0.0.0:3000->3000/tcp            
silhouette_postgres   docker-entrypoint.sh postgres      Up      0.0.0.0:5432->5432/tcp            
silhouette_redis      docker-entrypoint.sh redis-server  Up      0.0.0.0:6379->6379/tcp            
silhouette_rabbitmq   docker-entrypoint.sh rabbitmq-...  Up      0.0.0.0:5672->5672/tcp            
```

#### 4. Verificar la Instalación

```bash
# Verificar el backend
curl http://localhost:3000/api/system/health

# Verificar el frontend
curl http://localhost:3000
```

---

### Opción 2: Instalación Manual

#### 1. Instalar Dependencias

```bash
# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install
```

#### 2. Configurar Base de Datos

```bash
# Crear base de datos PostgreSQL
createdb haasdb

# Instalar y configurar Redis
sudo systemctl start redis
sudo systemctl enable redis
```

#### 3. Configurar y Ejecutar

```bash
# Backend
cd backend
cp .env.example .env
npm run build
npm start

# Frontend (en otra terminal)
cd frontend
cp .env.example .env.local
npm run dev
```

---

## 🔐 Configuración Inicial

### 1. Acceso a la Plataforma

Una vez que los servicios estén corriendo, accede a:

- **Frontend**: http://localhost:3000
- **API Documentación**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/system/health

### 2. Primer Registro

1. Abre tu navegador en http://localhost:3000
2. Haz clic en "Registrarse"
3. Completa el formulario:

```
Email: admin@tuempresa.com
Contraseña: Password123!
Nombre: Administrador
Nombre de Organización: Tu Empresa S.L.
```

4. Haz clic en "Crear Cuenta"

### 3. Configuración de Organización

Después del registro, configura tu organización:

#### Configuración Básica

```
Nombre de la Organización: Tu Empresa S.L.
Descripción: Empresa líder en tecnología
Zona Horaria: UTC+1 (Europa/Madrid)
Idioma: Español
```

#### Configuración de Seguridad

```
Política de Contraseñas:
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos un número
- Al menos un carácter especial

Configuración de Sesión:
- Duración de sesión: 8 horas
- Requerir autenticación de dos factores: Opcional
- Límite de intentos de login: 5
```

### 4. Configuración de Infraestructura

#### Configurar Servicios Externos

```bash
# Integrar con servicios de IA (opcional)
OPENAI_API_KEY=sk-...

# Configurar monitoreo
GRAFANA_URL=http://localhost:3001
PROMETHEUS_URL=http://localhost:3002

# Configurar alertas
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

#### Configurar Conectores

1. Ve a **Configuración → Conectores**
2. Habilita los conectores que necesitas:

```
✅ Conectores Básicos
  - HTTP/HTTPS
  - Webhooks
  - FTP/SFTP
  - Email (SMTP)

✅ Conectores Empresariales  
  - Salesforce
  - Microsoft 365
  - Google Workspace
  - SAP
  - Oracle

✅ Bases de Datos
  - PostgreSQL
  - MySQL
  - MongoDB
  - Redis
  - Elasticsearch

✅ Mensajería
  - RabbitMQ
  - Apache Kafka
  - Amazon SQS
  - Azure Service Bus
```

---

## 🎯 Primer Workflow en 5 Minutos

### Objetivo: Crear un "Hello World" Workflow

Vamos a crear un workflow simple que demuestre los conceptos básicos.

#### 1. Acceder al Editor de Workflows

1. Inicia sesión en la plataforma
2. Navega a **Workflows → Crear Workflow**
3. Selecciona **"Workflow Vacío"**

#### 2. Diseño del Canvas

El canvas es tu espacio de trabajo visual:

```
┌─────────────────────────────────────────────────────────┐
│  📋 Silhouette Workflow Editor                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [🌐]        [📊]        [🔗]        [⚡]               │
│  HTTP        Data         Gate      Connector          │
│                                                         │
│  [📧]        [🔄]        [❓]        [💾]               │
│  Email       Logic        Filter    Store              │
│                                                         │
│  Panel de Nodos ← Panel de Propiedades                 │
│  [👤] 👥 🔐 [⚙️] [📈]    [Node Selected]                │
│  Users  Teams Settings Graph                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 3. Construir el Workflow

**Paso 1: Agregar Nodo de Inicio**
1. Arrastra el nodo **"Start"** al canvas
2. Configura las propiedades:
   - **Nombre**: "Inicio"
   - **Descripción**: "Punto de entrada del workflow"

**Paso 2: Agregar Nodo de Procesamiento**
1. Arrastra el nodo **"HTTP Request"** al canvas
2. Conecta **Start → HTTP Request**
3. Configura las propiedades:
   - **URL**: `https://api.github.com/users/octocat`
   - **Method**: GET
   - **Timeout**: 30s
   - **Headers**: 
     ```json
     {
       "Accept": "application/json"
     }
     ```

**Paso 3: Agregar Nodo de Transformación**
1. Arrastra el nodo **"Data Transform"** al canvas
2. Conecta **HTTP Request → Data Transform**
3. Configura la transformación:
   - **Input Path**: `response.body`
   - **Transform Function**:
     ```javascript
     {
       "user_id": input.id,
       "username": input.login,
       "followers": input.followers,
       "timestamp": new Date().toISOString()
     }
     ```

**Paso 4: Agregar Nodo de Salida**
1. Arrastra el nodo **"End"** al canvas
2. Conecta **Data Transform → End**
3. Configura las propiedades:
   - **Response**: `{{transform_result}}`
   - **Status**: 200

#### 4. Validar y Guardar

1. Haz clic en **"Validar"** para verificar errores
2. Guarda el workflow:
   - **Nombre**: "Hello World API"
   - **Descripción**: "Mi primer workflow"
   - **Tags**: tutorial, básico
3. Publica el workflow

#### 5. Ejecutar y Probar

1. Haz clic en **"Ejecutar"**
2. Observa la ejecución en tiempo real:
   ```
   ✅ Inicio (0.1s)
   ✅ HTTP Request (1.2s) - Status: 200
   ✅ Data Transform (0.3s)
   ✅ End (0.1s)
   ```
3. Ve a **Ejecuciones** para ver los detalles

**¡Felicitaciones! 🎉 Has creado tu primer workflow.**

---

## 🏢 Configuración de Equipos y Permisos

### Estructura Organizacional

#### Roles Predefinidos

```
👑 Super Admin
  - Acceso completo a toda la plataforma
  - Gestión de organizaciones
  - Configuración del sistema

🏢 Org Admin
  - Gestión de la organización
  - Configuración de equipos
  - Gestión de usuarios

🔧 Developer
  - Crear y modificar workflows
  - Gestionar credenciales
  - Ver analytics básicos

📊 Analyst
  - Crear dashboards
  - Ver analytics
  - Ejecutar workflows

👁️ Viewer
  - Solo lectura
  - Ver workflows
  - Ver ejecuciones
```

#### Crear Equipos

1. Ve a **Equipos → Crear Equipo**
2. Configura el equipo:

```
Nombre: "Desarrollo Backend"
Descripción: "Equipo de desarrollo backend"
Líder: "Juan Pérez"
Miembros:
  - Ana García (Developer)
  - Carlos López (Developer)
  - María Rodríguez (Analyst)

Permisos:
  ✅ Crear workflows
  ✅ Ejecutar workflows
  ✅ Ver credenciales (solo lectura)
  ✅ Ver analytics
  ❌ Gestionar equipos
  ❌ Configuración de organización
```

#### Gestión de Permisos

```
Workflows:
  - Crear: Desarrolladores+
  - Editar: Propietario, Admin de Org, Super Admin
  - Ejecutar: Desarrolladores+, Analistas
  - Eliminar: Admin de Org, Super Admin
  - Ver: Todos los usuarios con permisos

Credenciales:
  - Crear: Desarrolladores+
  - Ver/Usar: Propietario, Admin de Org
  - Editar: Propietario, Admin de Org
  - Eliminar: Admin de Org, Super Admin

Analytics:
  - Ver Básicos: Todos
  - Ver Detallados: Analistas+
  - Exportar: Analistas+, Admin de Org
```

---

## 🔍 Primeros Pasos con IA

### Habilitar Capacidades de IA

1. Ve a **Configuración → IA/ML**
2. Habilita los servicios de IA:
   ```
   ✅ ML Training
   ✅ Optimización de Workflows
   ✅ Auto-scaling Inteligente
   ✅ Recomendaciones Smart
   ```

### Tu Primera Recomendación

1. Ve a **IA → Recomendaciones**
2. Haz clic en **"Generar Recomendaciones"**
3. Selecciona el contexto:
   ```
   Contexto: "Mejorar performance de workflows"
   Workflow: "Hello World API"
   Áreas de interés:
     ✅ Optimización de rendimiento
     ✅ Gestión de recursos
     ✅ Costos operativos
   ```
4. Haz clic en **"Generar"**

**Ejemplo de recomendaciones que podrías recibir:**

```
🎯 Recomendaciones Inteligentes:

1. ⚡ Optimización de Rendimiento
   Prioridad: Alta | Confianza: 87%
   - Implementar cache en el nodo HTTP Request
   - Usar conexión persistente para APIs frecuentes
   
2. 📊 Gestión de Recursos  
   Prioridad: Media | Confianza: 72%
   - Configurar auto-scaling para picos de carga
   - Establecer límites de memoria por nodo
   
3. 💰 Optimización de Costos
   Prioridad: Media | Confianza: 65%
   - Migrar APIs de prueba a tier gratuito
   - Implementar batch processing para múltiples requests
```

---

## 📊 Monitoreo Básico

### Dashboard Principal

Accede al dashboard en **Dashboard → Principal**:

```
┌─────────────────────────────────────────────────────────┐
│  📊 Dashboard - Overview (Últimas 24h)                  │
├─────────────────────────────────────────────────────────┤
│  📈 Ejecuciones    ⚡ Performance   💰 Costos   👥 Users │
│       1,234           98.2%         €2.34        45     │
│  ↗️ +12%           ↗️ +2.1%       ↗️ +8%       ↗️ +3  │
├─────────────────────────────────────────────────────────┤
│  🔥 Top Workflows              📊 Status Distribution   │
│  1. Hello World API   456       ✅ Success      1,200  │
│  2. Data Sync        234       ⚠️ Warning         28   │
│  3. Email Alert      123       ❌ Failed           6   │
└─────────────────────────────────────────────────────────┘
```

### Métricas Clave

```
📊 Performance:
  - Tiempo de respuesta promedio: 1.2s
  - Throughput: 45 req/min
  - Error rate: 0.3%
  - Uptime: 99.8%

💰 Costos:
  - Costo por ejecución: €0.002
  - Costo mensual estimado: €74
  - Costo por usuario: €1.64

🔧 Recursos:
  - CPU promedio: 45%
  - Memoria promedio: 62%
  - Almacenamiento usado: 2.3GB
  - Conexiones activas: 12
```

---

## 🆘 Troubleshooting Básico

### Problemas Comunes

#### 1. Servicios no levantan

**Síntoma**: `docker-compose up` falla o se detiene

**Solución**:
```bash
# Verificar logs
docker-compose logs backend
docker-compose logs postgres
docker-compose logs redis

# Reiniciar servicios
docker-compose down
docker-compose up -d --force-recreate

# Verificar recursos del sistema
docker system df
free -h
df -h
```

#### 2. Error de conexión a base de datos

**Síntoma**: `Connection refused` o `Authentication failed`

**Solución**:
```bash
# Verificar estado de PostgreSQL
docker-compose exec postgres psql -U haas -d haasdb -c "SELECT version();"

# Reiniciar base de datos
docker-compose restart postgres
docker-compose exec postgres psql -U haas -c "CREATE DATABASE haasdb;"

# Verificar variables de entorno
docker-compose exec backend env | grep POSTGRES
```

#### 3. Frontend no carga

**Síntoma**: Página en blanco o error 502

**Solución**:
```bash
# Verificar logs del frontend
docker-compose logs frontend

# Verificar conectividad
curl -I http://localhost:3000/api/system/health

# Reiniciar frontend
docker-compose restart frontend
```

#### 4. Workflow no ejecuta

**Síntoma**: Workflow se queda en "Pending" o "Running" indefinidamente

**Solución**:
1. Verifica que el workflow esté **publicado**
2. Revisa los logs de ejecución:
   ```
   Ve a: Workflows → [Tu Workflow] → Ejecuciones → [Última] → Logs
   ```
3. Verifica permisos:
   ```
   Ve a: Equipos → [Tu Equipo] → Permisos
   Verificar: ✅ Ejecutar workflows
   ```

#### 5. Error de autenticación

**Síntoma**: "Token expired" o "Invalid credentials"

**Solución**:
1. **Verificar credenciales**: Asegúrate de que email/contraseña son correctos
2. **Limpiar caché del navegador**: 
   ```
   F12 → Application → Storage → Clear Storage
   ```
3. **Renovar sesión**: Logout y login nuevamente
4. **Verificar tokens**: 
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:3000/api/auth/verify
   ```

### Logs del Sistema

#### Ubicaciones de Logs

```bash
# Logs de Docker
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Logs del sistema
tail -f /var/log/syslog | grep silhouette

# Logs de aplicación
tail -f ./logs/app.log
tail -f ./logs/error.log
tail -f ./logs/audit.log
```

#### Niveles de Log

```
DEBUG: Información detallada para debugging
INFO:  Eventos normales de la aplicación
WARN:  Situaciones inesperadas pero no críticas
ERROR: Errores que afectan funcionalidad
FATAL: Errores críticos que detienen la aplicación
```

### Health Checks

```bash
# Health check completo
curl http://localhost:3000/api/system/health

# Health check específico por servicio
curl http://localhost:3000/api/auth/health
curl http://localhost:3000/api/workflows/health
curl http://localhost:3000/api/credentials/health
curl http://localhost:3000/api/ai/health

# Verificar conectividad de base de datos
docker-compose exec backend npm run db:check

# Verificar conectividad de Redis
docker-compose exec backend redis-cli ping
```

---

## 🎯 Siguientes Pasos

### 1. Explorar la Documentación Completa

- 📖 [Documentación de Usuario Completa](user-guide.md)
- 🔧 [Guía de Administración](admin-guide.md)
- 🤖 [Funciones de IA/ML](ai-guide.md)
- 🔌 [Guía de Conectores](connectors-guide.md)
- 📊 [Analytics y Monitoreo](analytics-guide.md)

### 2. Comunidad y Soporte

- 💬 [Discord de la Comunidad](https://discord.gg/silhouette)
- 📧 [Soporte por Email](mailto:support@silhouette-platform.com)
- 📋 [GitHub Issues](https://github.com/tu-empresa/silhouette-workflow-platform/issues)
- 📚 [Knowledge Base](https://docs.silhouette-platform.com)

### 3. Recursos Adicionales

- 🎓 [Video Tutoriales](https://youtube.com/silhouette-platform)
- 🏗️ [Ejemplos y Plantillas](https://github.com/silhouette-examples)
- 🧪 [Entorno de Sandbox](https://sandbox.silhouette-platform.com)

---

## 🏆 ¡Felicidades!

Has completado la configuración básica de Silhouette Workflow Platform. Ahora puedes:

✅ **Crear workflows** con el editor visual  
✅ **Configurar equipos** y permisos  
✅ **Usar funciones básicas de IA**  
✅ **Monitorear** la plataforma  
✅ **Troubleshooting** básico  

**¿Listo para el siguiente nivel?** Consulta las guías avanzadas para maximizar el potencial de la plataforma.

---

*¿Tienes alguna pregunta? No dudes en contactar a nuestro equipo de soporte en support@silhouette-platform.com*

**¡Bienvenido a Silhouette Workflow Platform! 🚀**
