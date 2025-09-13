exports.up = function(knex) {
  return knex.schema.alterTable('appointments', table => {
    // Drop the existing enum column
    table.dropColumn('status');
  }).then(() => {
    return knex.schema.alterTable('appointments', table => {
      // Add the column back with the new enum values including 'booked'
      table.enum('status', ['pending', 'booked', 'confirmed', 'cancelled', 'completed']).notNullable().defaultTo('pending');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('appointments', table => {
    table.dropColumn('status');
  }).then(() => {
    return knex.schema.alterTable('appointments', table => {
      // Revert to original enum values
      table.enum('status', ['pending', 'confirmed', 'cancelled', 'completed']).notNullable().defaultTo('pending');
    });
  });
};

