// Configuración de API
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api' 
  : 'https://api.silhouette-workflow.com/api';

// Configuración de endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY: '/auth/verify',
    PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  // Workflows
  WORKFLOWS: {
    BASE: '/workflows',
    BY_ID: (id) => `/workflows/${id}`,
    EXECUTE: (id) => `/workflows/${id}/execute`,
    EXECUTION_STATUS: (id, executionId) => `/workflows/${id}/executions/${executionId}`,
    EXECUTION_HISTORY: (id) => `/workflows/${id}/executions`,
    STATS: (id) => `/workflows/${id}/stats`,
    EXPORT: (id) => `/workflows/${id}/export`,
    IMPORT: '/workflows/import',
    VALIDATE: '/workflows/validate',
    TEMPLATES: '/workflows/templates',
    TEMPLATE_BY_ID: (id) => `/workflows/templates/${id}`,
    DUPLICATE: (id) => `/workflows/${id}/duplicate`,
  },
  
  // AI
  AI: {
    TRAIN: '/ai/train',
    MODELS: '/ai/models',
    OPTIMIZE: (id) => `/ai/optimize/${id}`,
    RECOMMENDATIONS: '/ai/recommendations',
    ANALYSIS: (id) => `/ai/analysis/${id}`,
    PREDICTIONS: '/ai/predictions',
    AUTO_SCALING: (id) => `/ai/auto-scaling/${id}`,
  },
  
  // Credentials
  CREDENTIALS: {
    BASE: '/credentials',
    BY_ID: (id) => `/credentials/${id}`,
    TEST: (id) => `/credentials/${id}/test`,
    GENERATE: '/credentials/generate',
  },
  
  // Notifications
  NOTIFICATIONS: {
    BASE: '/notifications',
    BY_ID: (id) => `/notifications/${id}`,
    MARK_READ: (id) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/mark-all-read',
    SETTINGS: '/notifications/settings',
    REGISTER_TOKEN: '/notifications/register-token',
  },
  
  // Organizations
  ORGANIZATIONS: {
    BASE: '/organizations',
    BY_ID: (id) => `/organizations/${id}`,
    MEMBERS: (id) => `/organizations/${id}/members`,
    MEMBER_BY_ID: (id, userId) => `/organizations/${id}/members/${userId}`,
    MEMBER_ROLE: (id, userId) => `/organizations/${id}/members/${userId}/role`,
  },
  
  // Stats
  STATS: {
    DASHBOARD: '/stats/dashboard',
    WORKFLOWS: '/stats/workflows',
    USAGE: '/stats/usage',
    PERFORMANCE: (id) => `/stats/performance/${id}`,
  },
  
  // Search
  SEARCH: {
    BASE: '/search',
    WORKFLOWS: '/search/workflows',
    TEMPLATES: '/search/templates',
  },
};

// Configuración de timeouts
export const API_TIMEOUTS = {
  DEFAULT: 30000,
  UPLOAD: 60000,
  DOWNLOAD: 120000,
};

// Configuración de headers por defecto
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Configuración de autenticación
export const AUTH_CONFIG = {
  TOKEN_KEY: 'auth_token',
  REFRESH_TOKEN_KEY: 'refresh_token',
  USER_KEY: 'user_data',
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutos
  AUTO_REFRESH: true,
  REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutos antes de expirar
};

// Configuración de almacenamiento offline
export const OFFLINE_CONFIG = {
  ENABLED: true,
  MAX_QUEUE_SIZE: 100,
  SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutos
  AUTO_SYNC: true,
  STORAGE_PREFIX: 'sw_',
};

// Configuración de notificaciones
export const NOTIFICATION_CONFIG = {
  ENABLED: true,
  DEFAULT_CHANNEL: 'default',
  PRIORITY: 'high',
  BADGE_COUNT: true,
  SOUND: true,
  VIBRATION: true,
  CATEGORIES: [
    {
      identifier: 'workflow_execution',
      actions: [
        { identifier: 'view', title: 'Ver', options: { opensAppToForeground: true } },
        { identifier: 'dismiss', title: 'Descartar', options: { opensAppToForeground: false } },
      ],
    },
    {
      identifier: 'system_alert',
      actions: [
        { identifier: 'acknowledge', title: 'Confirmar', options: { opensAppToForeground: true } },
        { identifier: 'dismiss', title: 'Descartar', options: { opensAppToForeground: false } },
      ],
    },
  ],
};

// Configuración de red
export const NETWORK_CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  EXPONENTIAL_BACKOFF: true,
  CHECK_INTERVAL: 30000, // 30 segundos
  CACHE_ENABLED: true,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
};

// Configuración de features
export const FEATURES = {
  OFFLINE_MODE: true,
  PUSH_NOTIFICATIONS: true,
  BIOMETRIC_AUTH: true,
  DARK_MODE: true,
  AUTO_SYNC: true,
  AI_FEATURES: true,
  CREDENTIALS_VAULT: true,
  ADVANCED_ANALYTICS: true,
  TEAM_COLLABORATION: true,
  API_INTEGRATION: true,
  EXPORT_FORMATS: ['json', 'xml', 'yaml', 'csv'],
  IMPORT_FORMATS: ['json', 'xml', 'yaml'],
};

// Configuración de desarrollo
export const DEV_CONFIG = {
  ENABLE_LOGGING: __DEV__,
  ENABLE_MOCK_DATA: __DEV__,
  ENABLE_PERFORMANCE_MONITORING: __DEV__,
  ENABLE_DEBUG_TOOLS: __DEV__,
  MOCK_API_DELAY: 1000, // 1 segundo
  LOG_LEVEL: __DEV__ ? 'debug' : 'error',
};

// URLs de ayuda y soporte
export const SUPPORT_URLS = {
  DOCUMENTATION: 'https://docs.silhouette-workflow.com',
  SUPPORT: 'https://support.silhouette-workflow.com',
  COMMUNITY: 'https://community.silhouette-workflow.com',
  GITHUB: 'https://github.com/silhouette-workflow',
  FEEDBACK: 'https://feedback.silhouette-workflow.com',
};

// Versión de la API
export const API_VERSION = 'v1';

// Configuración completa
export const config = {
  baseURL: API_BASE_URL,
  version: API_VERSION,
  endpoints: API_ENDPOINTS,
  timeouts: API_TIMEOUTS,
  defaultHeaders: DEFAULT_HEADERS,
  auth: AUTH_CONFIG,
  offline: OFFLINE_CONFIG,
  notifications: NOTIFICATION_CONFIG,
  network: NETWORK_CONFIG,
  features: FEATURES,
  dev: DEV_CONFIG,
  support: SUPPORT_URLS,
};

export default config;