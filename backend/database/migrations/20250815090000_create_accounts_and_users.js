exports.up = async function(knex) {
  // accounts
  await knex.schema.createTable('accounts', table => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // users
  await knex.schema.createTable('users', table => {
    table.string('id').primary();
    table.string('account_id').notNullable();
    table.string('email').notNullable().unique();
    table.string('password_hash').notNullable();
    table.string('preferred_language').notNullable().defaultTo('de');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.foreign('account_id').references('id').inTable('accounts').onDelete('CASCADE');
    table.index(['account_id']);
  });

  // account_members (for future multi-user per account)
  await knex.schema.createTable('account_members', table => {
    table.string('id').primary();
    table.string('account_id').notNullable();
    table.string('user_id').notNullable();
    table.string('role').notNullable().defaultTo('owner');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.foreign('account_id').references('id').inTable('accounts').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.unique(['account_id', 'user_id']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('account_members');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('accounts');
};


