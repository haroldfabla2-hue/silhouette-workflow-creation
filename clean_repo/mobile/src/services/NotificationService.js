import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { store } from '../store';
import { incrementUnreadCount, addLocalNotification } from '../store/slices/notificationsSlice';

// Configuración de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Verificar si el dispositivo es un dispositivo físico
      if (!Device.isDevice) {
        console.log('Las notificaciones solo funcionan en dispositivos físicos');
        return false;
      }

      // Solicitar permisos
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Permisos de notificación no concedidos');
        return false;
      }

      // Obtener token de push
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      this.expoPushToken = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Token de push obtenido:', this.expoPushToken);

      // Configurar listener para notificaciones recibidas
      this.notificationListener = Notifications.addNotificationReceivedListener(this.handleNotificationReceived);

      // Configurar listener para notificaciones presionadas
      this.responseListener = Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error al inicializar notificaciones:', error);
      return false;
    }
  }

  handleNotificationReceived(notification) {
    console.log('Notificación recibida:', notification);
    
    const { data, request } = notification;
    const notificationData = {
      id: request.identifier,
      title: notification.request.content.title || 'Notificación',
      body: notification.request.content.body,
      data: data || {},
      isRead: false,
      createdAt: Date.now(),
      type: data?.type || 'general',
    };

    // Agregar a la lista local
    store.dispatch(addLocalNotification(notificationData));
    
    // Incrementar contador de no leídos
    if (!data?.isRead) {
      store.dispatch(incrementUnreadCount());
    }
  }

  handleNotificationResponse(response) {
    console.log('Respuesta a notificación:', response);
    const { data, actionIdentifier } = response;
    
    // Manejar diferentes tipos de acciones
    switch (actionIdentifier) {
      case 'VIEW_WORKFLOW':
        // Navegar a workflow específico
        break;
      case 'EXECUTE_WORKFLOW':
        // Ejecutar workflow
        break;
      case 'DISMISS':
        // Simplemente descartar
        break;
      default:
        // Acción por defecto - abrir la app
        break;
    }
  }

  async scheduleNotification(notificationId, title, body, data = {}, trigger = null) {
    try {
      return await Notifications.scheduleNotificationAsync({
        identifier: notificationId,
        content: {
          title,
          body,
          data,
          actions: [
            {
              identifier: 'VIEW_WORKFLOW',
              buttonTitle: 'Ver',
            },
            {
              identifier: 'DISMISS',
              buttonTitle: 'Descartar',
              options: {
                opensAppToForeground: false,
              },
            },
          ],
        },
        trigger,
      });
    } catch (error) {
      console.error('Error al programar notificación:', error);
      return null;
    }
  }

  async sendImmediateNotification(title, body, data = {}, badgeCount = 1) {
    try {
      return await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          badge: badgeCount,
          actions: [
            {
              identifier: 'VIEW_WORKFLOW',
              buttonTitle: 'Ver',
            },
            {
              identifier: 'EXECUTE_WORKFLOW',
              buttonTitle: 'Ejecutar',
            },
          ],
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error al enviar notificación inmediata:', error);
      return null;
    }
  }

  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error al cancelar notificación:', error);
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error al cancelar todas las notificaciones:', error);
    }
  }

  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error al establecer contador de badge:', error);
    }
  }

  async getBadgeCount() {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error al obtener contador de badge:', error);
      return 0;
    }
  }

  // Notificaciones específicas de workflows
  async notifyWorkflowExecution(workflowId, workflowName, status, executionId) {
    const titles = {
      success: `✅ Flujo "${workflowName}" completado`,
      error: `❌ Error en flujo "${workflowName}"`,
      in_progress: `⚡ Iniciando flujo "${workflowName}"`,
    };

    const messages = {
      success: 'El flujo se ejecutó correctamente',
      error: 'Hubo un error durante la ejecución',
      in_progress: 'El flujo ha comenzado su ejecución',
    };

    await this.sendImmediateNotification(
      titles[status],
      messages[status],
      {
        type: 'workflow_execution',
        workflowId,
        executionId,
        status,
      }
    );
  }

  // Notificaciones de sistema
  async notifySystemUpdate(available = true) {
    if (available) {
      await this.sendImmediateNotification(
        'Actualización disponible',
        'Hay una nueva versión de Silhouette Workflow disponible',
        {
          type: 'system_update',
          action: 'update_available',
        }
      );
    }
  }

  // Notificaciones de seguridad
  async notifySecurityAlert(type, message) {
    const titles = {
      login: '🚨 Intento de inicio de sesión',
      password: '🔐 Cambio de contraseña',
      suspicious: '⚠️ Actividad sospechosa',
    };

    await this.sendImmediateNotification(
      titles[type] || 'Alerta de seguridad',
      message,
      {
        type: 'security_alert',
        alertType: type,
        timestamp: Date.now(),
      }
    );
  }

  // Programar recordatorios
  async scheduleWorkflowReminder(workflowId, workflowName, reminderTime) {
    const notificationId = `workflow_reminder_${workflowId}_${Date.now()}`;
    
    return await this.scheduleNotification(
      notificationId,
      'Recordatorio de Flujo',
      `No olvides ejecutar "${workflowName}"`,
      {
        type: 'workflow_reminder',
        workflowId,
        action: 'reminder',
      },
      { date: new Date(reminderTime) }
    );
  }

  // Limpiar recursos
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // Obtener estado del servicio
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      expoPushToken: this.expoPushToken,
      platform: Platform.OS,
    };
  }
}

// Exportar instancia singleton
export const NotificationManager = new NotificationService();
export default NotificationService;