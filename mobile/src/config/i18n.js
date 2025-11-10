import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Traducciones
const resources = {
  es: {
    translation: {
      // Navegación
      home: 'Inicio',
      workflows: 'Workflows',
      ai: 'IA',
      profile: 'Perfil',
      settings: 'Configuración',
      help: 'Ayuda',
      
      // Autenticación
      login: 'Iniciar Sesión',
      register: 'Registrarse',
      logout: 'Cerrar Sesión',
      email: 'Email',
      password: 'Contraseña',
      confirmPassword: 'Confirmar Contraseña',
      name: 'Nombre',
      rememberMe: 'Recordar sesión',
      forgotPassword: '¿Olvidaste tu contraseña?',
      createAccount: 'Crear Cuenta',
      alreadyHaveAccount: '¿Ya tienes cuenta?',
      dontHaveAccount: '¿No tienes cuenta?',
      loginHere: 'Inicia sesión aquí',
      registerHere: 'Regístrate aquí',
      
      // Estados
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      warning: 'Advertencia',
      info: 'Información',
      
      // Dashboard
      welcome: '¡Bienvenido!',
      goodMorning: 'Buenos días',
      goodAfternoon: 'Buenas tardes',
      goodEvening: 'Buenas noches',
      totalWorkflows: 'Total Workflows',
      activeWorkflows: 'Workflows Activos',
      executionsToday: 'Ejecuciones Hoy',
      successRate: 'Tasa de Éxito',
      quickActions: 'Acciones Rápidas',
      newWorkflow: 'Nuevo Workflow',
      credentials: 'Credenciales',
      recentWorkflows: 'Workflows Recientes',
      recentNotifications: 'Notificaciones',
      seeAll: 'Ver todos',
      noWorkflows: 'No tienes workflows aún',
      createFirstWorkflow: 'Crear Primer Workflow',
      noNotifications: 'No hay notificaciones',
      
      // Workflows
      myWorkflows: 'Mis Workflows',
      searchWorkflows: 'Buscar workflows...',
      status: 'Estado',
      all: 'Todos',
      active: 'Activo',
      inactive: 'Inactivo',
      updated: 'Actualizado',
      executions: 'ejecuciones',
      lastExecution: 'Última ejecución',
      never: 'Nunca',
      selectAll: 'Seleccionar todo',
      clear: 'Limpiar',
      deleteSelected: 'Eliminar seleccionados',
      createWorkflow: 'Crear Workflow',
      editWorkflow: 'Editar Workflow',
      deleteWorkflow: 'Eliminar Workflow',
      
      // Editor de Workflows
      workflowEditor: 'Editor de Workflow',
      workflowName: 'Nombre del Workflow',
      workflowDescription: 'Descripción',
      save: 'Guardar',
      run: 'Ejecutar',
      validate: 'Validar',
      export: 'Exportar',
      import: 'Importar',
      
      // Notificaciones
      notifications: 'Notificaciones',
      markAsRead: 'Marcar como leída',
      markAllAsRead: 'Marcar todas como leídas',
      delete: 'Eliminar',
      unread: 'No leídas',
      read: 'Leídas',
      
      // IA
      aiCenter: 'Centro de IA',
      trainModel: 'Entrenar Modelo',
      optimize: 'Optimizar',
      recommendations: 'Recomendaciones',
      analysis: 'Análisis',
      predictions: 'Predicciones',
      
      // Credenciales
      credentialsVault: 'Caja de Credenciales',
      addCredential: 'Agregar Credencial',
      editCredential: 'Editar Credencial',
      testCredential: 'Probar Credencial',
      generated: 'Generada',
      
      // Configuración
      appSettings: 'Configuración de la App',
      accountSettings: 'Configuración de Cuenta',
      securitySettings: 'Configuración de Seguridad',
      notificationSettings: 'Configuración de Notificaciones',
      theme: 'Tema',
      language: 'Idioma',
      darkMode: 'Modo Oscuro',
      lightMode: 'Modo Claro',
      systemTheme: 'Sistema',
      
      // Errores comunes
      networkError: 'Error de conexión. Verifica tu internet.',
      serverError: 'Error del servidor. Inténtalo más tarde.',
      invalidCredentials: 'Credenciales inválidas',
      weakPassword: 'La contraseña es demasiado débil',
      emailRequired: 'El email es requerido',
      passwordRequired: 'La contraseña es requerida',
      nameRequired: 'El nombre es requerido',
      confirmPasswordMismatch: 'Las contraseñas no coinciden',
      
      // Confirmaciones
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      yes: 'Sí',
      no: 'No',
      ok: 'OK',
      save: 'Guardar',
      discard: 'Descartar',
      continue: 'Continuar',
      back: 'Atrás',
      next: 'Siguiente',
      finish: 'Finalizar',
      
      // Fechas
      today: 'Hoy',
      yesterday: 'Ayer',
      thisWeek: 'Esta semana',
      thisMonth: 'Este mes',
      lastMonth: 'Mes pasado',
      lastWeek: 'Semana pasada',
      hoursAgo: 'hace {{count}} horas',
      minutesAgo: 'hace {{count}} minutos',
      daysAgo: 'hace {{count}} días',
      
      // Tipos de workflow
      automation: 'Automatización',
      dataProcessing: 'Procesamiento de Datos',
      webScraping: 'Web Scraping',
      apiIntegration: 'Integración de API',
      reportGeneration: 'Generación de Reportes',
      monitoring: 'Monitoreo',
      backup: 'Respaldo',
      notification: 'Notificación',
      
      // Estados de ejecución
      queued: 'En cola',
      running: 'Ejecutando',
      completed: 'Completado',
      failed: 'Falló',
      cancelled: 'Cancelado',
      paused: 'Pausado',
      retrying: 'Reintentando',
      
      // Permisos
      permissions: 'Permisos',
      location: 'Ubicación',
      camera: 'Cámara',
      notifications: 'Notificaciones',
      storage: 'Almacenamiento',
      microphone: 'Micrófono',
      
      // Progreso
      progress: 'Progreso',
      completed: 'Completado',
      remaining: 'Restante',
      uploading: 'Subiendo...',
      downloading: 'Descargando...',
      processing: 'Procesando...',
      syncing: 'Sincronizando...',
    },
  },
  en: {
    translation: {
      // Navigation
      home: 'Home',
      workflows: 'Workflows',
      ai: 'AI',
      profile: 'Profile',
      settings: 'Settings',
      help: 'Help',
      
      // Authentication
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      name: 'Name',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot password?',
      createAccount: 'Create Account',
      alreadyHaveAccount: 'Already have an account?',
      dontHaveAccount: "Don't have an account?",
      loginHere: 'Login here',
      registerHere: 'Register here',
      
      // Status
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Information',
      
      // Dashboard
      welcome: 'Welcome!',
      goodMorning: 'Good morning',
      goodAfternoon: 'Good afternoon',
      goodEvening: 'Good evening',
      totalWorkflows: 'Total Workflows',
      activeWorkflows: 'Active Workflows',
      executionsToday: 'Executions Today',
      successRate: 'Success Rate',
      quickActions: 'Quick Actions',
      newWorkflow: 'New Workflow',
      credentials: 'Credentials',
      recentWorkflows: 'Recent Workflows',
      recentNotifications: 'Notifications',
      seeAll: 'See all',
      noWorkflows: 'No workflows yet',
      createFirstWorkflow: 'Create First Workflow',
      noNotifications: 'No notifications',
      
      // Workflows
      myWorkflows: 'My Workflows',
      searchWorkflows: 'Search workflows...',
      status: 'Status',
      all: 'All',
      active: 'Active',
      inactive: 'Inactive',
      updated: 'Updated',
      executions: 'executions',
      lastExecution: 'Last execution',
      never: 'Never',
      selectAll: 'Select all',
      clear: 'Clear',
      deleteSelected: 'Delete selected',
      createWorkflow: 'Create Workflow',
      editWorkflow: 'Edit Workflow',
      deleteWorkflow: 'Delete Workflow',
      
      // Editor
      workflowEditor: 'Workflow Editor',
      workflowName: 'Workflow Name',
      workflowDescription: 'Description',
      save: 'Save',
      run: 'Run',
      validate: 'Validate',
      export: 'Export',
      import: 'Import',
      
      // Notifications
      notifications: 'Notifications',
      markAsRead: 'Mark as read',
      markAllAsRead: 'Mark all as read',
      delete: 'Delete',
      unread: 'Unread',
      read: 'Read',
      
      // AI
      aiCenter: 'AI Center',
      trainModel: 'Train Model',
      optimize: 'Optimize',
      recommendations: 'Recommendations',
      analysis: 'Analysis',
      predictions: 'Predictions',
      
      // Credentials
      credentialsVault: 'Credentials Vault',
      addCredential: 'Add Credential',
      editCredential: 'Edit Credential',
      testCredential: 'Test Credential',
      generated: 'Generated',
      
      // Settings
      appSettings: 'App Settings',
      accountSettings: 'Account Settings',
      securitySettings: 'Security Settings',
      notificationSettings: 'Notification Settings',
      theme: 'Theme',
      language: 'Language',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      systemTheme: 'System',
      
      // Common errors
      networkError: 'Connection error. Check your internet.',
      serverError: 'Server error. Try again later.',
      invalidCredentials: 'Invalid credentials',
      weakPassword: 'Password is too weak',
      emailRequired: 'Email is required',
      passwordRequired: 'Password is required',
      nameRequired: 'Name is required',
      confirmPasswordMismatch: 'Passwords do not match',
      
      // Confirmations
      confirm: 'Confirm',
      cancel: 'Cancel',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      save: 'Save',
      discard: 'Discard',
      continue: 'Continue',
      back: 'Back',
      next: 'Next',
      finish: 'Finish',
      
      // Dates
      today: 'Today',
      yesterday: 'Yesterday',
      thisWeek: 'This week',
      thisMonth: 'This month',
      lastMonth: 'Last month',
      lastWeek: 'Last week',
      hoursAgo: '{{count}} hours ago',
      minutesAgo: '{{count}} minutes ago',
      daysAgo: '{{count}} days ago',
      
      // Workflow types
      automation: 'Automation',
      dataProcessing: 'Data Processing',
      webScraping: 'Web Scraping',
      apiIntegration: 'API Integration',
      reportGeneration: 'Report Generation',
      monitoring: 'Monitoring',
      backup: 'Backup',
      notification: 'Notification',
      
      // Execution states
      queued: 'Queued',
      running: 'Running',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
      paused: 'Paused',
      retrying: 'Retrying',
      
      // Permissions
      permissions: 'Permissions',
      location: 'Location',
      camera: 'Camera',
      notifications: 'Notifications',
      storage: 'Storage',
      microphone: 'Microphone',
      
      // Progress
      progress: 'Progress',
      completed: 'Completed',
      remaining: 'Remaining',
      uploading: 'Uploading...',
      downloading: 'Downloading...',
      processing: 'Processing...',
      syncing: 'Syncing...',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'es', // idioma por defecto
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;