'use client';

import { ReactNode, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { useFetch } from '@/hooks/useApi';
import { botApi } from '@/utils/api';

// Supported languages (matching our database + popular additions)
const supportedLanguages = [
  // Core Languages
  'de', 'en',
  // Eastern European Languages
  'ru', 'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'sr', 'hr', 'sl', 
  'bs', 'mk', 'sq', 'lv', 'lt', 'et', 'uk', 'be',
  // Western & Southern European Languages
  'es', 'it', 'fr', 'pt', 'nl', 'el',
  // Asian Languages
  'th', 'tl', 'vi', 'zh', 'ja', 'ko', 'hi',
  // Middle Eastern & Other
  'tr', 'ar'
];

// Dynamic resource loader
const loadTranslationResources = async () => {
  const resources: any = {};

  // Load core languages first (German and English)
  const coreLanguages = ['de', 'en'];
  
  for (const lang of coreLanguages) {
    resources[lang] = {};
    try {
      const base = `/locales/${lang}`;
      const [common, dashboard, settings, chat, calendar] = await Promise.all([
        fetch(`${base}/common.json`).then(r => r.json()),
        fetch(`${base}/dashboard.json`).then(r => r.json()),
        fetch(`${base}/settings.json`).then(r => r.json()),
        fetch(`${base}/chat.json`).then(r => r.json()),
        fetch(`${base}/calendar.json`).then(r => r.json()),
      ]);
      resources[lang] = { common, dashboard, settings, chat, calendar };
    } catch (error) {
      console.error(`Failed to load core translations for ${lang}:`, error);
    }
  }

  // Load other languages asynchronously
  for (const lang of supportedLanguages) {
    if (!coreLanguages.includes(lang)) {
      try {
        const base = `/locales/${lang}`;
        const [common, dashboard, settings, chat, calendar] = await Promise.all([
          fetch(`${base}/common.json`).then(r => r.json()),
          fetch(`${base}/dashboard.json`).then(r => r.json()),
          fetch(`${base}/settings.json`).then(r => r.json()),
          fetch(`${base}/chat.json`).then(r => r.json()),
          fetch(`${base}/calendar.json`).then(r => r.json()),
        ]);
        resources[lang] = { common, dashboard, settings, chat, calendar };
      } catch (error) {
        console.warn(`Failed to load translations for ${lang}, using fallback:`, error);
        resources[lang] = resources['en'];
      }
    }
  }

  return resources;
};

// Initialize i18n
const initI18n = async () => {
  if (i18n.isInitialized) {
    return;
  }

  const resources = await loadTranslationResources();

  i18n
    .use(initReactI18next)
    .init({
      fallbackLng: 'de',
      lng: 'de',
      debug: process.env.NODE_ENV === 'development',
      
      interpolation: {
        escapeValue: false,
      },
      
      resources,
      
      defaultNS: 'common',
      ns: ['common', 'dashboard', 'settings', 'chat', 'calendar'],
    });
};

interface DynamicTranslationProviderProps {
  children: ReactNode;
}

export const DynamicTranslationProvider = ({ children }: DynamicTranslationProviderProps) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<string>('de');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Fetch current language from backend
  const { data: languageData, refetch } = useFetch(
    () => botApi.getCurrentLanguage(),
    [refreshTrigger], // Re-run when refresh is triggered
    {
      onSuccess: (data) => {
        if (data?.data?.language_code && data.data.language_code !== currentLanguage) {
          console.log(`🔄 Language updated from backend: ${currentLanguage} → ${data.data.language_code}`);
          setCurrentLanguage(data.data.language_code);
        }
      }
    }
  );

  // Initialize i18n
  useEffect(() => {
    initI18n().then(() => {
      setIsInitialized(true);
    }).catch((error) => {
      console.error('Failed to initialize i18n:', error);
      setIsInitialized(true); // Still render, might work with fallbacks
    });
  }, []);

  // Update i18n language when current language changes
  useEffect(() => {
    if (isInitialized && i18n.isInitialized && currentLanguage !== i18n.language) {
      console.log(`🌍 Changing UI language from ${i18n.language} to ${currentLanguage}`);
      i18n.changeLanguage(currentLanguage).then(() => {
        console.log(`✅ Language changed to ${currentLanguage}`);
        // Force a re-render by dispatching a custom event
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: currentLanguage }));
      });
    }
  }, [currentLanguage, isInitialized]);

  // Set initial language from backend data
  useEffect(() => {
    if (languageData?.data?.language_code) {
      setCurrentLanguage(languageData.data.language_code);
    }
  }, [languageData]);

  // Listen for manual language refresh events
  useEffect(() => {
    const handleLanguageRefresh = () => {
      console.log('🔄 Manual language refresh triggered');
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('refreshLanguage', handleLanguageRefresh);
    return () => window.removeEventListener('refreshLanguage', handleLanguageRefresh);
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-elysPink-600"></div>
        <span className="ml-2 text-dark-200">Loading translations...</span>
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18n} key={currentLanguage}>
      {children}
    </I18nextProvider>
  );
};
