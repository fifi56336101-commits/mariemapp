import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { getLocales } from 'expo-localization';

import en from './en.json';
import fr from './fr.json';
import es from './es.json';
import ar from './ar.json';

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
  ar: { translation: ar },
};

// Get device language or default to 'en'
const deviceLanguage = getLocales()[0]?.languageCode || 'en';

// Map device language to supported languages
const getSupportedLanguage = (lang) => {
  const supportedLanguages = ['en', 'fr', 'es', 'ar'];
  const baseLang = lang?.split('-')[0]?.toLowerCase();
  return supportedLanguages.includes(baseLang) ? baseLang : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getSupportedLanguage(deviceLanguage),
    fallbackLng: 'en',
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export const changeLanguage = async (lang) => {
  await i18n.changeLanguage(lang);
};

export const getCurrentLanguage = () => {
  return i18n.language;
};

export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', isRTL: true },
];

export default i18n;
