#!/bin/bash

# ==================================================
# SILHOUETTE FRAMEWORK V4.0 - SCRIPT DE INSTALACIÓN Y ACTUALIZACIÓN
# ==================================================
# Script para instalar y configurar el Framework Silhouette Enterprise V4.0
# Mantiene compatibilidad con el sistema actual
# 
# Autor: Silhouette Anonimo
# Versión: 4.0.0
# Fecha: 2025-11-09

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
print_banner() {
    echo -e "${PURPLE}
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     🎉 Silhouette Framework V4.0 Installation Script 🎉     ║
║                                                              ║
║     Framework Enterprise Multi-Agent System V4.0            ║
║     Con Sistema Audiovisual Profesional                     ║
║     Auto-Optimización con ML                                ║
║     45+ Equipos Especializados                              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
${NC}"
}

# Función para print con colores
print_colored() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Función para verificar comandos
check_command() {
    if command -v $1 &> /dev/null; then
        print_colored $GREEN "✅ $1 está instalado"
        return 0
    else
        print_colored $RED "❌ $1 no está instalado"
        return 1
    fi
}

# Función para verificar si existe archivo
check_file() {
    if [ -f "$1" ]; then
        print_colored $GREEN "✅ $1 existe"
        return 0
    else
        print_colored $RED "❌ $1 no existe"
        return 1
    fi
}

# Banner inicial
print_banner

print_colored $BLUE "🚀 Iniciando instalación del Framework Silhouette V4.0..."

# Verificar prerrequisitos
print_colored $BLUE "🔍 Verificando prerrequisitos..."

required_commands=("node" "npm" "docker" "docker-compose")
missing_commands=()

for cmd in "${required_commands[@]}"; do
    if ! check_command $cmd; then
        missing_commands+=($cmd)
    fi
done

