// Fix seed files for PostgreSQL compatibility
// Replaces SQLite UUID syntax with PostgreSQL syntax

const fs = require('fs');
const path = require('path');

const seedsDir = path.join(__dirname, 'database', 'seeds');

const filesToFix = [
  '003_initial_services.js'
];

console.log('🔧 Fixing seed files for PostgreSQL compatibility...\n');

let fixedCount = 0;

filesToFix.forEach(filename => {
  const filePath = path.join(seedsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filename}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already fixed
  if (content.includes('gen_random_uuid()')) {
    console.log(`✅ Already fixed: ${filename}`);
    return;
  }
  
  // Replace SQLite UUID syntax with PostgreSQL syntax
  const originalContent = content;
  content = content.replace(
    /id:\s*knex\.raw\('\(hex\(randomblob\(16\)\)\)'\)/g,
    "id: knex.raw('gen_random_uuid()')"
  );
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filename}`);
    fixedCount++;
  } else {
    console.log(`⚠️  No changes needed: ${filename}`);
  }
});

console.log(`\n🎉 Fixed ${fixedCount} seed files!`);
console.log('\n📝 Next step:');
console.log('   Run: node run-seeds.js\n');

