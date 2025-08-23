/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('bot_configs', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('system_prompt').notNullable();
    table.enum('tone', ['professional', 'friendly', 'casual']).defaultTo('professional');
    table.string('business_hours').notNullable().defaultTo('09:00-17:00');
    table.string('timezone').notNullable().defaultTo('UTC');
    table.integer('max_appointment_duration').notNullable().defaultTo(120); // minutes
    table.integer('buffer_time').notNullable().defaultTo(15); // minutes between appointments
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Ensure only one active config at a time
    table.boolean('is_active').defaultTo(true);
    table.index(['is_active']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('bot_configs');
}; 