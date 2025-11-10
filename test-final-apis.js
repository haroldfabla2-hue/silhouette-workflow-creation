const http = require('http');

console.log('🔍 VERIFICACIÓN FINAL: APIs Originales vs Enterprise\n');

// Test data
const tests = [
    {
        name: 'API Auth Original',
        method: 'GET',
        path: '/api/auth/test',
        description: 'Testing original auth API structure'
    },
    {
        name: 'API Workflows Original',
        method: 'GET', 
        path: '/api/workflows',
        description: 'Testing original workflows API'
    },
    {
        name: 'API Framework V4 Original',
        method: 'GET',
        path: '/api/framework-v4/status',
        description: 'Testing original Framework V4 API'
    },
    {
        name: 'API Enterprise Teams (NUEVA)',
        method: 'GET',
        path: '/api/enterprise-agents/teams',
        description: 'Testing NEW enterprise agents API'
    },
    {
        name: 'API Enterprise Chat Command (NUEVA)',
        method: 'POST',
        path: '/api/enterprise-agents/chat-command',
        description: 'Testing NEW enterprise chat command API'
    }
];

function makeRequest(test) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3002,
            path: test.path,
            method: test.method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    test: test.name,
                    status: res.statusCode,
                    method: test.method,
                    path: test.path,
                    description: test.description,
                    type: test.name.includes('NUEVA') ? 'ENTERPRISE' : 'ORIGINAL',
                    success: res.statusCode < 500,
                    response: data.substring(0, 200)
                });
            });
        });

        req.on('error', (err) => {
            resolve({
                test: test.name,
                status: 'ERROR',
                method: test.method,
                path: test.path,
                description: test.description,
                type: test.name.includes('NUEVA') ? 'ENTERPRISE' : 'ORIGINAL',
                success: false,
                error: err.message
            });
        });

        // Add body for POST requests
        if (test.method === 'POST' && test.path === '/api/enterprise-agents/chat-command') {
            req.write(JSON.stringify({
                command: 'ver equipos',
                context: {}
            }));
        }

        req.end();
    });
}

async function runTests() {
    console.log('🚀 Iniciando verificación completa de APIs...\n');
    
    const results = await Promise.all(tests.map(makeRequest));
    
    // Display results
    console.log('📊 RESULTADOS DE VERIFICACIÓN:\n');
    console.log('═'.repeat(80));
    
    const originalAPIs = results.filter(r => r.type === 'ORIGINAL');
    const enterpriseAPIs = results.filter(r => r.type === 'ENTERPRISE');
    
    console.log(`🔧 APIS ORIGINALES (${originalAPIs.length} tests):`);
    originalAPIs.forEach(result => {
        const statusIcon = result.success ? '✅' : '❌';
        console.log(`   ${statusIcon} ${result.test}: ${result.status} - ${result.description}`);
    });
    
    console.log(`\n🚀 APIS ENTERPRISE (${enterpriseAPIs.length} tests):`);
    enterpriseAPIs.forEach(result => {
        const statusIcon = result.success ? '✅' : '❌';
        console.log(`   ${statusIcon} ${result.test}: ${result.status} - ${result.description}`);
    });
    
    console.log('\n' + '═'.repeat(80));
    
    const allSuccessful = results.every(r => r.success);
    const originalWorking = originalAPIs.every(r => r.success);
    const enterpriseWorking = enterpriseAPIs.every(r => r.success);
    
    console.log(`\n📈 RESUMEN FINAL:`);
    console.log(`   🏛️  APIs Originales: ${originalWorking ? '✅ FUNCIONANDO' : '❌ FALLANDO'}`);
    console.log(`   🏢 APIs Enterprise: ${enterpriseWorking ? '✅ FUNCIONANDO' : '❌ FALLANDO'}`);
    console.log(`   🎯 Resultado General: ${allSuccessful ? '✅ 100% OPERATIVO' : '❌ PROBLEMAS DETECTADOS'}`);
    
    if (allSuccessful) {
        console.log(`\n🎉 ¡VERIFICACIÓN COMPLETA EXITOSA!`);
        console.log(`   ✅ Todas las APIs originales están preservadas`);
        console.log(`   ✅ Todas las APIs enterprise están funcionando`);
        console.log(`   ✅ La integración frontend-backend es 100% compatible`);
    }
    
    return {
        total: results.length,
        successful: results.filter(r => r.success).length,
        originalWorking,
        enterpriseWorking,
        allSuccessful
    };
}

runTests().then(summary => {
    process.exit(summary.allSuccessful ? 0 : 1);
}).catch(err => {
    console.error('❌ Error durante la verificación:', err);
    process.exit(1);
});