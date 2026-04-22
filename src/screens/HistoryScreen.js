import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAnalysisHistory, deleteAnalysis } from '../services/storageService';
import { getCurrentUser } from '../services/authService';
import { parseAnalysisResponse } from '../services/geminiService';
import { COLORS } from '../config/theme';

const HistoryScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
    
    // Refresh when screen comes into focus
    const unsubscribe = navigation.addListener('focus', loadHistory);
    return unsubscribe;
  }, [navigation]);

  const loadHistory = async () => {
    const user = await getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const result = await getAnalysisHistory(user._id);
    if (result.success) {
      // Sort by date descending
      const sorted = [...result.data].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      setHistory(sorted);
    }
    setLoading(false);
  };

  const handleDelete = async (item) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this wound journal entry?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const user = await getCurrentUser();
            if (user) {
              await deleteAnalysis(item._id, user._id);
              loadHistory();
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStageColor = (stage) => {
    if (!stage) return COLORS.textSecondary;
    const stageNum = parseInt(stage);
    if (stageNum === 1) return COLORS.secondary;
    if (stageNum === 2) return '#FFA726';
    if (stageNum === 3) return '#FF7043';
    if (stageNum === 4) return COLORS.accent;
    return COLORS.textSecondary;
  };

  const getStageDescription = (stage) => {
    const descriptions = {
      1: 'Non-blanchable erythema',
      2: 'Partial-thickness loss',
      3: 'Full-thickness loss',
      4: 'Deep tissue injury',
    };
    return descriptions[parseInt(stage)] || '';
  };

  // Calculate stats
  const getStats = () => {
    const totalEntries = history.length;
    const needsAttention = history.filter(h => h.needsDoctor).length;
    const stages = history.map(h => parseAnalysisResponse(h.analysisResult)?.stage);
    const latestStage = stages[0] || '-';
    return { totalEntries, needsAttention, latestStage };
  };

  const stats = getStats();

  const renderItem = ({ item, index }) => {
    const parsed = parseAnalysisResponse(item.analysisResult);
    const stage = parsed?.stage || '';
    const location = item.patientInfo?.woundLocation || 'Unknown';
    
    return (
      <TouchableOpacity
        style={styles.entryCard}
        onPress={() => navigation.navigate('Results', {
          analysis: item.analysisResult,
          imageUri: item.imageUrl,
          patientInfo: item.patientInfo,
        })}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        {/* Entry Header */}
        <View style={styles.entryHeader}>
          <View style={styles.entryNumberBadge}>
            <Text style={styles.entryNumberText}>#{history.length - index}</Text>
          </View>
          <View style={styles.entryDateContainer}>
            <Text style={styles.entryDateIcon}>📅</Text>
            <Text style={styles.entryDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>

        {/* Entry Body */}
        <View style={styles.entryBody}>
          {/* Thumbnail */}
          {item.imageUrl && (
            <View style={styles.thumbnailContainer}>
              <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} />
              <View style={styles.thumbnailOverlay}>
                <Text style={styles.thumbnailIcon}>🔍</Text>
              </View>
            </View>
          )}
          
          {/* Clinical Info */}
          <View style={styles.entryInfo}>
            {/* Stage Badge */}
            {stage && (
              <View style={styles.stageRow}>
                <View style={[styles.stageBadge, { backgroundColor: getStageColor(stage) }]}>
                  <Text style={styles.stageBadgeText}>Stage {stage}</Text>
                </View>
                <Text style={styles.stageDescription}>{getStageDescription(stage)}</Text>
              </View>
            )}

            {/* Clinical Details */}
            <View style={styles.clinicalDetails}>
              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <Text style={styles.detailIcon}>📍</Text>
                </View>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{location}</Text>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <Text style={styles.detailIcon}>😣</Text>
                </View>
                <Text style={styles.detailLabel}>Pain Level</Text>
                <Text style={styles.detailValue}>{item.patientInfo?.painLevel || 'N/A'}/10</Text>
              </View>
            </View>

            {/* Status Badge */}
            <View style={[
              styles.statusBadge,
              item.needsDoctor ? styles.statusBadgeDanger : styles.statusBadgeSuccess,
            ]}>
              <Text style={styles.statusBadgeIcon}>
                {item.needsDoctor ? '⚠️' : '✅'}
              </Text>
              <Text style={[
                styles.statusBadgeText,
                item.needsDoctor && styles.statusBadgeTextDanger,
              ]}>
                {item.needsDoctor ? 'Needs Medical Attention' : 'Self-Care Monitoring'}
              </Text>
            </View>
          </View>
        </View>

        {/* View Arrow */}
        <View style={styles.viewIndicator}>
          <Text style={styles.viewIndicatorText}>→</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
      </View>
      <Text style={styles.emptyTitle}>No Wound Journal Entries</Text>
      <Text style={styles.emptySubtitle}>
        Start a new analysis to begin tracking wound evolution over time
      </Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => navigation.navigate('PatientForm')}
        activeOpacity={0.7}
      >
        <Text style={styles.emptyButtonIcon}>📸</Text>
        <Text style={styles.emptyButtonText}>Start New Analysis</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading wound journal...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Hero Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeIcon}>📋</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{t('home.viewHistory')}</Text>
            <Text style={styles.headerSubtitle}>Track wound evolution over time</Text>
          </View>
        </View>
      </View>

      {/* Stats Section */}
      {history.length > 0 && (
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.primaryLight }]}>
              <Text style={styles.statIcon}>📊</Text>
            </View>
            <Text style={styles.statValue}>{stats.totalEntries}</Text>
            <Text style={styles.statLabel}>Total Entries</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.dangerLight }]}>
              <Text style={styles.statIcon}>⚠️</Text>
            </View>
            <Text style={styles.statValue}>{stats.needsAttention}</Text>
            <Text style={styles.statLabel}>Need Attention</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.secondary + '20' }]}>
              <Text style={styles.statIcon}>🎯</Text>
            </View>
            <Text style={styles.statValue}>Stage {stats.latestStage}</Text>
            <Text style={styles.statLabel}>Latest Stage</Text>
          </View>
        </View>
      )}

      {/* Journal Entries */}
      {history.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadHistory}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
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
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 18,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
  },
  entryCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  entryNumberBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  entryNumberText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  entryDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryDateIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  entryDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  entryBody: {
    flexDirection: 'row',
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: 14,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailIcon: {
    fontSize: 12,
  },
  entryInfo: {
    flex: 1,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stageBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  stageBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  stageDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  clinicalDetails: {
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  detailIcon: {
    fontSize: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 75,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadgeDanger: {
    backgroundColor: COLORS.dangerLight,
  },
  statusBadgeSuccess: {
    backgroundColor: COLORS.successLight,
  },
  statusBadgeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.secondary,
  },
  statusBadgeTextDanger: {
    color: COLORS.accent,
  },
  viewIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewIndicatorText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 50,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyButtonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
});

export default HistoryScreen;
