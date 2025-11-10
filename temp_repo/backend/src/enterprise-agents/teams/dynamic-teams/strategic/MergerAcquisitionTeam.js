/**
 * MERGER ACQUISITION TEAM - FUSIONES Y ADQUISICIONES
 * Equipo especializado en fusiones, adquisiciones, consolidación empresarial y desarrollo corporativo
 * 
 * Agentes Especializados:
 * - M&A Analysts: Análisis financiero y valuación de empresas
 * - Due Diligence Specialists: Investigación exhaustiva pre-adquisición
 * - Integration Planners: Planificación de integración post-fusión
 * - Strategic Deal Makers: Negociación y estructuración de deals
 * - Cultural Integration Experts: Integración cultural y organizacional
 * - Value Creation Managers: Maximización de sinergias y valor post-fusión
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class MergerAcquisitionTeam extends EventEmitter {
    constructor(agentId, config = {}, eventBus = null) {
        super();
        this.agentId = agentId || `ma-${Date.now()}`;
        this.agentType = 'MergerAcquisitionTeam';
        this.config = {
            maxMAdeals: 50,
            maxDueDiligence: 100,
            maxIntegrations: 30,
            maxSynergies: 200,
            maxTargetCompanies: 500,
            maxValuationModels: 75,
            enableDueDiligence: true,
            enableIntegrationPlanning: true,
            enableSynergyTracking: true,
            maSuccessRate: 80, // 80% M&A success target
            averageTimeToClose: 6, // months
            averageSynergyRealization: 65, // %
            ...config
        };
        this.eventBus = eventBus;
        this.isPaused = false;
        
        // Estado del equipo
        this.state = {
            maDeals: new Map(),
            dueDiligenceReports: new Map(),
            integrationPlans: new Map(),
            synergies: new Map(),
            targetCompanies: new Map(),
            valuationModels: new Map(),
            culturalAssessments: new Map(),
            dealPipeline: new Map(),
            lastOptimization: Date.now(),
            performanceMetrics: {
                dealsCompleted: 0,
                dealsInProgress: 0,
                averageSynergyValue: 0,
                integrationSuccessRate: 0,
                dealValueTotal: 0
            }
        };

        // Directorios de datos
        this.dataDir = path.join(__dirname, '../../data', `ma-${this.agentId}`);
        this.dealsDir = path.join(this.dataDir, 'deals');
        this.diligenceDir = path.join(this.dataDir, 'due-diligence');
        this.integrationDir = path.join(this.dataDir, 'integration');
        this.synergiesDir = path.join(this.dataDir, 'synergies');
        this.targetsDir = path.join(this.dataDir, 'targets');
        this.valuationsDir = path.join(this.dataDir, 'valuations');
        this.cultureDir = path.join(this.dataDir, 'cultural');

        // Agentes especializados
        this.specializedAgents = {
            maAnalyst: {
                name: 'M&A Analyst',
                capabilities: [
                    'financial_analysis',
                    'company_valuation',
                    'market_analysis',
                    'risk_assessment',
                    'transaction_structure'
                ],
                active: true,
                lastActivity: Date.now()
            },
            dueDiligenceSpecialist: {
                name: 'Due Diligence Specialist',
                capabilities: [
                    'financial_due_diligence',
                    'legal_compliance',
                    'operational_assessment',
                    'technology_audit',
                    'regulatory_review'
                ],
                active: true,
                lastActivity: Date.now()
            },
            integrationPlanner: {
                name: 'Integration Planner',
                capabilities: [
                    'integration_strategy',
                    'timeline_planning',
                    'resource_allocation',
                    'risk_mitigation',
                    'milestone_tracking'
                ],
                active: true,
                lastActivity: Date.now()
            },
            strategicDealMaker: {
                name: 'Strategic Deal Maker',
                capabilities: [
                    'deal_negotiation',
                    'contract_structuring',
                    'stakeholder_management',
                    'term_optimization',
                    'closing_execution'
                ],
                active: true,
                lastActivity: Date.now()
            },
            culturalIntegrationExpert: {
                name: 'Cultural Integration Expert',
                capabilities: [
                    'cultural_assessment',
                    'change_management',
                    'organization_design',
                    'communication_planning',
                    'leadership_alignment'
                ],
                active: true,
                lastActivity: Date.now()
            },
            valueCreationManager: {
                name: 'Value Creation Manager',
                capabilities: [
                    'synergy_identification',
                    'value_realization',
                    'performance_monitoring',
                    'strategic_initiatives',
                    'roi_optimization'
                ],
                active: true,
                lastActivity: Date.now()
            }
        };

        // Configurar intervals
        this.setupIntervals();
        
        // Conectar con el bus de eventos
        this.connectEventBus();
        
        // Cargar datos existentes
        this.loadState();

        console.log(`🔄 MergerAcquisitionTeam ${this.agentId} inicializado con ${Object.keys(this.specializedAgents).length} agentes especializados`);
    }

    // Inicializar directorios necesarios
    async initDirectories() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            await fs.mkdir(this.dealsDir, { recursive: true });
            await fs.mkdir(this.diligenceDir, { recursive: true });
            await fs.mkdir(this.integrationDir, { recursive: true });
            await fs.mkdir(this.synergiesDir, { recursive: true });
            await fs.mkdir(this.targetsDir, { recursive: true });
            await fs.mkdir(this.valuationsDir, { recursive: true });
            await fs.mkdir(this.cultureDir, { recursive: true });
        } catch (error) {
            console.error('Error creando directorios de M&A:', error);
        }
    }

    // Conectar con el bus de eventos
    connectEventBus() {
        if (this.eventBus) {
            this.eventBus.on('ma_opportunity', this.handleMAOpportunity.bind(this));
            this.eventBus.on('due_diligence_request', this.handleDueDiligenceRequest.bind(this));
            this.eventBus.on('integration_needed', this.handleIntegrationNeeded.bind(this));
            this.eventBus.on('synergy_opportunity', this.handleSynergyOpportunity.bind(this));
            this.eventBus.on('cultural_issue', this.handleCulturalIssue.bind(this));
        }
    }

    // Configurar intervals de optimización
    setupIntervals() {
        this.optimizationInterval = setInterval(() => {
            if (!this.isPaused) {
                this.optimizeMAOperations();
            }
        }, 200000); // 3.5 minutos

        this.dealPipelineInterval = setInterval(() => {
            if (!this.isPaused) {
                this.manageDealPipeline();
            }
        }, 180000); // 3 minutos

        this.synergyTrackingInterval = setInterval(() => {
            if (!this.isPaused && this.config.enableSynergyTracking) {
                this.trackSynergies();
            }
        }, 240000); // 4 minutos
    }

    // OPTIMIZACIÓN DE OPERACIONES M&A
    async optimizeMAOperations() {
        try {
            // Optimizar pipeline de deals
            const pipelineOptimization = await this.optimizeDealPipeline();
            
            // Optimizar due diligence
            const diligenceOptimization = await this.optimizeDueDiligence();
            
            // Optimizar integración
            const integrationOptimization = await this.optimizeIntegration();
            
            this.state.lastOptimization = Date.now();
            
            console.log('🔄 Optimización M&A completada:', {
                pipeline: pipelineOptimization,
                diligence: diligenceOptimization,
                integration: integrationOptimization
            });
            
        } catch (error) {
            console.error('Error en optimización M&A:', error);
        }
    }

    // GESTIÓN DE DEALS M&A
    async createMADeal(dealData) {
        try {
            const dealId = this.generateId('deal');
            const deal = {
                id: dealId,
                type: dealData.type || 'acquisition',
                targetCompany: dealData.targetCompany,
                acquirerCompany: dealData.acquirerCompany,
                dealValue: dealData.dealValue,
                transactionType: dealData.transactionType || 'cash',
                strategicRationale: dealData.strategicRationale,
                expectedSynergies: dealData.expectedSynergies,
                timeline: dealData.timeline,
                status: 'analysis',
                priority: dealData.priority || 'medium',
                createdAt: Date.now(),
                lastUpdate: Date.now(),
                phases: {
                    pre_due_diligence: {
                        status: 'not_started',
                        startDate: null,
                        endDate: null
                    },
                    due_diligence: {
                        status: 'not_started',
                        startDate: null,
                        endDate: null
                    },
                    negotiation: {
                        status: 'not_started',
                        startDate: null,
                        endDate: null
                    },
                    closing: {
                        status: 'not_started',
                        startDate: null,
                        endDate: null
                    },
                    integration: {
                        status: 'not_started',
                        startDate: null,
                        endDate: null
                    }
                },
                riskFactors: dealData.riskFactors || [],
                stakeholders: dealData.stakeholders || []
            };

            this.state.maDeals.set(dealId, deal);
            await this.saveMADeal(deal);
            
            this.emit('ma_deal_created', { dealId, deal });
            
            console.log(`💼 Deal M&A creado: ${dealId} - ${deal.targetCompany}`);
            return dealId;
            
        } catch (error) {
            console.error('Error creando deal M&A:', error);
            throw error;
        }
    }

    // ANÁLISIS DE VALUACIÓN
    async performValuation(valuationData) {
        try {
            const valuationId = this.generateId('valuation');
            
            // Métodos de valuación
            const valuationMethods = {
                discountedCashFlow: this.calculateDCF(valuationData),
                multiplesAnalysis: this.calculateMultiples(valuationData),
                assetBased: this.calculateAssetBased(valuationData),
                precedentTransactions: this.calculatePrecedentTransactions(valuationData),
                liquidationValue: this.calculateLiquidationValue(valuationData)
            };
            
            // Scorecard de valuación
            const valuationScorecard = {
                methods: valuationMethods,
                weightedAverage: this.calculateWeightedValuation(valuationMethods),
                sensitivityAnalysis: this.performSensitivityAnalysis(valuationData),
                riskAdjustment: this.calculateRiskAdjustment(valuationData),
                terminalValue: this.calculateTerminalValue(valuationData)
            };
            
            const valuation = {
                id: valuationId,
                companyId: valuationData.companyId,
                methods: valuationMethods,
                scorecard: valuationScorecard,
                range: {
                    low: valuationScorecard.weightedAverage * 0.8,
                    mid: valuationScorecard.weightedAverage,
                    high: valuationScorecard.weightedAverage * 1.2
                },
                confidenceLevel: this.calculateValuationConfidence(valuationData),
                keyAssumptions: valuationData.keyAssumptions,
                createdAt: Date.now()
            };
            
            this.state.valuationModels.set(valuationId, valuation);
            await this.saveValuation(valuation);
            
            console.log(`📊 Valuación completada: ${valuationId} - Rango: $${(valuation.range.low/1000000).toFixed(1)}M - $${(valuation.range.high/1000000).toFixed(1)}M`);
            return valuationId;
            
        } catch (error) {
            console.error('Error en valuación:', error);
            throw error;
        }
    }

    // DUE DILIGENCE
    async conductDueDiligence(diligenceData) {
        try {
            const diligenceId = this.generateId('diligence');
            
            // Áreas de due diligence
            const diligenceAreas = {
                financial: await this.assessFinancialDueDiligence(diligenceData),
                legal: await this.assessLegalDueDiligence(diligenceData),
                operational: await this.assessOperationalDueDiligence(diligenceData),
                technical: await this.assessTechnicalDueDiligence(diligenceData),
                tax: await this.assessTaxDueDiligence(diligenceData),
                regulatory: await this.assessRegulatoryDueDiligence(diligenceData),
                environmental: await this.assessEnvironmentalDueDiligence(diligenceData),
                hr: await this.assessHRDueDiligence(diligenceData)
            };
            
            // Scorecard de due diligence
            const diligenceScorecard = {
                areas: diligenceAreas,
                overallRisk: this.calculateOverallRisk(diligenceAreas),
                keyIssues: this.identifyKeyIssues(diligenceAreas),
                recommendations: this.generateDiligenceRecommendations(diligenceAreas),
                dealBreakers: this.identifyDealBreakers(diligenceAreas)
            };
            
            const dueDiligence = {
                id: diligenceId,
                dealId: diligenceData.dealId,
                targetCompany: diligenceData.targetCompany,
                scorecard: diligenceScorecard,
                status: 'completed',
                findings: diligenceAreas,
                riskRating: diligenceScorecard.overallRisk,
                estimatedTimeframe: diligenceData.timeframe || '6-8 weeks',
                teamAssigned: diligenceData.team || [],
                createdAt: Date.now()
            };
            
            this.state.dueDiligenceReports.set(diligenceId, dueDiligence);
            await this.saveDueDiligence(dueDiligence);
            
            this.emit('due_diligence_completed', { diligenceId, dueDiligence });
            
            console.log(`🔍 Due diligence completado: ${diligenceId} - Riesgo: ${diligenceScorecard.overallRisk}/10`);
            return diligenceId;
            
        } catch (error) {
            console.error('Error en due diligence:', error);
            throw error;
        }
    }

    // PLANIFICACIÓN DE INTEGRACIÓN
    async createIntegrationPlan(integrationData) {
        try {
            const integrationId = this.generateId('integration');
            
            // Componentes del plan de integración
            const integrationComponents = {
                organizational: this.planOrganizationalIntegration(integrationData),
                operational: this.planOperationalIntegration(integrationData),
                technological: this.planTechnologicalIntegration(integrationData),
                cultural: this.planCulturalIntegration(integrationData),
                financial: this.planFinancialIntegration(integrationData),
                customer: this.planCustomerIntegration(integrationData),
                supplier: this.planSupplierIntegration(integrationData)
            };
            
            // Timeline de integración
            const integrationTimeline = {
                phase1: {
                    name: 'Day 1-30',
                    activities: integrationComponents.day1_30,
                    milestones: ['Organization alignment', 'Communication plan', 'Governance structure'],
                    resources: integrationData.resources?.phase1 || []
                },
                phase2: {
                    name: 'Day 31-90',
                    activities: integrationComponents.day31_90,
                    milestones: ['Process harmonization', 'System integration', 'Team integration'],
                    resources: integrationData.resources?.phase2 || []
                },
                phase3: {
                    name: 'Day 91-180',
                    activities: integrationComponents.day91_180,
                    milestones: ['Full integration', 'Synergy realization', 'Performance optimization'],
                    resources: integrationData.resources?.phase3 || []
                },
                phase4: {
                    name: 'Day 181-365',
                    activities: integrationComponents.day181_365,
                    milestones: ['Culture transformation', 'Strategic alignment', 'Value optimization'],
                    resources: integrationData.resources?.phase4 || []
                }
            };
            
            const integration = {
                id: integrationId,
                dealId: integrationData.dealId,
                acquirerCompany: integrationData.acquirerCompany,
                targetCompany: integrationData.targetCompany,
                plan: integrationComponents,
                timeline: integrationTimeline,
                expectedSynergies: integrationData.expectedSynergies,
                riskMitigation: this.identifyIntegrationRisks(integrationData),
                successMetrics: this.defineSuccessMetrics(integrationData),
                governance: this.defineGovernanceStructure(integrationData),
                status: 'planning',
                createdAt: Date.now()
            };
            
            this.state.integrationPlans.set(integrationId, integration);
            await this.saveIntegration(integration);
            
            console.log(`🎯 Plan de integración creado: ${integrationId}`);
            return integrationId;
            
        } catch (error) {
            console.error('Error creando plan de integración:', error);
            throw error;
        }
    }

    // IDENTIFICACIÓN DE SINERGIAS
    async identifySynergies(synergyData) {
        try {
            const synergyId = this.generateId('synergy');
            
            // Tipos de sinergias
            const synergyTypes = {
                revenue: this.identifyRevenueSynergies(synergyData),
                cost: this.identifyCostSynergies(synergyData),
                operational: this.identifyOperationalSynergies(synergyData),
                financial: this.identifyFinancialSynergies(synergyData),
                strategic: this.identifyStrategicSynergies(synergyData)
            };
            
            // Plan de realización de sinergias
            const realizationPlan = {
                quickWins: synergyTypes.quickWins,
                mediumTerm: synergyTypes.mediumTerm,
                longTerm: synergyTypes.longTerm,
                totalValue: this.calculateTotalSynergyValue(synergyTypes),
                realizationRisk: this.assessSynergyRealizationRisk(synergyTypes),
                timeline: this.defineSynergyTimeline(synergyTypes)
            };
            
            const synergy = {
                id: synergyId,
                dealId: synergyData.dealId,
                type: 'combined',
                value: realizationPlan.totalValue,
                categories: synergyTypes,
                realizationPlan: realizationPlan,
                tracking: {
                    realizedValue: 0,
                    targetValue: realizationPlan.totalValue,
                    realizationRate: 0,
                    keyMilestones: []
                },
                status: 'identified',
                createdAt: Date.now()
            };
            
            this.state.synergies.set(synergyId, synergy);
            await this.saveSynergy(synergy);
            
            console.log(`⚡ Sinergias identificadas: ${synergyId} - Valor: $${(realizationPlan.totalValue/1000000).toFixed(1)}M`);
            return synergyId;
            
        } catch (error) {
            console.error('Error identificando sinergias:', error);
            throw error;
        }
    }

    // MÉTODOS DE VALUACIÓN
    calculateDCF(data) {
        const cashFlows = data.projectedCashFlows || [];
        const discountRate = data.discountRate || 0.10;
        const terminalValue = data.terminalValue || 0;
        
        let dcfValue = 0;
        cashFlows.forEach((cf, year) => {
            dcfValue += cf / Math.pow(1 + discountRate, year);
        });
        
        // Agregar valor terminal
        const terminalDiscount = terminalValue / Math.pow(1 + discountRate, cashFlows.length);
        dcfValue += terminalDiscount;
        
        return dcfValue;
    }

    calculateMultiples(data) {
        const multiples = {
            ebitda: (data.ebitda || 0) * (data.ebitdaMultiple || 8),
            revenue: (data.revenue || 0) * (data.revenueMultiple || 2),
            netIncome: (data.netIncome || 0) * (data.netIncomeMultiple || 12),
            bookValue: (data.bookValue || 0) * (data.bookValueMultiple || 1.5)
        };
        
        return Object.values(multiples).reduce((a, b) => a + b, 0) / 4;
    }

    calculateAssetBased(data) {
        return (data.tangibleAssets || 0) + (data.intangibleAssets || 0) - (data.totalLiabilities || 0);
    }

    calculatePrecedentTransactions(data) {
        const precedents = data.precedentTransactions || [];
        if (precedents.length === 0) return 0;
        
        return precedents.reduce((sum, transaction) => {
            return sum + (transaction.value / transaction.metrics);
        }, 0) / precedents.length;
    }

    calculateLiquidationValue(data) {
        return (data.liquidAssets || 0) * 0.8 + (data.physicalAssets || 0) * 0.3;
    }

    calculateWeightedValuation(methods) {
        const weights = {
            dcf: 0.40,
            multiples: 0.30,
            assetBased: 0.15,
            precedent: 0.10,
            liquidation: 0.05
        };
        
        return Object.entries(methods).reduce((sum, [method, value]) => {
            const weight = weights[method] || 0;
            return sum + (value * weight);
        }, 0);
    }

    // MÉTODOS DE DUE DILIGENCE
    async assessFinancialDueDiligence(data) {
        return {
            financialStatements: {
                quality: this.assessFinancialQuality(data.financialData),
                consistency: this.assessConsistency(data.financialData),
                irregularities: this.identifyIrregularities(data.financialData)
            },
            workingCapital: this.assessWorkingCapital(data),
            cashFlow: this.assessCashFlow(data),
            debtStructure: this.assessDebtStructure(data),
            riskLevel: Math.random() * 5 + 1 // 1-6
        };
    }

    async assessLegalDueDiligence(data) {
        return {
            contracts: {
                majorContracts: data.contracts || [],
                contractRisks: this.identifyContractRisks(data.contracts),
                renewalRisks: this.identifyRenewalRisks(data.contracts)
            },
            litigation: {
                activeCases: data.activeCases || [],
                potentialLiabilities: this.estimateLitigationRisk(data.activeCases)
            },
            compliance: this.assessRegulatoryCompliance(data),
            intellectualProperty: this.assessIPRisks(data),
            riskLevel: Math.random() * 5 + 1 // 1-6
        };
    }

    async assessOperationalDueDiligence(data) {
        return {
            operations: {
                efficiency: this.assessOperationalEfficiency(data),
                scalability: this.assessScalability(data),
                keyRisks: this.identifyOperationalRisks(data)
            },
            supplyChain: this.assessSupplyChain(data),
            keyPersonnel: this.assessKeyPersonnel(data),
            customer: this.assessCustomerBase(data),
            riskLevel: Math.random() * 5 + 1 // 1-6
        };
    }

    async assessTechnicalDueDiligence(data) {
        return {
            technology: {
                infrastructure: this.assessTechInfrastructure(data),
                obsolescence: this.assessTechnologyObsolescence(data),
                security: this.assessCybersecurity(data)
            },
            intellectualProperty: this.assessTechnicalIP(data),
            technicalTeam: this.assessTechnicalTeam(data),
            riskLevel: Math.random() * 5 + 1 // 1-6
        };
    }

    async assessTaxDueDiligence(data) {
        return {
            taxCompliance: this.assessTaxCompliance(data),
            taxStructure: this.assessTaxStructure(data),
            transferPricing: this.assessTransferPricing(data),
            deferredTaxes: this.assessDeferredTaxes(data),
            riskLevel: Math.random() * 5 + 1 // 1-6
        };
    }

    async assessRegulatoryDueDiligence(data) {
        return {
            regulatoryCompliance: this.assessRegulatoryCompliance(data),
            industryLicenses: this.assessIndustryLicenses(data),
            environmental: this.assessEnvironmentalCompliance(data),
            riskLevel: Math.random() * 5 + 1 // 1-6
        };
    }

    async assessEnvironmentalDueDiligence(data) {
        return {
            environmentalLiabilities: this.assessEnvironmentalLiabilities(data),
            environmentalPermits: this.assessEnvironmentalPermits(data),
            sustainability: this.assessSustainabilityPractices(data),
            riskLevel: Math.random() * 5 + 1 // 1-6
        };
    }

    async assessHRDueDiligence(data) {
        return {
            employee: this.assessEmployeeData(data),
            compensation: this.assessCompensation(data),
            benefits: this.assessBenefits(data),
            laborRelations: this.assessLaborRelations(data),
            riskLevel: Math.random() * 5 + 1 // 1-6
        };
    }

    // MÉTODOS DE INTEGRACIÓN
    planOrganizationalIntegration(data) {
        return {
            day1_30: [
                'Organizational structure design',
                'Leadership appointments',
                'Communication planning',
                'Governance framework'
            ],
            day31_90: [
                'Role clarifications',
                'Performance management',
                'Team alignments',
                'Decision rights'
            ],
            day91_180: [
                'Culture alignment',
                'Full integration',
                'Optimization'
            ],
            day181_365: [
                'Continuous improvement',
                'Best practices sharing'
            ]
        };
    }

    planOperationalIntegration(data) {
        return {
            day1_30: [
                'Process mapping',
                'Immediate improvements',
                'Resource allocation'
            ],
            day31_90: [
                'Process standardization',
                'System integration',
                'Workflow optimization'
            ],
            day91_180: [
                'Full operational integration',
                'Performance monitoring'
            ],
            day181_365: [
                'Operational excellence',
                'Continuous optimization'
            ]
        };
    }

    planTechnologicalIntegration(data) {
        return {
            day1_30: [
                'IT assessment',
                'Integration planning',
                'Security review'
            ],
            day31_90: [
                'System integration',
                'Data migration',
                'Training programs'
            ],
            day91_180: [
                'Full tech integration',
                'Performance optimization'
            ],
            day181_365: [
                'Technology innovation',
                'Advanced analytics'
            ]
        };
    }

    planCulturalIntegration(data) {
        return {
            day1_30: [
                'Cultural assessment',
                'Communication strategy',
                'Leadership alignment'
            ],
            day31_90: [
                'Cultural workshops',
                'Team building',
                'Change champions'
            ],
            day91_180: [
                'Cultural transformation',
                'Values integration'
            ],
            day181_365: [
                'Culture optimization',
                'Sustained alignment'
            ]
        };
    }

    planFinancialIntegration(data) {
        return {
            day1_30: [
                'Financial reporting',
                'Cash management',
                'Budget planning'
            ],
            day31_90: [
                'Accounting integration',
                'Financial systems',
                'Cost control'
            ],
            day91_180: [
                'Financial optimization',
                'Synergy realization'
            ],
            day181_365: [
                'Financial excellence',
                'Value maximization'
            ]
        };
    }

    planCustomerIntegration(data) {
        return {
            day1_30: [
                'Customer communication',
                'Service continuity',
                'Account management'
            ],
            day31_90: [
                'Customer transition',
                'Service integration',
                'Retention programs'
            ],
            day91_180: [
                'Customer optimization',
                'Experience enhancement'
            ],
            day181_365: [
                'Customer excellence',
                'Growth acceleration'
            ]
        };
    }

    planSupplierIntegration(data) {
        return {
            day1_30: [
                'Supplier communication',
                'Contract review',
                'Supply continuity'
            ],
            day31_90: [
                'Supplier integration',
                'Procurement optimization',
                'Cost reduction'
            ],
            day91_180: [
                'Supply chain optimization',
                'Strategic sourcing'
            ],
            day181_365: [
                'Supply excellence',
                'Innovation partnerships'
            ]
        };
    }

    // MÉTODOS DE SINERGIAS
    identifyRevenueSynergies(data) {
        return {
            crossSelling: Math.random() * 50000000 + 20000000, // $20M-$70M
            priceOptimization: Math.random() * 30000000 + 10000000, // $10M-$40M
            newMarkets: Math.random() * 100000000 + 50000000, // $50M-$150M
            productInnovation: Math.random() * 40000000 + 15000000, // $15M-$55M
            marketExpansion: Math.random() * 80000000 + 30000000, // $30M-$110M
            total: 0
        };
    }

    identifyCostSynergies(data) {
        return {
            operationalEfficiency: Math.random() * 20000000 + 10000000, // $10M-$30M
            procurement: Math.random() * 15000000 + 5000000, // $5M-$20M
            overhead: Math.random() * 10000000 + 5000000, // $5M-$15M
            technology: Math.random() * 8000000 + 3000000, // $3M-$11M
            realEstate: Math.random() * 5000000 + 2000000, // $2M-$7M
            total: 0
        };
    }

    identifyOperationalSynergies(data) {
        return {
            processImprovement: Math.random() * 12000000 + 8000000, // $8M-$20M
            automation: Math.random() * 10000000 + 5000000, // $5M-$15M
            knowledgeTransfer: Math.random() * 8000000 + 3000000, // $3M-$11M
            supplyChain: Math.random() * 6000000 + 2000000, // $2M-$8M
            total: 0
        };
    }

    identifyFinancialSynergies(data) {
        return {
            taxOptimization: Math.random() * 5000000 + 2000000, // $2M-$7M
            capitalEfficiency: Math.random() * 8000000 + 3000000, // $3M-$11M
            funding: Math.random() * 10000000 + 5000000, // $5M-$15M
            total: 0
        };
    }

    identifyStrategicSynergies(data) {
        return {
            marketPosition: Math.random() * 20000000 + 10000000, // $10M-$30M
            innovation: Math.random() * 15000000 + 8000000, // $8M-$23M
            competitive: Math.random() * 12000000 + 5000000, // $5M-$17M
            regulatory: Math.random() * 7000000 + 3000000, // $3M-$10M
            total: 0
        };
    }

    // GESTIÓN DEL PIPELINE
    async manageDealPipeline() {
        try {
            // Priorizar deals activos
            const dealsArray = Array.from(this.state.maDeals.values());
            dealsArray.sort((a, b) => {
                const scoreA = this.calculateDealPriority(a);
                const scoreB = this.calculateDealPriority(b);
                return scoreB - scoreA;
            });
            
            // Identificar deals que necesitan atención
            const attentionDeals = dealsArray.filter(deal => {
                const daysSinceUpdate = (Date.now() - deal.lastUpdate) / (1000 * 60 * 60 * 24);
                return daysSinceUpdate > 7;
            });
            
            // Proponer next steps
            const nextSteps = dealsArray.map(deal => ({
                dealId: deal.id,
                nextAction: this.recommendNextAction(deal),
                priority: this.calculateDealPriority(deal),
                timeline: this.estimateNextMilestone(deal)
            }));
            
            console.log(`🎯 Pipeline M&A: ${dealsArray.length} deals, ${attentionDeals.length} requieren atención`);
            
            return {
                totalDeals: dealsArray.length,
                attentionDeals: attentionDeals.length,
                nextSteps: nextSteps
            };
            
        } catch (error) {
            console.error('Error gestionando pipeline:', error);
        }
    }

    // TRACKING DE SINERGIAS
    async trackSynergies() {
        try {
            const synergiesArray = Array.from(this.state.synergies.values());
            
            for (const synergy of synergiesArray) {
                // Calcular valor realizado vs proyectado
                const realizationRate = (synergy.tracking.realizedValue / synergy.tracking.targetValue) * 100;
                synergy.tracking.realizationRate = realizationRate;
                
                // Identificar desviaciones significativas
                if (realizationRate < 50 && synergy.status !== 'at_risk') {
                    synergy.status = 'at_risk';
                    this.emit('synergy_at_risk', { synergyId: synergy.id, realizationRate });
                }
                
                // Actualizar tracking
                await this.saveSynergy(synergy);
            }
            
            console.log(`⚡ Seguimiento de sinergias: ${synergiesArray.length} sinergias monitoreadas`);
            
        } catch (error) {
            console.error('Error en tracking de sinergias:', error);
        }
    }

    // HANDLERS DE EVENTOS
    async handleMAOpportunity(data) {
        try {
            const dealId = await this.createMADeal(data.dealData);
            console.log(`📨 Oportunidad M&A procesada: ${dealId}`);
        } catch (error) {
            console.error('Error procesando oportunidad M&A:', error);
        }
    }

    async handleDueDiligenceRequest(data) {
        try {
            const diligenceId = await this.conductDueDiligence(data.diligenceData);
            console.log(`🔍 Solicitud de due diligence procesada: ${diligenceId}`);
        } catch (error) {
            console.error('Error procesando solicitud de due diligence:', error);
        }
    }

    async handleIntegrationNeeded(data) {
        try {
            const integrationId = await this.createIntegrationPlan(data.integrationData);
            console.log(`🎯 Necesidad de integración procesada: ${integrationId}`);
        } catch (error) {
            console.error('Error procesando necesidad de integración:', error);
        }
    }

    async handleSynergyOpportunity(data) {
        try {
            const synergyId = await this.identifySynergies(data.synergyData);
            console.log(`⚡ Oportunidad de sinergias procesada: ${synergyId}`);
        } catch (error) {
            console.error('Error procesando oportunidad de sinergias:', error);
        }
    }

    async handleCulturalIssue(data) {
        try {
            // Procesar issue cultural en el contexto de M&A
            console.log(`🌍 Issue cultural procesada: ${data.issue}`);
        } catch (error) {
            console.error('Error procesando issue cultural:', error);
        }
    }

    // OPTIMIZACIÓN DE PIPELINE
    async optimizeDealPipeline() {
        const deals = Array.from(this.state.maDeals.values());
        let optimizationScore = 0;
        
        // Optimizar basadas en probabilidad de cierre
        for (const deal of deals) {
            const probability = this.calculateDealProbability(deal);
            if (probability > 0.7) {
                optimizationScore += 10;
            } else if (probability > 0.5) {
                optimizationScore += 5;
            }
        }
        
        return { optimizationScore, dealsOptimized: deals.length };
    }

    // OPTIMIZACIÓN DE DUE DILIGENCE
    async optimizeDueDiligence() {
        const diligences = Array.from(this.state.dueDiligenceReports.values());
        let efficiency = 0;
        
        for (const diligence of diligences) {
            const efficiencyScore = this.calculateDiligenceEfficiency(diligence);
            efficiency += efficiencyScore;
        }
        
        return { averageEfficiency: diligences.length > 0 ? efficiency / diligences.length : 0 };
    }

    // OPTIMIZACIÓN DE INTEGRACIÓN
    async optimizeIntegration() {
        const integrations = Array.from(this.state.integrationPlans.values());
        let successRate = 0;
        
        for (const integration of integrations) {
            const successScore = this.calculateIntegrationSuccess(integration);
            successRate += successScore;
        }
        
        return { averageSuccessRate: integrations.length > 0 ? successRate / integrations.length : 0 };
    }

    // MÉTODOS DE UTILIDAD
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    calculateDealPriority(deal) {
        let priority = 0;
        
        // Valor del deal
        priority += (deal.dealValue || 0) / 1000000;
        
        // Estado
        if (deal.status === 'due_diligence') priority += 20;
        else if (deal.status === 'negotiation') priority += 15;
        else if (deal.status === 'analysis') priority += 10;
        
        // Urgencia
        if (deal.priority === 'high') priority += 15;
        else if (deal.priority === 'medium') priority += 10;
        else priority += 5;
        
        return priority;
    }

    calculateDealProbability(deal) {
        // Algoritmo simplificado de probabilidad
        let probability = 0.3; // Base
        
        // Ajustar basado en fase
        const phaseProgress = this.calculatePhaseProgress(deal);
        probability += phaseProgress * 0.4;
        
        // Ajustar basado en issues
        const issueFactor = Math.max(0, 1 - (deal.riskFactors?.length || 0) * 0.1);
        probability += issueFactor * 0.2;
        
        return Math.min(probability, 0.95);
    }

    calculatePhaseProgress(deal) {
        const phases = Object.values(deal.phases || {});
        const completedPhases = phases.filter(phase => phase.status === 'completed').length;
        return completedPhases / phases.length;
    }

    recommendNextAction(deal) {
        const currentPhase = this.getCurrentPhase(deal);
        const phaseActions = {
            pre_due_diligence: 'Iniciar due diligence formal',
            due_diligence: 'Completar evaluación de due diligence',
            negotiation: 'Finalizar términos de negociación',
            closing: 'Ejecutar documentos de cierre',
            integration: 'Iniciar planificación de integración'
        };
        return phaseActions[currentPhase] || 'Revisar estado del deal';
    }

    getCurrentPhase(deal) {
        for (const [phaseName, phase] of Object.entries(deal.phases || {})) {
            if (phase.status === 'in_progress') {
                return phaseName;
            }
        }
        return 'pre_due_diligence';
    }

    estimateNextMilestone(deal) {
        const daysFromCreation = (Date.now() - deal.createdAt) / (1000 * 60 * 60 * 24);
        const averageDaysToMilestone = 30;
        return Math.round(daysFromCreation + averageDaysToMilestone);
    }

    // CÁLCULOS DE VALUACIÓN
    calculateSensitivityAnalysis(data) {
        const baseCase = this.calculateWeightedValuation({
            dcf: this.calculateDCF(data),
            multiples: this.calculateMultiples(data),
            assetBased: this.calculateAssetBased(data),
            precedent: this.calculatePrecedentTransactions(data),
            liquidation: this.calculateLiquidationValue(data)
        });
        
        return {
            bullCase: baseCase * 1.2,
            baseCase: baseCase,
            bearCase: baseCase * 0.8
        };
    }

    calculateRiskAdjustment(data) {
        const riskFactors = data.riskFactors || [];
        const riskPenalty = riskFactors.length * 0.05; // 5% por factor de riesgo
        return 1 - Math.min(riskPenalty, 0.3); // Máximo 30% de penalización
    }

    calculateTerminalValue(data) {
        const terminalGrowth = data.terminalGrowth || 0.02;
        const terminalEBITDA = data.terminalEBITDA || 0;
        const terminalMultiple = data.terminalMultiple || 8;
        return terminalEBITDA * terminalMultiple;
    }

    calculateValuationConfidence(data) {
        const dataQuality = this.assessDataQuality(data);
        const marketDepth = this.assessMarketDepth(data);
        const precedentAvailability = this.assessPrecedentAvailability(data);
        return (dataQuality + marketDepth + precedentAvailability) / 3;
    }

    // CÁLCULOS DE DUE DILIGENCE
    calculateOverallRisk(areas) {
        const risks = Object.values(areas).map(area => area.riskLevel || 5);
        return risks.reduce((a, b) => a + b, 0) / risks.length;
    }

    identifyKeyIssues(areas) {
        const issues = [];
        for (const [areaName, area] of Object.entries(areas)) {
            if (area.riskLevel > 7) {
                issues.push({
                    area: areaName,
                    severity: 'high',
                    description: `Riesgo significativo en ${areaName}`
                });
            }
        }
        return issues;
    }

    generateDiligenceRecommendations(areas) {
        return [
            'Revisar contratos principales para identificar riesgos de renovación',
            'Validar flujos de caja proyectados con históricos',
            'Evaluar concentración de clientes y dependencias clave',
            'Revisar compliance regulatorio y permisos necesarios'
        ];
    }

    identifyDealBreakers(areas) {
        const breakers = [];
        for (const [areaName, area] of Object.entries(areas)) {
            if (area.riskLevel > 8.5) {
                breakers.push({
                    area: areaName,
                    severity: 'critical',
                    description: `Factor crítico en ${areaName} requiere atención inmediata`
                });
            }
        }
        return breakers;
    }

    // MÉTODOS DE ASSESSMENT
    assessFinancialQuality(data) {
        return Math.random() * 3 + 7; // 7-10
    }

    assessConsistency(data) {
        return Math.random() * 2 + 8; // 8-10
    }

    identifyIrregularities(data) {
        return Math.floor(Math.random() * 5); // 0-4
    }

    assessWorkingCapital(data) {
        return Math.random() * 20 + 80; // 80-100
    }

    assessCashFlow(data) {
        return Math.random() * 15 + 75; // 75-90
    }

    assessDebtStructure(data) {
        return Math.random() * 30 + 60; // 60-90
    }

    // MÉTODOS DE VALUACIÓN ADICIONALES
    performValuationAnalysis(valuationId) {
        const valuation = this.state.valuationModels.get(valuationId);
        if (!valuation) return null;
        
        return {
            id: valuationId,
            companyId: valuation.companyId,
            valuationRange: valuation.range,
            confidenceLevel: valuation.confidenceLevel,
            keyDrivers: this.identifyValuationDrivers(valuation),
            riskFactors: this.identifyValuationRisks(valuation),
            comparableAnalysis: this.performComparableAnalysis(valuation)
        };
    }

    identifyValuationDrivers(valuation) {
        return [
            'Crecimiento de ingresos',
            'Margen EBITDA',
            'Flujo de caja libre',
            'Crecimiento del mercado',
            'Ventajas competitivas'
        ];
    }

    identifyValuationRisks(valuation) {
        return [
            'Dependencia de clientes clave',
            'Competencia intensa',
            'Regulación cambiante',
            'Riesgos operativos',
            'Volatilidad de mercado'
        ];
    }

    performComparableAnalysis(valuation) {
        return {
            tradingMultiples: {
                EV_EBITDA: Math.random() * 5 + 10,
                P_E: Math.random() * 5 + 15,
                EV_Revenue: Math.random() * 2 + 3
            },
            transactionMultiples: {
                EV_EBITDA: Math.random() * 3 + 12,
                P_E: Math.random() * 4 + 18,
                EV_Revenue: Math.random() * 1 + 4
            }
        };
    }

    // MÉTODOS DE INTEGRACIÓN AVANZADOS
    identifyIntegrationRisks(data) {
        return [
            {
                category: 'Cultural',
                probability: 0.7,
                impact: 8,
                mitigation: 'Programa integral de integración cultural'
            },
            {
                category: 'IT Systems',
                probability: 0.5,
                impact: 6,
                mitigation: 'Plan de migración técnica detallado'
            },
            {
                category: 'Key Personnel',
                probability: 0.6,
                impact: 9,
                mitigation: 'Plan de retención y desarrollo'
            }
        ];
    }

    defineSuccessMetrics(data) {
        return {
            financial: [
                'Realización de sinergias ($)',
                'ROI de la transacción (%)',
                'Crecimiento de ingresos (%)'
            ],
            operational: [
                'Tiempo de integración (días)',
                'Productividad combinada',
                'Eficiencia operacional (%)'
            ],
            cultural: [
                'Índice de satisfacción del empleados',
                'Retención de talento (%)',
                'Engagement score'
            ]
        };
    }

    defineGovernanceStructure(data) {
        return {
            steeringCommittee: {
                frequency: 'Weekly',
                members: ['CEO', 'CFO', 'Integration Lead'],
                responsibilities: ['Strategic decisions', 'Resource allocation', 'Issue escalation']
            },
            workingGroups: {
                frequency: 'Daily',
                groups: ['Operations', 'Technology', 'Culture', 'HR'],
                responsibilities: ['Execution', 'Day-to-day coordination', 'Problem solving']
            }
        };
    }

    // MÉTODOS DE SINERGIAS AVANZADOS
    calculateTotalSynergyValue(synergyTypes) {
        const categories = Object.values(synergyTypes);
        const totals = categories.map(category => {
            if (typeof category === 'object' && category.total !== undefined) {
                return category.total;
            }
            return 0;
        });
        return totals.reduce((a, b) => a + b, 0);
    }

    assessSynergyRealizationRisk(synergyTypes) {
        return Math.random() * 3 + 2; // 2-5
    }

    defineSynergyTimeline(synergyTypes) {
        return {
            quickWins: {
                timeframe: '0-6 months',
                percentage: 40,
                value: 'Immediate benefits'
            },
            mediumTerm: {
                timeframe: '6-18 months',
                percentage: 45,
                value: 'Systematic improvements'
            },
            longTerm: {
                timeframe: '18+ months',
                percentage: 15,
                value: 'Strategic transformation'
            }
        };
    }

    // MÉTODOS DE CÁLCULO AVANZADOS
    calculateDiligenceEfficiency(diligence) {
        const areas = Object.values(diligence.findings || {});
        const riskScores = areas.map(area => area.riskLevel || 5);
        const averageRisk = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;
        return 10 - (averageRisk - 5); // Invertir la escala de riesgo
    }

    calculateIntegrationSuccess(integration) {
        const timelineProgress = this.calculateIntegrationProgress(integration);
        const riskMitigation = this.assessRiskMitigation(integration);
        return (timelineProgress + (10 - riskMitigation)) / 2;
    }

    calculateIntegrationProgress(integration) {
        const phases = Object.values(integration.timeline || {});
        const completedPhases = phases.filter(phase => {
            const activities = phase.activities || [];
            return activities.length > 0;
        });
        return (completedPhases.length / phases.length) * 10;
    }

    assessRiskMitigation(integration) {
        const risks = integration.riskMitigation || [];
        const mitigatedRisks = risks.filter(risk => risk.mitigation).length;
        return risks.length > 0 ? (mitigatedRisks / risks.length) * 10 : 10;
    }

    // MÉTODOS DE ASSESSMENT ADICIONALES
    assessDataQuality(data) {
        return Math.random() * 2 + 8; // 8-10
    }

    assessMarketDepth(data) {
        return Math.random() * 3 + 7; // 7-10
    }

    assessPrecedentAvailability(data) {
        return Math.random() * 4 + 6; // 6-10
    }

    identifyContractRisks(contracts) {
        return Math.floor(Math.random() * 3) + 1; // 1-3
    }

    identifyRenewalRisks(contracts) {
        return Math.floor(Math.random() * 5) + 2; // 2-6
    }

    estimateLitigationRisk(cases) {
        return Math.random() * 1000000 + 500000; // $500K-$1.5M
    }

    assessRegulatoryCompliance(data) {
        return Math.random() * 20 + 80; // 80-100
    }

    assessIPRisks(data) {
        return Math.random() * 5 + 5; // 5-10
    }

    assessOperationalEfficiency(data) {
        return Math.random() * 30 + 70; // 70-100
    }

    assessScalability(data) {
        return Math.random() * 25 + 75; // 75-100
    }

    identifyOperationalRisks(data) {
        return Math.floor(Math.random() * 4) + 1; // 1-4
    }

    assessSupplyChain(data) {
        return Math.random() * 20 + 75; // 75-95
    }

    assessKeyPersonnel(data) {
        return Math.random() * 15 + 80; // 80-95
    }

    assessCustomerBase(data) {
        return Math.random() * 25 + 70; // 70-95
    }

    // MÉTODOS DE ASSESSMENT TÉCNICO
    assessTechInfrastructure(data) {
        return Math.random() * 20 + 75; // 75-95
    }

    assessTechnologyObsolescence(data) {
        return Math.random() * 30 + 60; // 60-90
    }

    assessCybersecurity(data) {
        return Math.random() * 15 + 80; // 80-95
    }

    assessTechnicalIP(data) {
        return Math.random() * 20 + 70; // 70-90
    }

    assessTechnicalTeam(data) {
        return Math.random() * 25 + 70; // 70-95
    }

    // MÉTODOS DE ASSESSMENT FISCAL Y REGULATORIO
    assessTaxCompliance(data) {
        return Math.random() * 20 + 80; // 80-100
    }

    assessTaxStructure(data) {
        return Math.random() * 25 + 70; // 70-95
    }

    assessTransferPricing(data) {
        return Math.random() * 30 + 65; // 65-95
    }

    assessDeferredTaxes(data) {
        return Math.random() * 20 + 75; // 75-95
    }

    assessIndustryLicenses(data) {
        return Math.random() * 15 + 85; // 85-100
    }

    assessEnvironmentalCompliance(data) {
        return Math.random() * 25 + 70; // 70-95
    }

    // MÉTODOS DE ASSESSMENT MEDIOAMBIENTE Y RRHH
    assessEnvironmentalLiabilities(data) {
        return Math.random() * 1000000 + 200000; // $200K-$1.2M
    }

    assessEnvironmentalPermits(data) {
        return Math.random() * 10 + 90; // 90-100
    }

    assessSustainabilityPractices(data) {
        return Math.random() * 20 + 75; // 75-95
    }

    assessEmployeeData(data) {
        return Math.random() * 15 + 80; // 80-95
    }

    assessCompensation(data) {
        return Math.random() * 20 + 75; // 75-95
    }

    assessBenefits(data) {
        return Math.random() * 25 + 70; // 70-95
    }

    assessLaborRelations(data) {
        return Math.random() * 30 + 65; // 65-95
    }

    // MÉTODOS DE PERSISTENCIA
    async saveMADeal(deal) {
        try {
            const dealFile = path.join(this.dealsDir, `${deal.id}.json`);
            await fs.writeFile(dealFile, JSON.stringify(deal, null, 2));
        } catch (error) {
            console.error('Error guardando deal M&A:', error);
        }
    }

    async saveValuation(valuation) {
        try {
            const valuationFile = path.join(this.valuationsDir, `${valuation.id}.json`);
            await fs.writeFile(valuationFile, JSON.stringify(valuation, null, 2));
        } catch (error) {
            console.error('Error guardando valuación:', error);
        }
    }

    async saveDueDiligence(diligence) {
        try {
            const diligenceFile = path.join(this.diligenceDir, `${diligence.id}.json`);
            await fs.writeFile(diligenceFile, JSON.stringify(diligence, null, 2));
        } catch (error) {
            console.error('Error guardando due diligence:', error);
        }
    }

    async saveIntegration(integration) {
        try {
            const integrationFile = path.join(this.integrationDir, `${integration.id}.json`);
            await fs.writeFile(integrationFile, JSON.stringify(integration, null, 2));
        } catch (error) {
            console.error('Error guardando integración:', error);
        }
    }

    async saveSynergy(synergy) {
        try {
            const synergyFile = path.join(this.synergiesDir, `${synergy.id}.json`);
            await fs.writeFile(synergyFile, JSON.stringify(synergy, null, 2));
        } catch (error) {
            console.error('Error guardando sinergia:', error);
        }
    }

    async loadState() {
        try {
            await this.initDirectories();
            await this.loadMADeals();
            await this.loadValuations();
            await this.loadDueDiligences();
            await this.loadIntegrations();
            await this.loadSynergies();
        } catch (error) {
            console.error('Error cargando estado M&A:', error);
        }
    }

    async loadMADeals() {
        try {
            const files = await fs.readdir(this.dealsDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.dealsDir, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const deal = JSON.parse(content);
                    this.state.maDeals.set(deal.id, deal);
                }
            }
        } catch (error) {
            // Directorio puede no existir en primera ejecución
        }
    }

    async loadValuations() {
        try {
            const files = await fs.readdir(this.valuationsDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.valuationsDir, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const valuation = JSON.parse(content);
                    this.state.valuationModels.set(valuation.id, valuation);
                }
            }
        } catch (error) {
            // Directorio puede no existir en primera ejecución
        }
    }

    async loadDueDiligences() {
        try {
            const files = await fs.readdir(this.diligenceDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.diligenceDir, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const diligence = JSON.parse(content);
                    this.state.dueDiligenceReports.set(diligence.id, diligence);
                }
            }
        } catch (error) {
            // Directorio puede no existir en primera ejecución
        }
    }

    async loadIntegrations() {
        try {
            const files = await fs.readdir(this.integrationDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.integrationDir, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const integration = JSON.parse(content);
                    this.state.integrationPlans.set(integration.id, integration);
                }
            }
        } catch (error) {
            // Directorio puede no existir en primera ejecución
        }
    }

    async loadSynergies() {
        try {
            const files = await fs.readdir(this.synergiesDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.synergiesDir, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const synergy = JSON.parse(content);
                    this.state.synergies.set(synergy.id, synergy);
                }
            }
        } catch (error) {
            // Directorio puede no existir en primera ejecución
        }
    }

    // MÉTODOS DE CONTROL
    pause() {
        this.isPaused = true;
        console.log(`⏸️ MergerAcquisitionTeam ${this.agentId} pausado`);
    }

    resume() {
        this.isPaused = false;
        console.log(`▶️ MergerAcquisitionTeam ${this.agentId} reanudado`);
    }

    async getStatus() {
        return {
            agentId: this.agentId,
            agentType: this.agentType,
            isPaused: this.isPaused,
            metrics: {
                totalDeals: this.state.maDeals.size,
                totalValuations: this.state.valuationModels.size,
                totalDueDiligences: this.state.dueDiligenceReports.size,
                totalIntegrations: this.state.integrationPlans.size,
                totalSynergies: this.state.synergies.size,
                lastOptimization: this.state.lastOptimization
            },
            specializedAgents: this.specializedAgents,
            performance: this.state.performanceMetrics
        };
    }

    async getMetrics() {
        return {
            ...this.state.performanceMetrics,
            maSuccessRate: this.calculateMASuccessRate(),
            averageSynergyValue: this.calculateAverageSynergyValue(),
            integrationSuccessRate: this.calculateIntegrationSuccessRate()
        };
    }

    calculateMASuccessRate() {
        const deals = Array.from(this.state.maDeals.values());
        const successfulDeals = deals.filter(deal => deal.status === 'closed').length;
        return deals.length > 0 ? (successfulDeals / deals.length) * 100 : 0;
    }

    calculateAverageSynergyValue() {
        const synergies = Array.from(this.state.synergies.values());
        const totalValue = synergies.reduce((sum, synergy) => sum + synergy.value, 0);
        return synergies.length > 0 ? totalValue / synergies.length : 0;
    }

    calculateIntegrationSuccessRate() {
        const integrations = Array.from(this.state.integrationPlans.values());
        const completedIntegrations = integrations.filter(integration => 
            integration.status === 'completed'
        ).length;
        return integrations.length > 0 ? (completedIntegrations / integrations.length) * 100 : 0;
    }

    // Limpiar recursos
    destroy() {
        if (this.optimizationInterval) clearInterval(this.optimizationInterval);
        if (this.dealPipelineInterval) clearInterval(this.dealPipelineInterval);
        if (this.synergyTrackingInterval) clearInterval(this.synergyTrackingInterval);
        console.log(`🗑️ MergerAcquisitionTeam ${this.agentId} destruido`);
    }
}

module.exports = MergerAcquisitionTeam;