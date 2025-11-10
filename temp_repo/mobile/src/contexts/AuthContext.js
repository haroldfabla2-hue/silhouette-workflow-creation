import React, { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  loginUser, 
  registerUser, 
  logout, 
  selectUser, 
  selectIsAuthenticated, 
  selectAuthLoading,
  selectAuthError,
  updateActivity,
  checkSessionTimeout
} from '../store/slices/authSlice';
import { authAPI } from '../services/api';
import { showToast } from '../store/slices/uiSlice';
import { NotificationManager } from '../services/NotificationService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionCheckInterval, setSessionCheckInterval] = useState(null);

  // Inicializar autenticación
  useEffect(() => {
    initializeAuth();
  }, []);

  // Verificar sesión periódicamente
  useEffect(() => {
    if (isAuthenticated) {
      // Iniciar verificación de sesión cada 5 minutos
      const interval = setInterval(() => {
        dispatch(checkSessionTimeout());
      }, 5 * 60 * 1000);
      
      setSessionCheckInterval(interval);
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else {
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        setSessionCheckInterval(null);
      }
    }
  }, [isAuthenticated, dispatch]);

  // Manejar cambios de autenticación
  useEffect(() => {
    if (isAuthenticated && user) {
      // Configurar notificaciones push
      setupPushNotifications();
      
      // Actualizar actividad
      dispatch(updateActivity());
      
      // Mostrar mensaje de bienvenida
      dispatch(showToast({
        message: `¡Bienvenido de vuelta, ${user.name}!`,
        type: 'success',
        duration: 3000,
      }));
    } else if (!isAuthenticated && isInitialized) {
      // Limpiar notificaciones
      NotificationManager.cleanup();
      
      // Mostrar mensaje de despedida
      dispatch(showToast({
        message: 'Sesión cerrada correctamente',
        type: 'info',
        duration: 2000,
      }));
    }
  }, [isAuthenticated, user, isInitialized, dispatch]);

  const initializeAuth = async () => {
    try {
      // Verificar si hay un token válido
      const token = await getStoredToken();
      if (token) {
        // Verificar token con el servidor
        try {
          await authAPI.verify();
          // Si el token es válido, mantener sesión
          // El reducer de Redux se encargará de actualizar el estado
        } catch (error) {
          // Token inválido, limpiar
          await clearStoredAuth();
        }
      }
    } catch (error) {
      console.error('Error al inicializar autenticación:', error);
    } finally {
      setIsInitialized(true);
    }
  };

  const login = async (email, password) => {
    try {
      const result = await dispatch(loginUser({ email, password }));
      if (loginUser.fulfilled.match(result)) {
        // Guardar token en almacenamiento seguro
        await storeAuthData(result.payload);
        
        // Configurar notificaciones push
        await setupPushNotifications();
        
        return { success: true, user: result.payload.user };
      } else {
        return { success: false, error: result.payload };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (name, email, password) => {
    try {
      const result = await dispatch(registerUser({ name, email, password }));
      if (registerUser.fulfilled.match(result)) {
        // Guardar token en almacenamiento seguro
        await storeAuthData(result.payload);
        
        // Configurar notificaciones push
        await setupPushNotifications();
        
        return { success: true, user: result.payload.user };
      } else {
        return { success: false, error: result.payload };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logoutUser = async () => {
    try {
      // Cerrar sesión en el servidor
      await authAPI.logout();
    } catch (error) {
      console.error('Error al cerrar sesión en servidor:', error);
    } finally {
      // Limpiar estado local
      await clearStoredAuth();
      dispatch(logout());
    }
  };

  const refreshSession = async () => {
    try {
      const result = await authAPI.refresh();
      if (result.data) {
        // Actualizar token
        const newAuthData = {
          user: result.data.user,
          accessToken: result.data.accessToken,
          refreshToken: result.data.refreshToken,
        };
        await storeAuthData(newAuthData);
        dispatch(updateActivity());
        return true;
      }
    } catch (error) {
      console.error('Error al refrescar sesión:', error);
      await logoutUser();
      return false;
    }
  };

  const setupPushNotifications = async () => {
    try {
      const success = await NotificationManager.initialize();
      if (success) {
        // Registrar token con el servidor
        const status = NotificationManager.getStatus();
        if (status.expoPushToken) {
          await authAPI.registerPushToken(status.expoPushToken);
        }
      }
    } catch (error) {
      console.error('Error al configurar notificaciones push:', error);
    }
  };

  const storeAuthData = async (authData) => {
    try {
      const EncryptedStorage = require('react-native-encrypted-storage').default;
      await EncryptedStorage.setItem('auth_data', JSON.stringify({
        user: authData.user,
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Error al guardar datos de autenticación:', error);
    }
  };

  const getStoredToken = async () => {
    try {
      const EncryptedStorage = require('react-native-encrypted-storage').default;
      const authData = await EncryptedStorage.getItem('auth_data');
      if (authData) {
        const parsed = JSON.parse(authData);
        
        // Verificar si el token ha expirado
        const now = Date.now();
        const tokenAge = now - parsed.timestamp;
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 días
        
        if (tokenAge < maxAge) {
          return parsed.accessToken;
        }
      }
    } catch (error) {
      console.error('Error al obtener token almacenado:', error);
    }
    return null;
  };

  const clearStoredAuth = async () => {
    try {
      const EncryptedStorage = require('react-native-encrypted-storage').default;
      await EncryptedStorage.removeItem('auth_data');
    } catch (error) {
      console.error('Error al limpiar datos de autenticación:', error);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const result = await authAPI.updateProfile(profileData);
      if (result.data) {
        dispatch(updateActivity());
        return { success: true, user: result.data };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const result = await authAPI.changePassword({
        currentPassword,
        newPassword,
      });
      if (result.data) {
        dispatch(showToast({
          message: 'Contraseña cambiada correctamente',
          type: 'success',
        }));
        return { success: true };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const forgotPassword = async (email) => {
    try {
      await authAPI.forgotPassword({ email });
      dispatch(showToast({
        message: 'Se ha enviado un enlace de recuperación a tu email',
        type: 'success',
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      await authAPI.resetPassword({ token, newPassword });
      dispatch(showToast({
        message: 'Contraseña restablecida correctamente',
        type: 'success',
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const contextValue = {
    // Estado
    user,
    isAuthenticated,
    isLoading,
    error,
    isInitialized,
    
    // Métodos
    login,
    register,
    logout: logoutUser,
    refreshSession,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    setupPushNotifications,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;