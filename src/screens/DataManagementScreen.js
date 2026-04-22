import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAnalysisHistory, deleteAnalysis } from '../services/storageService';
import { getCurrentUser } from '../services/authService';
import { COLORS } from '../config/theme';

const DataManagementScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState({
    totalEntries: 0,
    localEntries: 0,
    serverEntries: 0,
    needsAttention: 0,
    storageUsed: '0 KB',
  });
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadDataStats();
  }, []);

  const loadDataStats = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const result = await getAnalysisHistory(user._id, 100);
      
      if (result.success) {
        const entries = result.data || [];
        const localEntries = entries.filter(e => e._id?.startsWith('local_')).length;
        const serverEntries = entries.length - localEntries;
        const needsAttention = entries.filter(e => e.needsDoctor).length;
        
        // Estimate storage (rough calculation)
        const avgEntrySize = 5; // KB per entry (rough estimate with image URI)
        const storageKB = entries.length * avgEntrySize;
        const storageUsed = storageKB > 1024 
          ? `${(storageKB / 1024).toFixed(1)} MB` 
          : `${storageKB} KB`;

        setStats({
          totalEntries: entries.length,
          localEntries,
          serverEntries,
          needsAttention,
          storageUsed,
        });
      }
    } catch (error) {
      console.error('Error loading data stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLocalData = async () => {
    Alert.alert(
      '🗑️ Clear Local Data',
      'This will delete all locally stored wound journal entries. Data saved to the server will remain.\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Local',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              const user = await getCurrentUser();
              if (!user) return;

              const result = await getAnalysisHistory(user._id, 100);
              if (result.success) {
                const localEntries = result.data.filter(e => e._id?.startsWith('local_'));
                
                for (const entry of localEntries) {
                  await deleteAnalysis(entry._id, user._id);
                }
                
                Alert.alert('✅ Success', `Deleted ${localEntries.length} local entries`);
                loadDataStats();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to clear local data');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  const handleClearAllData = async () => {
    Alert.alert(
      '⚠️ Clear All Data',
      'This will delete ALL wound journal entries, including server data.\n\nThis action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              const user = await getCurrentUser();
              if (!user) return;

              const result = await getAnalysisHistory(user._id, 100);
              if (result.success) {
                for (const entry of result.data) {
                  await deleteAnalysis(entry._id, user._id);
                }
                
                Alert.alert('✅ Success', `Deleted ${result.data.length} entries`);
                loadDataStats();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      '📤 Export Data',
      'Data export feature coming soon!\n\nThis will allow you to export your wound journal as a PDF or share with your healthcare provider.',
      [{ text: 'OK' }]
    );
  };

  const handleBackupData = () => {
    Alert.alert(
      '☁️ Backup Data',
      'Cloud backup feature coming soon!\n\nThis will securely backup your wound journal to the cloud.',
      [{ text: 'OK' }]
    );
  };

  const renderStatCard = (icon, label, value, color = COLORS.primary) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderActionCard = (icon, title, description, onPress, danger = false) => (
    <TouchableOpacity
      style={[styles.actionCard, danger && styles.actionCardDanger]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIconContainer, danger && styles.actionIconDanger]}>
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>
      <View style={styles.actionText}>
        <Text style={[styles.actionTitle, danger && styles.actionTitleDanger]}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <Text style={styles.actionArrow}>→</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeIcon}>📊</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Data & Storage</Text>
          <Text style={styles.headerSubtitle}>Manage your wound journal</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {renderStatCard('📋', 'Total Entries', stats.totalEntries, COLORS.primary)}
        {renderStatCard('📱', 'Local', stats.localEntries, COLORS.secondary)}
        {renderStatCard('☁️', 'Server', stats.serverEntries, COLORS.secondaryDark)}
        {renderStatCard('💾', 'Storage', stats.storageUsed, COLORS.textSecondary)}
      </View>

      {/* Attention Banner */}
      {stats.needsAttention > 0 && (
        <View style={styles.attentionBanner}>
          <Text style={styles.attentionIcon}>⚠️</Text>
          <View style={styles.attentionText}>
            <Text style={styles.attentionTitle}>Attention Required</Text>
            <Text style={styles.attentionSubtitle}>
              {stats.needsAttention} entr{stats.needsAttention !== 1 ? 'ies' : 'y'} marked as needing medical attention
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.attentionButton}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.attentionButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Storage Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoTitle}>How Storage Works</Text>
        </View>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>Server entries</Text> are stored securely in the cloud and synced across devices{'\n'}
          • <Text style={styles.infoBold}>Local entries</Text> are stored only on this device (offline mode){'\n'}
          • All data is private and only accessible by you
        </Text>
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <Text style={styles.sectionIcon}>🛠️</Text>
          </View>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>Data Management</Text>
            <Text style={styles.sectionSubtitle}>Export, backup, or clear data</Text>
          </View>
        </View>

        <View style={styles.sectionContent}>
          {renderActionCard(
            '📤',
            'Export Data',
            'Download your wound journal',
            handleExportData
          )}
          
          {renderActionCard(
            '☁️',
            'Backup to Cloud',
            'Securely backup your data',
            handleBackupData
          )}
          
          {renderActionCard(
            '🗑️',
            'Clear Local Data',
            'Delete offline entries only',
            handleClearLocalData,
            true
          )}
          
          {renderActionCard(
            '⚠️',
            'Clear All Data',
            'Delete all wound journal entries',
            handleClearAllData,
            true
          )}
        </View>
      </View>

      {/* Loading Overlay */}
      {clearing && (
        <View style={styles.clearingOverlay}>
          <View style={styles.clearingCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.clearingText}>Clearing data...</Text>
          </View>
        </View>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  attentionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  attentionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  attentionText: {
    flex: 1,
  },
  attentionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  attentionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  attentionButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  attentionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  infoCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '600',
    color: COLORS.textPrimary,
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
    padding: 10,
    gap: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionCardDanger: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.dangerLight,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionIconDanger: {
    backgroundColor: COLORS.accent,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  actionTitleDanger: {
    color: COLORS.accent,
  },
  actionDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  clearingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearingCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  clearingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
});

export default DataManagementScreen;
