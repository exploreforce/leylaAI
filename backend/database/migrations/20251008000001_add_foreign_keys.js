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
  
  // STEP 2: Now add FK constraints (data is clean)
  
  // appointments.appointment_type -> services.id
  const hasAppointmentTypeFK = await knex.schema.hasTable('appointments');
  if (hasAppointmentTypeFK) {
    try {
      await knex.schema.alterTable('appointments', table => {
        table.foreign('appointment_type')
          .references('id')
          .inTable('services')
          .onDelete('SET NULL')
          .onUpdate('CASCADE');
      });
      console.log('✅ Added FK: appointments.appointment_type -> services.id');
    } catch (err) {
      console.log('⚠️ FK might already exist:', err.message);
    }
  }
  
  // appointments.account_id -> accounts.id
  try {
    await knex.schema.alterTable('appointments', table => {
      table.foreign('account_id')
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
        .onUpdate('CASCADE');
    });
    console.log('✅ Added FK: appointments.account_id -> accounts.id');
  } catch (err) {
    console.log('⚠️ FK might already exist:', err.message);
  }
  
  // services.account_id -> accounts.id
  try {
    await knex.schema.alterTable('services', table => {
      table.foreign('account_id')
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
        .onUpdate('CASCADE');
    });
    console.log('✅ Added FK: services.account_id -> accounts.id');
  } catch (err) {
    console.log('⚠️ FK might already exist or constraint error:', err.message);
  }
  
  // availability_configs.account_id -> accounts.id
  try {
    await knex.schema.alterTable('availability_configs', table => {
      table.foreign('account_id')
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
        .onUpdate('CASCADE');
    });
    console.log('✅ Added FK: availability_configs.account_id -> accounts.id');
  } catch (err) {
    console.log('⚠️ FK might already exist or constraint error:', err.message);
  }
  
  // blackout_dates.account_id -> accounts.id
  try {
    await knex.schema.alterTable('blackout_dates', table => {
      table.foreign('account_id')
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
        .onUpdate('CASCADE');
    });
    console.log('✅ Added FK: blackout_dates.account_id -> accounts.id');
  } catch (err) {
    console.log('⚠️ FK might already exist or constraint error:', err.message);
  }
  
  // test_chat_sessions.account_id -> accounts.id
  try {
    await knex.schema.alterTable('test_chat_sessions', table => {
      table.foreign('account_id')
        .references('id')
        .inTable('accounts')
        .onDelete('SET NULL')
        .onUpdate('CASCADE');
    });
    console.log('✅ Added FK: test_chat_sessions.account_id -> accounts.id');
  } catch (err) {
    console.log('⚠️ FK might already exist or constraint error:', err.message);
  }
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

