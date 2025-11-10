import { createSlice } from '@reduxjs/toolkit';

// Estado inicial
const initialState = {
  theme: 'auto', // auto, light, dark
  language: 'es',
  screen: {
    isLoading: false,
    title: 'Silhouette Workflow',
    showBackButton: false,
    showSearchButton: false,
    showFilterButton: false,
    showSettingsButton: true,
  },
  modals: {
    isWorkflowEditorOpen: false,
    isSettingsOpen: false,
    isProfileOpen: false,
    isHelpOpen: false,
    isLoading: false,
  },
  drawers: {
    isSettingsDrawerOpen: false,
    isFilterDrawerOpen: false,
  },
  bottomSheets: {
    isCreateWorkflowOpen: false,
    isCreateNodeOpen: false,
    isExportOpen: false,
    isShareOpen: false,
    isDeleteConfirmOpen: false,
  },
  toast: {
    visible: false,
    message: '',
    type: 'info', // info, success, warning, error
    duration: 3000,
    position: 'top',
  },
  snackbar: {
    visible: false,
    message: '',
    action: null, // { label, onPress }
    duration: 4000,
  },
  loading: {
    global: false,
    workflows: false,
    auth: false,
    notifications: false,
    ai: false,
  },
  network: {
    isConnected: true,
    isFast: true,
    connectionType: 'wifi', // wifi, cellular, unknown
  },
  device: {
    isTablet: false,
    screenWidth: 375,
    screenHeight: 812,
    orientation: 'portrait',
    safeAreaInsets: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  },
  app: {
    isInitialized: false,
    version: '1.0.0',
    buildNumber: '1',
    lastUpdate: null,
    needsUpdate: false,
  },
  debug: {
    isEnabled: __DEV__,
    showPerformance: false,
    showNetworkRequests: false,
    showReduxDevtools: false,
  },
  performance: {
    renderTime: 0,
    memoryUsage: 0,
    fps: 60,
  },
};

// Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    
    // Language
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
    
    // Screen
    setScreenTitle: (state, action) => {
      state.screen.title = action.payload;
    },
    setScreenLoading: (state, action) => {
      state.screen.isLoading = action.payload;
    },
    setScreenButtons: (state, action) => {
      state.screen = { ...state.screen, ...action.payload };
    },
    
    // Modals
    openModal: (state, action) => {
      const modalName = action.payload;
      if (state.modals.hasOwnProperty(`is${modalName}Open`)) {
        state.modals[`is${modalName}Open`] = true;
      }
    },
    closeModal: (state, action) => {
      const modalName = action.payload;
      if (state.modals.hasOwnProperty(`is${modalName}Open`)) {
        state.modals[`is${modalName}Open`] = false;
      }
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(key => {
        if (typeof state.modals[key] === 'boolean') {
          state.modals[key] = false;
        }
      });
    },
    
    // Drawers
    openDrawer: (state, action) => {
      const drawerName = action.payload;
      if (state.drawers.hasOwnProperty(`is${drawerName}DrawerOpen`)) {
        state.drawers[`is${drawerName}DrawerOpen`] = true;
      }
    },
    closeDrawer: (state, action) => {
      const drawerName = action.payload;
      if (state.drawers.hasOwnProperty(`is${drawerName}DrawerOpen`)) {
        state.drawers[`is${drawerName}DrawerOpen`] = false;
      }
    },
    
    // Bottom Sheets
    openBottomSheet: (state, action) => {
      const sheetName = action.payload;
      if (state.bottomSheets.hasOwnProperty(`is${sheetName}Open`)) {
        state.bottomSheets[`is${sheetName}Open`] = true;
      }
    },
    closeBottomSheet: (state, action) => {
      const sheetName = action.payload;
      if (state.bottomSheets.hasOwnProperty(`is${sheetName}Open`)) {
        state.bottomSheets[`is${sheetName}Open`] = false;
      }
    },
    closeAllBottomSheets: (state) => {
      Object.keys(state.bottomSheets).forEach(key => {
        if (typeof state.bottomSheets[key] === 'boolean') {
          state.bottomSheets[key] = false;
        }
      });
    },
    
    // Toast
    showToast: (state, action) => {
      const { message, type = 'info', duration = 3000, position = 'top' } = action.payload;
      state.toast = {
        visible: true,
        message,
        type,
        duration,
        position,
      };
    },
    hideToast: (state) => {
      state.toast.visible = false;
    },
    
    // Snackbar
    showSnackbar: (state, action) => {
      const { message, action: snackbarAction = null, duration = 4000 } = action.payload;
      state.snackbar = {
        visible: true,
        message,
        action: snackbarAction,
        duration,
      };
    },
    hideSnackbar: (state) => {
      state.snackbar.visible = false;
    },
    
    // Loading states
    setGlobalLoading: (state, action) => {
      state.loading.global = action.payload;
    },
    setLoadingState: (state, action) => {
      const { key, value } = action.payload;
      if (state.loading.hasOwnProperty(key)) {
        state.loading[key] = value;
      }
    },
    
    // Network
    setNetworkState: (state, action) => {
      state.network = { ...state.network, ...action.payload };
    },
    
    // Device
    setDeviceState: (state, action) => {
      state.device = { ...state.device, ...action.payload };
    },
    setDeviceOrientation: (state, action) => {
      state.device.orientation = action.payload;
    },
    setSafeAreaInsets: (state, action) => {
      state.device.safeAreaInsets = action.payload;
    },
    
    // App
    setAppInitialized: (state, action) => {
      state.app.isInitialized = action.payload;
    },
    setAppNeedsUpdate: (state, action) => {
      state.app.needsUpdate = action.payload;
    },
    setAppVersion: (state, action) => {
      state.app.version = action.payload;
    },
    
    // Debug
    setDebugState: (state, action) => {
      const { key, value } = action.payload;
      if (state.debug.hasOwnProperty(key)) {
        state.debug[key] = value;
      }
    },
    
    // Performance
    setPerformanceMetrics: (state, action) => {
      state.performance = { ...state.performance, ...action.payload };
    },
    
    // Reset UI state
    resetUIState: () => initialState,
  },
});

export const {
  setTheme,
  setLanguage,
  setScreenTitle,
  setScreenLoading,
  setScreenButtons,
  openModal,
  closeModal,
  closeAllModals,
  openDrawer,
  closeDrawer,
  openBottomSheet,
  closeBottomSheet,
  closeAllBottomSheets,
  showToast,
  hideToast,
  showSnackbar,
  hideSnackbar,
  setGlobalLoading,
  setLoadingState,
  setNetworkState,
  setDeviceState,
  setDeviceOrientation,
  setSafeAreaInsets,
  setAppInitialized,
  setAppNeedsUpdate,
  setAppVersion,
  setDebugState,
  setPerformanceMetrics,
  resetUIState,
} = uiSlice.actions;

// Selectors
export const selectTheme = (state) => state.ui.theme;
export const selectLanguage = (state) => state.ui.language;
export const selectScreen = (state) => state.ui.screen;
export const selectModals = (state) => state.ui.modals;
export const selectDrawers = (state) => state.ui.drawers;
export const selectBottomSheets = (state) => state.ui.bottomSheets;
export const selectToast = (state) => state.ui.toast;
export const selectSnackbar = (state) => state.ui.snackbar;
export const selectLoading = (state) => state.ui.loading;
export const selectNetwork = (state) => state.ui.network;
export const selectDevice = (state) => state.ui.device;
export const selectApp = (state) => state.ui.app;
export const selectDebug = (state) => state.ui.debug;
export const selectPerformance = (state) => state.ui.performance;

export default uiSlice.reducer;