import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
  Linking,
  Platform,
  Share,
  ActionSheetIOS,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../components';
import { parseAnalysisResponse } from '../services/geminiService';
import { saveAnalysis } from '../services/storageService';
import { getCurrentUser } from '../services/authService';
import { getDoctor, formatDoctorName, formatAnalysisForDoctor } from '../services/doctorService';
import { COLORS } from '../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ResultsScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { analysis, imageUri, patientInfo } = route.params || {};
  const parsed = parseAnalysisResponse(analysis);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [doctor, setDoctor] = useState(null);

  useEffect(() => {
    loadDoctor();
  }, []);

  const loadDoctor = async () => {
    const savedDoctor = await getDoctor();
    setDoctor(savedDoctor);
  };

  const handleSave = async () => {
    if (saved) {
      Alert.alert('Already Saved', 'This analysis is already in your wound journal.');
      return;
    }
    
    setSaving(true);
    const user = await getCurrentUser();
    if (!user) {
      setSaving(false);
      Alert.alert(t('common.error'), 'Please sign in to save results');
      return;
    }

    const result = await saveAnalysis(user._id, {
      imageUrl: imageUri,
      patientInfo,
      analysisResult: analysis,
      needsDoctor: parsed.needsDoctor,
    });

    setSaving(false);

    if (result.success) {
      setSaved(true);
      Alert.alert('Saved', 'Analysis saved to your wound journal.');
    } else {
      Alert.alert(t('common.error'), result.error);
    }
  };

  const handleShare = async () => {
    try {
      const stage = parsed.stage ? `Stage ${parsed.stage}` : 'Unknown stage';
      const urgency = parsed.urgency || 'LOW';
      await Share.share({
        message: `DermAssist Wound Analysis\n\nStage: ${stage}\nUrgency: ${urgency}\n\n${parsed.description || ''}\n\n⚠️ AI-generated analysis. Consult a healthcare professional.`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const callEmergency = () => {
    const phoneNumber = '112';
    const phoneUrl = Platform.OS === 'ios' ? `telprompt:${phoneNumber}` : `tel:${phoneNumber}`;
    
    Alert.alert(
      'Emergency Call',
      `Call emergency services (${phoneNumber})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call Now', 
          style: 'destructive',
          onPress: () => Linking.openURL(phoneUrl).catch(() => Alert.alert('Error', 'Phone calls not supported'))
        },
      ]
    );
  };

  const callMyDoctor = () => {
    if (!doctor) {
      Alert.alert(
        'No Doctor Saved',
        'Would you like to add your doctor\'s contact information?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Setup Doctor', onPress: () => navigation.navigate('DoctorSetup') },
        ]
      );
      return;
    }

    const doctorName = formatDoctorName(doctor);
    const phoneUrl = Platform.OS === 'ios' ? `telprompt:${doctor.phone}` : `tel:${doctor.phone}`;

    Alert.alert(
      `Call ${doctorName}`,
      `Call ${doctorName} at ${doctor.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Now', onPress: () => Linking.openURL(phoneUrl).catch(() => Alert.alert('Error', 'Phone calls not supported')) },
      ]
    );
  };

  const sendToDoctor = () => {
    if (!doctor) {
      Alert.alert(
        'No Doctor Saved',
        'Would you like to add your doctor\'s contact information?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Setup Doctor', onPress: () => navigation.navigate('DoctorSetup') },
        ]
      );
      return;
    }

    const doctorName = formatDoctorName(doctor);
    const reportMessage = formatAnalysisForDoctor(parsed, patientInfo, imageUri);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: `Send to ${doctorName}`,
          options: ['Cancel', 'Email', 'WhatsApp', 'Copy'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) sendViaEmail(reportMessage);
          else if (buttonIndex === 2) sendViaWhatsApp(reportMessage);
          else if (buttonIndex === 3) copyToClipboard(reportMessage);
        }
      );
    } else {
      Alert.alert(
        `Send to ${doctorName}`,
        'Choose how to send the report',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Email', onPress: () => sendViaEmail(reportMessage) },
          { text: 'WhatsApp', onPress: () => sendViaWhatsApp(reportMessage) },
          { text: 'Copy', onPress: () => copyToClipboard(reportMessage) },
        ]
      );
    }
  };

  const sendViaEmail = (message) => {
    const subject = `DermAssist Wound Analysis - ${new Date().toLocaleDateString()}`;
    const emailUrl = `mailto:${doctor.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    Linking.openURL(emailUrl).catch(() => Alert.alert('Error', 'Email not configured'));
  };

  const sendViaWhatsApp = async (message) => {
    const whatsappUrl = `whatsapp://send?phone=${doctor.phone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(message)}`;
    const supported = await Linking.canOpenURL(whatsappUrl);
    if (supported) {
      await Linking.openURL(whatsappUrl);
    } else {
      Alert.alert('WhatsApp Not Installed', 'Please install WhatsApp');
    }
  };

  const copyToClipboard = async (message) => {
    try {
      const Clipboard = require('expo-clipboard');
      await Clipboard.default.setStringAsync(message);
      Alert.alert('Copied', 'Report copied to clipboard');
    } catch {
      await Share.share({ message });
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'CRITICAL': return '#FF0000';
      case 'HIGH': return '#FF4444';
      case 'MEDIUM': return '#FFA726';
      default: return COLORS.secondary;
    }
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'CRITICAL': return '🆘';
      case 'HIGH': return '🚨';
      case 'MEDIUM': return '⚠️';
      default: return '✅';
    }
  };

  const getUrgencyMessage = (urgency) => {
    switch (urgency) {
      case 'CRITICAL': return 'LIFE-THREATENING - CALL EMERGENCY';
      case 'HIGH': return 'URGENT - Seek medical attention within 24 hours';
      case 'MEDIUM': return 'Monitor closely - Consult doctor soon';
      default: return 'Minor concern - Continue home care';
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Image */}
      {imageUri && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} />
        </View>
      )}

      {/* Rejection Card */}
      {parsed.isRejection && (
        <View style={styles.rejectionCard}>
          <View style={styles.rejectionIconWrap}>
            <Text style={styles.rejectionIconText}>✓</Text>
          </View>
          <Text style={styles.rejectionTitle}>No Wound Detected</Text>
          <Text style={styles.rejectionDesc}>
            The AI did not detect an open wound or skin injury. This may be normal skin, a dermatological condition, or image quality was insufficient.
          </Text>
        </View>
      )}

      {/* Emergency Banner */}
      {parsed.isEmergency && (
        <View style={[styles.emergencyBanner, { backgroundColor: getUrgencyColor(parsed.urgency) }]}>
          <Text style={styles.emergencyIcon}>{getUrgencyIcon(parsed.urgency)}</Text>
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>
              {parsed.urgency === 'CRITICAL' ? 'CRITICAL EMERGENCY' : 'URGENT ATTENTION'}
            </Text>
            <Text style={styles.emergencyMessage}>{getUrgencyMessage(parsed.urgency)}</Text>
          </View>
          <TouchableOpacity style={styles.emergencyBtn} onPress={callEmergency}>
            <Text style={styles.emergencyBtnText}>Call 112</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Result Card */}
      {!parsed.isRejection && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(parsed.urgency) + '20' }]}>
              <Text style={styles.urgencyBadgeIcon}>{getUrgencyIcon(parsed.urgency)}</Text>
              <Text style={[styles.urgencyBadgeText, { color: getUrgencyColor(parsed.urgency) }]}>
                {parsed.urgency || 'LOW'}
              </Text>
            </View>
            {parsed.stage && (
              <View style={styles.stageBadge}>
                <Text style={styles.stageBadgeText}>Stage {parsed.stage}</Text>
              </View>
            )}
          </View>

          {(parsed.woundType || parsed.location) && (
            <View style={styles.classificationRow}>
              {parsed.woundType && (
                <View style={styles.classificationItem}>
                  <Text style={styles.classificationLabel}>Type</Text>
                  <Text style={styles.classificationValue}>{parsed.woundType}</Text>
                </View>
              )}
              {parsed.location && (
                <View style={styles.classificationItem}>
                  <Text style={styles.classificationLabel}>Location</Text>
                  <Text style={styles.classificationValue}>{parsed.location}</Text>
                </View>
              )}
            </View>
          )}

          {parsed.infectionRisk && (
            <View style={[styles.infectionRow, parsed.infectionRisk?.toLowerCase() === 'high' && styles.infectionRowHigh]}>
              <Text style={styles.infectionLabel}>Infection Risk</Text>
              <Text style={[styles.infectionValue, parsed.infectionRisk?.toLowerCase() === 'high' && styles.infectionValueHigh]}>
                {parsed.infectionRisk}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Clinical Details */}
      {!parsed.isRejection && (
        <View style={styles.detailsSection}>
          {parsed.description && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailText}>{parsed.description}</Text>
            </View>
          )}
          {parsed.woundBed && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Wound Bed</Text>
              <Text style={styles.detailText}>{parsed.woundBed}</Text>
            </View>
          )}
          {parsed.exudate && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Exudate</Text>
              <Text style={styles.detailText}>{parsed.exudate}</Text>
            </View>
          )}
          {parsed.healingTrajectory && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Healing Status</Text>
              <Text style={styles.detailText}>{parsed.healingTrajectory}</Text>
            </View>
          )}
          {(parsed.treatmentPlan || parsed.recommendations) && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Recommendations</Text>
              <Text style={styles.detailText}>{parsed.treatmentPlan || parsed.recommendations}</Text>
            </View>
          )}
        </View>
      )}

      {/* Medical Attention */}
      {!parsed.isRejection && (
        <View style={[styles.attentionCard, parsed.needsDoctor ? styles.attentionCardWarning : styles.attentionCardOk]}>
          <Text style={styles.attentionIcon}>{parsed.needsDoctor ? '⚠️' : '✅'}</Text>
          <Text style={styles.attentionText}>
            {parsed.needsDoctor ? 'Medical consultation recommended' : 'Self-care appropriate'}
          </Text>
        </View>
      )}

      <Disclaimer />

      {/* Doctor Actions */}
      {!parsed.isRejection && (
        <View style={styles.doctorSection}>
          <Text style={styles.doctorSectionTitle}>Contact Doctor</Text>
          <View style={styles.doctorActionsRow}>
            <TouchableOpacity style={styles.doctorBtn} onPress={sendToDoctor}>
              <Text style={styles.doctorBtnIcon}>📧</Text>
              <Text style={styles.doctorBtnText}>Send Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doctorBtn} onPress={callMyDoctor}>
              <Text style={styles.doctorBtnIcon}>📞</Text>
              <Text style={styles.doctorBtnText}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('PatientForm')}>
          <Text style={styles.actionBtnIcon}>🔄</Text>
          <Text style={styles.actionBtnText}>New</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.actionBtnIcon}>{saved ? '✅' : '💾'}</Text>
          <Text style={styles.actionBtnText}>{saved ? 'Saved' : 'Save'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Text style={styles.actionBtnIcon}>📤</Text>
          <Text style={styles.actionBtnText}>Share</Text>
        </TouchableOpacity>
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
  imageContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: COLORS.backgroundLight,
  },
  image: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  rejectionCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  rejectionIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  rejectionIconText: {
    fontSize: 32,
    color: COLORS.textWhite,
  },
  rejectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  rejectionDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  emergencyIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  emergencyMessage: {
    fontSize: 12,
    color: COLORS.textWhite,
    opacity: 0.9,
    marginTop: 2,
  },
  emergencyBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emergencyBtnText: {
    color: COLORS.textWhite,
    fontWeight: '700',
    fontSize: 14,
  },
  resultCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 10,
  },
  urgencyBadgeIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  urgencyBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stageBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  stageBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  classificationRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  classificationItem: {
    flex: 1,
    marginRight: 12,
  },
  classificationLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  classificationValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  infectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  infectionRowHigh: {
    backgroundColor: '#FFEBEE',
  },
  infectionLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  infectionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  infectionValueHigh: {
    color: '#D32F2F',
  },
  detailsSection: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailItem: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  attentionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  attentionCardWarning: {
    backgroundColor: '#FFF3E0',
  },
  attentionCardOk: {
    backgroundColor: '#E8F5E9',
  },
  attentionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  attentionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  doctorSection: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  doctorSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  doctorActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  doctorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 14,
    borderRadius: 14,
    marginHorizontal: 4,
  },
  doctorBtnIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  doctorBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    paddingVertical: 16,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});

export default ResultsScreen;
