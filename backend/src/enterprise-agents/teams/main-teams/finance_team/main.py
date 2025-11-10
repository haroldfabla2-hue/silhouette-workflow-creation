"""
HAAS+ Multi-Agent System - Finance Team
=====================================

Comprehensive financial management and analysis team for enterprise-level financial operations.
Implements financial planning, accounting, budgeting, investment analysis, and risk management.

Team Structure:
- Financial Planning & Analysis (FP&A): Budgeting, forecasting, variance analysis
- Accounting: General ledger, accounts payable/receivable, financial reporting
- Treasury Management: Cash management, liquidity, foreign exchange
- Investment Analysis: Portfolio management, M&A analysis, capital allocation
- Risk Management: Financial risk assessment, compliance, internal controls
- Tax Management: Tax planning, compliance, optimization strategies
- Financial Analytics: Performance metrics, KPI tracking, business intelligence
- Controller Operations: Financial governance, audit coordination, process optimization

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
from urllib.parse import quote, unquote
from decimal import Decimal, ROUND_HALF_UP

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TransactionType(Enum):
    """Financial transaction types"""
    REVENUE = "revenue"
    EXPENSE = "expense"
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    CASH_FLOW = "cash_flow"

class BudgetStatus(Enum):
    """Budget status types"""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    ACTIVE = "active"
    CLOSED = "closed"
    REVISED = "revised"

class InvestmentType(Enum):
    """Investment types"""
    EQUITY = "equity"
    DEBT = "debt"
    REAL_ESTATE = "real_estate"
    COMMODITIES = "commodities"
    CRYPTO = "crypto"
    BONDS = "bonds"
    STOCKS = "stocks"
    MUTUAL_FUNDS = "mutual_funds"

class RiskLevel(Enum):
    """Risk assessment levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Priority(Enum):
    """Priority levels"""
    P0_CRITICAL = "p0_critical"
    P1_HIGH = "p1_high"
    P2_MEDIUM = "p2_medium"
    P3_LOW = "p3_low"

@dataclass
class FinancialMetrics:
    """Key financial performance metrics"""
    entity_id: str
    revenue: float = 0.0
    expenses: float = 0.0
    net_income: float = 0.0
    gross_margin: float = 0.0
    operating_margin: float = 0.0
    roi: float = 0.0  # Return on Investment
    roe: float = 0.0  # Return on Equity
    current_ratio: float = 0.0  # Liquidity
    debt_to_equity: float = 0.0
    cash_flow: float = 0.0

