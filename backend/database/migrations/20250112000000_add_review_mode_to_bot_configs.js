/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('bot_configs', table => {
    table.enum('review_mode', ['always', 'never', 'on_redflag'])
      .notNullable()
      .defaultTo('never')
      .comment('Appointment review setting: always = all appointments need review, never = all auto-confirmed, on_redflag = only flagged appointments need review');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('bot_configs', table => {
    table.dropColumn('review_mode');
  });
};

