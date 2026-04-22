import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const REMINDERS_KEY = 'dermassist_care_reminders_v1';
const SETTINGS_KEY = 'dermassist_reminder_settings_v1';

// In-memory fallback for Expo Go simulator
const memoryStorage = {};
let didLogStorageFallback = false;

const logStorageFallbackOnce = () => {
  if (didLogStorageFallback) return;
  didLogStorageFallback = true;
  console.log('Reminder storage: using memory fallback');
};

const safeGetItem = async (key) => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    logStorageFallbackOnce();
    return memoryStorage[key] || null;
  }
};

const safeSetItem = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    logStorageFallbackOnce();
    memoryStorage[key] = value;
  }
};

// Default reminder settings
const DEFAULT_SETTINGS = {
  enabled: true,
  dressingChangeHours: 12, // Remind every 12 hours
  woundCheckHours: 24, // Remind to check wound daily
  positionChangeMinutes: 120, // Remind every 2 hours for position change
  morningReminder: true,
  eveningReminder: true,
};

// ============================================================================
// NOTIFICATION PERMISSIONS
// ============================================================================

export const requestNotificationPermissions = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return { granted: false, message: 'Notification permissions denied' };
  }
  
  // Get push token for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('care-reminders', {
      name: 'Care Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F46E5',
    });
  }
  
  return { granted: true };
};

// ============================================================================
// REMINDER SETTINGS
// ============================================================================

export const getReminderSettings = async () => {
  try {
    const raw = await safeGetItem(SETTINGS_KEY);
    const settings = raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
    return { success: true, data: { ...DEFAULT_SETTINGS, ...settings } };
  } catch (error) {
    console.error('Error getting reminder settings:', error);
    return { success: true, data: DEFAULT_SETTINGS };
  }
};

export const updateReminderSettings = async (newSettings) => {
  try {
    const current = await getReminderSettings();
    const updated = { ...current.data, ...newSettings };
    await safeSetItem(SETTINGS_KEY, JSON.stringify(updated));
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error updating reminder settings:', error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// SCHEDULE REMINDERS
// ============================================================================

export const scheduleDressingChangeReminder = async (hours = 12) => {
  try {
    const settings = await getReminderSettings();
    if (!settings.data.enabled) {
      return { success: false, message: 'Reminders disabled' };
    }
    
    // Cancel existing dressing reminders
    await cancelRemindersByType('dressing-change');
    
    // Schedule new reminder with correct trigger format
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🩹 Dressing Change Reminder',
        body: 'Time to change your wound dressing. Keep the wound clean and dry.',
        data: { type: 'dressing-change' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: hours * 60 * 60,
        repeats: true,
      },
    });
    
    return { success: true, identifier };
  } catch (error) {
    console.error('Error scheduling dressing reminder:', error);
    return { success: false, error: error.message };
  }
};

export const scheduleWoundCheckReminder = async (hours = 24) => {
  try {
    const settings = await getReminderSettings();
    if (!settings.data.enabled) {
      return { success: false, message: 'Reminders disabled' };
    }
    
    await cancelRemindersByType('wound-check');
    
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔍 Wound Check Reminder',
        body: 'Time to inspect your wound for any changes. Take a photo to track healing.',
        data: { type: 'wound-check' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: hours * 60 * 60,
        repeats: true,
      },
    });
    
    return { success: true, identifier };
  } catch (error) {
    console.error('Error scheduling wound check reminder:', error);
    return { success: false, error: error.message };
  }
};

export const schedulePositionChangeReminder = async (minutes = 120) => {
  try {
    const settings = await getReminderSettings();
    if (!settings.data.enabled) {
      return { success: false, message: 'Reminders disabled' };
    }
    
    await cancelRemindersByType('position-change');
    
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔄 Position Change Reminder',
        body: 'Time to change position to prevent pressure buildup. Shift your weight or adjust seating.',
        data: { type: 'position-change' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: minutes * 60,
        repeats: true,
      },
    });
    
    return { success: true, identifier };
  } catch (error) {
    console.error('Error scheduling position reminder:', error);
    return { success: false, error: error.message };
  }
};

export const scheduleMorningReminder = async () => {
  try {
    const settings = await getReminderSettings();
    if (!settings.data.enabled || !settings.data.morningReminder) {
      return { success: false, message: 'Morning reminders disabled' };
    }
    
    await cancelRemindersByType('morning-care');
    
    // Schedule for 8:00 AM daily using daily trigger
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '☀️ Morning Care Reminder',
        body: 'Start your day with proper wound care. Clean, dress, and protect your wound.',
        data: { type: 'morning-care' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
      },
    });
    
    return { success: true, identifier };
  } catch (error) {
    console.error('Error scheduling morning reminder:', error);
    return { success: false, error: error.message };
  }
};

