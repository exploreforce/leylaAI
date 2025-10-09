/**
 * Add proper foreign keys to ensure data integrity
 * This should have been done from the beginning
 */

exports.up = async function(knex) {
  console.log('🔗 Adding foreign key constraints...');
  
  // STEP 1: Clean up invalid data BEFORE adding FK constraints
  console.log('🧹 Cleaning up invalid foreign key references...');
  
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
  
  // STEP 2: Now add FK constraints using raw SQL (each in separate transaction)
  console.log('🔗 Adding foreign keys individually...');
  
  // Helper function to add FK with raw SQL
  const addFK = async (constraintName, table, column, refTable, refColumn) => {
    try {
      await knex.raw(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = '${constraintName}'
          ) THEN
            ALTER TABLE ${table} 
            ADD CONSTRAINT ${constraintName}
            FOREIGN KEY (${column}) 
            REFERENCES ${refTable}(${refColumn})
            ON DELETE SET NULL
            ON UPDATE CASCADE;
          END IF;
        END $$;
      `);
      console.log(`✅ Added FK: ${table}.${column} -> ${refTable}.${refColumn}`);
    } catch (err) {
      console.log(`⚠️ Could not add FK ${constraintName}:`, err.message);
    }
  };
  
  // Add all foreign keys
  await addFK('appointments_appointment_type_foreign', 'appointments', 'appointment_type', 'services', 'id');
  await addFK('appointments_account_id_foreign', 'appointments', 'account_id', 'accounts', 'id');
  await addFK('services_account_id_foreign', 'services', 'account_id', 'accounts', 'id');
  await addFK('availability_configs_account_id_foreign', 'availability_configs', 'account_id', 'accounts', 'id');
  await addFK('blackout_dates_account_id_foreign', 'blackout_dates', 'account_id', 'accounts', 'id');
  await addFK('test_chat_sessions_account_id_foreign', 'test_chat_sessions', 'account_id', 'accounts', 'id');
  
  console.log('✅ Foreign key migration completed (some FKs may have been skipped if data issues exist)');
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

