exports.up = async function(knex) {
  const exists = await knex.schema.hasColumn('users', 'wasender_session_id');
  if (!exists) {
    await knex.schema.table('users', function(table) {
      table.string('wasender_session_id').nullable();
      table.timestamp('wasender_session_updated_at').nullable();
    });
  }
};

exports.down = async function(knex) {
  const exists = await knex.schema.hasColumn('users', 'wasender_session_id');
  if (exists) {
    await knex.schema.table('users', function(table) {
      table.dropColumn('wasender_session_id');
      table.dropColumn('wasender_session_updated_at');
    });
  }
};


