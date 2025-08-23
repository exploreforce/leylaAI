exports.up = function(knex) {
  return knex.schema.createTable('chat_messages', table => {
    table.increments('id').primary();
    table.integer('session_id').notNullable();
    table.enum('role', ['user', 'assistant', 'system']).notNullable();
    table.text('content').notNullable();
    table.datetime('timestamp').notNullable().defaultTo(knex.fn.now());
    table.text('metadata'); // JSON string for tool calls, etc.
    
    table.foreign('session_id').references('id').inTable('test_chat_sessions').onDelete('CASCADE');
    table.index('session_id');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('chat_messages');
}; 