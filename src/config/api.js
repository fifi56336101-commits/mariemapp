// API Configuration
// Change this to your server URL when running on a real device
// For local development with Expo, use your machine's IP address
// For Android emulator: http://10.0.2.2:5000
// For iOS simulator: http://localhost:5000

import Constants from 'expo-constants';

const getApiUrl = () => {
  // Check if running in Expo Go or development
  if (__DEV__) {
    // Prefer the Expo host IP (works on real devices + simulators on the same network)
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.experienceUrl ||
      Constants.manifest?.debuggerHost ||
      Constants.manifest2?.extra?.expoGo?.debuggerHost;

    const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : null;

    if (host) {
      return `http://${host}:5000/api`;
    }

    // Fallback: iOS Simulator only
    return 'http://localhost:5000/api';
  }
  // Production URL - will be updated after deployment
  return 'https://your-production-api.com/api';
};

export const API_URL = getApiUrl();

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'dermassist_auth_token',
  USER: 'dermassist_user',
};

export default { API_URL, STORAGE_KEYS };
