const { v4: uuidv4 } = require('uuid');

exports.seed = async function(knex) {
  // Get the default account (susi@susi.com) to assign services to
  const susiUser = await knex('users')
    .where('email', 'susi@susi.com')
    .first();
  
  const accountId = susiUser ? susiUser.account_id : null;
  
  if (!accountId) {
    console.warn('⚠️ [Seed] susi@susi.com account not found - services will be created without account_id');
  } else {
    console.log(`✅ [Seed] Creating services for account: ${accountId}`);
  }
  
  // Deletes ALL existing entries
  await knex('services').del();
  
  // Inserts seed entries
  return knex('services').insert([
    {
      id: uuidv4(),
      account_id: accountId,
      bot_config_id: '550e8400-e29b-41d4-a716-446655440000',
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
      account_id: accountId,
      bot_config_id: '550e8400-e29b-41d4-a716-446655440000',
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
}; 