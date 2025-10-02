exports.up = function(knex) {
  return knex.schema.createTable('blackout_dates', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.date('date').notNullable();
    table.string('reason');
    table.boolean('is_recurring').notNullable().defaultTo(false);
    table.timestamps(true, true);
    
    table.unique('date');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('blackout_dates');
}; 