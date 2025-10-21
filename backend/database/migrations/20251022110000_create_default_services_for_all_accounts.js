const { v4: uuidv4 } = require('uuid');

/**
 * Migration: Create default services for all accounts
 * Ensures every account has at least 2 standard services for appointment booking
 */

exports.up = async function(knex) {
  console.log('🔄 [Migration] Creating default services for all accounts...');
  
  // Get all accounts
  const accounts = await knex('accounts').select('id', 'name');
  console.log(`📋 [Migration] Found ${accounts.length} accounts`);
  
  if (accounts.length === 0) {
    console.log('⚠️ [Migration] No accounts found - skipping');
    return;
  }
  
  let accountsWithServices = 0;
  let accountsReceivingServices = 0;
  
  for (const account of accounts) {
    // Check if account already has services
    const serviceCount = await knex('services')
      .where('account_id', account.id)
      .where('is_active', true)
      .count('* as count')
      .first();
    
    if (serviceCount.count > 0) {
      console.log(`ℹ️ [Migration] Account "${account.name}" already has ${serviceCount.count} services - skipping`);
      accountsWithServices++;
      continue;
    }
    
    // Create default services for this account
    console.log(`📝 [Migration] Creating default services for account: ${account.name} (${account.id})`);
    
    await knex('services').insert([
      {
        id: uuidv4(),
        account_id: account.id,
        bot_config_id: null,
        name: 'Beratungsgespräch',
        description: 'Persönliches Beratungsgespräch für individuelle Lösungen',
        price: 75.00,
        currency: 'EUR',
        duration_minutes: 60,
        is_active: true,
        sort_order: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        account_id: account.id,
        bot_config_id: null,
        name: 'Schnell-Check',
        description: 'Kurzer Check-up Termin',
        price: 45.00,
        currency: 'EUR',
        duration_minutes: 30,
        is_active: true,
        sort_order: 2,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
    
    accountsReceivingServices++;
    console.log(`✅ [Migration] Created 2 default services for ${account.name}`);
  }
  
  console.log('\n📊 [Migration] Summary:');
  console.log(`   - Total accounts: ${accounts.length}`);
  console.log(`   - Accounts with existing services: ${accountsWithServices}`);
  console.log(`   - Accounts receiving new services: ${accountsReceivingServices}`);
  console.log('✅ [Migration] All accounts now have services!\n');
};

exports.down = async function(knex) {
  console.log('🔄 [Migration] Reverting default services creation...');
  // This migration is data-creating only
  // Down migration intentionally does nothing to preserve user data
  console.log('⚠️ [Migration] Down migration skipped - preserving user data');
};

