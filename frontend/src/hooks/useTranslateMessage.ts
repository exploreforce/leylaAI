import { useState, useCallback } from 'react';

interface TranslationResult {
  text: string;
  from: string;
  to: string;
}

interface UseTranslateMessageReturn {
  translateMessage: (text: string, targetLanguage: string) => Promise<TranslationResult>;
  isTranslating: boolean;
  error: string | null;
}

/**
 * Hook for client-side message translation using MyMemory Translator API
 * Completely browser-compatible, no external libraries needed
 */
export const useTranslateMessage = (): UseTranslateMessageReturn => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple language detection based on common patterns
  const detectLanguage = (text: string): string => {
    const lowerText = text.toLowerCase();
    
    // German patterns - most distinctive German words
    if (/\b(der|die|das|und|ich|du|ist|sind|haben|sein|mit|für|von|zu|bei|nach|über|aber|oder|wenn|dass|können|müssen|soll|während|wegen)\b/.test(lowerText)) {
      return 'de';
    }
    
    // English patterns - common English words
    if (/\b(the|and|you|that|was|for|are|with|his|they|this|have|from|they|she|been|than|what|were|said|each|which|their|time|will|about|would|there|could|other|more|very|after|first|well|water|been|call|who|oil|find|long|down|way|many|then|them|these|look|two|more|write|go|see|number|no|way|could|people|my|than|first|water|been|call|who|find|long|down|way|many|then|them|these|look|two)\b/.test(lowerText)) {
      return 'en';
    }
    
    // Spanish patterns
    if (/\b(el|la|de|que|y|es|en|un|te|lo|le|da|su|por|son|con|para|al|todo|ha|era|si|cuando|muy|sin|sobre|también|me|hasta|hay|donde|están|todos|durante|puede|hace|cada|ese|esa|esto|antes|gran|dos|manera|bien|aquí|después|tiempo|año|día|entre|vida|tres|casa|sino|agua|vez|casi|sus)\b/.test(lowerText)) {
      return 'es';
    }
    
    // French patterns
    if (/\b(le|de|et|à|un|il|être|en|avoir|que|pour|dans|ce|son|une|sur|avec|ne|se|pas|tout|plus|pouvoir|par|je|tu|mais|vous|va|dire|cette|faire|ses|nouveau|elle|peut|ces|comment|sans|grand|après|si|bien|notre|me|même|te|temps|très|ni|jour|encore|savoir|année|mon|selon|là|pendant|contre|pourquoi|des|lui|nous|comme|autre|tous|quel|donc|soit|cas|moins|plusieurs|celle|depuis|place|déjà|ici|ceux|tant|semaine|dont)\b/.test(lowerText)) {
      return 'fr';
    }
    
    // Italian patterns
    if (/\b(il|di|che|e|la|per|in|un|è|si|lo|mi|ha|ti|le|da|su|del|sono|me|questo|una|lui|lei|ci|anche|quando|dove|cosa|come|fare|bene|essere|suo|molto|tutto|grande|tanto|cui|quella|contro|tra|sopra|sotto|con|senza|dopo|prima|durante|alcuni|tutti|ogni|altro|stesso|qui|quello|questa|questi|quale|quanto|poco|meno|più|ancora|già|mai|sempre|niente|nessuno|qualcosa|qualcuno|così|mentre|perché|siccome|benché|sebbene)\b/.test(lowerText)) {
      return 'it';
    }
    
    // Default to English if not detected
    return 'en';
  };

  const translateMessage = useCallback(async (text: string, targetLanguage: string): Promise<TranslationResult> => {
    setIsTranslating(true);
    setError(null);

    try {
      // Skip translation if text is empty or too short
      if (!text || text.trim().length < 2) {
        return {
          text,
          from: 'unknown',
          to: targetLanguage
        };
      }

      // Detect source language
      const sourceLanguage = detectLanguage(text);
      
      // Skip translation if source and target are the same
      if (sourceLanguage === targetLanguage) {
        return {
          text,
          from: sourceLanguage,
          to: targetLanguage
        };
      }

      console.log('🌍 Translating message:', {
        originalText: text.substring(0, 50) + '...',
        sourceLanguage,
        targetLanguage
      });

      // Using MyMemory Translator API (free, browser-compatible)
      const encodedText = encodeURIComponent(text);
      const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${sourceLanguage}|${targetLanguage}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.responseStatus !== 200 && data.responseStatus !== "200") {
        throw new Error(data.responseDetails || 'Translation failed');
      }

      const translatedText = data.responseData.translatedText;
      
      console.log('✅ Translation result:', {
        originalText: text.substring(0, 30) + '...',
        translatedText: translatedText.substring(0, 30) + '...',
        from: sourceLanguage,
        to: targetLanguage
      });

      return {
        text: translatedText,
        from: sourceLanguage,
        to: targetLanguage
      };

    } catch (err) {
      console.error('❌ Translation failed:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
      
      // Return original text if translation fails
      return {
        text,
        from: 'unknown', 
        to: targetLanguage
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  return {
    translateMessage,
    isTranslating,
    error
  };
};

// Language code mappings for common language names to ISO codes
// Matches ALL languages from database + AI detection system
export const LANGUAGE_CODES = {
  // Core Languages
  'de': 'de',      // German
  'en': 'en',      // English  
  
  // Eastern European Languages (from database)
  'ru': 'ru',      // Russian
  'pl': 'pl',      // Polish
  'cs': 'cs',      // Czech
  'sk': 'sk',      // Slovak
  'hu': 'hu',      // Hungarian
  'ro': 'ro',      // Romanian
  'bg': 'bg',      // Bulgarian
  'sr': 'sr',      // Serbian
  'hr': 'hr',      // Croatian
  'sl': 'sl',      // Slovenian
  'bs': 'bs',      // Bosnian
  'mk': 'mk',      // Macedonian
  'sq': 'sq',      // Albanian
  'lv': 'lv',      // Latvian
  'lt': 'lt',      // Lithuanian
  'et': 'et',      // Estonian
  'uk': 'uk',      // Ukrainian
  'be': 'be',      // Belarusian
  
  // Western & Southern European Languages
  'es': 'es',      // Spanish
  'it': 'it',      // Italian
  'fr': 'fr',      // French
  'pt': 'pt',      // Portuguese
  'nl': 'nl',      // Dutch
  'el': 'el',      // Greek
  
  // Asian Languages
  'th': 'th',      // Thai
  'tl': 'tl',      // Tagalog/Filipino
  'vi': 'vi',      // Vietnamese
  'zh': 'zh',      // Chinese
  'ja': 'ja',      // Japanese
  'ko': 'ko',      // Korean
  'hi': 'hi',      // Hindi
  
  // Middle Eastern & Other
  'tr': 'tr',      // Turkish
  'ar': 'ar',      // Arabic
} as const;
