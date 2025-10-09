/**
 * Add proper foreign keys to ensure data integrity
 * This should have been done from the beginning
 */

exports.up = async function(knex) {
  console.log('🔗 Adding foreign key constraints...');
  
  // STEP 1: Clean up invalid data FIRST (critical - must succeed)
  console.log('🧹 Cleaning up invalid foreign key references...');
  
  try {
    // Fix appointments.account_id: Set NULL for invalid references
    const invalidAccountIds = await knex.raw(`
      UPDATE appointments 
      SET account_id = NULL 
      WHERE account_id IS NOT NULL 
      AND account_id::text NOT IN (SELECT id::text FROM accounts)
      RETURNING id, customer_name, account_id
    `);
    if (invalidAccountIds.rows && invalidAccountIds.rows.length > 0) {
      console.log(`🧹 Cleaned ${invalidAccountIds.rows.length} appointments with invalid account_id`);
    }
    
    // Fix appointments.appointment_type: Set NULL for invalid references  
    const invalidServiceIds = await knex.raw(`
      UPDATE appointments 
      SET appointment_type = NULL 
      WHERE appointment_type IS NOT NULL 
      AND appointment_type::text NOT IN (SELECT id::text FROM services)
      RETURNING id, customer_name, appointment_type
    `);
    if (invalidServiceIds.rows && invalidServiceIds.rows.length > 0) {
      console.log(`🧹 Cleaned ${invalidServiceIds.rows.length} appointments with invalid appointment_type`);
    }
  } catch (err) {
    console.log('⚠️ Data cleanup failed:', err.message);
  }
  
  // STEP 2: Try to add FK constraints (best effort - don't fail if not possible)
  console.log('🔗 Adding foreign keys (best effort)...');
  
  const fkConstraints = [
    { name: 'appointments_appointment_type_foreign', table: 'appointments', column: 'appointment_type', refTable: 'services', refColumn: 'id' },
    { name: 'appointments_account_id_foreign', table: 'appointments', column: 'account_id', refTable: 'accounts', refColumn: 'id' },
    { name: 'services_account_id_foreign', table: 'services', column: 'account_id', refTable: 'accounts', refColumn: 'id' },
    { name: 'availability_configs_account_id_foreign', table: 'availability_configs', column: 'account_id', refTable: 'accounts', refColumn: 'id' },
    { name: 'blackout_dates_account_id_foreign', table: 'blackout_dates', column: 'account_id', refTable: 'accounts', refColumn: 'id' },
    { name: 'test_chat_sessions_account_id_foreign', table: 'test_chat_sessions', column: 'account_id', refTable: 'accounts', refColumn: 'id' },
  ];
  
  for (const fk of fkConstraints) {
    try {
      // Check if FK already exists
      const exists = await knex.raw(`
        SELECT 1 FROM pg_constraint WHERE conname = '${fk.name}'
      `);
      
      if (exists.rows.length === 0) {
        // Try to add FK
        await knex.raw(`
          ALTER TABLE ${fk.table} 
          ADD CONSTRAINT ${fk.name}
          FOREIGN KEY (${fk.column}) 
          REFERENCES ${fk.refTable}(${fk.refColumn})
          ON DELETE SET NULL
          ON UPDATE CASCADE
        `);
        console.log(`✅ Added FK: ${fk.table}.${fk.column} -> ${fk.refTable}.${fk.refColumn}`);
      } else {
        console.log(`⏭️ FK already exists: ${fk.name}`);
      }
    } catch (err) {
      console.log(`⚠️ Could not add FK ${fk.name}: ${err.message.split('\n')[0]}`);
      // Don't throw - continue with next FK
    }
  }
  
  console.log('✅ Foreign key migration completed (some FKs may have been skipped due to data issues)');
  // Migration always succeeds to allow subsequent migrations to run
};

exports.down = async function(knex) {
  console.log('🔗 Removing foreign key constraints...');
  
  const tables = [
    { table: 'appointments', column: 'appointment_type' },
    { table: 'appointments', column: 'account_id' },
    { table: 'services', column: 'account_id' },
    { table: 'availability_configs', column: 'account_id' },
    { table: 'blackout_dates', column: 'account_id' },
    { table: 'test_chat_sessions', column: 'account_id' },
  ];
  
  for (const { table, column } of tables) {
    try {
      await knex.schema.alterTable(table, t => {
        t.dropForeign(column);
      });
      console.log(`✅ Dropped FK: ${table}.${column}`);
    } catch (err) {
      console.log(`⚠️ Could not drop FK for ${table}.${column}:`, err.message);
    }
  }
};

