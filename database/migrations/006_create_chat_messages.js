/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('chat_messages', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('session_id').notNullable();
    table.enum('role', ['user', 'assistant', 'system']).notNullable();
    table.text('content').notNullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.json('metadata').nullable(); // For tool calls, appointment IDs, etc.
    
    // Foreign key constraint
    table.foreign('session_id').references('id').inTable('test_chat_sessions').onDelete('CASCADE');
    
    // Indexes for better performance
    table.index(['session_id']);
    table.index(['timestamp']);
    table.index(['role']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('chat_messages');
}; 