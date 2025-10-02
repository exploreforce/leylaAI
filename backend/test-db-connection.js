// Test DB Connection to RDS PostgreSQL
require('dotenv').config();
const knex = require('knex');

// Parse DATABASE_URL to add SSL config
let connectionConfig;
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  connectionConfig = {
    host: url.hostname,
    port: url.port || 5432,
    database: url.pathname.substring(1), // Remove leading /
    user: url.username,
    password: url.password,
    ssl: { rejectUnauthorized: false } // AWS RDS SSL
  };
} else {
  connectionConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  };
}

const db = knex({
  client: 'postgresql',
  connection: connectionConfig
});

async function testConnection() {
  try {
    console.log('🔍 Testing connection to RDS PostgreSQL...\n');
    
    // Test connection
    await db.raw('SELECT 1+1 as result');
    console.log('✅ Connection successful!\n');
    
    // List all tables
    const tables = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📋 Tables in database:');
    if (tables.rows.length === 0) {
      console.log('   ⚠️  No tables found! Migrations not run yet.\n');
    } else {
      tables.rows.forEach(row => {
        console.log(`   ✅ ${row.table_name}`);
      });
      console.log(`\n📊 Total: ${tables.rows.length} tables\n`);
    }
    
    // Check migrations
    try {
      const migrations = await db('knex_migrations').select('*').orderBy('id');
      console.log(`🔧 Migrations run: ${migrations.length}`);
      if (migrations.length > 0) {
        console.log('   Latest migration:', migrations[migrations.length - 1].name);
      }
    } catch (err) {
      console.log('⚠️  Migrations table not found - no migrations run yet');
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\n🔍 Check:');
    console.error('   1. Is RDS instance running (Status: Available)?');
    console.error('   2. Security Group: Port 5432 open?');
    console.error('   3. DATABASE_URL correct in .env?');
    console.error('   4. Password correct?');
  } finally {
    await db.destroy();
  }
}

testConnection();

