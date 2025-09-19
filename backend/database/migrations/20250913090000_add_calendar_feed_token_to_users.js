exports.up = async function(knex) {
  const hasCol = await knex.schema.hasColumn('users', 'calendar_feed_token');
  if (!hasCol) {
    await knex.schema.alterTable('users', table => {
      table.string('calendar_feed_token').unique().nullable();
    });
  }
};

exports.down = async function(knex) {
  const hasCol = await knex.schema.hasColumn('users', 'calendar_feed_token');
  if (hasCol) {
    await knex.schema.alterTable('users', table => {
      table.dropColumn('calendar_feed_token');
    });
  }
};



