exports.up = async function(knex) {
  // channels
  await knex.schema.createTable('channels', table => {
    table.string('id').primary();
    table.string('account_id').notNullable().index();
    table.enum('type', ['whatsapp', 'signal']).notNullable();
    table.text('credentials').nullable(); // JSON string
    table.string('status').notNullable().defaultTo('active');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // chat_sessions (separate from test_chat_sessions)
  await knex.schema.createTable('chat_sessions', table => {
    table.string('id').primary();
    table.string('account_id').notNullable().index();
    table.string('channel').notNullable(); // whatsapp | signal | test
    table.string('client_handle').notNullable(); // phone or id
    table.string('client_language').notNullable().defaultTo('de');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_activity').nullable();
  });

  // chat_messages_v2 with approval & translation
  await knex.schema.createTable('chat_messages_v2', table => {
    table.string('id').primary();
    table.string('session_id').notNullable().index();
    table.string('direction').notNullable(); // in | out
    table.string('status').notNullable().defaultTo('draft'); // draft|pending_approval|sent|failed
    table.text('original_text').notNullable();
    table.text('translated_text').nullable();
    table.string('source_lang').nullable();
    table.string('target_lang').nullable();
    table.string('approved_by').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('chat_messages_v2');
  await knex.schema.dropTableIfExists('chat_sessions');
  await knex.schema.dropTableIfExists('channels');
};


