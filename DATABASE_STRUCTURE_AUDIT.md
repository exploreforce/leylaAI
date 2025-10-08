# Database Structure Audit - October 8, 2025

## 🚨 Critical Structural Problems Found

### Problem 1: UUID Generation Broken in PostgreSQL ❌

**Issue:** All tables using `table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))` fail on PostgreSQL because the `pgcrypto` extension is not enabled.

**Affected Tables:**
- `appointments`
- `services`
- `bot_configs`
- `availability_configs`
- `blackout_dates`

**Symptoms:**
- INSERTs fail with: `ERROR: function gen_random_uuid() does not exist`
- Appointments are not saved to database
- No error visible to user (AI returns success, but DB insert fails silently)

**Solution:** Migration `20251008000000_fix_postgresql_uuid_generation.js`
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
ALTER TABLE appointments ALTER COLUMN id SET DEFAULT gen_random_uuid();
```

---

### Problem 2: Missing Foreign Keys ❌

**Issue:** No referential integrity between tables. This allows:
- Appointments with invalid `appointment_type` (service doesn't exist)
- Appointments with invalid `account_id` (account doesn't exist)
- Orphaned records when parent is deleted

**Missing FKs:**
```
appointments.appointment_type -> services.id
appointments.account_id -> accounts.id
services.account_id -> accounts.id
availability_configs.account_id -> accounts.id
blackout_dates.account_id -> accounts.id
test_chat_sessions.account_id -> accounts.id
```

**Solution:** Migration `20251008000001_add_foreign_keys.js`

---

### Problem 3: Inconsistent ID Types ⚠️

| Table | Migration | SQLite Reality | PostgreSQL Reality |
|-------|-----------|----------------|-------------------|
| appointments | `uuid()` | `char(36)` hex | `uuid` type |
| services | `uuid()` | `char(36)` hex | `uuid` type |
| accounts | `string()` | `varchar(255)` | `varchar(255)` |
| users | `string()` | `varchar(255)` | `varchar(255)` |

**Problem:** `accounts.id` is VARCHAR, but all FKs reference it as UUID in some migrations.

**Current Status:** Works because PostgreSQL's UUID can compare with VARCHAR, but it's inconsistent and confusing.

**Recommendation:** Keep as-is (working) but document clearly.

---

### Problem 4: Old SQLite Artifacts 🗑️

**Evidence:**
- Local DB uses `hex(randomblob(16))` for UUIDs → Format: `089DE75EC79BF6E4B00E4159135D545F`
- Production DB uses proper UUIDs → Format: `703409ee-1105-41c0-9a7e-fb5b3612a135`
- Migration `20251004165820` tries to fix VARCHAR→UUID conversion only for PostgreSQL

**Issue:** Code was developed with SQLite, then migrated to PostgreSQL without proper testing.

---

## 📊 Current Database Structure

### Core Tables

```
accounts (id: varchar → UUID string)
├── users (account_id FK)
├── appointments (account_id - NO FK!)
├── services (account_id - NO FK!)
├── availability_configs (account_id - NO FK!)
├── blackout_dates (account_id - NO FK!)
└── test_chat_sessions (account_id - NO FK!)

services (id: uuid/char(36))
└── appointments.appointment_type (NO FK!)

bot_configs (id: uuid/char(36))
└── services.bot_config_id (HAS FK ✅)
```

### Why Appointments Weren't Saved

**Root Cause:** PostgreSQL `gen_random_uuid()` function doesn't exist without `pgcrypto` extension.

**Flow:**
1. AI calls `bookAppointment` tool ✅
2. Tool calls `Database.createAppointment()` ✅  
3. Knex tries to INSERT with default `gen_random_uuid()` ❌
4. PostgreSQL error: `function gen_random_uuid() does not exist` ❌
5. INSERT fails, but Knex might not throw error properly ❌
6. Code returns success to AI anyway ❌
7. AI tells user "booked successfully" but nothing in DB ❌

---

## ✅ Solutions Implemented

### 1. Enable pgcrypto Extension
Migration: `20251008000000_fix_postgresql_uuid_generation.js`
- Enables `pgcrypto` extension
- Sets proper UUID defaults on all tables

### 2. Add Foreign Keys
Migration: `20251008000001_add_foreign_keys.js`
- Adds all missing FK constraints
- Uses `ON DELETE SET NULL` to prevent orphaned records

### 3. Previous Fixes
- Status enum: changed `'booked'` → `'confirmed'` ✅
- WhatsApp number auto-fill for bookings ✅
- Account ID auto-assignment for WhatsApp sessions ✅

---

## 🚀 Deployment Steps

1. **Run new migrations on production:**
   ```bash
   cd backend
   NODE_ENV=production npm run migrate:latest
   ```

2. **Verify pgcrypto enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
   ```

3. **Test appointment creation:**
   - Create appointment via API
   - Verify it appears in database
   - Verify it appears in calendar

4. **Test WhatsApp booking:**
   - Send WhatsApp message to book appointment
   - Verify phone number is auto-filled
   - Verify appointment saved to database

---

## 📋 Testing Checklist

- [ ] Migrations run successfully on production
- [ ] `gen_random_uuid()` function works
- [ ] New appointments can be created via API
- [ ] New appointments appear in calendar
- [ ] WhatsApp bookings work without asking for phone number
- [ ] Foreign keys enforce referential integrity
- [ ] Deleting an account sets appointments.account_id to NULL

---

## 🔮 Future Recommendations

1. **Consistent ID Strategy:**
   - Migrate `accounts.id` and `users.id` to proper UUID type
   - Or keep as VARCHAR but document clearly

2. **Add Indexes:**
   ```sql
   CREATE INDEX idx_appointments_account_datetime ON appointments(account_id, datetime);
   CREATE INDEX idx_appointments_phone ON appointments(customer_phone);
   ```

3. **Add Database Constraints:**
   - CHECK constraint for datetime > CURRENT_TIMESTAMP
   - CHECK constraint for duration > 0

4. **Better Error Handling:**
   - Catch and log database errors properly
   - Don't return success if INSERT fails
   - Add database health checks

---

## 📝 Migration History

| Date | Migration | Purpose |
|------|-----------|---------|
| 2024-07-24 | `001-006` | Initial tables |
| 2024-08-15 | `create_accounts_and_users` | Multi-tenancy |
| 2024-08-15 | `add_account_id_to_existing_tables` | Link tables to accounts |
| 2024-10-04 | `fix_appointment_type_to_uuid` | Fix type mismatch |
| 2024-10-08 | `fix_postgresql_uuid_generation` | **Enable pgcrypto** ⭐ |
| 2024-10-08 | `add_foreign_keys` | **Add referential integrity** ⭐ |


