# 🎭 Silhouette Workflow Creation Platform

<div align="center">

![Silhouette Banner](https://via.placeholder.com/800x200/667eea/ffffff?text=Silhouette+Workflow+Creation+Platform)

**🤖 IA-Powered Workflow Creation Platform con Chat Inteligente**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-000000.svg)](https://nextjs.org/)

[🚀 Instalación Rápida](#-instalación-rápida) • [🎯 Características](#-características) • [👥 Sistema de Usuarios](#-sistema-de-usuarios) • [📚 Documentación](#-documentación) • [🆘 Soporte](#-soporte)

</div>

---

## 🎯 **¿Qué es Silhouette?**

**Silhouette** es una plataforma revolucionaria de creación de workflows impulsada por IA que permite a equipos y organizaciones crear, automatizar y optimizar procesos complejos mediante una interfaz de chat natural y módulos inteligentes.

### 🧠 **Inteligencia Artificial a tu Servicio**

Silhouette no es solo una herramienta, es tu **asistente inteligente con poder absoluto** en la aplicación. A través del chat flotante, puedes:

- 🗣️ **Comunicarte en lenguaje natural**: "Crea un workflow para procesar imágenes"
- 🤖 **Ejecutar comandos complejos**: Silhouette los interpreta y ejecuta
- ⚙️ **Gestionar todo el sistema**: Desde el chat sin necesidad de navegar
- 📊 **Obtener análisis en tiempo real**: Métricas y optimización automática

---

## 🚀 **Instalación Rápida**

### **Método 1: Script Automático (Recomendado)**

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/silhouette-workflow-creation.git
cd silhouette-workflow-creation

# Hacer ejecutable el script
chmod +x install.sh

# Ejecutar instalación automática
./install.sh
```

### **Método 2: Docker (Más Rápido)**

```bash
# Clonar y ejecutar con Docker
git clone https://github.com/tu-usuario/silhouette-workflow-creation.git
cd silhouette-workflow-creation

# Ejecutar con Docker Compose
docker-compose up -d

# O construir manualmente
docker build -t silhouette .
docker run -p 3000:3000 -p 3001:3001 silhouette
```

### **Método 3: Instalación Manual**

#### **Requisitos**
- Node.js 18+
- npm o yarn
- Git

#### **Backend**
```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus configuraciones
npm run dev
```

#### **Frontend**
```bash
cd frontend
npm install
cp .env.example .env
# Editar .env con tus configuraciones
npm start
```

---

## 📱 **Acceso Rápido**

1. **Abrir** http://localhost:3000 en tu navegador
2. **Registrar** el primer usuario (se convierte en Owner automático)
3. **¡Listo!** Comienza a usar Silhouette desde el chat flotante

---

## 🎯 **Características Principales**

### 🧠 **Silhouette AI - Tu Asistente Inteligente**

- **💬 Chat Flotante**: Comunicación natural en tiempo real
- **🧠 Procesamiento de Intenciones**: Entiende comandos complejos
- **🔧 Creación Automática**: Crea workflows, módulos y configuraciones
- **📊 Control Center**: Métricas y control total del sistema
- **⚡ Ejecución Inmediata**: Ejecuta tareas con un solo comando

### 🏗️ **Motor de Workflows**

- **🧩 Módulos Reutilizables**: Biblioteca de componentes inteligentes
- **🔄 Automatización Avanzada**: Orquestación de procesos complejos
- **📈 Optimización ML**: Mejora continua basada en machine learning
- **🔌 Integraciones**: APIs, bases de datos, servicios cloud
- **📱 API RESTful**: Interfaz completa para desarrollo

### 🔐 **Sistema de Usuarios Profesional**

- **👑 Owner Automático**: Primer usuario se convierte en owner permanente
- **📧 Invitaciones Controladas**: Solo owners/admins pueden invitar
- **🔒 JWT Authentication**: Tokens seguros y expiración
- **👥 Roles Granulares**: Owner > Admin > Member > Viewer
- **🔑 Gestión de Credenciales**: Almacenamiento seguro y encriptado

### 🎨 **Estudio Audiovisual**

- **🖼️ Generación de Imágenes**: IA para crear contenido visual
- **🎬 Producción de Videos**: Automatización de contenido multimedia
- **🎵 Procesamiento de Audio**: Análisis y generación de audio
- **📐 Diseño de Interfaces**: Componentes UI automatizados

---

## 👥 **Sistema de Usuarios**

### **Roles y Permisos**

| Rol | Permisos | Descripción |
|-----|----------|-------------|
| **👑 Owner** | Control Total | Primer usuario, no revocable, acceso completo |
| **👔 Admin** | Gestión Avanzada | Invitar usuarios, gestionar proyectos, configuraciones |
| **👤 Member** | Creación y Uso | Crear workflows, usar módulos, ejecución |
| **👁️ Viewer** | Solo Lectura | Ver workflows, métricas, no puede crear |

### **Primer Usuario - Owner Automático**

```
1. El primer usuario en registrarse se convierte automáticamente en Owner
2. El rol de Owner no puede ser revocado ni transferido
3. Solo el Owner puede cambiar roles de otros usuarios
4. Sistema similar a n8n para instalaciones self-hosted
```

### **Invitación de Colaboradores**

```bash
# Como Owner o Admin, ve a User Management
# Click "Invite User"
# Completa el formulario con:
- Email del nuevo usuario
- Nombre y apellido
- Rol deseado (Admin, Member, Viewer)

# El usuario recibe un enlace de invitación
# Complete el registro usando el token de invitación
# Token expira en 24h por seguridad
```

---

## 🏗️ **Arquitectura Técnica**

### **Stack Tecnológico**

#### **Backend**
- **Node.js 18+** - Runtime JavaScript
- **Express.js** - Framework web
- **TypeORM** - ORM para base de datos
- **SQLite/PostgreSQL** - Almacenamiento de datos
- **JWT** - Autenticación segura
- **bcrypt** - Hashing de contraseñas
- **WebSocket** - Comunicación en tiempo real

#### **Frontend**
- **Next.js 14+** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Styling utility-first
- **Shadcn/UI** - Componentes UI modernos
- **Socket.io** - WebSocket client
- **React Query** - Gestión de estado servidor

#### **Base de Datos**
- **SQLite** - Desarrollo y pequeñas instalaciones
- **PostgreSQL** - Producción y escalabilidad
- **Migraciones** - Esquema de BD versionado

### **Estructura del Proyecto**

```
silhouette-workflow-creation/
├── backend/                     # Servidor Node.js
│   ├── src/
│   │   ├── database/           # Modelos TypeORM
│   │   ├── routes/             # API endpoints
│   │   ├── middleware/         # Autenticación, validación
│   │   ├── services/           # Lógica de negocio
│   │   └── websocket/          # WebSocket handlers
│   ├── package.json
│   └── .env.example
├── frontend/                   # Aplicación Next.js
│   ├── src/
│   │   ├── components/         # Componentes React
│   │   │   ├── silhouette/     # Componentes Silhouette
│   │   │   ├── ui/            # Shadcn UI components
│   │   │   ├── workflows/     # Componentes de workflows
│   │   │   └── credentials/   # Gestión de credenciales
│   │   ├── hooks/             # Custom hooks
│   │   └── lib/               # Utilidades
│   ├── package.json
│   └── .env.example
├── docker-compose.yml         # Docker para instalación rápida
├── install.sh                 # Script instalación automática
├── Dockerfile                 # Container para producción
├── docs/                      # Documentación completa
└── README.md                  # Este archivo
```

---

## 📚 **Documentación Completa**

### **Guías de Usuario**
- [📖 Manual de Usuario](docs/USER_GUIDE.md) - Guía paso a paso para usuarios
- [🎯 Workflows Guide](docs/WORKFLOWS_GUIDE.md) - Creación y gestión de workflows
- [👥 User Management](docs/USER_MANAGEMENT.md) - Sistema de usuarios y permisos

### **Guías Técnicas**
- [🔧 Setup Development](docs/SETUP_DEVELOPMENT.md) - Configuración para desarrollo
- [🚀 Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - Despliegue en producción
- [🗄️ Database Schema](docs/DATABASE_SCHEMA.md) - Esquema de base de datos
- [🔌 API Reference](docs/API_REFERENCE.md) - Documentación completa de APIs

### **Documentación de Silhouette**
- [🧠 Silhouette AI Guide](docs/SILHOUETTE_AI_GUIDE.md) - Uso del asistente IA
- [💬 Chat Interface](docs/CHAT_INTERFACE.md) - Manual del chat flotante
- [⚙️ Control Center](docs/CONTROL_CENTER.md) - Centro de control y métricas

### **Seguridad y Configuración**
- [🔒 Security Guide](docs/SECURITY_GUIDE.md) - Mejores prácticas de seguridad
- [⚙️ Configuration](docs/CONFIGURATION.md) - Variables de entorno y configuración
- [🔑 Credential Management](docs/CREDENTIAL_MANAGEMENT.md) - Gestión de credenciales

---

## 🖼️ **Capturas de Pantalla**

### **Chat Flotante Silhouette**
![Chat Silhouette](docs/images/chat-interface.png)

### **Centro de Control**
![Control Center](docs/images/control-center.png)

### **Gestión de Workflows**
![Workflows](docs/images/workflows-interface.png)

### **Sistema de Usuarios**
![User Management](docs/images/user-management.png)

*Más capturas disponibles en `/docs/images/`*

---

## 🧪 **Ejemplos de Uso**

### **Crear un Workflow con Chat**
```
Usuario: "Crea un workflow para procesar imágenes y generar thumbnails"

Silhouette: 
✅ "Analizando tu solicitud..."
✅ "Creando workflow 'Image Processing'..."
✅ "Configurando módulos: Image Load, Resize, Optimize..."
✅ "Workflow creado exitosamente. ¿Deseas que lo ejecute ahora?"
```

### **Gestionar Credenciales**
```
Usuario: "Agrega las credenciales de OpenAI para generación de imágenes"

Silhouette:
✅ "Abriendo Secure Credentials Manager..."
✅ "Configurando credencial: OPENAI_API_KEY"
✅ "Validando conexión con OpenAI API..."
✅ "Credencial guardada de forma segura"
```

### **Análisis de Rendimiento**
```
Usuario: "Muéstrame las métricas de rendimiento del sistema"

Silhouette:
✅ "Obteniendo métricas en tiempo real..."
✅ "CPU: 45%, Memory: 62%, Throughput: 1,250/min"
✅ "Success Rate: 98.7% (últimas 24h)"
✅ "Recomendación: Sistema funcionando óptimamente"
```

---

## 🔧 **Comandos y APIs**

### **Chat Commands**
```javascript
// Crear workflow
"crea un workflow para procesar datos"

// Ejecutar tarea
"ejecuta el workflow de imágenes"

// Gestionar credenciales
"agrega credencial de AWS"

// Ver métricas
"muéstrame las métricas del sistema"
```

### **API Endpoints**
```bash
# Autenticación
POST /auth/register     # Registrar nuevo usuario
POST /auth/login        # Iniciar sesión
POST /auth/invite       # Invitar usuario (Admin+)

# Workflows
GET /api/workflows      # Listar workflows
POST /api/workflows     # Crear workflow
PUT /api/workflows/:id  # Actualizar workflow
DELETE /api/workflows/:id # Eliminar workflow

# Sistema
GET /api/silhouette/status    # Estado de Silhouette
GET /api/framework/metrics    # Métricas del sistema
POST /api/framework/command   # Ejecutar comando
```

---

## 🐳 **Docker y Despliegue**

### **Docker Compose**
```yaml
version: '3.8'
services:
  silhouette:
    build: .
    ports:
      - "3000:3000"  # Frontend
      - "3001:3001"  # Backend
    environment:
      - NODE_ENV=production
      - DATABASE_URL=sqlite:/data/silhouette.db
    volumes:
      - ./data:/data
    restart: unless-stopped
```

### **Deployment en Producción**
```bash
# Con Docker
docker-compose -f docker-compose.prod.yml up -d

# Sin Docker
git clone repo
cd silhouette-workflow-creation
npm install --production
npm run build
npm start
```

---

## 🤝 **Contribución**

### **Cómo Contribuir**
1. **Fork** el repositorio
2. **Crear** una rama para tu feature (`git checkout -b feature/nueva-caracteristica`)
3. **Commit** tus cambios (`git commit -am 'Agregar nueva característica'`)
4. **Push** a la rama (`git push origin feature/nueva-caracteristica`)
5. **Crear** un Pull Request

### **Guías de Desarrollo**
- [💻 Contributing Guide](docs/CONTRIBUTING.md)
- [🐛 Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md)
- [💡 Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md)

---

## 📄 **Licencia**

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

```
MIT License

Copyright (c) 2025 Silhouette Workflow Creation Platform

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🆘 **Soporte**

### **¿Necesitas Ayuda?**

- 📖 **Documentación**: Revisa la [documentación completa](docs/)
- 🐛 **Reportar Bugs**: [GitHub Issues](https://github.com/tu-usuario/silhouette-workflow-creation/issues)
- 💬 **Discusiones**: [GitHub Discussions](https://github.com/tu-usuario/silhouette-workflow-creation/discussions)
- 📧 **Email**: soporte@silhouette-platform.com

### **FAQ**

**¿Cómo instalar Silhouette?**
> Usa el script `./install.sh` o Docker con `docker-compose up -d`

**¿Qué hace diferente a Silhouette?**
> El chat flotante con IA que puede crear workflows y gestionar todo el sistema

**¿Es seguro para producción?**
> Sí, incluye autenticación JWT, encriptación, y sistema de roles

**¿Se puede personalizar?**
> Completamente, código abierto, APIs extensibles, arquitectura modular

---

## 🏆 **Características Destacadas**

### **🤖 Silhouette AI con Poder Absoluto**
- **Control Total**: Desde el chat puede hacer todo
- **IA Avanzada**: Procesamiento de lenguaje natural
- **Ejecución Automática**: Crea y ejecuta sin intervención manual
- **Optimización Continua**: Machine learning para mejorar procesos

### **💡 Innovación Técnica**
- **TypeScript**: Tipado estático para mayor confiabilidad
- **Real-time**: WebSocket para comunicación instantánea
- **Escalable**: Arquitectura que crece con tu organización
- **Modular**: Componentes reutilizables y extensibles

### **🔒 Seguridad Empresarial**
- **Autenticación Robusta**: JWT con refresh tokens
- **Encriptación**: bcrypt para contraseñas y credenciales
- **Roles Granulares**: Control de acceso detallado
- **Tokens de Invitación**: Expiración automática y segura

### **🚀 Instalación Súper Fácil**
- **Un Solo Comando**: `./install.sh` configura todo
- **Docker Ready**: Despliegue en contenedores
- **Auto-setup**: Instala dependencias, configura BD, crea directorios
- **Self-hosted**: Control completo de tus datos

---

<div align="center">

## 🌟 **¡Únete a la Revolución de los Workflows con IA!**

**Silhouette** no es solo una herramienta, es el futuro de la automatización empresarial.

### [🚀 Instalar Ahora](https://github.com/tu-usuario/silhouette-workflow-creation) | [📖 Documentación](docs/) | [💬 Demo](https://demo.silhouette-platform.com)

---

**Desarrollado con ❤️ por el equipo de Silhouette**

*Version 4.0 Enterprise - Enero 2025*

</div>
