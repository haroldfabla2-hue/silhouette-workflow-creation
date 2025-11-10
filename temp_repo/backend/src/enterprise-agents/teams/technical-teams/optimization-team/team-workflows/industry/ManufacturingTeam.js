/**
 * MANUFACTURING TEAM - GESTIÓN DE MANUFACTURA Y PRODUCCIÓN
 * Equipo especializado en manufactura, producción, control de calidad y operaciones de planta
 * 
 * Agentes Especializados:
 * - Production Managers: Gestión de producción y planificación
 * - Quality Control Inspectors: Inspección de calidad en proceso
 * - Process Engineers: Optimización de procesos productivos
 * - Safety Coordinators: Seguridad industrial y cumplimiento
 * - Operations Analysts: Análisis de operaciones y eficiencia
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ManufacturingTeam extends EventEmitter {
    constructor(agentId, config = {}, eventBus = null) {
        super();
        this.agentId = agentId || `manufacturing-${Date.now()}`;
        this.agentType = 'ManufacturingTeam';
        this.config = {
            maxProductionLines: 20,
            maxProductionOrders: 500,
            maxQualityInspections: 1000,
            maxProducts: 200,
            enablePredictiveMaintenance: true,
            enableQualityControl: true,
            enableSafetyMonitoring: true,
            oeeTarget: 85, // Overall Equipment Effectiveness target
            qualityThreshold: 98, // 98% quality pass rate target
            ...config
        };
        this.eventBus = eventBus;
        this.isPaused = false;
        
        // Estado del equipo
        this.state = {
            productionOrders: new Map(),
            productionLines: new Map(),
            qualityInspections: new Map(),
            products: new Map(),
            maintenanceSchedules: new Map(),
            safetyIncidents: new Map(),
            processData: new Map(),
            oeeMetrics: new Map(),
            lastOptimization: Date.now(),
            performanceMetrics: {
                totalProductionOrders: 0,
                completedOrders: 0,
                qualityPassRate: 0,
                averageOEE: 0,
                safetyIncidents: 0,
                maintenanceEfficiency: 0,
                productionEfficiency: 0
            }
        };

        // Inicializar directorios de datos
        this.dataDir = path.join(__dirname, '..', '..', 'data', 'manufacturing');
        this.productionDir = path.join(this.dataDir, 'production');
        this.qualityDir = path.join(this.dataDir, 'quality');
        this.maintenanceDir = path.join(this.dataDir, 'maintenance');
        this.initDirectories();
        
        // Definir agentes especializados
        this.specializedAgents = {
            productionManager: {
                name: 'Production Manager',
                capabilities: [
                    'production_planning',
                    'capacity_management',
                    'schedule_optimization',
                    'resource_allocation',
                    'oee_monitoring'
                ],
                active: true,
                lastActivity: Date.now()
            },
            qualityControlInspector: {
                name: 'Quality Control Inspector',
                capabilities: [
                    'incoming_inspection',
                    'in_process_monitoring',
                    'final_inspection',
                    'defect_analysis',
                    'quality_reporting'
                ],
                active: true,
                lastActivity: Date.now()
            },
            processEngineer: {
                name: 'Process Engineer',
                capabilities: [
                    'process_optimization',
                    'lean_implementation',
                    'automation_design',
                    'efficiency_improvement',
                    'six_sigma_projects'
                ],
                active: true,
                lastActivity: Date.now()
            },
            safetyCoordinator: {
                name: 'Safety Coordinator',
                capabilities: [
                    'safety_training',
                    'incident_investigation',
                    'compliance_monitoring',
                    'risk_assessment',
                    'safety_audits'
                ],
                active: true,
                lastActivity: Date.now()
            },
            operationsAnalyst: {
                name: 'Operations Analyst',
                capabilities: [
                    'performance_analytics',
                    'kpi_monitoring',
                    'process_improvement',
                    'efficiency_analysis',
                    'cost_optimization'
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

        console.log(`🏭 ManufacturingTeam ${this.agentId} inicializado con ${Object.keys(this.specializedAgents).length} agentes especializados`);
    }

    // Inicializar directorios necesarios
    async initDirectories() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            await fs.mkdir(this.productionDir, { recursive: true });
            await fs.mkdir(this.qualityDir, { recursive: true });
            await fs.mkdir(this.maintenanceDir, { recursive: true });
        } catch (error) {
            console.error('Error creando directorios de manufactura:', error);
        }
    }

    // Conectar con el bus de eventos
    connectEventBus() {
        if (this.eventBus) {
            this.eventBus.on('production_order_request', this.handleProductionOrderRequest.bind(this));
            this.eventBus.on('quality_issue_reported', this.handleQualityIssue.bind(this));
            this.eventBus.on('equipment_failure', this.handleEquipmentFailure.bind(this));
            this.eventBus.on('safety_incident', this.handleSafetyIncident.bind(this));
            this.eventBus.on('maintenance_due', this.handleMaintenanceDue.bind(this));
        }
    }

    // Configurar intervals de optimización
    setupIntervals() {
        this.optimizationInterval = setInterval(() => {
            if (!this.isPaused) {
                this.optimizeManufacturingOperations();
            }
        }, 180000); // 3 minutos

        this.oeeMonitorInterval = setInterval(() => {
            if (!this.isPaused) {
                this.updateOEEMetrics();
            }
        }, 120000); // 2 minutos

        this.qualityCheckInterval = setInterval(() => {
            if (!this.isPaused && this.config.enableQualityControl) {
                this.conductQualityChecks();
            }
        }, 90000); // 1.5 minutos

        this.safetyMonitorInterval = setInterval(() => {
            if (!this.isPaused && this.config.enableSafetyMonitoring) {
                this.monitorSafetyConditions();
            }
        }, 60000); // 1 minuto
    }

    // Métodos principales del equipo

    // Gestión de órdenes de producción
    async createProductionOrder(orderData) {
        try {
            if (this.isPaused) {
                throw new Error('Equipo pausado');
            }

            const orderId = crypto.randomUUID();
            const order = {
                id: orderId,
                ...orderData,
                createdAt: new Date().toISOString(),
                status: 'planned',
                progress: 0,
                qualityStatus: 'pending',
                startDate: null,
                endDate: null,
                actualStartDate: null,
                actualEndDate: null,
                assignedLine: orderData.assignedLine || null,
                manager: this.specializedAgents.productionManager,
                milestones: [
                    { name: 'planned', date: new Date().toISOString(), completed: true }
                ],
                oee: {
                    availability: 0,
                    performance: 0,
                    quality: 0,
                    overall: 0
                }
            };

            this.state.productionOrders.set(orderId, order);
            this.state.performanceMetrics.totalProductionOrders++;
            
            await this.saveProductionOrder(order);
            this.emit('production_order_created', { order, agentId: this.agentId });
            
            // Iniciar proceso de producción
            this.initiateProduction(orderId);

            console.log(`📋 Orden de producción creada: ${orderData.orderNumber || orderId}`);
            return order;

        } catch (error) {
            console.error('Error creando orden de producción:', error);
            throw error;
        }
    }

    // Gestión de líneas de producción
    async createProductionLine(lineData) {
        try {
            if (this.isPaused) {
                throw new Error('Equipo pausado');
            }

            const lineId = crypto.randomUUID();
            const line = {
                id: lineId,
                ...lineData,
                createdAt: new Date().toISOString(),
                status: 'operational',
                currentUtilization: 0,
                oee: {
                    availability: 100,
                    performance: 100,
                    quality: 100,
                    overall: 100
                },
                activeOrders: 0,
                totalProduced: 0,
                defectsCount: 0,
                uptime: 100,
                lastMaintenance: lineData.lastMaintenance || new Date().toISOString(),
                nextMaintenance: this.calculateNextMaintenance(lineData.lastMaintenance || new Date()),
                operator: null,
                manager: this.specializedAgents.productionManager
            };

            this.state.productionLines.set(lineId, line);
            
            await this.saveProductionLine(line);
            this.emit('production_line_created', { line, agentId: this.agentId });
            
            // Configurar monitoreo de línea
            this.setupLineMonitoring(lineId);

            console.log(`🏭 Línea de producción creada: ${lineData.name || lineId}`);
            return line;

        } catch (error) {
            console.error('Error creando línea de producción:', error);
            throw error;
        }
    }

    // Gestión de inspecciones de calidad
    async createQualityInspection(inspectionData) {
        try {
            if (this.isPaused) {
                throw new Error('Equipo pausado');
            }

            const inspectionId = crypto.randomUUID();
            const inspection = {
                id: inspectionId,
                ...inspectionData,
                createdAt: new Date().toISOString(),
                status: 'scheduled',
                qualityStatus: 'pending',
                inspectionDate: new Date().toISOString(),
                inspector: this.specializedAgents.qualityControlInspector,
                testResults: [],
                defectsFound: 0,
                passFail: null,
                correctiveActions: [],
                reInspectionRequired: false
            };

            this.state.qualityInspections.set(inspectionId, inspection);
            
            await this.saveQualityInspection(inspection);
            this.emit('quality_inspection_created', { inspection, agentId: this.agentId });
            
            // Programar inspección
            this.scheduleInspection(inspectionId);

            console.log(`🔍 Inspección de calidad programada: ${inspectionData.productionOrderId || inspectionId}`);
            return inspection;

        } catch (error) {
            console.error('Error creando inspección de calidad:', error);
            throw error;
        }
    }

    // Optimización de procesos
    async optimizeManufacturingProcess(processData) {
        try {
            if (this.isPaused) {
                throw new Error('Equipo pausado');
            }

            const optimizationId = crypto.randomUUID();
            const optimization = {
                id: optimizationId,
                createdAt: new Date().toISOString(),
                processArea: processData.processArea,
                currentMetrics: processData.currentMetrics,
                targetMetrics: processData.targetMetrics,
                optimization: {
                    efficiency: 0,
                    costReduction: 0,
                    qualityImprovement: 0,
                    timeReduction: 0
                },
                recommendations: [],
                implementation: {
                    status: 'pending',
                    startDate: null,
                    endDate: null,
                    responsible: this.specializedAgents.processEngineer
                }
            };

            // Generar recomendaciones de optimización
            optimization.recommendations = this.generateOptimizationRecommendations(processData);
            
            // Calcular mejoras esperadas
            optimization.optimization = this.calculateExpectedImprovements(processData);

            await this.saveProcessOptimization(optimization);
            this.emit('process_optimization_created', { optimization, agentId: this.agentId });

            console.log(`⚙️ Optimización de proceso creada: ${processData.processArea}`);
            return optimization;

        } catch (error) {
            console.error('Error optimizando proceso de manufactura:', error);
            throw error;
        }
    }

    // Monitoreo de seguridad
    async conductSafetyAssessment(assessmentData) {
        try {
            if (this.isPaused || !this.config.enableSafetyMonitoring) {
                return null;
            }

            const assessmentId = crypto.randomUUID();
            const assessment = {
                id: assessmentId,
                createdAt: new Date().toISOString(),
                assessmentType: assessmentData.type || 'routine',
                area: assessmentData.area,
                riskLevel: 'low',
                safetyScore: 100,
                issuesFound: [],
                complianceStatus: 'compliant',
                correctiveActions: [],
                nextAssessment: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 días
                assessor: this.specializedAgents.safetyCoordinator
            };

            // Realizar evaluación de seguridad
            const safetyEvaluation = this.evaluateSafetyConditions(assessmentData.area);
            assessment.riskLevel = safetyEvaluation.riskLevel;
            assessment.safetyScore = safetyEvaluation.safetyScore;
            assessment.issuesFound = safetyEvaluation.issuesFound;
            assessment.complianceStatus = safetyEvaluation.complianceStatus;

            if (assessment.issuesFound.length > 0) {
                assessment.correctiveActions = this.generateCorrectiveActions(assessment.issuesFound);
            }

            await this.saveSafetyAssessment(assessment);
            this.emit('safety_assessment_completed', { assessment, agentId: this.agentId });

            console.log(`🛡️ Evaluación de seguridad completada: ${assessmentData.area} - Score: ${assessment.safetyScore}`);
            return assessment;

        } catch (error) {
            console.error('Error en evaluación de seguridad:', error);
            throw error;
        }
    }

    // Análisis de OEE (Overall Equipment Effectiveness)
    async analyzeOEE(lineId, timePeriod = 'daily') {
        try {
            if (this.isPaused) {
                return null;
            }

            const line = this.state.productionLines.get(lineId);
            if (!line) {
                throw new Error('Línea de producción no encontrada');
            }

            const analysisId = crypto.randomUUID();
            const analysis = {
                id: analysisId,
                lineId,
                timePeriod,
                createdAt: new Date().toISOString(),
                oeeBreakdown: {
                    availability: 0,
                    performance: 0,
                    quality: 0,
                    overall: 0
                },
                metrics: {
                    plannedProductionTime: 480, // 8 horas en minutos
                    actualProductionTime: 0,
                    idealCycleTime: 0,
                    totalCount: 0,
                    goodCount: 0,
                    defectCount: 0
                },
                trends: {
                    improving: false,
                    declining: false,
                    stable: true
                },
                recommendations: []
            };

            // Calcular métricas OEE
            this.calculateOEEMetrics(analysis, line);

            // Generar recomendaciones
            analysis.recommendations = this.generateOEERecommendations(analysis);

            this.state.oeeMetrics.set(analysisId, analysis);

            await this.saveOEEAnalysis(analysis);
            this.emit('oee_analysis_completed', { analysis, agentId: this.agentId });

            console.log(`📊 Análisis OEE completado: Línea ${lineId} - Overall: ${analysis.oeeBreakdown.overall}%`);
            return analysis;

        } catch (error) {
            console.error('Error en análisis OEE:', error);
            throw error;
        }
    }

    // Métodos de análisis específicos

    generateOptimizationRecommendations(processData) {
        const recommendations = [];
        
        if (processData.cycleTime > 60) { // más de 1 minuto
            recommendations.push({
                type: 'cycle_time_reduction',
                priority: 'high',
                description: 'Reducir tiempo de ciclo mediante automatización',
                potentialSavings: '15-25%'
            });
        }

        if (processData.defectRate > 2) { // más de 2%
            recommendations.push({
                type: 'quality_improvement',
                priority: 'high',
                description: 'Implementar controles de calidad automatizados',
                potentialSavings: '10-20%'
            });
        }

        if (processData.setupTime > 30) { // más de 30 minutos
            recommendations.push({
                type: 'setup_time_reduction',
                priority: 'medium',
                description: 'Optimizar procesos de configuración',
                potentialSavings: '5-15%'
            });
        }

        return recommendations;
    }

    calculateExpectedImprovements(processData) {
        return {
            efficiency: Math.min(20, processData.inefficiency || 10),
            costReduction: Math.min(15, processData.costPerUnit * 0.05),
            qualityImprovement: Math.min(3, processData.defectRate * 0.5),
            timeReduction: Math.min(25, (processData.cycleTime - 45) * 0.3)
        };
    }

    evaluateSafetyConditions(area) {
        // Simular evaluación de seguridad
        const safetyScore = 85 + Math.random() * 15; // 85-100
        const issues = [];
        
        if (safetyScore < 90) {
            issues.push('Equipo de protección personal incompleto');
        }
        
        if (safetyScore < 85) {
            issues.push('Señalización de seguridad insuficiente');
        }
        
        if (safetyScore < 80) {
            issues.push('Procedimientos de emergencia desactualizados');
        }

        return {
            safetyScore: Math.round(safetyScore),
            riskLevel: safetyScore > 90 ? 'low' : safetyScore > 80 ? 'medium' : 'high',
            issuesFound: issues,
            complianceStatus: safetyScore > 85 ? 'compliant' : 'non_compliant'
        };
    }

    generateCorrectiveActions(issues) {
        return issues.map(issue => ({
            issue,
            action: this.getCorrectiveAction(issue),
            priority: this.getActionPriority(issue),
            assignedTo: 'safety_coordinator',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
            status: 'pending'
        }));
    }

    getCorrectiveAction(issue) {
        const actionMap = {
            'Equipo de protección personal incompleto': 'Capacitación y provisión de EPP',
            'Señalización de seguridad insuficiente': 'Actualizar señalización de seguridad',
            'Procedimientos de emergencia desactualizados': 'Revisar y actualizar procedimientos'
        };
        return actionMap[issue] || 'Revisar y corregir la situación';
    }

    getActionPriority(issue) {
        const highPriority = ['Equipo de protección personal incompleto', 'Procedimientos de emergencia desactualizados'];
        return highPriority.includes(issue) ? 'high' : 'medium';
    }

    calculateOEEMetrics(analysis, line) {
        // Simular métricas OEE
        const plannedTime = analysis.metrics.plannedProductionTime;
        const actualTime = plannedTime * (line.currentUtilization / 100);
        const idealCycleTime = 45; // segundos por unidad
        const totalCount = line.totalProduced || 0;
        const defectCount = line.defectsCount || 0;
        const goodCount = totalCount - defectCount;

        analysis.metrics.actualProductionTime = actualTime;
        analysis.metrics.idealCycleTime = idealCycleTime;
        analysis.metrics.totalCount = totalCount;
        analysis.metrics.goodCount = goodCount;
        analysis.metrics.defectCount = defectCount;

        // Calcular OEE
        const availability = actualTime / plannedTime;
        const performance = (totalCount * idealCycleTime) / (actualTime * 60); // convertir a minutos
        const quality = goodCount / totalCount;
        const overall = availability * performance * quality;

        analysis.oeeBreakdown = {
            availability: Math.round(availability * 100),
            performance: Math.round(performance * 100),
            quality: Math.round(quality * 100),
            overall: Math.round(overall * 100)
        };
    }

    generateOEERecommendations(analysis) {
        const recommendations = [];
        const { availability, performance, quality, overall } = analysis.oeeBreakdown;

        if (availability < 85) {
            recommendations.push({
                type: 'availability_improvement',
                description: 'Reducir tiempo de inactividad mediante mantenimiento preventivo',
                impact: 'Alto'
            });
        }

        if (performance < 90) {
            recommendations.push({
                type: 'performance_improvement',
                description: 'Optimizar velocidad de producción y reducir paradas',
                impact: 'Medio'
            });
        }

        if (quality < 95) {
            recommendations.push({
                type: 'quality_improvement',
                description: 'Implementar controles de calidad adicionales',
                impact: 'Alto'
            });
        }

        if (overall < this.config.oeeTarget) {
            recommendations.push({
                type: 'overall_optimization',
                description: `Implementar mejoras integrales para alcanzar OEE del ${this.config.oeeTarget}%`,
                impact: 'Crítico'
            });
        }

        return recommendations;
    }

    // Métodos de optimización

    optimizeManufacturingOperations() {
        try {
            const now = Date.now();
            const optimizationFrequency = 180000; // 3 minutos
            
            if (now - this.state.lastOptimization < optimizationFrequency) {
                return;
            }

            console.log('🔄 Iniciando optimización de operaciones de manufactura...');

            // Optimizar programaciones de producción
            this.optimizeProductionSchedule();
            
            // Optimizar mantenimiento preventivo
            this.optimizeMaintenanceSchedule();
            
            // Balancear carga de trabajo
            this.balanceProductionWorkload();
            
            // Optimizar calidad
            this.optimizeQualityControl();

            this.state.lastOptimization = now;
            this.emit('manufacturing_operations_optimized', { timestamp: new Date().toISOString(), agentId: this.agentId });

        } catch (error) {
            console.error('Error en optimización de manufactura:', error);
        }
    }

    optimizeProductionSchedule() {
        const activeOrders = Array.from(this.state.productionOrders.values())
            .filter(order => order.status === 'in_progress');

        // Priorizar órdenes por urgencia y rentabilidad
        const prioritizedOrders = activeOrders.sort((a, b) => {
            const urgencyA = a.priority === 'urgent' ? 3 : a.priority === 'high' ? 2 : 1;
            const urgencyB = b.priority === 'urgent' ? 3 : b.priority === 'high' ? 2 : 1;
            
            if (urgencyA !== urgencyB) return urgencyB - urgencyA;
            
            // Segundo criterio: fecha de entrega
            return new Date(a.estimatedDelivery) - new Date(b.estimatedDelivery);
        });

        let optimizedCount = 0;
        
        // Reasignar líneas de producción si es necesario
        for (const order of prioritizedOrders) {
            if (order.assignedLine && this.shouldReassignOrder(order)) {
                const newLine = this.findBetterLine(order);
                if (newLine) {
                    this.reassignProductionOrder(order.id, newLine.id);
                    optimizedCount++;
                }
            }
        }
        
        if (optimizedCount > 0) {
            console.log(`📋 ${optimizedCount} órdenes de producción reoptimizadas`);
        }
    }

    optimizeMaintenanceSchedule() {
        const lines = Array.from(this.state.productionLines.values());
        const maintenanceDue = lines.filter(line => {
            const nextMaintenance = new Date(line.nextMaintenance);
            return nextMaintenance <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
        });

        for (const line of maintenanceDue) {
            this.scheduleMaintenance(line.id);
        }
        
        if (maintenanceDue.length > 0) {
            console.log(`🔧 ${maintenanceDue.length} mantenimientos programados`);
        }
    }

    balanceProductionWorkload() {
        const lineWorkloads = {};
        
        // Calcular carga de trabajo por línea
        for (const [lineId, line] of this.state.productionLines) {
            lineWorkloads[lineId] = {
                currentUtilization: line.currentUtilization,
                activeOrders: line.activeOrders,
                oee: line.oee.overall
            };
        }
        
        // Identificar líneas sobrecargadas
        const overloadedLines = Object.entries(lineWorkloads)
            .filter(([_, workload]) => workload.currentUtilization > 90)
            .map(([lineId, _]) => lineId);
        
        if (overloadedLines.length > 0) {
            this.redistributeProductionLoad(overloadedLines);
        }
    }

    optimizeQualityControl() {
        // Analizar patrones de defectos
        const defectPatterns = this.analyzeDefectPatterns();
        
        if (defectPatterns.highDefectProducts.length > 0) {
            console.log(`⚠️ ${defectPatterns.highDefectProducts.length} productos con alta tasa de defectos detectados`);
            
            // Implementar controles adicionales
            for (const productId of defectPatterns.highDefectProducts) {
                this.implementAdditionalQC(productId);
            }
        }
    }

    // Métodos auxiliares de optimización

    shouldReassignOrder(order) {
        const line = this.state.productionLines.get(order.assignedLine);
        return line && line.currentUtilization > 85;
    }

    findBetterLine(order) {
        const availableLines = Array.from(this.state.productionLines.values())
            .filter(line => 
                line.status === 'operational' && 
                line.currentUtilization < 70 &&
                line.id !== order.assignedLine
            );

        return availableLines.sort((a, b) => {
            // Priorizar líneas con mejor OEE
            return b.oee.overall - a.oee.overall;
        })[0];
    }

    reassignProductionOrder(orderId, newLineId) {
        const order = this.state.productionOrders.get(orderId);
        if (!order) return;

        const oldLine = this.state.productionLines.get(order.assignedLine);
        const newLine = this.state.productionLines.get(newLineId);

        if (oldLine) {
            oldLine.activeOrders = Math.max(0, (oldLine.activeOrders || 1) - 1);
            this.state.productionLines.set(order.assignedLine, oldLine);
        }

        order.assignedLine = newLineId;
        newLine.activeOrders = (newLine.activeOrders || 0) + 1;
        
        this.state.productionOrders.set(orderId, order);
        this.state.productionLines.set(newLineId, newLine);
    }

    scheduleMaintenance(lineId) {
        const line = this.state.productionLines.get(lineId);
        if (!line) return;

        const maintenanceSchedule = {
            id: crypto.randomUUID(),
            lineId,
            type: 'preventive',
            scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 días
            estimatedDuration: 4, // horas
            status: 'scheduled',
            tasks: [
                'Lubricación de maquinaria',
                'Calibración de equipos',
                'Inspección de componentes críticos',
                'Actualización de software'
            ],
            responsible: 'maintenance_team'
        };

        this.state.maintenanceSchedules.set(maintenanceSchedule.id, maintenanceSchedule);
        line.status = 'maintenance_scheduled';
        this.state.productionLines.set(lineId, line);

        console.log(`🔧 Mantenimiento programado para línea ${lineId}`);
    }

    analyzeDefectPatterns() {
        const defectData = {};
        
        for (const [orderId, order] of this.state.productionOrders) {
            if (order.qualityStatus === 'failed') {
                const productId = order.productId || 'unknown';
                defectData[productId] = (defectData[productId] || 0) + 1;
            }
        }

        const highDefectProducts = Object.entries(defectData)
            .filter(([_, defectCount]) => defectCount > 3)
            .map(([productId, _]) => productId);

        return { defectData, highDefectProducts };
    }

    implementAdditionalQC(productId) {
        console.log(`🔍 Implementando controles adicionales para producto ${productId}`);
    }

    // Métodos de cálculo

    calculateNextMaintenance(lastMaintenance) {
        const lastDate = new Date(lastMaintenance);
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + 30); // 30 días entre mantenimientos
        return nextDate.toISOString();
    }

    // Métodos de inicialización

    async initiateProduction(orderId) {
        const order = this.state.productionOrders.get(orderId);
        if (!order) return;

        order.status = 'initiated';
        order.actualStartDate = new Date().toISOString();
        order.milestones.push({
            name: 'initiated',
            date: new Date().toISOString(),
            completed: true
        });

        this.state.productionOrders.set(orderId, order);
        this.emit('production_initiated', { orderId, agentId: this.agentId });

        // Simular progreso de producción
        this.simulateProductionProgress(orderId);
    }

    simulateProductionProgress(orderId) {
        const progressInterval = setInterval(() => {
            if (this.isPaused || !this.state.productionOrders.has(orderId)) {
                clearInterval(progressInterval);
                return;
            }

            const order = this.state.productionOrders.get(orderId);
            if (order.status === 'completed') {
                clearInterval(progressInterval);
                return;
            }

            // Simular avance de producción
            const progressIncrease = Math.random() * 10 + 5; // 5-15% por ciclo
            order.progress = Math.min(100, order.progress + progressIncrease);

            if (order.progress >= 100) {
                order.status = 'completed';
                order.actualEndDate = new Date().toISOString();
                order.qualityStatus = 'ready_for_inspection';
                
                // Programar inspección de calidad
                this.createQualityInspection({
                    productionOrderId: orderId,
                    type: 'final',
                    inspector: this.specializedAgents.qualityControlInspector
                });
            }

            this.state.productionOrders.set(orderId, order);
        }, 30000); // Cada 30 segundos
    }

    setupLineMonitoring(lineId) {
        const line = this.state.productionLines.get(lineId);
        if (!line) return;

        // Simular monitoreo en tiempo real
        const monitoringInterval = setInterval(() => {
            if (this.isPaused || !this.state.productionLines.has(lineId)) {
                clearInterval(monitoringInterval);
                return;
            }

            const currentLine = this.state.productionLines.get(lineId);
            if (currentLine.status === 'operational') {
                // Simular variaciones en utilización
                currentLine.currentUtilization = Math.max(0, Math.min(100, 
                    currentLine.currentUtilization + (Math.random() - 0.5) * 10
                ));

                // Simular datos de producción
                if (Math.random() > 0.95) { // 5% probabilidad de defecto
                    currentLine.defectsCount++;
                }

                // Actualizar OEE
                currentLine.oee.overall = Math.max(50, Math.min(100, 
                    currentLine.oee.overall + (Math.random() - 0.5) * 5
                ));

                this.state.productionLines.set(lineId, currentLine);
            }
        }, 60000); // Cada minuto
    }

    scheduleInspection(inspectionId) {
        const inspection = this.state.qualityInspections.get(inspectionId);
        if (!inspection) return;

        // Simular proceso de inspección
        setTimeout(() => {
            if (this.state.qualityInspections.has(inspectionId)) {
                const currentInspection = this.state.qualityInspections.get(inspectionId);
                currentInspection.status = 'in_progress';
                this.state.qualityInspections.set(inspectionId, currentInspection);

                // Completar inspección
                this.completeInspection(inspectionId);
            }
        }, 5000); // 5 segundos después
    }

    completeInspection(inspectionId) {
        const inspection = this.state.qualityInspections.get(inspectionId);
        if (!inspection) return;

        // Simular resultados de inspección
        const pass = Math.random() > 0.1; // 90% de tasa de aprobación
        const defectCount = pass ? 0 : Math.floor(Math.random() * 5) + 1;

        inspection.status = 'completed';
        inspection.qualityStatus = pass ? 'passed' : 'failed';
        inspection.passFail = pass;
        inspection.defectsFound = defectCount;
        inspection.completionDate = new Date().toISOString();

        // Actualizar orden de producción relacionada
        if (inspection.productionOrderId) {
            const order = this.state.productionOrders.get(inspection.productionOrderId);
            if (order) {
                order.qualityStatus = inspection.qualityStatus;
                this.state.productionOrders.set(inspection.productionOrderId, order);
            }
        }

        this.state.qualityInspections.set(inspectionId, inspection);

        console.log(`🔍 Inspección completada: ${inspectionId} - ${pass ? 'APROBADO' : 'RECHAZADO'}`);
    }

    // Métodos de actualización en tiempo real

    updateOEEMetrics() {
        for (const [lineId, line] of this.state.productionLines) {
            if (line.status === 'operational') {
                this.analyzeOEE(lineId, 'real_time');
            }
        }
    }

    conductQualityChecks() {
        // Realizar verificaciones de calidad en procesos activos
        const activeOrders = Array.from(this.state.productionOrders.values())
            .filter(order => order.status === 'in_progress' && order.progress > 50);

        for (const order of activeOrders) {
            if (Math.random() > 0.9) { // 10% probabilidad de verificación
                this.createQualityInspection({
                    productionOrderId: order.id,
                    type: 'in_process',
                    inspector: this.specializedAgents.qualityControlInspector
                });
            }
        }
    }

    monitorSafetyConditions() {
        // Monitorear condiciones de seguridad
        const areas = ['assembly', 'finishing', 'packaging', 'quality_lab'];
        
        for (const area of areas) {
            if (Math.random() > 0.95) { // 5% probabilidad de incidente
                this.handleSafetyIncident({
                    area,
                    incidentType: this.getRandomIncidentType(),
                    severity: this.getRandomSeverity(),
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    getRandomIncidentType() {
        const types = ['near_miss', 'equipment_malfunction', 'safety_violation', 'environmental_concern'];
        return types[Math.floor(Math.random() * types.length)];
    }

    getRandomSeverity() {
        const severities = ['low', 'medium', 'high'];
        return severities[Math.floor(Math.random() * severities.length)];
    }

    // Métodos de manejo de eventos

    async handleProductionOrderRequest(data) {
        if (this.isPaused) return;
        
        try {
            await this.createProductionOrder(data.orderData);
            this.emit('production_order_request_processed', { agentId: this.agentId });
        } catch (error) {
            console.error('Error procesando solicitud de orden de producción:', error);
        }
    }

    async handleQualityIssue(data) {
        if (this.isPaused) return;
        
        try {
            await this.createQualityInspection(data.inspectionData);
        } catch (error) {
            console.error('Error procesando problema de calidad:', error);
        }
    }

    async handleEquipmentFailure(data) {
        if (this.isPaused) return;
        
        try {
            const line = this.state.productionLines.get(data.lineId);
            if (line) {
                line.status = 'down';
                this.state.productionLines.set(data.lineId, line);
                
                // Programar mantenimiento de emergencia
                this.scheduleEmergencyMaintenance(data.lineId);
            }
        } catch (error) {
            console.error('Error procesando falla de equipo:', error);
        }
    }

    async handleSafetyIncident(data) {
        if (this.isPaused) return;
        
        try {
            const incidentId = crypto.randomUUID();
            const incident = {
                id: incidentId,
                ...data,
                createdAt: new Date().toISOString(),
                status: 'reported',
                investigation: null,
                correctiveActions: [],
                coordinator: this.specializedAgents.safetyCoordinator
            };

            this.state.safetyIncidents.set(incidentId, incident);
            this.state.performanceMetrics.safetyIncidents++;

            await this.saveSafetyIncident(incident);
            this.emit('safety_incident_reported', { incident, agentId: this.agentId });

            console.log(`🚨 Incidente de seguridad reportado: ${data.incidentType} en ${data.area}`);
        } catch (error) {
            console.error('Error procesando incidente de seguridad:', error);
        }
    }

    async handleMaintenanceDue(data) {
        if (this.isPaused) return;
        
        try {
            await this.scheduleMaintenance(data.lineId);
        } catch (error) {
            console.error('Error procesando mantenimiento programado:', error);
        }
    }

    scheduleEmergencyMaintenance(lineId) {
        const maintenanceSchedule = {
            id: crypto.randomUUID(),
            lineId,
            type: 'emergency',
            scheduledDate: new Date().toISOString(), // Inmediato
            estimatedDuration: 8, // horas
            status: 'scheduled',
            priority: 'high',
            reason: 'Falla de equipo crítica',
            tasks: [
                'Diagnóstico completo de falla',
                'Reparación de componentes dañados',
                'Pruebas de funcionamiento',
                'Reajuste y calibración'
            ],
            responsible: 'emergency_maintenance_team'
        };

        this.state.maintenanceSchedules.set(maintenanceSchedule.id, maintenanceSchedule);
        console.log(`🚨 Mantenimiento de emergencia programado para línea ${lineId}`);
    }

    // Métodos de carga y guardado

    async saveProductionOrder(order) {
        try {
            const filePath = path.join(this.productionDir, `order_${order.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(order, null, 2));
        } catch (error) {
            console.error('Error guardando orden de producción:', error);
        }
    }

    async saveProductionLine(line) {
        try {
            const filePath = path.join(this.productionDir, `line_${line.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(line, null, 2));
        } catch (error) {
            console.error('Error guardando línea de producción:', error);
        }
    }

    async saveQualityInspection(inspection) {
        try {
            const filePath = path.join(this.qualityDir, `inspection_${inspection.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(inspection, null, 2));
        } catch (error) {
            console.error('Error guardando inspección de calidad:', error);
        }
    }

    async saveProcessOptimization(optimization) {
        try {
            const filePath = path.join(this.productionDir, `optimization_${optimization.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(optimization, null, 2));
        } catch (error) {
            console.error('Error guardando optimización de proceso:', error);
        }
    }

    async saveSafetyAssessment(assessment) {
        try {
            const filePath = path.join(this.dataDir, `safety_assessment_${assessment.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(assessment, null, 2));
        } catch (error) {
            console.error('Error guardando evaluación de seguridad:', error);
        }
    }

    async saveOEEAnalysis(analysis) {
        try {
            const filePath = path.join(this.dataDir, `oee_analysis_${analysis.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(analysis, null, 2));
        } catch (error) {
            console.error('Error guardando análisis OEE:', error);
        }
    }

    async saveSafetyIncident(incident) {
        try {
            const filePath = path.join(this.dataDir, `safety_incident_${incident.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(incident, null, 2));
        } catch (error) {
            console.error('Error guardando incidente de seguridad:', error);
        }
    }

    // Cargar y guardar estado
    async loadState() {
        try {
            // Cargar órdenes de producción
            const orderFiles = await fs.readdir(this.productionDir).catch(() => []);
            for (const file of orderFiles) {
                if (file.startsWith('order_') && file.endsWith('.json')) {
                    const data = await fs.readFile(path.join(this.productionDir, file), 'utf8');
                    const order = JSON.parse(data);
                    this.state.productionOrders.set(order.id, order);
                }
            }
            
            console.log(`📂 Estado de manufactura cargado: ${this.state.productionOrders.size} órdenes, ${this.state.productionLines.size} líneas`);
        } catch (error) {
            console.error('Error cargando estado de manufactura:', error);
        }
    }

    // Control de pausa/reanudación
    pause() {
        this.isPaused = true;
        console.log(`⏸️ ManufacturingTeam ${this.agentId} pausado`);
        this.emit('agent_paused', { agentId: this.agentId });
    }

    resume() {
        this.isPaused = false;
        console.log(`▶️ ManufacturingTeam ${this.agentId} reanudado`);
        this.emit('agent_resumed', { agentId: this.agentId });
    }

    // Limpiar recursos
    destroy() {
        if (this.optimizationInterval) clearInterval(this.optimizationInterval);
        if (this.oeeMonitorInterval) clearInterval(this.oeeMonitorInterval);
        if (this.qualityCheckInterval) clearInterval(this.qualityCheckInterval);
        if (this.safetyMonitorInterval) clearInterval(this.safetyMonitorInterval);
        
        console.log(`🗑️ ManufacturingTeam ${this.agentId} destruido`);
        this.removeAllListeners();
    }
}

module.exports = ManufacturingTeam;