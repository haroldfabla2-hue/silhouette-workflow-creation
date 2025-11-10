import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Keys de almacenamiento
const OFFLINE_KEYS = {
  WORKFLOWS: 'offline_workflows',
  EXECUTIONS: 'offline_executions',
  QUEUE: 'offline_queue',
  SYNC_STATUS: 'offline_sync_status',
};

// Actions asíncronas
export const syncOfflineData = createAsyncThunk(
  'offline/syncData',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const { offline } = state;
      
      // Sincronizar datos pendientes
      const syncResults = await Promise.allSettled(
        offline.queue.map((item) => syncQueueItem(item, state))
      );
      
      // Actualizar estado de sincronización
      return {
        successCount: syncResults.filter(r => r.status === 'fulfilled').length,
        errorCount: syncResults.filter(r => r.status === 'rejected').length,
        timestamp: Date.now(),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loadOfflineData = createAsyncThunk(
  'offline/loadData',
  async (_, { rejectWithValue }) => {
    try {
      const [workflowsData, executionsData, queueData, syncStatusData] = await Promise.all([
        AsyncStorage.getItem(OFFLINE_KEYS.WORKFLOWS),
        AsyncStorage.getItem(OFFLINE_KEYS.EXECUTIONS),
        AsyncStorage.getItem(OFFLINE_KEYS.QUEUE),
        AsyncStorage.getItem(OFFLINE_KEYS.SYNC_STATUS),
      ]);

      return {
        workflows: workflowsData ? JSON.parse(workflowsData) : [],
        executions: executionsData ? JSON.parse(executionsData) : [],
        queue: queueData ? JSON.parse(queueData) : [],
        syncStatus: syncStatusData ? JSON.parse(syncStatusData) : {},
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const saveOfflineData = createAsyncThunk(
  'offline/saveData',
  async (_, { getState }) => {
    const state = getState();
    const { offline } = state;

    await Promise.all([
      AsyncStorage.setItem(OFFLINE_KEYS.WORKFLOWS, JSON.stringify(offline.workflows)),
      AsyncStorage.setItem(OFFLINE_KEYS.EXECUTIONS, JSON.stringify(offline.executions)),
      AsyncStorage.setItem(OFFLINE_KEYS.QUEUE, JSON.stringify(offline.queue)),
      AsyncStorage.setItem(OFFLINE_KEYS.SYNC_STATUS, JSON.stringify(offline.syncStatus)),
    ]);
  }
);

// Función auxiliar para sincronizar elementos de cola
const syncQueueItem = async (item, state) => {
  const { type, data, id } = item;
  
  switch (type) {
    case 'CREATE_WORKFLOW':
      // Implementar lógica de creación
      return { id, status: 'synced', timestamp: Date.now() };
    case 'UPDATE_WORKFLOW':
      // Implementar lógica de actualización
      return { id, status: 'synced', timestamp: Date.now() };
    case 'DELETE_WORKFLOW':
      // Implementar lógica de eliminación
      return { id, status: 'synced', timestamp: Date.now() };
    case 'EXECUTE_WORKFLOW':
      // Implementar lógica de ejecución
      return { id, status: 'synced', timestamp: Date.now() };
    default:
      throw new Error(`Unknown sync type: ${type}`);
  }
};

// Estado inicial
const initialState = {
  isOnline: true,
  isConnected: false,
  connectionType: 'unknown',
  isConnectedFast: true,
  
  // Datos offline
  workflows: [],
  executions: [],
  queue: [],
  syncStatus: {
    lastSync: null,
    isSyncing: false,
    syncErrors: [],
    totalItems: 0,
    syncedItems: 0,
    failedItems: 0,
  },
  
  // Configuración offline
  config: {
    maxQueueSize: 100,
    maxOfflineDays: 30,
    autoSync: true,
    syncInterval: 5 * 60 * 1000, // 5 minutos
    enableOfflineExecution: true,
    enableDataCompression: true,
  },
  
  // Estado de sync
  autoSync: {
    enabled: true,
    interval: 5 * 60 * 1000, // 5 minutos
    lastAttempt: null,
    nextAttempt: null,
    backoffMultiplier: 1,
  },
  
  // Métricas
  metrics: {
    totalOfflineTime: 0,
    totalSyncTime: 0,
    dataSize: 0,
    networkUsage: 0,
  },
  
  // Estados de carga
  loading: {
    isLoading: false,
    isSyncing: false,
    isDownloading: false,
    isUploading: false,
  },
  
  error: null,
};

// Slice
const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action) => {
      const { isOnline, isConnected, connectionType, isConnectedFast } = action.payload;
      state.isOnline = isOnline;
      state.isConnected = isConnected;
      state.connectionType = connectionType;
      state.isConnectedFast = isConnectedFast;
    },
    
    setConnectionType: (state, action) => {
      state.connectionType = action.payload;
    },
    
    addOfflineWorkflow: (state, action) => {
      const workflow = {
        ...action.payload,
        id: action.payload.id || `offline_${Date.now()}`,
        isOffline: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      state.workflows.unshift(workflow);
    },
    
    updateOfflineWorkflow: (state, action) => {
      const { id, updates } = action.payload;
      const index = state.workflows.findIndex(w => w.id === id);
      if (index !== -1) {
        state.workflows[index] = {
          ...state.workflows[index],
          ...updates,
          updatedAt: Date.now(),
        };
      }
    },
    
    removeOfflineWorkflow: (state, action) => {
      const id = action.payload;
      state.workflows = state.workflows.filter(w => w.id !== id);
    },
    
    addExecutionRecord: (state, action) => {
      const execution = {
        ...action.payload,
        id: action.payload.id || `exec_${Date.now()}`,
        createdAt: Date.now(),
      };
      state.executions.unshift(execution);
    },
    
    addToQueue: (state, action) => {
      const { type, data, priority = 'normal' } = action.payload;
      const queueItem = {
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        priority,
        createdAt: Date.now(),
        attempts: 0,
        maxAttempts: 3,
      };
      
      // Insertar según prioridad
      if (priority === 'high') {
        state.queue.unshift(queueItem);
      } else {
        state.queue.push(queueItem);
      }
      
      // Limitar tamaño de cola
      if (state.queue.length > state.config.maxQueueSize) {
        state.queue = state.queue.slice(-state.config.maxQueueSize);
      }
    },
    
    removeFromQueue: (state, action) => {
      const id = action.payload;
      state.queue = state.queue.filter(item => item.id !== id);
    },
    
    updateQueueItem: (state, action) => {
      const { id, updates } = action.payload;
      const index = state.queue.findIndex(item => item.id === id);
      if (index !== -1) {
        state.queue[index] = { ...state.queue[index], ...updates };
      }
    },
    
    clearQueue: (state) => {
      state.queue = [];
    },
    
    setSyncing: (state, action) => {
      state.syncStatus.isSyncing = action.payload;
      state.loading.isSyncing = action.payload;
    },
    
    setSyncError: (state, action) => {
      const error = action.payload;
      state.syncStatus.syncErrors.push({
        id: Date.now(),
        message: error,
        timestamp: Date.now(),
      });
      
      // Mantener solo los últimos 10 errores
      if (state.syncStatus.syncErrors.length > 10) {
        state.syncStatus.syncErrors = state.syncStatus.syncErrors.slice(-10);
      }
    },
    
    updateSyncStatus: (state, action) => {
      state.syncStatus = { ...state.syncStatus, ...action.payload };
    },
    
    setLastSync: (state, action) => {
      state.syncStatus.lastSync = action.payload;
      state.autoSync.lastAttempt = action.payload;
    },
    
    setAutoSyncConfig: (state, action) => {
      const { enabled, interval } = action.payload;
      if (enabled !== undefined) state.autoSync.enabled = enabled;
      if (interval !== undefined) state.autoSync.interval = interval;
    },
    
    updateMetrics: (state, action) => {
      state.metrics = { ...state.metrics, ...action.payload };
    },
    
    setLoading: (state, action) => {
      const { key, value } = action.payload;
      if (state.loading.hasOwnProperty(key)) {
        state.loading[key] = value;
      }
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    resetOfflineData: (state) => {
      state.workflows = [];
      state.executions = [];
      state.queue = [];
      state.syncStatus = {
        lastSync: null,
        isSyncing: false,
        syncErrors: [],
        totalItems: 0,
        syncedItems: 0,
        failedItems: 0,
      };
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Sync Offline Data
      .addCase(syncOfflineData.pending, (state) => {
        state.syncStatus.isSyncing = true;
        state.loading.isSyncing = true;
        state.error = null;
      })
      .addCase(syncOfflineData.fulfilled, (state, action) => {
        const { successCount, errorCount, timestamp } = action.payload;
        state.syncStatus.isSyncing = false;
        state.loading.isSyncing = false;
        state.syncStatus.lastSync = timestamp;
        state.syncStatus.syncedItems += successCount;
        state.syncStatus.failedItems += errorCount;
        
        // Limpiar elementos sincronizados exitosamente
        state.queue = state.queue.filter(item => 
          !action.meta.arg.find(result => 
            result.status === 'fulfilled' && result.value.id === item.id
          )
        );
      })
      .addCase(syncOfflineData.rejected, (state, action) => {
        state.syncStatus.isSyncing = false;
        state.loading.isSyncing = false;
        state.error = action.payload;
      })
      
      // Load Offline Data
      .addCase(loadOfflineData.fulfilled, (state, action) => {
        const { workflows, executions, queue, syncStatus } = action.payload;
        state.workflows = workflows;
        state.executions = executions;
        state.queue = queue;
        state.syncStatus = { ...state.syncStatus, ...syncStatus };
      })
      .addCase(loadOfflineData.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Save Offline Data
      .addCase(saveOfflineData.pending, (state) => {
        state.loading.isLoading = true;
      })
      .addCase(saveOfflineData.fulfilled, (state) => {
        state.loading.isLoading = false;
      })
      .addCase(saveOfflineData.rejected, (state, action) => {
        state.loading.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setOnlineStatus,
  setConnectionType,
  addOfflineWorkflow,
  updateOfflineWorkflow,
  removeOfflineWorkflow,
  addExecutionRecord,
  addToQueue,
  removeFromQueue,
  updateQueueItem,
  clearQueue,
  setSyncing,
  setSyncError,
  updateSyncStatus,
  setLastSync,
  setAutoSyncConfig,
  updateMetrics,
  setLoading,
  clearError,
  resetOfflineData,
} = offlineSlice.actions;

// Selectors
export const selectOnlineStatus = (state) => ({
  isOnline: state.offline.isOnline,
  isConnected: state.offline.isConnected,
  connectionType: state.offline.connectionType,
  isConnectedFast: state.offline.isConnectedFast,
});
export const selectOfflineWorkflows = (state) => state.offline.workflows;
export const selectOfflineExecutions = (state) => state.offline.executions;
export const selectOfflineQueue = (state) => state.offline.queue;
export const selectSyncStatus = (state) => state.offline.syncStatus;
export const selectAutoSync = (state) => state.offline.autoSync;
export const selectOfflineMetrics = (state) => state.offline.metrics;
export const selectOfflineLoading = (state) => state.offline.loading;
export const selectOfflineError = (state) => state.offline.error;

export default offlineSlice.reducer;