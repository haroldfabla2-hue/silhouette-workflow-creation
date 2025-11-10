import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, theme, isSmallScreen, isTablet } from '../../theme';
import CustomButton from '../../components/ui/CustomButton';
import { 
  fetchWorkflows, 
  selectWorkflows, 
  selectWorkflowsLoading,
  selectUnreadCount,
  addExecutionToHistory 
} from '../../store/slices/workflowsSlice';
import { 
  selectNotifications, 
  selectUnreadCount as selectNotificationUnreadCount,
  fetchNotifications 
} from '../../store/slices/notificationsSlice';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../store/slices/uiSlice';

const DashboardScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const workflows = useSelector(selectWorkflows);
  const isLoading = useSelector(selectWorkflowsLoading);
  const workflowUnreadCount = useSelector(selectUnreadCount);
  const notifications = useSelector(selectNotifications);
  const notificationUnreadCount = useSelector(selectNotificationUnreadCount);
  
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalWorkflows: 0,
    activeWorkflows: 0,
    executionsToday: 0,
    successRate: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    // Calcular estadísticas
    calculateStats();
  }, [workflows]);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        dispatch(fetchWorkflows({ page: 1, limit: 10 })),
        dispatch(fetchNotifications({ page: 1, limit: 5 })),
      ]);
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
      dispatch(showToast({
        message: 'Error al cargar los datos',
        type: 'error',
      }));
    }
  };

  const calculateStats = () => {
    const totalWorkflows = workflows.length;
    const activeWorkflows = workflows.filter(w => w.status === 'active').length;
    const executionsToday = workflows.reduce((total, w) => {
      return total + (w.executionsToday || 0);
    }, 0);
    const totalExecutions = workflows.reduce((total, w) => {
      return total + (w.totalExecutions || 0);
    }, 0);
    const successfulExecutions = workflows.reduce((total, w) => {
      return total + (w.successfulExecutions || 0);
    }, 0);
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    setStats({
      totalWorkflows,
      activeWorkflows,
      executionsToday,
      successRate: Math.round(successRate),
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleWorkflowPress = (workflow) => {
    navigation.navigate('Workflows', {
      screen: 'WorkflowEditor',
      params: { workflowId: workflow.id },
    });
  };

  const handleNotificationPress = (notification) => {
    // Marcar como leída y navegar según el tipo
    // navigation.navigate('WorkflowExecution', { executionId: notification.data.executionId });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const renderStatCard = (title, value, icon, color, onPress = null) => (
    <TouchableOpacity 
      style={[styles.statCard, { borderLeftColor: color }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.statContent}>
        <View style={styles.statIconContainer}>
          <Icon name={icon} size={24} color={color} />
        </View>
        <View style={styles.statText}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderQuickAction = (title, icon, onPress, color) => (
    <TouchableOpacity style={[styles.quickAction, { backgroundColor: color + '20' }]} onPress={onPress}>
      <Icon name={icon} size={32} color={color} style={styles.quickActionIcon} />
      <Text style={[styles.quickActionText, { color }]}>{title}</Text>
    </TouchableOpacity>
  );

  const recentWorkflows = workflows.slice(0, 3);
  const recentNotifications = notifications.slice(0, 3);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Usuario'}! 👋
            </Text>
            <Text style={styles.subtitle}>
              Gestiona tus workflows desde aquí
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Icon name="notifications" size={24} color={colors.text} />
            {(workflowUnreadCount + notificationUnreadCount) > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>
                  {workflowUnreadCount + notificationUnreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estadísticas</Text>
        <View style={styles.statsContainer}>
          {renderStatCard(
            'Total Workflows', 
            stats.totalWorkflows, 
            'account-tree', 
            colors.primary,
            () => navigation.navigate('Workflows')
          )}
          {renderStatCard(
            'Workflows Activos', 
            stats.activeWorkflows, 
            'play-circle-outline', 
            colors.success,
            () => navigation.navigate('Workflows')
          )}
          {renderStatCard(
            'Ejecuciones Hoy', 
            stats.executionsToday, 
            'trending-up', 
            colors.info,
            () => navigation.navigate('Workflows')
          )}
          {renderStatCard(
            'Tasa de Éxito', 
            `${stats.successRate}%`, 
            'check-circle', 
            colors.secondary,
            () => navigation.navigate('Workflows')
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.quickActionsContainer}>
          {renderQuickAction(
            'Nuevo Workflow', 
            'add-circle', 
            () => navigation.navigate('Workflows', { screen: 'WorkflowEditor' }),
            colors.primary
          )}
          {renderQuickAction(
            'Centro de IA', 
            'psychology', 
            () => navigation.navigate('AI'),
            colors.secondary
          )}
          {renderQuickAction(
            'Credenciales', 
            'vpn-key', 
            () => navigation.navigate('Profile', { screen: 'Credentials' }),
            colors.warning
          )}
          {renderQuickAction(
            'Configuración', 
            'settings', 
            () => navigation.navigate('Profile', { screen: 'Settings' }),
            colors.info
          )}
        </View>
      </View>

      {/* Recent Workflows */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Workflows Recientes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Workflows')}>
            <Text style={styles.seeAllText}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        {recentWorkflows.length > 0 ? (
          <View style={styles.listContainer}>
            {recentWorkflows.map((workflow) => (
              <TouchableOpacity
                key={workflow.id}
                style={styles.listItem}
                onPress={() => handleWorkflowPress(workflow)}
              >
                <View style={styles.listItemIcon}>
                  <Icon 
                    name="account-tree" 
                    size={24} 
                    color={workflow.status === 'active' ? colors.success : colors.textSecondary} 
                  />
                </View>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{workflow.name}</Text>
                  <Text style={styles.listItemSubtitle}>
                    {workflow.status === 'active' ? 'Activo' : 'Inactivo'} • 
                    Última ejecución: {workflow.lastExecution || 'Nunca'}
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color={colors.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="account-tree" size={48} color={colors.textLight} />
            <Text style={styles.emptyStateText}>
              No tienes workflows aún
            </Text>
            <CustomButton
              title="Crear Primer Workflow"
              onPress={() => navigation.navigate('Workflows', { screen: 'WorkflowEditor' })}
              style={styles.createFirstButton}
            />
          </View>
        )}
      </View>

      {/* Recent Notifications */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notificaciones</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.seeAllText}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        {recentNotifications.length > 0 ? (
          <View style={styles.listContainer}>
            {recentNotifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={styles.listItem}
                onPress={() => handleNotificationPress(notification)}
              >
                <View style={styles.listItemIcon}>
                  <Icon 
                    name={
                      notification.type === 'workflow_execution' ? 'play-circle' :
                      notification.type === 'security' ? 'security' :
                      'notifications'
                    }
                    size={24} 
                    color={notification.isRead ? colors.textSecondary : colors.primary} 
                  />
                </View>
                <View style={styles.listItemContent}>
                  <Text style={[
                    styles.listItemTitle,
                    !notification.isRead && { fontWeight: '600' }
                  ]}>
                    {notification.title}
                  </Text>
                  <Text style={styles.listItemSubtitle}>
                    {notification.body}
                  </Text>
                </View>
                {!notification.isRead && (
                  <View style={styles.unreadDot} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="notifications-none" size={48} color={colors.textLight} />
            <Text style={styles.emptyStateText}>
              No hay notificaciones
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  notificationButton: {
    position: 'relative',
    padding: theme.spacing.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
  section: {
    marginVertical: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  statsContainer: {
    paddingHorizontal: theme.spacing.lg,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    ...theme.shadows.small,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  statTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
  },
  quickAction: {
    width: isTablet() ? '48%' : '48%',
    aspectRatio: 2,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    margin: '1%',
  },
  quickActionIcon: {
    marginBottom: theme.spacing.sm,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  listContainer: {
    backgroundColor: colors.surface,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.small,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  listItemSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  emptyState: {
    backgroundColor: colors.surface,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  createFirstButton: {
    minWidth: 200,
  },
});

export default DashboardScreen;