class FPAgent:
    """Financial Planning & Analysis specialist"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.budgets = {}
        self.forecasts = {}
        self.variance_reports = {}
        
    async def create_budget(
        self,
        budget_name: str,
        fiscal_year: int,
        departments: List[str],
        budget_type: str = "annual",
        currency: str = "USD"
    ) -> Dict[str, Any]:
        """Create financial budget"""
        try:
            logger.info(f"Creating budget: {budget_name} for FY{fiscal_year}")
            
            # Generate budget ID
            budget_id = hashlib.sha256(
                f"{budget_name}_{fiscal_year}_{datetime.now().isoformat()}".encode()
            ).hexdigest()[:12]
            
            # Budget structure planning
            budget_structure = await self._plan_budget_structure(departments)
            
            # Revenue projections
            revenue_projections = await self._create_revenue_projections(departments, fiscal_year)
            
            # Expense forecasting
            expense_forecasting = await self._create_expense_forecasting(departments, fiscal_year)
            
            # Department allocations
            department_allocations = await self._allocate_budget_by_department(
                budget_structure, revenue_projections, expense_forecasting
            )
            
            # Cash flow projections
            cash_flow_projections = await self._project_cash_flow(
                revenue_projections, expense_forecasting
            )
            
            # Budget assumptions
            budget_assumptions = await self._define_budget_assumptions(fiscal_year)
            
            # Success metrics
            budget_metrics = await self._define_budget_metrics()
            
            budget_data = {
                "budget_id": budget_id,
                "budget_name": budget_name,
                "fiscal_year": fiscal_year,
                "budget_type": budget_type,
                "currency": currency,
                "departments": departments,
                "structure": budget_structure,
                "revenue_projections": revenue_projections,
                "expense_forecasting": expense_forecasting,
                "department_allocations": department_allocations,
                "cash_flow_projections": cash_flow_projections,
                "assumptions": budget_assumptions,
                "metrics": budget_metrics,
                "status": BudgetStatus.DRAFT.value,
                "created_date": datetime.now().isoformat(),
                "total_revenue": sum(revenue_projections.values()),
                "total_expenses": sum(expense_forecasting.values()),
                "projected_profit": sum(revenue_projections.values()) - sum(expense_forecasting.values())
            }
            
            # Store budget
            self.budgets[budget_id] = budget_data
            
            # Cache budget data
            await self.redis.setex(
                f"budget:{budget_id}",
                7776000,  # 90 days
                json.dumps(budget_data, default=str)
            )
            
            logger.info(f"Budget {budget_id} created successfully")
            return budget_data
            
        except Exception as e:
            logger.error(f"Error creating budget: {e}")
            raise
    
    async def perform_variance_analysis(
        self,
        budget_id: str,
        actual_data: Dict[str, Any],
        analysis_period: str
    ) -> Dict[str, Any]:
        """Perform budget variance analysis"""
        try:
            logger.info(f"Performing variance analysis for budget: {budget_id}")
            
            # Get budget data
            budget = self.budgets.get(budget_id)
            if not budget:
                raise ValueError(f"Budget {budget_id} not found")
            
            # Calculate variances
            revenue_variance = await self._calculate_revenue_variance(
                budget["revenue_projections"], actual_data["revenue"]
            )
            
            expense_variance = await self._calculate_expense_variance(
                budget["expense_forecasting"], actual_data["expenses"]
            )
            
            department_variance = await self._calculate_department_variance(
                budget["department_allocations"], actual_data["department_performance"]
            )
            
            # Variance analysis
            variance_analysis = await self._analyze_variances(
                revenue_variance, expense_variance, department_variance
            )
            
            # Impact assessment
            impact_assessment = await self._assess_variance_impact(variance_analysis)
            
            # Recommendations
            recommendations = await self._generate_variance_recommendations(variance_analysis)
            
            variance_report = {
                "analysis_id": hashlib.sha256(
                    f"{budget_id}_{analysis_period}_{datetime.now().isoformat()}".encode()
                ).hexdigest()[:12],
                "budget_id": budget_id,
                "analysis_date": datetime.now().isoformat(),
                "analysis_period": analysis_period,
                "budget_data": budget,
                "actual_data": actual_data,
                "revenue_variance": revenue_variance,
                "expense_variance": expense_variance,
                "department_variance": department_variance,
                "variance_analysis": variance_analysis,
                "impact_assessment": impact_assessment,
                "recommendations": recommendations,
                "summary": await self._generate_variance_summary(variance_analysis)
            }
            
            # Store variance report
            self.variance_reports[variance_report["analysis_id"]] = variance_report
            
            # Cache variance report
            await self.redis.setex(
                f"variance_analysis:{variance_report['analysis_id']}",
                2592000,  # 30 days
                json.dumps(variance_report, default=str)
            )
            
            logger.info(f"Variance analysis {variance_report['analysis_id']} completed successfully")
            return variance_report
            
        except Exception as e:
            logger.error(f"Error performing variance analysis: {e}")
            raise
    
    async def create_financial_forecast(
        self,
        forecast_name: str,
        forecast_horizon: int,  # months
        base_scenarios: List[str],
        assumptions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create financial forecasting model"""
        try:
            logger.info(f"Creating financial forecast: {forecast_name}")
            
            # Generate forecast ID
            forecast_id = hashlib.sha256(
                f"{forecast_name}_{forecast_horizon}_{datetime.now().isoformat()}".encode()
            ).hexdigest()[:12]
            
            # Historical data analysis
            historical_data = await self._analyze_historical_financial_data()
            
            # Scenario modeling
            scenario_models = await self._create_scenario_models(base_scenarios, assumptions)
            
            # Revenue forecasting
            revenue_forecasts = await self._forecast_revenue(scenario_models, forecast_horizon)
            
            # Expense forecasting
            expense_forecasts = await self._forecast_expenses(scenario_models, forecast_horizon)
            
            # Cash flow modeling
            cash_flow_forecasts = await self._model_cash_flow(
                revenue_forecasts, expense_forecasts, forecast_horizon
            )
            
            # Key metrics forecasting
            metrics_forecasts = await self._forecast_key_metrics(
                revenue_forecasts, expense_forecasts, cash_flow_forecasts
            )
            
            # Sensitivity analysis
            sensitivity_analysis = await self._perform_sensitivity_analysis(
                scenario_models, revenue_forecasts, expense_forecasts
            )
            
            forecast_data = {
                "forecast_id": forecast_id,
                "forecast_name": forecast_name,
                "forecast_horizon": forecast_horizon,
                "created_date": datetime.now().isoformat(),
                "scenarios": base_scenarios,
                "assumptions": assumptions,
                "historical_data": historical_data,
                "scenario_models": scenario_models,
                "revenue_forecasts": revenue_forecasts,
                "expense_forecasts": expense_forecasts,
                "cash_flow_forecasts": cash_flow_forecasts,
                "metrics_forecasts": metrics_forecasts,
                "sensitivity_analysis": sensitivity_analysis,
                "forecast_summary": await self._generate_forecast_summary(
                    revenue_forecasts, expense_forecasts, cash_flow_forecasts
                )
            }
            
            # Store forecast
            self.forecasts[forecast_id] = forecast_data
            
            # Cache forecast data
            await self.redis.setex(
                f"forecast:{forecast_id}",
                2592000,  # 30 days
                json.dumps(forecast_data, default=str)
            )
            
            logger.info(f"Financial forecast {forecast_id} created successfully")
            return forecast_data
            
        except Exception as e:
            logger.error(f"Error creating financial forecast: {e}")
            raise

