module.exports = {
  i18n: {
    defaultLocale: 'de',
    locales: [
      'de', 'en', 
      // Osteuropäische Sprachen
      'ru', 'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'sr', 'hr', 'sl', 'bs', 'mk', 'sq', 'lv', 'lt', 'et', 'uk', 'be',
      // Weitere Sprachen
      'es', 'it', 'el', 'th', 'tl', 'vi'
    ],
  },
  defaultNS: 'common',
  fallbackLng: 'de',
  debug: process.env.NODE_ENV === 'development',
  reloadOnPrerender: process.env.NODE_ENV === 'development',
  
  // Namespace-Konfiguration
  ns: ['common', 'dashboard', 'settings', 'calendar', 'chat', 'navigation'],
  
  // Interpolation-Optionen
  interpolation: {
    escapeValue: false, // React already escapes values
  },
};

