/**
 * TEST ESPECÍFICO PARA VERIFICAR SISTEMA DE EVENTOS
 * Framework Silhouette V4.0
 */

const { EOCMain } = require('./index');

async function testEventSystem() {
    console.log("🔔 TEST ESPECÍFICO: Sistema de Eventos");
    console.log("=====================================");
    
    try {
        // Crear instancia del EOC
        const eoc = new EOCMain();
        
        let eventsReceived = 0;
        const expectedEvents = [];
        
        // Configurar listeners
        eoc.on('initialized', (data) => {
            eventsReceived++;
            console.log("  ✅ Evento 'initialized' recibido:", data.timestamp);
        });
        
        eoc.on('opportunityDetected', (opportunity) => {
            eventsReceived++;
            console.log("  ✅ Evento 'opportunityDetected' recibido:", opportunity.description);
        });
        
        eoc.on('test-event', (data) => {
            eventsReceived++;
            console.log("  ✅ Evento 'test-event' recibido:", data.message);
        });
        
        // Inicializar el sistema
        console.log("🚀 Inicializando EOC...");
        await eoc.initialize();
        
        // Esperar un poco
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Emitir evento de test manualmente
        console.log("🧪 Emitiendo evento de test...");
        eoc.emitTestEvent();
        
        // Esperar más
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Resultado
        console.log(`\n📊 RESULTADO: ${eventsReceived} eventos recibidos`);
        
        if (eventsReceived >= 1) {
            console.log("✅ TEST DE EVENTOS: PASADO");
        } else {
            console.log("❌ TEST DE EVENTOS: FALLIDO");
        }
        
        // Detener
        await eoc.stop();
        
    } catch (error) {
        console.error("❌ Error en test de eventos:", error.message);
    }
}

testEventSystem();