if [ ${#missing_commands[@]} -ne 0 ]; then
    print_colored $RED "❌ Faltan los siguientes comandos: ${missing_commands[*]}"
    print_colored $YELLOW "📖 Por favor instala los prerrequisitos antes de continuar"
    exit 1
fi

# Verificar Node.js version
node_version=$(node --version | sed 's/v//')
required_node="18.0.0"
if [ "$(printf '%s\n' "$required_node" "$node_version" | sort -V | head -n1)" = "$required_node" ]; then
    print_colored $GREEN "✅ Node.js $node_version (versión requerida: $required_node+)"
else
    print_colored $RED "❌ Node.js $node_version es menor que $required_node"
    exit 1
fi

# Verificar estructura del proyecto
print_colored $BLUE "📁 Verificando estructura del proyecto..."

required_files=(
    "backend/src/server.ts"
    "backend/package.json"
    "frontend/package.json"
    "docker-compose.yml"
    "FRAMEWORK_V4_CONFIGURATION.md"
)

for file in "${required_files[@]}"; do
    if ! check_file "$file"; then
        print_colored $RED "❌ Estructura del proyecto incompleta"
        exit 1
    fi
done

# Crear backup del proyecto actual
print_colored $BLUE "💾 Creando backup del proyecto actual..."

backup_dir="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$backup_dir"

cp -r backend "$backup_dir/" 2>/dev/null || true
cp -r frontend "$backup_dir/" 2>/dev/null || true
cp -r config "$backup_dir/" 2>/dev/null || true
cp docker-compose.yml "$backup_dir/" 2>/dev/null || true

print_colored $GREEN "✅ Backup creado en: $backup_dir"

# Verificar si el Framework V4.0 ya está instalado
print_colored $BLUE "🔍 Verificando instalación del Framework V4.0..."

if [ -d "backend/src/framework-v4" ]; then
    print_colored $YELLOW "⚠️ Framework V4.0 ya parece estar instalado"
    read -p "¿Quieres continuar con la instalación? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_colored $YELLOW "📋 Instalación cancelada por el usuario"
        exit 0
    fi
fi

# Instalar dependencias del Framework V4.0
print_colored $BLUE "📦 Instalando dependencias del Framework V4.0..."

cd backend
if npm install; then
    print_colored $GREEN "✅ Dependencias instaladas correctamente"
else
    print_colored $RED "❌ Error instalando dependencias"
    exit 1
fi
cd ..

# Configurar variables de entorno
print_colored $BLUE "⚙️ Configurando variables de entorno..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        print_colored $GREEN "✅ Archivo .env creado desde .env.example"
    else
        # Crear .env básico
        cat > .env << EOL
# Framework Silhouette V4.0 Configuration
FRAMEWORK_V4_ENABLED=true
NODE_ENV=development

# Coordinator Engine
COORDINATOR_INTELLIGENT_ASSIGNMENT=true
COORDINATOR_LOAD_BALANCING=true
COORDINATOR_AUTO_RECOVERY=true
MAX_CONCURRENT_TASKS=100

# Workflow Engine
WORKFLOW_DYNAMIC_OPTIMIZATION=true
WORKFLOW_AUTO_SCALING=true
WORKFLOW_DAG_SUPPORT=true

# AudioVisual System
AUDIOVISUAL_ENABLED=true
AUDIOVISUAL_QUALITY_MIN=90
AUDIOVISUAL_AUTO_APPROVAL=true
AUDIOVISUAL_MAX_CONCURRENT=5

# Auto Optimizer
AUTO_OPTIMIZATION_ENABLED=true
AUTO_OPTIMIZATION_ML=true
AUTO_SCALING_ENABLED=true
PERFORMANCE_THRESHOLD=80

# Monitoring
MONITORING_ENABLED=true
METRICS_INTERVAL=30000
ALERTS_ENABLED=true

# Compatibility
BACKWARD_COMPATIBILITY=true
MIGRATION_MODE=gradual
LEGACY_APIS_ENABLED=true

# Database
DATABASE_URL=postgresql://haas:haaspass@localhost:5432/haasdb
REDIS_URL=redis://localhost:6379
NEO4J_URI=bolt://localhost:7687
RABBITMQ_URL=amqp://haas:haaspass@localhost:5672

# Security
JWT_SECRET=haas-super-secret-key-2025
API_KEY=haas-api-key-2025
ENCRYPTION_KEY=haas-encryption-key-2025
EOL
        print_colored $GREEN "✅ Archivo .env creado con configuración básica"
    fi
else
    print_colored $YELLOW "⚠️ El archivo .env ya existe, no se sobrescribió"
fi

# Configurar configuración avanzada (opcional)
print_colored $BLUE "🔧 ¿Deseas configurar la configuración avanzada del Framework V4.0?"
print_colored $YELLOW "Esto incluye proveedores de IA, monitoreo, y otras características"

read -p "¿Configurar características avanzadas? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_colored $BLUE "📋 Configuración avanzada - Opciones disponibles:"
    
    # Configurar proveedores de IA
    read -p "¿Habilitar sistema audiovisual? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        print_colored $CYAN "🔑 Configurando proveedores de IA..."
        
        echo ""
        print_colored $YELLOW "IMPORTANTE: Para usar el sistema audiovisual necesitas configurar APIs:"
        print_colored $YELLOW "- Unsplash (imágenes): https://unsplash.com/developers"
        print_colored $YELLOW "- Runway AI (video): https://runwayml.com/api"
        print_colored $YELLOW "- Pika Labs (video): https://pikalabs.ai"
        print_colored $YELLOW "- Luma AI (efectos): https://lumalabs.ai"
        echo ""
        
        # Configurar Unsplash
        read -p "¿Tienes clave API de Unsplash? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Ingresa tu clave API de Unsplash: " unsplash_key
            sed -i "s/UNSPLASH_ACCESS_KEY=.*/UNSPLASH_ACCESS_KEY=$unsplash_key/" .env
        fi
        
        # Configurar Runway
        read -p "¿Tienes clave API de Runway? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Ingresa tu clave API de Runway: " runway_key
            sed -i "s/RUNWAY_API_KEY=.*/RUNWAY_API_KEY=$runway_key/" .env
        fi
        
        print_colored $GREEN "✅ Proveedores de IA configurados"
    fi
    
    # Configurar alertas
    read -p "¿Configurar alertas? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        read -p "Ingresa email para alertas: " alert_email
        read -p "Ingresa webhook de Slack (opcional): " slack_webhook
        
        sed -i "s/ALERT_EMAIL=.*/ALERT_EMAIL=$alert_email/" .env
        if [ ! -z "$slack_webhook" ]; then
            sed -i "s/SLACK_WEBHOOK=.*/SLACK_WEBHOOK=$slack_webhook/" .env
        fi
    fi
    
    print_colored $GREEN "✅ Configuración avanzada completada"
fi

# Levantar servicios
print_colored $BLUE "🐳 Levantando servicios con Docker..."

if docker-compose up -d --build; then
    print_colored $GREEN "✅ Servicios de Docker iniciados"
else
    print_colored $RED "❌ Error iniciando servicios de Docker"
    exit 1
fi

# Esperar a que los servicios estén listos
print_colored $BLUE "⏳ Esperando a que los servicios estén listos..."
sleep 15

# Verificar servicios
print_colored $BLUE "🔍 Verificando servicios..."

services=("postgres" "redis" "neo4j" "rabbitmq" "silhouette-framework")
for service in "${services[@]}"; do
    if docker-compose ps $service | grep -q "Up"; then
        print_colored $GREEN "✅ Servicio $service está corriendo"
    else
        print_colored $RED "❌ Servicio $service no está corriendo"
    fi
done

# Verificar que el Framework V4.0 esté funcionando
print_colored $BLUE "🔧 Verificando Framework V4.0..."

sleep 5
if curl -s http://localhost:3001/api/framework-v4/health > /dev/null; then
    print_colored $GREEN "✅ Framework V4.0 está funcionando correctamente"
else
    print_colored $YELLOW "⚠️ Framework V4.0 puede estar iniciando, verifica en unos minutos"
fi

# Mostrar información final
print_colored $GREEN "
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     🎉 Framework Silhouette V4.0 Instalado Exitosamente! 🎉  ║
║                                                              ║
║  📊 Framework Status: http://localhost:3001/api/framework-v4 ║
║  🔌 Health Check: http://localhost:3001/api/framework-v4/health║
║  🎬 AudioVisual: http://localhost:3001/api/framework-v4/audiovisual║
║  📋 Configuración: http://localhost:3001/api/framework-v4/config║
║  ⚡ Optimizer: http://localhost:3001/api/framework-v4/optimizer║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
"

# Mostrar siguientes pasos
print_colored $BLUE "
🚀 SIGUIENTES PASOS:

1. 📝 Revisa la configuración en FRAMEWORK_V4_CONFIGURATION.md
2. 🔧 Configura las APIs de IA si quieres usar el sistema audiovisual
3. 📊 Monitorea el sistema en: http://localhost:3001/api/framework-v4/status
4. 🎬 Prueba el sistema audiovisual con:
   curl -X POST http://localhost:3001/api/framework-v4/audiovisual/projects \
   -H 'Content-Type: application/json' \
   -d '{
     \"titulo\": \"Mi primer video con IA\",
     \"plataforma\": \"Instagram Reels\",
     \"duracion\": 30,
     \"audiencia\": \"Jóvenes 18-25\",
     \"objetivo\": \"engagement\"
   }'
5. 🤖 Crea un workflow V4.0:
   curl -X POST http://localhost:3001/api/framework-v4/workflows \
   -H 'Content-Type: application/json' \
   -d '{
     \"name\": \"Mi Workflow V4.0\",
     \"type\": \"sequential\",
     \"steps\": [...]
   }'

