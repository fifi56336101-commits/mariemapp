import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  getReminderSettings, 
  updateReminderSettings, 
  scheduleAllReminders,
  cancelAllReminders,
  getScheduledReminders,
  initializeReminders,
} from '../services/reminderService';
import { COLORS } from '../config/theme';

const ReminderSettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState({
    enabled: true,
    dressingChangeHours: 12,
    woundCheckHours: 24,
    positionChangeMinutes: 120,
    morningReminder: true,
    eveningReminder: true,
  });
  const [scheduledCount, setScheduledCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const result = await getReminderSettings();
    if (result.success) {
      setSettings(result.data);
    }
    
    const scheduled = await getScheduledReminders();
    if (scheduled.success) {
      setScheduledCount(scheduled.data.length);
    }
    
    setLoading(false);
  };

  const toggleReminders = async (value) => {
    const newSettings = { ...settings, enabled: value };
    setSettings(newSettings);
    
    await updateReminderSettings({ enabled: value });
    
    if (value) {
      const result = await scheduleAllReminders();
      if (result.success) {
        Alert.alert('✅ Reminders Enabled', 'Care reminders have been scheduled.');
      } else {
        Alert.alert('⚠️ Partial Success', result.message || 'Some reminders may not have been scheduled.');
      }
    } else {
      await cancelAllReminders();
      Alert.alert('🔕 Reminders Disabled', 'All care reminders have been canceled.');
    }
    
    loadSettings();
  };

  const updateInterval = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await updateReminderSettings({ [key]: value });
    
    if (settings.enabled) {
      await scheduleAllReminders();
      loadSettings();
    }
  };

  const toggleMorning = async (value) => {
    const newSettings = { ...settings, morningReminder: value };
    setSettings(newSettings);
    await updateReminderSettings({ morningReminder: value });
    
    if (settings.enabled) {
      await scheduleAllReminders();
      loadSettings();
    }
  };

  const toggleEvening = async (value) => {
    const newSettings = { ...settings, eveningReminder: value };
    setSettings(newSettings);
    await updateReminderSettings({ eveningReminder: value });
    
    if (settings.enabled) {
      await scheduleAllReminders();
      loadSettings();
    }
  };

  const renderIntervalOption = (label, value, current, onSelect) => (
    <TouchableOpacity
      key={value}
      style={[styles.intervalOption, current === value && styles.intervalOptionActive]}
      onPress={() => onSelect(value)}
      activeOpacity={0.7}
    >
      <Text style={[styles.intervalOptionText, current === value && styles.intervalOptionTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderSection = (icon, title, subtitle, children) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconContainer}>
          <Text style={styles.sectionIcon}>{icon}</Text>
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeIcon}>🔔</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Care Reminders</Text>
          <Text style={styles.headerSubtitle}>Never miss wound care</Text>
        </View>
      </View>

      {/* Status Card */}
      <View style={[styles.statusCard, settings.enabled ? styles.statusCardActive : styles.statusCardInactive]}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusIconContainer, settings.enabled && styles.statusIconActive]}>
            <Text style={styles.statusIcon}>{settings.enabled ? '🔔' : '🔕'}</Text>
          </View>
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>
              {settings.enabled ? 'Reminders Active' : 'Reminders Off'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {settings.enabled 
                ? `${scheduledCount} reminder${scheduledCount !== 1 ? 's' : ''} scheduled`
                : 'Tap to enable care reminders'
              }
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={toggleReminders}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={Platform.OS === 'android' ? COLORS.textWhite : undefined}
          />
        </View>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerIcon}>💡</Text>
        <Text style={styles.infoBannerText}>
          Care reminders help you stay on schedule with dressing changes, position changes, and wound checks.
        </Text>
      </View>

      {/* Dressing Change Interval */}
      {renderSection('🩹', 'Dressing Change', 'How often to remind you', (
        <View style={styles.intervalContainer}>
          {[
            { label: '6h', value: 6 },
            { label: '12h', value: 12 },
            { label: '24h', value: 24 },
            { label: '48h', value: 48 },
          ].map(opt => renderIntervalOption(opt.label, opt.value, settings.dressingChangeHours, 
            (v) => updateInterval('dressingChangeHours', v)))}
        </View>
      ))}

      {/* Wound Check Interval */}
      {renderSection('🔍', 'Wound Check', 'Regular wound inspection', (
        <View style={styles.intervalContainer}>
          {[
            { label: '12h', value: 12 },
            { label: '24h', value: 24 },
            { label: '48h', value: 48 },
            { label: '72h', value: 72 },
          ].map(opt => renderIntervalOption(opt.label, opt.value, settings.woundCheckHours,
            (v) => updateInterval('woundCheckHours', v)))}
        </View>
      ))}

      {/* Position Change Interval */}
      {renderSection('🔄', 'Position Change', 'Prevent pressure buildup', (
        <View style={styles.intervalContainer}>
          {[
            { label: '1h', value: 60 },
            { label: '2h', value: 120 },
            { label: '3h', value: 180 },
            { label: '4h', value: 240 },
          ].map(opt => renderIntervalOption(opt.label, opt.value, settings.positionChangeMinutes,
            (v) => updateInterval('positionChangeMinutes', v)))}
        </View>
      ))}

      {/* Daily Reminders */}
      {renderSection('☀️', 'Daily Reminders', 'Morning and evening care', (
        <View style={styles.dailyReminders}>
          <TouchableOpacity 
            style={styles.dailyReminderItem}
            onPress={() => toggleMorning(!settings.morningReminder)}
            activeOpacity={0.7}
          >
            <View style={styles.dailyReminderIconContainer}>
              <Text style={styles.dailyReminderIcon}>🌅</Text>
            </View>
            <View style={styles.dailyReminderText}>
              <Text style={styles.dailyReminderTitle}>Morning Care</Text>
              <Text style={styles.dailyReminderSubtitle}>8:00 AM - Start day with wound care</Text>
            </View>
            <Switch
              value={settings.morningReminder}
              onValueChange={toggleMorning}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={Platform.OS === 'android' ? COLORS.textWhite : undefined}
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.dailyReminderItem}
            onPress={() => toggleEvening(!settings.eveningReminder)}
            activeOpacity={0.7}
          >
            <View style={styles.dailyReminderIconContainer}>
              <Text style={styles.dailyReminderIcon}>🌙</Text>
            </View>
            <View style={styles.dailyReminderText}>
              <Text style={styles.dailyReminderTitle}>Evening Care</Text>
              <Text style={styles.dailyReminderSubtitle}>8:00 PM - Before bed routine</Text>
            </View>
            <Switch
              value={settings.eveningReminder}
              onValueChange={toggleEvening}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={Platform.OS === 'android' ? COLORS.textWhite : undefined}
            />
          </TouchableOpacity>
        </View>
      ))}

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerIcon}>⚠️</Text>
        <Text style={styles.disclaimerText}>
          Reminders work best when the app is running in the background. 
          Make sure notification permissions are enabled in your device settings.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  headerBadgeIcon: {
    fontSize: 26,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusCard: {
    borderRadius: 20,
    marginBottom: 16,
    padding: 16,
    borderWidth: 2,
  },
  statusCardActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  statusCardInactive: {
    backgroundColor: COLORS.backgroundLight,
    borderColor: COLORS.border,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  statusIconActive: {
    backgroundColor: COLORS.primary,
  },
  statusIcon: {
    fontSize: 24,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  statusSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  infoBannerIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  section: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.primaryLight,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionContent: {
    padding: 14,
  },
  intervalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intervalOption: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  intervalOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  intervalOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  intervalOptionTextActive: {
    color: COLORS.textWhite,
  },
  dailyReminders: {
    gap: 10,
  },
  dailyReminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dailyReminderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dailyReminderIcon: {
    fontSize: 20,
  },
  dailyReminderText: {
    flex: 1,
  },
  dailyReminderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dailyReminderSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disclaimerIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});

export default ReminderSettingsScreen;
