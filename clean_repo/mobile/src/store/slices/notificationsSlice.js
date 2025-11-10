import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationsAPI } from '../../services/api';

// Actions asíncronas
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async ({ page = 1, limit = 20 }, { rejectWithValue }) => {
    try {
      const response = await notificationsAPI.getAll({ page, limit });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar notificaciones');
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      const response = await notificationsAPI.markAsRead(notificationId);
      return { id: notificationId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al marcar notificación');
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      await notificationsAPI.markAllAsRead();
      return true;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al marcar todas como leídas');
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/delete',
  async (notificationId, { rejectWithValue }) => {
    try {
      await notificationsAPI.delete(notificationId);
      return notificationId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al eliminar notificación');
    }
  }
);

export const updateNotificationSettings = createAsyncThunk(
  'notifications/updateSettings',
  async (settings, { rejectWithValue }) => {
    try {
      const response = await notificationsAPI.updateSettings(settings);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar configuración');
    }
  }
);

// Estado inicial
const initialState = {
  notifications: [],
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  settings: {
    email: true,
    push: true,
    workflow: true,
    system: true,
    security: true,
    updates: false,
  },
  unreadCount: 0,
  filter: 'all', // all, unread, read
  sortBy: 'createdAt',
  sortOrder: 'desc',
  lastFetch: null,
  pushToken: null,
  localNotifications: [],
  pushSettings: {
    sound: true,
    vibration: true,
    badge: true,
  },
};

// Slice
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addLocalNotification: (state, action) => {
      state.localNotifications.unshift({
        ...action.payload,
        id: Date.now().toString(),
        createdAt: Date.now(),
        isRead: false,
        isLocal: true,
      });
    },
    removeLocalNotification: (state, action) => {
      state.localNotifications = state.localNotifications.filter(
        n => n.id !== action.payload
      );
    },
    setFilter: (state, action) => {
      state.filter = action.payload;
    },
    setSort: (state, action) => {
      const { sortBy, sortOrder } = action.payload;
      state.sortBy = sortBy || state.sortBy;
      state.sortOrder = sortOrder || state.sortOrder;
    },
    setPushToken: (state, action) => {
      state.pushToken = action.payload;
    },
    updatePushSettings: (state, action) => {
      state.pushSettings = { ...state.pushSettings, ...action.payload };
    },
    incrementUnreadCount: (state) => {
      state.unreadCount += 1;
    },
    decrementUnreadCount: (state) => {
      if (state.unreadCount > 0) {
        state.unreadCount -= 1;
      }
    },
    resetUnreadCount: (state) => {
      state.unreadCount = 0;
    },
    setLastFetch: (state) => {
      state.lastFetch = Date.now();
    },
    updateSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        const { notifications, pagination, unreadCount } = action.payload;
        state.notifications = notifications;
        state.pagination = pagination;
        state.unreadCount = unreadCount;
        state.lastFetch = Date.now();
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Mark as Read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(n => n.id === action.payload.id);
        if (index !== -1) {
          state.notifications[index] = { ...state.notifications[index], ...action.payload };
          if (!state.notifications[index].isRead) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Mark All as Read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map(n => ({ ...n, isRead: true }));
        state.unreadCount = 0;
      })
      .addCase(markAllAsRead.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Delete Notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(n => n.id === action.payload);
        if (index !== -1 && !state.notifications[index].isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications = state.notifications.filter(n => n.id !== action.payload);
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Update Settings
      .addCase(updateNotificationSettings.fulfilled, (state, action) => {
        state.settings = { ...state.settings, ...action.payload };
      })
      .addCase(updateNotificationSettings.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  addLocalNotification,
  removeLocalNotification,
  setFilter,
  setSort,
  setPushToken,
  updatePushSettings,
  incrementUnreadCount,
  decrementUnreadCount,
  resetUnreadCount,
  setLastFetch,
  updateSettings,
  clearAllNotifications,
} = notificationsSlice.actions;

// Selectors
export const selectNotifications = (state) => state.notifications.notifications;
export const selectLocalNotifications = (state) => state.notifications.localNotifications;
export const selectNotificationsLoading = (state) => state.notifications.isLoading;
export const selectNotificationsError = (state) => state.notifications.error;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectNotificationSettings = (state) => state.notifications.settings;
export const selectNotificationFilters = (state) => state.notifications.filter;
export const selectPushToken = (state) => state.notifications.pushToken;
export const selectPushSettings = (state) => state.notifications.pushSettings;
export const selectLastFetch = (state) => state.notifications.lastFetch;

export default notificationsSlice.reducer;