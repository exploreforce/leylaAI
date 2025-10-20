const fs = require('fs');
const path = require('path');

// Sprachen die übersetzt werden sollen
const languages = [
  { code: 'ru', name: 'Russian' },
  { code: 'pl', name: 'Polish' },
  { code: 'cs', name: 'Czech' },
  { code: 'sk', name: 'Slovak' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'ro', name: 'Romanian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'sr', name: 'Serbian' },
  { code: 'hr', name: 'Croatian' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'bs', name: 'Bosnian' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'sq', name: 'Albanian' },
  { code: 'lv', name: 'Latvian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'et', name: 'Estonian' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'be', name: 'Belarusian' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'el', name: 'Greek' },
  { code: 'th', name: 'Thai' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'vi', name: 'Vietnamese' }
];

const localesDir = path.join(__dirname, '../public/locales');
const namespaces = ['common', 'dashboard', 'settings', 'chat', 'calendar', 'admin'];

// Manuell definierte Übersetzungen für wichtige Begriffe
const manualTranslations = {
  // Dashboard titles
  'Leyla AI Dashboard': {
    ru: 'Панель управления Leyla AI',
    pl: 'Panel Leyla AI',
    cs: 'Řídicí panel Leyla AI',
    es: 'Panel de Leyla AI',
    it: 'Dashboard di Leyla AI',
    fr: 'Tableau de bord Leyla AI',
    // Weitere können hinzugefügt werden...
  },
  
  // Common terms
  'Settings': {
    ru: 'Настройки',
    pl: 'Ustawienia', 
    cs: 'Nastavení',
    es: 'Configuración',
    it: 'Impostazioni',
    // ...
  },
  
  'Save': {
    ru: 'Сохранить',
    pl: 'Zapisz',
    cs: 'Uložit',
    es: 'Guardar',
    it: 'Salva',
    // ...
  }
};

function translateText(text, targetLang) {
  // 1. Erst schauen ob manuelle Übersetzung existiert
  if (manualTranslations[text] && manualTranslations[text][targetLang]) {
    return manualTranslations[text][targetLang];
  }
  
  // 2. Fallback: Englischen Text zurückgeben (kann später durch API ersetzt werden)
  return text;
}

function translateObject(obj, targetLang) {
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = translateText(value, targetLang);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = translateObject(value, targetLang);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

async function generateTranslations() {
  console.log('🌍 Starting translation generation...');
  
  // Lade deutsche Basis-Übersetzungen
  const baseTranslations = {};
  for (const ns of namespaces) {
    try {
      const filePath = path.join(localesDir, 'de', `${ns}.json`);
      baseTranslations[ns] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`✅ Loaded German ${ns}.json`);
    } catch (error) {
      console.error(`❌ Failed to load German ${ns}.json:`, error.message);
    }
  }
  
  // Generiere Übersetzungen für jede Sprache
  for (const lang of languages) {
    console.log(`\n🔄 Processing ${lang.name} (${lang.code})...`);
    
    const langDir = path.join(localesDir, lang.code);
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }
    
    for (const ns of namespaces) {
      try {
        const translatedContent = translateObject(baseTranslations[ns], lang.code);
        const outputPath = path.join(langDir, `${ns}.json`);
        
        fs.writeFileSync(outputPath, JSON.stringify(translatedContent, null, 2), 'utf8');
        console.log(`   ✅ Generated ${lang.code}/${ns}.json`);
      } catch (error) {
        console.error(`   ❌ Failed to generate ${lang.code}/${ns}.json:`, error.message);
      }
    }
  }
  
  console.log('\n🎉 Translation generation completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Review generated files in public/locales/');
  console.log('2. Add more manual translations to manualTranslations object');
  console.log('3. Optionally integrate with translation API (Google Translate, DeepL)');
}

// Führe Script aus
generateTranslations().catch(console.error);
