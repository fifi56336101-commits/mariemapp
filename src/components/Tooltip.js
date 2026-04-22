import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { COLORS } from '../config/theme';

const { width } = Dimensions.get('window');

const Tooltip = ({
  message,
  icon = '💡',
  position = 'bottom',
  visible = true,
  onDismiss,
  autoHide = true,
  duration = 5000,
  actionText = null,
  onAction = null,
}) => {
  const [showTooltip, setShowTooltip] = useState(visible);
  const opacity = new Animated.Value(0);

  useEffect(() => {
    if (showTooltip) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      if (autoHide) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [showTooltip]);

  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowTooltip(false);
      onDismiss?.();
    });
  };

  if (!showTooltip) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.message}>{message}</Text>
          {actionText && (
            <TouchableOpacity onPress={onAction}>
              <Text style={styles.actionText}>{actionText}</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 13,
    color: COLORS.textWhite,
    lineHeight: 18,
    fontWeight: '500',
  },
  actionText: {
    fontSize: 12,
    color: COLORS.textWhite,
    fontWeight: '700',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  closeIcon: {
    fontSize: 12,
    color: COLORS.textWhite,
    fontWeight: '600',
  },
});

export default Tooltip;
