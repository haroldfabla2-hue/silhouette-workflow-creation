"""
SECURITY TEAM - CYBERSECURITY & INFORMATION SECURITY
Equipo especializado en seguridad cibernética, gestión de vulnerabilidades y compliance de seguridad.

Agentes Especializados:
- Security Analysts: Análisis de amenazas y vulnerabilidades
- Penetration Testers: Pruebas de penetración y red team
- Compliance Officers: Cumplimiento de marcos de seguridad (ISO, SOC2, GDPR)
- Incident Responders: Respuesta a incidentes de seguridad
- Security Engineers: Implementación de controles de seguridad
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
from datetime import datetime
import aiohttp
import redis
import json
import uuid
import asyncio
from enum import Enum
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic Models
class ThreatLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class SecurityIncident(BaseModel):
    id: Optional[str] = None
    title: str
    description: str
    severity: ThreatLevel
    affected_systems: List[str]
    status: str = "open"
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    assignee: Optional[str] = None

class VulnerabilityAssessment(BaseModel):
    id: Optional[str] = None
    system_name: str
    vulnerability_type: str
    severity: ThreatLevel
    cve_id: Optional[str] = None
    status: str = "open"
    remediation_plan: str
    created_at: Optional[datetime] = None

class ComplianceCheck(BaseModel):
    id: Optional[str] = None
    framework: str  # ISO27001, SOC2, GDPR, etc.
    control_id: str
    status: str = "pending"
    evidence: Optional[str] = None
    last_checked: Optional[datetime] = None

class SecurityScan(BaseModel):
    id: Optional[str] = None
    scan_type: str  # "vulnerability", "compliance", "penetration"
    target: str
    status: str = "running"
    results: Optional[Dict] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

# FastAPI App
app = FastAPI(
    title="Security Team API",
    description="API para el equipo de seguridad cibernética y gestión de vulnerabilidades",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis connection
redis_client = redis.Redis(
    host="localhost",
    port=6379,
    password="haaspass",
    decode_responses=True
)

# Initialize Redis connection
try:
    redis_client.ping()
    logger.info("Conectado a Redis exitosamente")
except:
    logger.error("No se pudo conectar a Redis")

# Agent Definitions
AGENTS = {
    "security_analyst": {
        "name": "Security Analyst",
        "capabilities": [
            "threat_analysis",
            "vulnerability_assessment", 
            "risk_analysis",
            "security_monitoring"
        ]
    },
    "penetration_tester": {
        "name": "Penetration Tester", 
        "capabilities": [
            "penetration_testing",
            "red_team_operations",
            "social_engineering",
            "vulnerability_exploitation"
        ]
    },
    "compliance_officer": {
        "name": "Compliance Officer",
        "capabilities": [
            "regulatory_compliance",
            "audit_coordination",
            "policy_development",
            "evidence_collection"
        ]
    },
    "incident_responder": {
        "name": "Incident Responder",
        "capabilities": [
            "incident_detection",
            "forensic_analysis",
            "containment_procedures",
            "recovery_coordination"
        ]
    },
    "security_engineer": {
        "name": "Security Engineer",
        "capabilities": [
            "security_architecture",
            "tool_implementation",
            "automation_development",
            "infrastructure_hardening"
        ]
    }
}

# API Endpoints
@app.get("/")
async def root():
    return {
        "team": "Security Team",
        "version": "1.0.0",
        "status": "operational",
        "agents": len(AGENTS),
        "description": "Equipo especializado en seguridad cibernética y compliance"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "security-team",
        "timestamp": datetime.now().isoformat(),
        "agents_active": len(AGENTS)
    }

@app.get("/agents")
async def get_agents():
    return {"agents": AGENTS, "total": len(AGENTS)}

@app.post("/incidents")
async def create_incident(incident: SecurityIncident, background_tasks: BackgroundTasks):
    """Crear nuevo incidente de seguridad"""
    incident.id = str(uuid.uuid4())
    incident.created_at = datetime.now()
    
    # Store in Redis
    incident_data = incident.dict()
    redis_client.set(f"incident:{incident.id}", json.dumps(incident_data))
    redis_client.lpush("incidents", incident.id)
    
    # Trigger background analysis
    background_tasks.add_task(analyze_incident, incident.id)
    
    logger.info(f"Incidente creado: {incident.id}")
    return {"status": "created", "incident": incident_data}

@app.get("/incidents")
async def list_incidents(status: Optional[str] = None):
    """Listar incidentes de seguridad"""
    incident_ids = redis_client.lrange("incidents", 0, -1)
    incidents = []
    
    for incident_id in incident_ids:
        incident_data = redis_client.get(f"incident:{incident_id}")
        if incident_data:
            incident = json.loads(incident_data)
            if status is None or incident.get("status") == status:
                incidents.append(incident)
    
    return {"incidents": incidents, "total": len(incidents)}

@app.get("/incidents/{incident_id}")
async def get_incident(incident_id: str):
    """Obtener detalle de incidente específico"""
    incident_data = redis_client.get(f"incident:{incident_id}")
    if not incident_data:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    
    return json.loads(incident_data)

@app.put("/incidents/{incident_id}")
async def update_incident(incident_id: str, incident: SecurityIncident):
    """Actualizar incidente de seguridad"""
    existing = redis_client.get(f"incident:{incident_id}")
    if not existing:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    
    incident.id = incident_id
    incident.updated_at = datetime.now()
    
    redis_client.set(f"incident:{incident_id}", json.dumps(incident.dict()))
    return {"status": "updated", "incident": incident.dict()}

@app.post("/vulnerabilities")
async def create_vulnerability_assessment(assessment: VulnerabilityAssessment):
    """Crear nueva evaluación de vulnerabilidad"""
    assessment.id = str(uuid.uuid4())
    assessment.created_at = datetime.now()
    
    assessment_data = assessment.dict()
    redis_client.set(f"vulnerability:{assessment.id}", json.dumps(assessment_data))
    redis_client.lpush("vulnerabilities", assessment.id)
    
    logger.info(f"Evaluación de vulnerabilidad creada: {assessment.id}")
    return {"status": "created", "assessment": assessment_data}

@app.get("/vulnerabilities")
async def list_vulnerabilities(severity: Optional[ThreatLevel] = None):
    """Listar evaluaciones de vulnerabilidad"""
    vuln_ids = redis_client.lrange("vulnerabilities", 0, -1)
    vulnerabilities = []
    
    for vuln_id in vuln_ids:
        vuln_data = redis_client.get(f"vulnerability:{vuln_id}")
        if vuln_data:
            vuln = json.loads(vuln_data)
            if severity is None or vuln.get("severity") == severity:
                vulnerabilities.append(vuln)
    
    return {"vulnerabilities": vulnerabilities, "total": len(vulnerabilities)}

@app.post("/compliance")
async def create_compliance_check(check: ComplianceCheck):
    """Crear nueva verificación de compliance"""
    check.id = str(uuid.uuid4())
    check.last_checked = datetime.now()
    
    check_data = check.dict()
    redis_client.set(f"compliance:{check.id}", json.dumps(check_data))
    redis_client.lpush("compliance", check.id)
    
    logger.info(f"Verificación de compliance creada: {check.id}")
    return {"status": "created", "check": check_data}

@app.get("/compliance")
async def list_compliance_checks(framework: Optional[str] = None):
    """Listar verificaciones de compliance"""
    check_ids = redis_client.lrange("compliance", 0, -1)
    checks = []
    
    for check_id in check_ids:
        check_data = redis_client.get(f"compliance:{check_id}")
        if check_data:
            check = json.loads(check_data)
            if framework is None or check.get("framework") == framework:
                checks.append(check)
    
    return {"checks": checks, "total": len(checks)}

@app.post("/scans")
async def initiate_security_scan(scan: SecurityScan):
    """Iniciar nuevo escaneo de seguridad"""
    scan.id = str(uuid.uuid4())
    scan.started_at = datetime.now()
    
    scan_data = scan.dict()
    redis_client.set(f"scan:{scan.id}", json.dumps(scan_data))
    redis_client.lpush("scans", scan.id)
    
    logger.info(f"Escaneo de seguridad iniciado: {scan.id}")
    return {"status": "initiated", "scan": scan_data}

@app.get("/scans")
async def list_security_scans():
    """Listar escaneos de seguridad"""
    scan_ids = redis_client.lrange("scans", 0, -1)
    scans = []
    
    for scan_id in scan_ids:
        scan_data = redis_client.get(f"scan:{scan_id}")
        if scan_data:
            scans.append(json.loads(scan_data))
    
    return {"scans": scans, "total": len(scans)}

@app.get("/dashboard")
async def get_security_dashboard():
    """Obtener métricas del dashboard de seguridad"""
    # Count incidents by severity
    incident_ids = redis_client.lrange("incidents", 0, -1)
    incident_stats = {"open": 0, "in_progress": 0, "resolved": 0, "critical": 0}
    
    for incident_id in incident_ids:
        incident_data = redis_client.get(f"incident:{incident_id}")
        if incident_data:
            incident = json.loads(incident_data)
            status = incident.get("status", "open")
            severity = incident.get("severity", "low")
            
            if status in incident_stats:
                incident_stats[status] += 1
            if severity == "critical":
                incident_stats["critical"] += 1
    
    # Count vulnerabilities by severity
    vuln_ids = redis_client.lrange("vulnerabilities", 0, -1)
    vuln_stats = {"open": 0, "in_progress": 0, "resolved": 0, "critical": 0}
    
    for vuln_id in vuln_ids:
        vuln_data = redis_client.get(f"vulnerability:{vuln_id}")
        if vuln_data:
            vuln = json.loads(vuln_data)
            status = vuln.get("status", "open")
            severity = vuln.get("severity", "low")
            
            if status in vuln_stats:
                vuln_stats[status] += 1
            if severity == "critical":
                vuln_stats["critical"] += 1
    
    return {
        "incidents": incident_stats,
        "vulnerabilities": vuln_stats,
        "last_updated": datetime.now().isoformat()
    }

# Background Tasks
async def analyze_incident(incident_id: str):
    """Analizar incidente en background"""
    try:
        # Simulate analysis by security analyst
        logger.info(f"Analizando incidente: {incident_id}")
        await asyncio.sleep(1)
        
        # Update incident status
        incident_data = redis_client.get(f"incident:{incident_id}")
        if incident_data:
            incident = json.loads(incident_data)
            incident["analysis_completed"] = True
            incident["risk_score"] = calculate_risk_score(incident)
            redis_client.set(f"incident:{incident_id}", json.dumps(incident))
            
    except Exception as e:
        logger.error(f"Error analizando incidente {incident_id}: {e}")

def calculate_risk_score(incident: Dict) -> int:
    """Calcular score de riesgo basado en severidad y sistemas afectados"""
    severity_multiplier = {
        "low": 1,
        "medium": 2, 
        "high": 4,
        "critical": 8
    }
    
    base_score = severity_multiplier.get(incident.get("severity", "low"), 1)
    systems_affected = len(incident.get("affected_systems", []))
    
    return base_score * systems_affected

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8026)