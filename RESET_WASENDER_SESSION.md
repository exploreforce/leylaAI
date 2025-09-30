# Wasender Session Reset Guide

## Problem
After deleting a session on wasenderapi, the bot continues to use the old session ID stored in the database, resulting in 404 errors like:
```
❌ Error getting status for session 16548: Request failed with status code 404
```

## Solutions

You have several options to reset the Wasender session:

### Option 1: API-Based Reset (Recommended)

**Pros:** Clean, safe, handles authentication
**Cons:** Requires valid JWT token

#### Using curl (Linux/Mac/Windows with WSL):
```bash
chmod +x reset_session_via_api.sh
./reset_session_via_api.sh
```

#### Using Windows batch:
```cmd
reset_session_via_api.bat
```

#### Manual API call:
```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3001/api/whatsapp/user/session
```

### Option 2: Database Reset (Direct)

**Pros:** Works without authentication, resets all users
**Cons:** Direct database manipulation, affects all users

#### Using PowerShell (Recommended for Windows):
```powershell
.\Reset-WasenderSession.ps1
```

#### Using Windows batch:
```cmd
reset_wasender_session.bat
```

#### Manual SQL:
```sql
-- Run this SQL against your backend/database/whatsapp_bot.db
UPDATE users SET 
  wasender_session_id = NULL,
  wasender_session_updated_at = NULL
WHERE wasender_session_id IS NOT NULL;
```

### Option 3: Frontend UI

1. Login to your WhatsApp bot frontend
2. Go to Settings → WhatsApp Link
3. The frontend should detect the invalid session and allow you to create a new one
4. Provide your phone number and generate a new QR code

## After Reset

1. **Restart the bot** if it's currently running
2. **Create a new session:**
   - Via frontend: Settings → WhatsApp Link → "Create/Ensure My Session"
   - Via API: `POST /api/whatsapp/user/session/ensure` with `{"phoneNumber": "+your_number"}`
3. **Scan the QR code** with your WhatsApp
4. **Verify connection** by checking the status

## New API Endpoint

A new endpoint has been added to help with this issue:

```
DELETE /api/whatsapp/user/session
```

**Headers:** `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "success": true,
  "message": "Wasender session reset successfully. Create a new session via /user/session/ensure",
  "previousSessionId": "16548"
}
```

## Prevention

To avoid this issue in the future:
1. Don't delete sessions directly on wasenderapi
2. Use the bot's API endpoints to manage sessions
3. Consider implementing session health checks
4. Monitor the logs for 404 errors

## Troubleshooting

### "sqlite3 command not found"
- **Windows:** Download SQLite tools from https://sqlite.org/download.html
- **PowerShell Alternative:** The script will try to use PowerShell SQLite module

### "JWT token invalid"
1. Login to your bot's frontend
2. Open browser Developer Tools (F12)
3. Go to Application/Storage → Local Storage
4. Copy the `token` value
5. Use this as your JWT_TOKEN

### "Backend not responding"
- Check if backend is running on the correct port
- Verify the API_BASE_URL in the scripts
- Check firewall/network settings

### Multiple users affected
The database reset affects ALL users. Each user will need to recreate their session. The API-based reset only affects the authenticated user.

## Files Created

- `reset_wasender_session.sql` - SQL script
- `reset_wasender_session.bat` - Windows batch script
- `Reset-WasenderSession.ps1` - PowerShell script
- `reset_session_via_api.sh` - Unix API script  
- `reset_session_via_api.bat` - Windows API script
- `backend/src/routes/whatsapp.ts` - Updated with DELETE endpoint






