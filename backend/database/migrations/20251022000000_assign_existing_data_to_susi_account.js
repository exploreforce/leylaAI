/**
 * Migration: Assign all existing data to susi@susi.com account
 * This ensures all existing data has an account_id before we enforce account isolation
 */

exports.up = async function(knex) {
  console.log('🔄 [Migration] Assigning existing data to susi@susi.com account...');
  
  // Find susi@susi.com's account
  const susiUser = await knex('users')
    .where('email', 'susi@susi.com')
    .first();
  
  if (!susiUser) {
    console.warn('⚠️ [Migration] susi@susi.com not found - skipping data assignment');
    return;
  }
  
  const susiAccountId = susiUser.account_id;
  console.log(`✅ [Migration] Found susi@susi.com account: ${susiAccountId}`);
  
  // Tables to update
  const tables = [
    'bot_configs',
    'appointments',
    'availability_configs',
    'blackout_dates',
    'services',
    'test_chat_sessions'
  ];
  
  for (const table of tables) {
    // Check if table exists and has account_id column
    const tableExists = await knex.schema.hasTable(table);
    if (!tableExists) {
      console.log(`⚠️ [Migration] Table ${table} does not exist - skipping`);
      continue;
    }
    
    const hasAccountId = await knex.schema.hasColumn(table, 'account_id');
    if (!hasAccountId) {
      console.log(`⚠️ [Migration] Table ${table} does not have account_id column - skipping`);
      continue;
    }
    
    // Update all NULL account_ids
    const updated = await knex(table)
      .whereNull('account_id')
      .update({ account_id: susiAccountId });
    
    console.log(`✅ [Migration] Updated ${updated} rows in ${table}`);
  }
  
  console.log('✅ [Migration] All existing data assigned to susi@susi.com account');
};

exports.down = async function(knex) {
  console.log('🔄 [Migration] Reverting data assignment...');
  
  // Find susi@susi.com's account
  const susiUser = await knex('users')
    .where('email', 'susi@susi.com')
    .first();
  
  if (!susiUser) {
    console.warn('⚠️ [Migration] susi@susi.com not found - skipping revert');
    return;
  }
  
  const susiAccountId = susiUser.account_id;
  
  // Revert by setting account_id back to NULL
  const tables = [
    'test_chat_sessions',
    'services',
    'blackout_dates',
    'availability_configs',
    'appointments',
    'bot_configs'
  ];
  
  for (const table of tables) {
    const tableExists = await knex.schema.hasTable(table);
    if (!tableExists) continue;
    
    const hasAccountId = await knex.schema.hasColumn(table, 'account_id');
    if (!hasAccountId) continue;
    
    await knex(table)
      .where('account_id', susiAccountId)
      .update({ account_id: null });
  }
  
  console.log('✅ [Migration] Reverted data assignment');
};

