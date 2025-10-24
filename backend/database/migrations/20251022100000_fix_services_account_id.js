/**
 * Migration: Ensure all services have an account_id
 * Assigns orphaned services to the default susi@susi.com account
 */

exports.up = async function(knex) {
  console.log('🔄 [Migration] Fixing services without account_id...');
  
  // Find susi@susi.com's account (default account)
  const susiUser = await knex('users')
    .where('email', 'susi@susi.com')
    .first();
  
  if (!susiUser) {
    console.warn('⚠️ [Migration] susi@susi.com not found - skipping');
    return;
  }
  
  const susiAccountId = susiUser.account_id;
  console.log(`✅ [Migration] Found default account: ${susiAccountId}`);
  
  // Check if services table exists
  const tableExists = await knex.schema.hasTable('services');
  if (!tableExists) {
    console.log('⚠️ [Migration] services table does not exist - skipping');
    return;
  }
  
  // Find all services without account_id
  const orphanedServices = await knex('services')
    .whereNull('account_id')
    .select('id', 'name');
  
  console.log(`🔍 [Migration] Found ${orphanedServices.length} services without account_id`);
  
  if (orphanedServices.length > 0) {
    // Update all services without account_id
    const updated = await knex('services')
      .whereNull('account_id')
      .update({ 
        account_id: susiAccountId,
        updated_at: new Date()
      });
    
    console.log(`✅ [Migration] Assigned ${updated} services to default account`);
    orphanedServices.forEach(s => {
      console.log(`   - ${s.name} (${s.id})`);
    });
  } else {
    console.log('✅ [Migration] All services already have account_id');
  }
};

exports.down = async function(knex) {
  console.log('🔄 [Migration] Reverting services account_id fix...');
  // This migration is data-fixing only, no schema changes
  // Down migration intentionally does nothing to preserve data integrity
  console.log('⚠️ [Migration] Down migration skipped - data integrity preserved');
};


