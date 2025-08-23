exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('bot_configs').del()
    .then(function () {
      // Inserts seed entries
      return knex('bot_configs').insert([
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          system_prompt: 'You are a helpful AI assistant for appointment booking. You can help customers schedule, modify, or cancel appointments. Be friendly and professional.',
          tone: 'friendly',
          business_hours: '9:00-17:00',
          timezone: 'UTC',
          max_appointment_duration: 120,
          buffer_time: 15,
          is_active: true
        }
      ]);
    });
}; 