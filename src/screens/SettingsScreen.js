import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageSelector } from '../components';
import { COLORS } from '../config/theme';

const SettingsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const settingsGroups = [
    {
      title: 'App Settings',
      subtitle: 'Configure your preferences',
      items: [
        {
          icon: '🌍',
          title: t('settings.language'),
          description: 'Choose your preferred language',
          component: <LanguageSelector />,
        },
        {
          icon: '�‍⚕️',
          title: 'My Doctor',
          description: 'Setup doctor contact for quick sharing',
          onPress: () => navigation.navigate('DoctorSetup'),
        },
        {
          icon: '�🔔',
          title: 'Care Reminders',
          description: 'Dressing change notifications',
          onPress: () => navigation.navigate('ReminderSettings'),
        },
        {
          icon: '📊',
          title: 'Data & Storage',
          description: 'Manage wound journal data',
          onPress: () => navigation.navigate('DataManagement'),
        },
      ],
    },
    {
      title: 'Support',
      subtitle: 'Get help and information',
      items: [
        {
          icon: '📱',
          title: 'About DermAssist',
          description: 'App information and features',
          onPress: () => {},
        },
        {
          icon: '❓',
          title: 'Help & FAQ',
          description: 'Common questions answered',
          onPress: () => {},
        },
        {
          icon: '📧',
          title: 'Contact Support',
          description: 'Get in touch with our team',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Legal',
      subtitle: 'Policies and terms',
      items: [
        {
          icon: '🔒',
          title: t('settings.privacyPolicy'),
          description: 'How we protect your data',
          onPress: () => Linking.openURL('https://example.com/privacy'),
        },
        {
          icon: '📄',
          title: t('settings.termsOfService'),
          description: 'Terms of use agreement',
          onPress: () => Linking.openURL('https://example.com/terms'),
        },
        {
          icon: '🏥',
          title: 'Medical Disclaimer',
          description: 'Important health information',
          onPress: () => {},
        },
      ],
    },
  ];

  const renderSettingItem = (item, index) => (
    <TouchableOpacity
      key={index}
      style={styles.settingCard}
      onPress={item.onPress}
      activeOpacity={item.component ? 1 : 0.7}
    >
      <View style={styles.settingHeader}>
        <View style={styles.settingIconContainer}>
          <Text style={styles.settingIcon}>{item.icon}</Text>
        </View>
        <View style={styles.settingHeaderText}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          <Text style={styles.settingDescription}>{item.description}</Text>
        </View>
        {!item.component && (
          <View style={styles.settingArrow}>
            <Text style={styles.settingArrowText}>→</Text>
          </View>
        )}
      </View>
      {item.component && (
        <View style={styles.settingComponent}>
          {item.component}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSettingsGroup = (group, index) => (
    <View key={index} style={styles.settingsGroup}>
      <View style={styles.groupHeader}>
        <View style={styles.groupIconContainer}>
          <Text style={styles.groupIcon}>⚙️</Text>
        </View>
        <View style={styles.groupHeaderText}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <Text style={styles.groupSubtitle}>{group.subtitle}</Text>
        </View>
      </View>
      <View style={styles.groupItems}>
        {group.items.map(renderSettingItem)}
      </View>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Header */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeIcon}>⚙️</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{t('home.settings')}</Text>
          <Text style={styles.headerSubtitle}>Configure your preferences</Text>
        </View>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <View style={styles.infoBannerIcon}>
          <Text style={styles.infoBannerIconText}>💡</Text>
        </View>
        <View style={styles.infoBannerContent}>
          <Text style={styles.infoBannerTitle}>Quick Tip</Text>
          <Text style={styles.infoBannerText}>
            Set up care reminders to get notifications for dressing changes and wound monitoring.
          </Text>
        </View>
      </View>

      {/* Settings Groups */}
      {settingsGroups.map(renderSettingsGroup)}

      {/* App Info Card */}
      <View style={styles.appInfoCard}>
        <View style={styles.appInfoHeader}>
          <View style={styles.appInfoLogo}>
            <Text style={styles.appInfoLogoIcon}>🩹</Text>
          </View>
          <View style={styles.appInfoHeaderText}>
            <Text style={styles.appInfoTitle}>DermAssist</Text>
            <Text style={styles.appInfoSubtitle}>Pressure Ulcer Care Assistant</Text>
          </View>
        </View>
        <View style={styles.appInfoDetails}>
          <View style={styles.appInfoRow}>
            <Text style={styles.appInfoLabel}>Version</Text>
            <Text style={styles.appInfoValue}>1.0.0</Text>
          </View>
          <View style={styles.appInfoRow}>
            <Text style={styles.appInfoLabel}>Build</Text>
            <Text style={styles.appInfoValue}>2026.03.14</Text>
          </View>
          <View style={styles.appInfoRow}>
            <Text style={styles.appInfoLabel}>AI Model</Text>
            <Text style={styles.appInfoValue}>Gemini 2.x (Auto)</Text>
          </View>
        </View>
        <Text style={styles.appInfoCopyright}>
          © 2026 DermAssist. For educational purposes only.
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
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  infoBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoBannerIconText: {
    fontSize: 18,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  settingsGroup: {
    marginBottom: 20,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  groupIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  groupIcon: {
    fontSize: 16,
  },
  groupHeaderText: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  groupSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  groupItems: {
    gap: 10,
  },
  settingCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingIcon: {
    fontSize: 20,
  },
  settingHeaderText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  settingArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingArrowText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  settingComponent: {
    marginTop: 12,
    paddingLeft: 52,
  },
  appInfoCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
  },
  appInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  appInfoLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appInfoLogoIcon: {
    fontSize: 24,
  },
  appInfoHeaderText: {
    flex: 1,
  },
  appInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  appInfoSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  appInfoDetails: {
    width: '100%',
    marginBottom: 16,
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  appInfoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  appInfoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  appInfoCopyright: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SettingsScreen;
