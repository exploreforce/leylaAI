exports.up = async function(knex) {
  // Add account_id to test_chat_sessions for multi-tenancy
  const hasAccountId = await knex.schema.hasColumn('test_chat_sessions', 'account_id');
  
  if (!hasAccountId) {
    await knex.schema.alterTable('test_chat_sessions', table => {
      table.string('account_id').nullable().index();
      table.foreign('account_id').references('id').inTable('accounts').onDelete('SET NULL');
    });
    
    // Set default account_id for existing sessions (use first account)
    const firstAccount = await knex('accounts').select('id').orderBy('created_at', 'asc').first();
    if (firstAccount) {
      await knex('test_chat_sessions')
        .whereNull('account_id')
        .update({ account_id: firstAccount.id });
    }
  }
};

exports.down = async function(knex) {
  const hasAccountId = await knex.schema.hasColumn('test_chat_sessions', 'account_id');
  
  if (hasAccountId) {
    await knex.schema.alterTable('test_chat_sessions', table => {
      table.dropForeign('account_id');
      table.dropColumn('account_id');
    });
  }
};
