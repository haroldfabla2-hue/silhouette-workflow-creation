import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Importar screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import WorkflowsScreen from '../screens/workflows/WorkflowsScreen';
import WorkflowEditorScreen from '../screens/workflows/WorkflowEditorScreen';
import WorkflowExecutionScreen from '../screens/workflows/WorkflowExecutionScreen';
import AICenterScreen from '../screens/ai/AICenterScreen';
import CredentialsScreen from '../screens/credentials/CredentialsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import HelpScreen from '../screens/help/HelpScreen';

// Custom drawer component
import CustomDrawer from '../components/navigation/CustomDrawer';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Stack de autenticación
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: '#F9FAFB' },
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

// Tab navigator principal
const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        switch (route.name) {
          case 'Dashboard':
            iconName = 'dashboard';
            break;
          case 'Workflows':
            iconName = 'account-tree';
            break;
          case 'AI':
            iconName = 'psychology';
            break;
          case 'Profile':
            iconName = 'person';
            break;
          default:
            iconName = 'help';
        }
        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#6366F1',
      tabBarInactiveTintColor: '#6B7280',
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingBottom: 5,
        paddingTop: 5,
        height: 60,
      },
      headerShown: false,
    })}
  >
    <Tab.Screen 
      name="Dashboard" 
      component={DashboardScreen}
      options={{ tabBarLabel: 'Panel' }}
    />
    <Tab.Screen 
      name="Workflows" 
      component={WorkflowsStack}
      options={{ tabBarLabel: 'Flujos' }}
    />
    <Tab.Screen 
      name="AI" 
      component={AICenterScreen}
      options={{ tabBarLabel: 'IA' }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileStack}
      options={{ tabBarLabel: 'Perfil' }}
    />
  </Tab.Navigator>
);

// Stack de workflows
const WorkflowsStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="WorkflowsMain" 
      component={WorkflowsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="WorkflowEditor" 
      component={WorkflowEditorScreen}
      options={{
        title: 'Editor de Flujo',
        headerBackTitleVisible: false,
        headerStyle: { backgroundColor: '#6366F1' },
        headerTintColor: '#FFFFFF',
      }}
    />
    <Stack.Screen 
      name="WorkflowExecution" 
      component={WorkflowExecutionScreen}
      options={{
        title: 'Ejecutar Flujo',
        headerBackTitleVisible: false,
        headerStyle: { backgroundColor: '#6366F1' },
        headerTintColor: '#FFFFFF',
      }}
    />
  </Stack.Navigator>
);

// Stack de perfil
const ProfileStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="ProfileMain" 
      component={ProfileScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="Settings" 
      component={SettingsScreen}
      options={{
        title: 'Configuración',
        headerBackTitleVisible: false,
        headerStyle: { backgroundColor: '#6366F1' },
        headerTintColor: '#FFFFFF',
      }}
    />
    <Stack.Screen 
      name="Credentials" 
      component={CredentialsScreen}
      options={{
        title: 'Credenciales',
        headerBackTitleVisible: false,
        headerStyle: { backgroundColor: '#6366F1' },
        headerTintColor: '#FFFFFF',
      }}
    />
  </Stack.Navigator>
);

// Drawer navigator
const MainDrawerNavigator = () => (
  <Drawer.Navigator
    drawerContent={(props) => <CustomDrawer {...props} />}
    screenOptions={{
      drawerActiveBackgroundColor: '#A5B4FC',
      drawerActiveTintColor: '#FFFFFF',
      drawerInactiveTintColor: '#6B7280',
      drawerLabelStyle: {
        fontSize: 16,
        fontWeight: '500',
      },
    }}
  >
    <Drawer.Screen 
      name="MainTabs" 
      component={MainTabNavigator}
      options={{ 
        drawerLabel: 'Inicio',
        drawerIcon: ({ color }) => <Icon name="home" size={20} color={color} />
      }}
    />
    <Drawer.Screen 
      name="Notifications" 
      component={NotificationsScreen}
      options={{ 
        drawerLabel: 'Notificaciones',
        drawerIcon: ({ color }) => <Icon name="notifications" size={20} color={color} />
      }}
    />
    <Drawer.Screen 
      name="Help" 
      component={HelpScreen}
      options={{ 
        drawerLabel: 'Ayuda',
        drawerIcon: ({ color }) => <Icon name="help" size={20} color={color} />
      }}
    />
  </Drawer.Navigator>
);

// Stack principal de la aplicación
const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainDrawer" component={MainDrawerNavigator} />
  </Stack.Navigator>
);

// Navegador raíz
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = React.useContext(require('../contexts/AuthContext').AuthContext);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;