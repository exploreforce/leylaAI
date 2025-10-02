// Fix migrations for PostgreSQL compatibility
// Replaces SQLite UUID syntax with PostgreSQL syntax

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'database', 'migrations');

// SQLite syntax: knex.raw('(hex(randomblob(16)))')
// PostgreSQL syntax: knex.raw('gen_random_uuid()')

const filesToFix = [
  '001_create_bot_configs.js',
  '002_create_appointments.js',
  '003_create_availability_configs.js',
  '004_create_blackout_dates.js',
  '20250724152836_create_services_table.js'
];

console.log('🔧 Fixing migrations for PostgreSQL compatibility...\n');

let fixedCount = 0;

filesToFix.forEach(filename => {
  const filePath = path.join(migrationsDir, filename);
  
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
    /knex\.raw\('\(hex\(randomblob\(16\)\)\)'\)/g,
    "knex.raw('gen_random_uuid()')"
  );
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filename}`);
    fixedCount++;
  } else {
    console.log(`⚠️  No changes needed: ${filename}`);
  }
});

console.log(`\n🎉 Fixed ${fixedCount} migration files!`);
console.log('\n📝 Next steps:');
console.log('   1. Run: node run-migrations.js');
console.log('   2. Run: node run-seeds.js');
console.log('   3. Check: node test-db-connection.js\n');

