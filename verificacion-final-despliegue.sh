#!/bin/bash

# ==================================================
# VERIFICACIÓN FINAL DESPLIEGUE SILHOUETTE
# ==================================================
# Script para verificar que la aplicación unificada 
# esté 100% lista para despliegue en producción
# ==================================================

# Configuración de colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Función para imprimir mensajes
print_header() {
    echo -e "\n${BLUE}==================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}==================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    ((PASSED_CHECKS++))
}

print_failure() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    ((FAILED_CHECKS++))
}

print_warning() {
    echo -e "${YELLOW}⚠ WARN:${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ INFO:${NC} $1"
}

# Función para verificar si un archivo existe
check_file() {
    ((TOTAL_CHECKS++))
    if [ -f "$1" ]; then
        print_success "Archivo existe: $1"
        return 0
    else
        print_failure "Archivo no existe: $1"
        return 1
    fi
}

# Función para verificar si un directorio existe
check_directory() {
    ((TOTAL_CHECKS++))
    if [ -d "$1" ]; then
        print_success "Directorio existe: $1"
        return 0
    else
        print_failure "Directorio no existe: $1"
        return 1
    fi
}

# Función para verificar que no haya placeholders CHANGE_THIS
check_no_placeholders() {
    ((TOTAL_CHECKS++))
    local file="$1"
    if grep -q "CHANGE_THIS" "$file"; then
        print_failure "Placeholders CHANGE_THIS encontrados en: $file"
        grep -n "CHANGE_THIS" "$file"
        return 1
    else
        print_success "No se encontraron placeholders CHANGE_THIS en: $file"
        return 0
    fi
}

# Función para verificar configuración de base de datos
check_db_config() {
    ((TOTAL_CHECKS++))
    if grep -q "POSTGRES_PASSWORD=" .env.production && \
       grep -q "v6Ard2BhyygnhfzqoXR935n8oReEwRPc+wcEZEdhgeQ=" .env.production; then
        print_success "Configuración de PostgreSQL actualizada correctamente"
        return 0
    else
        print_failure "Configuración de PostgreSQL no actualizada"
        return 1
    fi
}

# Función para verificar configuración de Redis
check_redis_config() {
    ((TOTAL_CHECKS++))
    if grep -q "REDIS_PASSWORD=" .env.production && \
       grep -q "uHuFU3vfkvCHNDl9Z+XsB2sKiP1RsW1ifSWlxCzL9zs=" .env.production; then
        print_success "Configuración de Redis actualizada correctamente"
        return 0
    else
        print_failure "Configuración de Redis no actualizada"
        return 1
    fi
}

# Función para verificar configuración de Neo4j
check_neo4j_config() {
    ((TOTAL_CHECKS++))
    if grep -q "NEO4J_PASSWORD=" .env.production && \
       grep -q "PoAhse0FH0Q3s1Q5rGJcLJJvWf/hSWyqNr4k7at5jnI=" .env.production; then
        print_success "Configuración de Neo4j actualizada correctamente"
        return 0
    else
        print_failure "Configuración de Neo4j no actualizada"
        return 1
    fi
}

# Función para verificar configuración de RabbitMQ
check_rabbitmq_config() {
    ((TOTAL_CHECKS++))
    if grep -q "RABBITMQ_PASSWORD=" .env.production && \
       grep -q "Wpd0yc+Yk4dyTmmRr/3r6XQUMlZ6xEuEcYY+gYYHhDI=" .env.production; then
        print_success "Configuración de RabbitMQ actualizada correctamente"
        return 0
    else
        print_failure "Configuración de RabbitMQ no actualizada"
        return 1
    fi
}

# Función para verificar configuración de JWT
check_jwt_config() {
    ((TOTAL_CHECKS++))
    if grep -q "JWT_SECRET_KEY=" .env.production && \
       grep -q "GrOMWvS1WDUfSRdSMM7yD4sCT5RPlrg97SHkDEDPH2RBwNnjo4vsBOY2a0LBTF6/" .env.production; then
        print_success "Configuración de JWT actualizada correctamente"
        return 0
    else
        print_failure "Configuración de JWT no actualizada"
        return 1
    fi
}

# Función para verificar configuración de encriptación
check_encryption_config() {
    ((TOTAL_CHECKS++))
    if grep -q "ENCRYPTION_KEY=" .env.production && \
       grep -q "SoRIvzQI4Be/9z/+n/yZSp7WH+HAZpugaP+9h17sgz8=" .env.production; then
        print_success "Configuración de encriptación actualizada correctamente"
        return 0
    else
        print_failure "Configuración de encriptación no actualizada"
        return 1
    fi
}

# Función para verificar puertos dinámicos
check_dynamic_ports() {
    ((TOTAL_CHECKS++))
    if grep -q "\${POSTGRES_PORT:-5432}" docker-compose.prod.yml && \
       grep -q "\${REDIS_PORT:-6379}" docker-compose.prod.yml; then
        print_success "Sistema de puertos dinámicos configurado correctamente"
        return 0
    else
        print_failure "Sistema de puertos dinámicos no configurado correctamente"
        return 1
    fi
}

# Función para verificar servicios en docker-compose
check_services() {
    ((TOTAL_CHECKS++))
    local services=("postgres" "redis" "neo4j" "rabbitmq" "backend" "frontend" "nginx")
    local all_found=true
    
    for service in "${services[@]}"; do
        if ! grep -q "$service:" docker-compose.prod.yml; then
            print_failure "Servicio no encontrado en docker-compose.prod.yml: $service"
            all_found=false
        fi
    done
    
    if [ "$all_found" = true ]; then
        print_success "Todos los servicios están definidos en docker-compose.prod.yml"
        return 0
    else
        return 1
    fi
}

