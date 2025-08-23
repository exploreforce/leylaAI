/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('test_chat_sessions', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_activity').defaultTo(knex.fn.now());
    
    // Index for performance
    table.index(['last_activity']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('test_chat_sessions');
}; 