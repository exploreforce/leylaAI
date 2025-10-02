exports.up = function(knex) {
  return knex.schema.createTable('bot_configs', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('system_prompt').notNullable();
    table.enum('tone', ['professional', 'friendly', 'casual']).notNullable().defaultTo('professional');
    table.string('business_hours').notNullable().defaultTo('9:00-17:00');
    table.string('timezone').notNullable().defaultTo('UTC');
    table.integer('max_appointment_duration').notNullable().defaultTo(120);
    table.integer('buffer_time').notNullable().defaultTo(15);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('bot_configs');
}; 