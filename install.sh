#!/bin/bash

# =============================================================================
# SCRIPT DE INSTALACIÓN AUTOMÁTICA - SILHOUETTE WORKFLOW CREATION
# =============================================================================
# Este script automatiza la instalación completa de Silhouette
# con el sistema de usuarios estilo n8n

set -e  # Salir si cualquier comando falla

echo "🚀 SILHOUETTE WORKFLOW CREATION - INSTALACIÓN AUTOMÁTICA"
echo "========================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar dependencias del sistema
check_system_dependencies() {
    log_info "Verificando dependencias del sistema..."
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js no está instalado. Por favor instala Node.js 18+ desde https://nodejs.org"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | sed 's/v//')
    log_success "Node.js $NODE_VERSION encontrado"
    
    # Verificar npm
    if ! command -v npm &> /dev/null; then
        log_error "npm no está instalado. Por favor instala npm"
        exit 1
    fi
    
    NPM_VERSION=$(npm -v)
    log_success "npm $NPM_VERSION encontrado"
    
    # Verificar Git
    if ! command -v git &> /dev/null; then
        log_warning "Git no está instalado. Algunas funciones pueden no estar disponibles."
    else
        log_success "Git encontrado"
    fi
}

# Instalar dependencias del backend
install_backend_dependencies() {
    log_info "Instalando dependencias del backend..."
    
    cd backend
    
    # Verificar si package.json existe
    if [ ! -f "package.json" ]; then
        log_error "package.json no encontrado en backend/"
        exit 1
    fi
    
    # Instalar dependencias principales
    log_info "Instalando dependencias principales..."
    npm install --silent
    
    # Instalar dependencias de desarrollo
    log_info "Instalando dependencias de desarrollo..."
    npm install --save-dev --silent
    
    log_success "Dependencias del backend instaladas correctamente"
    cd ..
}

# Instalar dependencias del frontend
install_frontend_dependencies() {
    log_info "Instalando dependencias del frontend..."
    
    cd frontend
    
    # Verificar si package.json existe
    if [ ! -f "package.json" ]; then
        log_error "package.json no encontrado en frontend/"
        exit 1
    fi
    
    # Instalar dependencias
    log_info "Esto puede tomar varios minutos..."
    npm install --silent
    
    log_success "Dependencias del frontend instaladas correctamente"
    cd ..
}

# Configurar archivo de entorno
setup_environment() {
    log_info "Configurando archivo de entorno..."
    
    # Backend
    if [ ! -f "backend/.env" ]; then
        if [ -f "backend/.env.example" ]; then
            cp backend/.env.example backend/.env
            log_success "Archivo .env del backend creado desde .env.example"
            log_warning "IMPORTANTE: Edita backend/.env con tus configuraciones específicas"
        else
            log_warning "backend/.env.example no encontrado"
        fi
    else
        log_info "backend/.env ya existe, saltando..."
    fi
    
    # Frontend
    if [ ! -f "frontend/.env" ]; then
        if [ -f "frontend/.env.example" ]; then
            cp frontend/.env.example frontend/.env
            log_success "Archivo .env del frontend creado desde .env.example"
        else
            log_info "Creando .env básico para frontend..."
            cat > frontend/.env << EOF
# Configuración del frontend
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WEBSOCKET_URL=http://localhost:3001
REACT_APP_ENVIRONMENT=development
EOF
            log_success "Archivo .env básico del frontend creado"
        fi
    else
        log_info "frontend/.env ya existe, saltando..."
    fi
}

# Crear directorios necesarios
create_directories() {
    log_info "Creando directorios necesarios..."
    
    # Backend directories
    mkdir -p backend/logs
    mkdir -p backend/uploads
    mkdir -p backend/temp
    
    # Frontend public directories
    mkdir -p frontend/public/uploads
    
    # Root directories
    mkdir -p logs
    mkdir -p data
    
    log_success "Directorios creados correctamente"
}

# Verificar estructura de archivos
check_file_structure() {
    log_info "Verificando estructura de archivos..."
    
    # Backend files
    BACKEND_FILES=(
        "backend/src/server.ts"
        "backend/src/routes/auth.ts"
        "backend/src/services/AuthService.ts"
        "backend/src/database/models/User.ts"
        "backend/src/middleware/auth.ts"
    )
    
    # Frontend files
    FRONTEND_FILES=(
        "frontend/src/components/silhouette/SilhouetteChat.tsx"
        "frontend/src/components/silhouette/SilhouetteControlCenter.tsx"
        "frontend/src/components/credentials/SecureCredentialsManager.tsx"
    )
    
    for file in "${BACKEND_FILES[@]}"; do
        if [ -f "$file" ]; then
            log_success "✓ $file"
        else
            log_error "✗ $file no encontrado"
        fi
    done
    
    for file in "${FRONTEND_FILES[@]}"; do
        if [ -f "$file" ]; then
            log_success "✓ $file"
        else
            log_warning "⚠ $file no encontrado (puede ser opcional)"
        fi
    done
}

