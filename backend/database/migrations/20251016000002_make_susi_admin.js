/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Update existing user susi@susi.com to admin role
  const user = await knex('users')
    .where('email', 'susi@susi.com')
    .first();
  
  if (user) {
    await knex('users')
      .where('email', 'susi@susi.com')
      .update({ role: 'admin' });
    
    console.log('✅ User susi@susi.com has been granted admin role');
  } else {
    console.log('⚠️ User susi@susi.com not found - will be created by seeds if needed');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Revert admin role back to user
  await knex('users')
    .where('email', 'susi@susi.com')
    .update({ role: 'user' });
  
  console.log('✅ Admin role reverted for susi@susi.com');
};

