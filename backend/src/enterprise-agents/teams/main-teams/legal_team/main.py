"""
HAAS+ Multi-Agent System - Legal Team
===================================

Comprehensive legal and compliance management team for enterprise-level legal operations.
Implements contract management, compliance monitoring, legal risk assessment, and regulatory affairs.

Team Structure:
- Corporate Law: Company formation, governance, corporate structure
- Contract Management: Contract drafting, negotiation, execution, monitoring
- Compliance: Regulatory compliance, policy management, audit coordination
- Intellectual Property: Patents, trademarks, copyrights, trade secrets
- Employment Law: HR legal matters, workplace policies, dispute resolution
- Data Privacy: GDPR, CCPA, data protection, privacy compliance
- Risk Management: Legal risk assessment, litigation management
- Regulatory Affairs: Industry regulations, government relations

Communication Patterns:
- Dynamic communication according to HAAS+ playbook specifications
- Event-driven architecture with message mediation through NOTI hub
- Performatives: REQUEST, INFORM, PROPOSE, ACCEPT, REJECT, HALT, ERROR, ACK, HEARTBEAT
- Back-pressure mechanisms with token bucket rate limiting (P0-P3 priorities)
- Message deduplication using SHA-256 hashes
- Dead Letter Queue handling for failed communications
"""

import asyncio
import json
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
from enum import Enum
import aiohttp
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import redis.asyncio as redis
import numpy as np
import pandas as pd
from collections import defaultdict, deque

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ContractStatus(Enum):
    """Contract lifecycle status"""
    DRAFT = "draft"
    UNDER_REVIEW = "under_review"
    NEGOTIATION = "negotiation"
    PENDING_APPROVAL = "pending_approval"
    EXECUTED = "executed"
    ACTIVE = "active"
    EXPIRED = "expired"
    TERMINATED = "terminated"
    RENEWED = "renewed"

class ComplianceStatus(Enum):
    """Compliance status types"""
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    PENDING_REVIEW = "pending_review"
    REMEDIATION_REQUIRED = "remediation_required"
    EXEMPT = "exempt"

