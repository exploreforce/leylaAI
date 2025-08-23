exports.up = async function(knex) {
  const tables = [
    'bot_configs',
    'appointments',
    'availability_configs',
    'blackout_dates',
    'services'
  ];

  for (const t of tables) {
    const hasCol = await knex.schema.hasColumn(t, 'account_id');
    if (!hasCol) {
      await knex.schema.alterTable(t, table => {
        table.string('account_id').nullable().index();
      });
    }
  }
};

exports.down = async function(knex) {
  const tables = [
    'services',
    'blackout_dates',
    'availability_configs',
    'appointments',
    'bot_configs'
  ];

  for (const t of tables) {
    const hasCol = await knex.schema.hasColumn(t, 'account_id');
    if (hasCol) {
      await knex.schema.alterTable(t, table => {
        table.dropColumn('account_id');
      });
    }
  }
};


