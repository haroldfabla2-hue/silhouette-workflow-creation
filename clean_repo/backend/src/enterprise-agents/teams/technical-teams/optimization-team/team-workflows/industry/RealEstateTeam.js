/**
 * REAL ESTATE TEAM - GESTIÓN INMOBILIARIA
 * Equipo especializado en gestión inmobiliaria, listados, transacciones y análisis de mercado
 * 
 * Agentes Especializados:
 * - Property Managers: Gestión de propiedades y relaciones con propietarios
 * - Listing Specialists: Gestión de listados y marketing inmobiliario
 * - Transaction Coordinators: Coordinación de procesos de compra/venta/alquiler
 * - Market Analysts: Análisis de mercado inmobiliario y valuaciones
 * - Client Relations Specialists: Relaciones con clientes y seguimiento de oportunidades
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class RealEstateTeam extends EventEmitter {
    constructor(agentId, config = {}, eventBus = null) {
        super();
        this.agentId = agentId || `real-estate-${Date.now()}`;
        this.agentType = 'RealEstateTeam';
        this.config = {
            maxListings: 1000,
            maxProperties: 500,
            maxTransactions: 200,
            enableMLPredictions: true,
            enableMarketAnalysis: true,
            enableClientMatching: true,
            marketUpdateInterval: 300000, // 5 minutes
            ...config
        };
        this.eventBus = eventBus;
        this.isPaused = false;
        
        // Estado del equipo
        this.state = {
            listings: new Map(),
            properties: new Map(),
            transactions: new Map(),
            clients: new Map(),
            marketData: new Map(),
            propertyTypes: new Set(),
            marketTrends: new Map(),
            agentActivity: new Map(),
            lastOptimization: Date.now(),
            performanceMetrics: {
                listingsProcessed: 0,
                transactionsCompleted: 0,
                clientsServed: 0,
                marketAnalyses: 0,
                avgTransactionTime: 0,
                clientSatisfaction: 0
            }
        };

        // Inicializar directorios de datos
        this.dataDir = path.join(__dirname, '..', '..', 'data', 'real-estate');
        this.logsDir = path.join(__dirname, '..', '..', 'logs', 'real-estate');
        this.initDirectories();
        
        // Definir agentes especializados
        this.specializedAgents = {
            propertyManager: {
                name: 'Property Manager',
                capabilities: [
                    'property_management',
                    'owner_relations',
                    'maintenance_coordination',
                    'rent_collection',
                    'tenant_screening'
                ],
                active: true,
                lastActivity: Date.now()
            },
            listingSpecialist: {
                name: 'Listing Specialist',
                capabilities: [
                    'listing_creation',
                    'property_marketing',
                    'photo_management',
                    'virtual_tours',
                    'online_promotion'
                ],
                active: true,
                lastActivity: Date.now()
            },
            transactionCoordinator: {
                name: 'Transaction Coordinator',
                capabilities: [
                    'transaction_management',
                    'document_processing',
                    'closing_coordination',
                    'legal_compliance',
                    'funds_verification'
                ],
                active: true,
                lastActivity: Date.now()
            },
            marketAnalyst: {
                name: 'Market Analyst',
                capabilities: [
                    'market_research',
                    'property_valuation',
                    'trend_analysis',
                    'competitive_analysis',
                    'price_optimization'
                ],
                active: true,
                lastActivity: Date.now()
            },
            clientRelations: {
                name: 'Client Relations Specialist',
                capabilities: [
                    'client_acquisition',
                    'lead_qualification',
                    'relationship_management',
                    'follow_up_coordination',
                    'satisfaction_monitoring'
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

        console.log(`🏠 RealEstateTeam ${this.agentId} inicializado con ${Object.keys(this.specializedAgents).length} agentes especializados`);
    }

    // Inicializar directorios necesarios
    async initDirectories() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            await fs.mkdir(this.logsDir, { recursive: true });
        } catch (error) {
            console.error('Error creando directorios:', error);
        }
    }

    // Conectar con el bus de eventos
    connectEventBus() {
        if (this.eventBus) {
            this.eventBus.on('market_data_updated', this.handleMarketUpdate.bind(this));
            this.eventBus.on('new_listing_request', this.handleNewListingRequest.bind(this));
            this.eventBus.on('transaction_status_change', this.handleTransactionStatusChange.bind(this));
            this.eventBus.on('client_interest_match', this.handleClientInterestMatch.bind(this));
        }
    }

    // Configurar intervals de optimización
    setupIntervals() {
        this.optimizationInterval = setInterval(() => {
            if (!this.isPaused) {
                this.optimizeOperations();
            }
        }, 300000); // 5 minutos

        this.marketUpdateInterval = setInterval(() => {
            if (!this.isPaused && this.config.enableMarketAnalysis) {
                this.updateMarketData();
            }
        }, this.config.marketUpdateInterval);

        this.monitoringInterval = setInterval(() => {
            if (!this.isPaused) {
                this.monitorPerformance();
            }
        }, 60000); // 1 minuto
    }

    // Métodos principales del equipo

    // Gestión de propiedades
    async createProperty(propertyData) {
        try {
            if (this.isPaused) {
                throw new Error('Equipo pausado');
            }

            const propertyId = crypto.randomUUID();
            const property = {
                id: propertyId,
                ...propertyData,
                createdAt: new Date().toISOString(),
                status: 'active',
                listingStatus: 'not_listed',
                views: 0,
                inquiries: 0,
                agent: this.specializedAgents.propertyManager
            };

            this.state.properties.set(propertyId, property);
            this.state.propertyTypes.add(propertyData.type || 'unknown');
            
            await this.saveProperty(property);
            this.emit('property_created', { property, agentId: this.agentId });
            
            // Trigger automático de análisis de mercado
            if (this.config.enableMarketAnalysis) {
                setTimeout(() => this.analyzePropertyMarket(propertyId), 100);
            }

            console.log(`🏠 Propiedad creada: ${propertyData.address || propertyId}`);
            return property;

        } catch (error) {
            console.error('Error creando propiedad:', error);
            throw error;
        }
    }

    // Gestión de listados
    async createListing(listingData) {
        try {
            if (this.isPaused) {
                throw new Error('Equipo pausado');
            }

            const listingId = crypto.randomUUID();
            const listing = {
                id: listingId,
                ...listingData,
                createdAt: new Date().toISOString(),
                status: 'active',
                views: 0,
                inquiries: 0,
                favorites: 0,
                daysOnMarket: 0,
                agent: this.specializedAgents.listingSpecialist,
                virtualTour: null,
                photos: [],
                virtualTours: []
            };

            // Verificar si la propiedad existe
            if (listingData.propertyId && this.state.properties.has(listingData.propertyId)) {
                const property = this.state.properties.get(listingData.propertyId);
                property.listingStatus = 'listed';
                property.listingId = listingId;
            }

            this.state.listings.set(listingId, listing);
            
            await this.saveListing(listing);
            this.emit('listing_created', { listing, agentId: this.agentId });
            
            // Optimizar el listing para marketing
            this.optimizeListing(listingId);

            console.log(`📋 Listado creado: ${listingData.title || listingId}`);
            return listing;

        } catch (error) {
            console.error('Error creando listado:', error);
            throw error;
        }
    }

    // Gestión de transacciones
    async createTransaction(transactionData) {
        try {
            if (this.isPaused) {
                throw new Error('Equipo pausado');
            }

            const transactionId = crypto.randomUUID();
            const transaction = {
                id: transactionId,
                ...transactionData,
                createdAt: new Date().toISOString(),
                status: 'initiated',
                milestones: [
                    { name: 'initiated', date: new Date().toISOString(), completed: true }
                ],
                documents: [],
                agent: this.specializedAgents.transactionCoordinator,
                timeline: []
            };

            this.state.transactions.set(transactionId, transaction);
            
            await this.saveTransaction(transaction);
            this.emit('transaction_created', { transaction, agentId: this.agentId });
            
            // Iniciar proceso de coordinación
            this.coordinateTransaction(transactionId);

            console.log(`🤝 Transacción iniciada: ${transactionData.type || transactionId}`);
            return transaction;

        } catch (error) {
            console.error('Error creando transacción:', error);
            throw error;
        }
    }

    // Análisis de mercado
    async analyzeMarket() {
        try {
            if (this.isPaused || !this.config.enableMarketAnalysis) {
                return null;
            }

            const marketAnalysis = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                analysisType: 'comprehensive',
                dataPoints: this.state.listings.size,
                propertyCount: this.state.properties.size,
                transactionCount: this.state.transactions.size,
                insights: []
            };

            // Análisis de precios por tipo de propiedad
            const priceAnalysis = this.analyzePricesByType();
            marketAnalysis.insights.push({
                type: 'price_analysis',
                data: priceAnalysis,
                recommendation: priceAnalysis.recommendation
            });

            // Análisis de tendencias de mercado
            const trendAnalysis = this.analyzeMarketTrends();
            marketAnalysis.insights.push({
                type: 'trend_analysis',
                data: trendAnalysis,
                insight: trendAnalysis.insight
            });

            // Análisis de tiempo en el mercado
            const timeAnalysis = this.analyzeTimeOnMarket();
            marketAnalysis.insights.push({
                type: 'time_analysis',
                data: timeAnalysis,
                recommendation: timeAnalysis.recommendation
            });

            // Análisis de demanda vs oferta
            const demandAnalysis = this.analyzeDemandSupply();
            marketAnalysis.insights.push({
                type: 'demand_supply',
                data: demandAnalysis,
                finding: demandAnalysis.finding
            });

            this.state.marketData.set(marketAnalysis.id, marketAnalysis);
            this.state.performanceMetrics.marketAnalyses++;

            await this.saveMarketAnalysis(marketAnalysis);
            this.emit('market_analysis_completed', { analysis: marketAnalysis, agentId: this.agentId });

            console.log(`📊 Análisis de mercado completado: ${marketAnalysis.id}`);
            return marketAnalysis;

        } catch (error) {
            console.error('Error en análisis de mercado:', error);
            throw error;
        }
    }

    // Coincidencia de clientes con propiedades
    async matchClients() {
        try {
            if (this.isPaused || !this.config.enableClientMatching) {
                return [];
            }

            const matches = [];
            
            for (const [clientId, client] of this.state.clients) {
                if (!client.searchCriteria) continue;

                const compatibleListings = this.findCompatibleListings(client.searchCriteria);
                
                if (compatibleListings.length > 0) {
                    const match = {
                        clientId,
                        client: client,
                        compatibleListings: compatibleListings.slice(0, 5), // Top 5 matches
                        matchScore: this.calculateMatchScore(client, compatibleListings),
                        matchedAt: new Date().toISOString(),
                        agent: this.specializedAgents.clientRelations
                    };

                    matches.push(match);
                    this.emit('client_match_found', { match, agentId: this.agentId });

                    // Notificar al cliente
                    await this.notifyClientMatch(clientId, match);
                }
            }

            console.log(`🎯 ${matches.length} coincidencias de clientes encontradas`);
            return matches;

        } catch (error) {
            console.error('Error en coincidencia de clientes:', error);
            throw error;
        }
    }

    // Métodos de análisis específicos

    analyzePricesByType() {
        const priceData = {};
        
        for (const [listingId, listing] of this.state.listings) {
            const type = listing.propertyType || 'other';
            if (!priceData[type]) {
                priceData[type] = {
                    count: 0,
                    totalValue: 0,
                    values: []
                };
            }
            
            priceData[type].count++;
            priceData[type].totalValue += listing.price || 0;
            priceData[type].values.push(listing.price || 0);
        }

        // Calcular promedios y recomendaciones
        for (const type in priceData) {
            const data = priceData[type];
            data.averagePrice = data.count > 0 ? data.totalValue / data.count : 0;
            data.medianPrice = data.values.length > 0 ? 
                data.values.sort((a, b) => a - b)[Math.floor(data.values.length / 2)] : 0;
        }

        return {
            priceData,
            highestAverage: Object.keys(priceData).reduce((max, type) => 
                priceData[max]?.averagePrice > priceData[type]?.averagePrice ? max : type, ''),
            lowestAverage: Object.keys(priceData).reduce((min, type) => 
                priceData[min]?.averagePrice < priceData[type]?.averagePrice ? min : type, ''),
            recommendation: 'Considerar ajustar precios según análisis de tipo de propiedad'
        };
    }

    analyzeMarketTrends() {
        const recentListings = [];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        for (const [listingId, listing] of this.state.listings) {
            const createdDate = new Date(listing.createdAt);
            if (createdDate >= thirtyDaysAgo) {
                recentListings.push(listing);
            }
        }

        const avgDaysOnMarket = recentListings.length > 0 ?
            recentListings.reduce((sum, listing) => sum + (listing.daysOnMarket || 0), 0) / recentListings.length : 0;

        const avgPrice = recentListings.length > 0 ?
            recentListings.reduce((sum, listing) => sum + (listing.price || 0), 0) / recentListings.length : 0;

        return {
            totalRecentListings: recentListings.length,
            avgDaysOnMarket: Math.round(avgDaysOnMarket),
            avgPrice: Math.round(avgPrice),
            marketActivity: recentListings.length > 10 ? 'high' : recentListings.length > 5 ? 'medium' : 'low',
            insight: avgDaysOnMarket > 30 ? 
                'Mercado lento, considerar estrategias de marketing adicionales' : 
                'Mercado activo, mantener precios competitivos'
        };
    }

    analyzeTimeOnMarket() {
        const timeData = {
            quick: 0,    // < 7 días
            fast: 0,     // 7-14 días
            normal: 0,   // 15-30 días
            slow: 0,     // 31-60 días
            verySlow: 0  // > 60 días
        };

        for (const [listingId, listing] of this.state.listings) {
            const daysOnMarket = listing.daysOnMarket || 0;
            
            if (daysOnMarket < 7) timeData.quick++;
            else if (daysOnMarket < 15) timeData.fast++;
            else if (daysOnMarket < 31) timeData.normal++;
            else if (daysOnMarket < 61) timeData.slow++;
            else timeData.verySlow++;
        }

        const total = Object.values(timeData).reduce((sum, count) => sum + count, 0);
        const averageDays = total > 0 ? 
            (timeData.quick * 4 + timeData.fast * 10 + timeData.normal * 22 + 
             timeData.slow * 45 + timeData.verySlow * 75) / total : 0;

        return {
            timeData,
            total,
            averageDays: Math.round(averageDays),
            recommendation: averageDays > 30 ? 
                'Considerar estrategias de marketing para reducir tiempo en mercado' : 
                'Tiempo de mercado óptimo, mantener estrategias actuales'
        };
    }

    analyzeDemandSupply() {
        const activeListings = this.state.listings.size;
        const activeBuyers = Array.from(this.state.clients.values())
            .filter(client => client.type === 'buyer' && client.status === 'active').length;
        
        const demandSupplyRatio = activeBuyers > 0 ? activeListings / activeBuyers : 0;
        
        let marketCondition = 'balanced';
        if (demandSupplyRatio > 3) marketCondition = 'buyer_market';
        else if (demandSupplyRatio < 1) marketCondition = 'seller_market';

        return {
            activeListings,
            activeBuyers,
            demandSupplyRatio: Math.round(demandSupplyRatio * 100) / 100,
            marketCondition,
            finding: `Mercado ${marketCondition} con ratio de ${Math.round(demandSupplyRatio * 100) / 100}:1`
        };
    }

    // Métodos de optimización

    optimizeListing(listingId) {
        const listing = this.state.listings.get(listingId);
        if (!listing) return;

        const optimizations = [];
        
        // Optimización de precio
        if (listing.price) {
            const marketAvg = this.getMarketAveragePrice(listing.propertyType);
            const priceDifference = Math.abs((listing.price - marketAvg) / marketAvg * 100);
            
            if (priceDifference > 15) {
                optimizations.push({
                    type: 'price_adjustment',
                    current: listing.price,
                    recommended: Math.round(marketAvg),
                    reason: 'Precio significativamente diferente al promedio de mercado'
                });
            }
        }

        // Optimización de descripción
        if (!listing.description || listing.description.length < 100) {
            optimizations.push({
                type: 'description_enhancement',
                reason: 'Descripción insuficiente para marketing efectivo',
                recommendation: 'Expandir descripción con características y beneficios'
            });
        }

        // Optimización de fotos
        if (!listing.photos || listing.photos.length < 5) {
            optimizations.push({
                type: 'photo_optimization',
                reason: 'Pocas fotos para mostrar la propiedad efectivamente',
                recommendation: 'Agregar más fotos de alta calidad'
            });
        }

        listing.optimizations = optimizations;
        this.state.listings.set(listingId, listing);

        if (optimizations.length > 0) {
            this.emit('listing_optimized', { listingId, optimizations, agentId: this.agentId });
        }
    }

    optimizeOperations() {
        try {
            const now = Date.now();
            const optimizationFrequency = 300000; // 5 minutos
            
            if (now - this.state.lastOptimization < optimizationFrequency) {
                return;
            }

            console.log('🔄 Iniciando optimización de operaciones inmobiliarias...');

            // Limpiar datos obsoletos
            this.cleanupOldData();
            
            // Optimizar listados inactivos
            this.optimizeInactiveListings();
            
            // Balancear carga de trabajo entre agentes
            this.balanceAgentWorkload();
            
            // Actualizar métricas de rendimiento
            this.updatePerformanceMetrics();

            this.state.lastOptimization = now;
            this.emit('operations_optimized', { timestamp: new Date().toISOString(), agentId: this.agentId });

        } catch (error) {
            console.error('Error en optimización:', error);
        }
    }

    cleanupOldData() {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

        // Limpiar transacciones muy antiguas
        for (const [transactionId, transaction] of this.state.transactions) {
            if (new Date(transaction.createdAt).getTime() < ninetyDaysAgo && 
                ['completed', 'cancelled'].includes(transaction.status)) {
                this.state.transactions.delete(transactionId);
            }
        }

        // Limpiar datos de mercado antiguos
        for (const [analysisId, analysis] of this.state.marketData) {
            if (new Date(analysis.timestamp).getTime() < thirtyDaysAgo) {
                this.state.marketData.delete(analysisId);
            }
        }
    }

    optimizeInactiveListings() {
        let optimizedCount = 0;
        
        for (const [listingId, listing] of this.state.listings) {
            const daysOnMarket = listing.daysOnMarket || 0;
            
            if (daysOnMarket > 30 && listing.inquiries === 0) {
                // Listado inactivo, aplicar estrategias de re-activación
                listing.reactivationStrategy = {
                    priceAdjustment: true,
                    descriptionUpdate: true,
                    newPhotos: true,
                    marketingBoost: true
                };
                
                this.state.listings.set(listingId, listing);
                optimizedCount++;
            }
        }
        
        if (optimizedCount > 0) {
            console.log(`📈 ${optimizedCount} listados optimizados para re-activación`);
        }
    }

    balanceAgentWorkload() {
        const workload = {};
        
        for (const agentType in this.specializedAgents) {
            workload[agentType] = 0;
        }

        // Contar tareas por agente
        for (const [listingId, listing] of this.state.listings) {
            if (listing.agent) {
                const agentType = this.getAgentTypeFromName(listing.agent.name);
                if (agentType) workload[agentType]++;
            }
        }

        // Rebalancear si es necesario
        const maxWorkload = Math.max(...Object.values(workload));
        const minWorkload = Math.min(...Object.values(workload));
        
        if (maxWorkload - minWorkload > 5) {
            this.rebalanceAgentTasks(workload);
        }
    }

    getAgentTypeFromName(name) {
        const agentMap = {
            'Property Manager': 'propertyManager',
            'Listing Specialist': 'listingSpecialist',
            'Transaction Coordinator': 'transactionCoordinator',
            'Market Analyst': 'marketAnalyst',
            'Client Relations Specialist': 'clientRelations'
        };
        return agentMap[name];
    }

    rebalanceAgentTasks(workload) {
        // Redistribuir tareas de agentes sobrecargados
        const overloadedAgents = Object.entries(workload)
            .filter(([_, load]) => load > 10)
            .map(([agentType, _]) => agentType);
        
        for (const agentType of overloadedAgents) {
            const tasks = this.getTasksForAgent(agentType);
            const toRedistribute = tasks.slice(0, Math.floor(tasks.length * 0.2));
            
            for (const task of toRedistribute) {
                const targetAgent = this.findAgentWithLowestWorkload();
                this.reassignTask(task, agentType, targetAgent);
            }
        }
    }

    getTasksForAgent(agentType) {
        const tasks = [];
        
        for (const [listingId, listing] of this.state.listings) {
            if (this.getAgentTypeFromName(listing.agent?.name) === agentType) {
                tasks.push({ type: 'listing', id: listingId, listing });
            }
        }
        
        return tasks;
    }

    findAgentWithLowestWorkload() {
        let lowestWorkload = Infinity;
        let targetAgent = 'clientRelations';
        
        for (const [agentType, agent] of Object.entries(this.specializedAgents)) {
            const currentWorkload = this.getCurrentWorkload(agentType);
            if (currentWorkload < lowestWorkload) {
                lowestWorkload = currentWorkload;
                targetAgent = agentType;
            }
        }
        
        return targetAgent;
    }

    getCurrentWorkload(agentType) {
        let workload = 0;
        
        for (const [listingId, listing] of this.state.listings) {
            if (this.getAgentTypeFromName(listing.agent?.name) === agentType) {
                workload++;
            }
        }
        
        return workload;
    }

    // Métodos auxiliares

    async saveProperty(property) {
        try {
            const filePath = path.join(this.dataDir, `property_${property.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(property, null, 2));
        } catch (error) {
            console.error('Error guardando propiedad:', error);
        }
    }

    async saveListing(listing) {
        try {
            const filePath = path.join(this.dataDir, `listing_${listing.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(listing, null, 2));
        } catch (error) {
            console.error('Error guardando listado:', error);
        }
    }

    async saveTransaction(transaction) {
        try {
            const filePath = path.join(this.dataDir, `transaction_${transaction.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(transaction, null, 2));
        } catch (error) {
            console.error('Error guardando transacción:', error);
        }
    }

    async saveMarketAnalysis(analysis) {
        try {
            const filePath = path.join(this.dataDir, `market_analysis_${analysis.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(analysis, null, 2));
        } catch (error) {
            console.error('Error guardando análisis de mercado:', error);
        }
    }

    getMarketAveragePrice(propertyType) {
        let totalPrice = 0;
        let count = 0;
        
        for (const [listingId, listing] of this.state.listings) {
            if (listing.propertyType === propertyType && listing.price) {
                totalPrice += listing.price;
                count++;
            }
        }
        
        return count > 0 ? totalPrice / count : 0;
    }

    findCompatibleListings(criteria) {
        const compatible = [];
        
        for (const [listingId, listing] of this.state.listings) {
            let isCompatible = true;
            
            if (criteria.propertyType && listing.propertyType !== criteria.propertyType) {
                isCompatible = false;
            }
            
            if (criteria.minPrice && listing.price && listing.price < criteria.minPrice) {
                isCompatible = false;
            }
            
            if (criteria.maxPrice && listing.price && listing.price > criteria.maxPrice) {
                isCompatible = false;
            }
            
            if (criteria.location && !listing.location?.toLowerCase().includes(criteria.location.toLowerCase())) {
                isCompatible = false;
            }
            
            if (isCompatible) {
                compatible.push(listing);
            }
        }
        
        return compatible.sort((a, b) => b.score - a.score);
    }

    calculateMatchScore(client, listings) {
        return listings.length > 0 ? Math.min(95, 60 + (listings.length * 7)) : 0;
    }

    async notifyClientMatch(clientId, match) {
        // Simular notificación al cliente
        console.log(`📧 Notificación enviada a cliente ${clientId}: ${match.compatibleListings.length} propiedades coincidieron`);
    }

    // Métodos de manejo de eventos

    async handleMarketUpdate(data) {
        if (this.isPaused) return;
        
        try {
            await this.analyzeMarket();
            this.emit('market_data_processed', { agentId: this.agentId });
        } catch (error) {
            console.error('Error procesando actualización de mercado:', error);
        }
    }

    async handleNewListingRequest(data) {
        if (this.isPaused) return;
        
        try {
            const listing = await this.createListing(data.listingData);
            this.emit('listing_request_processed', { listing, agentId: this.agentId });
        } catch (error) {
            console.error('Error procesando solicitud de listado:', error);
        }
    }

    async handleTransactionStatusChange(data) {
        if (this.isPaused) return;
        
        try {
            const transaction = this.state.transactions.get(data.transactionId);
            if (transaction) {
                transaction.status = data.newStatus;
                transaction.timeline.push({
                    status: data.newStatus,
                    timestamp: new Date().toISOString(),
                    note: data.note || 'Estado actualizado'
                });
                
                this.state.transactions.set(data.transactionId, transaction);
            }
        } catch (error) {
            console.error('Error procesando cambio de estado de transacción:', error);
        }
    }

    async handleClientInterestMatch(data) {
        if (this.isPaused) return;
        
        try {
            await this.matchClients();
        } catch (error) {
            console.error('Error procesando coincidencia de interés de cliente:', error);
        }
    }

    // Métodos de monitoreo y mantenimiento

    monitorPerformance() {
        try {
            const currentMetrics = this.getCurrentMetrics();
            
            // Verificar si hay alertas de rendimiento
            this.checkPerformanceAlerts(currentMetrics);
            
            // Actualizar métricas de agentes
            this.updateAgentMetrics();
            
        } catch (error) {
            console.error('Error en monitoreo de rendimiento:', error);
        }
    }

    getCurrentMetrics() {
        return {
            totalListings: this.state.listings.size,
            activeListings: Array.from(this.state.listings.values())
                .filter(l => l.status === 'active').length,
            totalProperties: this.state.properties.size,
            totalTransactions: this.state.transactions.size,
            activeTransactions: Array.from(this.state.transactions.values())
                .filter(t => t.status !== 'completed' && t.status !== 'cancelled').length,
            totalClients: this.state.clients.size,
            marketAnalysesCompleted: this.state.marketData.size,
            systemEfficiency: this.calculateSystemEfficiency()
        };
    }

    calculateSystemEfficiency() {
        const activeAgents = Object.values(this.specializedAgents)
            .filter(agent => agent.active).length;
        const totalAgents = Object.keys(this.specializedAgents).length;
        
        const agentEfficiency = activeAgents / totalAgents * 100;
        const dataEfficiency = Math.min(100, (this.state.listings.size / this.config.maxListings) * 100);
        
        return Math.round((agentEfficiency + dataEfficiency) / 2);
    }

    checkPerformanceAlerts(metrics) {
        const alerts = [];
        
        if (metrics.activeListings === 0) {
            alerts.push({
                type: 'no_active_listings',
                message: 'No hay listados activos',
                severity: 'medium'
            });
        }
        
        if (metrics.systemEfficiency < 70) {
            alerts.push({
                type: 'low_efficiency',
                message: `Eficiencia del sistema baja: ${metrics.systemEfficiency}%`,
                severity: 'high'
            });
        }
        
        if (alerts.length > 0) {
            this.emit('performance_alerts', { alerts, metrics, agentId: this.agentId });
        }
    }

    updateAgentMetrics() {
        for (const [agentType, agent] of Object.entries(this.specializedAgents)) {
            agent.lastActivity = Date.now();
            agent.workload = this.getCurrentWorkload(agentType);
        }
    }

    updatePerformanceMetrics() {
        const now = Date.now();
        const timeDiff = (now - (this.state.lastOptimization || now)) / 1000 / 60; // minutos
        
        if (timeDiff > 0) {
            // Calcular métricas de rendimiento en el período
            const listingsRate = this.state.listings.size / timeDiff;
            const transactionsRate = this.state.transactions.size / timeDiff;
            
            this.state.performanceMetrics.avgTransactionTime = 
                (this.state.performanceMetrics.avgTransactionTime + (timeDiff * 0.8)) / 2;
        }
    }

    updateMarketData() {
        if (this.isPaused || !this.config.enableMarketAnalysis) return;
        
        try {
            this.analyzeMarket();
        } catch (error) {
            console.error('Error actualizando datos de mercado:', error);
        }
    }

    coordinateTransaction(transactionId) {
        const transaction = this.state.transactions.get(transactionId);
        if (!transaction) return;
        
        // Simular coordinación de transacción
        const milestones = [
            { name: 'document_review', delay: 1000 },
            { name: 'financing_verification', delay: 2000 },
            { name: 'inspection_scheduled', delay: 3000 },
            { name: 'closing_preparation', delay: 4000 }
        ];
        
        milestones.forEach((milestone, index) => {
            setTimeout(() => {
                if (this.state.transactions.has(transactionId)) {
                    const currentTransaction = this.state.transactions.get(transactionId);
                    currentTransaction.milestones.push({
                        name: milestone.name,
                        date: new Date().toISOString(),
                        completed: true
                    });
                    
                    this.state.transactions.set(transactionId, currentTransaction);
                    this.emit('transaction_milestone', { 
                        transactionId, 
                        milestone: milestone.name, 
                        agentId: this.agentId 
                    });
                }
            }, milestone.delay);
        });
    }

    // Cargar y guardar estado
    async loadState() {
        try {
            // Cargar propiedades
            const propertyFiles = await fs.readdir(this.dataDir).catch(() => []);
            for (const file of propertyFiles) {
                if (file.startsWith('property_') && file.endsWith('.json')) {
                    const data = await fs.readFile(path.join(this.dataDir, file), 'utf8');
                    const property = JSON.parse(data);
                    this.state.properties.set(property.id, property);
                }
            }
            
            console.log(`📂 Estado cargado: ${this.state.properties.size} propiedades, ${this.state.listings.size} listados`);
        } catch (error) {
            console.error('Error cargando estado:', error);
        }
    }

    // Control de pausa/reanudación
    pause() {
        this.isPaused = true;
        console.log(`⏸️ RealEstateTeam ${this.agentId} pausado`);
        this.emit('agent_paused', { agentId: this.agentId });
    }

    resume() {
        this.isPaused = false;
        console.log(`▶️ RealEstateTeam ${this.agentId} reanudado`);
        this.emit('agent_resumed', { agentId: this.agentId });
    }

    // Limpiar recursos
    destroy() {
        if (this.optimizationInterval) clearInterval(this.optimizationInterval);
        if (this.marketUpdateInterval) clearInterval(this.marketUpdateInterval);
        if (this.monitoringInterval) clearInterval(this.monitoringInterval);
        
        console.log(`🗑️ RealEstateTeam ${this.agentId} destruido`);
        this.removeAllListeners();
    }
}

module.exports = RealEstateTeam;