class LegalRiskLevel(Enum):
    """Legal risk assessment levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class RegulatoryDomain(Enum):
    """Regulatory domains"""
    DATA_PRIVACY = "data_privacy"
    FINANCIAL = "financial"
    HEALTHCARE = "healthcare"
    ENVIRONMENTAL = "environmental"
    EMPLOYMENT = "employment"
    INTELLECTUAL_PROPERTY = "intellectual_property"
    ANTITRUST = "antitrust"
    CYBERSECURITY = "cybersecurity"

class Priority(Enum):
    """Priority levels"""
    P0_CRITICAL = "p0_critical"
    P1_HIGH = "p1_high"
    P2_MEDIUM = "p2_medium"
    P3_LOW = "p3_low"

@dataclass
class LegalMetrics:
    """Key legal performance metrics"""
    department_id: str
    contracts_managed: int = 0
    compliance_rate: float = 0.0
    legal_cost_reduction: float = 0.0
    risk_mitigation_effectiveness: float = 0.0
    contract_turnaround_time: float = 0.0
    regulatory_filing_success: float = 0.0
    ip_portfolio_value: float = 0.0
    legal_satisfaction_score: float = 0.0

class ContractManagementAgent:
    """Contract management and legal documentation specialist"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.contracts = {}
        self.contract_templates = {}
        self.negotiations = {}
        
    async def create_contract(
        self,
        contract_type: str,
        parties: List[Dict[str, Any]],
        contract_value: float,
        effective_date: str,
        expiration_date: str,
        key_terms: Dict[str, Any],
        governing_law: str
    ) -> Dict[str, Any]:
        """Create legal contract"""
        try:
            logger.info(f"Creating contract: {contract_type}")
            
            # Generate contract ID
            contract_id = hashlib.sha256(
                f"{contract_type}_{parties}_{datetime.now().isoformat()}".encode()
            ).hexdigest()[:12]
            
            # Legal analysis
            legal_analysis = await self._conduct_legal_analysis(
                contract_type, key_terms, governing_law
            )
            
            # Risk assessment
            risk_assessment = await self._assess_contract_risks(
                contract_type, key_terms, contract_value
            )
            
            # Template selection
            template_selection = await self._select_contract_template(
                contract_type, legal_analysis
            )
            
            # Compliance check
            compliance_check = await self._check_compliance_requirements(
                contract_type, governing_law
            )
            
            # Approval workflow
            approval_workflow = await self._define_approval_workflow(
                contract_type, contract_value
            )
            
            contract_data = {
                "contract_id": contract_id,
                "contract_type": contract_type,
                "parties": parties,
                "contract_value": contract_value,
                "effective_date": effective_date,
                "expiration_date": expiration_date,
                "key_terms": key_terms,
                "governing_law": governing_law,
                "status": ContractStatus.DRAFT.value,
                "created_date": datetime.now().isoformat(),
                "legal_analysis": legal_analysis,
                "risk_assessment": risk_assessment,
                "template_selection": template_selection,
                "compliance_check": compliance_check,
                "approval_workflow": approval_workflow,
                "contract_metadata": {
                    "word_count": 0,
                    "clause_count": 0,
                    "signatures_required": len(parties),
                    "attachments": []
                }
            }
            
            # Store contract
            self.contracts[contract_id] = contract_data
            
            # Cache contract data
            await self.redis.setex(
                f"contract:{contract_id}",
                7776000,  # 90 days
                json.dumps(contract_data, default=str)
            )
            
            logger.info(f"Contract {contract_id} created successfully")
            return contract_data
            
        except Exception as e:
            logger.error(f"Error creating contract: {e}")
            raise
    
    async def manage_contract_negotiation(
        self,
        contract_id: str,
        negotiation_rounds: List[Dict[str, Any]],
        counterparty_proposals: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Manage contract negotiation process"""
        try:
            logger.info(f"Managing contract negotiation: {contract_id}")
            
            # Get contract data
            contract = self.contracts.get(contract_id)
            if not contract:
                raise ValueError(f"Contract {contract_id} not found")
            
            # Negotiation analysis
            negotiation_analysis = await self._analyze_negotiation_positions(
                negotiation_rounds, counterparty_proposals
            )
            
            # Strategy development
            negotiation_strategy = await self._develop_negotiation_strategy(
                contract, negotiation_analysis
            )
            
            # Risk mitigation
            risk_mitigation = await self._implement_negotiation_risk_mitigation(
                negotiation_analysis, negotiation_strategy
            )
            
            # Settlement recommendations
            settlement_recommendations = await self._generate_settlement_recommendations(
                negotiation_analysis, contract["key_terms"]
            )
            
            negotiation_data = {
                "negotiation_id": hashlib.sha256(
                    f"{contract_id}_{datetime.now().isoformat()}".encode()
                ).hexdigest()[:12],
                "contract_id": contract_id,
                "negotiation_date": datetime.now().isoformat(),
                "negotiation_rounds": negotiation_rounds,
                "counterparty_proposals": counterparty_proposals,
                "negotiation_analysis": negotiation_analysis,
                "negotiation_strategy": negotiation_strategy,
                "risk_mitigation": risk_mitigation,
                "settlement_recommendations": settlement_recommendations,
                "negotiation_outcome": await self._determine_negotiation_outcome(
                    negotiation_analysis
                )
            }
            
            # Store negotiation data
            await self.redis.setex(
                f"contract_negotiation:{negotiation_data['negotiation_id']}",
                7776000,  # 90 days
                json.dumps(negotiation_data, default=str)
            )
            
            logger.info(f"Contract negotiation {negotiation_data['negotiation_id']} managed successfully")
            return negotiation_data
            
        except Exception as e:
            logger.error(f"Error managing contract negotiation: {e}")
            raise

class ComplianceAgent:
    """Compliance monitoring and regulatory management specialist"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.compliance_frameworks = {}
        self.regulatory_requirements = {}
        self.audit_programs = {}
        
    async def assess_compliance_status(
        self,
        framework: str,
        organization_data: Dict[str, Any],
        assessment_scope: List[str],
        regulatory_domains: List[RegulatoryDomain]
    ) -> Dict[str, Any]:
        """Assess organizational compliance status"""
        try:
            logger.info(f"Assessing compliance for framework: {framework}")
            
            # Generate assessment ID
            assessment_id = hashlib.sha256(
                f"{framework}_{datetime.now().isoformat()}".encode()
            ).hexdigest()[:12]
            
            # Framework requirements
            framework_requirements = await self._analyze_framework_requirements(
                framework, regulatory_domains
            )
            
            # Gap analysis
            gap_analysis = await self._conduct_gap_analysis(
                framework_requirements, organization_data
            )
            
            # Risk assessment
            compliance_risks = await self._assess_compliance_risks(
                gap_analysis, assessment_scope
            )
            
            # Remediation planning
            remediation_plan = await self._develop_remediation_plan(
                gap_analysis, compliance_risks
            )
            
            # Monitoring strategy
            monitoring_strategy = await self._define_monitoring_strategy(
                framework, assessment_scope
            )
            
            compliance_assessment = {
                "assessment_id": assessment_id,
                "framework": framework,
                "assessment_date": datetime.now().isoformat(),
                "organization_data": organization_data,
                "assessment_scope": assessment_scope,
                "regulatory_domains": [domain.value for domain in regulatory_domains],
                "framework_requirements": framework_requirements,
                "gap_analysis": gap_analysis,
                "compliance_risks": compliance_risks,
                "remediation_plan": remediation_plan,
                "monitoring_strategy": monitoring_strategy,
                "overall_status": await self._determine_overall_compliance_status(gap_analysis)
            }
            
            # Store compliance assessment
            await self.redis.setex(
                f"compliance_assessment:{assessment_id}",
                7776000,  # 90 days
                json.dumps(compliance_assessment, default=str)
            )
            
            logger.info(f"Compliance assessment {assessment_id} completed successfully")
            return compliance_assessment
            
        except Exception as e:
            logger.error(f"Error assessing compliance: {e}")
            raise

class LegalRiskAgent:
    """Legal risk assessment and mitigation specialist"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.risk_assessments = {}
        self.risk_mitigation_plans = {}
        self.litigation_cases = {}
        
    async def assess_legal_risks(
        self,
        organization_id: str,
        risk_categories: List[str],
        business_operations: Dict[str, Any],
        geographic_scope: List[str]
    ) -> Dict[str, Any]:
        """Conduct comprehensive legal risk assessment"""
        try:
            logger.info(f"Assessing legal risks for organization: {organization_id}")
            
            # Generate risk assessment ID
            risk_id = hashlib.sha256(
                f"{organization_id}_{datetime.now().isoformat()}".encode()
            ).hexdigest()[:12]
            
            # Risk identification
            risk_identification = await self._identify_legal_risks(
                risk_categories, business_operations, geographic_scope
            )
            
            # Risk analysis
            risk_analysis = await self._analyze_identified_risks(
                risk_identification, business_operations
            )
            
            # Risk prioritization
            risk_prioritization = await self._prioritize_risks(
                risk_analysis, business_operations
            )
            
            # Mitigation strategies
            mitigation_strategies = await self._develop_mitigation_strategies(
                risk_prioritization
            )
            
            # Insurance recommendations
            insurance_recommendations = await self._recommend_insurance_coverage(
                risk_prioritization, mitigation_strategies
            )
            
            legal_risk_assessment = {
                "risk_id": risk_id,
                "organization_id": organization_id,
                "assessment_date": datetime.now().isoformat(),
                "risk_categories": risk_categories,
                "business_operations": business_operations,
                "geographic_scope": geographic_scope,
                "risk_identification": risk_identification,
                "risk_analysis": risk_analysis,
                "risk_prioritization": risk_prioritization,
                "mitigation_strategies": mitigation_strategies,
                "insurance_recommendations": insurance_recommendations,
                "risk_summary": await self._generate_risk_summary(risk_prioritization)
            }
            
            # Store risk assessment
            await self.redis.setex(
                f"legal_risk_assessment:{risk_id}",
                7776000,  # 90 days
                json.dumps(legal_risk_assessment, default=str)
            )
            
            logger.info(f"Legal risk assessment {risk_id} completed successfully")
            return legal_risk_assessment
            
        except Exception as e:
            logger.error(f"Error assessing legal risks: {e}")
            raise

class DynamicMessageProcessor:
    """Dynamic message processing for agent communication"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.message_history = deque(maxlen=10000)
        self.rate_limiter = TokenBucketRateLimiter()
        
    async def send_message(
        self,
        sender: str,
        receiver: str,
        content: Dict[str, Any],
        performative: str = "INFORM",
        priority: str = "P2_MEDIUM",
        requires_response: bool = False
    ) -> Dict[str, Any]:
        """Send message with dynamic communication patterns"""
        try:
            # Message deduplication
            message_hash = hashlib.sha256(
                json.dumps(content, sort_keys=True).encode()
            ).hexdigest()
            
            if not await self._is_new_message(message_hash):
                return {"status": "duplicate", "message_id": message_hash}
            
            # Rate limiting check
            rate_limit_result = await self.rate_limiter.check_rate_limit(
                f"{sender}:{receiver}", priority
            )
            
            if not rate_limit_result["allowed"]:
                await self._queue_message_for_retry(content, rate_limit_result["retry_after"])
                return {"status": "rate_limited", "retry_after": rate_limit_result["retry_after"]}
            
            # Create message envelope
            envelope = {
                "message_id": hashlib.sha256(
                    f"{datetime.now().isoformat()}_{sender}_{receiver}".encode()
                ).hexdigest()[:16],
                "timestamp": datetime.now().isoformat(),
                "sender": sender,
                "receiver": receiver,
                "performative": performative,
                "priority": priority,
                "requires_response": requires_response,
                "envelope_version": "1.0",
                "content_hash": message_hash
            }
            
            # Dual payload design (Envelope JSON + Content NL/JSON)
            full_message = {
                "envelope": envelope,
                "content": content,
                "metadata": {
                    "sent_via": "legal_team",
                    "communication_type": "agent_to_agent",
                    "protocol_version": "1.0"
                }
            }
            
            # Store message history
            self.message_history.append(full_message)
            
            # Log communication
            await self._log_communication(full_message)
            
            # Route message through NOTI hub (simulated)
            routing_result = await self._route_message(full_message)
            
            return {
                "status": "sent",
                "message_id": envelope["message_id"],
                "routing_result": routing_result,
                "delivered_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            return {"status": "error", "error": str(e)}
    
    async def _is_new_message(self, message_hash: str) -> bool:
        """Check if message is new (deduplication)"""
        key = f"message_dedup:{message_hash}"
        if await self.redis.exists(key):
            return False
        
        await self.redis.setex(key, 3600, "1")
        return True
    
    async def _queue_message_for_retry(self, content: Dict[str, Any], retry_after: int):
        """Queue message for retry when rate limited"""
        retry_key = f"retry_queue:{datetime.now().timestamp() + retry_after}"
        await self.redis.setex(retry_key, retry_after, json.dumps(content))
    
    async def _route_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Route message through NOTI hub"""
        return {
            "routed_to": message["envelope"]["receiver"],
            "delivery_status": "delivered",
            "routing_timestamp": datetime.now().isoformat()
        }
    
    async def _log_communication(self, message: Dict[str, Any]):
        """Log communication for audit purposes"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "sender": message["envelope"]["sender"],
            "receiver": message["envelope"]["receiver"],
            "performative": message["envelope"]["performative"],
            "priority": message["envelope"]["priority"]
        }
        
        await self.redis.lpush("communication_logs", json.dumps(log_entry))

class TokenBucketRateLimiter:
    """Token bucket rate limiter for back-pressure mechanisms"""
    
    def __init__(self):
        self.buckets = {}
        
    async def check_rate_limit(
        self, 
        key: str, 
        priority: str, 
        tokens_per_minute: Dict[str, int] = None
    ) -> Dict[str, Any]:
        """Check rate limit based on priority"""
        if tokens_per_minute is None:
            tokens_per_minute = {
                "P0_CRITICAL": 1000,
                "P1_HIGH": 500,
                "P2_MEDIUM": 200,
                "P3_LOW": 50
            }
        
        bucket_key = f"bucket:{key}"
        current_time = datetime.now()
        
        if bucket_key not in self.buckets:
            self.buckets[bucket_key] = {
                "tokens": tokens_per_minute[priority],
                "last_refill": current_time
            }
        
        bucket = self.buckets[bucket_key]
        
        time_elapsed = (current_time - bucket["last_refill"]).total_seconds()
        tokens_to_add = int(time_elapsed / 60 * tokens_per_minute[priority])
        
        if tokens_to_add > 0:
            bucket["tokens"] = min(
                tokens_per_minute[priority],
                bucket["tokens"] + tokens_to_add
            )
            bucket["last_refill"] = current_time
        
        if bucket["tokens"] > 0:
            bucket["tokens"] -= 1
            return {
                "allowed": True,
                "remaining_tokens": bucket["tokens"]
            }
        else:
            return {
                "allowed": False,
                "retry_after": 60,
                "remaining_tokens": 0
            }

# FastAPI Models
class ContractCreationRequest(BaseModel):
    contract_type: str
    parties: List[Dict[str, Any]]
    contract_value: float
    effective_date: str
    expiration_date: str
    key_terms: Dict[str, Any]
    governing_law: str

class ComplianceAssessmentRequest(BaseModel):
    framework: str
    organization_data: Dict[str, Any]
    assessment_scope: List[str]
    regulatory_domains: List[str]

class LegalRiskAssessmentRequest(BaseModel):
    organization_id: str
    risk_categories: List[str]
    business_operations: Dict[str, Any]
    geographic_scope: List[str]

# FastAPI Application
app = FastAPI(
    title="HAAS+ Legal Team",
    description="Comprehensive legal and compliance management team",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
redis_client = None
contract_management_agent = None
compliance_agent = None
legal_risk_agent = None
message_processor = None

@app.on_event("startup")
async def startup_event():
    """Initialize the legal team"""
    global redis_client, contract_management_agent, compliance_agent
    global legal_risk_agent, message_processor
    
    try:
        redis_client = redis.from_url(
            "redis://localhost:6379",
            encoding="utf-8",
            decode_responses=True
        )
        
        await redis_client.ping()
        logger.info("Redis connection established")
        
        contract_management_agent = ContractManagementAgent(redis_client)
        compliance_agent = ComplianceAgent(redis_client)
        legal_risk_agent = LegalRiskAgent(redis_client)
        message_processor = DynamicMessageProcessor(redis_client)
        
        logger.info("Legal Team initialized successfully")
        
    except Exception as e:
        logger.error(f"Error initializing Legal Team: {e}")
        raise

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        await redis_client.ping()
        redis_status = "healthy"
    except:
        redis_status = "unhealthy"
    
    return {
        "service": "legal_team",
        "status": "healthy" if redis_status == "healthy" else "degraded",
        "timestamp": datetime.now().isoformat(),
        "components": {
            "redis": redis_status,
            "contract_management": "active",
            "compliance": "active",
            "legal_risk": "active"
        }
    }

@app.post("/api/v1/create_contract")
async def create_contract(request: ContractCreationRequest):
    """Create legal contract"""
    try:
        result = await contract_management_agent.create_contract(
            request.contract_type,
            request.parties,
            request.contract_value,
            request.effective_date,
            request.expiration_date,
            request.key_terms,
            request.governing_law
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error creating contract: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/manage_contract_negotiation")
async def manage_contract_negotiation(
    contract_id: str,
    negotiation_rounds: List[Dict[str, Any]],
    counterparty_proposals: List[Dict[str, Any]]
):
    """Manage contract negotiation process"""
    try:
        result = await contract_management_agent.manage_contract_negotiation(
            contract_id, negotiation_rounds, counterparty_proposals
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error managing contract negotiation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/assess_compliance")
async def assess_compliance(request: ComplianceAssessmentRequest):
    """Assess organizational compliance status"""
    try:
        # Convert regulatory domain strings to enums
        domains = [RegulatoryDomain(domain) for domain in request.regulatory_domains]
        result = await compliance_agent.assess_compliance_status(
            request.framework,
            request.organization_data,
            request.assessment_scope,
            domains
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error assessing compliance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/assess_legal_risks")
async def assess_legal_risks(request: LegalRiskAssessmentRequest):
    """Conduct comprehensive legal risk assessment"""
    try:
        result = await legal_risk_agent.assess_legal_risks(
            request.organization_id,
            request.risk_categories,
            request.business_operations,
            request.geographic_scope
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error assessing legal risks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/send_message")
async def send_message(
    sender: str,
    receiver: str,
    content: Dict[str, Any],
    performative: str = "INFORM",
    priority: str = "P2_MEDIUM"
):
    """Send message with dynamic communication patterns"""
    try:
        result = await message_processor.send_message(
            sender, receiver, content, performative, priority
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8022,
        reload=True,
        log_level="info"
    )