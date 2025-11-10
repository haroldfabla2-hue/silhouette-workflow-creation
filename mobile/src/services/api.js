import axios from 'axios';
import { store } from '../store';
import { logout, updateActivity, setUser } from '../store/slices/authSlice';
import { API_BASE_URL } from '../config/api';

// Instancia de Axios con configuración por defecto
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    // Agregar token de autenticación
    const state = store.getState();
    const token = state.auth.token;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Agregar timestamp para evitar problemas de caché
    config.headers['X-Timestamp'] = Date.now();
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para responses
api.interceptors.response.use(
  (response) => {
    // Actualizar actividad del usuario
    store.dispatch(updateActivity());
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Manejar errores de autenticación
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Intentar refrescar token
        const refreshResponse = await authAPI.refresh();
        const newToken = refreshResponse.data.accessToken;
        
        // Actualizar token en el store
        store.dispatch(setUser({ token: newToken }));
        
        // Reintentar request original
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Si el refresh falla, hacer logout
        store.dispatch(logout());
        return Promise.reject(refreshError);
      }
    }
    
    // Manejar errores de red
    if (!error.response) {
      error.message = 'Error de conexión. Verifica tu conexión a internet.';
    }
    
    return Promise.reject(error);
  }
);

// Configuración de API
export const config = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  retries: 3,
};

// API de autenticación
export const authAPI = {
  // Login
  login: (credentials) => api.post('/auth/login', credentials),
  
  // Registro
  register: (userData) => api.post('/auth/register', userData),
  
  // Logout
  logout: () => api.post('/auth/logout'),
  
  // Refrescar token
  refresh: () => api.post('/auth/refresh'),
  
  // Verificar token
  verify: () => api.get('/auth/verify'),
  
  // Cambiar contraseña
  changePassword: (passwordData) => api.post('/auth/change-password', passwordData),
  
  // Perfil
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  
  // Recuperar contraseña
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (resetData) => api.post('/auth/reset-password', resetData),
};

// API de workflows
export const workflowsAPI = {
  // Listar workflows
  getAll: (params) => api.get('/workflows', { params }),
  
  // Obtener workflow por ID
  getById: (id) => api.get(`/workflows/${id}`),
  
  // Crear workflow
  create: (workflowData) => api.post('/workflows', workflowData),
  
  // Actualizar workflow
  update: (id, data) => api.put(`/workflows/${id}`, data),
  
  // Eliminar workflow
  delete: (id) => api.delete(`/workflows/${id}`),
  
  // Duplicar workflow
  duplicate: (id) => api.post(`/workflows/${id}/duplicate`),
  
  // Ejecutar workflow
  execute: (id, inputs) => api.post(`/workflows/${id}/execute`, { inputs }),
  
  // Detener ejecución
  stopExecution: (id, executionId) => api.post(`/workflows/${id}/executions/${executionId}/stop`),
  
  // Estado de ejecución
  getExecutionStatus: (id, executionId) => api.get(`/workflows/${id}/executions/${executionId}`),
  
  // Historial de ejecuciones
  getExecutionHistory: (id, params) => api.get(`/workflows/${id}/executions`, { params }),
  
  // Estadísticas
  getStats: (id) => api.get(`/workflows/${id}/stats`),
  
  // Exportar workflow
  export: (id, format) => api.get(`/workflows/${id}/export`, { 
    params: { format },
    responseType: 'blob'
  }),
  
  // Importar workflow
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/workflows/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Validar workflow
  validate: (workflowData) => api.post('/workflows/validate', workflowData),
  
  // Obtener templates
  getTemplates: () => api.get('/workflows/templates'),
  
  // Crear desde template
  createFromTemplate: (templateId, data) => api.post(`/workflows/templates/${templateId}`, data),
};

