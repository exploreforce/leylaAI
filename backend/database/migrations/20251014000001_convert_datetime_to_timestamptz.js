/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if we're using PostgreSQL or SQLite
  const client = knex.client.config.client;
  
  if (client === 'pg' || client === 'postgresql') {
    // PostgreSQL: Convert datetime strings to timestamptz with intelligent type detection
    
    // Step 1: Check current data type of datetime column
    const columnInfo = await knex.raw(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
      AND column_name = 'datetime'
    `);
    
    const dataType = columnInfo.rows[0]?.data_type;
    console.log(`Current datetime column type: ${dataType}`);
    
    // Step 2: If already timestamptz, skip migration
    if (dataType === 'timestamp with time zone') {
      console.log('✅ datetime column is already timestamptz, skipping migration');
      return;
    }
    
    // Step 3: If string type, perform conversion
    if (dataType === 'character varying' || dataType === 'text') {
      console.log('🔄 Converting datetime from string to timestamptz...');
      
      // Add temporary column with correct type
      await knex.schema.table('appointments', table => {
        table.timestamp('datetime_utc', { useTz: true });
      });
      
      // Convert existing data - NO ::text casting needed since it's already a string
      await knex.raw(`
        UPDATE appointments 
        SET datetime_utc = (datetime || ' Europe/Vienna')::timestamptz
        WHERE datetime IS NOT NULL
      `);
      
      // Drop old column
      await knex.schema.table('appointments', table => {
        table.dropColumn('datetime');
      });
      
      // Rename new column to datetime
      await knex.schema.table('appointments', table => {
        table.renameColumn('datetime_utc', 'datetime');
      });
      
      console.log('✅ appointments.datetime conversion completed');
    }
    
    // Step 4: Handle blackout_dates table (same logic)
    const hasBlackoutDates = await knex.schema.hasTable('blackout_dates');
    if (hasBlackoutDates) {
      const hasDateColumn = await knex.schema.hasColumn('blackout_dates', 'date');
      if (hasDateColumn) {
        // Check blackout_dates.date column type
        const bdColumnInfo = await knex.raw(`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = 'blackout_dates' 
          AND column_name = 'date'
        `);
        
        const bdDataType = bdColumnInfo.rows[0]?.data_type;
        console.log(`Current blackout_dates.date column type: ${bdDataType}`);
        
        // If already timestamptz, skip
        if (bdDataType === 'timestamp with time zone') {
          console.log('✅ blackout_dates.date is already timestamptz, skipping');
        } else if (bdDataType === 'character varying' || bdDataType === 'text') {
          console.log('🔄 Converting blackout_dates.date from string to timestamptz...');
          
          await knex.schema.table('blackout_dates', table => {
            table.timestamp('date_utc', { useTz: true });
          });
          
          await knex.raw(`
            UPDATE blackout_dates 
            SET date_utc = (date || ' Europe/Vienna')::timestamptz
            WHERE date IS NOT NULL
          `);
          
          await knex.schema.table('blackout_dates', table => {
            table.dropColumn('date');
          });
          
          await knex.schema.table('blackout_dates', table => {
            table.renameColumn('date_utc', 'date');
          });
          
          console.log('✅ blackout_dates.date conversion completed');
        }
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

