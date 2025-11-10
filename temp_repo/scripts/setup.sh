#!/bin/bash

# ==================================================
# SILHOUETTE WORKFLOW CREATION - Setup Script
# ==================================================
# Script de inicialización rápida del proyecto
# Autor: Silhouette Anonimo
# Versión: 1.0.0

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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

# Función para verificar puertos
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null; then
        print_colored $YELLOW "⚠️ Puerto $1 está en uso"
        return 1
    else
        print_colored $GREEN "✅ Puerto $1 disponible"
        return 0
    fi
}

# Banner inicial
print_colored $PURPLE "
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        🎉 Silhouette Workflow Creation Setup 🎉              ║
║                                                              ║
║     La próxima generación de automatización empresarial     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
"

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

# Verificar versiones
print_colored $BLUE "📊 Verificando versiones..."

# Node.js
node_version=$(node --version | sed 's/v//')
required_node="18.0.0"
if [ "$(printf '%s\n' "$required_node" "$node_version" | sort -V | head -n1)" = "$required_node" ]; then
    print_colored $GREEN "✅ Node.js $node_version (versión requerida: $required_node+)"
else
    print_colored $RED "❌ Node.js $node_version es menor que $required_node"
    exit 1
fi

# Docker
docker_version=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
print_colored $GREEN "✅ Docker $docker_version"

# Verificar puertos
print_colored $BLUE "🔌 Verificando puertos..."
ports=(3000 3001 3002 5432 6379 7687 5672)
ports_in_use=()

for port in "${ports[@]}"; do
    if ! check_port $port; then
        ports_in_use+=($port)
    fi
done

if [ ${#ports_in_use[@]} -ne 0 ]; then
    print_colored $YELLOW "⚠️ Los siguientes puertos están en uso: ${ports_in_use[*]}"
    read -p "¿Continuar de todos modos? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_colored $RED "❌ Setup cancelado por el usuario"
        exit 1
    fi
fi

# Crear archivos de entorno
print_colored $BLUE "⚙️ Configurando variables de entorno..."

if [ ! -f .env ]; then
    cp .env.example .env
    print_colored $GREEN "✅ Archivo .env creado desde .env.example"
    print_colored $YELLOW "📝 Revisa y ajusta las variables en .env según tu configuración"
else
    print_colored $YELLOW "⚠️ El archivo .env ya existe, no se sobrescribió"
fi

# Verificar estructura de directorios
print_colored $BLUE "📁 Verificando estructura de directorios..."

required_dirs=("frontend" "backend" "database" "config" "scripts")
for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        print_colored $GREEN "✅ Directorio $dir existe"
    else
        print_colored $RED "❌ Directorio $dir no encontrado"
        exit 1
    fi
done

# Configurar permisos
print_colored $BLUE "🔐 Configurando permisos..."
chmod +x scripts/*.sh 2>/dev/null || true
chmod +x scripts/wait-for-it.sh 2>/dev/null || true
print_colored $GREEN "✅ Permisos configurados"

# Instalar dependencias del frontend
print_colored $BLUE "📦 Instalando dependencias del frontend..."
cd frontend
if npm install; then
    print_colored $GREEN "✅ Dependencias del frontend instaladas"
else
    print_colored $RED "❌ Error instalando dependencias del frontend"
    exit 1
fi
cd ..

# Instalar dependencias del backend
print_colored $BLUE "📦 Instalando dependencias del backend..."
cd backend
if npm install; then
    print_colored $GREEN "✅ Dependencias del backend instaladas"
else
    print_colored $RED "❌ Error instalando dependencias del backend"
    exit 1
fi
cd ..

# Levantar servicios con Docker
print_colored $BLUE "🐳 Levantando servicios con Docker..."

if docker-compose up -d --build; then
    print_colored $GREEN "✅ Servicios de Docker iniciados"
else
    print_colored $RED "❌ Error iniciando servicios de Docker"
    exit 1
fi

# Esperar a que los servicios estén listos
print_colored $BLUE "⏳ Esperando a que los servicios estén listos..."
sleep 10

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

# Ejecutar migraciones de base de datos
print_colored $BLUE "🗄️ Ejecutando migraciones de base de datos..."
cd backend
if npm run migrate; then
    print_colored $GREEN "✅ Migraciones ejecutadas"
else
    print_colored $RED "❌ Error ejecutando migraciones"
fi
cd ..

# Mostrar información final
print_colored $GREEN "
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              🎉 Setup completado exitosamente! 🎉            ║
║                                                              ║
║  📊 Frontend: http://localhost:3000                         ║
║  🔌 Backend API: http://localhost:3001                      ║
║  💓 Health Check: http://localhost:3001/health              ║
║  📊 Grafana: http://localhost:3003                          ║
║  🗄️ Neo4j: http://localhost:7474                           ║
║  🐰 RabbitMQ: http://localhost:15672                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
"

# Mostrar siguientes pasos
print_colored $BLUE "
🚀 SIGUIENTES PASOS:

1. 🌐 Abre tu navegador en http://localhost:3000
2. 📝 Regístrate o inicia sesión
3. 🎨 Crea tu primer workflow
4. 🤖 Prueba la IA para generar workflows
5. 👥 Invita colaboradores para trabajar juntos

📖 DOCUMENTACIÓN:
   - README.md: Documentación principal
   - docs/: Documentación técnica completa
   - .env: Configuración de variables de entorno

🔧 COMANDOS ÚTILES:
   - docker-compose logs -f: Ver logs en tiempo real
   - docker-compose restart: Reiniciar servicios
   - npm run dev: Ejecutar en modo desarrollo
   - npm test: Ejecutar tests

🆘 SOPORTE:
   - GitHub Issues: Para reportar bugs
   - Discord: Comunidad de desarrollo
   - Email: support@silhouette.com

¡Disfruta creando workflows increíbles! 🚀
"

# Preguntar si quiere iniciar los servicios de desarrollo
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
¡Gracias por usar Silhouette Workflow Creation! 🎉
"