// API de AI/ML
export const aiAPI = {
  // Entrenar modelo
  trainModel: (modelData) => api.post('/ai/train', modelData),
  
  // Obtener modelos
  getModels: (params) => api.get('/ai/models', { params }),
  
  // Optimizar workflow
  optimizeWorkflow: (workflowId) => api.post(`/ai/optimize/${workflowId}`),
  
  // Obtener recomendaciones
  getRecommendations: (params) => api.get('/ai/recommendations', { params }),
  
  // Analizar rendimiento
  analyzePerformance: (workflowId) => api.get(`/ai/analysis/${workflowId}`),
  
  // Predicciones
  getPredictions: (data) => api.post('/ai/predictions', data),
  
  // Auto-escalado
  getAutoScaling: (workflowId) => api.get(`/ai/auto-scaling/${workflowId}`),
  updateAutoScaling: (workflowId, config) => api.put(`/ai/auto-scaling/${workflowId}`, config),
};

// API de credenciales
export const credentialsAPI = {
  // Listar credenciales
  getAll: (params) => api.get('/credentials', { params }),
  
  // Obtener credencial
  getById: (id) => api.get(`/credentials/${id}`),
  
  // Crear credencial
  create: (credentialData) => api.post('/credentials', credentialData),
  
  // Actualizar credencial
  update: (id, data) => api.put(`/credentials/${id}`, data),
  
  // Eliminar credencial
  delete: (id) => api.delete(`/credentials/${id}`),
  
  // Probar credencial
  test: (id) => api.post(`/credentials/${id}/test`),
  
  // Generar nueva credencial
  generate: (type) => api.post('/credentials/generate', { type }),
};

// API de notificaciones
export const notificationsAPI = {
  // Listar notificaciones
  getAll: (params) => api.get('/notifications', { params }),
  
  // Marcar como leída
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  
  // Marcar todas como leídas
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  
  // Eliminar notificación
  delete: (id) => api.delete(`/notifications/${id}`),
  
  // Configuración de notificaciones
  getSettings: () => api.get('/notifications/settings'),
  updateSettings: (settings) => api.put('/notifications/settings', settings),
  
  // Registrar token de push
  registerPushToken: (token) => api.post('/notifications/register-token', { token }),
};

// API de organizaciones
export const organizationsAPI = {
  // Obtener organizaciones
  getAll: () => api.get('/organizations'),
  
  // Crear organización
  create: (orgData) => api.post('/organizations', orgData),
  
  // Actualizar organización
  update: (id, data) => api.put(`/organizations/${id}`, data),
  
  // Eliminar organización
  delete: (id) => api.delete(`/organizations/${id}`),
  
  // Miembros
  getMembers: (id) => api.get(`/organizations/${id}/members`),
  addMember: (id, memberData) => api.post(`/organizations/${id}/members`, memberData),
  removeMember: (id, userId) => api.delete(`/organizations/${id}/members/${userId}`),
  updateMemberRole: (id, userId, role) => api.put(`/organizations/${id}/members/${userId}/role`, { role }),
};

// API de estadísticas
export const statsAPI = {
  // Dashboard stats
  getDashboard: () => api.get('/stats/dashboard'),
  
  // Workflows stats
  getWorkflows: (params) => api.get('/stats/workflows', { params }),
  
  // Usage stats
  getUsage: (period) => api.get('/stats/usage', { params: { period } }),
  
  // Performance stats
  getPerformance: (workflowId, period) => api.get(`/stats/performance/${workflowId}`, { params: { period } }),
};

// API de búsqueda
export const searchAPI = {
  // Búsqueda general
  search: (query, filters) => api.get('/search', { params: { query, ...filters } }),
  
  // Búsqueda de workflows
  searchWorkflows: (query, filters) => api.get('/search/workflows', { params: { query, ...filters } }),
  
  // Búsqueda de templates
  searchTemplates: (query, filters) => api.get('/search/templates', { params: { query, ...filters } }),
};

// Exportar instancia configurada
export default api;