#!/bin/bash

# ===========================================
# SILHOUETTE WORKFLOW CREATION PLATFORM
# Script de instalación automática
# ===========================================

set -e  # Salir en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
print_message() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "${PURPLE}"
    echo "=================================================="
    echo "🎭 SILHOUETTE WORKFLOW CREATION PLATFORM"
    echo "=================================================="
    echo "Iniciando instalación automática..."
    echo -e "${NC}"
}

# Verificar si Node.js está instalado
check_node() {
    print_info "Verificando Node.js..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js no está instalado. Por favor instala Node.js 18+ desde https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        print_error "Se requiere Node.js 18 o superior. Versión actual: $NODE_VERSION"
        exit 1
    fi
    
    print_message "Node.js $NODE_VERSION detectado ✓"
}

# Verificar si Docker está instalado
check_docker() {
    print_info "Verificando Docker..."
    if ! command -v docker &> /dev/null; then
        print_warning "Docker no está instalado. La instalación será manual."
        return 1
    fi
    
    if ! docker info &> /dev/null; then
        print_warning "Docker daemon no está ejecutándose. La instalación será manual."
        return 1
    fi
    
    print_message "Docker detectado ✓"
    return 0
}

# Verificar si Docker Compose está instalado
check_docker_compose() {
    print_info "Verificando Docker Compose..."
    if command -v docker-compose &> /dev/null; then
        print_message "Docker Compose detectado ✓"
        return 0
    elif docker compose version &> /dev/null; then
        print_message "Docker Compose (plugin) detectado ✓"
        return 0
    else
        print_warning "Docker Compose no está disponible."
        return 1
    fi
}

# Crear directorios necesarios
create_directories() {
    print_info "Creando directorios necesarios..."
    
    mkdir -p data/{backend,frontend,logs,db}
    mkdir -p logs/{backend,frontend,nginx}
    mkdir -p config/{nginx,database}
    mkdir -p backups
    
    print_message "Directorios creados ✓"
}

# Instalar dependencias del backend
install_backend_dependencies() {
    print_info "Instalando dependencias del backend..."
    cd backend
    
    if [ -f "package.json" ]; then
        npm install
        print_message "Dependencias del backend instaladas ✓"
    else
        print_warning "No se encontró package.json en backend/"
    fi
    
    cd ..
}

# Instalar dependencias del frontend
install_frontend_dependencies() {
    print_info "Instalando dependencias del frontend..."
    cd frontend
    
    if [ -f "package.json" ]; then
        npm install
        print_message "Dependencias del frontend instaladas ✓"
    else
        print_warning "No se encontró package.json en frontend/"
    fi
    
    cd ..
}

# Instalar dependencias del mobile
install_mobile_dependencies() {
    print_info "Instalando dependencias del mobile..."
    cd mobile
    
    if [ -f "package.json" ]; then
        npm install
        print_message "Dependencias del mobile instaladas ✓"
    else
        print_warning "No se encontró package.json en mobile/"
    fi
    
    cd ..
}

# Configurar archivo de entorno
setup_environment() {
    print_info "Configurando variables de entorno..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_message "Archivo .env creado desde .env.example"
            print_warning "IMPORTANTE: Edita el archivo .env con tus configuraciones antes de iniciar"
        else
            print_warning "No se encontró .env.example"
        fi
    else
        print_message "Archivo .env ya existe"
    fi
}

# Generar JWT secret seguro
generate_jwt_secret() {
    print_info "Generando JWT secret seguro..."
    
    if command -v openssl &> /dev/null; then
        JWT_SECRET=$(openssl rand -hex 64)
        
        if [ -f ".env" ]; then
            sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
            print_message "JWT secret generado y configurado ✓"
        else
            print_warning "No se pudo configurar JWT secret (archivo .env no existe)"
        fi
    else
        print_warning "No se pudo generar JWT secret (openssl no disponible)"
    fi
}

# Compilar proyectos
build_projects() {
    print_info "Compilando proyectos..."
    
    # Compilar backend
    if [ -d "backend" ] && [ -f "backend/package.json" ]; then
        cd backend
        if npm run build &> /dev/null; then
            print_message "Backend compilado ✓"
        else
            print_warning "Error al compilar backend"
        fi
        cd ..
    fi
    
    # Compilar frontend
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        cd frontend
        if npm run build &> /dev/null; then
            print_message "Frontend compilado ✓"
        else
            print_warning "Error al compilar frontend"
        fi
        cd ..
    fi
}

