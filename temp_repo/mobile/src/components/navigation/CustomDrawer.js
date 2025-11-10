import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, SafeAreaView, ScrollView } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { colors, theme } from '../../theme';
import { logout } from '../../store/slices/authSlice';
import { CustomButton } from '../ui/CustomButton';

const CustomDrawer = (props) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar Sesión', 
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
            props.navigation.closeDrawer();
          }
        },
      ]
    );
  };

  const menuItems = [
    {
      name: 'Dashboard',
      icon: 'dashboard',
      label: 'Panel de Control',
      screen: 'MainTabs',
    },
    {
      name: 'Workflows',
      icon: 'account-tree',
      label: 'Mis Flujos',
      screen: 'WorkflowsMain',
    },
    {
      name: 'AI',
      icon: 'psychology',
      label: 'Centro de IA',
      screen: 'AI',
    },
    {
      name: 'Profile',
      icon: 'person',
      label: 'Mi Perfil',
      screen: 'ProfileMain',
    },
  ];

  const secondaryItems = [
    {
      name: 'Settings',
      icon: 'settings',
      label: 'Configuración',
      screen: 'Settings',
    },
    {
      name: 'Notifications',
      icon: 'notifications',
      label: 'Notificaciones',
      screen: 'Notifications',
    },
    {
      name: 'Help',
      icon: 'help',
      label: 'Ayuda',
      screen: 'Help',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Icon name="person" size={32} color={colors.primary} />
                </View>
              )}
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {user?.name || 'Usuario'}
              </Text>
              <Text style={styles.userEmail}>
                {user?.email || 'usuario@ejemplo.com'}
              </Text>
            </View>
          </View>
        </View>

        {/* Main Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Principal</Text>
          {menuItems.map((item) => (
            <DrawerItem
              key={item.name}
              label={item.label}
              icon={({ color, size }) => (
                <Icon name={item.icon} size={size} color={color} />
              )}
              onPress={() => props.navigation.navigate(item.screen)}
              style={styles.drawerItem}
              labelStyle={styles.drawerItemLabel}
            />
          ))}
        </View>

        {/* Secondary Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Más</Text>
          {secondaryItems.map((item) => (
            <DrawerItem
              key={item.name}
              label={item.label}
              icon={({ color, size }) => (
                <Icon name={item.icon} size={size} color={color} />
              )}
              onPress={() => props.navigation.navigate(item.screen)}
              style={styles.drawerItem}
              labelStyle={styles.drawerItemLabel}
            />
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <CustomButton
          title="Cerrar Sesión"
          onPress={handleLogout}
          style={styles.logoutButton}
          textStyle={styles.logoutButtonText}
          variant="outlined"
        />
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>
            Silhouette Workflow v1.0.0
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.primary,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.surface,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.primaryLight,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.lg,
  },
  drawerItem: {
    marginHorizontal: 0,
    borderRadius: 0,
  },
  drawerItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logoutButton: {
    borderColor: colors.error,
    marginBottom: theme.spacing.md,
  },
  logoutButtonText: {
    color: colors.error,
  },
  versionContainer: {
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default CustomDrawer;