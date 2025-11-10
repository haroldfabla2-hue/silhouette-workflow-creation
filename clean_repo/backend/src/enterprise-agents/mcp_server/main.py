#!/usr/bin/env python3
"""
Servidor MCP (Model Context Protocol) para Sistema Multiagente Empresarial
Integra herramientas del mundo real con la arquitectura Event Sourcing + CQRS + Graph Database
"""

import asyncio
import json
import logging
import os
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import aiohttp
import aioredis
import asyncpg
from contextlib import asynccontextmanager

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración global
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://haas:haaspass@postgres:5432/haasdb")
NEO4J_URL = os.getenv("NEO4J_URL", "bolt://neo4j:7687")
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://haas:haaspass@rabbitmq:5672/")

# Modelos Pydantic
class MCPRequest(BaseModel):
    tool_id: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    team_id: str
    agent_type: str
    priority: int = Field(default=1, ge=1, le=5)
    timeout: int = Field(default=30, ge=5, le=300)

class MCPResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    execution_time: float
    tool_id: str
    team_id: str
    request_id: str

class MCPTool(BaseModel):
    tool_id: str
    name: str
    description: str
    category: str
    team_access: List[str]
    parameters_schema: Dict[str, Any]
    rate_limit: int = 100  # requests per hour
    requires_auth: bool = False

class ToolResult(BaseModel):
    result_id: str
    tool_id: str
    team_id: str
    success: bool
    data: Dict[str, Any]
    timestamp: datetime
    execution_time: float

