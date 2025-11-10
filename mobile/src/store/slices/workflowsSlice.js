import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { workflowsAPI } from '../../services/api';

// Actions asíncronas
export const fetchWorkflows = createAsyncThunk(
  'workflows/fetchAll',
  async ({ page = 1, limit = 20, search = '' }, { rejectWithValue }) => {
    try {
      const response = await workflowsAPI.getAll({ page, limit, search });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar workflows');
    }
  }
);

export const fetchWorkflowById = createAsyncThunk(
  'workflows/fetchById',
  async (workflowId, { rejectWithValue }) => {
    try {
      const response = await workflowsAPI.getById(workflowId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar workflow');
    }
  }
);

export const createWorkflow = createAsyncThunk(
  'workflows/create',
  async (workflowData, { rejectWithValue }) => {
    try {
      const response = await workflowsAPI.create(workflowData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear workflow');
    }
  }
);

export const updateWorkflow = createAsyncThunk(
  'workflows/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await workflowsAPI.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar workflow');
    }
  }
);

export const deleteWorkflow = createAsyncThunk(
  'workflows/delete',
  async (workflowId, { rejectWithValue }) => {
    try {
      await workflowsAPI.delete(workflowId);
      return workflowId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al eliminar workflow');
    }
  }
);

