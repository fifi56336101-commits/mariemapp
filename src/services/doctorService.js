import AsyncStorage from '@react-native-async-storage/async-storage';

const DOCTOR_STORAGE_KEY = '@dermassist_doctor';

// In-memory fallback when AsyncStorage fails
let memoryFallback = {
  doctor: null,
  available: false,
};

// Check if AsyncStorage is working
const isAsyncStorageAvailable = async () => {
  if (memoryFallback.available) return false; // Already determined to use fallback
  try {
    await AsyncStorage.getItem('test');
    return true;
  } catch (error) {
    console.log('Doctor storage: using memory fallback');
    memoryFallback.available = true;
    return false;
  }
};

export const saveDoctor = async (doctorInfo) => {
  try {
    const available = await isAsyncStorageAvailable();
    if (!available) {
      memoryFallback.doctor = doctorInfo;
      return { success: true };
    }
    await AsyncStorage.setItem(DOCTOR_STORAGE_KEY, JSON.stringify(doctorInfo));
    return { success: true };
  } catch (error) {
    console.error('Error saving doctor info:', error);
    // Fallback to memory
    memoryFallback.doctor = doctorInfo;
    memoryFallback.available = true;
    return { success: true };
  }
};

export const getDoctor = async () => {
  try {
    const available = await isAsyncStorageAvailable();
    if (!available) {
      return memoryFallback.doctor;
    }
    const doctorData = await AsyncStorage.getItem(DOCTOR_STORAGE_KEY);
    return doctorData ? JSON.parse(doctorData) : null;
  } catch (error) {
    console.error('Error getting doctor info:', error);
    // Fallback to memory
    return memoryFallback.doctor;
  }
};

export const deleteDoctor = async () => {
  try {
    const available = await isAsyncStorageAvailable();
    if (!available) {
      memoryFallback.doctor = null;
      return { success: true };
    }
    await AsyncStorage.removeItem(DOCTOR_STORAGE_KEY);
    return { success: true };
  } catch (error) {
    console.error('Error deleting doctor info:', error);
    // Fallback to memory
    memoryFallback.doctor = null;
    memoryFallback.available = true;
    return { success: true };
  }
};

export const formatDoctorName = (doctor) => {
  if (!doctor) return null;
  const { firstName, lastName, title } = doctor;
  let name = '';
  if (title) name += title + ' ';
  if (firstName) name += firstName + ' ';
  if (lastName) name += lastName;
  return name.trim() || 'Doctor';
};

export const formatAnalysisForDoctor = (analysis, patientInfo, imageUri) => {
  const parsed = analysis || {};
  
  let message = `🏥 DermAssist Wound Analysis Report\n`;
  message += `═══════════════════════════════════\n\n`;
  
  message += `📅 Date: ${new Date().toLocaleDateString()}\n`;
  message += `⏰ Time: ${new Date().toLocaleTimeString()}\n\n`;
  
  if (patientInfo) {
    message += `👤 PATIENT INFORMATION:\n`;
    if (patientInfo.age) message += `   Age: ${patientInfo.age}\n`;
    if (patientInfo.diseases?.length) message += `   Conditions: ${patientInfo.diseases.join(', ')}\n`;
    if (patientInfo.woundLocation) message += `   Wound Location: ${patientInfo.woundLocation}\n`;
    if (patientInfo.duration) message += `   Duration: ${patientInfo.duration}\n`;
    if (patientInfo.painLevel) message += `   Pain Level: ${patientInfo.painLevel}/10\n`;
    if (patientInfo.symptoms?.length) message += `   Symptoms: ${patientInfo.symptoms.join(', ')}\n`;
    message += `\n`;
  }
  
  message += `🔬 CLINICAL ASSESSMENT:\n`;
  message += `───────────────────────────────\n`;
  
  if (parsed.urgency) {
    const urgencyEmoji = parsed.urgency === 'CRITICAL' ? '🔴' : 
                         parsed.urgency === 'HIGH' ? '🟠' : 
                         parsed.urgency === 'MEDIUM' ? '🟡' : '🟢';
    message += `${urgencyEmoji} Urgency: ${parsed.urgency}\n`;
  }
  
  if (parsed.woundType) message += `📋 Wound Type: ${parsed.woundType}\n`;
  if (parsed.etiology) message += `病因 Etiology: ${parsed.etiology}\n`;
  if (parsed.location) message += `📍 Location: ${parsed.location}\n`;
  if (parsed.stage) message += `🎯 NPIAP Stage: ${parsed.stage}\n`;
  
  message += `\n`;
  
  if (parsed.measurements) {
    message += `📐 MEASUREMENTS:\n`;
    message += `${parsed.measurements}\n\n`;
  }
  
  if (parsed.woundBed) {
    message += `🔍 WOUND BED:\n`;
    message += `${parsed.woundBed}\n\n`;
  }
  
  if (parsed.exudate) {
    message += `💧 EXUDATE:\n`;
    message += `${parsed.exudate}\n\n`;
  }
  
  if (parsed.infectionRisk) {
    message += `🦠 INFECTION RISK: ${parsed.infectionRisk}\n`;
    if (parsed.infectionIndicators) {
      message += `${parsed.infectionIndicators}\n`;
    }
    message += `\n`;
  }
  
  if (parsed.healingTrajectory || parsed.healingStatus) {
    message += `📈 HEALING STATUS:\n`;
    message += `${parsed.healingTrajectory || parsed.healingStatus}\n\n`;
  }
  
  if (parsed.treatmentPlan || parsed.recommendations) {
    message += `💊 TREATMENT RECOMMENDATIONS:\n`;
    message += `${parsed.treatmentPlan || parsed.recommendations}\n\n`;
  }
  
  if (parsed.referralRecommendations) {
    message += `🏥 REFERRAL NEEDED:\n`;
    message += `${parsed.referralRecommendations}\n\n`;
  }
  
  if (parsed.patientEducation) {
    message += `⚠️ PATIENT EDUCATION:\n`;
    message += `${parsed.patientEducation}\n\n`;
  }
  
  message += `═══════════════════════════════════\n`;
  message += `⚠️ This AI analysis is for clinical decision support only.\n`;
  message += `Generated by DermAssist - Wound Care AI Assistant\n`;
  
  return message;
};

export default {
  saveDoctor,
  getDoctor,
  deleteDoctor,
  formatDoctorName,
  formatAnalysisForDoctor,
};
