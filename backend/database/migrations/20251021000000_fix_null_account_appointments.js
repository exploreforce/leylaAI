/**
 * Migration: Fix NULL account_id appointments
 * 
 * This migration assigns all appointments with NULL account_id to Susi's account.
 * It also moves any WhatsApp session from simone@test.at to susi@susi.com if needed.
 * 
 * This is idempotent and can be run multiple times safely.
 */

exports.up = async function(knex) {
  console.log('🔧 [Migration] Fixing NULL account_id appointments...');
  
  try {
    // 1. Find Susi's account
    const susiUser = await knex('users')
      .where('email', 'susi@susi.com')
      .first();
    
    if (!susiUser) {
      console.log('⚠️ [Migration] susi@susi.com not found, skipping fix');
      return;
    }
    
    const susiAccountId = susiUser.account_id;
    console.log(`✅ [Migration] Found Susi's account: ${susiAccountId}`);

    // 2. Count NULL appointments
    const nullCount = await knex('appointments')
      .whereNull('account_id')
      .count('* as count')
      .first();
    
    const count = parseInt(nullCount.count) || 0;
    console.log(`📊 [Migration] Found ${count} appointments with NULL account_id`);
    
    if (count === 0) {
      console.log('✅ [Migration] No NULL appointments to fix');
    } else {
      // 3. Update all NULL appointments to Susi's account
      const updated = await knex('appointments')
        .whereNull('account_id')
        .update({
          account_id: susiAccountId,
          updated_at: knex.fn.now()
        });
      
      console.log(`✅ [Migration] Assigned ${updated} appointments to Susi's account`);
    }

    // 4. Check if simone@test.at exists and has a session to move
    const simoneUser = await knex('users')
      .where('email', 'simone@test.at')
      .first();
    
    if (simoneUser && simoneUser.wasender_session_id) {
      console.log(`📱 [Migration] Found session to move from simone@test.at: ${simoneUser.wasender_session_id}`);
      
      // Move session to Susi
      await knex('users')
        .where('id', susiUser.id)
        .update({
          wasender_session_id: simoneUser.wasender_session_id,
          wasender_session_updated_at: knex.fn.now()
        });
      
      // Remove from simone
      await knex('users')
        .where('id', simoneUser.id)
        .update({
          wasender_session_id: null,
          wasender_session_updated_at: null
        });
      
      console.log('✅ [Migration] Moved WhatsApp session from simone@test.at to susi@susi.com');
    } else {
      console.log('ℹ️ [Migration] No session to move from simone@test.at');
    }

    console.log('🎉 [Migration] Fix completed successfully!');
    
  } catch (error) {
    console.error('❌ [Migration] Error:', error.message);
    throw error;
  }
};

exports.down = async function(knex) {
  console.log('⚠️ [Migration] Cannot safely rollback appointment reassignment');
  // We cannot safely rollback this migration because we don't know which 
  // appointments originally had NULL account_id vs which had Susi's account_id
};

