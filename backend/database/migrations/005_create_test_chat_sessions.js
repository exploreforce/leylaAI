exports.up = function(knex) {
  return knex.schema.createTable('test_chat_sessions', table => {
    table.increments('id').primary();
    table.timestamps(true, true);
    table.datetime('last_activity').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('test_chat_sessions');
}; 