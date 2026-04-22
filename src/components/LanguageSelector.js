import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { changeLanguage, supportedLanguages, getCurrentLanguage } from '../i18n';
import { COLORS } from '../config/theme';

const LanguageSelector = ({ compact = false }) => {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const currentLang = getCurrentLanguage();

  const handleLanguageChange = async (langCode) => {
    await changeLanguage(langCode);
    setModalVisible(false);
  };

  const currentLanguage = supportedLanguages.find(l => l.code === currentLang);

  return (
    <View>
      <TouchableOpacity
        style={[compact ? styles.compactButton : styles.button]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={compact ? styles.compactButtonText : styles.buttonText}>
          {compact ? currentLanguage?.nativeName : t('settings.language')}: {currentLanguage?.nativeName}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.language')}</Text>
            <FlatList
              data={supportedLanguages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    currentLang === item.code && styles.languageItemActive,
                  ]}
                  onPress={() => handleLanguageChange(item.code)}
                >
                  <Text
                    style={[
                      styles.languageText,
                      currentLang === item.code && styles.languageTextActive,
                    ]}
                  >
                    {item.nativeName}
                  </Text>
                  <Text style={styles.languageName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  compactButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  compactButtonText: {
    fontSize: 14,
    color: COLORS.textWhite,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.backgroundLight,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '50%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    color: COLORS.textPrimary,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  languageItemActive: {
    backgroundColor: COLORS.primary,
  },
  languageText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  languageTextActive: {
    color: COLORS.textWhite,
  },
  languageName: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  closeButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 25,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

export default LanguageSelector;
