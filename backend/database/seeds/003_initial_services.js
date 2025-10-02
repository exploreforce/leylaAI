exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('services').del()
    .then(function () {
      // Inserts seed entries
      return knex('services').insert([
        {
          id: knex.raw('gen_random_uuid()'),
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
          id: knex.raw('gen_random_uuid()'),
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
    });
}; 