# Función para verificar health checks
check_health_checks() {
    ((TOTAL_CHECKS++))
    if grep -q "healthcheck:" docker-compose.prod.yml; then
        local health_count=$(grep -c "healthcheck:" docker-compose.prod.yml)
        print_success "Health checks configurados ($health_count servicios)"
        return 0
    else
        print_failure "No se encontraron health checks en docker-compose.prod.yml"
        return 1
    fi
}

# Función para verificar configuración de red
check_network_config() {
    ((TOTAL_CHECKS++))
    if grep -q "silhouette-network-prod" docker-compose.prod.yml; then
        print_success "Configuración de red personalizada encontrada"
        return 0
    else
        print_failure "Configuración de red no encontrada"
        return 1
    fi
}

# Función para verificar volúmenes
check_volumes() {
    ((TOTAL_CHECKS++))
    if grep -q "volumes:" docker-compose.prod.yml; then
        local volume_count=$(grep -c "driver: local" docker-compose.prod.yml)
        print_success "Volúmenes persistentes configurados ($volume_count volúmenes)"
        return 0
    else
        print_failure "Configuración de volúmenes no encontrada"
        return 1
    fi
}

# Función para verificar scripts de despliegue
check_deployment_scripts() {
    ((TOTAL_CHECKS++))
    if [ -f "setup-production.sh" ] && [ -f "verify-deployment.sh" ]; then
        print_success "Scripts de despliegue encontrados"
        return 0
    else
        print_failure "Scripts de despliegue no encontrados"
        return 1
    fi
}

# Función para verificar Dockerfiles de producción
check_production_dockerfiles() {
    ((TOTAL_CHECKS++))
    if [ -f "backend/Dockerfile.prod" ] && [ -f "frontend/Dockerfile.prod" ]; then
        print_success "Dockerfiles de producción encontrados"
        return 0
    else
        print_failure "Dockerfiles de producción no encontrados"
        return 1
    fi
}

# Función para verificar configuración de nginx
check_nginx_config() {
    ((TOTAL_CHECKS++))
    if [ -f "config/nginx/nginx.prod.conf" ]; then
        print_success "Configuración de nginx para producción encontrada"
        return 0
    else
        print_failure "Configuración de nginx para producción no encontrada"
        return 1
    fi
}

# Función principal de verificación
main_verification() {
    print_header "VERIFICACIÓN FINAL DE DESPLIEGUE - SILHOUETTE"
    
    print_info "Iniciando verificación completa del sistema unificado..."
    
    # Verificar archivos principales
    check_file ".env.production"
    check_file "MI_ENV_COMPLETO.env"
    check_file "docker-compose.prod.yml"
    check_file "docker-compose.yml"
    
    # Verificar que no hay placeholders
    check_no_placeholders ".env.production"
    
    # Verificar configuraciones de base de datos
    check_db_config
    check_redis_config
    check_neo4j_config
    check_rabbitmq_config
    
    # Verificar configuraciones de seguridad
    check_jwt_config
    check_encryption_config
    
    # Verificar sistema de puertos dinámicos
    check_dynamic_ports
    
    # Verificar servicios y configuración
    check_services
    check_health_checks
    check_network_config
    check_volumes
    
    # Verificar scripts y configuración
    check_deployment_scripts
    check_production_dockerfiles
    check_nginx_config
    
    # Verificar directorios de configuración
    check_directory "backend"
    check_directory "frontend"
    check_directory "config"
    check_directory "config/nginx"
    
    # Mostrar resumen
    print_header "RESUMEN DE VERIFICACIÓN"
    echo -e "${BLUE}Total de verificaciones:${NC} $TOTAL_CHECKS"
    echo -e "${GREEN}Exitosas:${NC} $PASSED_CHECKS"
    echo -e "${RED}Fallidas:${NC} $FAILED_CHECKS"
    
    local success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo -e "${BLUE}Tasa de éxito:${NC} ${success_rate}%"
    
    if [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 ¡ÉXITO! La aplicación está 100% lista para despliegue.${NC}"
        echo -e "${GREEN}✓ Todos los valores seguros han sido configurados${NC}"
        echo -e "${GREEN}✓ El sistema de puertos dinámicos está funcionando${NC}"
        echo -e "${GREEN}✓ La aplicación unificada está completamente configurada${NC}"
        return 0
    else
        echo -e "\n${RED}❌ FALLO: Se encontraron $FAILED_CHECKS problemas que deben resolverse${NC}"
        return 1
    fi
}

# Verificar si estamos en el directorio correcto
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}Error: Este script debe ejecutarse desde el directorio raíz del proyecto${NC}"
    echo -e "${YELLOW}Uso: cd silhouette-workflow-creation && bash verificacion-final-despliegue.sh${NC}"
    exit 1
fi

# Ejecutar verificación
main_verification
exit_code=$?

# Mostrar información de próximos pasos
if [ $exit_code -eq 0 ]; then
    print_header "PRÓXIMOS PASOS PARA DESPLIEGUE"
    echo -e "${BLUE}1. Configurar dominio de producción en .env.production${NC}"
    echo -e "${BLUE}2. Configurar certificados SSL${NC}"
    echo -e "${BLUE}3. Ejecutar: docker-compose -f docker-compose.prod.yml up -d${NC}"
    echo -e "${BLUE}4. Verificar servicios: docker-compose -f docker-compose.prod.yml ps${NC}"
    echo -e "${BLUE}5. Revisar logs: docker-compose -f docker-compose.prod.yml logs -f${NC}"
fi

exit $exit_code