import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, STORAGE_KEYS } from '../config/api';

const LOCAL_HISTORY_KEY = 'dermassist_local_analysis_history_v1';

// In-memory fallback for Expo Go simulator storage issues
const memoryStorage = {};

const safeGetItem = async (key) => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.log('AsyncStorage failed, using memory fallback');
    return memoryStorage[key] || null;
  }
};

const safeSetItem = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.log('AsyncStorage failed, using memory fallback');
    memoryStorage[key] = value;
  }
};

const getLocalUserKey = (userId) => userId || 'guest';

const loadLocalHistory = async (userId) => {
  const raw = await safeGetItem(LOCAL_HISTORY_KEY);
  const data = raw ? JSON.parse(raw) : {};
  const key = getLocalUserKey(userId);
  const list = Array.isArray(data[key]) ? data[key] : [];
  return { data, key, list };
};

const saveLocalHistory = async (data) => {
  await safeSetItem(LOCAL_HISTORY_KEY, JSON.stringify(data));
};

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
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
};

export const saveAnalysis = async (userId, analysisData) => {
  try {
    const response = await apiCall('/analysis', {
      method: 'POST',
      body: JSON.stringify({
        imageUrl: analysisData.imageUrl,
        patientInfo: analysisData.patientInfo,
        analysisResult: analysisData.analysisResult,
        needsDoctor: analysisData.needsDoctor,
      }),
    });

    return { success: true, data: response.data };
  } catch (error) {
    // Fallback to local storage if API fails
    try {
      const entry = {
        _id: `local_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
        imageUrl: analysisData.imageUrl,
        patientInfo: analysisData.patientInfo,
        analysisResult: analysisData.analysisResult,
        needsDoctor: analysisData.needsDoctor,
      };

      const { data, key, list } = await loadLocalHistory(userId);
      data[key] = [entry, ...list];
      await saveLocalHistory(data);
      return { success: true, data: entry, local: true };
    } catch (localError) {
      console.error('Error saving analysis:', error);
      console.error('Error saving analysis locally:', localError);
      return { success: false, error: error.message };
    }
  }
};

export const getAnalysisHistory = async (userId, limit = 20) => {
  try {
    const response = await apiCall(`/analysis?limit=${limit}`);
    return { success: true, data: response.data };
  } catch (error) {
    // Fallback to local storage if API fails
    try {
      const { list } = await loadLocalHistory(userId);
      const sorted = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { success: true, data: sorted.slice(0, limit), local: true };
    } catch (localError) {
      console.error('Error fetching history:', error);
      console.error('Error fetching history locally:', localError);
      return { success: false, error: error.message };
    }
  }
};

export const getAnalysis = async (analysisId) => {
  try {
    const response = await apiCall(`/analysis/${analysisId}`);
    return { success: true, data: response.data };
  } catch (error) {
    // Fallback to local storage if API fails
    try {
      const userJson = await safeGetItem(STORAGE_KEYS.USER);
      const user = userJson ? JSON.parse(userJson) : null;
      const userId = user?._id;
      const { list } = await loadLocalHistory(userId);
      const found = list.find((x) => x._id === analysisId);
      if (!found) throw new Error('Analysis not found');
      return { success: true, data: found, local: true };
    } catch (localError) {
      console.error('Error fetching analysis:', error);
      console.error('Error fetching analysis locally:', localError);
      return { success: false, error: error.message };
    }
  }
};

export const deleteAnalysis = async (analysisId, userId) => {
  try {
    await apiCall(`/analysis/${analysisId}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    // Fallback to local storage if API fails
    try {
      const { data, key, list } = await loadLocalHistory(userId);
      data[key] = list.filter((x) => x._id !== analysisId);
      await saveLocalHistory(data);
      return { success: true, local: true };
    } catch (localError) {
      console.error('Error deleting analysis:', error);
      console.error('Error deleting analysis locally:', localError);
      return { success: false, error: error.message };
    }
  }
};

export default {
  saveAnalysis,
  getAnalysisHistory,
  getAnalysis,
  deleteAnalysis,
};
