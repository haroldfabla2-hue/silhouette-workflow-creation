"""
HAAS+ Multi-Agent System - Human Resources Team
==============================================

Comprehensive human resources management and talent operations team for enterprise-level HR processes.
Implements recruitment, performance management, training, compensation, and employee relations.

Team Structure:
- Talent Acquisition: Recruitment, sourcing, candidate evaluation, onboarding
- Performance Management: Goal setting, reviews, feedback, career development
- Learning & Development: Training programs, skills development, certification
- Compensation & Benefits: Salary planning, benefits administration, equity management
- Employee Relations: Conflict resolution, engagement surveys, retention strategies
- HR Analytics: Workforce planning, metrics tracking, predictive analytics
- Compliance & Legal: Policy management, regulatory compliance, audit coordination
- Organizational Development: Culture building, change management, leadership development

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
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class EmployeeStatus(Enum):
    """Employee status types"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ON_LEAVE = "on_leave"
    TERMINATED = "terminated"
    SUSPENDED = "suspended"

class JobStatus(Enum):
    """Job posting status"""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    FILLED = "filled"
    CANCELLED = "cancelled"

class InterviewStage(Enum):
    """Interview process stages"""
    SCREENING = "screening"
    PHONE_SCREEN = "phone_screen"
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    FINAL = "final"
    OFFER = "offer"
    HIRED = "hired"
    REJECTED = "rejected"

class PerformanceRating(Enum):
    """Performance rating levels"""
    EXCEEDS_EXPECTATIONS = "exceeds_expectations"
    MEETS_EXPECTATIONS = "meets_expectations"
    BELOW_EXPECTATIONS = "below_expectations"
    NEEDS_IMPROVEMENT = "needs_improvement"
    OUTSTANDING = "outstanding"

class Priority(Enum):
    """Priority levels"""
    P0_CRITICAL = "p0_critical"
    P1_HIGH = "p1_high"
    P2_MEDIUM = "p2_medium"
    P3_LOW = "p3_low"

@dataclass
class HRMetrics:
    """Key HR performance metrics"""
    department_id: str
    headcount: int = 0
    turnover_rate: float = 0.0
    time_to_hire: float = 0.0
    employee_satisfaction: float = 0.0
    training_completion: float = 0.0
    diversity_index: float = 0.0
    engagement_score: float = 0.0
    absenteeism_rate: float = 0.0
    performance_distribution: Dict[str, float] = None

