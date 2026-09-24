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

export default i18next;
