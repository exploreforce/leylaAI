# WhatsApp Bot Documentation

## 📋 Changelog

### 2025-10-13 (Latest) - Availability Check Fix: Status Filtering & Multi-Tenant Isolation

**🐛 Bug Fix: Inactive Appointments Blocking Availability:**
- Fixed issue where cancelled, completed, and noshow appointments were incorrectly blocking available time slots
- Implemented status-based filtering in availability checks
- Added multi-tenant isolation with NULL accountId handling for system-wide bookings

**Problem:**
- `checkAvailability` tool showed all appointments as blocking availability regardless of status
- Cancelled appointments (status: "cancelled") were preventing new bookings
- Completed and noshow appointments were also incorrectly blocking time slots

**Solution:**
- Added `includeInactive` parameter to `Database.getAppointments()`
- Default behavior now filters for active statuses only: "pending", "booked", "confirmed"
- Inactive statuses excluded by default: "cancelled", "completed", "noshow"
- NULL accountIds now block ALL accounts (for system-wide bookings/maintenance)
- AccountId filtering maintains multi-tenant isolation

**Changes Made:**

*Backend Database Layer:*
- `backend/src/models/database.ts`:
  - Added `includeInactive?: boolean` parameter to `getAppointments()` method
  - Implemented status filtering: active statuses only when `includeInactive === false` (default)
  - Enhanced accountId filtering: includes NULL accountIds (system-wide bookings)
  - Added detailed logging for status and account filters

*Backend AI Service:*
- `backend/src/services/aiService.ts`:
  - Updated both `checkAvailability` tool calls to use `includeInactive: false`
  - Ensures only active appointments block availability
  - Lines 274 and 420: Added explicit status filtering

*Backend Calendar Routes:*
- `backend/src/routes/calendar.ts`:
  - Updated availability endpoint to filter inactive appointments
  - Updated overview endpoint with same filtering
  - Added comments documenting NULL accountId behavior
  - Lines 34 and 86: Implemented active-only filtering

*Diagnostic Tool:*
- `backend/diagnose-availability.ts`:
  - New diagnostic script for testing availability logic
  - Tests status filtering, accountId handling, and availability calculations
  - Usage: `npx ts-node backend/diagnose-availability.ts [date]`
  - Provides detailed breakdown of appointments by status and account

