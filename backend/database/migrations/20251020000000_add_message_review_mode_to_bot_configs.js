/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('bot_configs', table => {
    table.enum('message_review_mode', ['always', 'never', 'on_redflag'])
      .notNullable()
      .defaultTo('never')
      .comment('Bot message review setting: always = all messages need review, never = all auto-sent, on_redflag = only flagged messages need review');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('bot_configs', table => {
    table.dropColumn('message_review_mode');
  });
};

