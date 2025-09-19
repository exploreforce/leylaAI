/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('test_chat_sessions', function(table) {
    table.string('session_type').defaultTo('test').notNullable(); // 'test' or 'whatsapp'
    table.string('whatsapp_number').nullable(); // Store WhatsApp phone number for WhatsApp sessions
    table.string('display_name').nullable(); // Display name for the chat (phone number for WhatsApp)
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('test_chat_sessions', function(table) {
    table.dropColumn('session_type');
    table.dropColumn('whatsapp_number');
    table.dropColumn('display_name');
  });
};
