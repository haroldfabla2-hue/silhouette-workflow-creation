import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';

// Importar slices
import authSlice from './slices/authSlice';
import workflowsSlice from './slices/workflowsSlice';
import notificationsSlice from './slices/notificationsSlice';
import uiSlice from './slices/uiSlice';
import offlineSlice from './slices/offlineSlice';

// Configurar MMKV para persistencia
const storage = new MMKV();

// Configurar persistencia
const persistConfig = {
  key: 'root',
  storage: {
    getItem: (key) => storage.getString(key),
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
  blacklist: ['ui'], // No persistir UI state
};

// Combinar reducers
const rootReducer = combineReducers({
  auth: authSlice,
  workflows: workflowsSlice,
  notifications: notificationsSlice,
  ui: uiSlice,
  offline: offlineSlice,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configurar store
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: ['register'],
      },
    }),
  devTools: __DEV__,
});

// Persistor
const persistor = persistStore(store);

export { store, persistor };
export default store;