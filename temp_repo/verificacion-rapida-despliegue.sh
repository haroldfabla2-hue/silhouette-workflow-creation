#!/bin/bash

# ==================================================
# SILHOUETTE WORKFLOW CREATION - Verificación Rápida
# ==================================================
# Script para verificación rápida del estado de despliegue
# Autor: MiniMax Agent
# Fecha: 2025-11-10

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║    🚀 VERIFICACIÓN RÁPIDA DE DESPLIEGUE 🚀                   ║"
echo "║                                                               ║"
echo "║                MiniMax Agent Analysis                        ║"
echo "║                     2025-11-10                               ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Contadores
TOTAL_CHECKS=0
PASSED_CHECKS=0

check() {
    ((TOTAL_CHECKS++))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        ((PASSED_CHECKS++))
        return 0
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "🔍 Verificando configuración de archivos principales..."
echo ""

# Verificar archivos críticos
[ -f "docker-compose.yml" ]
check $? "Docker Compose development existe"

[ -f "docker-compose.prod.yml" ]
check $? "Docker Compose production existe"

[ -f "DEPLOYMENT.md" ]
check $? "Documentación de despliegue existe"

[ -f "scripts/setup.sh" ]
check $? "Script de setup existe"

[ -f "scripts/setup-production.sh" ]
check $? "Script de setup producción existe"

[ -f "scripts/verify-deployment.sh" ]
check $? "Script de verificación existe"

[ -f ".env.production" ]
check $? "Archivo de entorno de producción existe"

echo ""
echo "🔐 Verificando configuración de seguridad..."
echo ""

# Verificar variables de entorno
if grep -q "CHANGE_THIS" .env.production; then
    warning "Variables con CHANGE_THIS detectadas - deben actualizarse antes del despliegue"
else
    check 0 "Variables de entorno configuradas"
fi

# Verificar configuraciones de base de datos
[ -f "config/nginx/nginx.prod.conf" ]
check $? "Configuración de Nginx existe"

[ -f "config/prometheus/prometheus.yml" ]
check $? "Configuración de Prometheus existe"

echo ""
echo "📁 Verificando estructura de directorios..."
echo ""

# Verificar directorios principales
[ -d "backend" ]
check $? "Directorio backend existe"

[ -d "frontend" ]
check $? "Directorio frontend existe"

[ -d "scripts" ]
check $? "Directorio scripts existe"

[ -d "config" ]
check $? "Directorio config existe"

[ -d "database" ]
check $? "Directorio database existe"

echo ""
echo "📊 Verificando Docker y contenedores..."
echo ""

# Verificar Docker
if command -v docker &> /dev/null; then
    check 0 "Docker está instalado"
    if docker info &> /dev/null; then
        check 0 "Docker está ejecutándose"
    else
        check 1 "Docker no está ejecutándose"
    fi
else
    check 1 "Docker no está instalado"
fi

# Verificar Docker Compose
if docker compose version &> /dev/null; then
    check 0 "Docker Compose v2 está disponible"
elif command -v docker-compose &> /dev/null; then
    check 0 "Docker Compose v1 está disponible"
else
    check 1 "Docker Compose no está disponible"
fi

echo ""
echo "🖥️  Verificando recursos del sistema..."
echo ""

# Verificar memoria
if command -v free &> /dev/null; then
    MEMORY_GB=$(free -g | awk 'NR==2{print $7}')
    if [ $MEMORY_GB -ge 8 ]; then
        check 0 "Memoria suficiente: ${MEMORY_GB}GB"
    elif [ $MEMORY_GB -ge 4 ]; then
        check 1 "Memoria moderada: ${MEMORY_GB}GB (se recomiendan 8GB+)"
    else
        check 1 "Memoria insuficiente: ${MEMORY_GB}GB"
    fi
else
    warning "No se puede verificar la memoria (comando free no disponible)"
fi

# Verificar espacio en disco
DISK_GB=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//')
if [ $DISK_GB -ge 50 ]; then
    check 0 "Espacio en disco suficiente: ${DISK_GB}GB"
elif [ $DISK_GB -ge 20 ]; then
    check 1 "Espacio moderado: ${DISK_GB}GB (se recomiendan 50GB+)"
else
    check 1 "Espacio insuficiente: ${DISK_GB}GB"
fi

echo ""
echo "🔌 Verificando puertos disponibles..."
echo ""

# Verificar puertos críticos
PORTS_IN_USE=0
for port in 80 443 3000 3001 5432 6379 7474 7687; do
    if netstat -tuln 2>/dev/null | grep -q ":$port " || lsof -i ":$port" &> /dev/null; then
        ((PORTS_IN_USE++))
    fi
done

if [ $PORTS_IN_USE -eq 0 ]; then
    check 0 "Todos los puertos críticos están disponibles"
else
    check 1 "$PORTS_IN_USE puertos en uso de 7 críticos"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "                      RESUMEN FINAL"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Total de verificaciones: $TOTAL_CHECKS"
echo "Verificaciones exitosas: $PASSED_CHECKS"
echo "Tasa de éxito: $((PASSED_CHECKS * 100 / TOTAL_CHECKS))%"
echo ""

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    echo -e "${GREEN}🎉 ¡PERFECTO! Todo está listo para el despliegue${NC}"
    echo ""
    echo "Próximos pasos:"
    echo "1. Actualizar variables de entorno en .env.production"
    echo "2. Configurar certificados SSL (si usas HTTPS)"
    echo "3. Ejecutar: ./scripts/setup-production.sh"
elif [ $((PASSED_CHECKS * 100 / TOTAL_CHECKS)) -ge 80 ]; then
    echo -e "${YELLOW}⚠️  Buenas condiciones para el despliegue${NC}"
    echo ""
    echo "Revisa las verificaciones fallidas antes del despliegue."
else
    echo -e "${RED}❌ Se requieren correcciones antes del despliegue${NC}"
    echo ""
    echo "Por favor resuelve los problemas identificados."
fi

echo ""
echo "📖 Para más información, consulta: DEPLOYMENT.md"
echo "🔧 Para verificación completa: ./scripts/verify-deployment.sh"
echo "═══════════════════════════════════════════════════════════════"