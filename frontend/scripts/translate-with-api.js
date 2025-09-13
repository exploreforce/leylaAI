// Google Translate API Integration
// npm install @google-cloud/translate

const { Translate } = require('@google-cloud/translate').v2;
const fs = require('fs');
const path = require('path');

// WICHTIG: Setze deine Google Cloud API Key
const translate = new Translate({
  key: 'DEIN_GOOGLE_TRANSLATE_API_KEY' // Ersetze durch echten Key
});

const languages = [
  { code: 'ru', google: 'ru' },
  { code: 'es', google: 'es' },
  { code: 'it', google: 'it' },
  { code: 'pl', google: 'pl' },
  { code: 'cs', google: 'cs' },
  // ... weitere Sprachen
];

async function translateWithGoogle() {
  console.log('🤖 Starting Google Translate API translation...');
  
  // Lade deutsche Basis-Texte
  const germanCommon = JSON.parse(
    fs.readFileSync('../public/locales/de/common.json', 'utf8')
  );
  
  for (const lang of languages) {
    console.log(`🔄 Translating to ${lang.code}...`);
    
    try {
      // Beispiel: Übersetze "Speichern" nach Russisch
      const [translation] = await translate.translate('Speichern', lang.google);
      console.log(`✅ "Speichern" → "${translation}" (${lang.code})`);
      
      // Hier würdest du das ganze JSON-Objekt übersetzen...
      
    } catch (error) {
      console.error(`❌ Error translating ${lang.code}:`, error.message);
    }
    
    // Rate limiting - warte zwischen API calls
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Kommentar aus, wenn du API Key hast:
// translateWithGoogle().catch(console.error);

console.log('💡 To use Google Translate:');
console.log('1. Get API key from Google Cloud Console');
console.log('2. npm install @google-cloud/translate');  
console.log('3. Replace DEIN_GOOGLE_TRANSLATE_API_KEY with real key');
console.log('4. Uncomment the last line and run script');

