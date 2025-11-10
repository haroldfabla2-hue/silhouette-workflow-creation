# Servidor MCP - Herramientas del Mundo Real
## Sistema Multiagente Empresarial

El **MCP Server** (Model Context Protocol) es el corazón de herramientas externas que permite a todos los equipos del sistema multiagente empresarial acceder a servicios del mundo real como APIs de IA, GitHub, redes sociales, servicios cloud y más.

### 🚀 Características Principales

- **14 herramientas integradas** con APIs reales
- **Arquitectura Event Sourcing** completa  
- **Integración perfecta** con los 24 equipos existentes
- **Rate limiting y seguridad** automática
- **Monitorización en tiempo real** de uso
- **Caché distribuido** con Redis
- **Eventos auditables** en PostgreSQL

### 📋 Herramientas Disponibles

#### 🔍 Búsqueda y Datos
- **web_search**: Búsqueda en Google y motores web
- **news_search**: Búsqueda de noticias recientes
- **financial_data**: Datos de acciones y mercados
- **social_media_search**: Búsqueda en Twitter y LinkedIn

#### 🤖 Inteligencia Artificial
- **openai_chat**: Chat con GPT-3.5/GPT-4
- **openai_image**: Generación de imágenes con DALL-E

#### 💻 Desarrollo
- **github_api**: Acceso a repositorios GitHub
- **git_operations**: Clonar, commit, push, pull

#### 💬 Comunicación
- **send_email**: Envío de emails SMTP
- **send_slack**: Mensajes a canales Slack

#### 🏢 Empresarial
- **salesforce_api**: CRM Salesforce
- **google_maps**: Búsquedas de lugares y direcciones

#### ☁️ Cloud e Infraestructura
- **aws_cli**: Comandos AWS
- **docker_operations**: Gestión de contenedores Docker

### 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   EQUIPOS      │    │   MCP SERVER    │    │ SERVICIOS       │
│   (24 Teams)   │◄──►│   (Puerto 8004) │◄──►│  EXTERNOS       │
│                │    │                 │    │                 │
│ • Marketing    │    │ • 14 Herramientas│   │ • OpenAI        │
│ • Sales        │    │ • Rate Limiting │   │ • GitHub        │
│ • Engineering  │    │ • Event Sourcing│   │ • AWS           │
│ • ...          │    │ • Cache Redis   │   │ • Google        │
└─────────────────┘    └─────────────────┘   └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  INFRAESTRUCTURA│
                    │                 │
                    │ • PostgreSQL    │
                    │ • Redis         │
                    │ • RabbitMQ      │
                    │ • Neo4j         │
                    └─────────────────┘
```

### 🔧 Configuración

#### 1. Variables de Entorno
```bash
# APIs de IA
OPENAI_API_KEY=sk-...

# Desarrollo
GITHUB_TOKEN=your-github-token-here

# Comunicación
SLACK_BOT_TOKEN=xoxb-...

# Cloud
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-east-1
```

#### 2. Despliegue
```bash
# Iniciar servidor MCP
docker-compose up -d mcp-server

# Verificar estado
curl http://localhost:8004/health

# Ver herramientas disponibles
curl http://localhost:8004/tools
```

### 📖 Uso por Equipos

#### Marketing Team
```json
POST /execute
{
  "tool_id": "web_search",
  "parameters": {
    "query": "tendencias marketing 2025",
    "num_results": 10
  },
  "team_id": "marketing",
  "agent_type": "marketing_strategist"
}
```

#### Sales Team
```json
POST /execute
{
  "tool_id": "salesforce_api",
  "parameters": {
    "query": "SELECT Id, Name FROM Account WHERE Type = 'Customer'"
  },
  "team_id": "sales",
  "agent_type": "sales_rep"
}
```

#### Engineering Team
```json
POST /execute
{
  "tool_id": "github_api",
  "parameters": {
    "endpoint": "/repos/owner/repo/issues",
    "method": "GET"
  },
  "team_id": "code_generation",
  "agent_type": "developer"
}
```

### 🔍 API Endpoints

#### Principales
- `GET /` - Información del servidor
- `GET /health` - Estado de salud
- `GET /tools` - Listar herramientas
- `GET /tools/{tool_id}` - Detalle de herramienta
- `POST /execute` - Ejecutar herramienta
- `GET /results/{request_id}` - Obtener resultado

#### Analytics
- `GET /teams/{team_id}/usage` - Uso por equipo
- `GET /analytics/overview` - Estadísticas generales

### 📊 Métricas y Monitoreo

#### Estadísticas por Equipo
```json
{
  "team_id": "marketing",
  "tools_used": ["web_search", "openai_chat", "send_email"],
  "total_requests": 145,
  "success_rate": 0.96,
  "average_execution_time": 1.2
}
```

#### Overview General
```json
{
  "total_tools": 14,
  "total_teams": 24,
  "category_distribution": {
    "search": 3,
    "ai": 2,
    "communication": 2,
    "development": 2,
    "crm": 1,
    "location": 1,
    "finance": 1,
    "social": 1,
    "cloud": 1
  }
}
```

### 🔒 Seguridad y Rate Limiting

- **Autenticación**: JWT tokens por equipo
- **Autorización**: Acceso granular por herramienta
- **Rate Limiting**: 100 requests/hora por herramienta
- **Auditoría**: Todos los eventos registrados
- **Validación**: Esquemas Pydantic estrictos

### 🚀 Beneficios

#### Para los Equipos
- ✅ **Acceso inmediato** a herramientas del mundo real
- ✅ **Sin configuración individual** de APIs
- ✅ **Gestión centralizada** de credenciales
- ✅ **Monitoreo automático** de uso
- ✅ **Rate limiting inteligente** por equipo

#### Para el Sistema
- ✅ **Arquitectura unificada** con todos los servicios
- ✅ **Event Sourcing completo** de todas las operaciones
- ✅ **Escalabilidad horizontal** automática
- ✅ **Seguridad centralizada** y consistente
- ✅ **Observabilidad total** de herramientas externas

### 🔧 Integración con Equipos Existentes

Todos los 24 equipos pueden usar las herramientas MCP añadiendo estas líneas a sus llamadas:

```python
# En cualquier equipo existente
response = requests.post("http://mcp-server:8004/execute", json={
    "tool_id": "web_search",
    "parameters": {"query": "mi consulta"},
    "team_id": "mi_equipo",
    "agent_type": "mi_agente"
})

result = response.json()
if result["success"]:
    data = result["data"]
    # Usar datos de herramientas externas
```

### 🎯 Próximas Mejoras

- [ ] **15+ herramientas adicionales**
- [ ] **Integración con más APIs** (Google Workspace, Microsoft 365)
- [ ] **Plugin system** para herramientas personalizadas
- [ ] **WebSocket support** para streaming de datos
- [ ] **Machine Learning** para optimización automática
- [ ] **Advanced analytics** con Neo4j
- [ ] **Bulk operations** para herramientas masivas
- [ ] **Custom workflows** con chaining de herramientas

---

**El MCP Server convierte nuestro sistema multiagente empresarial en una plataforma completa de herramientas del mundo real, manteniendo la arquitectura robusta y escalable que hemos construido.**