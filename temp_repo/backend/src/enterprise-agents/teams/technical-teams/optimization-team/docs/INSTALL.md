# Framework Silhouette V4.0 - Documentación de Instalación

## Requisitos

- **Node.js**: Versión 14.0.0 o superior
- **npm**: Versión 6.0.0 o superior (incluido con Node.js)

## Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/haroldfabla2-hue/framework-silhouette-v4.git
cd framework-silhouette-v4
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Ejecutar el Framework

#### Modo Desarrollo
```bash
npm run dev
```

#### Modo Producción
```bash
npm start
```

## Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm start` | Inicia el framework en modo producción |
| `npm test` | Ejecuta la suite de pruebas enhanced |
| `npm run demo` | Ejecuta la demo de auto-optimización |
| `npm run demo:dynamic` | Ejecuta la demo de workflows dinámicos |
| `npm run test:integration` | Ejecuta pruebas de integración |
| `npm run test:phase3` | Ejecuta pruebas de la fase 3 |
| `npm run test:all` | Ejecuta todas las pruebas |
| `npm run dev` | Modo desarrollo con tests simples |

## Configuración

El framework se puede configurar mediante el objeto `config` en `index.js`:

```javascript
this.config = {
    autoStart: true,           // Inicio automático
    monitoringInterval: 30000, // 30 segundos
    reportInterval: 300000,    // 5 minutos
    logLevel: 'info'           // debug, info, warn, error
};
```

## Estructura del Proyecto

```
framework-silhouette-v4/
├── index.js                      # Entry point principal
├── package.json                  # Configuración npm
├── README.md                     # Documentación principal
├── LICENSE                       # Licencia MIT
├── CHANGELOG.md                  # Historial de cambios
├── .gitignore                    # Archivos ignorados por git
├── docs/                         # Documentación adicional
│   ├── INSTALL.md                # Esta guía
│   ├── API.md                    # Documentación de API
│   └── ARCHITECTURE.md           # Arquitectura del sistema
├── ai/                           # Modelos de AI/ML
├── methodologies/                # Metodologías de optimización
├── metrics/                      # Sistema de métricas
├── monitoring/                   # Monitoreo en tiempo real
├── team-workflows/               # Workflows de equipos
│   ├── phase3/                   # Equipos de la fase 3
│   └── [equipos individuales]    # Equipos principales
└── workflows/                    # Motor de workflows
```

## Primeros Pasos

1. **Ejecutar las pruebas**: `npm test`
2. **Ver la demo**: `npm run demo`
3. **Iniciar el framework**: `npm start`
4. **Monitorear logs**: Revisar la consola para métricas en tiempo real

## Solución de Problemas

### Error: "Cannot find module"
```bash
npm install
```

### Error: "Permission denied"
```bash
chmod +x index.js
```

### Logs de Debug
Para activar logs detallados:
```javascript
// En index.js, cambiar:
logLevel: 'debug'
```

## Soporte

Para reportar issues o solicitar features:
- **Issues**: https://github.com/haroldfabla2-hue/framework-silhouette-v4/issues
- **Documentación**: Ver carpeta `docs/`
- **Tests**: Ejecutar `npm test` para verificar funcionalidad