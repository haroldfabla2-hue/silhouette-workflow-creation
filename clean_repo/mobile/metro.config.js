const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp'],
    assetExts: [
      // Típicos
      'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
      // Fonts
      'ttf', 'otf', 'woff', 'woff2',
      // Audio/Video
      'mp3', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm',
      // Documentos
      'pdf', 'doc', 'docx', 'txt', 'rtf', 'html', 'css',
    ],
  },
  resolver: {
    // Configuración de alias para importaciones
    alias: {
      '@': './src',
      '@components': './src/components',
      '@screens': './src/screens',
      '@services': './src/services',
      '@utils': './src/utils',
      '@assets': './assets',
      '@config': './src/config',
      '@store': './src/store',
      '@theme': './src/theme',
    },
    // Configuración de extensiones de archivo
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp'],
  },
  transformer: {
    // Configuración de SVG
    svgAssetExts: ['svg'],
    // Configuración de imágenes
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  // Configuración de servidor
  server: {
    port: 8081,
    host: 'localhost',
  },
  // Configuración de cache
  cacheStores: {
    fs: require('metro-cache'),
  },
  // Configuración de watch
  watchFolders: [
    // Carpetas a monitorear para cambios
    __dirname,
    './node_modules',
  ],
  // Configuración de resolver
  resolver: {
    // Configuración de plataformas
    platforms: ['ios', 'android', 'native', 'web'],
    // Configuración de resolver personalizado
    resolverMainFields: ['react-native', 'browser', 'main'],
    // Configuración de symlink
    symlink: true,
  },
  // Configuración de bundler
  serializer: {
    // Configuración de mapas de origen
    createModuleIdFactory: function () {
      return function (path) {
        // Generar IDs únicos para módulos
        return path.replace(__dirname, '').replace(/[^\w]/g, '_');
      };
    },
  },
  // Configuración de optimización
  optimizeDeps: {
    // Módulos a pre-optimizar
    include: [
      'react',
      'react-native',
      '@reduxjs/toolkit',
      'react-redux',
      'axios',
      'react-navigation',
    ],
  },
  // Configuración de sourcemap
  serializer: {
    // Configuración de sourcemap
    createModuleIdFactory: function () {
      return function (path) {
        return path.replace(__dirname, '').replace(/[^\w]/g, '_');
      };
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);