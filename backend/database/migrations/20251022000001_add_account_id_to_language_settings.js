/**
 * Migration: Add account_id to language_settings table
 * Makes language settings account-specific instead of global
 */

exports.up = async function(knex) {
  console.log('🔄 [Migration] Adding account_id to language_settings...');
  
  // Check if language_settings table exists
  const tableExists = await knex.schema.hasTable('language_settings');
  if (!tableExists) {
    console.log('⚠️ [Migration] language_settings table does not exist - skipping');
    return;
  }
  
  // Check if account_id column already exists
  const hasAccountId = await knex.schema.hasColumn('language_settings', 'account_id');
  if (hasAccountId) {
    console.log('⚠️ [Migration] account_id column already exists - skipping');
    return;
  }
  
  // Add account_id column
  await knex.schema.alterTable('language_settings', table => {
    table.string('account_id').nullable().index();
    table.foreign('account_id').references('id').inTable('accounts').onDelete('CASCADE');
  });
  
  console.log('✅ [Migration] Added account_id column to language_settings');
  
  // Get all existing accounts
  const accounts = await knex('accounts').select('id');
  console.log(`📋 [Migration] Found ${accounts.length} accounts`);
  
  if (accounts.length === 0) {
    console.log('⚠️ [Migration] No accounts found - skipping language settings copy');
    return;
  }
  
  // Get existing language settings (global)
  const existingSettings = await knex('language_settings')
    .whereNull('account_id')
    .select('*');
  
  console.log(`📋 [Migration] Found ${existingSettings.length} existing language settings`);
  
  if (existingSettings.length === 0) {
    console.log('⚠️ [Migration] No existing language settings - skipping copy');
    return;
  }
  
  // For the first account (susi@susi.com), assign existing settings
  if (accounts.length > 0) {
    const firstAccountId = accounts[0].id;
    await knex('language_settings')
      .whereNull('account_id')
      .update({ account_id: firstAccountId });
    
    console.log(`✅ [Migration] Assigned ${existingSettings.length} language settings to first account`);
    
    // For other accounts, create copies of language settings
    for (let i = 1; i < accounts.length; i++) {
      const accountId = accounts[i].id;
      
      const settingsToCopy = existingSettings.map(setting => ({
        language_code: setting.language_code,
        language_name: setting.language_name,
        is_default: setting.is_default,
        account_id: accountId,
        created_at: new Date(),
        updated_at: new Date()
      }));
      
      await knex('language_settings').insert(settingsToCopy);
      console.log(`✅ [Migration] Copied ${settingsToCopy.length} language settings to account ${accountId}`);
    }
  }
  
  console.log('✅ [Migration] Language settings migration completed');
};

exports.down = async function(knex) {
  console.log('🔄 [Migration] Reverting language_settings changes...');
  
  const tableExists = await knex.schema.hasTable('language_settings');
  if (!tableExists) {
    console.log('⚠️ [Migration] language_settings table does not exist - skipping');
    return;
  }
  
  const hasAccountId = await knex.schema.hasColumn('language_settings', 'account_id');
  if (!hasAccountId) {
    console.log('⚠️ [Migration] account_id column does not exist - skipping');
    return;
  }
  
  // Get first account
  const firstAccount = await knex('accounts').select('id').orderBy('created_at', 'asc').first();
  
  if (firstAccount) {
    // Delete all language settings except for the first account
    await knex('language_settings')
      .whereNot('account_id', firstAccount.id)
      .del();
    
    // Set first account's settings to NULL (global)
    await knex('language_settings')
      .where('account_id', firstAccount.id)
      .update({ account_id: null });
  }
  
  // Drop foreign key and column
  await knex.schema.alterTable('language_settings', table => {
    table.dropForeign('account_id');
    table.dropColumn('account_id');
  });
  
  console.log('✅ [Migration] Reverted language_settings changes');
};