# Generar claves de seguridad
generate_security_keys() {
    log_info "Generando claves de seguridad..."
    
    # Generar JWT secret
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
    
    # Generar encryption key
    ENCRYPTION_KEY=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
    
    # Actualizar .env del backend si existe
    if [ -f "backend/.env" ]; then
        # Reemplazar o agregar claves
        if grep -q "JWT_SECRET_KEY" backend/.env; then
            sed -i "s/JWT_SECRET_KEY=.*/JWT_SECRET_KEY=$JWT_SECRET/" backend/.env
        else
            echo "JWT_SECRET_KEY=$JWT_SECRET" >> backend/.env
        fi
        
        if grep -q "ENCRYPTION_KEY" backend/.env; then
            sed -i "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$ENCRYPTION_KEY/" backend/.env
        else
            echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> backend/.env
        fi
        
        log_success "Claves de seguridad generadas y guardadas en .env"
    else
        log_warning "backend/.env no encontrado, claves no guardadas"
    fi
}

# Función para iniciar los servicios
start_services() {
    log_info "¿Deseas iniciar los servicios ahora? (y/n)"
    read -p "Iniciar backend y frontend: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Iniciando servicios en background..."
        
        # Iniciar backend
        cd backend
        log_info "Iniciando backend en http://localhost:3001"
        npm run dev &
        BACKEND_PID=$!
        cd ..
        
        # Esperar un poco para que el backend se inicie
        sleep 5
        
        # Iniciar frontend
        cd frontend
        log_info "Iniciando frontend en http://localhost:3000"
        npm start &
        FRONTEND_PID=$!
        cd ..
        
        log_success "Servicios iniciados!"
        log_info "Backend PID: $BACKEND_PID"
        log_info "Frontend PID: $FRONTEND_PID"
        log_info "Para detener los servicios, usa: kill $BACKEND_PID $FRONTEND_PID"
        
        # Guardar PIDs para fácil referencia
        echo "$BACKEND_PID" > backend.pid
        echo "$FRONTEND_PID" > frontend.pid
    else
        log_info "Puedes iniciar los servicios manualmente con:"
        log_info "Backend: cd backend && npm run dev"
        log_info "Frontend: cd frontend && npm start"
    fi
}

# Mostrar información de siguiente paso
show_next_steps() {
    log_success "¡INSTALACIÓN COMPLETADA!"
    echo
    echo "📋 PRÓXIMOS PASOS:"
    echo "=================="
    echo "1. ✏️  Edita backend/.env con tus configuraciones específicas"
    echo "2. 🌐 Abre http://localhost:3000 en tu navegador"
    echo "3. 👤 Completa el registro del primer usuario (será Owner automáticamente)"
    echo "4. 👥 Invita colaboradores desde el panel de administración"
    echo
    echo "📚 DOCUMENTACIÓN:"
    echo "=================="
    echo "• Sistema de usuarios: docs/SISTEMA_USUARIOS_N8N_STYLE.md"
    echo "• Configuración: backend/.env.example"
    echo "• API Documentation: http://localhost:3001/api/docs (cuando esté disponible)"
    echo
    echo "🔧 COMANDOS ÚTILES:"
    echo "==================="
    echo "• Detener servicios: kill \$(cat backend.pid) \$(cat frontend.pid)"
    echo "• Ver logs backend: tail -f backend/logs/silhouette.log"
    echo "• Ver logs frontend: npm run logs (en frontend/)"
    echo
    echo "🆘 SOPORTE:"
    echo "==========="
    echo "• Revisa los logs si hay problemas"
    echo "• Verifica que el puerto 3000 y 3001 estén libres"
    echo "• Asegúrate de que las dependencias estén instaladas correctamente"
    echo
    log_success "¡Silhouette está listo para usar!"
}

# Función principal
main() {
    log_info "Iniciando instalación de Silhouette Workflow Creation..."
    echo
    
    # Verificar que estamos en el directorio correcto
    if [ ! -f "package.json" ] && [ ! -d "backend" ] && [ ! -d "frontend" ]; then
        log_error "No se encontró la estructura de archivos de Silhouette."
        log_error "Asegúrate de ejecutar este script desde el directorio raíz del proyecto."
        exit 1
    fi
    
    # Ejecutar pasos de instalación
    check_system_dependencies
    install_backend_dependencies
    install_frontend_dependencies
    setup_environment
    create_directories
    check_file_structure
    generate_security_keys
    
    # Preguntar si iniciar servicios
    start_services
    
    # Mostrar próximos pasos
    show_next_steps
}

# Manejo de señales para cleanup
cleanup() {
    log_info "Interrumpido por el usuario. Limpiando..."
    # Aquí puedes agregar lógica de limpieza si es necesario
    exit 1
}

# Configurar trap para cleanup
trap cleanup INT TERM

# Ejecutar función principal
main "$@"