import React from 'react';
import { AppRegistry, StatusBar } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as PaperProvider } from 'react-native-paper';
import { PersistGate } from 'redux-persist/integration/react';
import { MMKV } from 'react-native-mmkv';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store, persistor } from './src/store';
import AppNavigator from './src/navigation';
import { theme } from './src/theme';
import { NotificationManager } from './src/services/NotificationService';
import { AuthProvider } from './src/contexts/AuthContext';
import SplashScreen from './src/screens/SplashScreen';
import './src/config/i18n';

// Configurar MMKV
export const storage = new MMKV();

// Inicializar notificaciones
NotificationManager.initialize();

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <PersistGate loading={<SplashScreen />} persistor={persistor}>
            <PaperProvider theme={theme}>
              <AuthProvider>
                <StatusBar
                  barStyle="light-content"
                  backgroundColor={theme.colors.primary}
                  translucent={false}
                />
                <AppNavigator />
              </AuthProvider>
            </PaperProvider>
          </PersistGate>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

AppRegistry.registerComponent('SilhouetteWorkflow', () => App);

export default App;