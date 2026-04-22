import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, STORAGE_KEYS } from '../config/api';

// In-memory fallback for Expo Go simulator storage issues
const memoryStorage = {};

// In-memory session (authoritative when storage is broken)
let inMemorySession = null;

export const setInMemorySession = (session) => {
  inMemorySession = session;
};

export const clearInMemorySession = () => {
  inMemorySession = null;
};

export const getInMemorySession = () => inMemorySession;

let didLogStorageFallback = false;

const logStorageFallbackOnce = () => {
  if (didLogStorageFallback) return;
  didLogStorageFallback = true;
  console.log('AsyncStorage failed, using memory fallback');
};

const safeGetItem = async (key) => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    logStorageFallbackOnce();
    return memoryStorage[key] || null;
  }
};

const safeSetItem = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    logStorageFallbackOnce();
    memoryStorage[key] = value;
  }
};

const safeRemoveItem = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    logStorageFallbackOnce();
    delete memoryStorage[key];
  }
};

const safeMultiRemove = async (keys) => {
  try {
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    logStorageFallbackOnce();
    keys.forEach(key => delete memoryStorage[key]);
  }
};

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  try {
    const token = await safeGetItem(STORAGE_KEYS.AUTH_TOKEN);
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Guest login - works without backend
export const guestLogin = async () => {
  try {
    const guestUser = {
      _id: 'guest_' + Date.now(),
      email: 'guest@dermassist.local',
      name: 'Guest User',
      isGuest: true,
      createdAt: new Date().toISOString(),
    };

    const session = {
      token: 'guest_token_' + Date.now(),
      user: guestUser,
    };

    // Always set in-memory session so demo works even if AsyncStorage is broken.
    setInMemorySession(session);

    // Best-effort persistence
    await safeSetItem(STORAGE_KEYS.USER, JSON.stringify(guestUser));
    await safeSetItem(STORAGE_KEYS.AUTH_TOKEN, session.token);

    return { success: true, data: session };
  } catch (error) {
    console.error('Guest login error:', error);
    return { success: false, error: error.message };
  }
};

export const signUp = async (email, password) => {
  try {
    const response = await apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success) {
      await safeSetItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
      await safeSetItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));

      // Keep in-memory session in sync
      setInMemorySession({ token: response.data.token, user: response.data.user });
    }

    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const signIn = async (email, password) => {
  try {
    const response = await apiCall('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success) {
      await safeSetItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
      await safeSetItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));
    }

    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const signOut = async () => {
  try {
    await apiCall('/auth/signout', { method: 'POST' });
    await safeMultiRemove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.USER]);
    clearInMemorySession();
    return { success: true };
  } catch (error) {
    // Still clear local storage even if API call fails
    await safeMultiRemove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.USER]);
    clearInMemorySession();
    return { success: true };
  }
};

export const getCurrentUser = async () => {
  try {
    const userJson = await safeGetItem(STORAGE_KEYS.USER);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    return null;
  }
};

export const getSession = async () => {
  try {
    // Prefer in-memory session (especially for Expo Go simulator where storage can be broken)
    if (inMemorySession?.user) {
      return inMemorySession;
    }

    const userJson = await safeGetItem(STORAGE_KEYS.USER);
    const user = userJson ? JSON.parse(userJson) : null;
    
    if (!user) return null;
    
    const token = await safeGetItem(STORAGE_KEYS.AUTH_TOKEN);
    
    // For guest users, just return the session without token validation
    if (user.isGuest) {
      return {
        token: token || 'guest',
        user,
      };
    }
    
    // For real users, require both token and user
    if (!token) return null;
    
    return {
      token,
      user,
    };
  } catch (error) {
    // Avoid noisy logs for known simulator storage bug.
    return null;
  }
};

export const validateToken = async () => {
  try {
    const response = await apiCall('/auth/me');
    return response.success;
  } catch (error) {
    // Token is invalid, clear storage
    await safeMultiRemove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.USER]);
    return false;
  }
};

export default {
  guestLogin,
  setInMemorySession,
  getInMemorySession,
  clearInMemorySession,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getSession,
  validateToken,
};
