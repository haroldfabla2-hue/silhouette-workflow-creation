/**
 * TEST SISTEMA DE EVENTOS - VERSIÓN SIMPLIFICADA
 */

const EventEmitter = require('events');

class SimpleTest extends EventEmitter {
    constructor() {
        super();
        console.log("🎯 Iniciando test de eventos...");
        
        this.setupListeners();
        this.runTest();
    }
    
    setupListeners() {
        let eventCount = 0;
        
        this.on('initialized', (data) => {
            eventCount++;
            console.log(`✅ initialized: ${eventCount}`);
        });
        
        this.on('opportunityDetected', (data) => {
            eventCount++;
            console.log(`✅ opportunityDetected: ${eventCount}`);
        });
        
        this.on('test-event', (data) => {
            eventCount++;
            console.log(`✅ test-event: ${eventCount}`);
        });
        
        this.testCount = eventCount;
    }
    
    async runTest() {
        console.log("🚀 Emitiendo eventos...");
        
        // Emitir evento 1
        this.emit('initialized', { timestamp: new Date() });
        await this.wait(100);
        
        // Emitir evento 2
        this.emit('opportunityDetected', { description: 'Test opportunity' });
        await this.wait(100);
        
        // Emitir evento 3
        this.emit('test-event', { message: 'Test message' });
        await this.wait(100);
        
        console.log("✅ Test completado");
    }
    
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

console.log("🧪 INICIANDO TEST DE EVENTOS");
const test = new SimpleTest();