'use client';

import { ReactNode, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Supported languages - all available translations
export const supportedLanguages = [
  // Core Languages
  'de', 'en',
  // Eastern European Languages
  'ru', 'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'sr', 'hr', 'sl', 
  'bs', 'mk', 'sq', 'lv', 'lt', 'et', 'uk', 'be',
  // Western & Southern European Languages
  'es', 'it', 'fr', 'pt', 'nl', 'el',
  // Asian Languages
  'th', 'tl', 'vi',
  // Middle Eastern & Other
  'tr'
];

// Lazy load a language's translations
const loadLanguageResources = async (lang: string) => {
  try {
    const base = `/locales/${lang}`;
    const [common, dashboard, settings, chat, calendar, admin] = await Promise.all([
      fetch(`${base}/common.json`).then(r => r.json()),
      fetch(`${base}/dashboard.json`).then(r => r.json()),
      fetch(`${base}/settings.json`).then(r => r.json()),
      fetch(`${base}/chat.json`).then(r => r.json()),
      fetch(`${base}/calendar.json`).then(r => r.json()),
      fetch(`${base}/admin.json`).then(r => r.json()),
    ]);
    return { common, dashboard, settings, chat, calendar, admin };
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
    throw error;
  }
};

// Load only the default language initially (German)
const loadInitialResources = async () => {
  const defaultLang = 'de';
  const resources: any = {};
  
  try {
    console.log(`🌍 Loading initial language: ${defaultLang}`);
    resources[defaultLang] = await loadLanguageResources(defaultLang);
    console.log(`✅ Initial language loaded: ${defaultLang}`);
  } catch (error) {
    console.error('Failed to load initial language, app may not work correctly');
  }

  return resources;
};

// Initialize i18n with only German
const initI18n = async () => {
  if (i18n.isInitialized) {
    return;
  }

  // Get user's preferred language from localStorage, default to 'de'
  const preferredLanguage = localStorage.getItem('preferredLanguage') || 'de';
  
  const resources = await loadInitialResources();

  i18n
    .use(initReactI18next)
    .init({
      fallbackLng: 'de',
      lng: preferredLanguage,
      debug: false,
      
      interpolation: {
        escapeValue: false,
      },
      
      resources,
      
      defaultNS: 'common',
      ns: ['common', 'dashboard', 'settings', 'chat', 'calendar', 'admin'],
    });

  console.log(`🌍 i18n initialized with language: ${preferredLanguage}`);
};

interface DynamicTranslationProviderProps {
  children: ReactNode;
}

export const DynamicTranslationProvider = ({ children }: DynamicTranslationProviderProps) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<string>(
    typeof window !== 'undefined' ? (localStorage.getItem('preferredLanguage') || 'de') : 'de'
  );
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  // Initialize i18n on mount
  useEffect(() => {
    initI18n().then(() => {
      setIsInitialized(true);
      console.log('✅ i18n initialized');
    }).catch((error) => {
      console.error('Failed to initialize i18n:', error);
      setIsInitialized(true); // Still render, might work with fallbacks
    });
  }, []);

  // Lazy load and change language
  const changeLanguage = async (newLang: string) => {
    if (!i18n.isInitialized || newLang === currentLanguage) {
      return;
    }

    setIsChangingLanguage(true);
    console.log(`🌍 Changing language to: ${newLang}`);

    try {
      // Check if language is already loaded
      if (!i18n.hasResourceBundle(newLang, 'common')) {
        console.log(`📦 Lazy loading translations for: ${newLang}`);
        const resources = await loadLanguageResources(newLang);
        
        // Add resources to i18n
        Object.keys(resources).forEach((ns) => {
          i18n.addResourceBundle(newLang, ns, resources[ns as keyof typeof resources], true, true);
        });
        
        console.log(`✅ Translations loaded for: ${newLang}`);
      }

      // Change language
      await i18n.changeLanguage(newLang);
      setCurrentLanguage(newLang);
      
      // Save to localStorage
      localStorage.setItem('preferredLanguage', newLang);
      
      console.log(`✅ Language changed to: ${newLang}`);
    } catch (error) {
      console.error(`Failed to change language to ${newLang}:`, error);
      // Fallback to German if loading fails
      await i18n.changeLanguage('de');
    } finally {
      setIsChangingLanguage(false);
    }
  };

  // Listen for language change events
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent<string>) => {
      const newLang = event.detail;
      if (newLang && newLang !== currentLanguage) {
        changeLanguage(newLang);
      }
    };

    window.addEventListener('changeLanguage', handleLanguageChange as EventListener);
    return () => window.removeEventListener('changeLanguage', handleLanguageChange as EventListener);
  }, [currentLanguage]);

  // Always render I18nextProvider - show loading state inside it
  return (
    <I18nextProvider i18n={i18n}>
      {!isInitialized ? (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-elysPink-600 mx-auto mb-4"></div>
            <p className="text-dark-300">Loading translations...</p>
          </div>
        </div>
      ) : (
        <>
          {isChangingLanguage && (
            <div className="fixed top-4 right-4 z-50 bg-dark-700 text-dark-50 px-4 py-2 rounded-lg shadow-lg border border-dark-600 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-elysPink-600"></div>
              <span className="text-sm">Loading language...</span>
            </div>
          )}
          {children}
        </>
      )}
    </I18nextProvider>
  );
};
