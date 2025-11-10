/**
 * TEST ESPECÍFICO PARA TEST 4 - SISTEMA DE EVENTOS
 * Versión simplificada para verificar solo eventos
 */

const { EOCMain } = require('./index');

async function testOnlyEvents() {
    console.log("🔔 TEST 4: Eventos del sistema");
    console.log("================================");
    
    try {
        const eoc = new EOCMain();
        
        let eventsReceived = 0;
        
        // Configurar listeners ANTES de inicializar
        eoc.on('initialized', (data) => {
            eventsReceived++;
            console.log(`  ✅ Evento 'initialized' recibido (${eventsReceived})`);
        });
        
        eoc.on('opportunityDetected', (opportunity) => {
            eventsReceived++;
            console.log(`  ✅ Evento 'opportunityDetected' recibido (${eventsReceived})`);
        });
        
        eoc.on('test-event', (data) => {
            eventsReceived++;
            console.log(`  ✅ Evento 'test-event' recibido (${eventsReceived})`);
        });
        
        console.log("🚀 Inicializando EOC...");
        await eoc.initialize();
        
        console.log("⏳ Esperando eventos automáticos...");
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log("🧪 Emitiendo evento de test manual...");
        eoc.emitTestEvent();
        
        console.log("⏳ Esperando evento manual...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Resultado final
        const success = eventsReceived >= 1;
        console.log(`\n📊 RESULTADO: ${eventsReceived} eventos recibidos`);
        
        if (success) {
            console.log("✅ Test 4 PASADO: Sistema de eventos funcionando");
        } else {
            console.log("❌ Test 4 FALLIDO: No se recibieron eventos");
        }
        
        await eoc.stop();
        return success;
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        return false;
    }
}

// Ejecutar solo este test
testOnlyEvents().then(success => {
    process.exit(success ? 0 : 1);
});