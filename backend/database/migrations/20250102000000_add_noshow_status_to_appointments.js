exports.up = function(knex) {
  return knex.schema.alterTable('appointments', table => {
    // Drop the existing enum column
    table.dropColumn('status');
  }).then(() => {
    return knex.schema.alterTable('appointments', table => {
      // Add the column back with the new enum values including 'noshow'
      table.enum('status', ['pending', 'booked', 'confirmed', 'cancelled', 'completed', 'noshow']).notNullable().defaultTo('pending');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('appointments', table => {
    table.dropColumn('status');
  }).then(() => {
    return knex.schema.alterTable('appointments', table => {
      // Revert to previous enum values without 'noshow'
      table.enum('status', ['pending', 'booked', 'confirmed', 'cancelled', 'completed']).notNullable().defaultTo('pending');
    });
  });
};