# Función de instalación manual
install_manual() {
    print_info "Iniciando instalación manual..."
    
    # Verificar Node.js
    check_node
    
    # Crear directorios
    create_directories
    
    # Instalar dependencias
    install_backend_dependencies
    install_frontend_dependencies
    install_mobile_dependencies
    
    # Configurar entorno
    setup_environment
    generate_jwt_secret
    
    # Compilar proyectos
    build_projects
    
    print_header
    print_message "INSTALACIÓN MANUAL COMPLETADA"
    echo ""
    print_info "Para iniciar el desarrollo:"
    echo -e "${CYAN}# Terminal 1 - Backend${NC}"
    echo "cd backend && npm run dev"
    echo ""
    echo -e "${CYAN}# Terminal 2 - Frontend${NC}"
    echo "cd frontend && npm run dev"
    echo ""
    echo -e "${CYAN}# Acceder a la aplicación:${NC}"
    echo "http://localhost:3000"
    echo ""
}

# Función de instalación con Docker
install_docker() {
    print_info "Iniciando instalación con Docker..."
    
    # Verificar Docker
    if ! check_docker; then
        print_error "Docker no está disponible. Usando instalación manual."
        install_manual
        return
    fi
    
    # Verificar Docker Compose
    if ! check_docker_compose; then
        print_error "Docker Compose no está disponible. Usando instalación manual."
        install_manual
        return
    fi
    
    # Crear directorios
    create_directories
    
    # Configurar entorno
    setup_environment
    generate_jwt_secret
    
    # Construir y iniciar con Docker Compose
    print_info "Construyendo y iniciando contenedores..."
    docker-compose up -d --build
    
    print_message "INSTALACIÓN CON DOCKER COMPLETADA"
    echo ""
    print_info "Servicios iniciados:"
    echo -e "${CYAN}# Frontend${NC}"
    echo "http://localhost:3000"
    echo ""
    echo -e "${CYAN}# Backend API${NC}"
    echo "http://localhost:3001"
    echo ""
    echo -e "${CYAN}# Nginx Proxy${NC}"
    echo "http://localhost (si nginx está configurado)"
    echo ""
    print_info "Ver logs:"
    echo "docker-compose logs -f"
    echo ""
    print_info "Detener servicios:"
    echo "docker-compose down"
}

# Función de verificación post-instalación
verify_installation() {
    print_info "Verificando instalación..."
    
    # Verificar puertos
    if netstat -tuln 2>/dev/null | grep -q ":3000"; then
        print_message "Puerto 3000 (Frontend) disponible ✓"
    else
        print_warning "Puerto 3000 (Frontend) no disponible"
    fi
    
    if netstat -tuln 2>/dev/null | grep -q ":3001"; then
        print_message "Puerto 3001 (Backend) disponible ✓"
    else
        print_warning "Puerto 3001 (Backend) no disponible"
    fi
}

# Función de ayuda
show_help() {
    echo -e "${PURPLE}Uso: $0 [opciones]${NC}"
    echo ""
    echo "Opciones:"
    echo "  -h, --help          Mostrar esta ayuda"
    echo "  -m, --manual        Forzar instalación manual"
    echo "  -d, --docker        Forzar instalación con Docker"
    echo "  -v, --verify        Verificar instalación"
    echo ""
    echo "Sin opciones: Intenta Docker primero, luego manual"
    echo ""
}

# Función principal
main() {
    # Verificar argumentos
    case "${1:-}" in
        -h|--help)
            show_help
            exit 0
            ;;
        -m|--manual)
            install_manual
            ;;
        -d|--docker)
            install_docker
            ;;
        -v|--verify)
            verify_installation
            ;;
        "")
            # Sin argumentos, intenta Docker primero
            if check_docker && check_docker_compose; then
                install_docker
            else
                install_manual
            fi
            ;;
        *)
            print_error "Opción desconocida: $1"
            show_help
            exit 1
            ;;
    esac
    
    # Verificación final
    verify_installation
    
    print_header
    print_message "🎉 ¡INSTALACIÓN COMPLETADA!"
    echo ""
    print_info "Silhouette Workflow Creation Platform está listo para usar."
    print_info "Accede a http://localhost:3000 para comenzar."
    echo ""
    print_warning "Recuerda revisar y configurar las variables de entorno en .env"
    print_warning "Para producción, cambia las contraseñas y secrets por defecto."
    echo ""
}

# Ejecutar función principal
main "$@"