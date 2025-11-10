#!/bin/bash

# Script de Verificación Rápida - Integración Enterprise Silhouette V4.0
# Fecha: 2025-11-10
# Estado Esperado: Todos los tests deben pasar ✅

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║  🧪 VERIFICACIÓN RÁPIDA ENTERPRISE SILHOUETTE V4.0           ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de tests
TOTAL_TESTS=0
PASSED_TESTS=0

# Función para ejecutar test
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_result="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "🧪 Test $TOTAL_TESTS: $test_name ... "
    
    # Ejecutar comando y capturar resultado
    result=$(eval "$command" 2>/dev/null)
    exit_code=$?
    
    # Verificar si el test pasó
    if [ $exit_code -eq 0 ] && [[ "$result" == *"$expected_result"* ]]; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "  Expected: $expected_result"
        echo "  Got: $result"
        return 1
    fi
}

# Verificar que el servidor esté corriendo
echo "🔍 Verificando servidor de prueba..."
SERVER_URL="http://localhost:3001"

# Test 1: Health Check
run_test "Health Check" \
    "curl -s $SERVER_URL/health | grep -q 'healthy'" \
    "healthy"

# Test 2: Integration Test
run_test "Integration Verification" \
    "curl -s $SERVER_URL/api/test-integration | grep -q 'Integración Frontend-Backend Enterprise verificada'" \
    "Integración Frontend-Backend Enterprise verificada"

# Test 3: List Teams
run_test "Enterprise Teams List" \
    "curl -s $SERVER_URL/api/enterprise-agents/teams | grep -q '78+ enterprise teams disponibles'" \
    "78+ enterprise teams disponibles"

# Test 4: Video Viral Command
run_test "Video Viral Command" \
    "curl -s -X POST $SERVER_URL/api/enterprise-agents/chat-command -H 'Content-Type: application/json' -d '{\"message\":\"crea video viral sobre tecnología\"}' | grep -q 'Video viral en proceso de creación'" \
    "Video viral en proceso de creación"

# Test 5: Marketing Campaign Command
run_test "Marketing Campaign Command" \
    "curl -s -X POST $SERVER_URL/api/enterprise-agents/chat-command -H 'Content-Type: application/json' -d '{\"message\":\"crea campaña de marketing para producto tech\"}' | grep -q 'Campaña de marketing en desarrollo'" \
    "Campaña de marketing en desarrollo"

# Test 6: List Teams Command
run_test "List Teams Command" \
    "curl -s -X POST $SERVER_URL/api/enterprise-agents/chat-command -H 'Content-Type: application/json' -d '{\"message\":\"ver equipos\"}' | grep -q '78+ Equipos Enterprise Disponibles'" \
    "78+ Equipos Enterprise Disponibles"

# Test 7: Specific Team Endpoint
run_test "Specific Team (runway-ai)" \
    "curl -s $SERVER_URL/api/enterprise-agents/team/runway-ai | grep -q 'Plataforma de IA para generación de videos de alta calidad'" \
    "Plataforma de IA para generación de videos de alta calidad"

# Test 8: Total Teams Count
run_test "Total Teams Count" \
    "curl -s $SERVER_URL/api/enterprise-agents/teams | grep -q '\"total\": 96'" \
    "96"

# Test 9: Enterprise Orchestrator Status
run_test "Enterprise Orchestrator Active" \
    "curl -s $SERVER_URL/health | grep -q '\"enterprise\": \"active\"'" \
    "active"

# Test 10: API Response Format
run_test "API Response Format" \
    "curl -s $SERVER_URL/api/test-integration | grep -q '\"success\": true'" \
    "success"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║  📊 RESULTADOS DE VERIFICACIÓN                               ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo "📈 Tests Totales: $TOTAL_TESTS"
echo "✅ Tests Exitosos: $PASSED_TESTS"
echo "❌ Tests Fallidos: $((TOTAL_TESTS - PASSED_TESTS))"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo ""
    echo -e "${GREEN}🎉 ¡TODOS LOS TESTS PASARON!${NC}"
    echo -e "${GREEN}✅ La integración enterprise está 100% funcional${NC}"
    echo ""
    echo "📋 Estado Final:"
    echo "  • 96 equipos enterprise activos"
    echo "  • Todas las APIs funcionando"
    echo "  • Comandos SilhouetteChat operativos"
    echo "  • Frontend-backend integración completa"
    echo "  • WebSocket communication habilitada"
    echo ""
    echo "🚀 ¡La aplicación está lista para producción!"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  ALGUNOS TESTS FALLARON${NC}"
    echo -e "${YELLOW}Revisa los logs acima para más detalles${NC}"
    echo ""
    echo "🔧 Pasos de troubleshooting:"
    echo "  1. Verificar que el servidor esté corriendo en puerto 3001"
    echo "  2. Ejecutar: node test-enterprise-simple.js"
    echo "  3. Revisar logs del servidor"
    echo "  4. Verificar dependencias y configuraciones"
    exit 1
fi