// Run seeds directly with Node.js (bypasses Knex CLI SSL issues)
require('dotenv').config();
const knex = require('knex');
const knexConfig = require('./knexfile');

const environment = process.env.NODE_ENV || 'production';
const config = knexConfig[environment];

console.log(`\n🌱 Running seeds for environment: ${environment}\n`);

const db = knex(config);

async function runSeeds() {
  try {
    console.log('📦 Connecting to database...');
    
    // Test connection
    await db.raw('SELECT 1+1 as result');
    console.log('✅ Database connected!\n');
    
    // Run seeds
    console.log('🌱 Running seeds...\n');
    const [seedFiles] = await db.seed.run();
    
    if (seedFiles.length === 0) {
      console.log('⚠️  No seed files to run.\n');
    } else {
      console.log(`✅ Ran ${seedFiles.length} seed files:\n`);
      seedFiles.forEach(file => {
        console.log(`   ✅ ${file}`);
      });
      console.log('');
    }
    
    console.log('🎉 Seeding completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Check DATABASE_URL in .env');
    console.error('   2. Run migrations first: node run-migrations.js');
    console.error('   3. Check seed files in database/seeds/\n');
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runSeeds();

