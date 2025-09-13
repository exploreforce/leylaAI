exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('language_settings').del();
  
  // Insert language options
  await knex('language_settings').insert([
    // Osteuropäische Sprachen
    { language_code: 'ru', language_name: 'Русский (Russian)', is_default: false },
    { language_code: 'pl', language_name: 'Polski (Polish)', is_default: false },
    { language_code: 'cs', language_name: 'Čeština (Czech)', is_default: false },
    { language_code: 'sk', language_name: 'Slovenčina (Slovak)', is_default: false },
    { language_code: 'hu', language_name: 'Magyar (Hungarian)', is_default: false },
    { language_code: 'ro', language_name: 'Română (Romanian)', is_default: false },
    { language_code: 'bg', language_name: 'български език (Bulgarian)', is_default: false },
    { language_code: 'sr', language_name: 'српски језик (Serbian)', is_default: false },
    { language_code: 'hr', language_name: 'Hrvatski (Croatian)', is_default: false },
    { language_code: 'sl', language_name: 'Slovenski (Slovenian)', is_default: false },
    { language_code: 'bs', language_name: 'Bosanski (Bosnian)', is_default: false },
    { language_code: 'mk', language_name: 'македонски јазик (Macedonian)', is_default: false },
    { language_code: 'sq', language_name: 'Shqip (Albanian)', is_default: false },
    { language_code: 'lv', language_name: 'Latviešu (Latvian)', is_default: false },
    { language_code: 'lt', language_name: 'Lietuvių (Lithuanian)', is_default: false },
    { language_code: 'et', language_name: 'Eesti (Estonian)', is_default: false },
    { language_code: 'uk', language_name: 'українська (Ukrainian)', is_default: false },
    { language_code: 'be', language_name: 'беларуская (Belarusian)', is_default: false },
    
    // Andere gewünschte Sprachen
    { language_code: 'es', language_name: 'Español (Spanish)', is_default: false },
    { language_code: 'it', language_name: 'Italiano (Italian)', is_default: false },
    { language_code: 'fr', language_name: 'Français (French)', is_default: false },
    { language_code: 'pt', language_name: 'Português (Portuguese)', is_default: false },
    { language_code: 'nl', language_name: 'Nederlands (Dutch)', is_default: false },
    { language_code: 'el', language_name: 'Ελληνικά (Greek)', is_default: false },
    { language_code: 'th', language_name: 'ไทย (Thai)', is_default: false },
    { language_code: 'tl', language_name: 'Filipino (Tagalog)', is_default: false },
    { language_code: 'vi', language_name: 'Tiếng Việt (Vietnamese)', is_default: false },
    
    // Popular Global Languages
    { language_code: 'tr', language_name: 'Türkçe (Turkish)', is_default: false },
    { language_code: 'ar', language_name: 'العربية (Arabic)', is_default: false },
    { language_code: 'zh', language_name: '中文 (Chinese)', is_default: false },
    { language_code: 'ja', language_name: '日本語 (Japanese)', is_default: false },
    { language_code: 'ko', language_name: '한국어 (Korean)', is_default: false },
    { language_code: 'hi', language_name: 'हिन्दी (Hindi)', is_default: false },
    
    // Standard Sprachen
    { language_code: 'de', language_name: 'Deutsch (German)', is_default: true },
    { language_code: 'en', language_name: 'English', is_default: false },
  ]);
};

