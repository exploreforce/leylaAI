exports.up = function(knex) {
  return knex.schema.createTable('appointments', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('customer_name').notNullable();
    table.string('customer_phone').notNullable();
    table.string('customer_email');
    table.datetime('datetime').notNullable();
    table.integer('duration').notNullable(); // in minutes
    table.enum('status', ['pending', 'confirmed', 'cancelled', 'completed']).notNullable().defaultTo('pending');
    table.text('notes');
    table.string('appointment_type');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('appointments');
}; 