export const scheduleEveningReminder = async () => {
  try {
    const settings = await getReminderSettings();
    if (!settings.data.enabled || !settings.data.eveningReminder) {
      return { success: false, message: 'Evening reminders disabled' };
    }
    
    await cancelRemindersByType('evening-care');
    
    // Schedule for 8:00 PM daily using daily trigger
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌙 Evening Care Reminder',
        body: 'Before bed: Check your wound, change dressing if needed, and ensure proper positioning.',
        data: { type: 'evening-care' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
      },
    });
    
    return { success: true, identifier };
  } catch (error) {
    console.error('Error scheduling evening reminder:', error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// MANAGE REMINDERS
// ============================================================================

export const scheduleAllReminders = async () => {
  try {
    const settings = await getReminderSettings();
    
    if (!settings.data.enabled) {
      return { success: false, message: 'Reminders disabled in settings' };
    }
    
    const results = [];
    
    // Schedule all reminders based on settings
    results.push(await scheduleDressingChangeReminder(settings.data.dressingChangeHours));
    results.push(await scheduleWoundCheckReminder(settings.data.woundCheckHours));
    results.push(await schedulePositionChangeReminder(settings.data.positionChangeMinutes));
    
    if (settings.data.morningReminder) {
      results.push(await scheduleMorningReminder());
    }
    
    if (settings.data.eveningReminder) {
      results.push(await scheduleEveningReminder());
    }
    
    const success = results.every(r => r.success);
    return { 
      success, 
      message: success ? 'All reminders scheduled' : 'Some reminders failed to schedule',
      results 
    };
  } catch (error) {
    console.error('Error scheduling all reminders:', error);
    return { success: false, error: error.message };
  }
};

export const cancelRemindersByType = async (type) => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduled) {
      if (notification.content.data?.type === type) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error canceling reminders:', error);
    return { success: false, error: error.message };
  }
};

export const cancelAllReminders = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return { success: true };
  } catch (error) {
    console.error('Error canceling all reminders:', error);
    return { success: false, error: error.message };
  }
};

export const getScheduledReminders = async () => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return { 
      success: true, 
      data: scheduled.map(n => ({
        id: n.identifier,
        type: n.content.data?.type,
        title: n.content.title,
        body: n.content.body,
        trigger: n.trigger,
      }))
    };
  } catch (error) {
    console.error('Error getting scheduled reminders:', error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// CUSTOM REMINDERS (for specific wound care)
// ============================================================================

export const scheduleCustomReminder = async (title, body, date) => {
  try {
    const settings = await getReminderSettings();
    if (!settings.data.enabled) {
      return { success: false, message: 'Reminders disabled' };
    }
    
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🩹 ${title}`,
        body,
        data: { type: 'custom' },
        sound: true,
      },
      trigger: date,
    });
    
    // Save to reminder list
    const reminders = await getCustomReminders();
    reminders.data.push({
      id: identifier,
      title,
      body,
      date: date.toISOString(),
    });
    await safeSetItem(REMINDERS_KEY, JSON.stringify(reminders.data));
    
    return { success: true, identifier };
  } catch (error) {
    console.error('Error scheduling custom reminder:', error);
    return { success: false, error: error.message };
  }
};

export const getCustomReminders = async () => {
  try {
    const raw = await safeGetItem(REMINDERS_KEY);
    const reminders = raw ? JSON.parse(raw) : [];
    return { success: true, data: reminders };
  } catch (error) {
    console.error('Error getting custom reminders:', error);
    return { success: true, data: [] };
  }
};

export const deleteCustomReminder = async (reminderId) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderId);
    
    const reminders = await getCustomReminders();
    const filtered = reminders.data.filter(r => r.id !== reminderId);
    await safeSetItem(REMINDERS_KEY, JSON.stringify(filtered));
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting custom reminder:', error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

export const initializeReminders = async () => {
  try {
    const permission = await requestNotificationPermissions();
    
    if (!permission.granted) {
      console.log('Notification permissions not granted - reminders disabled');
      return { success: false, message: 'Notifications not permitted' };
    }
    
    const settings = await getReminderSettings();
    
    if (settings.data.enabled) {
      const result = await scheduleAllReminders();
      if (!result.success) {
        console.log('Some reminders could not be scheduled (Expo Go limitation)');
        return { success: false, message: 'Reminders limited in Expo Go - use dev build for full support' };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.log('Reminder initialization skipped:', error.message);
    return { success: false, message: error.message };
  }
};

export default {
  requestNotificationPermissions,
  getReminderSettings,
  updateReminderSettings,
  scheduleDressingChangeReminder,
  scheduleWoundCheckReminder,
  schedulePositionChangeReminder,
  scheduleMorningReminder,
  scheduleEveningReminder,
  scheduleAllReminders,
  cancelRemindersByType,
  cancelAllReminders,
  getScheduledReminders,
  scheduleCustomReminder,
  getCustomReminders,
  deleteCustomReminder,
  initializeReminders,
};
