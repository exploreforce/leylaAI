exports.up = function(knex) {
  return knex.schema.table('appointments', table => {
    table.uuid('account_id').references('id').inTable('accounts').onDelete('CASCADE');
    table.index('account_id'); // Add index for faster queries
  });
};

exports.down = function(knex) {
  return knex.schema.table('appointments', table => {
    table.dropColumn('account_id');
  });
};

