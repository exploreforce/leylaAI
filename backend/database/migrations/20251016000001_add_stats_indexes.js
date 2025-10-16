/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Add indexes for appointments table
  await knex.schema.table('appointments', table => {
    table.index(['account_id', 'status', 'created_at'], 'idx_appointments_stats');
    table.index(['appointment_type', 'status'], 'idx_appointments_service_stats');
  });
  
  // Add indexes for chat_messages table
  await knex.schema.table('chat_messages', table => {
    table.index(['session_id', 'timestamp'], 'idx_messages_timeline');
  });
  
  // Add GIN index for metadata JSON queries (PostgreSQL only)
  // For SQLite, this will be skipped as it doesn't support GIN indexes
  const dbClient = knex.client.config.client;
  if (dbClient === 'pg' || dbClient === 'postgresql') {
    await knex.raw('CREATE INDEX IF NOT EXISTS idx_messages_metadata ON chat_messages USING gin (metadata jsonb_path_ops)');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop appointments indexes
  await knex.schema.table('appointments', table => {
    table.dropIndex(['account_id', 'status', 'created_at'], 'idx_appointments_stats');
    table.dropIndex(['appointment_type', 'status'], 'idx_appointments_service_stats');
  });
  
  // Drop chat_messages indexes
  await knex.schema.table('chat_messages', table => {
    table.dropIndex(['session_id', 'timestamp'], 'idx_messages_timeline');
  });
  
  // Drop GIN index if exists
  const dbClient = knex.client.config.client;
  if (dbClient === 'pg' || dbClient === 'postgresql') {
    await knex.raw('DROP INDEX IF EXISTS idx_messages_metadata');
  }
};