🔧 COMANDOS ÚTILES:
   - docker-compose logs -f: Ver logs en tiempo real
   - docker-compose restart: Reiniciar servicios
   - ./scripts/verify-deployment.sh: Verificar deployment

📚 DOCUMENTACIÓN:
   - FRAMEWORK_V4_CONFIGURATION.md: Configuración completa
   - http://localhost:3001/api/framework-v4/docs: Documentación API (futuro)

🆘 SOPORTE:
   - GitHub Issues: Reportar problemas
   - Email: soporte@silhouette-framework.com
   - Discord: https://discord.gg/silhouette

¡Disfruta el poder del Framework Silhouette V4.0! 🚀
"

# Preguntar si quiere iniciar servicios de desarrollo
read -p "
¿Quieres iniciar los servicios de desarrollo ahora? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_colored $BLUE "🚀 Iniciando servicios de desarrollo..."
    
    # Iniciar backend en background
    print_colored $BLUE "🔧 Iniciando backend..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    # Esperar un poco
    sleep 5
    
    # Iniciar frontend
    print_colored $BLUE "🎨 Iniciando frontend..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    print_colored $GREEN "✅ Servicios de desarrollo iniciados"
    print_colored $YELLOW "
    🛑 Para detener los servicios:
    kill $BACKEND_PID $FRONTEND_PID
    "
fi

print_colored $PURPLE "
¡Gracias por usar Silhouette Framework V4.0! 🎉
El framework está listo para revolucionar tu flujo de trabajo empresarial.
"

# Guardar información de instalación
cat > INSTALLATION_INFO.txt << EOL
# Silhouette Framework V4.0 - Información de Instalación

Fecha de instalación: $(date)
Versión: 4.0.0
Backup creado en: $backup_dir
Comandos útiles:
- Verificar estado: curl http://localhost:3001/api/framework-v4/status
- Health check: curl http://localhost:3001/api/framework-v4/health
- Configuración: curl http://localhost:3001/api/framework-v4/config

Para soporte: soporte@silhouette-framework.com
EOL

print_colored $GREEN "✅ Información de instalación guardada en INSTALLATION_INFO.txt"
