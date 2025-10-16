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
  // Check if metadata column is JSONB before creating index
  const dbClient = knex.client.config.client;
  if (dbClient === 'pg' || dbClient === 'postgresql') {
    // Check if chat_messages table and metadata column exist
    const hasTable = await knex.schema.hasTable('chat_messages');
    if (hasTable) {
      const hasColumn = await knex.schema.hasColumn('chat_messages', 'metadata');
      if (hasColumn) {
        // Check metadata column data type
        const columnInfo = await knex.raw(`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = 'chat_messages' 
          AND column_name = 'metadata'
        `);
        
        const dataType = columnInfo.rows[0]?.data_type;
        console.log(`Current chat_messages.metadata column type: ${dataType}`);
        
        // Only create GIN index if column is jsonb
        if (dataType === 'jsonb') {
          console.log('🔄 Creating GIN index on metadata column...');
          await knex.raw('CREATE INDEX IF NOT EXISTS idx_messages_metadata ON chat_messages USING gin (metadata jsonb_path_ops)');
          console.log('✅ GIN index on metadata created successfully');
        } else {
          console.log(`⚠️ Skipping GIN index - metadata column is ${dataType}, not jsonb`);
        }
      } else {
        console.log('⚠️ Skipping GIN index - metadata column does not exist');
      }
    } else {
      console.log('⚠️ Skipping GIN index - chat_messages table does not exist');
    }
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

