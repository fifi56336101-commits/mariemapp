import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../config/theme';

const Disclaimer = ({ style }) => {
  const { t } = useTranslation();

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{t('disclaimer.title')}</Text>
      <Text style={styles.text}>{t('disclaimer.text')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.warningLight,
    borderRadius: 16,
    padding: 16,
    margin: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 8,
  },
  text: {
    fontSize: 12,
    color: '#E65100',
    lineHeight: 18,
  },
});

export default Disclaimer;
