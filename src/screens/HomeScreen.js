import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Disclaimer, LanguageSelector } from '../components';
import { signOut } from '../services/authService';
import { COLORS } from '../config/theme';

const HomeScreen = ({ navigation, user }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const handleSignOut = async () => {
    await signOut();
  };

  const quickActions = [
    {
      icon: '📋',
      title: 'History',
      subtitle: 'View past analyses',
      onPress: () => navigation.navigate('History'),
    },
    {
      icon: '💬',
      title: 'AI Assistant',
      subtitle: 'Get wound care answers',
      onPress: () => navigation.navigate('Chat'),
    },
    {
      icon: '⚙️',
      title: 'Settings',
      subtitle: 'Preferences & reminders',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 20, 40) }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>DermAssist</Text>
          <Text style={styles.tagline}>AI Wound Care Assistant</Text>
        </View>
        <LanguageSelector compact />
      </View>

      {/* Main Action Card */}
      <TouchableOpacity 
        style={styles.mainCard}
        onPress={() => navigation.navigate('PatientForm')}
        activeOpacity={0.9}
      >
        <View style={styles.mainCardTop}>
          <View style={styles.mainIconWrap}>
            <Text style={styles.mainIcon}>📸</Text>
          </View>
          <View style={styles.mainCardText}>
            <Text style={styles.mainCardTitle}>Analyze Wound</Text>
            <Text style={styles.mainCardSubtitle}>
              Take a photo for AI-powered analysis with NPIAP staging
            </Text>
          </View>
        </View>
        <View style={styles.mainCardBottom}>
          <View style={styles.startButton}>
            <Text style={styles.startButtonText}>Start Analysis</Text>
            <Text style={styles.startButtonArrow}>→</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        {quickActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionCard}
            onPress={action.onPress}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={styles.actionTitle}>{action.title}</Text>
            <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* User Info */}
      <View style={styles.userSection}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {user?.email?.charAt(0)?.toUpperCase() || 'G'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userEmail}>{user?.email || 'Guest'}</Text>
          <Text style={styles.userStatus}>
            {user?.isGuest ? 'Guest Session' : 'Signed In'}
          </Text>
        </View>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimerCard}>
        <Text style={styles.disclaimerIcon}>ℹ️</Text>
        <Text style={styles.disclaimerText}>
          AI analysis is for informational purposes. Always consult healthcare professionals.
        </Text>
      </View>

      <Disclaimer />

      {/* Sign Out */}
      <View style={styles.signOutContainer}>
        <Button
          title={t('auth.signOut')}
          variant="outline"
          onPress={handleSignOut}
          style={styles.signOutButton}
        />
        <Text style={styles.versionText}>v1.0.0</Text>
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
    padding: 24,
    paddingBottom: 40,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerLeft: {
    flex: 1,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  // Main Card
  mainCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  mainCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  mainIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  mainIcon: {
    fontSize: 32,
  },
  mainCardText: {
    flex: 1,
    paddingTop: 4,
  },
  mainCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textWhite,
    marginBottom: 6,
  },
  mainCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  mainCardBottom: {
    marginTop: 4,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    borderRadius: 16,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
    marginRight: 8,
  },
  startButtonArrow: {
    fontSize: 18,
    color: COLORS.textWhite,
  },
  // Quick Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // User Section
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  userStatus: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Disclaimer
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  disclaimerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  // Sign Out
  signOutContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  signOutButton: {
    marginBottom: 12,
  },
  versionText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});

export default HomeScreen;
