/**
 * Migration: Add phone column to users table
 * 
 * This allows users to be identified by phone number for WhatsApp integration
 */

exports.up = async function(knex) {
  console.log('📞 Adding phone column to users table...');
  
  const hasPhoneColumn = await knex.schema.hasColumn('users', 'phone');
  
  if (!hasPhoneColumn) {
    await knex.schema.table('users', table => {
      table.string('phone').nullable().unique();
    });
    console.log('✅ Phone column added to users table');
  } else {
    console.log('⏭️ Phone column already exists in users table');
  }
};

exports.down = async function(knex) {
  console.log('📞 Removing phone column from users table...');
  
  const hasPhoneColumn = await knex.schema.hasColumn('users', 'phone');
  
  if (hasPhoneColumn) {
    await knex.schema.table('users', table => {
      table.dropColumn('phone');
    });
    console.log('✅ Phone column removed from users table');
  }
};

