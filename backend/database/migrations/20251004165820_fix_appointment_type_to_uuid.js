/**
 * Fix appointment_type and account_id columns to be UUID instead of VARCHAR
 * This resolves PostgreSQL type mismatch errors when joining with services table
 * 
 * NOTE: This migration only applies to PostgreSQL. SQLite doesn't support UUID types
 * and will keep the columns as VARCHAR, which works fine for SQLite.
 */

exports.up = async function(knex) {
  const isPostgres = knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql';
  
  if (isPostgres) {
    await knex.raw(`
      -- Convert appointment_type from VARCHAR to UUID
      ALTER TABLE appointments 
      ALTER COLUMN appointment_type TYPE uuid USING appointment_type::uuid;
      
      -- Convert account_id from VARCHAR to UUID  
      ALTER TABLE appointments
      ALTER COLUMN account_id TYPE uuid USING account_id::uuid;
    `);
  } else {
    // SQLite: No changes needed - VARCHAR works fine for UUIDs in SQLite
    console.log('⏭️ Skipping UUID conversion for SQLite (not needed)');
  }
};

exports.down = async function(knex) {
  const isPostgres = knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql';
  
  if (isPostgres) {
    await knex.raw(`
      -- Revert appointment_type back to VARCHAR
      ALTER TABLE appointments
      ALTER COLUMN appointment_type TYPE character varying(255) USING appointment_type::text;
      
      -- Revert account_id back to VARCHAR
      ALTER TABLE appointments
      ALTER COLUMN account_id TYPE character varying(255) USING account_id::text;
    `);
  }
};
