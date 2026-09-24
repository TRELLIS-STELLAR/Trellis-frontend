export interface I18nConfig {
  i18n: {
    defaultLocale: string;
    locales: string[];
  };
  fallbackLng: string;
  interpolation: {
    escapeValue: boolean;
  };
  react: {
    useSuspense: boolean;
  };
}

const i18nConfig: I18nConfig = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'zh', 'ja', 'fr', 'de', 'ar', 'ko', 'pt', 'ru'],
  },
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  react: {
    useSuspense: false, // Disable suspense for server-side rendering
  },
};

export default i18nConfig;