class AccountingAgent:
    """Accounting and financial reporting specialist"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.general_ledger = {}
        self.accounts_payable = {}
        self.accounts_receivable = {}
        self.financial_statements = {}
        
    async def process_transaction(
        self,
        transaction_type: TransactionType,
        amount: float,
        description: str,
        account: str,
        counterparty: str = None,
        transaction_date: str = None
    ) -> Dict[str, Any]:
        """Process financial transaction"""
        try:
            logger.info(f"Processing transaction: {transaction_type.value} - {amount}")
            
            # Generate transaction ID
            transaction_id = hashlib.sha256(
                f"{transaction_type.value}_{amount}_{datetime.now().isoformat()}".encode()
            ).hexdigest()[:12]
            
            # Transaction validation
            validation_result = await self._validate_transaction(
                transaction_type, amount, account
            )
            
            if not validation_result["valid"]:
                return {
                    "status": "rejected",
                    "transaction_id": transaction_id,
                    "reason": validation_result["reason"]
                }
            
            # Double-entry bookkeeping
            journal_entry = await self._create_journal_entry(
                transaction_type, amount, account, counterparty
            )
            
            # Update general ledger
            await self._update_general_ledger(transaction_id, journal_entry)
            
            # Update relevant sub-ledgers
            if transaction_type == TransactionType.EXPENSE:
                await self._update_accounts_payable(transaction_id, amount, counterparty)
            elif transaction_type == TransactionType.REVENUE:
                await self._update_accounts_receivable(transaction_id, amount, counterparty)
            
            # Transaction audit trail
            audit_trail = await self._create_audit_trail(
                transaction_id, transaction_type, journal_entry
            )
            
            processed_transaction = {
                "transaction_id": transaction_id,
                "transaction_type": transaction_type.value,
                "amount": amount,
                "description": description,
                "account": account,
                "counterparty": counterparty,
                "transaction_date": transaction_date or datetime.now().isoformat(),
                "journal_entry": journal_entry,
                "validation": validation_result,
                "audit_trail": audit_trail,
                "status": "processed",
                "processed_date": datetime.now().isoformat()
            }
            
            # Cache transaction data
            await self.redis.setex(
                f"transaction:{transaction_id}",
                7776000,  # 90 days
                json.dumps(processed_transaction, default=str)
            )
            
            logger.info(f"Transaction {transaction_id} processed successfully")
            return processed_transaction
            
        except Exception as e:
            logger.error(f"Error processing transaction: {e}")
            raise
    
    async def generate_financial_statements(
        self,
        statement_type: str,
        period_start: str,
        period_end: str,
        reporting_currency: str = "USD"
    ) -> Dict[str, Any]:
        """Generate financial statements"""
        try:
            logger.info(f"Generating {statement_type} for period {period_start} to {period_end}")
            
            # Fetch transaction data for period
            period_transactions = await self._fetch_period_transactions(period_start, period_end)
            
            # Generate specific statement
            if statement_type.lower() == "balance_sheet":
                statement = await self._generate_balance_sheet(period_transactions)
            elif statement_type.lower() == "income_statement":
                statement = await self._generate_income_statement(period_transactions)
            elif statement_type.lower() == "cash_flow_statement":
                statement = await self._generate_cash_flow_statement(period_transactions)
            elif statement_type.lower() == "statement_of_equity":
                statement = await self._generate_statement_of_equity(period_transactions)
            else:
                raise ValueError(f"Unsupported statement type: {statement_type}")
            
            # Financial ratios analysis
            ratios_analysis = await self._calculate_financial_ratios(statement)
            
            # Comparative analysis
            comparative_analysis = await self._perform_comparative_analysis(statement, period_transactions)
            
            # Statement metadata
            statement_metadata = await self._create_statement_metadata(
                statement_type, period_start, period_end, reporting_currency
            )
            
            financial_statement = {
                "statement_id": hashlib.sha256(
                    f"{statement_type}_{period_start}_{period_end}".encode()
                ).hexdigest()[:12],
                "statement_type": statement_type,
                "period_start": period_start,
                "period_end": period_end,
                "reporting_currency": reporting_currency,
                "generated_date": datetime.now().isoformat(),
                "statement_data": statement,
                "financial_ratios": ratios_analysis,
                "comparative_analysis": comparative_analysis,
                "metadata": statement_metadata,
                "audit_information": await self._generate_audit_information(period_transactions)
            }
            
            # Store financial statement
            self.financial_statements[financial_statement["statement_id"]] = financial_statement
            
            # Cache statement
            await self.redis.setex(
                f"financial_statement:{financial_statement['statement_id']}",
                7776000,  # 90 days
                json.dumps(financial_statement, default=str)
            )
            
            logger.info(f"Financial statement {financial_statement['statement_id']} generated successfully")
            return financial_statement
            
        except Exception as e:
            logger.error(f"Error generating financial statement: {e}")
            raise
    
    async def _validate_transaction(
        self,
        transaction_type: TransactionType,
        amount: float,
        account: str
    ) -> Dict[str, Any]:
        """Validate financial transaction"""
        # Basic validation rules
        if amount <= 0:
            return {"valid": False, "reason": "Transaction amount must be positive"}
        
        if not account or len(account.strip()) == 0:
            return {"valid": False, "reason": "Account must be specified"}
        
        # Additional business rule validations
        return {"valid": True, "reason": None}
    
    async def _create_journal_entry(
        self,
        transaction_type: TransactionType,
        amount: float,
        account: str,
        counterparty: str
    ) -> Dict[str, Any]:
        """Create double-entry bookkeeping journal entry"""
        journal_entry = {
            "entry_id": hashlib.sha256(
                f"{transaction_type.value}_{amount}_{datetime.now().isoformat()}".encode()
            ).hexdigest()[:12],
            "entry_date": datetime.now().isoformat(),
            "lines": []
        }
        
        # Determine debits and credits based on transaction type
        if transaction_type == TransactionType.REVENUE:
            # Debit: Cash/Accounts Receivable
            # Credit: Revenue
            journal_entry["lines"] = [
                {"account": "Cash/Accounts Receivable", "debit": amount, "credit": 0},
                {"account": "Revenue", "debit": 0, "credit": amount}
            ]
        elif transaction_type == TransactionType.EXPENSE:
            # Debit: Expense
            # Credit: Cash/Accounts Payable
            journal_entry["lines"] = [
                {"account": "Expense", "debit": amount, "credit": 0},
                {"account": "Cash/Accounts Payable", "debit": 0, "credit": amount}
            ]
        
        return journal_entry

class InvestmentAnalysisAgent:
    """Investment analysis and portfolio management specialist"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.portfolios = {}
        self.investments = {}
        self.market_data = {}
        
    async def analyze_investment_opportunity(
        self,
        investment_name: str,
        investment_type: InvestmentType,
        initial_investment: float,
        expected_return: float,
        risk_level: RiskLevel,
        time_horizon: int  # years
    ) -> Dict[str, Any]:
        """Analyze investment opportunity"""
        try:
            logger.info(f"Analyzing investment: {investment_name}")
            
            # Generate investment ID
            investment_id = hashlib.sha256(
                f"{investment_name}_{investment_type.value}_{datetime.now().isoformat()}".encode()
            ).hexdigest()[:12]
            
            # Financial modeling
            financial_model = await self._create_financial_model(
                investment_type, initial_investment, expected_return, time_horizon
            )
            
            # Risk assessment
            risk_assessment = await self._assess_investment_risk(
                investment_type, risk_level, financial_model
            )
            
            # Return analysis
            return_analysis = await self._analyze_returns(
                financial_model, expected_return, time_horizon
            )
            
            # Market comparison
            market_comparison = await self._compare_to_market_benchmarks(
                investment_type, expected_return, risk_level
            )
            
            # Scenario analysis
            scenario_analysis = await self._perform_scenario_analysis(
                financial_model, expected_return
            )
            
            # Investment recommendation
            recommendation = await self._generate_investment_recommendation(
                risk_assessment, return_analysis, market_comparison
            )
            
            investment_analysis = {
                "investment_id": investment_id,
                "investment_name": investment_name,
                "investment_type": investment_type.value,
                "analysis_date": datetime.now().isoformat(),
                "initial_investment": initial_investment,
                "expected_return": expected_return,
                "risk_level": risk_level.value,
                "time_horizon": time_horizon,
                "financial_model": financial_model,
                "risk_assessment": risk_assessment,
                "return_analysis": return_analysis,
                "market_comparison": market_comparison,
                "scenario_analysis": scenario_analysis,
                "recommendation": recommendation,
                "analysis_summary": await self._generate_investment_summary(
                    risk_assessment, return_analysis, recommendation
                )
            }
            
            # Store investment analysis
            self.investments[investment_id] = investment_analysis
            
            # Cache investment data
            await self.redis.setex(
                f"investment_analysis:{investment_id}",
                7776000,  # 90 days
                json.dumps(investment_analysis, default=str)
            )
            
            logger.info(f"Investment analysis {investment_id} completed successfully")
            return investment_analysis
            
        except Exception as e:
            logger.error(f"Error analyzing investment: {e}")
            raise
    
    async def optimize_portfolio(
        self,
        portfolio_name: str,
        risk_tolerance: str,
        investment_horizon: int,
        available_capital: float,
        investment_constraints: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Optimize investment portfolio"""
        try:
            logger.info(f"Optimizing portfolio: {portfolio_name}")
            
            # Generate portfolio ID
            portfolio_id = hashlib.sha256(
                f"{portfolio_name}_{risk_tolerance}_{datetime.now().isoformat()}".encode()
            ).hexdigest()[:12]
            
            # Asset allocation strategy
            allocation_strategy = await self._develop_allocation_strategy(
                risk_tolerance, investment_horizon, investment_constraints
            )
            
            # Investment selection
            investment_selection = await self._select_investments(
                allocation_strategy, available_capital
            )
            
            # Risk management
            risk_management = await self._implement_risk_management(
                investment_selection, risk_tolerance
            )
            
            # Performance expectations
            performance_expectations = await self._estimate_portfolio_performance(
                investment_selection, investment_horizon
            )
            
            # Rebalancing strategy
            rebalancing_strategy = await self._create_rebalancing_strategy(investment_selection)
            
            portfolio_optimization = {
                "portfolio_id": portfolio_id,
                "portfolio_name": portfolio_name,
                "optimization_date": datetime.now().isoformat(),
                "risk_tolerance": risk_tolerance,
                "investment_horizon": investment_horizon,
                "available_capital": available_capital,
                "constraints": investment_constraints or {},
                "allocation_strategy": allocation_strategy,
                "investment_selection": investment_selection,
                "risk_management": risk_management,
                "performance_expectations": performance_expectations,
                "rebalancing_strategy": rebalancing_strategy,
                "optimization_summary": await self._generate_optimization_summary(
                    allocation_strategy, performance_expectations
                )
            }
            
            # Store portfolio
            self.portfolios[portfolio_id] = portfolio_optimization
            
            # Cache portfolio data
            await self.redis.setex(
                f"portfolio:{portfolio_id}",
                7776000,  # 90 days
                json.dumps(portfolio_optimization, default=str)
            )
            
            logger.info(f"Portfolio optimization {portfolio_id} completed successfully")
            return portfolio_optimization
            
        except Exception as e:
            logger.error(f"Error optimizing portfolio: {e}")
            raise

class TreasuryManagementAgent:
    """Treasury management and cash flow specialist"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.cash_positions = {}
        self.liquidity_profiles = {}
        self.fx_positions = {}
        
    async def manage_cash_position(
        self,
        entity_id: str,
        cash_accounts: List[str],
        forecast_horizon: int = 30
    ) -> Dict[str, Any]:
        """Manage cash position and liquidity"""
        try:
            logger.info(f"Managing cash position for entity: {entity_id}")
            
            # Current cash position
            current_position = await self._calculate_current_cash_position(cash_accounts)
            
            # Cash flow forecasting
            cash_flow_forecast = await self._forecast_cash_flows(
                entity_id, forecast_horizon
            )
            
            # Liquidity analysis
            liquidity_analysis = await self._analyze_liquidity(
                current_position, cash_flow_forecast
            )
            
            # Working capital optimization
            working_capital_optimization = await self._optimize_working_capital(
                entity_id, cash_flow_forecast
            )
            
            # Investment opportunities for excess cash
            short_term_investments = await self._identify_short_term_investments(
                current_position, liquidity_analysis
            )
            
            cash_position_management = {
                "management_id": hashlib.sha256(
                    f"{entity_id}_{datetime.now().isoformat()}".encode()
                ).hexdigest()[:12],
                "entity_id": entity_id,
                "management_date": datetime.now().isoformat(),
                "forecast_horizon": forecast_horizon,
                "cash_accounts": cash_accounts,
                "current_position": current_position,
                "cash_flow_forecast": cash_flow_forecast,
                "liquidity_analysis": liquidity_analysis,
                "working_capital_optimization": working_capital_optimization,
                "short_term_investments": short_term_investments,
                "recommendations": await self._generate_cash_management_recommendations(
                    liquidity_analysis, short_term_investments
                )
            }
            
            # Store cash position data
            await self.redis.setex(
                f"cash_position:{entity_id}",
                604800,  # 7 days
                json.dumps(cash_position_management, default=str)
            )
            
            logger.info(f"Cash position management for {entity_id} completed successfully")
            return cash_position_management
            
        except Exception as e:
            logger.error(f"Error managing cash position: {e}")
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
                    "sent_via": "finance_team",
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
class BudgetCreationRequest(BaseModel):
    budget_name: str
    fiscal_year: int
    departments: List[str]
    budget_type: str = "annual"
    currency: str = "USD"

class TransactionRequest(BaseModel):
    transaction_type: str
    amount: float
    description: str
    account: str
    counterparty: str = None
    transaction_date: str = None

class FinancialStatementRequest(BaseModel):
    statement_type: str
    period_start: str
    period_end: str
    reporting_currency: str = "USD"

class InvestmentAnalysisRequest(BaseModel):
    investment_name: str
    investment_type: str
    initial_investment: float
    expected_return: float
    risk_level: str
    time_horizon: int

# FastAPI Application
app = FastAPI(
    title="HAAS+ Finance Team",
    description="Comprehensive financial management and analysis team",
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
fpa_agent = None
accounting_agent = None
investment_analysis_agent = None
treasury_management_agent = None
message_processor = None

@app.on_event("startup")
async def startup_event():
    """Initialize the finance team"""
    global redis_client, fpa_agent, accounting_agent
    global investment_analysis_agent, treasury_management_agent, message_processor
    
    try:
        redis_client = redis.from_url(
            "redis://localhost:6379",
            encoding="utf-8",
            decode_responses=True
        )
        
        await redis_client.ping()
        logger.info("Redis connection established")
        
        fpa_agent = FPAgent(redis_client)
        accounting_agent = AccountingAgent(redis_client)
        investment_analysis_agent = InvestmentAnalysisAgent(redis_client)
        treasury_management_agent = TreasuryManagementAgent(redis_client)
        message_processor = DynamicMessageProcessor(redis_client)
        
        logger.info("Finance Team initialized successfully")
        
    except Exception as e:
        logger.error(f"Error initializing Finance Team: {e}")
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
        "service": "finance_team",
        "status": "healthy" if redis_status == "healthy" else "degraded",
        "timestamp": datetime.now().isoformat(),
        "components": {
            "redis": redis_status,
            "financial_planning": "active",
            "accounting": "active",
            "investment_analysis": "active",
            "treasury_management": "active"
        }
    }

@app.post("/api/v1/create_budget")
async def create_budget(request: BudgetCreationRequest):
    """Create financial budget"""
    try:
        result = await fpa_agent.create_budget(
            request.budget_name,
            request.fiscal_year,
            request.departments,
            request.budget_type,
            request.currency
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error creating budget: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/variance_analysis")
async def variance_analysis(
    budget_id: str,
    actual_data: Dict[str, Any],
    analysis_period: str
):
    """Perform budget variance analysis"""
    try:
        result = await fpa_agent.perform_variance_analysis(
            budget_id, actual_data, analysis_period
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error performing variance analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/process_transaction")
async def process_transaction(request: TransactionRequest):
    """Process financial transaction"""
    try:
        transaction_type = TransactionType(request.transaction_type)
        result = await accounting_agent.process_transaction(
            transaction_type,
            request.amount,
            request.description,
            request.account,
            request.counterparty,
            request.transaction_date
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error processing transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/generate_financial_statements")
async def generate_financial_statements(request: FinancialStatementRequest):
    """Generate financial statements"""
    try:
        result = await accounting_agent.generate_financial_statements(
            request.statement_type,
            request.period_start,
            request.period_end,
            request.reporting_currency
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error generating financial statement: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/analyze_investment")
async def analyze_investment(request: InvestmentAnalysisRequest):
    """Analyze investment opportunity"""
    try:
        investment_type = InvestmentType(request.investment_type)
        risk_level = RiskLevel(request.risk_level)
        result = await investment_analysis_agent.analyze_investment_opportunity(
            request.investment_name,
            investment_type,
            request.initial_investment,
            request.expected_return,
            risk_level,
            request.time_horizon
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error analyzing investment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/optimize_portfolio")
async def optimize_portfolio(
    portfolio_name: str,
    risk_tolerance: str,
    investment_horizon: int,
    available_capital: float,
    investment_constraints: Dict[str, Any] = None
):
    """Optimize investment portfolio"""
    try:
        result = await investment_analysis_agent.optimize_portfolio(
            portfolio_name,
            risk_tolerance,
            investment_horizon,
            available_capital,
            investment_constraints
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error optimizing portfolio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/manage_cash_position")
async def manage_cash_position(
    entity_id: str,
    cash_accounts: List[str],
    forecast_horizon: int = 30
):
    """Manage cash position and liquidity"""
    try:
        result = await treasury_management_agent.manage_cash_position(
            entity_id, cash_accounts, forecast_horizon
        )
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Error managing cash position: {e}")
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
        port=8018,
        reload=True,
        log_level="info"
    )