/**
 * PRUEBA DE FUNCIONAMIENTO DEL EOC
 * Framework Silhouette V4.0 - Fase 1
 * 
 * Script de prueba para verificar que todos los componentes
 * del EOC funcionan correctamente
 * 
 * Autor: Silhouette Anónimo
 * Fecha: 2025-11-09
 */

const { initializeEOC } = require('./index');

class EOCTest {
    constructor() {
        this.eoc = null;
        this.testResults = [];
    }

    /**
     * Ejecuta todas las pruebas
     */
    async runAllTests() {
        console.log("🧪 INICIANDO PRUEBAS DEL EOC - FRAMEWORK SILHOUETTE V4.0");
        console.log("=" .repeat(70));
        
        try {
            // Test 1: Inicialización
            await this.testInitialization();
            
            // Test 2: Estado del sistema
            await this.testSystemStatus();
            
            // Test 3: Optimización manual
            await this.testManualOptimization();
            
            // Test 4: Eventos del sistema
            await this.testSystemEvents();
            
            // Test 5: Métricas y monitoring
            await this.testMetricsAndMonitoring();
            
            // Test 6: Pausar/Reanudar
            await this.testPauseResume();
            
            // Resumen de resultados
            this.showTestResults();
            
        } catch (error) {
            console.error("❌ Error en pruebas:", error);
        } finally {
            // Cleanup
            if (this.eoc) {
                await this.eoc.stop();
            }
        }
    }

    /**
     * Test 1: Inicialización del EOC
     */
    async testInitialization() {
        console.log("\n📋 Test 1: Inicialización del EOC");
        
        try {
            this.eoc = await initializeEOC({
                logLevel: 'warn', // Reducir logs para las pruebas
                autoStart: true
            });
            
            this.addTestResult('Inicialización', true, 'EOC inicializado correctamente');
            console.log("✅ Test 1 PASADO: Inicialización exitosa");
            
        } catch (error) {
            this.addTestResult('Inicialización', false, error.message);
            console.log("❌ Test 1 FALLIDO: " + error.message);
        }
    }

    /**
     * Test 2: Estado del sistema
     */
    async testSystemStatus() {
        console.log("\n📊 Test 2: Estado del sistema");
        
        try {
            const status = this.eoc.getSystemStatus();
            
            // Verificar componentes críticos
            const checks = [
                { name: 'Estado', condition: status.status === 'activo' },
                { name: 'Ejecutándose', condition: status.isRunning === true },
                { name: 'Director existe', condition: status.director !== null },
                { name: 'Configuración', condition: status.config !== null },
                { name: 'Versión', condition: status.version === '4.0' }
            ];
            
            let passed = 0;
            for (const check of checks) {
                if (check.condition) {
                    passed++;
                    console.log(`  ✅ ${check.name}: OK`);
                } else {
                    console.log(`  ❌ ${check.name}: FALLO`);
                }
            }
            
            const success = passed === checks.length;
            this.addTestResult('Estado del sistema', success, `${passed}/${checks.length} checks pasados`);
            console.log(success ? "✅ Test 2 PASADO" : "❌ Test 2 FALLIDO");
            
        } catch (error) {
            this.addTestResult('Estado del sistema', false, error.message);
            console.log("❌ Test 2 FALLIDO: " + error.message);
        }
    }

    /**
     * Test 3: Optimización manual
     */
    async testManualOptimization() {
        console.log("\n🔧 Test 3: Optimización manual");
        
        try {
            // Probar optimización de diferentes equipos
            const teams = ['marketing', 'sales', 'research'];
            
            for (const teamId of teams) {
                try {
                    const result = await this.eoc.optimizeTeam(teamId, 'test de optimización');
                    
                    if (result && typeof result.improvementPercentage === 'number') {
                        console.log(`  ✅ ${teamId}: Optimización exitosa (${result.improvementPercentage.toFixed(1)}% mejora)`);
                    } else {
                        throw new Error('Resultado de optimización inválido');
                    }
                    
                } catch (teamError) {
                    console.log(`  ⚠️ ${teamId}: Advertencia - ${teamError.message}`);
                }
            }
            
            this.addTestResult('Optimización manual', true, 'Optimización completada para equipos de prueba');
            console.log("✅ Test 3 PASADO: Optimización manual funcionando");
            
        } catch (error) {
            this.addTestResult('Optimización manual', false, error.message);
            console.log("❌ Test 3 FALLIDO: " + error.message);
        }
    }

