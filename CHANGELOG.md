# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed - 2025-10-21

#### 🗓️ Improved Weekday-based Appointment Booking
- **14-Day Dynamic Calendar in System Prompt**
  - Bot now receives a dynamically generated list of the next 14 days with weekdays
  - Fixes weekday calculation errors (e.g., booking "Friday" on the wrong date)
  - Calendar updates automatically every session
  - Example: "Friday" → looks up exact date from calendar instead of guessing
  - Location: `backend/src/services/aiService.ts` and `backend/src/utils/timezone.ts`
  
#### 🔧 Two-Step Appointment Cancellation Flow
- **Fixed "Appointment not found" errors during cancellation**
  - Bot was trying to guess appointmentId as date/time string (e.g., "11:30-22.10.2025")
  - Now follows proper workflow:
    1. Call `findAppointments(customerPhone)` to get UUID
    2. Confirm appointment details with customer
    3. Call `cancelAppointment(appointmentId: UUID)`
  - Enhanced tool descriptions with explicit UUID requirement
  - Added comprehensive cancellation workflow instructions to system prompt
  - Prevents invalid cancellation attempts
  - Location: `backend/src/services/aiService.ts` (lines 161-198, 902-948)

#### 🕐 Timezone Fix for findAppointments
- **Fixed bot showing wrong time during appointment cancellation**
  - Bot was showing UTC times (9:00) instead of local times (10:00) from `findAppointments`
  - Added automatic timezone conversion in `findAppointments` tool
  - Now returns three time formats:
    - `localDateTime`: "27.10.2025, 10:00" (formatted for display)
    - `localDate`: "2025-10-27" (for date matching)
    - `localTime`: "10:00" (for time matching)
    - `datetime`: UTC string (for internal reference only)
  - Updated system prompt to instruct bot to use local time fields when communicating with customers
  - Added detailed logging for timezone conversions
  - Location: `backend/src/services/aiService.ts` (lines 677-713)

#### ⏱️ WhatsApp Realistic Typing Delay
- **Activated realistic typing delays for WhatsApp messages**
  - Bot now waits before sending messages to WhatsApp (feels more human)
  - Delay formula: `characters * 0.4 seconds + random(1-12 seconds)`
  - Examples:
    - 50 characters: 21-32 seconds delay
    - 100 characters: 41-52 seconds delay
    - 200 characters: 81-92 seconds delay
  - **Test Chat unaffected**: No delay in Test Chat for efficient testing
  - Can be disabled with environment variable: `WHATSAPP_TYPING_DELAY=false`
  - Location: `backend/src/utils/typingDelay.ts` and `backend/src/services/whatsappService.ts`

### Added - 2025-10-01

#### 🌍 Internationalization (i18n)
- **Lazy-loading translation system** with localStorage persistence
  - No initial loading screen - app starts instantly in default language (German)
  - Dynamic language switching without page reload
  - Only loads translation files for the selected language on-demand
  - User preference saved in localStorage
  - Small "Loading language..." notification when switching languages

- **11 Complete Language Translations** (55 translation files)
  - 🇩🇪 **German** (Deutsch) - Original language
  - 🇬🇧 **English** - Complete
  - 🇪🇸 **Spanish** (Español) - Complete
  - 🇫🇷 **French** (Français) - Complete
  - 🇮🇹 **Italian** (Italiano) - Complete
  - 🇵🇱 **Polish** (Polski) - Complete
  - 🇷🇺 **Russian** (Русский) - Complete
  - 🇨🇿 **Czech** (Čeština) - Complete
  - 🇸🇰 **Slovak** (Slovenčina) - Complete
  - 🇭🇺 **Hungarian** (Magyar) - Complete
  - 🇷🇴 **Romanian** (Română) - Complete

- **Translation namespaces** (5 files per language):
  - `common.json` - Actions, navigation, status, time expressions
  - `settings.json` - Bot configuration, language settings
  - `dashboard.json` - Dashboard UI, quick actions, stats
  - `chat.json` - Chat interface, test chat, review system
  - `calendar.json` - Calendar, appointments, availability

