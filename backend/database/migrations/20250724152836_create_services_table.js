/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('services', table => {
    table.uuid('id').primary().defaultTo(knex.raw('(hex(randomblob(16)))'));
    table.string('bot_config_id').references('id').inTable('bot_configs').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description');
    table.decimal('price', 10, 2).notNullable();
    table.string('currency').notNullable().defaultTo('EUR');
    table.integer('duration_minutes');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
    
    table.index(['bot_config_id', 'is_active']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('services');
};
