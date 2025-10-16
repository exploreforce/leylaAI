const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

exports.seed = async function(knex) {
  // Check if user susi@susi.com already exists
  const existingUser = await knex('users')
    .where('email', 'susi@susi.com')
    .first();
  
  if (existingUser) {
    // User exists - just make sure they have admin role
    await knex('users')
      .where('id', existingUser.id)
      .update({ role: 'admin' });
    
    console.log('✅ Existing user susi@susi.com granted admin role');
    console.log('   Email: susi@susi.com');
    console.log('   Role: admin');
    return;
  }
  
  // User doesn't exist - create them with admin role
  console.log('⚠️ User susi@susi.com not found - creating new admin user');
  
  // Create default account if it doesn't exist
  const defaultAccountId = 'default-account-' + randomUUID();
  
  const existingAccount = await knex('accounts')
    .where('name', 'Default Account')
    .first();
  
  const accountId = existingAccount 
    ? existingAccount.id 
    : (await knex('accounts').insert({
        id: defaultAccountId,
        name: 'Default Account',
        timezone: 'Europe/Vienna',
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id'))[0].id || defaultAccountId;
  
  // Create admin user
  const adminUserId = 'admin-user-' + randomUUID();
  const passwordHash = await bcrypt.hash('susisusi', 10);
  
  await knex('users').insert({
    id: adminUserId,
    account_id: accountId,
    email: 'susi@susi.com',
    password_hash: passwordHash,
    role: 'admin',
    preferred_language: 'de',
    created_at: new Date(),
    updated_at: new Date()
  });
  
  console.log('✅ New admin user created:');
  console.log('   Email: susi@susi.com');
  console.log('   Password: susisusi');
  console.log('   Role: admin');
};