class TalentAcquisitionAgent:
    """Talent acquisition and recruitment specialist"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.job_postings = {}
        self.candidates = {}
        self.recruitment_metrics = {}
        
    async def create_job_posting(
        self,
        job_title: str,
        department: str,
        location: str,
        employment_type: str,
        salary_range: Dict[str, float],
        job_description: str,
        requirements: List[str],
        responsibilities: List[str],
        hiring_manager: str
    ) -> Dict[str, Any]:
        """Create job posting for recruitment"""
        try:
            logger.info(f"Creating job posting: {job_title}")
            
            # Generate job posting ID
            posting_id = hashlib.sha256(
                f"{job_title}_{department}_{datetime.now().isoformat()}".encode()
            ).hexdigest()[:12]
            
            # Job analysis
            job_analysis = await self._analyze_job_requirements(
                job_title, requirements, responsibilities
            )
            
            # Salary benchmarking
            salary_benchmark = await self._benchmark_salary(
                job_title, department, location, salary_range
            )
            
            # Target candidate profile
            candidate_profile = await self._create_candidate_profile(
                job_title, requirements, job_analysis
            )
            
            # Sourcing strategy
            sourcing_strategy = await self._develop_sourcing_strategy(
                job_title, candidate_profile, employment_type
            )
            
            # Interview framework
            interview_framework = await self._create_interview_framework(
                job_title, requirements, responsibilities
            )
            
            job_posting_data = {
                "posting_id": posting_id,
                "job_title": job_title,
                "department": department,
                "location": location,
                "employment_type": employment_type,
                "salary_range": salary_range,
                "job_description": job_description,
                "requirements": requirements,
                "responsibilities": responsibilities,
                "hiring_manager": hiring_manager,
                "status": JobStatus.DRAFT.value,
                "created_date": datetime.now().isoformat(),
                "job_analysis": job_analysis,
                "salary_benchmark": salary_benchmark,
                "candidate_profile": candidate_profile,
                "sourcing_strategy": sourcing_strategy,
                "interview_framework": interview_framework,
                "metrics": {
                    "views": 0,
                    "applications": 0,
                    "qualified_candidates": 0,
                    "interviews_scheduled": 0,
                    "offers_made": 0,
                    "hires": 0
                }
            }
            
            # Store job posting
            self.job_postings[posting_id] = job_posting_data
            
            # Cache job posting
            await self.redis.setex(
                f"job_posting:{posting_id}",
                2592000,  # 30 days
                json.dumps(job_posting_data, default=str)
            )
            
            logger.info(f"Job posting {posting_id} created successfully")
            return job_posting_data
            
        except Exception as e:
            logger.error(f"Error creating job posting: {e}")
            raise
    
    async def screen_candidates(
        self,
        job_posting_id: str,
        candidate_applications: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Screen and evaluate candidate applications"""
        try:
            logger.info(f"Screening {len(candidate_applications)} candidates for job: {job_posting_id}")
            
            # Get job posting
            job_posting = self.job_postings.get(job_posting_id)
            if not job_posting:
                raise ValueError(f"Job posting {job_posting_id} not found")
            
            # Candidate evaluation
            candidate_evaluations = await self._evaluate_candidates(
                candidate_applications, job_posting
            )
            
            # Ranking and scoring
            candidate_ranking = await self._rank_candidates(candidate_evaluations)
            
            # Shortlist creation
            shortlist = await self._create_shortlist(candidate_ranking)
            
            # Interview scheduling
            interview_schedule = await self._schedule_interviews(shortlist, job_posting)
            
            screening_result = {
                "screening_id": hashlib.sha256(
                    f"{job_posting_id}_{datetime.now().isoformat()}".encode()
                ).hexdigest()[:12],
                "job_posting_id": job_posting_id,
                "screening_date": datetime.now().isoformat(),
                "total_applications": len(candidate_applications),
                "qualified_candidates": len([c for c in candidate_evaluations if c["qualified"]]),
                "candidate_evaluations": candidate_evaluations,
                "candidate_ranking": candidate_ranking,
                "shortlist": shortlist,
                "interview_schedule": interview_schedule,
                "sourcing_effectiveness": await self._analyze_sourcing_effectiveness(
                    candidate_applications
                )
            }
            
            # Update job posting metrics
            job_posting["metrics"]["applications"] = len(candidate_applications)
            job_posting["metrics"]["qualified_candidates"] = len(
                [c for c in candidate_evaluations if c["qualified"]]
            )
            
            # Cache screening result
            await self.redis.setex(
                f"candidate_screening:{screening_result['screening_id']}",
                604800,  # 7 days
                json.dumps(screening_result, default=str)
            )
            
            logger.info(f"Candidate screening {screening_result['screening_id']} completed successfully")
            return screening_result
            
        except Exception as e:
            logger.error(f"Error screening candidates: {e}")
            raise
    
    async def _analyze_job_requirements(
        self,
        job_title: str,
        requirements: List[str],
        responsibilities: List[str]
    ) -> Dict[str, Any]:
        """Analyze job requirements and complexity"""
        # Skills analysis
        skills_required = len(requirements)
        
        # Experience analysis
        experience_pattern = r"(\d+)\+?\s*years?"
        experience_years = 0
        
        for req in requirements:
            match = re.search(experience_pattern, req, re.IGNORECASE)
            if match:
                experience_years = max(experience_years, int(match.group(1)))
        
        # Job complexity score
        complexity_score = (skills_required * 0.3) + (experience_years * 0.4) + (len(responsibilities) * 0.3)
        
        # Required competencies
        competencies = await self._extract_competencies(requirements, responsibilities)
        
        return {
            "skills_count": skills_required,
            "experience_years": experience_years,
            "complexity_score": round(complexity_score, 2),
            "competencies": competencies,
            "difficulty_level": "High" if complexity_score > 7 else "Medium" if complexity_score > 4 else "Low"
        }

