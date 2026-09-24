'use client';

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ar from '../i18n/ar.json';
import de from '../i18n/de.json';
import en from '../i18n/en.json';
import es from '../i18n/es.json';
import fr from '../i18n/fr.json';
import ja from '../i18n/ja.json';
import ko from '../i18n/ko.json';
import pt from '../i18n/pt.json';
import ru from '../i18n/ru.json';
import zh from '../i18n/zh.json';

/** Languages that require a right-to-left layout. */
const RTL_LANGUAGES = new Set(['ar']);

export function isRtlLanguage(lng: string | undefined): boolean {
  if (!lng) {
    return false;
  }
  return RTL_LANGUAGES.has(lng.split('-')[0]);
}

/**
 * Mirror the active locale onto <html> so the whole page flips to
 * right-to-left when Arabic is selected (and back for every other locale).
 */
function syncDocumentDirection(lng: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.dir = isRtlLanguage(lng) ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
}

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources: {
      ar: { translation: ar },
      de: { translation: de },
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      ja: { translation: ja },
      ko: { translation: ko },
      pt: { translation: pt },
      ru: { translation: ru },
      zh: { translation: zh },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

syncDocumentDirection(i18next.language);
i18next.on('languageChanged', syncDocumentDirection);

export default i18next;
