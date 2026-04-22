import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '../components';
import { analyzeSkinImage } from '../services/geminiService';
import { COLORS } from '../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCurrentLanguage } from '../i18n';

const CameraScreen = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { patientInfo } = route.params || {};
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [facing, setFacing] = useState('back');

  const takePicture = async () => {
    if (cameraRef) {
      try {
        const photo = await cameraRef.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        setCapturedImage(photo.uri);
      } catch (error) {
        Alert.alert(t('common.error'), 'Failed to capture image');
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!result.granted) {
      Alert.alert(t('camera.permissionRequired'), 'Please grant gallery access');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      setCapturedImage(pickerResult.assets[0].uri);
    }
  };

  const handleAnalyze = async () => {
    if (!capturedImage) return;

    setAnalyzing(true);
    const currentLanguage = i18n.language || 'en';
    const result = await analyzeSkinImage(capturedImage, patientInfo, currentLanguage);
    setAnalyzing(false);

    if (result.success) {
      navigation.navigate('Results', {
        analysis: result.analysis,
        imageUri: capturedImage,
        patientInfo,
      });
    } else {
      Alert.alert(t('common.error'), result.error);
    }
  };

  const retake = () => {
    setCapturedImage(null);
  };

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Initializing camera...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.permissionCard}>
          <View style={styles.permissionIconContainer}>
            <Text style={styles.permissionIcon}>📷</Text>
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            To analyze wounds, DermAssist needs access to your camera. This allows you to capture photos for AI-powered wound assessment.
          </Text>
          <View style={styles.permissionButtons}>
            <Button title="Grant Camera Access" onPress={requestPermission} style={styles.permissionButton} />
            <Button
              title={t('camera.chooseFromGallery')}
              variant="outline"
              onPress={pickImage}
              style={styles.permissionButton}
            />
          </View>
        </View>
      </View>
    );
  }

  if (capturedImage) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.previewHeader, { paddingTop: Math.max(insets.top, 16) }]}>
          <View style={styles.previewHeaderContent}>
            <View style={styles.previewHeaderBadge}>
              <Text style={styles.previewHeaderIcon}>📸</Text>
            </View>
            <View style={styles.previewHeaderText}>
              <Text style={styles.previewHeaderTitle}>Image Captured</Text>
              <Text style={styles.previewHeaderSubtitle}>Review before analysis</Text>
            </View>
          </View>
        </View>

        {/* Image Preview */}
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.preview} />
          <View style={styles.previewOverlay}>
            <View style={styles.previewCheckmark}>
              <Text style={styles.previewCheckmarkText}>✓</Text>
            </View>
          </View>
        </View>

        {/* Analyzing Overlay */}
        {analyzing && (
          <View style={styles.analyzingOverlay}>
            <View style={styles.analyzingCard}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.analyzingTitle}>{t('camera.analyzing')}</Text>
              <Text style={styles.analyzingSubtitle}>
                AI is examining the wound image...
              </Text>
              <View style={styles.analyzingSteps}>
                <View style={styles.analyzingStep}>
                  <Text style={styles.analyzingStepIcon}>🔍</Text>
                  <Text style={styles.analyzingStepText}>Detecting wound area</Text>
                </View>
                <View style={styles.analyzingStep}>
                  <Text style={styles.analyzingStepIcon}>🎯</Text>
                  <Text style={styles.analyzingStepText}>Classifying NPIAP stage</Text>
                </View>
                <View style={styles.analyzingStep}>
                  <Text style={styles.analyzingStepIcon}>⚠️</Text>
                  <Text style={styles.analyzingStepText}>Assessing infection risk</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={[styles.previewActions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={retake}
            disabled={analyzing}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: COLORS.secondary + '20' }]}>
              <Text style={styles.actionIcon}>🔄</Text>
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>{t('camera.retake')}</Text>
              <Text style={styles.actionSubtitle}>Capture a new image</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.analyzeCard]}
            onPress={handleAnalyze}
            disabled={analyzing}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>🔬</Text>
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, styles.analyzeTitle]}>
                {analyzing ? 'Analyzing...' : 'Analyze Wound'}
              </Text>
              <Text style={styles.actionSubtitle}>Start AI assessment</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        ref={(ref) => setCameraRef(ref)}
      />
      
      {/* Header Overlay - positioned absolutely outside CameraView */}
      <View style={[styles.cameraHeader, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.cameraHeaderContent}>
          <View style={styles.cameraHeaderBadge}>
            <Text style={styles.cameraHeaderIcon}>📸</Text>
          </View>
          <View style={styles.cameraHeaderText}>
            <Text style={styles.cameraHeaderTitle}>Capture Wound Image</Text>
            <Text style={styles.cameraHeaderSubtitle}>Position wound in the frame</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.flipButton}
          onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
          activeOpacity={0.7}
        >
          <Text style={styles.flipIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Focus Area */}
      <View style={styles.focusArea}>
        <View style={styles.focusBorder}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
        </View>
        <Text style={styles.focusText}>Align wound within frame</Text>
      </View>

      {/* Instructions Card */}
      <View style={styles.instructionsCard}>
        <View style={styles.instructionRow}>
          <View style={styles.instructionIconContainer}>
            <Text style={styles.instructionIcon}>💡</Text>
          </View>
          <Text style={styles.instructionText}>Good lighting improves accuracy</Text>
        </View>
        <View style={styles.instructionRow}>
          <View style={styles.instructionIconContainer}>
            <Text style={styles.instructionIcon}>📏</Text>
          </View>
          <Text style={styles.instructionText}>Hold camera 6-12 inches away</Text>
        </View>
      </View>

      {/* Bottom Controls */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity 
          style={styles.galleryButton} 
          onPress={pickImage}
          activeOpacity={0.7}
        >
          <View style={styles.galleryButtonInner}>
            <Text style={styles.galleryIcon}>🖼️</Text>
          </View>
          <Text style={styles.galleryLabel}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.captureButton} 
          onPress={takePicture}
          activeOpacity={0.7}
        >
          <View style={styles.captureButtonOuter}>
            <View style={styles.captureButtonInner} />
          </View>
        </TouchableOpacity>

        <View style={styles.placeholder} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },
  permissionCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  permissionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  permissionIcon: {
    fontSize: 40,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionButtons: {
    width: '100%',
    gap: 12,
  },
  permissionButton: {
    width: '100%',
  },
  camera: {
    flex: 1,
  },
  cameraHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cameraHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cameraHeaderBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cameraHeaderIcon: {
    fontSize: 22,
  },
  cameraHeaderText: {
    flex: 1,
  },
  cameraHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cameraHeaderSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipIcon: {
    fontSize: 20,
  },
  focusArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusBorder: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: COLORS.primary,
    borderTopLeftRadius: 20,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: COLORS.primary,
    borderTopRightRadius: 20,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: COLORS.primary,
    borderBottomLeftRadius: 20,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: COLORS.primary,
    borderBottomRightRadius: 20,
  },
  focusText: {
    marginTop: 16,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  instructionsCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 140,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    padding: 14,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  instructionIcon: {
    fontSize: 14,
  },
  instructionText: {
    fontSize: 13,
    color: '#FFFFFF',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  galleryButton: {
    alignItems: 'center',
  },
  galleryButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  galleryIcon: {
    fontSize: 22,
  },
  galleryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  captureButton: {
    alignItems: 'center',
  },
  captureButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  captureButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  placeholder: {
    width: 50,
    height: 50,
  },
  previewHeader: {
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  previewHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewHeaderBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  previewHeaderIcon: {
    fontSize: 22,
  },
  previewHeaderText: {
    flex: 1,
  },
  previewHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  previewHeaderSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  previewContainer: {
    flex: 1,
    position: 'relative',
  },
  preview: {
    flex: 1,
    resizeMode: 'contain',
    backgroundColor: '#000',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  previewCheckmark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCheckmarkText: {
    fontSize: 24,
    color: COLORS.textWhite,
    fontWeight: '700',
  },
  previewActions: {
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  analyzeCard: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  analyzeTitle: {
    color: COLORS.primary,
  },
  actionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  analyzingCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  analyzingTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  analyzingSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
  },
  analyzingSteps: {
    width: '100%',
  },
  analyzingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  analyzingStepIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  analyzingStepText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
});

export default CameraScreen;
