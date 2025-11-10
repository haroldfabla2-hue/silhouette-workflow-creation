# Ejemplos Prácticos: Uso del Servidor MCP
## Sistema Multiagente Empresarial con Herramientas del Mundo Real

Este documento muestra ejemplos concretos de cómo cada equipo puede usar las **14 herramientas del mundo real** del servidor MCP para realizar tareas reales de negocio.

---

## 🎯 **EQUIPOS DE MARKETING Y VENTAS**

### **1. Marketing Team - Investigación de Mercado**
```bash
# Buscar tendencias de marketing digital
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "web_search",
    "parameters": {
      "query": "tendencias marketing digital 2025 inteligencia artificial",
      "num_results": 15,
      "lang": "es",
      "safe": "active"
    },
    "team_id": "marketing",
    "agent_type": "marketing_researcher"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "query": "tendencias marketing digital 2025 inteligencia artificial",
    "results": [
      {
        "title": "10 Tendencias de Marketing Digital 2025",
        "url": "https://ejemplo1.com/tendencias-marketing-2025",
        "summary": "Análisis completo de las tendencias de marketing para 2025..."
      }
    ],
    "total_results": 15,
    "search_engine": "google"
  },
  "execution_time": 0.8,
  "request_id": "mcp_req_123"
}
```

### **2. Sales Team - Consulta CRM Salesforce**
```bash
# Obtener lista de leads calificados
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "salesforce_api",
    "parameters": {
      "query": "SELECT Id, Name, Email, Status FROM Lead WHERE Status = '\''Qualified'\'' AND CreatedDate = LAST_N_DAYS:30"
    },
    "team_id": "sales",
    "agent_type": "sales_rep"
  }'
```

### **3. Marketing Team - Análisis de Redes Sociales**
```bash
# Buscar menciones de la marca en Twitter
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "social_media_search",
    "parameters": {
      "platform": "twitter",
      "query": "mi_empresa -sponsored",
      "lang": "es",
      "limit": 50
    },
    "team_id": "marketing",
    "agent_type": "social_media_manager"
  }'
```

### **4. Sales Team - Búsqueda de Ubicaciones Clientes**
```bash
# Encontrar sucursales cercanas
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "google_maps",
    "parameters": {
      "query": "oficinas de ventas Madrid",
      "location": "Madrid, España",
      "radius": 15000
    },
    "team_id": "sales",
    "agent_type": "territory_manager"
  }'
```

---

## 💻 **EQUIPOS DE DESARROLLO Y CÓDIGO**

### **5. Code Generation Team - Consultar Issues GitHub**
```bash
# Ver issues abiertos del repositorio
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "github_api",
    "parameters": {
      "endpoint": "/repos/owner/repo/issues?state=open&labels=bug",
      "method": "GET"
    },
    "team_id": "code_generation",
    "agent_type": "developer"
  }'
```

### **6. Code Generation Team - Clonar Repositorio**
```bash
# Clonar repositorio para desarrollo
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "git_operations",
    "parameters": {
      "operation": "clone",
      "repo_url": "https://github.com/owner/repo",
      "branch": "develop"
    },
    "team_id": "code_generation",
    "agent_type": "developer"
  }'
```

### **7. Testing Team - Crear Release en GitHub**
```bash
# Crear release con tags
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "github_api",
    "parameters": {
      "endpoint": "/repos/owner/repo/releases",
      "method": "POST",
      "data": {
        "tag_name": "v1.2.3",
        "name": "Release v1.2.3",
        "body": "Release con nuevas funcionalidades de testing",
        "draft": false
      }
    },
    "team_id": "testing",
    "agent_type": "test_engineer"
  }'
```

---

## 🤖 **EQUIPOS DE IA Y INVESTIGACIÓN**

### **8. Research Team - Análisis con OpenAI**
```bash
# Generar análisis de mercado
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "openai_chat",
    "parameters": {
      "model": "gpt-4",
      "message": "Analiza las tendencias de IA generativa en el sector empresarial para 2025",
      "temperature": 0.7,
      "max_tokens": 2000
    },
    "team_id": "research",
    "agent_type": "market_analyst"
  }'
```

### **9. Design Team - Generar Imágenes DALL-E**
```bash
# Crear imágenes para campaña de marketing
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "openai_image",
    "parameters": {
      "prompt": "Modern professional business presentation background, corporate blue theme, minimal design",
      "size": "1792x1024",
      "n": 3
    },
    "team_id": "design_creative",
    "agent_type": "graphic_designer"
  }'
```

### **10. ML & AI Team - Obtener Datos Financieros para Modelos**
```bash
# Datos de acciones para entrenar modelo predictivo
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "financial_data",
    "parameters": {
      "symbol": "AAPL",
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "interval": "1d"
    },
    "team_id": "machine_learning_ai",
    "agent_type": "data_scientist"
  }'
```

---

## 💬 **EQUIPOS DE COMUNICACIÓN Y SOPORTE**

### **11. Communications Team - Envío de Email Masivo**
```bash
# Enviar newsletter a suscriptores
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "send_email",
    "parameters": {
      "to": "newsletter@empresa.com",
      "subject": "Boletín Mensual - Noviembre 2025",
      "body": "Estimados clientes,\n\nLes compartimos las novedades del mes...",
      "html_body": "<h2>Boletín Mensual</h2><p>Estimados clientes,<br/>Les compartimos las novedades del mes...</p>"
    },
    "team_id": "communications",
    "agent_type": "communication_manager"
  }'
```

