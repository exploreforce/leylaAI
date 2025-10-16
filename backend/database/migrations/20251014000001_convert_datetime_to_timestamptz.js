/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if we're using PostgreSQL or SQLite
  const client = knex.client.config.client;
  
  if (client === 'pg' || client === 'postgresql') {
    // PostgreSQL: Convert datetime strings to timestamptz
    // Assuming existing data is in Europe/Vienna timezone
    
    // 1. Add temporary column
    await knex.schema.table('appointments', table => {
      table.timestamp('datetime_utc', { useTz: true });
    });
    
    // 2. Convert existing data: interpret as Vienna time, convert to UTC
    await knex.raw(`
      UPDATE appointments 
      SET datetime_utc = (datetime::text || ' Europe/Vienna')::timestamptz
      WHERE datetime IS NOT NULL
    `);
    
    // 3. Drop old column
    await knex.schema.table('appointments', table => {
      table.dropColumn('datetime');
    });
    
    // 4. Rename new column to datetime
    await knex.schema.table('appointments', table => {
      table.renameColumn('datetime_utc', 'datetime');
    });
    
    // Handle blackout_dates if it exists
    const hasBlackoutDates = await knex.schema.hasTable('blackout_dates');
    if (hasBlackoutDates) {
      const hasDateColumn = await knex.schema.hasColumn('blackout_dates', 'date');
      if (hasDateColumn) {
        // Add temporary column
        await knex.schema.table('blackout_dates', table => {
          table.timestamp('date_utc', { useTz: true });
        });
        
        // Convert existing data
        await knex.raw(`
          UPDATE blackout_dates 
          SET date_utc = (date::text || ' Europe/Vienna')::timestamptz
          WHERE date IS NOT NULL
        `);
        
        // Drop old column and rename
        await knex.schema.table('blackout_dates', table => {
          table.dropColumn('date');
        });
        
        await knex.schema.table('blackout_dates', table => {
          table.renameColumn('date_utc', 'date');
        });
      }
    }
  } else {
    // SQLite: Keep as string but ensure ISO format
    // SQLite doesn't have native timezone support, so we'll store ISO strings
    console.log('SQLite detected: Converting to ISO 8601 format with UTC indicator');
    
    // For SQLite, we'll just ensure the format is correct
    // The actual timezone handling will be done in application code
    const appointments = await knex('appointments').select('*');
    
    for (const apt of appointments) {
      if (apt.datetime && typeof apt.datetime === 'string') {
        // Parse as Vienna time and convert to UTC ISO string
        const viennaDate = new Date(apt.datetime.replace(' ', 'T') + '+02:00'); // Assume Vienna time (UTC+2 in summer)
        const utcISO = viennaDate.toISOString();
        
        await knex('appointments')
          .where('id', apt.id)
          .update({ datetime: utcISO });
      }
    }
    
    // Do the same for blackout_dates if it exists
    const hasBlackoutDates = await knex.schema.hasTable('blackout_dates');
    if (hasBlackoutDates) {
      const blackoutDates = await knex('blackout_dates').select('*');
      
      for (const bd of blackoutDates) {
        if (bd.date && typeof bd.date === 'string') {
          const viennaDate = new Date(bd.date.replace(' ', 'T') + '+02:00');
          const utcISO = viennaDate.toISOString();
          
          await knex('blackout_dates')
            .where('id', bd.id)
            .update({ date: utcISO });
        }
      }
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const client = knex.client.config.client;
  
  if (client === 'pg' || client === 'postgresql') {
    // PostgreSQL: Convert back to string format
    await knex.schema.table('appointments', table => {
      table.string('datetime_str');
    });
    
    await knex.raw(`
      UPDATE appointments 
      SET datetime_str = to_char(datetime AT TIME ZONE 'Europe/Vienna', 'YYYY-MM-DD HH24:MI')
      WHERE datetime IS NOT NULL
    `);
    
    await knex.schema.table('appointments', table => {
      table.dropColumn('datetime');
    });
    
    await knex.schema.table('appointments', table => {
      table.renameColumn('datetime_str', 'datetime');
    });
    
    // Revert blackout_dates if it exists
    const hasBlackoutDates = await knex.schema.hasTable('blackout_dates');
    if (hasBlackoutDates) {
      const hasDateColumn = await knex.schema.hasColumn('blackout_dates', 'date');
      if (hasDateColumn) {
        await knex.schema.table('blackout_dates', table => {
          table.string('date_str');
        });
        
        await knex.raw(`
          UPDATE blackout_dates 
          SET date_str = to_char(date AT TIME ZONE 'Europe/Vienna', 'YYYY-MM-DD')
          WHERE date IS NOT NULL
        `);
        
        await knex.schema.table('blackout_dates', table => {
          table.dropColumn('date');
        });
        
        await knex.schema.table('blackout_dates', table => {
          table.renameColumn('date_str', 'date');
        });
      }
    }
  } else {
    // SQLite: Convert back to local string format
    console.log('SQLite detected: Converting back to local format');
    
    const appointments = await knex('appointments').select('*');
    
    for (const apt of appointments) {
      if (apt.datetime) {
        const utcDate = new Date(apt.datetime);
        // Convert to Vienna time string
        const viennaStr = utcDate.toLocaleString('en-CA', { 
          timeZone: 'Europe/Vienna',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).replace(',', '');
        
        await knex('appointments')
          .where('id', apt.id)
          .update({ datetime: viennaStr });
      }
    }
    
    // Do the same for blackout_dates
    const hasBlackoutDates = await knex.schema.hasTable('blackout_dates');
    if (hasBlackoutDates) {
      const blackoutDates = await knex('blackout_dates').select('*');
      
      for (const bd of blackoutDates) {
        if (bd.date) {
          const utcDate = new Date(bd.date);
          const viennaStr = utcDate.toLocaleDateString('en-CA', { 
            timeZone: 'Europe/Vienna'
          });
          
          await knex('blackout_dates')
            .where('id', bd.id)
            .update({ date: viennaStr });
        }
      }
    }
  }
};

