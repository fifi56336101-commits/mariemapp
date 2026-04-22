import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '../components';
import { COLORS } from '../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PatientFormScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({
    age: '',
    diseases: [],
    woundLocation: '',
    painLevel: '',
    duration: '',
    hasRedness: false,
    hasHeat: false,
    hasPus: false,
    hasOdor: false,
    hasFever: false,
    additionalNotes: '',
  });
  const [errors, setErrors] = useState({});

  const painLevels = Array.from({ length: 10 }, (_, i) => i + 1);

  const diseaseOptions = [
    { id: 'diabetes', label: t('patientForm.diabetes'), icon: '🩸' },
    { id: 'immobility', label: t('patientForm.immobility'), icon: '🛏️' },
    { id: 'incontinence', label: t('patientForm.incontinence'), icon: '💧' },
    { id: 'malnutrition', label: t('patientForm.malnutrition'), icon: '🍽️' },
    { id: 'circulation', label: t('patientForm.circulation'), icon: '❤️' },
  ];

  const locationOptions = [
    { id: 'sacrum', label: t('patientForm.sacrum'), icon: '🦴' },
    { id: 'heel', label: t('patientForm.heel'), icon: '🦶' },
    { id: 'hip', label: t('patientForm.hip'), icon: '🦴' },
    { id: 'elbow', label: t('patientForm.elbow'), icon: '💪' },
    { id: 'shoulder', label: t('patientForm.shoulder'), icon: '🦴' },
    { id: 'ear', label: t('patientForm.ear'), icon: '👂' },
    { id: 'other', label: t('patientForm.otherLocation'), icon: '📍' },
  ];

  const infectionSigns = [
    { id: 'hasRedness', label: t('patientForm.redness'), icon: '🔴', field: 'hasRedness' },
    { id: 'hasHeat', label: t('patientForm.heat'), icon: '🌡️', field: 'hasHeat' },
    { id: 'hasPus', label: t('patientForm.pus'), icon: '🟡', field: 'hasPus' },
    { id: 'hasOdor', label: t('patientForm.odor'), icon: '💨', field: 'hasOdor' },
    { id: 'hasFever', label: t('patientForm.fever'), icon: '🤒', field: 'hasFever' },
  ];

  const toggleDisease = (diseaseId) => {
    setFormData(prev => ({
      ...prev,
      diseases: prev.diseases.includes(diseaseId)
        ? prev.diseases.filter(d => d !== diseaseId)
        : [...prev.diseases, diseaseId],
    }));
  };

  const toggleSymptom = (field) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.age.trim()) {
      newErrors.age = t('patientForm.required');
    } else if (isNaN(formData.age) || parseInt(formData.age) < 1 || parseInt(formData.age) > 120) {
      newErrors.age = 'Please enter a valid age (1-120)';
    }
    if (!formData.woundLocation) {
      newErrors.woundLocation = t('patientForm.required');
    }
    if (!formData.painLevel) {
      newErrors.painLevel = t('patientForm.required');
    }
    if (!formData.duration.trim()) {
      newErrors.duration = t('patientForm.required');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateForm()) return;

    navigation.navigate('Camera', {
      patientInfo: {
        age: formData.age,
        diseases: formData.diseases,
        woundLocation: formData.woundLocation,
        painLevel: formData.painLevel,
        duration: formData.duration,
        symptoms: {
          redness: formData.hasRedness,
          heat: formData.hasHeat,
          pus: formData.hasPus,
          odor: formData.hasOdor,
          fever: formData.hasFever,
        },
        additionalNotes: formData.additionalNotes,
      },
    });
  };

  const renderSectionHeader = (icon, title, subtitle) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconContainer}>
        <Text style={styles.sectionIcon}>{icon}</Text>
      </View>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const renderInfectionCard = (item) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.infectionCard, formData[item.field] && styles.infectionCardActive]}
      onPress={() => toggleSymptom(item.field)}
      activeOpacity={0.7}
    >
      <View style={[styles.infectionIconCircle, formData[item.field] && styles.infectionIconCircleActive]}>
        <Text style={styles.infectionIcon}>{item.icon}</Text>
      </View>
      <Text style={[styles.infectionLabel, formData[item.field] && styles.infectionLabelActive]}>
        {item.label}
      </Text>
      {formData[item.field] && (
        <View style={styles.checkBadge}>
          <Text style={styles.checkBadgeText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderLocationButton = (option) => (
    <TouchableOpacity
      key={option.id}
      style={[
        styles.locationCard,
        formData.woundLocation === option.id && styles.locationCardActive,
      ]}
      onPress={() => updateField('woundLocation', option.id)}
      activeOpacity={0.7}
    >
      <Text style={styles.locationIcon}>{option.icon}</Text>
      <Text
        style={[
          styles.locationLabel,
          formData.woundLocation === option.id && styles.locationLabelActive,
        ]}
      >
        {option.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 24) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Professional Header */}
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeIcon}>🩹</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('patientForm.title')}</Text>
            <Text style={styles.subtitle}>
              {t('patientForm.subtitle')}
            </Text>
          </View>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '33%' }]} />
          </View>
          <Text style={styles.progressText}>Step 1 of 3 - Clinical Data</Text>
        </View>

        <View style={styles.form}>
          {/* Patient Demographics Section */}
          <View style={styles.card}>
            {renderSectionHeader('👤', 'Patient Demographics', 'Basic patient information')}
            
            <View style={styles.cardContent}>
              <View style={styles.inputRow}>
                <View style={styles.inputIconContainer}>
                  <Text style={styles.inputIcon}>🎂</Text>
                </View>
                <View style={styles.inputField}>
                  <Input
                    label={t('patientForm.age')}
                    value={formData.age}
                    onChangeText={(value) => updateField('age', value)}
                    placeholder={t('patientForm.agePlaceholder')}
                    keyboardType="number-pad"
                    error={errors.age}
                    required
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Risk Factors Section */}
          <View style={styles.card}>
            {renderSectionHeader('⚠️', 'Risk Factors', t('patientForm.associatedDiseases'))}
            
            <View style={styles.cardContent}>
              <View style={styles.diseaseGrid}>
                {diseaseOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.diseaseCard,
                      formData.diseases.includes(option.id) && styles.diseaseCardActive,
                    ]}
                    onPress={() => toggleDisease(option.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.diseaseIcon}>{option.icon}</Text>
                    <Text
                      style={[
                        styles.diseaseLabel,
                        formData.diseases.includes(option.id) && styles.diseaseLabelActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {formData.diseases.includes(option.id) && (
                      <View style={styles.selectedIndicator}>
                        <Text style={styles.selectedIndicatorText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Wound Location Section */}
          <View style={styles.card}>
            {renderSectionHeader('📍', 'Wound Location', 'Select the anatomical site')}
            
            <View style={styles.cardContent}>
              <View style={styles.locationGrid}>
                {locationOptions.map(renderLocationButton)}
              </View>
              {errors.woundLocation && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{errors.woundLocation}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Clinical Assessment Section */}
          <View style={styles.card}>
            {renderSectionHeader('🩺', 'Clinical Assessment', 'Wound duration and pain evaluation')}
            
            <View style={styles.cardContent}>
              <View style={styles.inputRow}>
                <View style={styles.inputIconContainer}>
                  <Text style={styles.inputIcon}>⏱️</Text>
                </View>
                <View style={styles.inputField}>
                  <Input
                    label={t('patientForm.duration')}
                    value={formData.duration}
                    onChangeText={(value) => updateField('duration', value)}
                    placeholder={t('patientForm.durationPlaceholder')}
                    error={errors.duration}
                    required
                  />
                </View>
              </View>

              {/* Pain Scale */}
              <View style={styles.painSection}>
                <View style={styles.painLabelRow}>
                  <Text style={styles.painLabel}>{t('patientForm.painLevel')}</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <Text style={styles.painHint}>0 = No pain, 10 = Worst pain imaginable</Text>
                
                <View style={styles.painScaleContainer}>
                  <View style={styles.painScale}>
                    {painLevels.map((level) => (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.painButton,
                          formData.painLevel === level.toString() && styles.painButtonSelected,
                        ]}
                        onPress={() => updateField('painLevel', level.toString())}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.painButtonText,
                            formData.painLevel === level.toString() && styles.painButtonTextSelected,
                          ]}
                        >
                          {level}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.painLabels}>
                    <Text style={styles.painLow}>No Pain</Text>
                    <Text style={styles.painHigh}>Severe</Text>
                  </View>
                </View>
                {errors.painLevel && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>{errors.painLevel}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Infection Signs Section */}
          <View style={styles.card}>
            {renderSectionHeader('🦠', 'Signs of Infection', t('patientForm.infectionSigns'))}
            
            <View style={styles.cardContent}>
              <Text style={styles.instructionText}>
                Select all symptoms currently present around the wound area:
              </Text>
              <View style={styles.infectionGrid}>
                {infectionSigns.map(renderInfectionCard)}
              </View>
            </View>
          </View>

          {/* Additional Notes Section */}
          <View style={styles.card}>
            {renderSectionHeader('📝', 'Additional Notes', 'Any other relevant clinical information')}
            
            <View style={styles.cardContent}>
              <Input
                label={t('patientForm.additionalNotes')}
                value={formData.additionalNotes}
                onChangeText={(value) => updateField('additionalNotes', value)}
                placeholder={t('patientForm.additionalNotesPlaceholder')}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <Button
            title={t('patientForm.next')}
            onPress={handleNext}
            style={styles.nextButton}
          />
          <Text style={styles.disclaimer}>
            All information is kept confidential and secure
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  headerBadgeIcon: {
    fontSize: 28,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
  cardContent: {
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inputIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 24,
  },
  inputIcon: {
    fontSize: 20,
  },
  inputField: {
    flex: 1,
  },
  diseaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  diseaseCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  diseaseCardActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  diseaseIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  diseaseLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  diseaseLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicatorText: {
    color: COLORS.textWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  locationCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  locationCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  locationIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  locationLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  locationLabelActive: {
    color: COLORS.textWhite,
    fontWeight: '600',
  },
  painSection: {
    marginTop: 16,
  },
  painLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  painLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  required: {
    color: COLORS.accent,
    marginLeft: 4,
  },
  painHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  painScaleContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 12,
  },
  painScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  painButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  painButtonSelected: {
    backgroundColor: COLORS.primary,
    transform: [{ scale: 1.15 }],
  },
  painButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  painButtonTextSelected: {
    color: COLORS.textWhite,
    fontWeight: '700',
  },
  painLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  painLow: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  painHigh: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '500',
  },
  instructionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  infectionGrid: {
    gap: 10,
  },
  infectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  infectionCardActive: {
    backgroundColor: COLORS.dangerLight,
    borderColor: COLORS.accent,
  },
  infectionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infectionIconCircleActive: {
    backgroundColor: COLORS.accent,
  },
  infectionIcon: {
    fontSize: 20,
  },
  infectionLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infectionLabelActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeText: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: '700',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  errorText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '500',
  },
  actionContainer: {
    marginTop: 8,
  },
  nextButton: {
    marginBottom: 12,
  },
  disclaimer: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PatientFormScreen;