### **12. Support Team - Notificaciones Slack**
```bash
# Alertar sobre problema crítico
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "send_slack",
    "parameters": {
      "channel": "#incidents",
      "message": "🚨 ALERTA: Servidor web con alta latencia detectada",
      "username": "Sistema Monitoreo",
      "icon_emoji": ":warning:"
    },
    "team_id": "support",
    "agent_type": "support_agent"
  }'
```

### **13. Notifications Team - Búsqueda de Noticias Recientes**
```bash
# Buscar noticias sobre la empresa
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "news_search",
    "parameters": {
      "query": "mi_empresa productos",
      "start_date": "2025-11-01",
      "end_date": "2025-11-08",
      "lang": "es"
    },
    "team_id": "notifications_communication",
    "agent_type": "news_monitor"
  }'
```

---

## ☁️ **EQUIPOS DE CLOUD Y INFRAESTRUCTURA**

### **14. Cloud Services Team - Listar Instancias AWS**
```bash
# Ver estado de instancias EC2
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "aws_cli",
    "parameters": {
      "service": "ec2",
      "command": "describe-instances --query 'Reservations[*].Instances[*].[InstanceId,State.Name,PublicIpAddress]' --output table"
    },
    "team_id": "cloud_services",
    "agent_type": "devops_engineer"
  }'
```

### **15. Cloud Services Team - Monitorear Docker**
```bash
# Ver estado de contenedores
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "docker_operations",
    "parameters": {
      "operation": "ps",
      "container": "api-gateway",
      "options": {"format": "table"}
    },
    "team_id": "cloud_services",
    "agent_type": "site_reliability_engineer"
  }'
```

### **16. Security Team - Auditoría AWS**
```bash
# Ver configuraciones de seguridad
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "aws_cli",
    "parameters": {
      "service": "securityhub",
      "command": "get-findings --filters SourceUrl=--output json"
    },
    "team_id": "security",
    "agent_type": "security_analyst"
  }'
```

---

## 📊 **EQUIPOS FINANCIEROS Y ESTRATÉGICOS**

### **17. Finance Team - Análisis de Mercados**
```bash
# Obtener datos de múltiples acciones
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "financial_data",
    "parameters": {
      "symbol": "MSFT,GOOGL,AMZN",
      "start_date": "2025-01-01",
      "end_date": "2025-11-08",
      "interval": "1d"
    },
    "team_id": "finance",
    "agent_type": "financial_analyst"
  }'
```

### **18. Strategy Team - Investigación Competitiva**
```bash
# Buscar información sobre competidores
curl -X POST http://localhost:8004/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "web_search",
    "parameters": {
      "query": "competidor_empresa estrategia 2025 plan estratégico",
      "num_results": 20,
      "lang": "es"
    },
    "team_id": "strategy",
    "agent_type": "strategic_planner"
  }'
```

---

## 🔄 **EJEMPLO DE INTEGRACIÓN EN EQUIPOS EXISTENTES**

### **Usando MCP desde Marketing Team (main.py):**
```python
import requests
import json

class MarketingStrategist:
    async def research_market_trends(self, topic: str):
        \"\"\"Investigar tendencias de mercado usando MCP\"\"\"
        try:
            # Llamada al servidor MCP
            mcp_response = requests.post(
                "http://mcp-server:8004/execute",
                json={
                    "tool_id": "web_search",
                    "parameters": {
                        "query": f"tendencias {topic} 2025",
                        "num_results": 10,
                        "lang": "es"
                    },
                    "team_id": "marketing",
                    "agent_type": "marketing_strategist"
                },
                timeout=30
            )
            
            if mcp_response.status_code == 200:
                result = mcp_response.json()
                if result["success"]:
                    return {
                        "trends": result["data"]["results"],
                        "total_findings": result["data"]["total_results"],
                        "source": "web_search",
                        "confidence": 0.95
                    }
            
            return {"error": "No se pudieron obtener tendencias", "success": False}
            
        except Exception as e:
            logger.error(f"Error investigando tendencias: {e}")
            return {"error": str(e), "success": False}
```

---

## 📈 **MONITOREO Y ANÁLISIS**

### **Ver estadísticas de uso:**
```bash
# Ver uso general del MCP
curl http://localhost:8004/analytics/overview

# Ver uso específico del equipo marketing
curl http://localhost:8004/teams/marketing/usage

# Ver resultado de una consulta específica
curl http://localhost:8004/results/mcp_req_123
```

### **Respuesta de Analytics:**
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
  },
  "most_used_tools": [
    {"tool_id": "web_search", "uses": 150, "success_rate": 0.98},
    {"tool_id": "openai_chat", "uses": 120, "success_rate": 0.95}
  ]
}
```

---

## 🎯 **BENEFICIOS INMEDIATOS**

1. **Los equipos pueden acceder a datos reales** sin configuraciones individuales
2. **Unificación de APIs externas** en un solo punto de acceso
3. **Monitoreo centralizado** del uso de herramientas
4. **Rate limiting automático** para evitar sobreuso
5. **Auditoría completa** de todas las operaciones
6. **Escalabilidad automática** según demanda
7. **Caché inteligente** para optimizar rendimiento
8. **Event Sourcing** para trazabilidad completa

---

**Con estas herramientas, cada equipo del sistema multiagente empresarial puede realizar tareas reales del mundo de los negocios, desde investigación de mercado hasta desarrollo de código, desde análisis financiero hasta gestión de infraestructura cloud.**