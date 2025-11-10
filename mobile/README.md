# Silhouette Workflow - Aplicación Móvil 📱

![React Native](https://img.shields.io/badge/React_Native-0.72.0-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-4.8.4-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Redux](https://img.shields.io/badge/Redux-8.1.2-764ABC?style=for-the-badge&logo=redux&logoColor=white)

## 🚀 Descripción

Silhouette Workflow es una aplicación móvil nativa desarrollada con React Native que permite gestionar y ejecutar workflows automatizados de forma inteligente. La aplicación ofrece una interfaz moderna e intuitiva para crear, editar y monitorear procesos automatizados con capacidades avanzadas de IA.

## ✨ Características Principales

### 🔐 Autenticación y Seguridad
- Login/Registro con validación completa
- Autenticación JWT con refresh automático
- Autenticación biométrica (fingerprint/Face ID)
- Gestión segura de credenciales con cifrado

### 🔄 Gestión de Workflows
- Editor visual de workflows para móvil
- Creación de workflows mediante plantillas
- Ejecución manual y programada
- Monitoreo en tiempo real del estado
- Historial completo de ejecuciones

### 🤖 Inteligencia Artificial
- Centro de IA integrado
- Optimización automática de workflows
- Recomendaciones inteligentes
- Análisis predictivo de rendimiento
- Auto-scaling inteligente

### 📱 Experiencia Móvil
- Interfaz optimizada para dispositivos móviles
- Navegación por tabs y drawer
- Notificaciones push en tiempo real
- Funcionamiento offline completo
- Sincronización automática

### 💾 Gestión Offline
- Almacenamiento local con MMKV
- Cola de sincronización
- Ejecución de workflows sin conexión
- Recuperación automática de red

## 🛠️ Tecnologías Utilizadas

### Core
- **React Native**: 0.72.0
- **TypeScript**: Para type safety
- **Redux Toolkit**: Gestión de estado
- **React Navigation**: Navegación

### Backend Integration
- **Axios**: Cliente HTTP
- **React Query**: Data fetching y cache
- **Socket.io**: Comunicación en tiempo real

### Almacenamiento
- **MMKV**: Almacenamiento rápido
- **AsyncStorage**: Persistencia local
- **Redux Persist**: Sincronización de estado

### UI/UX
- **React Native Paper**: Material Design
- **React Native Vector Icons**: Iconografía
- **React Native Reanimated**: Animaciones
- **React Native Gesture Handler**: Gestos

### Notificaciones
- **Expo Notifications**: Push notifications
- **FCM**: Firebase Cloud Messaging
- **APNs**: Apple Push Notification service

### Offline & Sync
- **React Native NetInfo**: Detección de red
- **Background Sync**: Sincronización en background

## 📋 Requisitos Previos

### Desarrollo
- Node.js 18+
- React Native CLI
- Xcode (iOS)
- Android Studio (Android)
- Java JDK 11+

### Servicios Requeridos
- Firebase Project (para notificaciones)
- Cuenta de Apple Developer
- Cuenta de Google Play Developer
- Backend API configurado

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone https://github.com/silhouette-workflow/mobile.git
cd mobile
```

### 2. Instalar Dependencias
```bash
# Instalar dependencias de Node.js
npm install

# Instalar pods de iOS (solo macOS)
cd ios && pod install && cd ..

# O usar yarn
yarn install
```

### 3. Configurar Variables de Entorno
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar variables según tu entorno
```

```env
# API Configuration
API_BASE_URL=http://localhost:3000/api
API_VERSION=v1

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key
FIREBASE_APP_ID=your-app-id

# iOS Configuration
IOS_BUNDLE_ID=com.silhouette.workflow
IOS_DISPLAY_NAME=Silhouette Workflow

# Android Configuration
ANDROID_PACKAGE_NAME=com.silhouetteworkflow
ANDROID_DISPLAY_NAME=Silhouette Workflow
```

### 4. Configurar Firebase
1. Crear proyecto en [Firebase Console](https://console.firebase.google.com)
2. Descargar configuraciones:
   - `ios/GoogleService-Info.plist`
   - `android/app/google-services.json`

### 5. Configurar Iconos y Splash Screen
```bash
# Generar iconos automáticamente
npx react-native-set-icon --path ./assets/icon.png

# Generar splash screen
npx react-native-bootsplash generate
```

## 🏃‍♂️ Ejecutar en Desarrollo

### iOS
```bash
# En simulador
npx react-native run-ios

# En dispositivo físico
npx react-native run-ios --device

# Con configuración específica
npx react-native run-ios --configuration Release
```

### Android
```bash
# En emulador
npx react-native run-android

# En dispositivo específico
npx react-native run-android --deviceId <device_id>

# Con gradle task específico
cd android && ./gradlew app:assembleDebug
```

### Modo Debug
```bash
# Habilitar Debug Mode
export DEBUG=1
npx react-native run-ios

# Debug en Android
npx react-native run-android --variant=debug
```

## 🏗️ Estructura del Proyecto

```
mobile/
├── src/                          # Código fuente principal
│   ├── components/               # Componentes reutilizables
│   │   ├── ui/                  # Componentes de UI
│   │   ├── navigation/          # Componentes de navegación
│   │   └── forms/               # Componentes de formularios
│   ├── screens/                 # Pantallas de la aplicación
│   │   ├── auth/               # Autenticación
│   │   ├── dashboard/          # Dashboard principal
│   │   ├── workflows/          # Gestión de workflows
│   │   ├── ai/                 # Centro de IA
│   │   ├── credentials/        # Gestión de credenciales
│   │   └── profile/            # Perfil de usuario
│   ├── services/               # Servicios y APIs
│   │   ├── api.js             # Cliente API
│   │   ├── NotificationService.js
│   │   └── SyncService.js
│   ├── store/                  # Redux store
│   │   ├── slices/            # Redux slices
│   │   └── index.js           # Configuración del store
│   ├── contexts/              # React contexts
│   │   └── AuthContext.js
│   ├── config/                # Configuraciones
│   │   ├── api.js            # Configuración API
│   │   └── i18n.js           # Internacionalización
│   ├── theme/                # Tema y estilos
│   │   └── index.js
│   └── navigation/            # Configuración navegación
├── assets/                    # Assets estáticos
│   ├── images/               # Imágenes
│   ├── icons/                # Iconos
│   └── fonts/                # Fuentes
├── docs/                     # Documentación
│   ├── deployment-guide.md
│   └── troubleshooting.md
├── android/                  # Configuración Android
│   ├── app/
│   │   ├── build.gradle     # Configuración de build
│   │   └── src/main/        # Código nativo Android
│   └── build.gradle         # Configuración de proyecto
├── ios/                      # Configuración iOS
│   ├── SilhouetteWorkflow/  # Código nativo iOS
│   └── Podfile              # Dependencias CocoaPods
└── __tests__/                # Tests unitarios
```

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests con coverage
npm run test:coverage

# Tests específicos
npm test -- --testNamePattern="Auth"

# Linting
npm run lint

# Linting con fix
npm run lint:fix
```

## 📦 Building para Producción

### iOS
```bash
# Build para producción
npx react-native build-ios --mode=release

# Generar IPA
cd ios
xcodebuild -workspace SilhouetteWorkflow.xcworkspace \
  -scheme SilhouetteWorkflow \
  -configuration Release \
  -archivePath SilhouetteWorkflow.xcarchive \
  archive

# O usando Fastlane
fastlane ios release
```

### Android
```bash
# APK para testing
cd android
./gradlew assembleRelease

# AAB para Google Play (recomendado)
./gradlew bundleRelease

# O usando Fastlane
fastlane android release
```

## 🚀 Deployment

### Automatización con Fastlane

```bash
# iOS TestFlight
fastlane ios beta

# Android Internal Testing
fastlane android beta

# iOS App Store
fastlane ios release

# Android Google Play
fastlane android release
```

### CI/CD

El proyecto incluye configuraciones para:
- **GitHub Actions**: Pipeline automatizado
- **Bitrise**: Build y deployment automatizado
- **CodeMagic**: CI/CD específico para Flutter/React Native

## 📊 Monitoreo y Analytics

### Configuración de Crashlytics
```bash
# iOS
npx react-native add @react-native-firebase/app
npx react-native add @react-native-firebase/crashlytics

# Android
npx react-native add @react-native-firebase/app
npx react-native add @react-native-firebase/crashlytics
```

### Analytics
```bash
# Firebase Analytics
npx react-native add @react-native-firebase/analytics

# Mixpanel (alternativa)
npm install react-native-mixpanel
```

## 🐛 Troubleshooting

### Problemas Comunes

#### Build Fails - iOS
```bash
# Limpiar cache
cd ios && rm -rf build
npx react-native run-ios --reset-cache
```

#### Build Fails - Android
```bash
# Limpiar gradle
cd android
./gradlew clean
npx react-native run-android --reset-cache
```

#### Metro Bundler Issues
```bash
# Resetear Metro cache
npx react-native start --reset-cache
```

### Debugging

#### Debug en iOS
```bash
# Debug mode
npx react-native log-ios

# Debug con Safari
open -a Safari /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app
```

#### Debug en Android
```bash
# Debug logs
npx react-native log-android

# Debug con Chrome
npx react-native run-android --debug
```

## 📚 Documentación Adicional

- [Guía de Deployment](docs/deployment-guide.md)
- [Guía de Troubleshooting](docs/troubleshooting.md)
- [API Documentation](docs/api.md)
- [UI Components Guide](docs/components.md)

## 🤝 Contribución

1. Fork el proyecto
2. Crear branch para feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Equipo

- **Desarrollo Principal**: Silhouette Development Team
- **UI/UX Design**: Design Team
- **DevOps**: Infrastructure Team
- **QA**: Quality Assurance Team

## 📞 Soporte

- **Email**: support@silhouette-workflow.com
- **Discord**: [Silhouette Community](https://discord.gg/silhouette)
- **Issues**: [GitHub Issues](https://github.com/silhouette-workflow/mobile/issues)
- **Wiki**: [Documentación Completa](https://github.com/silhouette-workflow/wiki)

## 🗓️ Roadmap

### Q1 2025
- [ ] Integración con más servicios de terceros
- [ ] Widgets de iOS/Android
- [ ] Apple Watch companion app
- [ ] Mejoras de performance

### Q2 2025
- [ ] Mac Catalyst support
- [ ] Funcionalidad offline avanzada
- [ ] Machine Learning en-device
- [ ] Integración con Shortcuts (iOS)

### Q3 2025
- [ ] Cross-platform con Flutter (opcional)
- [ ] Web companion
- [ ] Advanced analytics dashboard
- [ ] Enterprise features

---

**Silhouette Workflow Mobile** - Automatización inteligente en tus manos 📱✨