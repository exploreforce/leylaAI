/**
 * Fix UUID generation for PostgreSQL by enabling pgcrypto extension
 * and ensuring all UUID columns work properly
 */

exports.up = async function(knex) {
  const isPostgres = knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql';
  
  if (isPostgres) {
    console.log('🔧 Enabling pgcrypto extension for UUID generation...');
    
    // Try to enable pgcrypto extension (may fail if no superuser privileges)
    try {
      await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
      console.log('✅ pgcrypto extension enabled');
    } catch (err) {
      console.log('⚠️ Could not create pgcrypto extension (may already exist or need superuser):', err.message);
      // Check if it exists already
      const result = await knex.raw("SELECT * FROM pg_extension WHERE extname = 'pgcrypto';");
      if (result.rows && result.rows.length > 0) {
        console.log('✅ pgcrypto extension already exists');
      } else {
        console.error('❌ pgcrypto extension not available - UUID generation may fail!');
        throw new Error('pgcrypto extension required but not available');
      }
    }
    
    // Ensure all UUID columns have proper defaults
    await knex.raw(`
      -- Fix appointments.id default
      ALTER TABLE appointments 
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
      
      -- Fix services.id default  
      ALTER TABLE services
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
      
      -- Fix bot_configs.id default
      ALTER TABLE bot_configs
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
      
      -- Fix blackout_dates.id default
      ALTER TABLE blackout_dates
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
      
      -- Fix availability_configs.id default
      ALTER TABLE availability_configs
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
    `);
    
    console.log('✅ UUID defaults fixed for all tables');
  } else {
    console.log('⏭️ Skipping for SQLite (uses hex(randomblob(16)) instead)');
  }
};

exports.down = async function(knex) {
  const isPostgres = knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql';
  
  if (isPostgres) {
    // Don't drop the extension as other databases might use it
    console.log('⏭️ Not dropping pgcrypto extension (might be used by other databases)');
  }
};

