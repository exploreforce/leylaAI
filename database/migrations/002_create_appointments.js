/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('appointments', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('customer_name').notNullable();
    table.string('customer_phone').notNullable();
    table.string('customer_email').nullable();
    table.timestamp('datetime').notNullable();
    table.integer('duration').notNullable(); // in minutes
    table.enum('status', ['pending', 'confirmed', 'cancelled', 'completed']).defaultTo('pending');
    table.text('notes').nullable();
    table.string('appointment_type').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes for better performance
    table.index(['datetime']);
    table.index(['status']);
    table.index(['customer_phone']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('appointments');
}; 