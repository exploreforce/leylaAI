exports.up = function(knex) {
  return knex.schema.createTable('language_settings', table => {
    table.increments('id').primary();
    table.string('language_code', 10).notNullable();
    table.string('language_name', 100).notNullable();
    table.boolean('is_default').defaultTo(false);
    table.timestamps(true, true);
    table.index(['language_code']);
    table.index(['is_default']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('language_settings');
};

