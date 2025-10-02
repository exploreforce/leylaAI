// Run migrations directly with Node.js (bypasses Knex CLI SSL issues)
require('dotenv').config();
const knex = require('knex');
const knexConfig = require('./knexfile');

const environment = process.env.NODE_ENV || 'production';
const config = knexConfig[environment];

console.log(`\n🔧 Running migrations for environment: ${environment}\n`);

const db = knex(config);

async function runMigrations() {
  try {
    console.log('📦 Connecting to database...');
    
    // Test connection
    await db.raw('SELECT 1+1 as result');
    console.log('✅ Database connected!\n');
    
    // Run migrations
    console.log('🚀 Running migrations...\n');
    const [batchNo, migrations] = await db.migrate.latest();
    
    if (migrations.length === 0) {
      console.log('✅ Already up to date - no migrations to run.\n');
    } else {
      console.log(`✅ Batch ${batchNo} run: ${migrations.length} migrations\n`);
      migrations.forEach(migration => {
        console.log(`   ✅ ${migration}`);
      });
      console.log('');
    }
    
    // Show current migration status
    const [currentVersion] = await db.migrate.currentVersion();
    console.log(`📊 Current migration version: ${currentVersion}\n`);
    
    console.log('🎉 Migrations completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Check DATABASE_URL in .env');
    console.error('   2. Ensure RDS instance is Available');
    console.error('   3. Security Group allows port 5432');
    console.error('   4. Run: node test-db-connection.js\n');
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runMigrations();

