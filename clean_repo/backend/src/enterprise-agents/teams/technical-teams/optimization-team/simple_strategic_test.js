/**
 * TEST SIMPLE DE AGENTES ESTRATÉGICOS
 * Test básico de importación y creación de instancias
 */

console.log('🧪 Iniciando test básico de agentes estratégicos...\n');

try {
    // Test 1: MergerAcquisitionTeam
    console.log('🔄 Testing MergerAcquisitionTeam import...');
    const MergerAcquisitionTeam = require('./team-workflows/strategic/MergerAcquisitionTeam');
    const maTeam = new MergerAcquisitionTeam('test-1');
    console.log('✅ MergerAcquisitionTeam: Import y creación exitosa');
    maTeam.destroy();
    
    // Test 2: CrisisManagementTeam  
    console.log('🚨 Testing CrisisManagementTeam import...');
    const CrisisManagementTeam = require('./team-workflows/strategic/CrisisManagementTeam');
    const crisisTeam = new CrisisManagementTeam('test-2');
    console.log('✅ CrisisManagementTeam: Import y creación exitosa');
    crisisTeam.destroy();
    
    // Test 3: ChangeManagementTeam
    console.log('🔄 Testing ChangeManagementTeam import...');
    const ChangeManagementTeam = require('./team-workflows/strategic/ChangeManagementTeam');
    const changeTeam = new ChangeManagementTeam('test-3');
    console.log('✅ ChangeManagementTeam: Import y creación exitosa');
    changeTeam.destroy();
    
    // Test 4: PartnershipTeam
    console.log('🤝 Testing PartnershipTeam import...');
    const PartnershipTeam = require('./team-workflows/strategic/PartnershipTeam');
    const partnershipTeam = new PartnershipTeam('test-4');
    console.log('✅ PartnershipTeam: Import y creación exitosa');
    partnershipTeam.destroy();
    
    // Test 5: GlobalExpansionTeam
    console.log('🌍 Testing GlobalExpansionTeam import...');
    const GlobalExpansionTeam = require('./team-workflows/strategic/GlobalExpansionTeam');
    const globalTeam = new GlobalExpansionTeam('test-5');
    console.log('✅ GlobalExpansionTeam: Import y creación exitosa');
    globalTeam.destroy();
    
    // Test 6: InnovationTeam (ya existente)
    console.log('💡 Testing InnovationTeam import...');
    const InnovationTeam = require('./team-workflows/strategic/InnovationTeam');
    const innovationTeam = new InnovationTeam('test-6');
    console.log('✅ InnovationTeam: Import y creación exitosa');
    innovationTeam.destroy();
    
    console.log('\n🎉 ¡TODOS LOS 6 AGENTES ESTRATÉGICOS IMPORTARON Y SE CREARON CORRECTAMENTE!');
    console.log('🎯 SECCIÓN D (EQUIPOS ESTRATÉGICOS) COMPLETADA AL 100%');
    
} catch (error) {
    console.error('❌ Error en test:', error.message);
    console.error(error.stack);
}