class MCPServer:
    def __init__(self):
        self.app = FastAPI(
            title="MCP Server - Sistema Multiagente Empresarial",
            description="Servidor MCP para herramientas del mundo real",
            version="1.0.0"
        )
        self.redis: Optional[aioredis.Redis] = None
        self.db: Optional[asyncpg.Pool] = None
        self.tools: Dict[str, MCPTool] = {}
        self.results_cache: Dict[str, ToolResult] = {}
        self.setup_routes()
        
    async def initialize(self):
        """Inicializar conexiones a servicios"""
        try:
            # Conexión Redis
            self.redis = aioredis.from_url(REDIS_URL)
            await self.redis.ping()
            logger.info("✅ Conexión Redis establecida")
            
            # Conexión PostgreSQL
            self.db = await asyncpg.create_pool(DATABASE_URL)
            logger.info("✅ Conexión PostgreSQL establecida")
            
            # Cargar herramientas
            await self.load_tools()
            
            # Inicializar conectores externos
            await self.initialize_external_connectors()
            
        except Exception as e:
            logger.error(f"❌ Error inicializando servidor: {e}")
            raise

    async def load_tools(self):
        """Cargar catálogo de herramientas MCP"""
        tools_catalog = [
            # Herramientas de Búsqueda y Datos
            {
                "tool_id": "web_search",
                "name": "Búsqueda Web",
                "description": "Realizar búsquedas en Google y otros motores",
                "category": "search",
                "team_access": ["research", "marketing", "sales", "strategy", "business_development"],
                "parameters_schema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Términos de búsqueda"},
                        "num_results": {"type": "integer", "default": 10},
                        "lang": {"type": "string", "default": "es"},
                        "safe": {"type": "string", "default": "active"}
                    },
                    "required": ["query"]
                }
            },
            {
                "tool_id": "news_search",
                "name": "Búsqueda de Noticias",
                "description": "Buscar noticias recientes",
                "category": "search",
                "team_access": ["research", "marketing", "communications", "strategy"],
                "parameters_schema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                        "start_date": {"type": "string", "format": "date"},
                        "end_date": {"type": "string", "format": "date"},
                        "lang": {"type": "string", "default": "es"}
                    },
                    "required": ["query"]
                }
            },
            # Herramientas de IA y ML
            {
                "tool_id": "openai_chat",
                "name": "Chat OpenAI",
                "description": "Generar texto con GPT",
                "category": "ai",
                "team_access": ["code_generation", "research", "marketing", "strategy", "communications"],
                "parameters_schema": {
                    "type": "object",
                    "properties": {
                        "model": {"type": "string", "default": "gpt-3.5-turbo"},
                        "message": {"type": "string"},
                        "temperature": {"type": "number", "default": 0.7},
                        "max_tokens": {"type": "integer", "default": 1000}
                    },
                    "required": ["message"]
                }
            },
            {
                "tool_id": "openai_image",
                "name": "Generación de Imágenes DALL-E",
                "description": "Generar imágenes con DALL-E",
                "category": "ai",
                "team_access": ["design_creative", "marketing", "communications"],
                "parameters_schema": {
                    "type": "object",
                    "properties": {
                        "prompt": {"type": "string"},
                        "size": {"type": "string", "default": "1024x1024"},
                        "n": {"type": "integer", "default": 1}
                    },
                    "required": ["prompt"]
                }
            },
            # Herramientas de Desarrollo
            {
                "tool_id": "github_api",
                "name": "API GitHub",
                "description": "Acceder a repositorios y datos de GitHub",
                "category": "development",
                "team_access": ["code_generation", "testing", "research"],
                "parameters_schema": {
                    "type": "object",
                    "properties": {
                        "endpoint": {"type": "string"},
                        "method": {"type": "string", "default": "GET"},
                        "data": {"type": "object"}
                    },
                    "required": ["endpoint"]
                }
            },
            {
                "tool_id": "git_operations",
                "name": "Operaciones Git",
                "description": "Clonar, hacer commit, push de repositorios",
                "category": "development",
                "team_access": ["code_generation", "testing", "cloud_services"],
                "parameters_schema": {
                    "type": "object",
                    "properties": {
                        "operation": {"type": "string", "enum": ["clone", "commit", "push", "pull"]},
                        "repo_url": {"type": "string"},
                        "message": {"type": "string"},
                        "files": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["operation", "repo_url"]
                }
            },
            # Herramientas de Comunicación
            {
                "tool_id": "send_email",
                "name": "Envío de Email",
                "description": "Enviar emails a través de SMTP",
                "category": "communication",
                "team_access": ["marketing", "sales", "customer_service", "hr"],
                "parameters_schema": {
                    "type": "object",
                    "properties": {
                        "to": {"type": "string", "format": "email"},
                        "subject": {"type": "string"},
                        "body": {"type": "string"},
                        "html_body": {"type": "string"}
                    },
                    "required": ["to", "subject", "body"]
                }
            },
            {
                "tool_id": "send_slack",
                "name": "Mensaje Slack",
                "description": "Enviar mensajes a canales de Slack",
                "category": "communication",
                "team_access": ["support", "notifications", "strategy", "risk_management"],
                "parameters_schema": {
                    "type": "object",
                    "properties": {
                        "channel": {"type": "string"},
                        "message": {"type": "string"},
                        "username": {"type": "string"},
                        "icon_emoji": {"type": "string"}
                    },
                    "required": ["channel", "message"]
                }
            },
            # Herramientas de Datos Empresariales
            {
                "tool_id": "salesforce_api",
                "name": "API Salesforce",
                "description": "Acceso a datos de CRM Salesforce",
                "category": "crm",
                "team_access": ["sales", "marketing", "business_development"],
                "parameters_schema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                        "object_type": {"type": "string"},
                        "operation": {"type": "string", "default": "query"}
                    },
                    "required": ["query"]
                }
            },
            {
                "tool_id": "google_maps",
                "name": "Google Maps",
                "description": "Búsquedas de lugares y direcciones",
                "category": "location",
                "team_access": ["sales", "supply_chain", "logistics", "business_development"],
                "parameters_schema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                        "location": {"type": "string"},
                        "radius": {"type": "integer", "default": 1000}
                    },
                    "required": ["query"]
                }
            },
            # Herramientas de Análisis
            {
                "tool_id": "financial_data",
                "name": "Datos Financieros",
                "description": "Obtener datos de acciones y mercados",
                "category": "finance",
                "team_access": ["finance", "strategy", "risk_management"],
                "parameters_schema": {
                    "type": "object",
                    "properties": {
                        "symbol": {"type": "string"},
                        "start_date": {"type": "string", "format": "date"},
                        "end_date": {"type": "string", "format": "date"},
                        "interval": {"type": "string", "default": "1d"}
                    },
                    "required": ["symbol"]
                }
            },
            {
                "tool_id": "social_media_search",
                "name": "Búsqueda Redes Sociales",
                "description": "Buscar en Twitter y otras redes",
                "category": "social",
                "team_access": ["marketing", "research", "communications"],
                "parameters_schema": {
                    "type": "object",
                    "properties": {
                        "platform": {"type": "string", "enum": ["twitter", "linkedin"]},
                        "query": {"type": "string"},
                        "lang": {"type": "string", "default": "es"},
                        "limit": {"type": "integer", "default": 50}
                    },
                    "required": ["platform", "query"]
                }
            },
            # Herramientas de Cloud y Infraestructura
            {
                "tool_id": "aws_cli",
                "name": "AWS CLI",
                "description": "Comandos AWS para infraestructura",
                "category": "cloud",
                "team_access": ["cloud_services", "security", "devops"],
                "parameters_schema": {
                    "type": "object",
                    "properties": {
                        "service": {"type": "string"},
                        "command": {"type": "string"},
                        "parameters": {"type": "object"}
                    },
                    "required": ["service", "command"]
                }
            },
            {
                "tool_id": "docker_operations",
                "name": "Operaciones Docker",
                "description": "Gestión de contenedores Docker",
                "category": "infrastructure",
                "team_access": ["cloud_services", "devops", "security"],
                "parameters_schema": {
                    "type": "object",
                    "properties": {
                        "operation": {"type": "string", "enum": ["start", "stop", "restart", "logs", "inspect"]},
                        "container": {"type": "string"},
                        "options": {"type": "object"}
                    },
                    "required": ["operation", "container"]
                }
            }
        ]
        
        for tool_data in tools_catalog:
            tool = MCPTool(**tool_data)
            self.tools[tool.tool_id] = tool
            
        logger.info(f"✅ Cargadas {len(self.tools)} herramientas MCP")

    async def initialize_external_connectors(self):
        """Inicializar conectores a servicios externos"""
        # Aquí se inicializarían las conexiones a APIs externas
        # Por ahora simulamos la inicialización
        logger.info("✅ Conectores externos inicializados")

    def setup_routes(self):
        """Configurar rutas de la API"""
        
        @self.app.get("/")
        async def root():
            return {
                "message": "MCP Server - Sistema Multiagente Empresarial",
                "version": "1.0.0",
                "status": "operational",
                "tools_available": len(self.tools),
                "architecture": "Event Sourcing + CQRS + Graph Database"
            }
        
        @self.app.get("/health")
        async def health_check():
            return {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "services": {
                    "redis": self.redis is not None,
                    "database": self.db is not None,
                    "tools_loaded": len(self.tools)
                }
            }
        
        @self.app.get("/tools", response_model=List[MCPTool])
        async def get_tools():
            return list(self.tools.values())
        
        @self.app.get("/tools/{tool_id}", response_model=MCPTool)
        async def get_tool(tool_id: str):
            if tool_id not in self.tools:
                raise HTTPException(status_code=404, detail="Herramienta no encontrada")
            return self.tools[tool_id]
        
        @self.app.post("/execute", response_model=MCPResponse)
        async def execute_tool(request: MCPRequest, background_tasks: BackgroundTasks):
            request_id = str(uuid.uuid4())
            start_time = time.time()
            
            try:
                # Validar herramienta
                if request.tool_id not in self.tools:
                    raise HTTPException(status_code=404, detail="Herramienta no encontrada")
                
                tool = self.tools[request.tool_id]
                
                # Verificar acceso de equipo
                if request.team_id not in tool.team_access:
                    raise HTTPException(status_code=403, detail="Equipo sin acceso a esta herramienta")
                
                # Ejecutar herramienta
                result_data = await self.execute_tool_implementation(request, tool)
                
                execution_time = time.time() - start_time
                
                # Crear respuesta
                response = MCPResponse(
                    success=True,
                    data=result_data,
                    execution_time=execution_time,
                    tool_id=request.tool_id,
                    team_id=request.team_id,
                    request_id=request_id
                )
                
                # Guardar resultado
                tool_result = ToolResult(
                    result_id=request_id,
                    tool_id=request.tool_id,
                    team_id=request.team_id,
                    success=True,
                    data=result_data,
                    timestamp=datetime.now(),
                    execution_time=execution_time
                )
                
                await self.save_tool_result(tool_result)
                
                # Procesar evento en Event Sourcing
                background_tasks.add_task(self.process_event, "tool_executed", {
                    "request_id": request_id,
                    "tool_id": request.tool_id,
                    "team_id": request.team_id,
                    "execution_time": execution_time,
                    "timestamp": datetime.now().isoformat()
                })
                
                return response
                
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(f"Error ejecutando herramienta {request.tool_id}: {e}")
                
                return MCPResponse(
                    success=False,
                    error=str(e),
                    execution_time=execution_time,
                    tool_id=request.tool_id,
                    team_id=request.team_id,
                    request_id=request_id
                )
        
        @self.app.get("/results/{request_id}")
        async def get_result(request_id: str):
            result = await self.get_tool_result(request_id)
            if not result:
                raise HTTPException(status_code=404, detail="Resultado no encontrado")
            return result
        
        @self.app.get("/teams/{team_id}/usage")
        async def get_team_usage(team_id: str):
            """Obtener estadísticas de uso por equipo"""
            # Implementar consulta de estadísticas
            return {
                "team_id": team_id,
                "tools_used": [],
                "total_requests": 0,
                "success_rate": 0.0,
                "average_execution_time": 0.0
            }
        
        @self.app.get("/analytics/overview")
        async def get_analytics():
            """Obtener análisis general del uso de herramientas"""
            return {
                "total_tools": len(self.tools),
                "total_teams": len(set(tool.team_access for tool in self.tools.values())),
                "category_distribution": self.get_category_distribution(),
                "most_used_tools": await self.get_most_used_tools()
            }

    async def execute_tool_implementation(self, request: MCPRequest, tool: MCPTool) -> Dict[str, Any]:
        """Implementar la ejecución específica de cada herramienta"""
        
        if request.tool_id == "web_search":
            return await self.web_search(request.parameters)
        elif request.tool_id == "news_search":
            return await self.news_search(request.parameters)
        elif request.tool_id == "openai_chat":
            return await self.openai_chat(request.parameters)
        elif request.tool_id == "openai_image":
            return await self.openai_image(request.parameters)
        elif request.tool_id == "github_api":
            return await self.github_api(request.parameters)
        elif request.tool_id == "git_operations":
            return await self.git_operations(request.parameters)
        elif request.tool_id == "send_email":
            return await self.send_email(request.parameters)
        elif request.tool_id == "send_slack":
            return await self.send_slack(request.parameters)
        elif request.tool_id == "salesforce_api":
            return await self.salesforce_api(request.parameters)
        elif request.tool_id == "google_maps":
            return await self.google_maps(request.parameters)
        elif request.tool_id == "financial_data":
            return await self.financial_data(request.parameters)
        elif request.tool_id == "social_media_search":
            return await self.social_media_search(request.parameters)
        elif request.tool_id == "aws_cli":
            return await self.aws_cli(request.parameters)
        elif request.tool_id == "docker_operations":
            return await self.docker_operations(request.parameters)
        else:
            raise ValueError(f"Herramienta {request.tool_id} no implementada")

    # Implementaciones de herramientas
    async def web_search(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Búsqueda web simulada"""
        await asyncio.sleep(0.5)  # Simular latencia de API
        return {
            "query": params.get("query"),
            "results": [
                {"title": f"Resultado {i+1} para {params.get('query')}", "url": f"https://ejemplo{i+1}.com"}
                for i in range(params.get("num_results", 10))
            ],
            "total_results": params.get("num_results", 10),
            "search_engine": "google"
        }

    async def news_search(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Búsqueda de noticias simulada"""
        await asyncio.sleep(0.3)
        return {
            "query": params.get("query"),
            "articles": [
                {
                    "title": f"Noticia {i+1} sobre {params.get('query')}",
                    "summary": f"Resumen de la noticia {i+1}...",
                    "source": f"Fuente {i+1}",
                    "date": datetime.now().isoformat()
                }
                for i in range(5)
            ]
        }

    async def openai_chat(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Chat con OpenAI simulado"""
        await asyncio.sleep(1.0)
        return {
            "model": params.get("model", "gpt-3.5-turbo"),
            "response": f"Respuesta simulada de OpenAI para: {params.get('message')}",
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 50,
                "total_tokens": 60
            }
        }

    async def openai_image(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generación de imagen DALL-E simulada"""
        await asyncio.sleep(2.0)
        return {
            "prompt": params.get("prompt"),
            "generated_images": [
                {
                    "url": f"https://openai.com/dalle/generated_image_{uuid.uuid4().hex[:8]}.png",
                    "size": params.get("size", "1024x1024")
                }
            ]
        }

    async def github_api(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """API GitHub simulada"""
        await asyncio.sleep(0.8)
        return {
            "endpoint": params.get("endpoint"),
            "method": params.get("method", "GET"),
            "status_code": 200,
            "data": {
                "repository": "owner/repo",
                "url": f"https://api.github.com{params.get('endpoint')}",
                "data": {"mock": "response"}
            }
        }

    async def git_operations(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Operaciones Git simuladas"""
        await asyncio.sleep(1.5)
        return {
            "operation": params.get("operation"),
            "repo_url": params.get("repo_url"),
            "status": "success",
            "message": f"Operación {params.get('operation')} completada"
        }

    async def send_email(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Envío de email simulado"""
        await asyncio.sleep(0.5)
        return {
            "recipient": params.get("to"),
            "subject": params.get("subject"),
            "status": "sent",
            "message_id": f"msg_{uuid.uuid4().hex[:16]}",
            "timestamp": datetime.now().isoformat()
        }

    async def send_slack(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Mensaje Slack simulado"""
        await asyncio.sleep(0.3)
        return {
            "channel": params.get("channel"),
            "message": params.get("message"),
            "status": "sent",
            "timestamp": datetime.now().isoformat()
        }

    async def salesforce_api(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """API Salesforce simulada"""
        await asyncio.sleep(0.7)
        return {
            "query": params.get("query"),
            "object_type": params.get("object_type"),
            "results": [
                {"id": f"sf_{i+1}", "name": f"Registro {i+1}"}
                for i in range(3)
            ],
            "total_size": 3
        }

    async def google_maps(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Google Maps simulado"""
        await asyncio.sleep(0.6)
        return {
            "query": params.get("query"),
            "location": params.get("location", "Madrid, España"),
            "places": [
                {
                    "name": f"Lugar {i+1}",
                    "address": f"Dirección {i+1}",
                    "rating": round(4.0 + i * 0.2, 1),
                    "place_id": f"place_{uuid.uuid4().hex[:8]}"
                }
                for i in range(5)
            ]
        }

    async def financial_data(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Datos financieros simulados"""
        await asyncio.sleep(0.9)
        symbol = params.get("symbol", "AAPL")
        return {
            "symbol": symbol,
            "data_points": [
                {
                    "date": f"2024-01-{str(i).zfill(2)}",
                    "price": round(150.0 + i * 2.5, 2),
                    "volume": 1000000 + i * 10000
                }
                for i in range(1, 11)
            ],
            "current_price": 175.50,
            "change": "+2.5"
        }

    async def social_media_search(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Búsqueda en redes sociales simulada"""
        await asyncio.sleep(0.8)
        platform = params.get("platform", "twitter")
        return {
            "platform": platform,
            "query": params.get("query"),
            "results": [
                {
                    "id": f"post_{i+1}",
                    "content": f"Post simulado {i+1} sobre {params.get('query')}",
                    "author": f"Usuario {i+1}",
                    "engagement": {"likes": i * 10, "shares": i * 5, "comments": i * 3}
                }
                for i in range(params.get("limit", 10))
            ]
        }

    async def aws_cli(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Comandos AWS simulados"""
        await asyncio.sleep(1.2)
        return {
            "service": params.get("service"),
            "command": params.get("command"),
            "status": "success",
            "output": f"Resultado simulado de AWS {params.get('service')} {params.get('command')}"
        }

    async def docker_operations(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Operaciones Docker simuladas"""
        await asyncio.sleep(1.0)
        return {
            "operation": params.get("operation"),
            "container": params.get("container"),
            "status": "success",
            "output": f"Operación {params.get('operation')} en contenedor {params.get('container')} completada"
        }

    async def save_tool_result(self, result: ToolResult):
        """Guardar resultado en Redis y base de datos"""
        try:
            # Guardar en Redis con TTL
            await self.redis.setex(
                f"mcp:result:{result.result_id}",
                3600,  # 1 hora TTL
                result.json()
            )
            
            # Guardar en PostgreSQL para auditoría
            if self.db:
                await self.db.execute("""
                    INSERT INTO mcp_tool_results 
                    (result_id, tool_id, team_id, success, data, execution_time, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                """, result.result_id, result.tool_id, result.team_id, 
                   result.success, json.dumps(result.data), 
                   result.execution_time, result.timestamp)
                   
        except Exception as e:
            logger.error(f"Error guardando resultado: {e}")

    async def get_tool_result(self, request_id: str) -> Optional[ToolResult]:
        """Obtener resultado de herramienta"""
        try:
            result_json = await self.redis.get(f"mcp:result:{request_id}")
            if result_json:
                return ToolResult.parse_raw(result_json)
            return None
        except Exception as e:
            logger.error(f"Error obteniendo resultado: {e}")
            return None

    async def process_event(self, event_type: str, event_data: Dict[str, Any]):
        """Procesar evento para Event Sourcing"""
        try:
            event = {
                "event_id": str(uuid.uuid4()),
                "event_type": event_type,
                "event_data": event_data,
                "timestamp": datetime.now().isoformat(),
                "source": "mcp_server"
            }
            
            # Guardar en PostgreSQL
            await self.db.execute("""
                INSERT INTO events (event_id, event_type, event_data, timestamp, source)
                VALUES ($1, $2, $3, $4, $5)
            """, event["event_id"], event["event_type"], 
               json.dumps(event["event_data"]), 
               event["timestamp"], event["source"])
            
            # Publicar en RabbitMQ para otros equipos
            if hasattr(self, 'rabbitmq_channel'):
                self.rabbitmq_channel.basic_publish(
                    exchange='events',
                    routing_key=event_type,
                    body=json.dumps(event)
                )
                
        except Exception as e:
            logger.error(f"Error procesando evento: {e}")

    def get_category_distribution(self) -> Dict[str, int]:
        """Obtener distribución de herramientas por categoría"""
        categories = {}
        for tool in self.tools.values():
            categories[tool.category] = categories.get(tool.category, 0) + 1
        return categories

    async def get_most_used_tools(self) -> List[Dict[str, Any]]:
        """Obtener herramientas más utilizadas (simulado)"""
        # En implementación real, consultar Redis/PostgreSQL
        return [
            {"tool_id": "web_search", "uses": 150, "success_rate": 0.98},
            {"tool_id": "openai_chat", "uses": 120, "success_rate": 0.95},
            {"tool_id": "send_email", "uses": 85, "success_rate": 0.99}
        ]

# Instancia global
mcp_server = MCPServer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await mcp_server.initialize()
    yield
    # Shutdown
    if mcp_server.redis:
        await mcp_server.redis.close()
    if mcp_server.db:
        await mcp_server.db.close()

# Crear app con lifespan
app = mcp_server.app
app.router.add_api_route("/", mcp_server.root, methods=["GET"])
app.router.add_api_route("/health", mcp_server.health_check, methods=["GET"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)