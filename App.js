import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';

import i18n from './src/i18n';
import { AuthNavigator, MainNavigator } from './src/navigation';
import { getSession, validateToken } from './src/services/authService';
import { initializeReminders } from './src/services/reminderService';
import { ErrorBoundary } from './src/components';
import { COLORS } from './src/config/theme';

// Optional splash screen - gracefully handle if not installed
let SplashScreen = null;
try {
  SplashScreen = require('expo-splash-screen');
  // Keep splash screen visible while loading
  SplashScreen.preventAutoHideAsync();
} catch (e) {
  // expo-splash-screen not installed, continue without it
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        // Check for existing session on app start
        const existingSession = await getSession();
        
        if (existingSession) {
          // Check if it's a guest session (skip backend validation)
          if (existingSession.user?.isGuest) {
            setSession(existingSession);
          } else {
            // Validate token with backend for real users
            const isValid = await validateToken();
            if (isValid) {
              setSession(existingSession);
            }
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setLoading(false);
        setAppReady(true);
        if (SplashScreen) {
          try {
            await SplashScreen.hideAsync();
          } catch (e) {
            // Ignore splash screen errors
          }
        }
      }
    };

    prepare();
  }, []);

  // Initialize reminders when user logs in
  useEffect(() => {
    if (session?.user) {
      initializeReminders().catch(err => 
        console.log('Reminder initialization skipped:', err.message)
      );
    }
  }, [session]);

  const handleLogin = async (nextSession = null) => {
    if (nextSession?.user) {
      setSession(nextSession);
      return;
    }

    const newSession = await getSession();
    if (newSession) {
      setSession(newSession);
    }
  };

  if (!appReady || loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>🩹</Text>
          </View>
          <Text style={styles.appName}>DermAssist</Text>
          <Text style={styles.appTagline}>Pressure Ulcer Care Assistant</Text>
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.spinner} />
          <Text style={styles.loadingText}>Initializing...</Text>
        </View>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            {session ? (
              <MainNavigator user={session.user} />
            ) : (
              <AuthNavigator onLogin={handleLogin} />
            )}
          </NavigationContainer>
        </SafeAreaProvider>
      </I18nextProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingCard: {
    alignItems: 'center',
    padding: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