**Status Filtering Logic:**
- Active Statuses (block availability): pending, booked, confirmed
- Inactive Statuses (don't block): cancelled, completed, noshow
- Explicit status parameter overrides default filtering
- `includeInactive: true` returns all appointments (for admin views)

**Multi-Tenant Architecture:**
- AccountId filtering isolates appointments per account
- NULL accountIds block ALL accounts (system-wide bookings)
- Maintains data privacy and scalability for multi-tenant usage

**Status:** ✅ Implemented & Tested

---

### 2025-10-13 - Calendar View Header Improvements - FINAL FIX

**📅 Calendar UX Improvements:**
- ✨ **Week View:** Simplified column headers to show only day numbers instead of full dates
- ✨ Changed from "10/12/10/13/10/14/..." to just "12, 13, 14, ..."
- ✨ **Month View:** Removed overlapping day names header (Monday, Tuesday, etc.)
- ✨ Cleaner, more readable calendar interface across all views

**🎯 ACTUAL Root Cause Discovery via DOM Inspection:**
- **What We Thought:** Day names were in `.calendar_rouge_district_month_dayheader`
- **Reality Check:** Used browser DevTools to inspect actual DOM structure
- **FOUND IT:** Day names are in `.calendar_rouge_district_header_inner` (NOT `*_dayheader`!)
- **Why ALL Previous Fixes Failed:** We searched for `*_dayheader` and `*_month_dayheader` classes that don't exist!
- **The Actual DOM Structure:**
  ```html
  <div class="calendar_rouge_district_header">
    <div class="calendar_rouge_district_header_inner">Monday</div>
  </div>
  ```

**Changes Made:**
- `frontend/src/app/globals.css`:
  - **CORRECT FIX:** Now targeting `.calendar_rouge_district_header` and `.calendar_rouge_district_header_inner`
  - Aggressive hiding: display, visibility, opacity, height, position (lines 357-388)
  - High specificity: `html body .calendar_rouge_district_main .calendar_rouge_district_header`
  - Mobile breakpoint updated with correct selectors (lines 422-428)
- `frontend/public/themes/calendar_rouge_district.css`:
  - **CORRECT FIX:** Updated to target `.calendar_rouge_district_header` classes
  - Theme-level CSS loaded last to override everything (lines 184-200)
- `frontend/src/components/calendar/CalendarPro.tsx`:
  - **CORRECT FIX:** MutationObserver now targets the RIGHT classes
  - Simplified to 2 correct selectors instead of 11 wrong ones (lines 1107-1110)
  - Removed debug code, kept only the working solution
  - Added `headerDateFormat: "d"` to Week and Day view for day numbers only
- Multi-layer defense with **CORRECT** selectors finally solves the issue

**Status:** ✅ FINAL FIX - Targeting Correct CSS Classes Based on DOM Inspection!

---

### 2025-10-13 - System Prompt Enhancement for Appointment Slots & Professional Behavior Rules

**🤖 Improved AI Appointment Communication:**
- ✨ Added explicit instruction to AI bot to communicate available appointment times as time windows/ranges instead of individual slots
- ✨ Enhanced system prompt with note: "Gib niemals verschiedene Slots an, stattdessen sag in welchen Zeitfenstern du Zeit hast"
- ✨ Example behavior: Instead of listing individual slots, bot now says "Ich habe Zeit zwischen 9 Uhr und 11 Uhr und dann wieder ab 13 Uhr bis 18 Uhr"

**🔒 Professional Behavior & Security Rules:**
- ✨ Added comprehensive behavior rules section (`<important_rules>`) to system prompt
- ✨ Bot stays in character and only discusses its services
- ✨ Implements conversation boundaries (no politics, personal details only from system prompt)
- ✨ Always checks availability before confirming appointments
- ✨ Never reveals AI identity - always acts as the person described in system prompt
- ✨ Gracefully deflects inappropriate questions using psychological redirection techniques
- ✨ Maintains informal, human-like writing style with intentional typos and varied sentence structure
- ✨ Avoids meta-language and stays professional while being approachable

**Changes Made:**
- `frontend/src/components/BotConfigForm.tsx`:
  - Added `<note>` section in `<tools>` area for appointment slot communication
  - Added `<important_rules>` section after `<tools>` with 13 core behavioral guidelines
  - Ensures AI communicates availability as continuous time windows rather than discrete slots
  - Implements strict conversation boundaries and professional behavior standards
  - Improves user experience with natural, human-like communication while maintaining security

**Status:** ✅ Implemented

---

### 2025-10-14 - UTC Timezone Migration with Multi-Timezone Support

**🌍 Complete Timezone Overhaul:**
- ✨ Migrated from local string datetime storage to UTC-based storage (TIMESTAMPTZ)
- ✨ Implemented multi-timezone support per account
- ✨ Fixed timezone bug: Appointments no longer show incorrect times (e.g., 9:00 → 11:00)
- ✨ All datetimes stored in UTC, displayed in user's local timezone
- ✨ Account-specific timezone configuration in database

**Timezone Handling Architecture:**
- **Database:** All `datetime` columns migrated to `TIMESTAMPTZ` (UTC storage)
- **Accounts Table:** New `timezone` column (default: 'Europe/Vienna')
- **Backend:** Converts between account timezone and UTC automatically
- **Frontend:** Parses UTC and displays in browser's local timezone
- **AI Service:** Uses account timezone for context and datetime calculations

**Changes Made:**

*Backend Migrations:*
- `backend/database/migrations/20251014000000_add_timezone_to_accounts.js`
  - Added `timezone` VARCHAR(50) column to `accounts` table
- `backend/database/migrations/20251014000001_convert_datetime_to_timestamptz.js`
  - Converted `appointments.datetime` to TIMESTAMPTZ
  - Migrated existing data (interpreted as Europe/Vienna, converted to UTC)
  - Handles both PostgreSQL and SQLite

*Backend Utilities:*
- `backend/src/utils/timezoneUtils.ts` (NEW)
  - `convertToUTC()`: Convert from any timezone to UTC
  - `convertFromUTC()`: Convert from UTC to any timezone
  - `getAccountTimezone()`: Fetch account's timezone from DB
  - `formatForDatabase()`: Prepare datetime for UTC storage
  - `formatForClient()`: Format UTC date for API response
- `backend/src/utils/timezone.ts` (UPDATED)
  - Added account-based functions: `getAccountDate()`, `getAccountTime()`, etc.
  - Legacy Vienna functions preserved for backward compatibility

*Backend Routes:*
- `backend/src/routes/appointments.ts`
  - GET: Converts UTC datetimes to ISO strings for clients
  - POST: Converts account timezone to UTC before storage
- `backend/src/routes/review.ts`
  - All responses format datetimes as ISO strings
- `backend/src/services/aiService.ts`
  - Uses account timezone for AI context (current date/time)
  - Converts appointment datetimes to UTC before database insertion

*Frontend Utilities:*
- `frontend/src/utils/timezone.ts` (NEW)
  - `parseUTCToLocal()`: Parse UTC string to Date
  - `formatAppointmentDate()`: Display date in local timezone
  - `formatAppointmentTime()`: Display time in local timezone
  - `convertLocalToUTC()`: Convert datetime-local input to UTC
  - `getRelativeTime()`: Relative time descriptions

*Frontend Components:*
- `frontend/src/components/review/AppointmentReviewCard.tsx`
  - Now uses `formatAppointmentDate()` and `formatAppointmentTime()`
  - Correctly displays UTC datetimes in local timezone
- `frontend/src/components/calendar/CalendarPro.tsx`
  - Updated `formatDateTime()` to parse UTC properly
  - Updated `getSafeDateTime()` to convert UTC to local for inputs

**How It Works:**
1. **Storage:** All datetimes stored as UTC TIMESTAMPTZ in database
2. **API:** Backend returns ISO 8601 strings (UTC)
3. **Display:** Frontend parses UTC and displays in user's browser timezone
4. **Input:** User creates appointment in local time → Backend converts to UTC → Stores in DB
5. **AI Context:** AI uses account timezone for "current date/time" context

**Multi-Timezone Support:**
- Each account has its own timezone setting (`accounts.timezone`)
- AI bot uses account timezone for date/time calculations
- Frontend always displays in user's browser timezone
- Example: Account in New York (EST) sees different times than account in Tokyo (JST)

**Migration Safety:**
- Existing appointments interpreted as Europe/Vienna time during migration
- Automatic conversion to UTC preserves correct times
- Both PostgreSQL and SQLite supported

**Status:** ✅ Implemented and ready for testing

---

### 2025-10-13 - Calendar Service Names Display Fix

**🔧 Fixed Service Display in Calendar:**
- 🐛 **Fixed:** Calendar appointment popup was showing service UUIDs instead of readable service names
- 🐛 **Fixed:** ICS calendar exports were showing service UUIDs in appointment summaries
- ✨ Implemented robust 3-tier fallback system for service name resolution
- ✨ Backend already resolves service names via LEFT JOIN, now properly used in frontend

**Changes Made:**
- `frontend/src/components/calendar/CalendarPro.tsx`:
  - Added `getServiceDisplayName()` helper function with fallback chain:
    1. Primary: Use `serviceName` from backend (resolved via JOIN)
    2. Fallback: Client-side lookup in services list
    3. Last resort: Display appointmentType (UUID) or 'Unknown Service'
  - Fixed appointment modal view mode (Line 1735)
  - Fixed ICS export service names (Line 1298)

**Affected Areas:**
- ✅ Appointment detail popup now shows service names
- ✅ ICS exports now include readable service names in summaries
- ✅ Maintains backward compatibility with appointments without assigned services

**Status:** ✅ Deployed to AWS production

---

### 2025-10-09 - Dynamic Language Detection with Fallback

**🌍 Intelligent Language Response System:**
- ✨ Bot automatically detects and responds in the **user's language**
- ✨ Configured language serves as **fallback** when user language is unclear
- ✨ Multilingual support: Bot adapts to user's preferred language automatically
- ✨ Language priority: User's Language (detected) > Configured Default Language
- 🐛 **Fixed:** Bot was responding in German regardless of language settings
- 🐛 **Fixed:** Bot was not loading language settings from database

**Changes Made:**
- `backend/src/services/aiService.ts`:
  - Added language settings loading from `language_settings` table
  - Enhanced system prompt with intelligent language detection logic
  - User's detected language is now primary response language
  - Configured language used as fallback for unclear messages

**How It Works:**
1. Admin sets default language in Settings UI (stored in database with `is_default: true`)
2. When user sends a message, AI detects the language automatically
3. Bot responds in the **same language** as the user's message
4. If language cannot be detected → Uses configured default language as fallback
5. Examples:
   - User writes "Hello, I need an appointment" → Bot responds in English
   - User writes "Hola, necesito una cita" → Bot responds in Spanish
   - User writes "Guten Tag" → Bot responds in German
   - User writes unclear text → Bot responds in configured default language

**Language Priority:**
- 🥇 **Primary:** Detected user language from message
- 🥈 **Fallback:** Configured default language (from Settings)

**Status:** ✅ Implemented and tested

---

### 2025-10-04 - GitHub Actions CI/CD Pipeline

**🚀 Automatic Deployment System:**
- ✨ Implemented GitHub Actions CI/CD workflows for automatic deployment
- ✨ Separate workflows for backend and frontend services
- ✨ Auto-deploy on Git push to master branch (only when relevant files change)
- ✨ Manual workflow trigger support via GitHub Actions UI
- ✨ Build and push Docker images to AWS ECR automatically
- ✨ Trigger App Runner deployments automatically
- ✨ Comprehensive deployment status tracking and logs

**New GitHub Actions Workflows:**
- `.github/workflows/deploy-backend.yml` - Backend deployment workflow
- `.github/workflows/deploy-frontend.yml` - Frontend deployment workflow
- `GITHUB_ACTIONS_SETUP.md` - Complete CI/CD setup guide

**Deployment Flow:**
1. Code changes pushed to `master` branch
2. GitHub Actions automatically detects changes
3. Docker images built and pushed to ECR (~3-5 minutes)
4. App Runner deployment triggered (~3-5 minutes)
5. New version live (~5-10 minutes total)

**Smart Triggers:**
- Backend workflow: Only runs on changes to `backend/`, `Dockerfile.backend.prod`, or workflow file
- Frontend workflow: Only runs on changes to `frontend/`, `Dockerfile.frontend.prod`, or workflow file
- Documentation changes do NOT trigger deployments

**Security:**
- AWS credentials stored as encrypted GitHub Secrets
- Secrets never exposed in logs or repository
- Follows AWS IAM least-privilege principle

**Status:** ✅ Successfully tested and operational

---

### 2025-10-02 - AWS Deployment Infrastructure

**🚀 AWS Deployment Ready:**
- ✨ Implemented complete AWS App Runner deployment configuration
- ✨ PostgreSQL production support (replaced SQLite for scalability)
- ✨ RDS PostgreSQL setup guide with Free Tier optimization
- ✨ Cost optimization strategies (reduce costs by ~50%)
- ✨ SQLite to PostgreSQL migration scripts and guides
- ✨ Environment variables templates for production
- ✨ Comprehensive step-by-step deployment guide

**New AWS Infrastructure:**
- `aws-deploy/apprunner.yaml` - AWS App Runner configuration
- `aws-deploy/AWS_DEPLOYMENT_GUIDE.md` - Complete deployment walkthrough
- `aws-deploy/MIGRATION_SCRIPT.md` - Database migration guide
- `aws-deploy/COST_OPTIMIZATION.md` - Cost reduction strategies
- `aws-deploy/QUICK_START.md` - Fast deployment for experienced users
- `aws-deploy/Dockerfile.backend` - Optimized production Docker image

**Backend Updates:**
- Updated `knexfile.js` production config for PostgreSQL
- PostgreSQL SSL support with RDS
- DATABASE_URL support for easier configuration
- Production-ready database connection pooling

**Files Modified:**
- `backend/knexfile.js` - Production now uses PostgreSQL instead of SQLite
- Created `/aws-deploy/` directory with complete infrastructure

**Deployment Options:**
- AWS App Runner (recommended): ~30-50€/month optimized
- RDS PostgreSQL: Free Tier eligible (12 months), then ~15€/month
- Auto-scaling: 1-5 instances based on traffic
- CI/CD: Automatic deployment on Git push

---

## 📋 Changelog

### 2025-10-01 (Latest) - Multi-Tenancy & Appointment Booking Fixes

**🐛 Critical Bug Fix - Appointments Not Showing in Calendar (v3):**
- 🐛 Fixed test chat appointments not appearing in calendar
  - **Issue 1:** Test chat sessions were created with the first account's ID instead of the logged-in user's account ID
  - **Issue 2:** Initial fix added `requireAuth` middleware, but this broke session creation completely (no sessions could be created)
  - **Issue 3:** Frontend had no error handling in `createNewSession()` - errors were silently swallowed
  - **Root Cause:** When `requireAuth` was added, requests without valid JWT tokens were rejected with 401, preventing any session creation
  - **Solution:** 
    - Made authentication **optional** instead of required
    - Endpoint now tries to extract `accountId` from JWT token if present
    - Falls back to default account if no valid token (for backward compatibility)
    - Added detailed error logging in frontend for debugging
  - **Impact:** 
    - Test chat sessions work again (can be created without errors)
    - If user is logged in with JWT token → Uses correct `account_id` → Appointments appear in calendar! ✅
    - If no JWT token → Falls back to default account (for development/testing)
  - **Note:** Existing test sessions from before this fix may still have the old account_id - create a new test session to fix

**🐛 Critical Bug Fix - AI Bot Appointment Booking (v2):**
- 🐛 Fixed AI bot incorrectly saying "no appointments available today" when checking availability for the current day
  - **Issue:** System was showing all business hours (e.g., 09:00-17:00) without considering the current time
  - **First Fix Attempt:** Filtered out blocks where `start < currentTime` - BUT this removed partially-available blocks!
  - **Problem Example:** Time is 16:55, block is 13:00-19:00 → First fix removed entire block (wrong!)
  - **Correct Solution:** Adjust time blocks instead of removing them:
    - If `block.end <= currentTime` → Remove (completely past)
    - If `block.start < currentTime < block.end` → Adjust to `{ start: currentTime, end: block.end }`
    - If `block.start >= currentTime` → Keep as-is (future block)
  - **Example:** Time is 16:55, business hours 13:00-19:00 → Bot shows "16:55 bis 19:00" ✅
  - **Improved message:** "Leider habe ich heute keine freien Zeiten mehr. Möchten Sie einen Termin für morgen oder einen anderen Tag?"

**Files Modified:**
- `backend/src/services/aiService.ts` - Added `isToday` check with smart time block adjustment in `checkAvailability` tool
- `backend/src/routes/bot.ts` - Modified `/test-chat/session` endpoint to use logged-in user's `accountId` from JWT token

---

### 2025-10-01 - Mobile Optimization & Internationalization

**🌍 Internationalization (i18n):**
- ✨ Implemented lazy-loading translation system with localStorage persistence
  - App starts instantly without loading screen (default: German)
  - Dynamic language switching without page reload
  - Only loads translation files for selected language on-demand
  - User preference saved in localStorage
- ✨ Added 11 complete language translations (55 translation files):
  - 🇩🇪 German, 🇬🇧 English, 🇪🇸 Spanish, 🇫🇷 French, 🇮🇹 Italian
  - 🇵🇱 Polish, 🇷🇺 Russian, 🇨🇿 Czech, 🇸🇰 Slovak, 🇭🇺 Hungarian, 🇷🇴 Romanian
- ✨ Created 5 translation namespaces per language (common, settings, dashboard, chat, calendar)
- ✨ Language settings moved from backend to client-side (localStorage)

**📱 Mobile Optimization:**
- ✨ Responsive dashboard header
  - Logo size reduced on mobile (48px → 40px)
  - Dashboard title hidden on mobile devices (< 768px)
  - Compact button labels for mobile ("Chat", "Review")
  - Reduced padding and spacing for mobile
- ✨ Responsive dashboard cards
  - Fluid grid layout: 1 column (mobile) → 2 (tablet) → 4 (desktop)
  - Optimized card padding, icon sizes, and text sizes for mobile
  - Touch-friendly interface with proper spacing
- ✨ Performance improvements through lazy loading

**Files Modified:**
- `frontend/src/components/providers/DynamicTranslationProvider.tsx` - Lazy loading
- `frontend/src/components/BotConfigForm.tsx` - localStorage integration
- `frontend/src/app/page.tsx` - Mobile-responsive dashboard
- `frontend/public/locales/*/` - 55 new translation files (11 languages × 5 namespaces)

---

### 2025-10-01 (Earlier) - Bug Fixes & WasenderAPI Enhancement

**Bug Fixes:**
- 🐛 Fixed React Strict Mode causing duplicate chat sessions to be created on component mount
- 🐛 Fixed auto-scroll behavior interrupting users when reading older messages - now only scrolls when user is near bottom
- 🐛 Fixed database schema issue after GitHub pull - ran migration to add `account_id` column to `test_chat_sessions` table

**New Features:**
- ✨ Added WasenderAPI message history exploration endpoints (experimental)
  - `GET /api/whatsapp/test/list-sessions` - List all sessions with IDs
  - `GET /api/whatsapp/test/message-history/:sessionId` - Test message history retrieval
  - `GET /api/whatsapp/test/chat-list/:sessionId` - Test chat list retrieval
- ✨ Implemented `getMessageHistory()` and `getChatList()` functions in `wasenderApiClient.ts` that intelligently test multiple endpoint patterns

**Improvements:**
- 📚 Updated documentation with all recent changes
- 🔄 Synced with latest GitHub repository (commit: 7e963dc)

---

## 0. Quick Start (für Nooby-freundlichen Betrieb)

Für einen einfachen und idiotensicheren Start des Projekts wurden spezielle Batch-Scripts erstellt:

### 0.1. Projekt starten

**Windows:**
- **Option 1:** `start-project.bat` (Doppelklick)  
- **Option 2:** `start-simple.bat` (Doppelklick, falls Option 1 nicht geht)

**macOS/Linux:**
- **Option 1:** `start-project.sh` (Terminal: `./start-project.sh` oder Doppelklick im Finder)
- **Option 2:** `start-simple.sh` (Terminal: `./start-simple.sh` oder Doppelklick im Finder)

**Das ist der wichtigste File zum Testen!**

**Was das Script automatisch macht:**
*   ✅ Prüft ob Node.js und npm installiert sind
*   ✅ Installiert alle Dependencies automatisch
*   ✅ **Löscht den problematischen `.next` Ordner im Frontend** (behebt häufige Probleme)
*   ✅ Prüft ob alle .env Konfigurationsdateien vorhanden sind
*   ✅ Startet Backend (Port 5000) und Frontend (Port 3000) gleichzeitig
*   ✅ Zeigt hilfreiche Fehlermeldungen falls etwas schief läuft

**Nach dem Start erreichbar unter:**
*   Frontend: http://localhost:3000
*   Backend API: http://localhost:5000

### 0.2. Projekt zurücksetzen

**Windows:** `reset-project.bat` (Doppelklick)  
**macOS/Linux:** `reset-project.sh` (Terminal: `./reset-project.sh` oder Doppelklick im Finder)

Falls es Probleme gibt oder das Projekt "kaputt" ist, einfach das entsprechende Script ausführen.

**Was das Script macht:**
*   🧹 Löscht alle `node_modules` Ordner (Frontend, Backend, Root)
*   🧹 Löscht den `.next` Ordner
*   🧹 Bereitet alles für einen Neustart vor
*   ⚠️ **Fragt vor dem Löschen nach Bestätigung**

**Nach dem Reset:** Einfach wieder das entsprechende Start-Script ausführen.

### 0.3. Voraussetzungen

**Einmalig installieren (falls noch nicht vorhanden):**
*   Node.js von https://nodejs.org/ (Version 18 oder höher)
*   Die Scripts prüfen automatisch ob alles installiert ist

**Konfigurationsdateien:**
*   `frontend/.env` - ✅ Bereits konfiguriert
*   `backend/.env` - ✅ Bereits konfiguriert (mit OpenAI API Key)

### 0.4. Häufige Probleme und Lösungen

| Problem | Lösung |
|---------|--------|
| "Node.js nicht gefunden" | Node.js von nodejs.org installieren |
| Frontend startet nicht | `reset-project.bat` ausführen, dann neu starten |
| Port bereits belegt | Andere Anwendungen auf Port 3000/5000 beenden |
| Dependencies-Fehler | `reset-project.bat` ausführen für kompletten Neustart |
| **Database error: "no column named account_id"** (nach GitHub Pull) | Backend-Migrations ausführen: `cd backend` dann `npm run db:migrate` |
| **Zwei Chat-Sessions werden erstellt** (Development) | ✅ FIXED (2025-10-01): React Strict Mode-Problem wurde behoben |
| **Auto-Scroll stört beim Lesen alter Nachrichten** | ✅ FIXED (2025-10-01): Intelligentes Scrolling implementiert |

### 0.5. Manuelle Alternative

Falls die Scripts nicht funktionieren, kann man auch manuell starten:

**Windows:**
```cmd
# Dependencies installieren
npm install

# Frontend .next Ordner löschen
rmdir /s frontend\.next

# Projekt starten
npm run dev
```

**macOS/Linux:**
```bash
# Dependencies installieren
npm install

# Frontend .next Ordner löschen
rm -rf frontend/.next

# Projekt starten
npm run dev
```

**⚠️ Wichtig:** Der `.next` Ordner muss vor jedem Start gelöscht werden, sonst gibt es Probleme!

---

## 0.6. Key Features Overview

### 🌍 Internationalization (i18n)

**Supported Languages (100% Interface Coverage):**
- 🇩🇪 German (Deutsch) - Default language
- 🇬🇧 English
- 🇪🇸 Spanish (Español)
- 🇫🇷 French (Français)
- 🇮🇹 Italian (Italiano)
- 🇵🇱 Polish (Polski)
- 🇷🇺 Russian (Русский)
- 🇨🇿 Czech (Čeština)
- 🇸🇰 Slovak (Slovenčina)
- 🇭🇺 Hungarian (Magyar)
- 🇷🇴 Romanian (Română)

**How it works:**
- **Lazy Loading**: Only the selected language is loaded on-demand
- **No Loading Screen**: App starts instantly in default language (German)
- **Dynamic Switching**: Change language without page reload
- **Persistent**: User preference saved in localStorage
- **5 Namespaces**: common, settings, dashboard, chat, calendar

**How to change language:**
1. Go to Settings (⚙️ icon in dashboard)
2. Scroll to "Language" / "Sprache" section
3. Select your preferred language
4. Click "Save" / "Speichern"
5. Interface switches immediately ✨

**Translation Files Location:**
```
frontend/public/locales/
├── de/  (German)
├── en/  (English)
├── es/  (Spanish)
├── fr/  (French)
├── it/  (Italian)
├── pl/  (Polish)
├── ru/  (Russian)
├── cs/  (Czech)
├── sk/  (Slovak)
├── hu/  (Hungarian)
└── ro/  (Romanian)
    ├── common.json      # Actions, navigation, status, time
    ├── settings.json    # Bot config, language settings
    ├── dashboard.json   # Dashboard UI, quick actions
    ├── chat.json        # Chat interface, test chat
    └── calendar.json    # Calendar, appointments
```

### 📱 Mobile Responsive Design

**Optimized for:**
- 📱 **Mobile Phones**: iPhone SE (375px), Standard smartphones (390px)
- 📱 **Tablets**: iPad (768px), Android tablets
- 💻 **Desktop**: Standard (1280px+), Large screens (1920px+)

**Features:**
- Responsive header with compact mobile layout
- Fluid dashboard grid (1/2/4 columns)
- Touch-friendly interface
- Optimized text and icon sizes
- Reduced padding and spacing on mobile
- Hidden non-essential elements on small screens

**Testing Mobile View:**
- Firefox: `Ctrl + Shift + M` (Responsive Design Mode)
- Chrome: `F12` → Toggle device toolbar
- Or resize browser window

---

### 0.7. Production Build (Deployment)

Für Production/Deployment gibt es optimierte Build-Scripts:

**Windows:**
- **Build:** `build-project.bat` (Doppelklick)
- **Start:** `start-production.bat` (Doppelklick)

**macOS/Linux:**  
- **Build:** `./build-project.sh` (Terminal oder Doppelklick)
- **Start:** `./start-production.sh` (Terminal oder Doppelklick)

**Was der Build macht:**
- ✅ Kompiliert TypeScript → JavaScript (Backend → `backend/dist/`)
- ✅ Optimiert Next.js für Production (Frontend → `frontend/.next/`)
- ✅ Reduziert Dateigröße und verbessert Performance

**Docker Alternative (einfachster Weg):**
```bash
docker-compose up -d
```

---

## 1. General App Information

This project is a full-stack application designed to provide a configurable AI-powered WhatsApp chatbot for business owners. The chatbot can handle tasks like appointment booking through AI tool calls and is integrated with an internal calendar system. The application features a clean frontend for configuration and testing.

### Features:

*   **AI-Powered Chatbot:** A WhatsApp chatbot that can understand and respond to user queries.
*   **Appointment Booking:** The chatbot can book appointments for users by checking for availability in an internal calendar.
*   **Internal Calendar System:** A calendar system that manages availability, appointments, and blackout dates.
*   **Advanced Bot Configuration:** A comprehensive configuration interface that allows customization of:
    *   Bot identity (name, description)
    *   Personality and tonality (9 different tones: professional, friendly, casual, flirtatious, direct, emotional, warm, confident, playful)
    *   Character traits and background information
    *   Services offered and escalation rules
    *   Bot limitations and boundaries
    *   Behavior guidelines (editable behavior section used in system prompt)
    *   Automatic system prompt generation from configuration
*   **Test Chat:** A chat interface for testing the chatbot's responses and tool calls.
*   **WhatsApp Integration:** The application is integrated with the WhatsApp API to send and receive messages.

## 2. App Structure

The project is organized into a monorepo with the following directory structure:

*   `/backend`: Contains the Node.js/Express backend, which handles the API, business logic, and database interactions.
*   `/database`: Contains the Knex.js database schema, migrations, and seeds.
*   `/frontend`: Contains the Next.js frontend, which provides the user interface for configuring and testing the chatbot.
*   `/shared`: Contains any shared types or utilities that are used by both the frontend and backend.
*   `docker-compose.yml`: Docker Compose file to run frontend and backend together for self-hosting.
*   `backend/Dockerfile`: Dockerfile to build and run the backend service.
*   `Dockerfile`: Dockerfile to build and run the frontend service.

## 3. File List

This section provides a detailed list of all the files in the project, along with a description of their purpose and a list of their external function calls and definitions.

### 3.1. `backend`

The `backend` directory contains the Node.js/Express backend, which handles the API, business logic, and database interactions.

#### 3.1.1. `src`

The `src` directory contains the source code for the backend.

*   `index.ts`: The main entry point for the backend application. It initializes the Express server, sets up the middleware, and registers the API routes.
*   `middleware/errorHandler.ts`: Contains the `asyncHandler` middleware, which wraps async route handlers and passes any errors to the error handling middleware.
*   `middleware/logger.ts`: Contains the `logger` middleware, which logs incoming requests to the console.
*   `models/database.ts`: Contains the `Database` class, which provides a high-level API for interacting with the database.
*   `routes/appointments.ts`: Contains the API routes for managing appointments.
*   `routes/bot.ts`: Contains the API routes for the bot, including the test chat functionality which uses identical logic to WhatsApp chat (with realistic typing delays, draft/sent status workflow). **Recently updated to ensure correct metadata (`status: 'approved'`, `approved: true`, `isCustomReply: true`) is applied when approving or sending custom replies for test chat messages, resolving frontend synchronization issues.** **🆕 Session Creation Updated**: `POST /test-chat/session` now always creates new sessions instead of reusing existing active sessions, ensuring each "AI Chat" click starts a fresh conversation.
*   `routes/calendar.ts`: Contains the API routes for managing the calendar, including availability and overview.
    - ➕ Added `GET /api/calendar/ics` endpoint that serves an iCalendar feed (`text/calendar`) for all appointments (default range: last 30 days → next 180 days; override via `startDate`, `endDate`). This allows subscribing from Google Calendar, Apple Calendar, Outlook, etc. Events include `UID`, `DTSTAMP`, `DTSTART`, `DTEND`, `SUMMARY`, `DESCRIPTION`, `LOCATION`, `STATUS`.
    - ➕ Supports per-user private feeds via `?token=<calendar_feed_token>`. Each user has a unique `calendar_feed_token` stored in `users.calendar_feed_token`. Obtainable via `GET /api/bot/me` (Bearer token required). When present, feed is scoped to the user's `account_id`.
*   `routes/index.ts`: The main router file, which combines all the other route files into a single router.
*   `routes/whatsapp.ts`: Contains the webhook routes for the WhatsApp integration.
*   `services/aiService.ts`: Contains the `AIService` class, which handles the interaction with the OpenAI API, including dynamic system prompt generation based on bot configuration, configurable content filtering policies, and execution of AI tool calls for functionalities like availability checking and appointment booking.
*   `services/whatsappService.ts`: Contains the `WhatsAppService` class, which handles both WhatsApp and Test Chat message processing with identical logic, including incoming messages, AI responses, realistic typing delays, and managing message states (draft, sent).
*   `types/index.ts`: Contains the TypeScript type definitions for the backend, including types for bot configuration, appointments, availability, chat messages (with status), and newly added service management.
*   `utils/calendarUtils.ts`: Contains utility functions for calendar-related operations, suchs as generating time slots and checking for blackout dates.
*   `utils/index.ts`: Contains various utility functions that are used throughout the backend.
*   `utils/typingDelay.ts`: Contains the `TypingDelayService` class, which provides realistic typing delays for bot responses, simulating human-like response timing based on message length plus random delays.

### 3.2. `database`

The `database` directory contains the Knex.js database schema, migrations, and seeds.

*   `knexfile.ts`: The Knex.js configuration file. It contains the database connection settings for different environments (development, staging, production).
*   `migrations/`: This directory contains the database migration files. Each file represents a change to the database schema.
    *   `20240723120000_create_initial_tables.ts`: Creates the initial database tables, including `bot_configs`, `appointments`, `availability_configs`, and `blackout_dates`.
    *   `20240723140000_create_chat_tables.ts`: Creates the tables for managing chat sessions and messages, including `test_chat_sessions` and `chat_messages`.
    *   `20250724144050_extend_bot_configs_table.js`: Extends the `bot_configs` table with advanced configuration fields including bot identity, personality settings, character traits, services offered, escalation rules, limitations, and generated system prompt storage.
    *   `20250815090000_create_accounts_and_users.js`: Creates multi-tenant support with `accounts`, `users`, and `account_members` tables for user authentication and account management.
    *   `20250815091000_add_account_id_to_existing_tables.js`: Adds `account_id` column to existing tables (`bot_configs`, `appointments`, `availability_configs`, `blackout_dates`, `services`) for multi-tenancy.
    *   `20250930000000_add_account_id_to_test_chat_sessions.js`: **NEW (2025-10-01)** Adds `account_id` column to `test_chat_sessions` table with foreign key to `accounts` table, enabling multi-tenant chat session management.
*   `seeds/`: This directory contains the database seed files. Each file contains data that can be used to populate the database.
    *   `01_bot_config.ts`: Populates the `bot_configs` table with initial configuration data.

### 3.3. `frontend`

The `frontend` directory contains the Next.js frontend, which provides the user interface for configuring and testing the chatbot.

#### 3.3.1. `src`

The `src` directory contains the source code for the frontend.

##### `app`

The `app` directory contains the application's routes.

*   `layout.tsx`: The root layout for the application. It includes the main HTML structure and the `Inter` font. The `title` metadata was updated from `'ElysAI Management Centre'` to `'Leyla Suite'`.
*   `page.tsx`: The main dashboard page. It displays an overview of the application and provides links to the other pages, including a new link to the mobile-optimized view. The page was updated to use the new dark theme, rebranded (`alt` for logo, `<h1>` title updated to "Leyla AI"), and its logo size was increased. Emojis were replaced with Heroicons, and all text and button colors were updated to the Leyla AI gradient scheme. Main page containers were redesigned for fixed height, standardized button placement, and the "Configure Bot" container's detailed text was replaced with a minimalist icon badge. The logo `src` was updated from `/branding/ElysAI.png` to `/branding/LeylaAI.png`. **Recently updated to use German labels ("Termine", "Laufende Chats", "Überprüfung erforderlich", "Einstellungen") and all content within cards is now centered instead of left-aligned for better visual balance.**
*   `calendar/page.tsx`: (DELETED)
*   `calendar-new/page.tsx`: The new calendar page. The calendar page was updated to use the new dark theme for its layout, header, and the container holding the `CalendarPro` component. Its logo size was increased. Its colors were updated to the Leyla AI gradient scheme. The `alt` attribute for the logo was updated from "ElysAI" to "Leyla AI", and the `src` for the logo was updated from `/branding/ElysAI.png` to `/branding/LeylaAI.png`.
*   `chat-review/page.tsx`: The "All Chat Sessions for Review" page. This page was fully converted to the dark theme, including its layout, header, empty state, individual session cards, statistic cards, last message preview, and action buttons. It was rebranded (`alt` for logo updated from "ElysAI" to "Leyla AI", `src` updated from `/branding/ElysAI.png` to `/branding/LeylaAI.png`). Emojis were replaced with Heroicons (`DocumentTextIcon`, `ChatBubbleLeftRightIcon`, `TrashIcon`). Stats card colors were updated to `elysPink` and `elysViolet`.
*   `chat-review/[chatId]/page.tsx`: The detailed chat review page. This page was fully converted to the dark theme, including its layout, header, conversation history, swipe card for pending replies, and custom reply interface. Its colors were updated to the Leyla AI gradient scheme. During rebranding, the `alt` attribute for the logo was updated from "ElysAI" to "Leyla AI". The `src` for the logo was updated from `/branding/ElysAI.png` to `/branding/LeylaAI.png`. The container for "Reject" and "Accept" buttons was updated to be centered. The custom reply textarea is now pre-filled with the AI's suggested response when "Reject & Write Custom Reply" is clicked.
*   `chats/page.tsx`: The "All Chat Sessions" page. This page was fully converted to the dark theme, including its layout, header, empty state, individual session cards, statistic cards, last message preview, and action buttons. It was rebranded (`alt` for logo updated from "ElysAI" to "Leyla AI", `src` updated from `/branding/ElysAI.png` to `/branding/LeylaAI.png`). Emojis were replaced with Heroicons (`DocumentTextIcon`, `ChatBubbleLeftRightIcon`, `ClockIcon`, `TrashIcon`). Stats card colors were updated to `elysPink` and `elysViolet`. **Recently updated to navigate to the `test-chat` page with the `sessionId` as a URL parameter, allowing the Test Chat to load existing session history.**
*   `config/page.tsx`: The settings page. Now includes tabs: "Bot-Konfiguration" and "Whatsapp Link" (NEW). The WhatsApp tab renders the `WhatsAppLink` component to show link status and QR code. The page is themed to the dark layout and uses Leyla AI branding.
*   `globals.css`: Global CSS styles. Defined CSS variables for `dark`, `rouge`, `luxe`, `gold` and applied overrides for DayPilot. Later, `rouge`, `luxe`, and `gold` were replaced with `elysPink`, `elysViolet`, and `elysBlue` variables. All hardcoded color values and references to old color variables were updated to the new Leyla AI palette, affecting inputs, selects, textareas, buttons, and various DayPilot calendar elements. Comments were updated for Leyla AI branding.
*   `layout.tsx`: The root layout for the application. It includes the main HTML structure and the `Inter` font. The root layout component was updated to set the global background to the deep dark theme color and to include the new DayPilot theme. It was rebranded (`title` metadata updated from `'ElysAI Management Centre'` to `'Leyla Suite'`).
*   `mobile/page.tsx`: The mobile-optimized main page, possibly an alternative entry point for smaller screens or specific mobile functionalities. This page was rebranded (`<h1>` title and "ElysAI Config" link text updated to "Leyla AI"). Its navigation links and colors were updated to the Leyla AI gradient scheme.
*   `page.tsx`: The main dashboard page. It displays an overview of the application and provides links to the other pages, including a new link to the mobile-optimized view. The page was updated to use the new dark theme, rebranded (`alt` for logo, `<h1>` title updated to "Leyla AI"), and its logo size was increased. Emojis were replaced with Heroicons, and all text and button colors were updated to the Leyla AI gradient scheme. Main page containers were redesigned for fixed height, standardized button placement, and the "Configure Bot" container's detailed text was replaced with a minimalist icon badge. The logo `src` was updated from `/branding/ElysAI.png` to `/branding/LeylaAI.png`.
*   `test-chat/page.tsx`: The test chat page. It displays the chat interface for testing the chatbot. This page was converted to the dark theme, including its layout and header. It was rebranded (`alt` for logo updated from "ElysAI" to "Leyla AI", `src` updated from `/branding/ElysAI.png` to `/branding/LeylaAI.png`). Emojis in navigation links were replaced with Heroicons (`ChatBubbleLeftRightIcon`, `DocumentTextIcon`). The header border color was updated. **Recently updated to accept a `sessionId` URL parameter and pass it to the `TestChat` component, enabling loading of existing chat sessions.**
*   `whatsapp/link/page.tsx`: WhatsApp linking helper page. It now uses the reusable `WhatsAppLink` component to render link status and QR code.

##### `components`

The `components` directory contains the reusable React components that are used throughout the application.

*   `BotConfigForm.tsx`: A comprehensive form for configuring the AI bot with advanced options including bot identity, personality settings, character traits, services offered, escalation rules, limitations, behavior guidelines (new editable textarea bound to `behaviorGuidelines`), and automatic system prompt generation with live preview. Icons for sections (`CurrencyEuroIcon`, `UserIcon`, `ChatBubbleLeftRightIcon`, `CogIcon`, `SparklesIcon`) were updated with Leyla AI colors. Table header text color and tab active state colors were updated.
*   `calendar/CalendarPro.tsx`: This component, which renders the main calendar view, was extensively updated to integrate the dark theme, replace emojis with Heroicons in buttons, and update text colors and status badges. It now uses the new DayPilot theme. Its colors were updated to the Leyla AI gradient scheme. Emojis in `getServiceIcon` were replaced with Heroicons (`ChatBubbleLeftRightIcon`, `MagnifyingGlassIcon`, `HeartIcon`, `SparklesIcon`, `BuildingOffice2Icon`, `ExclamationCircleIcon`, `CalendarDaysIcon`) with appropriate `text-elys*` colors. Icons in the availability configuration section (`ClockIcon`, `CalendarIcon`, `CogIcon`) were updated with Leyla AI colors. Icons in the appointment modal (`PlusIcon`, `PencilIcon`, `EyeIcon`, `UserIcon`, `PhoneIcon`, `ClockIcon`) were also updated. During rebranding, `DESCRIPTION` and `LOCATION` in the ICS export, and `PRODID` were updated from "ElysAI" to "Leyla AI".
    - ➕ Added an action button "ICS Feed URL" (with `LinkIcon`) next to "Export ICS" to copy the backend feed URL to the clipboard for easy subscription in external calendars.
*   `chat/ChatInput.tsx`: The chat input component. It contains the input field and the send button.
*   `chat/MessageBubble.tsx`: The message bubble component. It displays a single chat message. **Recently updated to hide the `ToolCallDisplay` component from user view, ensuring only the AI's natural language response is shown. Also, the import for `ToolCallDisplay` was commented out.**
*   `chat/TestChat.tsx`: The main component for the test chat interface. This component was converted to the dark theme, including its container, header, description, and loading animation. It was rebranded (`<h2>` title and `<p>` description updated from "ElysAI" to "Leyla AI"). The loading animation dots color was updated. **Recently modified to accept an `existingSessionId` prop to load previous chat messages when navigating from the "All Chat Sessions" page. It also ensures that AI responses only appear after review approval and includes robust message filtering and polling logic to handle approved and custom replies correctly, replacing pending messages.**
    - ✨ **NEW (2025-10-01):** Implemented intelligent auto-scroll behavior that only scrolls to new messages when the user is near the bottom of the chat (within 100px), preventing interruption when reading older messages.
    - 🐛 **FIXED (2025-10-01):** Resolved React Strict Mode double-initialization issue that caused duplicate chat sessions to be created. Added `sessionInitializedRef` and `lastSessionIdRef` flags to prevent multiple session creations during development.
*   `chat/ToolCallDisplay.tsx`: The component for displaying the AI's tool calls. **This component is now hidden from user view and is only used for internal debugging or development purposes.**
*   `HeaderAuth.tsx`: The authentication header component. This component was updated to match the new dark theme, rebranded (`alt` for logo and `<span>` text updated from "ElysAI" to "Leyla AI"), and its logo size was increased. Its colors were updated to the Leyla AI gradient scheme.
*   `ui/Alert.tsx`: The alert component. It can display different types of messages (info, warning, error, success).
*   `ui/Button.tsx`: The button component. It supports different styles and loading states. Updated to reflect the dark theme's primary, secondary, danger, and ghost button styles, including gradients, hover effects, and shadows. Its colors were updated to the Leyla AI gradient scheme.
*   `ui/Card.tsx`: The card component. It provides a container with a shadow and rounded corners.
*   `ui/Input.tsx`: The input component. It supports labels, icons, and error states. Updated to dark theme. Its colors were updated to the Leyla AI gradient scheme.
*   `ui/Select.tsx`: The select component. It provides a dropdown menu. Updated to dark theme. Its colors were updated to the Leyla AI gradient scheme.
*   `ui/Spinner.tsx`: The spinner component. It displays a spinning animation to indicate loading states.
*   `ui/Switch.tsx`: The switch/toggle component for boolean values with support for both change events and checked change callbacks.
*   `ui/Textarea.tsx`: The textarea component. Updated to dark theme. Its colors were updated to the Leyla AI gradient scheme.
*   `WhatsAppLink.tsx`: (NEW) Reusable component that shows WhatsApp connection status and QR code (uses `/api/whatsapp/status` and `/api/whatsapp/qr`). Used in Settings and in `/whatsapp/link` page.

##### `hooks`

The `hooks` directory contains the custom React hooks that are used throughout the application.

*   `useApi.ts`: Contains the `useApi` and `useFetch` hooks, which provide a convenient way to make API requests and manage loading and error states.

##### `types`

The `types` directory contains the TypeScript type definitions for the frontend.

*   `index.ts`: Contains all the TypeScript type definitions that are used throughout the frontend. **The `ChatMessage` interface's `metadata` property was extended to include `approved?: boolean`, `isCustomReply?: boolean`, `isDraft?: boolean`, and `status?: 'draft' | 'approved' | 'sent' | 'pending';` to support granular message state management.**

##### `utils`

The `utils` directory contains various utility functions that are used throughout the frontend.

*   `api.ts`: Contains the `axios` instances and the API service objects that are used to make API requests to the backend.
*   `index.ts`: Contains various utility functions, including the `cn` function for conditionally joining class names and the `formatTime` function for formatting timestamps.

##### `public`

The `public` directory contains static assets served by the frontend.

*   `themes/calendar_rouge_district.css`: Light calendar theme stylesheet referenced by `app/layout.tsx`. Provides minimal calendar overrides and relies on CSS variables in `src/app/globals.css`.

##### Deployment & Docker

*   `Dockerfile` (root): Builds Next.js with static export (`next export`) and copies the generated files from `frontend/out/` into `backend/public/` so the Express backend can serve the frontend directly. Build args `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` can be provided at build time; defaults point to `http://backend:5000` for Compose networks.
*   `frontend/.dockerignore`: Excludes `node_modules`, `.next`, logs, and local env files from the Docker build context.
*   `deploy/docker-compose.prod.yml`: Production Compose stack for EC2 with `backend`, `frontend`, and `reverse-proxy` (Caddy with HTTPS).
*   `deploy/Caddyfile`: Reverse proxy config routing `/` to `frontend:3000` and `/api`, `/health` to `backend:5000` with automatic TLS.
*   `deploy/backend.env.example.txt`: Example backend environment file for production runtime.
*   `deploy/README.md`: Step-by-step EC2 deployment guide.

### 3.4. `shared`

The `shared` directory contains any shared types or utilities that are used by both the frontend and backend. *Currently, this directory is empty.*

## 4. Project-Wide Variables and Functions

This section provides a list of all the project-wide variables and functions, what they do, in which file they are defined, and which files use them.

### 4.1. Environment Variables

The following environment variables are used in the project. They should be defined in a `.env` file in the root of the `frontend` and `backend` directories.

#### Backend (`backend/.env`)

*   `PORT`: The port that the backend server will run on.
    *   **Defined in:** `backend/.env`
    *   **Used in:** `backend/src/index.ts`
*   `NODE_ENV`: The environment that the backend is running in (e.g., `development`, `production`).
    *   **Defined in:** `backend/.env`
    *   **Used in:** `backend/src/index.ts`, `backend/src/middleware/errorHandler.ts`, `backend/src/models/database.ts`
*   `DB_HOST`: The hostname of the database server.
    *   **Defined in:** `backend/.env`
    *   **Used in:** `backend/knexfile.js`
*   `DB_PORT`: The port of the database server.
    *   **Defined in:** `backend/.env`
    *   **Used in:** `backend/knexfile.js`
*   `DB_NAME`: The name of the database.
    *   **Defined in:** `backend/.env`
    *   **Used in:** `backend/knexfile.js`
*   `DB_USER`: The username for the database.
    *   **Defined in:** `backend/.env`
    *   **Used in:** `backend/knexfile.js`
*   `DB_PASSWORD`: The password for the database.
    *   **Defined in:** `backend/.env`
    *   **Used in:** `backend/knexfile.js`
*   `DB_SSL`: Whether to use SSL for the database connection.
    *   **Defined in:** `backend/.env`
    *   **Used in:** `backend/knexfile.js`
*   `FRONTEND_URL`: The URL of the frontend application.
    *   **Defined in:** `backend/.env`
    *   **Used in:** `backend/src/index.ts`
*   `OPENAI_API_KEY`: The API key for the OpenAI API.
    *   **Defined in:** `backend/.env`
    *   **Used in:** `backend/src/services/aiService.ts`
*   `OPENAI_MODEL`: The OpenAI model to use for the chatbot.
    *   **Defined in:** `backend/.env`
    *   **Used in:** `backend/src/services/aiService.ts`
*   `OPENAI_CONTENT_FILTER`: Enables/disables OpenAI's built-in content filtering (`true`/`false`).
    *   **Defined in:** `backend/.env`
    *   **Used in:** `backend/src/services/aiService.ts`
*   `OPENAI_ALLOW_EXPLICIT`: Allows the AI to generate explicit/adult content when appropriate (`true`/`false`).
    *   **Defined in:** `backend/.env`
    *   **Used in:** `backend/src/services/aiService.ts`
*   `WHATSAPP_VERIFY_TOKEN`: The verify token for the WhatsApp webhook.
    *   **Defined in:** `backend/.env`
    *   **Used in:** `backend/src/routes/whatsapp.ts`
*   `WHATSAPP_ACCESS_TOKEN`: The access token for the WhatsApp API.
    *   **Defined in:** `backend/.env`
    *   **Used in:** `backend/src/services/whatsappService.ts`
*   `WHATSAPP_PHONE_NUMBER_ID`: The phone number ID for the WhatsApp API.
    *   **Defined in:** `backend/.env`
    *   **Used in:** `backend/src/services/whatsappService.ts`
*   `WHATSAPP_TYPING_DELAY`: Enables/disables realistic typing delays for bot responses (`true`/`false`).
    *   **Defined in:** `backend/.env`
    *   **Used in:** `backend/src/utils/typingDelay.ts`

#### Frontend (`frontend/.env`)

*   `NEXT_PUBLIC_API_URL`: The URL of the backend API.
    *   **Defined in:** `frontend/.env`
    *   **Used in:** `frontend/src/utils/api.ts`
*   `CUSTOM_KEY`: An example of a custom environment variable.
    *   **Defined in:** `frontend/.env`
    *   **Used in:** `frontend/next.config.js`

## 8. Docker Self-Hosting

### 8.1. Overview

The project ships with Docker support to self-host both services:

- Frontend (Next.js) exposed on port 3000
- Backend (Express) exposed on port 5000

### 8.2. Files

- `docker-compose.yml`: Orchestrates both services
- `Dockerfile` (root): Builds the Next.js app (frontend)
- `backend/Dockerfile`: Builds the Node.js backend
- `frontend/.dockerignore`, `backend/.dockerignore`: Optimize Docker context

### 8.3. Environment Variables

Use a `.env` file in the project root (not committed) to provide secrets:

```
# Frontend will talk to backend via service name inside the compose network
NEXT_PUBLIC_API_URL=http://backend:5000
NEXT_PUBLIC_SOCKET_URL=http://backend:5000

# Backend
PORT=5000
NODE_ENV=production
FRONTEND_URL=http://localhost:3000
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini (WICHTIG: Muss ein gültiges OpenAI Modell sein, z.B. gpt-4o-mini, gpt-4-turbo, gpt-4o)
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# Optional DB settings (Postgres in production). Defaults use SQLite file volume
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_SSL=false
```

### 8.4. Build & Run

Run the stack on ports 3000 (frontend) and 5000 (backend):

```
docker compose build ; docker compose up -d
```

Access:

- Frontend: http://localhost:3000
- Backend health: http://localhost:5000/health

### 8.4.1. Render Deployment (Single Service)

When deploying as a single service on Render:
- The backend serves the static frontend from `backend/public/`.
- Make sure the build creates `frontend/out/` and copies it to `backend/public/` (handled by root `Dockerfile`).
- Health check: `GET /health` (HEAD / also returns 200 for probes).
- API base URL in the frontend must be set via `NEXT_PUBLIC_API_URL` (e.g., `https://<your-service>.onrender.com`).

### 8.5. Volumes & Data

- `backend-data` volume stores the SQLite DB under `/app/database` inside the backend container.

### 8.6. Notes

- In Docker, frontend uses `http://backend:5000` to access the API via Compose DNS.
- For local dev outside Docker, it will fall back to `http://localhost:5000`.
- Production (single service like Render): Frontend is statically exported and served by Express from `backend/public/`. Ensure `/app/backend/public/index.html` exists at runtime.

### 8.6.1. WhatsApp Integration via WasenderAPI

The project now uses WasenderAPI instead of `whatsapp-web.js` for WhatsApp connectivity. This removes the need for local Chromium and session storage.

Configuration (backend env):

```
WASENDER_API_BASE_URL=https://api.wasenderapi.com
WASENDER_API_TOKEN=<personal-access-token>
WASENDER_SESSION_ID=<optional: session id>
WASENDER_WEBHOOK_SECRET=<optional: for signature verification>
```

Key backend pieces:

- `backend/src/services/wasenderApiClient.ts`: minimal REST client for status, QR, send message, connect session, delete session
    - ✨ **NEW (2025-10-01):** Added `getMessageHistory(sessionId, limit, offset)` function that attempts to retrieve historical messages from WasenderAPI by trying multiple possible endpoint patterns (`/api/whatsapp-sessions/{sessionId}/messages`, `/api/messages`, etc.)
    - ✨ **NEW (2025-10-01):** Added `getChatList(sessionId)` function that attempts to retrieve chat/conversation lists from WasenderAPI by trying multiple possible endpoint patterns
- `backend/src/routes/whatsapp.ts`: proxies `status`, `qr`, and `send` to WasenderAPI
    - ✨ **NEW (2025-10-01):** Added experimental test endpoints for WasenderAPI capability discovery:
        - `GET /api/whatsapp/test/list-sessions` → lists all WasenderAPI sessions with their IDs, status, and phone numbers
        - `GET /api/whatsapp/test/message-history/:sessionId?limit=50&offset=0` → tests if WasenderAPI supports message history retrieval
        - `GET /api/whatsapp/test/chat-list/:sessionId` → tests if WasenderAPI supports chat list retrieval
- `backend/src/routes/webhooks.ts`: webhook endpoint `/api/webhooks/wasender` with optional signature verification
- `backend/src/index.ts`: mounts the webhook route and retains raw request body for signature verification
- `backend/src/services/whatsappService.ts`: uses `WasenderApiClient` to send outgoing messages

Available endpoints:

- `GET /api/whatsapp/status` → returns `{ status, meNumber, qrAvailable }` sourced from WasenderAPI
- `GET /api/whatsapp/qr` → returns `{ dataUrl }` (PNG data URL of current QR, if available). Will attempt to `connectSession()` to trigger QR when needed
- `POST /api/whatsapp/send` body `{ to: "+491701234567", message: "Hallo" }` → sends via WasenderAPI
- `POST /api/webhooks/wasender` → configure this URL in WasenderAPI dashboard for events (e.g., `messages.upsert`, `messages.received`)

Per-user session endpoints (auth required):

- `POST /api/whatsapp/user/session/ensure` body `{ phoneNumber: "+491701234567" }` → creates (if missing) a Wasender session for the current user and stores its id in `users.wasender_session_id`. If `phoneNumber` is provided, it updates the user's `phone` column and sends it to Wasender when creating the session.
- `GET /api/whatsapp/user/status` → returns current status and associated `sessionId` for the logged-in user
- `GET /api/whatsapp/user/qr` → returns `{ dataUrl }` QR PNG for the user's session
- `DELETE /api/whatsapp/user/session` → deletes the user's Wasender session from both WasenderAPI and local database. Clears the stored `wasender_session_id` and forces creation of a new session on next `/ensure` call.

**Experimental test endpoints (2025-10-01):**

- `GET /api/whatsapp/test/list-sessions` → lists all available WasenderAPI sessions to help identify session IDs for testing
- `GET /api/whatsapp/test/message-history/:sessionId` → attempts to retrieve message history from WasenderAPI (tests multiple endpoint patterns to discover if supported)
- `GET /api/whatsapp/test/chat-list/:sessionId` → attempts to retrieve chat lists from WasenderAPI (tests multiple endpoint patterns to discover if supported)

Frontend UI:

- Settings → "Whatsapp Link" tab renders `WhatsAppLink` component
- If a JWT is present, the component shows a phone number input (E.164 format) and buttons:
  - "Create/Ensure My Session" → calls `POST /api/whatsapp/user/session/ensure`
  - "Generate QR / Start Linking" → calls `GET /api/whatsapp/user/qr`
  - "Delete Session" → calls `DELETE /api/whatsapp/user/session` (appears when session exists, with confirmation dialog)
- Success and error messages are displayed with color-coded styling
- The delete button removes the session from both WasenderAPI and local database

Webhook signature verification:

- If `WASENDER_WEBHOOK_SECRET` is set, the backend verifies the signature header (`x-wasender-signature` or `x-signature` or `x-hub-signature-256`) using HMAC SHA-256 over the raw request body.
- Ensure raw body is preserved: `index.ts` attaches `req.rawBody` in the `express.json({ verify })` hook.
- Mismatched signatures return 401.

First-time setup flow with WasenderAPI:

1. Start stack: `docker compose up -d`
2. Generate a Personal Access Token in WasenderAPI and set `WASENDER_API_TOKEN`
3. Open `http://localhost:5000/api/whatsapp/status` to see current status
4. If status requires QR, open `http://localhost:5000/api/whatsapp/qr` and scan with WhatsApp on your phone
5. Configure webhook URL in WasenderAPI dashboard → `https://<domain>/api/webhooks/wasender`
6. Send a test message with `POST /api/whatsapp/send`

### 8.7. AWS Production Deployment (Recommended)

- **Location**: See `aws-deploy/`.
- **Requirements**: AWS account, GitHub repository, OpenAI API key.
- **Estimated Costs**: ~30-50€/month (optimized), ~55-120€/month (standard)

**Quick start:**

```bash
# 1. Follow comprehensive guide
open aws-deploy/AWS_DEPLOYMENT_GUIDE.md

# Or for experienced users
open aws-deploy/QUICK_START.md
```

**Services:**
- **AWS App Runner Backend**: Auto-scaling Node.js container (1-5 instances)
- **AWS RDS PostgreSQL**: Managed database (db.t3.micro, Free Tier eligible)
- **S3 + CloudFront** (optional): Static frontend hosting (~3-5€/month)
- **Automatic HTTPS/SSL**: Built-in with App Runner
- **CI/CD**: Auto-deploy on Git push

**Deployment Steps:**
1. Create RDS PostgreSQL database (15 min)
2. Migrate SQLite data to PostgreSQL (5 min)
3. Create App Runner service from GitHub (20 min)
4. Configure environment variables (5 min)
5. Deploy frontend (10 min)
6. Optional: Custom domain setup (15 min)

**Features:**
- ✅ Auto-scaling (handles 1000+ users)
- ✅ Zero-downtime deployments
- ✅ Automated backups (RDS)
- ✅ CloudWatch monitoring & logs
- ✅ 99.9% uptime SLA

**Cost Optimization:**
See `aws-deploy/COST_OPTIMIZATION.md` for strategies to reduce costs by ~50%:
- Frontend on S3 + CloudFront: Save ~30€/month
- RDS Reserved Instances: Save 40%
- Auto-scaling optimization
- CloudWatch log retention tuning

### 8.8. AWS EC2 Production Deployment (Alternative)

- **Location**: See `deploy/`.
- **Requirements**: A domain pointing to EC2, ports 80/443 open, Docker installed.
- **Quick start (on EC2)**:

```
cd WhatsappBot/deploy
Copy .\backend.env.example.txt .\backend.env ; Copy .\.env.prod.example .\.env.prod
# Edit .env.prod: DOMAIN, PUBLIC_ORIGIN, ACME_EMAIL, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL
docker compose -f docker-compose.prod.yml --env-file .env.prod build ; docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

- **Services**:
  - `reverse-proxy`: Caddy terminating TLS for `${DOMAIN}`
  - `frontend`: Next.js (port 3000, internal)
  - `backend`: Express API (port 5000, internal) with SQLite volume `backend-data`

- **Public URLs**:
  - Frontend: `https://${DOMAIN}`
  - API: `https://${DOMAIN}/api`
  - Health: `https://${DOMAIN}/health`

**Note**: AWS App Runner (section 8.7) is recommended over EC2 for easier management and auto-scaling.

### 4.2. Functions

This section provides a list of the most important functions in the project, what they do, in which file they are defined, and which files use them.

#### Backend

*   **`asyncHandler`**
    *   **Description:** A higher-order function that wraps async route handlers and passes any errors to the error handling middleware. This avoids the need for a `try...catch` block in every async route handler.
    *   **Defined in:** `backend/src/middleware/errorHandler.ts`
    *   **Used in:**
        *   `backend/src/routes/appointments.ts`
        *   `backend/src/routes/bot.ts`
        *   `backend/src/routes/calendar.ts`
        *   `backend/src/routes/whatsapp.ts`
*   **`generateTimeSlots`**
    *   **Description:** A utility function that generates all possible appointment slots for a given day based on the weekly schedule.
    *   **Defined in:** `backend/src/utils/calendarUtils.ts`
    *   **Used in:**
        *   `backend/src/routes/calendar.ts`
        *   `backend/src/routes/appointments.ts`
*   **`isBlackoutDate`**
    *   **Description:** A utility function that checks if a given date falls on a blackout day.
    *   **Defined in:** `backend/src/utils/calendarUtils.ts`
    *   **Used in:**
        *   `backend/src/routes/calendar.ts`
        *   `backend/src/routes/appointments.ts`
*   **`TypingDelayService.calculateTypingDelay`**
    *   **Description:** Calculates realistic typing delay based on message length (2.5 chars/second) plus random delay (4-15 seconds).
    *   **Defined in:** `backend/src/utils/typingDelay.ts`
    *   **Used in:**
        *   `backend/src/utils/typingDelay.ts` (internal)
*   **`TypingDelayService.applyTypingDelay`**
    *   **Description:** Calculates and applies realistic typing delay for bot responses to simulate human-like response timing.
    *   **Defined in:** `backend/src/utils/typingDelay.ts`
    *   **Used in:**
        *   `backend/src/services/whatsappService.ts`
        *   `backend/src/routes/bot.ts`
*   **`TypingDelayService.delay`**
    *   **Description:** A utility function that creates a Promise-based delay for a specified number of milliseconds.
    *   **Defined in:** `backend/src/utils/typingDelay.ts`
    *   **Used in:**
        *   `backend/src/utils/typingDelay.ts` (internal)
*   **`whatsappService.handleIncomingMessage`**
    *   **Description:** Processes incoming WhatsApp messages with full workflow: stores user message, generates AI response, applies typing delay, sends to WhatsApp, manages draft/sent status.
    *   **Defined in:** `backend/src/services/whatsappService.ts`
    *   **Used in:**
        *   `backend/src/routes/whatsapp.ts`
*   **`whatsappService.handleTestMessage`**
    *   **Description:** Processes test chat messages with identical logic to WhatsApp (user message storage, AI response generation, typing delay, draft/sent status) but without sending to WhatsApp.
    *   **Defined in:** `backend/src/services/whatsappService.ts`
    *   **Used in:**
        *   `backend/src/routes/bot.ts`

#### Frontend

*   **`useApi`**
    *   **Description:** A custom React hook that provides a convenient way to make API requests and manage loading and error states. It returns an `execute` function that can be called to trigger the API request.
    *   **Defined in:** `frontend/src/hooks/useApi.ts`
    *   **Used in:**
        *   `frontend/src/components/BotConfigForm.tsx`
*   **`useFetch`**
    *   **Description:** A custom React hook that is built on top of `useApi`. It automatically fetches data when the component mounts and when the dependencies change. It also returns a `refetch` function that can be called to manually re-trigger the API request.
    *   **Defined in:** `frontend/src/hooks/useApi.ts`
    *   **Used in:**
        *   `frontend/src/components/Calendar.tsx`
        *   `frontend/src/components/BotConfigForm.tsx`

## 5. Advanced Bot Configuration System

### 5.1. Configuration Fields

The enhanced bot configuration system provides comprehensive customization options:

#### Bot Identity
*   **Bot Name**: Custom name for the AI assistant (e.g., "Dr. Schmidt's Assistent")
*   **Bot Description**: Detailed description of the bot's purpose and role

#### Personality & Tonality
*   **Personality Tone**: Nine different communication styles:
    *   Professional: Formal and business-like
    *   Friendly: Warm and welcoming  
    *   Casual: Relaxed and informal
    *   Flirtatious: Charming and playful
    *   Direct: Clear and to the point
    *   Emotional: Empathetic and understanding
    *   Warm: Caring and supportive
    *   Confident: Self-assured and competent
    *   Playful: Humorous and light
*   **Character Traits**: Customizable personality characteristics

#### Services & Background
*   **Background Information**: What the bot should know about itself
*   **Services Offered**: Detailed list of available services and capabilities
*   **Escalation Rules**: Conditions for human-in-the-loop handover
*   **Bot Limitations**: Clear boundaries of what the bot cannot/should not do

### 5.2. System Prompt Generation

The system automatically generates comprehensive system prompts from the configuration fields using the `generateSystemPrompt` function:

*   **Structure**: Organized sections `<tone>`, `<background>`, `<services>`, `<escalation>`, `<limitations>`, and `<behavior>`
*   **Dynamic Content**: Automatically incorporates all configuration values
*   **Behavior Merge**: Uses `behaviorGuidelines` from the UI to fill `<behavior>`; on first load attempts to extract `<behavior>` from existing stored prompt to preserve legacy content
*   **Live Preview**: Real-time preview of generated prompt in the configuration interface
*   **Validation**: Ensures all critical information is included

### 5.3. Database Schema Extensions

The `bot_configs` table has been extended with the following fields:

*   `bot_name`: VARCHAR - Custom bot name
*   `bot_description`: TEXT - Bot description and purpose
*   `personality_tone`: ENUM - Selected personality tone
*   `character_traits`: TEXT - Character traits description
*   `background_info`: TEXT - Background information
*   `services_offered`: TEXT - Available services
*   `escalation_rules`: TEXT - Human handover conditions
*   `bot_limitations`: TEXT - Bot boundaries and restrictions
*   `generated_system_prompt`: TEXT - Auto-generated system prompt

### 5.4. Configuration Interface

The `BotConfigForm` component provides:

*   **Sectioned Layout**: Organized into logical groups (Identity, Personality, Services, Rules)
*   **Real-time Updates**: Live generation of system prompts as fields change
*   **Preview Functionality**: Expandable preview of the generated system prompt
*   **Validation**: Form validation and error handling
*   **Auto-save**: Automatic prompt generation and storage

## 6. Services & Pricing Management

### 6.1. Service Management Features

The services management system allows comprehensive configuration of bot services and pricing:

#### Services Tab
*   **Tabbed Interface**: Separate tab in bot configuration for services management
*   **Service Table**: Professional table view showing services, prices, and durations
*   **CRUD Operations**: Create, Read, Update, Delete services with full form validation
*   **Multi-Currency Support**: EUR, USD, CHF currency options
*   **Service Details**: Name, description, price, duration, and sorting options

#### Service Data Structure
*   **Service Name**: Display name for the service
*   **Description**: Optional detailed service description  
*   **Price & Currency**: Decimal pricing with currency selection
*   **Duration**: Optional appointment duration in minutes
*   **Sort Order**: Custom ordering for service display
*   **Active Status**: Enable/disable services without deletion

### 6.2. Database Schema

#### Services Table
*   `id`: UUID primary key
*   `bot_config_id`: Foreign key to bot_configs table
*   `name`: VARCHAR - Service name
*   `description`: TEXT - Optional service description
*   `price`: DECIMAL(10,2) - Service price
*   `currency`: VARCHAR - Currency code (EUR, USD, CHF)
*   `duration_minutes`: INTEGER - Optional duration
*   `is_active`: BOOLEAN - Soft delete flag
*   `sort_order`: INTEGER - Display ordering
*   `created_at`, `updated_at`: Timestamps

### 6.3. API Integration

#### Services API Endpoints
*   **GET /api/services/:botConfigId**: Retrieve all active services
*   **POST /api/services/:botConfigId**: Create new service
*   **PUT /api/services/:serviceId**: Update existing service
*   **DELETE /api/services/:serviceId**: Soft delete service

#### Frontend Integration
*   **Real-time Updates**: Immediate refresh after CRUD operations
*   **Form Validation**: Client-side validation with error handling
*   **Loading States**: Progressive loading and success feedback
*   **Responsive Design**: Mobile-friendly table and form layouts

### 6.4. User Experience Features

*   **Empty State**: Helpful guidance when no services exist
*   **Inline Editing**: Quick edit functionality with modal forms
*   **Price Formatting**: Automatic currency formatting with Intl.NumberFormat
*   **Confirmation Dialogs**: Safety confirmations for delete operations
*   **Success Feedback**: Toast notifications for successful operations

## 7. Advanced Calendar Management System

### 7.1. Calendar Features

The calendar system provides comprehensive appointment and availability management:

#### Calendar View
*   **Interactive Calendar**: Built on `react-big-calendar` with German localization
*   **Multiple Views**: Month, Week, Day, and Agenda views
*   **Appointment Management**: Click to create/edit appointments, drag-and-drop support
*   **Color-Coded Status**: Visual indicators for appointment status:
    *   Cyan: Booked appointments (standard status from AI bot)
    *   Green: Confirmed appointments
    *   Yellow: Pending appointments
    *   Red: Cancelled appointments (visible with strike-through)
    *   Red: No-Show appointments (removed from calendar, visible in lists)
    *   Purple: Completed appointments
*   **Quick Actions**: New appointment button, appointment details modal, export ICS, copy ICS feed URL
*   **Real-time Updates**: Automatic refresh after changes

#### Appointment Modal
*   **Customer Information**: Name, phone, email fields (all populated from AI bot data)
*   **Appointment Details**: Date/time picker, duration, appointment type
*   **Appointment Types**: Dynamic service types loaded from bot configuration
*   **Status Management**: Pending, Booked, Confirmed, Cancelled, Completed, No-Show
*   **Notes Field**: Additional information storage
*   **CRUD Operations**: Create, Read, Update, Delete appointments
*   **Enhanced Display**: Proper datetime formatting, improved validation
*   **Cancelled Events**: Remain visible in red for billing purposes
*   **No-Show Management**: Mark appointments as no-show, removes from calendar but keeps record

#### Availability Management
*   **Weekly Schedule**: Configure available days and time slots
*   **Multiple Time Slots**: Support for split schedules (e.g., morning/afternoon)
*   **Day-specific Settings**: Individual configuration per weekday
*   **Blackout Dates**: Block specific dates with optional reasons
*   **Real-time Preview**: Immediate visual feedback

### 7.2. Bot-Calendar Integration

The AI bot seamlessly integrates with the calendar system through tool functions:

#### Available Tools
*   **`checkAvailability`**: Bot can query available appointment slots
    *   Parameters: date, duration
    *   Returns: **Continuous time blocks** instead of individual slots (e.g., "09:00 bis 12:00, 14:00 bis 17:00")
    *   **Smart Merging**: Automatically merges adjacent time slots into readable blocks
    *   Respects weekly schedule and blackout dates (uses active bot config)
    *   Includes a formatted message for the bot to use directly
*   **`bookAppointment`**: Bot can create new appointments
    *   Parameters: customerName, customerPhone, customerEmail, datetime, duration, appointmentType, notes
    *   Returns: Created appointment with confirmation
    *   Automatic status setting to 'booked' and validation (uses active bot config)
    *   **Enhanced Data Collection**: Now captures customer email and appointment service type
    *   **Multi-Tenant Support**: Automatically assigns appointments to the default account (first account in system)
*   **`findAppointments`**: Bot can search for existing appointments by customer phone number
    *   Parameters: customerPhone
    *   Returns: Array of active appointments for the customer
    *   Filters out cancelled and no-show appointments automatically
    *   **Smart Phone Matching**: Handles different phone number formats (+49, 0049, etc.)
*   **`cancelAppointment`**: Bot can cancel existing appointments
    *   Parameters: appointmentId, reason (optional)
    *   Returns: Confirmation with cancelled appointment details
    *   Updates appointment status to 'cancelled' and optionally adds cancellation reason to notes
    *   **Safety Check**: Prevents cancelling already-cancelled appointments

#### Integration Benefits
*   **Seamless Booking**: Customers can book directly through WhatsApp
*   **Real-time Availability**: Bot always has current availability data
*   **Automatic Updates**: Calendar updates immediately after bot bookings
*   **Conflict Prevention**: Built-in validation prevents double bookings
*   **Professional Workflow**: Appointments appear in calendar interface

### 5.5. Calendar UX Enhancements for 24/7 Operations
### 7.6. ICS Export & Calendar Subscription

**Frontend:**
- "Export ICS" button in `CalendarPro` creates a one-time `.ics` file of the currently loaded appointments.
- "ICS Feed URL" button copies the subscription feed URL to clipboard.

**Backend Endpoint:**
- `GET /api/calendar/ics` returns `text/calendar` with appointments.
- Optional query params: `startDate`, `endDate` (format `YYYY-MM-DD`).
- Optional per-user param: `token` (private `calendar_feed_token`); scopes feed to that user's account.

**Per-User Feed Tokens:**
- Migration: `20250913090000_add_calendar_feed_token_to_users.js`
- Endpoint to retrieve (auth required): `GET /api/bot/me` → `{ calendarFeedToken }`
- UI: "ICS Feed URL" versucht automatisch den Token anzuhängen, wenn verfügbar.

**How to use with Google Calendar:**
1. Copy the feed URL (e.g., `https://<domain>/api/calendar/ics`).
2. Google Calendar → Other calendars → From URL → paste the URL → Add calendar.
3. Google periodically refreshes the feed (not instant). For immediate testing, download the one-time export.

**Notes:**
- Feed includes appointment `SUMMARY` (customer name and type), `DESCRIPTION` (notes), and `STATUS`.
- Time handling: stored local times are exported as UTC (Z) per iCal requirements.

#### Anti-Scrolling Features for Round-the-Clock Businesses
For businesses operating 24/7, the calendar now provides multiple solutions to minimize scrolling:

**Zoom Levels:**
*   **24h Compact**: Ultra-compact view (15px cells) showing full 24-hour day without scrolling
*   **Normal**: Balanced view (25px cells) for standard use
*   **Groß**: Spacious view (35px cells) for detailed work

**Smart Time Management:**
*   **Dynamic Business Hours**: Automatically detects relevant time ranges from actual appointments
*   **Intelligent Focus**: Shows 6 AM to 10 PM by default, extends based on actual bookings
*   **Auto-Scroll**: Automatically positions view at current time or next appointment on load

**Navigation Aids:**
*   **"Jetzt" Button**: Instantly jump to current time in Day/Week views
*   **Optimal Positioning**: Calendar starts at most relevant time, not midnight
*   **Context-Aware**: Considers both business hours and actual appointment times

### 5.6. Recent Appointment System Enhancements

#### Enhanced AI Bot Integration
*   **Extended Data Collection**: AI bot now captures customer email and appointment service type
*   **Improved Status System**: New 'booked' status as default for AI-created appointments
*   **Better Tool Parameters**: `bookAppointment` tool enhanced with customerEmail and appointmentType fields

#### Calendar View Improvements  
*   **Cancelled Event Visibility**: Cancelled appointments remain visible in red for billing/record-keeping
*   **Enhanced Status Colors**: Added cyan color for 'booked' status, improved red for cancelled
*   **Better DateTime Handling**: Fixed "Invalid Date" issues with robust datetime parsing
*   **Complete Data Display**: All appointment fields now properly populated in view modal
*   **Smart Scrolling Solution**: Multiple options to reduce scrolling in 24h operations:
    *   **Compact View**: 24h mode with smaller cell height for full day visibility
    *   **Dynamic Time Range**: Automatically focuses on relevant business hours
    *   **Auto-Scroll**: Automatically scrolls to current time or next appointment
*   **Availability Highlighting**: Available time slots are now visually highlighted:
    *   **Background Colors**: Subtle color coding for business vs non-business hours
    *   **Border Accents**: Visual borders to distinguish available times
    *   **Theme Integration**: Colors match the overall design (elysViolet/elysPink)
*   **No-Show Management**: New status for tracking patient no-shows:
    *   **Separate Status**: Distinct from cancelled appointments
    *   **Visual Distinction**: Dark red coloring with warning icons
    *   **Billing Tracking**: Remains visible for accounting purposes

#### Status Workflow
1. **Pending** (Yellow): Manual appointments awaiting confirmation
2. **Booked** (Cyan): Initial status when AI bot creates appointment
3. **Confirmed** (Green): Manually confirmed by staff  
4. **Cancelled** (Red): Cancelled but kept visible for records
5. **No-Show** (Dark Red): Patients who didn't show up - tracked separately
6. **Completed** (Purple): Successfully completed appointments

## 6. Content Policy & Explicit Content

### 6.1. OpenAI Content Filtering Configuration

The bot supports configurable content filtering to allow for more open conversations when appropriate:

**Environment Variables:**
```bash
OPENAI_CONTENT_FILTER=false      # Disables built-in content filtering
OPENAI_ALLOW_EXPLICIT=true       # Allows explicit/adult content generation
```

**Important Considerations:**
*   **Legal Compliance**: Ensure compliance with local laws and regulations
*   **Age Verification**: Implement age checks for explicit content
*   **User Consent**: Always obtain explicit user consent for mature content
*   **Business Context**: Consider if explicit content aligns with your business goals
*   **WhatsApp ToS**: Verify compliance with WhatsApp's Terms of Service

**Example Usage:**
When `OPENAI_ALLOW_EXPLICIT=true`, the system prompt automatically includes:
```
CONTENT POLICY:
- Du kannst offen über alle Themen sprechen, einschließlich expliziter/erotischer Inhalte
- Achte darauf, dass der Nutzer volljährig ist (18+) bei expliziten Themen
- Verwende angemessene Sprache basierend auf dem Kontext
- Respektiere immer Grenzen und Einverständnis
```

**Recommended Settings by Use Case:**
*   **Business/Professional**: `OPENAI_ALLOW_EXPLICIT=false`
*   **Healthcare/Therapy**: `OPENAI_CONTENT_FILTER=false`, `OPENAI_ALLOW_EXPLICIT=false`
*   **Adult Entertainment**: `OPENAI_CONTENT_FILTER=false`, `OPENAI_ALLOW_EXPLICIT=true`
*   **Personal Assistant**: Based on user preference

## 7. Light Theme & Leyla AI Branding
The application features a clean, trust-focused light theme with Leyla AI branding, optimized for readability and accessibility.

### 7.1. Color Scheme

The application uses a sophisticated dark color palette that balances professionalism with a modern, branded aesthetic:

#### Base Colors (Light Theme)
*   **Dark 900** (`#F8FAFC`): Page background
*   **Dark 800** (`#F1F5F9`): Primary light background
*   **Dark 700** (`#FFFFFF`): Card backgrounds and elevated elements
*   **Dark 600** (`#E2E8F0`): Borders and dividers
*   **Dark 500-50**: Progressive darkening for text (`#CBD5E1` → `#0F172A`)

#### Accent Colors (Leyla AI Branding)
*   **ElysPink** (from `#c00e9d` to `#9a0b7d`): Primary brand pink for highlights and interactive elements
*   **ElysViolet** (mid-gradient, e.g., `#741c8f`): Secondary brand violet for accents
*   **ElysBlue** (to `#2929a6`): Tertiary brand blue for complementary elements

### 7.2. Styling Implementation

#### Tailwind Configuration
The color scheme is implemented through custom Tailwind CSS colors in `frontend/tailwind.config.js`:
*   **Neutral Remap**: The `dark` scale is repurposed as light neutrals (e.g., `dark.900 = #F8FAFC`, `dark.700 = #FFFFFF`, `dark.50 = #0F172A`) to avoid changing existing class names across components.
*   **Brand Colors**: `elysBlue`, `elysViolet`, `elysPink` retained for accents and CTAs.

#### Global Styles
Updated styling in `frontend/src/app/globals.css` includes:
*   **CSS Variables**: Light theme tokens for background and text; aliases added for legacy variables (`--rouge-*`, `--luxe-*`, `--gold-*`).
*   **Color Scheme**: `html { color-scheme: light; }` replacing the previous forced dark.
*   **Forms & Buttons**: Focus rings and gradients aligned to brand blue/violet for a trustful look.
*   **Calendar Theming**: Light theme applied to DayPilot and react-big-calendar via CSS Custom Properties and theme overrides.

### 7.3. Component-Specific Styling

#### Calendar Components
*   **Headers**: Leyla AI branded text on dark backgrounds with elysPink accents
*   **Events**: Gradient backgrounds with status-based coloring:
    *   Confirmed: ElysPink gradient (`event-confirmed`)
    *   Pending: ElysViolet gradient (`event-pending`)
    *   Completed: ElysBlue gradient (`event-completed`)
    *   Cancelled: Muted gray (`event-cancelled`)

#### Interactive Elements
*   **Hover Effects**: Smooth transitions with transform and shadow effects
*   **Focus States**: ElysPink outline with offset for accessibility
*   **Loading States**: ElysPink-themed spinners and animations
*   **Scrollbars**: Custom styled with elysPink-elysViolet gradients

### 7.4. Responsive Design
*   **Mobile Optimizations**: Reduced animations and simplified effects on mobile devices
*   **Accessibility**: High contrast ratios maintained for readability
*   **Professional Appearance**: Luxurious but discreet for business environments

### 7.5. Usage Guidelines

#### Color Usage Patterns
*   **Primary Actions**: ElysPink gradients for main CTAs and active states
*   **Secondary Actions**: ElysViolet borders and text for secondary interactions
*   **Status Indicators**: ElysBlue colors for completed/success states
*   **Background Elements**: Progressive dark shades for depth and hierarchy

#### Implementation Files
*   **Colors**: `frontend/tailwind.config.js`
*   **Global Styles**: `frontend/src/app/globals.css`
*   **Components**: All frontend components utilize the theme through Tailwind classes.
*   **DayPilot Theme**: `frontend/public/themes/calendar_rouge_district.css` (updated with Leyla AI colors)

## 8. Docker Deployment

The application supports Docker containerization for easy deployment and self-hosting.

### 8.1. Docker Configuration Files

*   **`Dockerfile` (frontend)**: Multi-stage build for Next.js application with standalone output
*   **`backend/Dockerfile`**: Node.js backend with TypeScript compilation and database migrations
*   **`docker-compose.yml`**: Orchestrates frontend, backend, and database services
*   **`.dockerignore`**: Excludes unnecessary files from Docker builds

### 8.2. Deployment Commands

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild after code changes
docker compose build
docker compose up -d
```

### 8.3. Technical Implementation

#### Database Schema
*   **Appointments Table**: Customer data, scheduling information, status tracking
*   **Availability Configs**: Weekly schedules, time slots, settings
*   **Blackout Dates**: Date-specific availability blocking

#### API Integration
*   **Calendar API**: Overview statistics, availability checking
*   **Appointments API**: Full CRUD operations for appointment management
*   **Real-time Sync**: Frontend and bot share same data source

#### Component Architecture
*   **Tabbed Interface**: Separate views for calendar and availability
*   **Modal System**: Overlay interface for appointment management  
*   **State Management**: React hooks for data synchronization
*   **Error Handling**: Comprehensive error states and user feedback

---

## 🆕 Neuerungen - September 2025

### 🤖 Erweiterte Terminverwaltungs-Tools
**Neue Bot-Funktionen für Terminmanagement:**
- **`findAppointments`**: Bot kann bestehende Termine eines Kunden über Telefonnummer suchen
  - Automatisches Filtern von stornierten und No-Show-Terminen
  - Smart Phone Matching für verschiedene Nummernformate
  - Vollständige Termindetails (ID, Name, Datum, Dauer, Status, Typ, Notizen)
  
- **`cancelAppointment`**: Bot kann Termine stornieren
  - Stornierung via Termin-ID mit optionalem Grund
  - Safety Check gegen doppelte Stornierung
  - Automatisches Hinzufügen des Grundes zu den Notizen

**System-Prompt Integration:**
- Alle verfügbaren Tools werden jetzt im generierten System-Prompt dokumentiert
- Workflow-Beispiele für typische Kundenanfragen
- Klare Anweisungen wann welches Tool zu nutzen ist
- Multi-Tenant Support: Bot-Termine werden automatisch dem richtigen Account zugeordnet

**Technische Verbesserungen:**
- **Multi-Tenant Isolation**: Alle Tools nutzen jetzt die `account_id` aus der Chat-Session
- **Session-Account Verknüpfung**: Neue Migration fügt `account_id` zu `test_chat_sessions` hinzu
- **Account-basiertes Filtern**: `checkAvailability`, `bookAppointment`, `findAppointments`, `cancelAppointment` arbeiten nur mit Terminen des aktuellen Accounts
- **WhatsApp-Nummer im Kontext**: Bei WhatsApp-Chats wird die Telefonnummer automatisch an die KI übergeben
  - KI kennt die Telefonnummer des Chatpartners automatisch
  - Kein erneutes Abfragen der Nummer nötig
  - `findAppointments` nutzt automatisch die WhatsApp-Nummer
- Erweiterte Logging für besseres Debugging
- Automatische Account-ID Zuweisung bei Session-Erstellung
- Sichtbarkeit von Bot-Terminen im Frontend-Kalender garantiert
- **Aktuelles Datum im System-Prompt**: KI erhält jetzt das korrekte aktuelle Datum (`currentDate` und `currentDateTime`) für präzise Terminberechnungen
- **Smart Time Block Merging**: `calculateFreeTimeBlocks()` berechnet freie Zeitblöcke direkt ohne überlappende Slots
- **Week View Fix**: Kalender lädt Termine basierend auf der tatsächlichen Woche statt Monat

**Verbessertes Availability-Display:**
- **Vorher**: "10:00, 10:15, 10:30, 10:45, 11:00, 11:15, 14:00, 14:15..." (unübersichtlich & inkorrekt)
- **Nachher**: "09:00 bis 12:00, 14:00 bis 17:00" (klar, übersichtlich & korrekt)
- **Neue Algorithmus**: `calculateFreeTimeBlocks()` berechnet freie Zeitblöcke direkt aus Geschäftszeiten und gebuchten Terminen
- **Keine überlappenden Slots mehr**: Alte Methode generierte überlappende Slots die nicht gemerged werden konnten
- Automatische Erkennung von Lücken zwischen gebuchten Terminen
- **100% akkurat**: Zeigt nur tatsächlich freie Zeiten an (keine bereits gebuchten Slots mehr!)

---

## 🆕 Neuerungen - Januar 2025

### Dashboard & Settings Rebranding
- **Dashboard**: "Configure Bot" wurde zu "Settings" umbenannt für bessere UX
- **Header-Updates**: Config-Seite header aktualisiert zu "Settings"
- **Mobile Dashboard**: Entsprechend angepasst

### 🌍 Language Settings Feature
**Backend-Erweiterungen:**
- Neue Tabelle: `language_settings` für Sprachkonfiguration
- API-Endpoints: `GET/PUT /api/bot/languages`, `/api/bot/language-setting`
- Unterstützte Sprachen: Alle osteuropäischen Sprachen, Spanisch, Italienisch, Griechisch, Thai, Tagalog, Vietnamesisch
- Migration: `20250102000000_add_language_settings.js`
- Seed: `004_language_settings.js` (26 Sprachen vordefiniert)

**Frontend-Erweiterungen:**  
- Neuer Tab "Settings" in `/config` neben "Bot-Konfiguration" und "Services & Preise"
- `LanguageSettings` Komponente mit Grid-Layout für Sprachauswahl
- Visuelle Auswahl-Bestätigung, Toast-Benachrichtigungen, Speicher-Button
- Integration mit bestehender API-Struktur

### 🤖 OpenAI Structured Outputs Integration
**Revolutionary AI Response Architecture:**
- **🔥 NEW: JSON Schema-basierte Structured Outputs**: Vollständige Umstellung auf OpenAI's Structured Outputs API
- **Automatische Spracherkennung**: KI-basierte Spracherkennung direkt in der strukturierten Antwort (keine separate API-Calls mehr)
- **Erweiterte Metadaten**: Jede Bot-Antwort enthält strukturierte Informationen, die über die `message` hinausgehen:
  - `message`: Die eigentliche Antwort an den Benutzer.
  - `is_flagged`: Boolean – Ob die Benutzernachricht eine "rote Linie" überschritten hat (True, wenn markiert).
  - `user_sentiment`: Kurze qualitative Bezeichnung des emotionalen Zustands des Benutzers.
  - `user_information`: Prägnante, fortlaufende Zusammenfassung wichtiger Benutzerinformationen über Konversationsrunden hinweg.
  - `user_language`: ISO 639-1 Sprachcode, in dem der Benutzer schreibt (z. B. 'de', 'en').
  - `confidence`: Genauigkeitsscore der Spracherkennung (0-1).
  - `intent`: Erkannte Benutzerabsicht (booking, inquiry, greeting, complaint).
  - `urgency`: Dringlichkeitsstufe (low, medium, high).
  - `requiresFollowUp`: Ob Follow-up erforderlich ist.

**Technische Implementierung:**
- **Schema Definition**: Striktes JSON Schema mit allen erforderlichen und optionalen Feldern für eine umfassende Bot-Antwort.
- **Fehlerbehandlung**: Robuste Fallbacks bei Parsing-Fehlern der strukturierten Antwort, um Stabilität zu gewährleisten.
- **Performance**: Eliminiert separate Language Detection API-Calls durch die direkte Integration der Spracherkennung in die Structured Output.
- **Erweiterbarkeit**: Neue Metadaten können einfach zum Schema hinzugefügt werden, um zukünftige Anforderungen zu erfüllen.
- **Modell-Kompatibilität**: Optimiert für `gpt-4o-mini` und neuere OpenAI-Modelle, die Structured Outputs unterstützen.

### 🔄 Chat Translation Feature
**Client-Side Message Translation:**
- **On-Demand Translation**: Jede Chat-Nachricht kann individual übersetzt werden
- **Toggle-Funktionalität**: Benutzer können zwischen Original und Übersetzung hin- und herschalten
- **Multi-Language Support**: Übersetzung in Deutsch, Englisch, Spanisch, Französisch, Italienisch
- **Smart Language Detection**: Automatische Erkennung der Ausgangssprache für präzise Übersetzung
- **Real-time Translation**: Instant-Übersetzung ohne Server-Roundtrips

**Frontend-Implementierung:**
- **Neue Hook**: `useTranslateMessage` für Google Translate API Integration
- **Enhanced Components**: `MessageBubbleWithTranslation` mit eingebauter Translation-UI
- **Updated Pages**: Chat-Übersicht (`/chats`) und Chat-Detail (`/chat-review/[chatId]`) mit Translation-Buttons
- **Dependency**: `google-translate-api-x` für Client-Side-Übersetzung

**User Interface:**
- **Translation Buttons**: "→ Deutsch", "→ English", etc. unter jeder Nachricht
- **Show Original Button**: Zurück zur ursprünglichen Nachricht mit "Show Original"
- **Translation Indicator**: Visueller Hinweis auf übersetzte Inhalte
- **Loading States**: Spinner-Animation während der Übersetzung

**Technische Details:**
- **Implementation**: In `AIService.getChatResponse()` wurde Spracherkennung über OpenAI API integriert
- **Service**: Language detection is now integrated into OpenAI Structured Outputs (no separate service needed)
- **System Prompt Enhancement**: Spezifische Anweisungen wie "IMPORTANT: The user is communicating in German (Deutsch). You MUST respond in German (Deutsch) only."
- **Logging**: Ausführliche Protokollierung der erkannten Sprache für Debugging und Monitoring

**Vorteile:**
- **Konsistente Mehrsprachigkeit**: Bot antwortet zuverlässig in der Sprache des Benutzers
- **Bessere UX**: Keine manuellen Spracheinstellungen erforderlich
- **Automatische Service-Übersetzung**: Services und Termine werden in der entsprechenden Sprache angezeigt
- **WhatsApp & Test Chat**: Funktioniert sowohl für WhatsApp-Nachrichten als auch für Test-Chat-Sessions

### 🔧 Language System Synchronization
**Vollständige Systemintegration:**
- **Backend Database**: 32 Sprachen in `language_settings` Tabelle (inkl. 6 neue: Französisch, Portugiesisch, Niederländisch, Türkisch, Arabisch, Chinesisch, Japanisch, Koreanisch, Hindi)
- **AI Service Detection**: Identische Sprachunterstützung in `aiService.ts` mit spezifischen Anweisungen pro Sprache
- **Frontend Translation**: `useTranslateMessage` Hook und `DynamicTranslationProvider` unterstützen alle 32 Sprachen
- **Chat Interface**: Aktualisierte Language Names in Chat-Übersicht für alle unterstützten Sprachen
- **Database Seed**: Erweiterte `004_language_settings.js` mit allen populären Weltsprachen

**Konsistenz-Garantie:**
- ✅ Alle 32 Sprachen funktionieren in Language Settings UI
- ✅ Alle 32 Sprachen werden von AI Detection erkannt und verarbeitet
- ✅ Alle 32 Sprachen können in Frontend Translation verwendet werden
- ✅ Keine "orphaned" Sprachen - jede angebotene Sprache funktioniert vollständig

### 💬 Chat Management Verbesserungen  
**Features für Chat-Übersicht (`/chats`):**
- **Filter-System**: Dropdown für Chat-Status (Alle/Aktiv/Archiviert/Inaktiv)
- **Chat-Status**: Automatische Inactive-Erkennung (2 Wochen), Archive-Funktionalität
- **Session-Nummerierung**: Einzigartige recycelbare Nummern (1, 2, 3...)
- **Sortierung**: Neueste Chats zuerst
- **Archive-Button**: Mit Bestätigungspopup "Wirklich archivieren?"
- **Status-Badges**: Farbkodiert (Grün=Aktiv, Grau=Archiviert, Orange=Inaktiv)
- **🆕 Session Management**: Jeder Klick auf "AI Chat" erstellt IMMER eine neue Session (keine Wiederverwendung bestehender Sessions)

**Backend-Updates:**
- Neue Felder: `status`, `session_number` in `test_chat_sessions`
- API: `PATCH /api/bot/test-chat/sessions/:sessionId/status`
- Migration: `20250101100000_add_status_and_number_to_test_chat_sessions.js`

**Navigation & User Flow:**
- **AI Chat Button**: Jeder Klick erstellt eine komplett neue Session
- **View All Chats** (`/chats`): Übersicht aller bisherigen Sessions mit Filterfunktion
- **Session öffnen**: Von `/chats` aus können alte Sessions geöffnet werden (über `?sessionId=...` Parameter)
- **Workflow**: Neue Session für Tests → Alte Sessions über `/chats` einsehen und weiterführen

### 🎨 UI/UX Verbesserungen
- **Calendar Buttons**: Kompaktere Buttons in Calendar Pro (Button-Größe angepasst)
- **Service Display**: Fixes für "null" Service-Namen (zeigt jetzt "Service" als Fallback)
- **Button Styling**: Einheitliche Icons und Formatierung in Chat-Übersicht
- **Status-Badges**: Farbkodiert (Grün=Aktiv, Grau=Archiviert, Orange=Inaktiv)

**Backend-Updates:**
- Neue Felder: `status`, `session_number` in `test_chat_sessions`
- API: `PATCH /api/bot/test-chat/sessions/:sessionId/status`
- Migration: `20250101100000_add_status_and_number_to_test_chat_sessions.js`

### 🎨 UI/UX Verbesserungen
- **Calendar Buttons**: Kompaktere Buttons in Calendar Pro (Button-Größe angepasst)
- **Service Display**: Fixes für "null" Service-Namen (zeigt jetzt "Service" als Fallback)
- **Button Styling**: Einheitliche Icons und Formatierung in Chat-Übersicht

### 🔥 Neuerungen - September 2025: Red Flag System & Enhanced Structured Output

**Bot System Anpassungen:**
- **Structured Output Erweitert**: Die OpenAI Structured Outputs umfassen jetzt zusätzliche Felder:
    - `is_flagged`: Ein boolean-Flag, das anzeigt, ob die Nachricht des Benutzers eine "rote Linie" überschritten hat.
    - `user_sentiment`: Eine qualitative Einschätzung des emotionalen Zustands des Benutzers.
    - `user_information`: Eine fortlaufende Zusammenfassung wichtiger Benutzerinformationen, die über Konversationsrunden hinweg beibehalten wird.
    - `user_language`: Der automatisch erkannte ISO 639-1 Sprachcode der Benutzereingabe.
    - `typing_delay_disabled`: Ein boolean-Flag, das anzeigt, dass die künstliche Tippverzögerung deaktiviert wurde.
- **Red Flag Erkennung**: Das AI-Modell erkennt automatisch, wenn eine Benutzernachricht unangemessen ist oder gegen vordefinierte Richtlinien verstößt.
- **Typing Delay Deaktiviert**: Die künstliche Tippverzögerung für Bot-Antworten wurde systemweit deaktiviert, um sofortige Reaktionen zu ermöglichen.
- **System Prompt Integration**: Der System-Prompt enthält nun Informationen über den `last safety flag` und die `known user info` aus vorherigen Konversationsrunden, um die Kontextualisierung und Moderation zu verbessern.

**Chat System Anpassungen:**
- **Red Flags als Restriktion für Review**: Wenn eine Nachricht als `is_flagged: true` von der KI zurückgegeben wird, wird diese Nachricht im `chat-review` Frontend als Entwurf (`status: 'draft'`) markiert und muss manuell überprüft und genehmigt werden, bevor sie an den Benutzer gesendet wird.
- **Automatisierte und Manuelle Freigabe**: Nachrichten, die nicht als "Red Flag" markiert sind, werden automatisch als `approved: true` gesetzt und je nach Kanal (`WhatsApp` oder `Test Chat`) als `sent` oder `approved` gespeichert.
- **Frontend-Synchronisation**: Sicherstellung, dass die korrekten Metadaten (`status: 'approved'`, `approved: true`, `isCustomReply: true`) angewendet werden, wenn benutzerdefinierte Antworten genehmigt oder gesendet werden, um die Frontend-Synchronisation zu gewährleisten.