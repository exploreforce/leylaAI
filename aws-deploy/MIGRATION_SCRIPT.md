# 🔄 SQLite zu PostgreSQL Migration

Wenn du bereits Daten in SQLite hast und diese zu AWS PostgreSQL migrieren möchtest.

## Option 1: Automatisches Migration Script (Empfohlen)

### 1. Installiere pgloader

**macOS:**
```bash
brew install pgloader
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install pgloader
```

**Windows:**
- Download von: https://pgloader.io/
- Oder nutze WSL (Windows Subsystem for Linux)

### 2. Migration durchführen

```bash
# Syntax
pgloader \
  sqlite://./backend/database/whatsapp_bot.db \
  postgresql://admin:PASSWORD@your-rds-endpoint.eu-central-1.rds.amazonaws.com:5432/whatsappbot

# Beispiel
pgloader \
  sqlite://./backend/database/whatsapp_bot.db \
  "postgresql://admin:MeinSicheresPasswort123@whatsappbot-db.c9x7y8z.eu-central-1.rds.amazonaws.com:5432/whatsappbot"
```

**Das war's!** ✅ Alle Daten, Tabellen und Indexes werden kopiert.

---

## Option 2: Manueller Export/Import

### Schritt 1: SQLite Daten exportieren

```bash
cd backend

# Exportiere jede Tabelle als CSV
sqlite3 database/whatsapp_bot.db <<EOF
.headers on
.mode csv
.output appointments.csv
SELECT * FROM appointments;
.output availability_configs.csv
SELECT * FROM availability_configs;
.output bot_configs.csv
SELECT * FROM bot_configs;
.output test_chat_sessions.csv
SELECT * FROM test_chat_sessions;
.output chat_messages.csv
SELECT * FROM chat_messages;
.output services.csv
SELECT * FROM services;
.output accounts.csv
SELECT * FROM accounts;
.output users.csv
SELECT * FROM users;
.quit
EOF
```

### Schritt 2: PostgreSQL Tabellen vorbereiten

```bash
# Führe Migrations auf neuer PostgreSQL DB aus
NODE_ENV=production npm run db:migrate
```

### Schritt 3: Daten importieren

**Option A: Mit psql**

```bash
# Verbinde zur PostgreSQL DB
psql "postgresql://admin:PASSWORD@your-rds-endpoint.eu-central-1.rds.amazonaws.com:5432/whatsappbot"

# In psql:
\COPY accounts FROM 'accounts.csv' DELIMITER ',' CSV HEADER;
\COPY users FROM 'users.csv' DELIMITER ',' CSV HEADER;
\COPY bot_configs FROM 'bot_configs.csv' DELIMITER ',' CSV HEADER;
\COPY services FROM 'services.csv' DELIMITER ',' CSV HEADER;
\COPY availability_configs FROM 'availability_configs.csv' DELIMITER ',' CSV HEADER;
\COPY appointments FROM 'appointments.csv' DELIMITER ',' CSV HEADER;
\COPY test_chat_sessions FROM 'test_chat_sessions.csv' DELIMITER ',' CSV HEADER;
\COPY chat_messages FROM 'chat_messages.csv' DELIMITER ',' CSV HEADER;
```

**Option B: Mit Node.js Script**

Siehe: `migration-script.js` (unten)

---

## Option 3: Node.js Migration Script

### Erstelle: `backend/scripts/migrate-to-postgres.js`

```javascript
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
require('dotenv').config();

const SQLITE_PATH = './database/whatsapp_bot.db';
const POSTGRES_URL = process.env.DATABASE_URL;

async function migrate() {
  console.log('🔄 Starting migration from SQLite to PostgreSQL...\n');

  // Connect to SQLite
  const sqliteDb = new sqlite3.Database(SQLITE_PATH);
  
  // Connect to PostgreSQL
  const pgClient = new Client({ connectionString: POSTGRES_URL });
  await pgClient.connect();

  const tables = [
    'accounts',
    'users',
    'bot_configs',
    'services',
    'availability_configs',
    'blackout_dates',
    'appointments',
    'test_chat_sessions',
    'chat_messages',
    'language_settings'
  ];

  for (const table of tables) {
    console.log(`📦 Migrating table: ${table}`);

    // Get all rows from SQLite
    const rows = await new Promise((resolve, reject) => {
      sqliteDb.all(`SELECT * FROM ${table}`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (rows.length === 0) {
      console.log(`   ⚠️  No data in ${table}, skipping...`);
      continue;
    }

    // Get column names
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const columnNames = columns.join(', ');

    // Insert into PostgreSQL
    for (const row of rows) {
      const values = columns.map(col => row[col]);
      const query = `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
      
      try {
        await pgClient.query(query, values);
      } catch (error) {
        console.error(`   ❌ Error inserting row:`, error.message);
      }
    }

    console.log(`   ✅ Migrated ${rows.length} rows\n`);
  }

  sqliteDb.close();
  await pgClient.end();

  console.log('✨ Migration completed successfully!');
}

migrate().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
```

### Ausführen:

```bash
cd backend
node scripts/migrate-to-postgres.js
```

---

## 🧪 Migration testen

### 1. Zeile-Counts vergleichen

**SQLite:**
```bash
sqlite3 database/whatsapp_bot.db "SELECT COUNT(*) FROM appointments;"
```

**PostgreSQL:**
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM appointments;"
```

### 2. Stichproben vergleichen

```bash
# SQLite
sqlite3 database/whatsapp_bot.db "SELECT * FROM appointments LIMIT 5;"

# PostgreSQL  
psql $DATABASE_URL -c "SELECT * FROM appointments LIMIT 5;"
```

### 3. Integrität prüfen

```bash
# Check Foreign Keys
psql $DATABASE_URL -c "
  SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name
  FROM pg_constraint
  WHERE contype = 'f';
"
```

---

## ⚠️ Wichtige Hinweise

### UUID vs Integer IDs

- SQLite nutzt oft AUTO_INCREMENT Integers
- PostgreSQL nutzt UUIDs (bei Knex so konfiguriert)
- **Wichtig:** Nach Migration ggf. IDs anpassen!

### Timestamps

- SQLite: String-Format
- PostgreSQL: TIMESTAMP-Format
- Migration konvertiert automatisch

### Boolean Values

- SQLite: 0/1
- PostgreSQL: true/false
- pgloader konvertiert automatisch

---

## 🔒 Backup vor Migration

**Immer ein Backup erstellen!**

```bash
# SQLite Backup
cp backend/database/whatsapp_bot.db backend/database/whatsapp_bot.backup.db

# PostgreSQL Backup (nach Migration)
pg_dump $DATABASE_URL > backup.sql
```

---

## 🚨 Rollback bei Problemen

Wenn die Migration schiefgeht:

```bash
# PostgreSQL: Alle Daten löschen
psql $DATABASE_URL

# In psql:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

# Migrations neu ausführen
npm run db:migrate

# Migration wiederholen
```

---

## ✅ Nach erfolgreicher Migration

1. **Teste die App ausgiebig:**
   - Login funktioniert?
   - Termine laden?
   - Neuer Chat?
   - Bot antwortet?

2. **SQLite-Datei als Backup behalten:**
   ```bash
   mv backend/database/whatsapp_bot.db backend/database/whatsapp_bot.old.db
   ```

3. **Lösche CSVs:**
   ```bash
   rm *.csv
   ```

4. **Commit Changes:**
   ```bash
   git add .
   git commit -m "feat: migrated to PostgreSQL"
   git push
   ```

---

**Migration erfolgreich! 🎉**

