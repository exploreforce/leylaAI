exports.up = function(knex) {
  return knex.schema.table('test_chat_sessions', table => {
    table.enum('status', ['active', 'archived', 'inactive']).defaultTo('active');
    table.integer('session_number').nullable(); // Will be assigned in order, can be reused when sessions are deleted
    table.index(['status']);
    table.index(['session_number']);
  });
};

exports.down = function(knex) {
  return knex.schema.table('test_chat_sessions', table => {
    table.dropColumn('status');
    table.dropColumn('session_number');
  });
};

