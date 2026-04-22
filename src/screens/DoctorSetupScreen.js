import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components';
import { saveDoctor, getDoctor, deleteDoctor, formatDoctorName } from '../services/doctorService';
import { COLORS } from '../config/theme';

const DoctorSetupScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasDoctor, setHasDoctor] = useState(false);
  
  const [doctor, setDoctor] = useState({
    firstName: '',
    lastName: '',
    title: 'Dr.',
    phone: '',
    email: '',
    clinic: '',
    specialty: '',
    notes: '',
  });

  useEffect(() => {
    loadDoctor();
  }, []);

  const loadDoctor = async () => {
    const savedDoctor = await getDoctor();
    if (savedDoctor) {
      setDoctor(savedDoctor);
      setHasDoctor(true);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!doctor.firstName && !doctor.lastName) {
      Alert.alert('Missing Information', 'Please enter at least the doctor\'s name');
      return;
    }
    
    if (!doctor.phone && !doctor.email) {
      Alert.alert('Missing Contact', 'Please enter a phone number or email');
      return;
    }

    setSaving(true);
    const result = await saveDoctor(doctor);
    setSaving(false);

    if (result.success) {
      Alert.alert('✅ Saved', 'Doctor information saved successfully');
      setHasDoctor(true);
    } else {
      Alert.alert('Error', 'Failed to save doctor information');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Doctor',
      'Are you sure you want to remove this doctor from your contacts?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDoctor();
            setDoctor({
              firstName: '',
              lastName: '',
              title: 'Dr.',
              phone: '',
              email: '',
              clinic: '',
              specialty: '',
              notes: '',
            });
            setHasDoctor(false);
            Alert.alert('Deleted', 'Doctor removed from contacts');
          },
        },
      ]
    );
  };

  const updateField = (field, value) => {
    setDoctor(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Text style={styles.headerIcon}>👨‍⚕️</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>My Doctor</Text>
            <Text style={styles.headerSubtitle}>
              {hasDoctor ? 'Update your doctor\'s contact information' : 'Add your doctor for quick contact'}
            </Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Doctor Information</Text>
            <Text style={styles.formSubtitle}>Required fields marked with *</Text>
          </View>

          <View style={styles.formBody}>
            {/* Title Selection */}
            <View style={styles.titleRow}>
              {['Dr.', 'Prof.', 'Nurse', 'PA'].map((title) => (
                <TouchableOpacity
                  key={title}
                  style={[
                    styles.titleButton,
                    doctor.title === title && styles.titleButtonActive,
                  ]}
                  onPress={() => updateField('title', title)}
                >
                  <Text style={[
                    styles.titleButtonText,
                    doctor.title === title && styles.titleButtonTextActive,
                  ]}>
                    {title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name Fields */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={doctor.firstName}
                  onChangeText={(val) => updateField('firstName', val)}
                  placeholder="First name"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={doctor.lastName}
                  onChangeText={(val) => updateField('lastName', val)}
                  placeholder="Last name"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.field}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={doctor.phone}
                onChangeText={(val) => updateField('phone', val)}
                placeholder="+1 234 567 8900"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
            </View>

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={doctor.email}
                onChangeText={(val) => updateField('email', val)}
                placeholder="doctor@clinic.com"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Clinic */}
            <View style={styles.field}>
              <Text style={styles.label}>Clinic/Hospital</Text>
              <TextInput
                style={styles.input}
                value={doctor.clinic}
                onChangeText={(val) => updateField('clinic', val)}
                placeholder="Medical center name"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            {/* Specialty */}
            <View style={styles.field}>
              <Text style={styles.label}>Specialty</Text>
              <TextInput
                style={styles.input}
                value={doctor.specialty}
                onChangeText={(val) => updateField('specialty', val)}
                placeholder="e.g., Wound Care, Dermatology"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            {/* Notes */}
            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={doctor.notes}
                onChangeText={(val) => updateField('notes', val)}
                placeholder="Any additional notes..."
                placeholderTextColor={COLORS.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.textWhite} />
            ) : (
              <>
                <Text style={styles.saveButtonIcon}>💾</Text>
                <Text style={styles.saveButtonText}>Save Doctor</Text>
              </>
            )}
          </TouchableOpacity>

          {hasDoctor && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteButtonIcon}>🗑️</Text>
              <Text style={styles.deleteButtonText}>Remove Doctor</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoTitle}>How this helps</Text>
          </View>
          <Text style={styles.infoText}>
            After saving your doctor, you can quickly share wound analysis results via email or call them directly from the results screen. This saves time during urgent situations.
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
  scrollView: {
    flex: 1,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIconContainer: {
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
  headerIcon: {
    fontSize: 28,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.primaryLight,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  formSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  formBody: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  titleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  titleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  titleButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  titleButtonTextActive: {
    color: COLORS.textWhite,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  actions: {
    gap: 12,
    marginBottom: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dangerLight,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  deleteButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.accent,
  },
  infoCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default DoctorSetupScreen;