#### 📱 Mobile Optimization
- **Responsive Dashboard Header**
  - Logo size: 48px (desktop) → 40px (mobile)
  - "Leyla AI Dashboard" title hidden on mobile (< 768px breakpoint)
  - Compact button labels: "Chat" and "Review" instead of full text on mobile
  - Reduced padding: `py-6 px-4` → `py-3 px-3` on mobile
  - Tighter spacing between header elements

- **Responsive Dashboard Cards**
  - Grid layout: 1 column (mobile) → 2 columns (tablet) → 4 columns (desktop/xl)
  - Card padding: `p-6` → `p-4` on mobile
  - Icon sizes: 24px → 20px on mobile
  - Text sizes: `text-lg` → `text-base` on mobile for headings
  - Stats numbers: `text-4xl` → `text-3xl` on mobile
  - Reduced gap between cards: `gap-6` → `gap-4` on mobile
  - Tighter spacing within cards for better content density

- **Touch-friendly UI**
  - All interactive elements optimized for touch targets
  - Better spacing between clickable elements
  - Responsive text sizing for readability on small screens

### Changed - 2025-10-01

#### 🎨 UI/UX Improvements
- **Language Settings** (in BotConfigForm)
  - Removed backend dependency for language management
  - Languages now stored and managed via localStorage
  - Instant language switching with custom event system
  - Removed loading spinner from language save button
  - Clear visual separation between fully translated (11) and partially translated (12) languages

- **Translation Provider** (DynamicTranslationProvider)
  - Refactored from backend-dependent to fully client-side
  - Removed initial loading screen
  - Implemented lazy resource loading
  - Added smooth loading notification for language switches
  - Better error handling for missing translation files

- **Language List Organization**
  - Fully translated languages (100% interface coverage) listed first
  - Partially translated languages (language names only) listed separately
  - Clear comments in code to distinguish translation completeness

### Technical Details

#### Files Modified
- `frontend/src/components/providers/DynamicTranslationProvider.tsx` - Lazy loading implementation
- `frontend/src/components/BotConfigForm.tsx` - localStorage integration, removed backend calls
- `frontend/src/app/page.tsx` - Mobile-responsive dashboard
- `frontend/public/locales/*/` - 55 new translation files

#### Performance Improvements
- Reduced initial bundle size by lazy-loading translations
- Faster app startup (no translation loading on mount)
- Reduced network requests (localStorage caching)

---

## Previous Changes

### Fixed - Earlier
- Auto-scroll issue in chat interface (React Strict Mode compatibility)
- Database schema error with `account_id` column
- Duplicate chat session creation (React Strict Mode fix)
- German text appearing in non-German translation files

### Added - Earlier
- Test endpoints for WasenderAPI exploration
- Multi-tenancy support with account_id
- Intelligent auto-scroll in chat (only when user is at bottom)
- Session initialization guards for React Strict Mode

---

## Notes for Reviewers

### Testing Checklist
- [ ] Mobile layout on iPhone SE (375px), iPhone 12 (390px), iPad (768px)
- [ ] Language switching works for all 11 complete languages
- [ ] No loading screen on initial app load
- [ ] Language preference persists after page reload
- [ ] Dashboard cards are properly aligned and readable on all screen sizes
- [ ] No console errors or warnings

### Known Limitations
- 12 additional languages are partially translated (language names only, ~5% coverage)
- Some pages (Settings, Calendar, Chat pages) not yet fully optimized for mobile
- Translation files use manual translations (not API-generated)

### Future Improvements
- Complete translations for remaining 12 languages
- Full mobile optimization for Settings/Config page
- Mobile optimization for Chat interface
- Calendar mobile view improvements
- Optional: Bottom navigation bar for mobile
- Optional: Hamburger menu for mobile navigation

