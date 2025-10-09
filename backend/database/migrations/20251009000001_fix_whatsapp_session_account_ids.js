/**
 * Migration: Fix WhatsApp sessions with NULL account_id
 * 
 * This migration assigns the first available account_id to all WhatsApp chat sessions
 * that currently have account_id = NULL
 */

exports.up = async function(knex) {
  console.log('🔧 Fixing WhatsApp sessions with NULL account_id...');
  
  // Get the first available account
  const firstAccount = await knex('accounts')
    .select('id')
    .orderBy('created_at', 'asc')
    .first();
  
  if (!firstAccount) {
    console.log('⚠️ No accounts found - skipping WhatsApp session fix');
    return;
  }
  
  console.log(`📋 Using account: ${firstAccount.id}`);
  
  // Update all WhatsApp chat sessions with NULL account_id
  const isPostgres = knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql';
  
  if (isPostgres) {
    const result = await knex.raw(`
      UPDATE test_chat_sessions 
      SET account_id = ?
      WHERE account_id IS NULL 
      AND session_type = 'whatsapp'
      RETURNING id, whatsapp_number
    `, [firstAccount.id]);
    
    if (result.rows && result.rows.length > 0) {
      console.log(`✅ Updated ${result.rows.length} WhatsApp sessions with account_id`);
      result.rows.forEach(row => {
        console.log(`   - Session ${row.id} (${row.whatsapp_number})`);
      });
    } else {
      console.log('✅ No WhatsApp sessions needed updating');
    }
  } else {
    // SQLite
    const sessionsToUpdate = await knex('test_chat_sessions')
      .select('id', 'whatsapp_number')
      .where('account_id', null)
      .where('session_type', 'whatsapp');
    
    if (sessionsToUpdate.length > 0) {
      await knex('test_chat_sessions')
        .where('account_id', null)
        .where('session_type', 'whatsapp')
        .update({ account_id: firstAccount.id });
      
      console.log(`✅ Updated ${sessionsToUpdate.length} WhatsApp sessions with account_id`);
      sessionsToUpdate.forEach(row => {
        console.log(`   - Session ${row.id} (${row.whatsapp_number})`);
      });
    } else {
      console.log('✅ No WhatsApp sessions needed updating');
    }
  }
};

exports.down = async function(knex) {
  console.log('🔙 Reverting WhatsApp session account_id fix...');
  console.log('⚠️ This will set account_id back to NULL for WhatsApp sessions');
  console.log('⏭️ Skipping rollback to preserve data integrity');
};