class PerformanceManagementAgent:
    """Performance management and evaluation specialist"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.performance_reviews = {}
        self.goal_tracking = {}
        self.feedback_sessions = {}
        
    async def create_performance_review_cycle(
        self,
        cycle_name: str,
        review_type: str,
        departments: List[str],
        review_period: Dict[str, str],
        criteria: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Create performance review cycle"""
        try:
            logger.info(f"Creating performance review cycle: {cycle_name}")
            
            # Generate cycle ID
            cycle_id = hashlib.sha256(
                f"{cycle_name}_{review_type}_{datetime.now().isoformat()}".encode()
            ).hexdigest()[:12]
            
            # Review framework
            review_framework = await self._create_review_framework(
                review_type, criteria
            )
            
            # Goal setting template
            goal_template = await self._create_goal_setting_template(review_type)
            
            # Calibration approach
            calibration_approach = await self._develop_calibration_approach(
                departments, review_type
            )
            
            # Timeline planning
            timeline = await self._plan_review_timeline(review_period)
            
            # Manager training requirements
            training_requirements = await self._define_training_requirements(review_type)
            
            review_cycle_data = {
                "cycle_id": cycle_id,
                "cycle_name": cycle_name,
                "review_type": review_type,
                "departments": departments,
                "review_period": review_period,
                "criteria": criteria,
                "status": "planning",
                "created_date": datetime.now().isoformat(),
                "review_framework": review_framework,
                "goal_template": goal_template,
                "calibration_approach": calibration_approach,
                "timeline": timeline,
                "training_requirements": training_requirements,
                "participation_metrics": {
                    "employees_included": 0,
                    "managers_involved": 0,
                    "reviews_completed": 0
                }
            }
            
            # Store review cycle
            await self.redis.setex(
                f"review_cycle:{cycle_id}",
                7776000,  # 90 days
                json.dumps(review_cycle_data, default=str)
            )
            
            logger.info(f"Performance review cycle {cycle_id} created successfully")
            return review_cycle_data
            
        except Exception as e:
            logger.error(f"Error creating performance review cycle: {e}")
            raise
    
    async def evaluate_performance(
        self,
        employee_id: str,
        evaluator_id: str,
        review_cycle_id: str,
        performance_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Conduct performance evaluation"""
        try:
            logger.info(f"Evaluating performance for employee: {employee_id}")
            
            # Generate evaluation ID
            evaluation_id = hashlib.sha256(
                f"{employee_id}_{evaluator_id}_{datetime.now().isoformat()}".encode()
            ).hexdigest()[:12]
            
            # Performance analysis
            performance_analysis = await self._analyze_performance_data(performance_data)
            
            # Goal achievement assessment
            goal_achievement = await self._assess_goal_achievement(
                employee_id, performance_data
            )
            
            # Competency evaluation
            competency_evaluation = await self._evaluate_competencies(
                performance_data["competencies"]
            )
            
            # Development opportunities
            development_opportunities = await self._identify_development_opportunities(
                performance_analysis, competency_evaluation
            )
            
            # Overall rating determination
            overall_rating = await self._determine_overall_rating(
                performance_analysis, goal_achievement, competency_evaluation
            )
            
            # Improvement plan
            improvement_plan = await self._create_improvement_plan(
                overall_rating, development_opportunities
            )
            
            performance_evaluation = {
                "evaluation_id": evaluation_id,
                "employee_id": employee_id,
                "evaluator_id": evaluator_id,
                "review_cycle_id": review_cycle_id,
                "evaluation_date": datetime.now().isoformat(),
                "performance_data": performance_data,
                "performance_analysis": performance_analysis,
                "goal_achievement": goal_achievement,
                "competency_evaluation": competency_evaluation,
                "development_opportunities": development_opportunities,
                "overall_rating": overall_rating,
                "improvement_plan": improvement_plan,
                "status": "completed"
            }
            
            # Store performance evaluation
            await self.redis.setex(
                f"performance_evaluation:{evaluation_id}",
                7776000,  # 90 days
                json.dumps(performance_evaluation, default=str)
            )
            
            logger.info(f"Performance evaluation {evaluation_id} completed successfully")
            return performance_evaluation
            
        except Exception as e:
            logger.error(f"Error evaluating performance: {e}")
            raise

class LearningDevelopmentAgent:
    """Learning and development specialist"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.training_programs = {}
        self.learning_paths = {}
        self.skill_assessments = {}
        
    async def create_training_program(
        self,
        program_name: str,
        program_type: str,
        target_audience: Dict[str, Any],
        learning_objectives: List[str],
        duration: Dict[str, int],
        delivery_method: str
    ) -> Dict[str, Any]:
        """Create training program"""
        try:
            logger.info(f"Creating training program: {program_name}")
            
            # Generate program ID
            program_id = hashlib.sha256(
                f"{program_name}_{program_type}_{datetime.now().isoformat()}".encode()
            ).hexdigest()[:12]
            
            # Curriculum design
            curriculum = await self._design_curriculum(
                program_type, learning_objectives, delivery_method
            )
            
            # Content development
            content_plan = await self._develop_content_plan(
                curriculum, target_audience, delivery_method
            )
            
            # Assessment strategy
            assessment_strategy = await self._create_assessment_strategy(
                program_type, learning_objectives
            )
            
            # Resource requirements
            resource_requirements = await self._calculate_resource_requirements(
                program_type, target_audience, delivery_method
            )
            
            # Success metrics
            success_metrics = await self._define_success_metrics(program_type)
            
            training_program_data = {
                "program_id": program_id,
                "program_name": program_name,
                "program_type": program_type,
                "target_audience": target_audience,
                "learning_objectives": learning_objectives,
                "duration": duration,
                "delivery_method": delivery_method,
                "status": "design",
                "created_date": datetime.now().isoformat(),
                "curriculum": curriculum,
                "content_plan": content_plan,
                "assessment_strategy": assessment_strategy,
                "resource_requirements": resource_requirements,
                "success_metrics": success_metrics,
                "enrollment_data": {
                    "registered": 0,
                    "completed": 0,
                    "passed": 0
                }
            }
            
            # Store training program
            await self.redis.setex(
                f"training_program:{program_id}",
                7776000,  # 90 days
                json.dumps(training_program_data, default=str)
            )
            
            logger.info(f"Training program {program_id} created successfully")
            return training_program_data
            
        except Exception as e:
            logger.error(f"Error creating training program: {e}")
            raise

class CompensationBenefitsAgent:
    """Compensation and benefits management specialist"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.compensation_plans = {}
        self.benefits_programs = {}
        self.salary_structures = {}
        
    async def design_compensation_structure(
        self,
        structure_name: str,
        job_families: List[str],
        salary_grades: List[Dict[str, Any]],
        geographic_regions: List[str],
        market_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Design compensation structure"""
        try:
            logger.info(f"Designing compensation structure: {structure_name}")
            
            # Generate structure ID
            structure_id = hashlib.sha256(
                f"{structure_name}_{datetime.now().isoformat()}".encode()
            ).hexdigest()[:12]
            
            # Market analysis
            market_analysis = await self._analyze_market_compensation(
                job_families, market_data
            )
            
            # Salary grade structure
            salary_grade_structure = await self._create_salary_grade_structure(
                salary_grades, market_analysis
            )
            
            # Pay equity analysis
            pay_equity_analysis = await self._analyze_pay_equity(
                salary_grade_structure, geographic_regions
            )
            
            # Variable compensation design
            variable_compensation = await self._design_variable_compensation(
                job_families, market_analysis
            )
            
            # Benefits alignment
            benefits_alignment = await self._align_benefits_with_compensation(
                salary_grade_structure, market_data
            )
            
            compensation_structure_data = {
                "structure_id": structure_id,
                "structure_name": structure_name,
                "job_families": job_families,
                "salary_grades": salary_grades,
                "geographic_regions": geographic_regions,
                "market_data": market_data,
                "status": "draft",
                "created_date": datetime.now().isoformat(),
                "market_analysis": market_analysis,
                "salary_grade_structure": salary_grade_structure,
                "pay_equity_analysis": pay_equity_analysis,
                "variable_compensation": variable_compensation,
                "benefits_alignment": benefits_alignment,
                "implementation_plan": await self._create_implementation_plan(
                    salary_grade_structure
                )
            }
            
            # Store compensation structure
            await self.redis.setex(
                f"compensation_structure:{structure_id}",
                7776000,  # 90 days
                json.dumps(compensation_structure_data, default=str)
            )
            
            logger.info(f"Compensation structure {structure_id} created successfully")
            return compensation_structure_data
            
        except Exception as e:
            logger.error(f"Error designing compensation structure: {e}")
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
                    "sent_via": "hr_team",
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
class JobPostingRequest(BaseModel):
    job_title: str
    department: str
    location: str
    employment_type: str
    salary_range: Dict[str, float]
    job_description: str
    requirements: List[str]
    responsibilities: List[str]
    hiring_manager: str

class PerformanceReviewRequest(BaseModel):
    cycle_name: str
    review_type: str
    departments: List[str]
    review_period: Dict[str, str]
    criteria: List[Dict[str, Any]]

class TrainingProgramRequest(BaseModel):
    program_name: str
    program_type: str
    target_audience: Dict[str, Any]
    learning_objectives: List[str]
    duration: Dict[str, int]
    delivery_method: str

# FastAPI Application
app = FastAPI(
    title="HAAS+ Human Resources Team",
    description="Comprehensive human resources management and talent operations team",
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
talent_acquisition_agent = None
performance_management_agent = None
learning_development_agent = None
compensation_benefits_agent = None
message_processor = None

@app.on_event("startup")
async def startup_event():
    """Initialize the HR team"""
    global redis_client, talent_acquisition_agent, performance_management_agent
    global learning_development_agent, compensation_benefits_agent, message_processor
    
    try:
        redis_client = redis.from_url(
            "redis://localhost:6379",
            encoding="utf-8",
            decode_responses=True
        )
        
        await redis_client.ping()
        logger.info("Redis connection established")
        
        talent_acquisition_agent = TalentAcquisitionAgent(redis_client)
        performance_management_agent = PerformanceManagementAgent(redis_client)
        learning_development_agent = LearningDevelopmentAgent(redis_client)
        compensation_benefits_agent = CompensationBenefitsAgent(redis_client)
        message_processor = DynamicMessageProcessor(redis_client)
        
        logger.info("HR Team initialized successfully")
        
    except Exception as e:
        logger.error(f"Error initializing HR Team: {e}")
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
        "service": "hr_team",
        "status": "healthy" if redis_status == "healthy" else "degraded",
        "timestamp": datetime.now().isoformat(),
        "components": {
            "redis": redis_status,
            "talent_acquisition": "active",
            "performance_management": "active",
            "learning_development": "active",
            "compensation_benefits": "active"
        }
    }

@app.post("/api/v1/create_job_posting")
async def create_job_posting(request: JobPostingRequest):
    """Create job posting for recruitment"""
    try:
        result = await talent_acquisition_agent.create_job_posting(
            request.job_title,
            request.department,
            request.location,
            request.employment_type,
            request.salary_range,
            request.job_description,
            request.requirements,
            request.responsibilities,
            request.hiring_manager
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error creating job posting: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/screen_candidates")
async def screen_candidates(
    job_posting_id: str,
    candidate_applications: List[Dict[str, Any]]
):
    """Screen and evaluate candidate applications"""
    try:
        result = await talent_acquisition_agent.screen_candidates(
            job_posting_id, candidate_applications
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error screening candidates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/create_review_cycle")
async def create_review_cycle(request: PerformanceReviewRequest):
    """Create performance review cycle"""
    try:
        result = await performance_management_agent.create_performance_review_cycle(
            request.cycle_name,
            request.review_type,
            request.departments,
            request.review_period,
            request.criteria
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error creating review cycle: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/evaluate_performance")
async def evaluate_performance(
    employee_id: str,
    evaluator_id: str,
    review_cycle_id: str,
    performance_data: Dict[str, Any]
):
    """Conduct performance evaluation"""
    try:
        result = await performance_management_agent.evaluate_performance(
            employee_id, evaluator_id, review_cycle_id, performance_data
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error evaluating performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/create_training_program")
async def create_training_program(request: TrainingProgramRequest):
    """Create training program"""
    try:
        result = await learning_development_agent.create_training_program(
            request.program_name,
            request.program_type,
            request.target_audience,
            request.learning_objectives,
            request.duration,
            request.delivery_method
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error creating training program: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/design_compensation_structure")
async def design_compensation_structure(
    structure_name: str,
    job_families: List[str],
    salary_grades: List[Dict[str, Any]],
    geographic_regions: List[str],
    market_data: Dict[str, Any]
):
    """Design compensation structure"""
    try:
        result = await compensation_benefits_agent.design_compensation_structure(
            structure_name, job_families, salary_grades, geographic_regions, market_data
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error designing compensation structure: {e}")
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
        port=8019,
        reload=True,
        log_level="info"
    )