export const duplicateWorkflow = createAsyncThunk(
  'workflows/duplicate',
  async (workflowId, { rejectWithValue }) => {
    try {
      const response = await workflowsAPI.duplicate(workflowId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al duplicar workflow');
    }
  }
);

export const executeWorkflow = createAsyncThunk(
  'workflows/execute',
  async ({ workflowId, inputs = {} }, { rejectWithValue }) => {
    try {
      const response = await workflowsAPI.execute(workflowId, inputs);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al ejecutar workflow');
    }
  }
);

export const fetchWorkflowStats = createAsyncThunk(
  'workflows/fetchStats',
  async (workflowId, { rejectWithValue }) => {
    try {
      const response = await workflowsAPI.getStats(workflowId);
      return { workflowId, stats: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar estadísticas');
    }
  }
);

export const validateWorkflow = createAsyncThunk(
  'workflows/validate',
  async (workflowData, { rejectWithValue }) => {
    try {
      const response = await workflowsAPI.validate(workflowData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al validar workflow');
    }
  }
);

// Estado inicial
const initialState = {
  workflows: [],
  currentWorkflow: null,
  isLoading: false,
  isExecuting: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  searchQuery: '',
  filters: {
    status: 'all', // all, active, inactive
    category: 'all',
    tags: [],
  },
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  selectedWorkflows: [],
  executionHistory: [],
  workflowStats: {},
  editor: {
    isDirty: false,
    isValid: true,
    autoSave: true,
    lastSaved: null,
  },
  offline: {
    pendingChanges: [],
    isOnline: true,
    lastSync: null,
  },
};

// Slice
const workflowsSlice = createSlice({
  name: 'workflows',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSort: (state, action) => {
      const { sortBy, sortOrder } = action.payload;
      state.sortBy = sortBy || state.sortBy;
      state.sortOrder = sortOrder || state.sortOrder;
    },
    selectWorkflow: (state, action) => {
      const workflowId = action.payload;
      if (state.selectedWorkflows.includes(workflowId)) {
        state.selectedWorkflows = state.selectedWorkflows.filter(id => id !== workflowId);
      } else {
        state.selectedWorkflows.push(workflowId);
      }
    },
    selectAllWorkflows: (state) => {
      state.selectedWorkflows = state.workflows.map(w => w.id);
    },
    clearSelection: (state) => {
      state.selectedWorkflows = [];
    },
    setCurrentWorkflow: (state, action) => {
      state.currentWorkflow = action.payload;
      state.editor.isDirty = false;
    },
    updateCurrentWorkflow: (state, action) => {
      if (state.currentWorkflow) {
        state.currentWorkflow = { ...state.currentWorkflow, ...action.payload };
        state.editor.isDirty = true;
      }
    },
    setEditorDirty: (state, action) => {
      state.editor.isDirty = action.payload;
    },
    setEditorValid: (state, action) => {
      state.editor.isValid = action.payload;
    },
    setAutoSave: (state, action) => {
      state.editor.autoSave = action.payload;
    },
    addPendingChange: (state, action) => {
      state.offline.pendingChanges.push({
        id: Date.now(),
        type: action.payload.type,
        data: action.payload.data,
        timestamp: Date.now(),
      });
    },
    clearPendingChanges: (state) => {
      state.offline.pendingChanges = [];
    },
    updateOnlineStatus: (state, action) => {
      state.offline.isOnline = action.payload;
    },
    setLastSync: (state) => {
      state.offline.lastSync = Date.now();
    },
    addExecutionToHistory: (state, action) => {
      state.executionHistory.unshift(action.payload);
      // Mantener solo los últimos 50 registros
      if (state.executionHistory.length > 50) {
        state.executionHistory = state.executionHistory.slice(0, 50);
      }
    },
    resetState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Workflows
      .addCase(fetchWorkflows.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkflows.fulfilled, (state, action) => {
        state.isLoading = false;
        state.workflows = action.payload.workflows;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchWorkflows.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Workflow by ID
      .addCase(fetchWorkflowById.fulfilled, (state, action) => {
        state.currentWorkflow = action.payload;
        state.editor.isDirty = false;
        state.editor.isValid = true;
      })
      .addCase(fetchWorkflowById.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Create Workflow
      .addCase(createWorkflow.fulfilled, (state, action) => {
        state.workflows.unshift(action.payload);
        state.currentWorkflow = action.payload;
        state.editor.isDirty = false;
      })
      .addCase(createWorkflow.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Update Workflow
      .addCase(updateWorkflow.fulfilled, (state, action) => {
        const index = state.workflows.findIndex(w => w.id === action.payload.id);
        if (index !== -1) {
          state.workflows[index] = action.payload;
        }
        if (state.currentWorkflow?.id === action.payload.id) {
          state.currentWorkflow = action.payload;
          state.editor.isDirty = false;
          state.editor.lastSaved = Date.now();
        }
      })
      .addCase(updateWorkflow.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Delete Workflow
      .addCase(deleteWorkflow.fulfilled, (state, action) => {
        state.workflows = state.workflows.filter(w => w.id !== action.payload);
        if (state.currentWorkflow?.id === action.payload) {
          state.currentWorkflow = null;
        }
        state.selectedWorkflows = state.selectedWorkflows.filter(id => id !== action.payload);
      })
      .addCase(deleteWorkflow.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Duplicate Workflow
      .addCase(duplicateWorkflow.fulfilled, (state, action) => {
        state.workflows.unshift(action.payload);
      })
      .addCase(duplicateWorkflow.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Execute Workflow
      .addCase(executeWorkflow.pending, (state) => {
        state.isExecuting = true;
        state.error = null;
      })
      .addCase(executeWorkflow.fulfilled, (state, action) => {
        state.isExecuting = false;
        state.executionHistory.unshift({
          workflowId: action.payload.workflowId,
          executionId: action.payload.executionId,
          status: 'completed',
          timestamp: Date.now(),
          inputs: action.payload.inputs,
          outputs: action.payload.outputs,
        });
      })
      .addCase(executeWorkflow.rejected, (state, action) => {
        state.isExecuting = false;
        state.error = action.payload;
      })
      
      // Fetch Workflow Stats
      .addCase(fetchWorkflowStats.fulfilled, (state, action) => {
        const { workflowId, stats } = action.payload;
        state.workflowStats[workflowId] = stats;
      })
      .addCase(fetchWorkflowStats.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Validate Workflow
      .addCase(validateWorkflow.fulfilled, (state, action) => {
        state.editor.isValid = action.payload.isValid;
        if (action.payload.errors) {
          state.editor.validationErrors = action.payload.errors;
        }
      })
      .addCase(validateWorkflow.rejected, (state, action) => {
        state.error = action.payload;
        state.editor.isValid = false;
      });
  },
});

export const {
  clearError,
  setSearchQuery,
  setFilters,
  setSort,
  selectWorkflow,
  selectAllWorkflows,
  clearSelection,
  setCurrentWorkflow,
  updateCurrentWorkflow,
  setEditorDirty,
  setEditorValid,
  setAutoSave,
  addPendingChange,
  clearPendingChanges,
  updateOnlineStatus,
  setLastSync,
  addExecutionToHistory,
  resetState,
} = workflowsSlice.actions;

// Selectors
export const selectWorkflows = (state) => state.workflows.workflows;
export const selectCurrentWorkflow = (state) => state.workflows.currentWorkflow;
export const selectWorkflowsLoading = (state) => state.workflows.isLoading;
export const selectWorkflowExecuting = (state) => state.workflows.isExecuting;
export const selectWorkflowsError = (state) => state.workflows.error;
export const selectWorkflowsPagination = (state) => state.workflows.pagination;
export const selectWorkflowsFilters = (state) => state.workflows.filters;
export const selectSelectedWorkflows = (state) => state.workflows.selectedWorkflows;
export const selectExecutionHistory = (state) => state.workflows.executionHistory;
export const selectWorkflowStats = (state) => state.workflows.workflowStats;
export const selectEditorState = (state) => state.workflows.editor;
export const selectOfflineState = (state) => state.workflows.offline;

export default workflowsSlice.reducer;