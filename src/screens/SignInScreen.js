import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input } from '../components';
import { signIn, guestLogin } from '../services/authService';
import { COLORS } from '../config/theme';

const SignInScreen = ({ navigation, onLogin }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = t('patientForm.required');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!password) {
      newErrors.password = t('patientForm.required');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);

    if (result.success) {
      // Call onLogin to refresh session in App.js
      if (onLogin) {
        onLogin(result.data);
      }
    } else {
      Alert.alert(t('common.error'), result.error);
    }
  };

  const handleSkipLogin = async () => {
    setLoading(true);
    const result = await guestLogin();
    setLoading(false);
    
    if (result.success) {
      // Call onLogin to refresh session in App.js
      if (onLogin) {
        onLogin(result.data);
      }
    } else {
      Alert.alert('Error', 'Failed to start demo mode');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 24) }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>🩹</Text>
          </View>
          <Text style={styles.appName}>{t('app.name')}</Text>
          <Text style={styles.tagline}>{t('app.tagline')}</Text>
          <View style={styles.trustBadges}>
            <View style={styles.trustBadge}>
              <Text style={styles.trustBadgeIcon}>🔒</Text>
              <Text style={styles.trustBadgeText}>HIPAA Secure</Text>
            </View>
            <View style={styles.trustBadge}>
              <Text style={styles.trustBadgeIcon}>🎯</Text>
              <Text style={styles.trustBadgeText}>NPIAP Staging</Text>
            </View>
            <View style={styles.trustBadge}>
              <Text style={styles.trustBadgeIcon}>🌍</Text>
              <Text style={styles.trustBadgeText}>4 Languages</Text>
            </View>
          </View>
        </View>

        <View style={styles.formContainer}>
          <Input
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            required
          />

          <Input
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            error={errors.password}
            required
          />

          <Button
            title={loading ? t('common.loading') : t('auth.signIn')}
            onPress={handleSignIn}
            loading={loading}
            style={styles.signInButton}
          />

          <Button
            title={t('auth.noAccount') + ' ' + t('auth.signUp')}
            variant="outline"
            onPress={() => navigation.navigate('SignUp')}
            style={styles.signUpButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title={loading ? "Starting..." : "Skip Login (Demo Mode)"}
            variant="ghost"
            onPress={handleSkipLogin}
            loading={loading}
            style={styles.skipButton}
          />
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    fontSize: 50,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  trustBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trustBadgeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  trustBadgeText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
  },
  signInButton: {
    marginTop: 24,
  },
  signUpButton: {
    marginTop: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: COLORS.textLight,
    fontSize: 14,
  },
  skipButton: {
    marginTop: 8,
  },
});

export default SignInScreen;