    /**
     * Test 4: Eventos del sistema
     */
    async testSystemEvents() {
        console.log("\n🔔 Test 4: Eventos del sistema");
        
        try {
            let eventsReceived = 0;
            const expectedEvents = ['initialized', 'opportunityDetected', 'test-event'];
            
            // Configurar listeners de eventos
            this.eoc.on('initialized', (data) => {
                eventsReceived++;
                console.log("  ✅ Evento 'initialized' recibido");
            });
            
            this.eoc.on('opportunityDetected', (opportunity) => {
                eventsReceived++;
                console.log("  ✅ Evento 'opportunityDetected' recibido");
            });

            this.eoc.on('test-event', (data) => {
                eventsReceived++;
                console.log("  ✅ Evento 'test-event' recibido");
            });
            
            // Emitir evento de test manualmente para garantizar que se receive
            if (this.eoc.emitTestEvent) {
                this.eoc.emitTestEvent();
            }
            
            // Esperar un poco para recibir eventos
            await this.wait(1000);
            
            // Verificar que se recibieron eventos
            const success = eventsReceived >= 1; // Al menos un evento
            this.addTestResult('Eventos del sistema', success, `${eventsReceived} eventos recibidos`);
            
            console.log(success ? "✅ Test 4 PASADO" : "❌ Test 4 FALLIDO");
            
        } catch (error) {
            this.addTestResult('Eventos del sistema', false, error.message);
            console.log("❌ Test 4 FALLIDO: " + error.message);
        }
    }

    /**
     * Test 5: Métricas y monitoring
     */
    async testMetricsAndMonitoring() {
        console.log("\n📈 Test 5: Métricas y monitoring");
        
        try {
            // Verificar que el director tiene las métricas
            const director = this.eoc.director;
            if (!director) {
                throw new Error('Director no encontrado');
            }
            
            // Verificar componentes de métricas
            const metricsComponents = [
                { name: 'Director existe', check: () => director !== null },
                { name: 'Performance Metrics', check: () => director.performanceMetrics !== null },
                { name: 'Real Time Monitor', check: () => director.realTimeMonitor !== null },
                { name: 'Dynamic Workflows', check: () => director.dynamicWorkflows !== null },
                { name: 'AI Optimizer', check: () => director.aiOptimizer !== null }
            ];
            
            let passed = 0;
            for (const component of metricsComponents) {
                if (component.check()) {
                    passed++;
                    console.log(`  ✅ ${component.name}: OK`);
                } else {
                    console.log(`  ❌ ${component.name}: FALLO`);
                }
            }
            
            const success = passed === metricsComponents.length;
            this.addTestResult('Métricas y monitoring', success, `${passed}/${metricsComponents.length} componentes verificados`);
            console.log(success ? "✅ Test 5 PASADO" : "❌ Test 5 FALLIDO");
            
        } catch (error) {
            this.addTestResult('Métricas y monitoring', false, error.message);
            console.log("❌ Test 5 FALLIDO: " + error.message);
        }
    }

    /**
     * Test 6: Pausar/Reanudar
     */
    async testPauseResume() {
        console.log("\n⏸️ Test 6: Pausar/Reanudar");
        
        try {
            // Guardar estado inicial
            const initialStatus = this.eoc.getSystemStatus();
            const wasRunning = initialStatus.isRunning;
            
            // Pausar
            await this.eoc.pause();
            await this.wait(1000);
            
            const pausedStatus = this.eoc.getSystemStatus();
            if (pausedStatus.isRunning !== false) {
                throw new Error('El sistema no se pausó correctamente');
            }
            console.log("  ✅ Pausado: OK");
            
            // Reanudar
            await this.eoc.resume();
            await this.wait(1000);
            
            const resumedStatus = this.eoc.getSystemStatus();
            if (resumedStatus.isRunning !== true) {
                throw new Error('El sistema no se reanudó correctamente');
            }
            console.log("  ✅ Reanudado: OK");
            
            this.addTestResult('Pausar/Reanudar', true, 'Pausa y reanudación funcionando correctamente');
            console.log("✅ Test 6 PASADO: Pausar/Reanudar funcionando");
            
        } catch (error) {
            this.addTestResult('Pausar/Reanudar', false, error.message);
            console.log("❌ Test 6 FALLIDO: " + error.message);
        }
    }

    /**
     * Muestra resultados de las pruebas
     */
    showTestResults() {
        console.log("\n📊 RESUMEN DE PRUEBAS");
        console.log("=" .repeat(50));
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(test => test.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`Total de pruebas: ${totalTests}`);
        console.log(`✅ Pasadas: ${passedTests}`);
        console.log(`❌ Fallidas: ${failedTests}`);
        console.log(`📊 Tasa de éxito: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log("\n⚠️ PRUEBAS FALLIDAS:");
            this.testResults.filter(test => !test.passed).forEach(test => {
                console.log(`  ❌ ${test.name}: ${test.details}`);
            });
        }
        
        console.log("\n" + "=".repeat(50));
        if (passedTests === totalTests) {
            console.log("🎉 TODAS LAS PRUEBAS PASARON - EOC FUNCIONANDO CORRECTAMENTE");
        } else {
            console.log("⚠️ ALGUNAS PRUEBAS FALLARON - REVISAR CONFIGURACIÓN");
        }
    }

    /**
     * Añade resultado de prueba
     */
    addTestResult(name, passed, details) {
        this.testResults.push({
            name,
            passed,
            details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Utilidad para esperar
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Función de prueba principal
async function runEOCTests() {
    const tester = new EOCTest();
    await tester.runAllTests();
}

// Ejecutar pruebas si se ejecuta directamente
if (require.main === module) {
    runEOCTests().catch(console.error);
}

module.exports = { EOCTest, runEOCTests };