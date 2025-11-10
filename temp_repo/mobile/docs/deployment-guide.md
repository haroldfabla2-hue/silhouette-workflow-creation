# Guías de Despliegue - Silhouette Workflow Mobile

Esta guía proporciona instrucciones detalladas para compilar, configurar y desplegar la aplicación móvil Silhouette Workflow en iOS y Android.

## Tabla de Contenidos

1. [Prerrequisitos](#prerrequisitos)
2. [Configuración del Entorno](#configuración-del-entorno)
3. [Configuración de iOS](#configuración-de-ios)
4. [Configuración de Android](#configuración-de-android)
5. [Compilación de Producción](#compilación-de-producción)
6. [Despliegue en App Store](#despliegue-en-app-store)
7. [Despliegue en Google Play](#despliegue-en-google-play)
8. [Configuración de CI/CD](#configuración-de-cicd)
9. [Troubleshooting](#troubleshooting)

## Prerrequisitos

### Requisitos de Sistema

- **Node.js**: Versión 18 o superior
- **React Native CLI**: Versión más reciente
- **Xcode**: Versión 14.0 o superior (para iOS)
- **Android Studio**: Versión más reciente (para Android)
- **Java**: JDK 11 o superior
- **Git**: Para control de versiones

### Servicios Requeridos

- **Apple Developer Account**: Para distribución en App Store
- **Google Play Developer Account**: Para distribución en Google Play
- **Firebase Project**: Para notificaciones push y analytics
- **Fastlane**: Para automatización de builds

## Configuración del Entorno

### 1. Instalación de Dependencias

```bash
# Instalar dependencias de Node.js
npm install

# Instalar pods de iOS
cd ios && pod install

# Instalar Fastlane
gem install fastlane

# O usando Bundler
bundle install
```

### 2. Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# API Configuration
API_BASE_URL=https://api.silhouette-workflow.com
API_VERSION=v1

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key
FIREBASE_APP_ID=your-app-id

# iOS Configuration
IOS_BUNDLE_ID=com.silhouette.workflow
IOS_DISPLAY_NAME=Silhouette Workflow
IOS_VERSION=1.0.0
IOS_BUILD=1

# Android Configuration
ANDROID_PACKAGE_NAME=com.silhouetteworkflow
ANDROID_DISPLAY_NAME=Silhouette Workflow
ANDROID_VERSION=1.0.0
ANDROID_BUILD=1
ANDROID_KEYSTORE_PASSWORD=your-keystore-password

# CI/CD Configuration
FASTLANE_PASSWORD=your-apple-id-password
FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD=your-asp
GOOGLE_PLAY_JSON_KEY_PATH=path/to/google-play-key.json
```

### 3. Configuración de Firebase

1. Crear proyecto en Firebase Console
2. Descargar archivos de configuración:
   - `GoogleService-Info.plist` (iOS)
   - `google-services.json` (Android)
3. Colocar en las carpetas correspondientes:
   - `ios/SilhouetteWorkflow/GoogleService-Info.plist`
   - `android/app/google-services.json`

## Configuración de iOS

### 1. Configuración del Bundle ID

1. Abrir `ios/SilhouetteWorkflow.xcworkspace` en Xcode
2. Seleccionar el proyecto → Target → General
3. Cambiar Bundle Identifier a: `com.silhouette.workflow`
4. Configurar Display Name: `Silhouette Workflow`

### 2. Configuración de Signing

1. En Xcode, ir a Signing & Capabilities
2. Seleccionar Team
3. Configurar Provisioning Profile
4. Habilitar automático signing

### 3. Configuración de Capabilities

Agregar las siguientes capabilities:
- Push Notifications
- Background Modes
- Keychain Sharing (opcional)
- App Groups (para sharing data)

### 4. Configuración de Info.plist

Verificar que las siguientes keys estén configuradas:
- `NSUserNotificationsUsageDescription`
- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`

## Configuración de Android

### 1. Configuración del Package Name

1. Abrir `android/app/build.gradle`
2. Cambiar `applicationId` a: `com.silhouetteworkflow`

### 2. Configuración de Signing

Crear keystore para release:

```bash
# Generar keystore
keytool -genkey -v -keystore silhouette-workflow.keystore -alias silhouette-workflow -keyalg RSA -keysize 2048 -validity 10000

# Configurar en android/keystore.properties
storeFile=../silhouette-workflow.keystore
storePassword=your-password
keyAlias=silhouette-workflow
keyPassword=your-password
```

### 3. Configuración de Build Variants

Configurar en `android/app/build.gradle`:

```gradle
android {
    buildTypes {
        debug {
            applicationIdSuffix ".debug"
            versionNameSuffix "-debug"
        }
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}
```

## Compilación de Producción

### iOS

#### Debug Build

```bash
# Compilar para simulador
npx react-native run-ios

# Compilar para dispositivo
npx react-native run-ios --device
```

#### Release Build

```bash
# Usando Fastlane
fastlane ios release

# O manualmente
cd ios
xcodebuild -workspace SilhouetteWorkflow.xcworkspace \
  -scheme SilhouetteWorkflow \
  -configuration Release \
  -archivePath SilhouetteWorkflow.xcarchive \
  archive
```

#### Generar IPA

```bash
# Exportar IPA usando Fastlane
fastlane ios export

# O usando Xcode Organizer
# 1. Abrir Xcode Organizer
# 2. Seleccionar el archive
# 3. Distribuir App
# 4. App Store Connect
```

### Android

#### Debug Build

```bash
# Para dispositivo/emulador
npx react-native run-android

# APK debug
cd android
./gradlew assembleDebug
```

#### Release Build

```bash
# Usando Fastlane
fastlane android release

# O manualmente
cd android
./gradlew assembleRelease

# AAB (recomendado para Play Store)
./gradlew bundleRelease
```

## Despliegue en App Store

### 1. Preparación

1. **Verificar Certificate y Provisioning Profile**
2. **Configurar App Store Connect:**
   - Nombre de la app
   - Descripción
   - Keywords
   - Categorías
   - Rating de edad
   - Screenshots para todos los dispositivos
   - App Preview videos (opcional)

### 2. Metadatos Requeridos

```
App Name: Silhouette Workflow
Subtitle: Automatización inteligente de workflows
Keywords: workflow, automation, productivity, business, process
Category: Productivity
Content Rating: 4+
Primary Language: Spanish
```

### 3. Screenshots Requeridos

**iPhone (6.7", 6.5", 5.5", 4.7"):**
- Login screen
- Dashboard
- Workflows list
- Workflow editor
- AI Center

**iPad (12.9", 11", 10.5"):**
- Dashboard
- Workflows management
- AI features
- Settings

### 4. Proceso de Revisión

1. Subir build a App Store Connect
2. Completar información de la app
3. Enviar para revisión
4. Esperar aprobación (1-7 días)
5. Configurar fecha de lanzamiento

### 5. Automatización con Fastlane

Crear `fastlane/Fastfile`:

```ruby
default_platform(:ios)

platform :ios do
  before_all do
    ENV["FASTLANE_XCODEBUILD_SETTINGS_TIMEOUT"] = "120"
    ENV["FASTLANE_XCODEBUILD_SETTINGS_RETRIES"] = "6"
  end

  desc "Build and upload to TestFlight"
  lane :beta do
    match(type: "appstore")
    gym(scheme: "SilhouetteWorkflow")
    pilot(skip_waiting_for_build_processing: true)
  end

  desc "Deploy to App Store"
  lane :release do
    match(type: "appstore")
    gym(scheme: "SilhouetteWorkflow")
    upload_to_app_store(force: true)
  end
end
```

## Despliegue en Google Play

### 1. Preparación de la App

1. **Crear Google Play Console Account**
2. **Configurar el perfil de desarrollador**
3. **Subir firma de la app**

### 2. Configuración de la App

```
Package name: com.silhouetteworkflow
App name: Silhouette Workflow
Short description: Automatización inteligente de workflows
Full description: Descripción completa de la app
Category: Productivity
Content rating: Everyone
```

### 3. Assets Requeridos

- **Icono de la app**: 512x512px
- **Screenshots**: Phone (mínimo 2, máximo 8)
- **Screenshots**: Tablet (opcional, recomendado 2)
- **Feature Graphic**: 1024x500px
- **TV Banner**: 1280x720px (opcional)

### 4. App Bundle (AAB)

```bash
# Generar AAB
cd android
./gradlew bundleRelease

# El archivo se genera en:
# android/app/build/outputs/bundle/release/app-release.aab
```

### 5. Proceso de Publicación

1. Subir AAB a Google Play Console
2. Completar información de la Store Listing
3. Configurar Pricing & Distribution
4. Subir y revisar contenido
5. Enviar para revisión
6. Configurar rollout (gradual, completo, staged)

### 6. Automatización con Fastlane

Crear `fastlane/Fastfile`:

```ruby
default_platform(:android)

platform :android do
  desc "Deploy to Google Play"
  lane :release do
    gradle(
      task: "bundle",
      build_type: "Release",
      properties: {
        "android.injected.signing.store.file" => ENV["ANDROID_KEYSTORE_FILE"],
        "android.injected.signing.store.password" => ENV["ANDROID_KEYSTORE_PASSWORD"],
        "android.injected.signing.key.alias" => ENV["ANDROID_KEY_ALIAS"],
        "android.injected.signing.key.password" => ENV["ANDROID_KEY_PASSWORD"],
      }
    )
    upload_to_play_store(
      package_name: "com.silhouetteworkflow",
      track: "internal",
      aab: "android/app/build/outputs/bundle/release/app-release.aab",
      skip_upload_images: false,
      skip_upload_screenshots: false,
      release_status: "draft"
    )
  end

  desc "Deploy to Google Play Internal Testing"
  lane :beta do
    gradle(
      task: "bundle",
      build_type: "Release"
    )
    upload_to_play_store(
      package_name: "com.silhouetteworkflow",
      track: "internal",
      aab: "android/app/build/outputs/bundle/release/app-release.aab"
    )
  end
end
```

## Configuración de CI/CD

### 1. GitHub Actions

Crear `.github/workflows/ci-cd.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
  ios-build:
    runs-on: macos-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.0'
          bundler-cache: true
          working-directory: ios
          
      - name: Install iOS dependencies
        run: cd ios && bundle install && pod install
        
      - name: Build iOS
        run: fastlane ios beta
        
  android-build:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          java-version: '11'
          distribution: 'temurin'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build Android
        run: fastlane android beta
```

### 2. Configuración de Environment Secrets

En GitHub, configurar los siguientes secrets:

- `IOS_CERTIFICATE_P12`
- `IOS_CERTIFICATE_PASSWORD`
- `IOS_PROVISIONING_PROFILE`
- `ANDROID_KEYSTORE`
- `ANDROID_KEYSTORE_PASSWORD`
- `FASTLANE_PASSWORD`
- `GOOGLE_PLAY_JSON_KEY`

## Troubleshooting

### Problemas Comunes de iOS

1. **Build Fails - Missing Provisioning Profile**
   ```bash
   # Regenerar perfiles
   fastlane sigh --app_identifier com.silhouette.workflow
   ```

2. **Code Signing Issues**
   - Verificar que el team esté seleccionado
   - Regenerar certificados en Apple Developer Portal

3. **App Store Rejection - Missing Info.plist Keys**
   - Agregar todas las `UsageDescription` keys requeridas
   - Verificar que todas las capabilities estén configuradas

### Problemas Comunes de Android

1. **Build Fails - Keystore Issues**
   ```bash
   # Verificar keystore
   keytool -list -v -keystore silhouette-workflow.keystore
   ```

2. **Google Play Upload Fails**
   - Verificar que el AAB esté firmado correctamente
   - Verificar que la versión en build.gradle no exista en Play Store

3. **App Crashes on Launch**
   - Verificar que Firebase esté configurado correctamente
   - Revisar logs en Android Studio

### Logs y Debugging

```bash
# Logs de iOS
npx react-native log-ios

# Logs de Android
npx react-native log-android

# Debug de performance
npx react-native run-ios --verbose
npx react-native run-android --verbose
```

### Contacto y Soporte

Para problemas específicos de deployment:
- Email: support@silhouette-workflow.com
- Documentación: https://docs.silhouette-workflow.com/deployment
- Issues: https://github.com/silhouette-workflow/mobile/issues

---

**Nota**: Esta guía se actualiza regularmente. Para la versión más reciente, consultar la documentación oficial.