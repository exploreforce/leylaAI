// Prioritäts-Sprachen für schrittweise Übersetzung
const fs = require('fs');
const path = require('path');

// Definiere Prioritäten basierend auf Zielgruppe
const priorityLanguages = {
  // TIER 1: Höchste Priorität (Westeuropa + wichtige Märkte)
  tier1: [
    { code: 'es', name: 'Español', market: 'Spain + Latin America' },
    { code: 'it', name: 'Italiano', market: 'Italy' },
    { code: 'ru', name: 'Русский', market: 'Russia + CIS' }
  ],
  
  // TIER 2: Osteuropäische EU-Länder  
  tier2: [
    { code: 'pl', name: 'Polski', market: 'Poland' },
    { code: 'cs', name: 'Čeština', market: 'Czech Republic' },
    { code: 'hu', name: 'Magyar', market: 'Hungary' },
    { code: 'ro', name: 'Română', market: 'Romania' }
  ],
  
  // TIER 3: Balkaneske Länder
  tier3: [
    { code: 'hr', name: 'Hrvatski', market: 'Croatia' },
    { code: 'sr', name: 'Српски', market: 'Serbia' },
    { code: 'bg', name: 'Български', market: 'Bulgaria' },
    { code: 'sl', name: 'Slovenščina', market: 'Slovenia' }
  ],
  
  // TIER 4: Baltikum + Rest Osteuropa
  tier4: [
    { code: 'lv', name: 'Latviešu', market: 'Latvia' },
    { code: 'lt', name: 'Lietuvių', market: 'Lithuania' },
    { code: 'et', name: 'Eesti', market: 'Estonia' },
    { code: 'uk', name: 'Українська', market: 'Ukraine' },
    { code: 'sk', name: 'Slovenčina', market: 'Slovakia' }
  ],
  
  // TIER 5: Asien + Sonstige
  tier5: [
    { code: 'th', name: 'ไทย', market: 'Thailand' },
    { code: 'vi', name: 'Tiếng Việt', market: 'Vietnam' },
    { code: 'tl', name: 'Tagalog', market: 'Philippines' },
    { code: 'el', name: 'Ελληνικά', market: 'Greece' }
  ]
};

function generatePriorityPlan() {
  console.log('🎯 TRANSLATION PRIORITY PLAN\n');
  
  Object.entries(priorityLanguages).forEach(([tier, languages]) => {
    console.log(`📌 ${tier.toUpperCase()}:`);
    languages.forEach(lang => {
      console.log(`   ${lang.code.padEnd(4)} ${lang.name.padEnd(15)} → ${lang.market}`);
    });
    console.log('');
  });
  
  console.log('💡 EMPFOHLENE STRATEGIE:');
  console.log('1. 🚀 Starte mit TIER 1 (Spanisch, Italienisch, Russisch)');
  console.log('2. 📈 Erweitere zu TIER 2 basierend auf User-Feedback');  
  console.log('3. 🌍 Komplettiere restliche Tiers nach Bedarf');
  console.log('\n📝 Für jede Sprache:');
  console.log('   → Übersetze zuerst navigation + common actions');
  console.log('   → Dann dashboard main titles'); 
  console.log('   → Zuletzt detailed settings');
}

function createTierTranslationTemplate(tier = 'tier1') {
  const languages = priorityLanguages[tier];
  
  console.log(`\n📋 TRANSLATION TEMPLATE FOR ${tier.toUpperCase()}:\n`);
  
  languages.forEach(lang => {
    console.log(`// ${lang.name} (${lang.code}) - ${lang.market}`);
    console.log(`${lang.code}: {`);
    console.log(`  'navigation.dashboard': '', // Dashboard`);
    console.log(`  'navigation.settings': '', // Settings`);
    console.log(`  'actions.save': '', // Save`);
    console.log(`  'actions.cancel': '', // Cancel`);
    console.log(`  'dashboard.title': '', // Leyla AI Dashboard`);
    console.log(`  'settings.title': '' // Settings`);
    console.log(`},\n`);
  });
}

// Führe Funktionen aus
generatePriorityPlan();
createTierTranslationTemplate('tier1');

