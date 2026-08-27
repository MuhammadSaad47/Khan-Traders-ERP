# Production Security Guide

## 🔒 Security Features Implemented

This guide documents the security features implemented for production deployment of Khan Trader application.

---

## 1. Session Management & Auto-Lock

### ✅ Implemented Features

#### **Require Login on App Restart**
- User must login every time the application is closed and reopened
- Session data is NOT persisted across app restarts
- Ensures unauthorized users cannot access data if they open the app

#### **Auto-Lock on System Events**
- Application automatically logs out user when:
  - 🔒 **System is locked** (Windows + L, Lock Screen)
  - 💤 **System goes to sleep/suspend** (Laptop lid closed)
  - 🖥️ **App is closed** (X button, Alt+F4)

#### **Session Persistence During Active Use**
- User stays logged in while app is running
- No need to re-login for every action
- 12-hour session timeout for inactive sessions
- Provides convenience without compromising security

### How It Works

```
User Opens App
    ↓
Login Required (Username + Password)
    ↓
User Works in App (Session Active)
    ↓
System Lock / App Close / Sleep
    ↓
Session Cleared Automatically
    ↓
User Returns
    ↓
Login Required Again
```

### Technical Implementation

**Frontend (auth.store.ts):**
- `clearSessionOnAppRestart()` - Called on app startup
- Clears user session from localStorage
- Generates unique session ID per app launch

**App.tsx:**
- Listens for 'system-locked' event from main process
- Calls `logout()` when system is locked/suspended
- Clears session on app startup

**Main Process (index.ts):**
- Uses Electron's `powerMonitor` API
- Detects 'lock-screen' and 'suspend' events
- Sends 'system-locked' message to renderer
- All windows receive logout signal

---

## 2. Clean Database for Production Builds

### ✅ Implemented Features

#### **Fresh Install Experience**
- Production .exe starts with **empty database**
- No pre-existing user data
- **Admin setup required** on first run
- Migrations run automatically

#### **Database Cleanup Script**
```bash
node clean-db-for-production.js
```

**What it does:**
1. Scans project for database files (.db, .sqlite)
2. Removes all database files found
3. Ensures clean build
4. Reports what was cleaned

#### **Automated Build Process**
Build commands now automatically clean database:
```bash
npm run build:win    # Windows .exe (cleans DB first)
npm run build:linux  # Linux AppImage (cleans DB first)
npm run build:mac    # macOS .dmg (cleans DB first)
```

### First Run Experience

```
User Installs .exe
    ↓
Opens Application
    ↓
Migrations Run Automatically
    ↓
"Initial Admin Setup" Screen Shows
    ↓
User Creates Admin Account
    - Full Name
    - Username
    - Password
    ↓
(Optional) Set Up Security Questions
    ↓
Application Ready to Use
```

### Technical Implementation

**clean-db-for-production.js:**
- Scans project recursively (max depth 3)
- Removes: `khan_trader.db`, `*.sqlite` files
- Skips: `node_modules`, hidden folders
- Reports: What was cleaned

**package.json:**
- Build commands updated to run cleanup first
- Ensures production builds are always clean

**Electron App:**
- Migrations run on startup (main/index.ts)
- Splash screen shows progress
- Database created in user data directory
- Fresh schema applied automatically

---

## 3. Security Best Practices

### ✅ Authentication Security

**Password Storage:**
- ✅ Bcrypt hashing (12 salt rounds)
- ✅ Never stored in plaintext
- ✅ Salt is unique per password

**Session Management:**
- ✅ No session persistence across restarts
- ✅ Auto-logout on system lock/sleep
- ✅ 12-hour timeout for inactive sessions
- ✅ Unique session ID per app launch

**Password Recovery:**
- ✅ Security questions (3 required)
- ✅ Answers hashed with bcrypt
- ✅ Case-insensitive verification
- ✅ Rate limiting (5 attempts / 30-min lockout)
- ✅ Audit logging for all attempts

### ✅ Data Security

**Database:**
- ✅ SQLite with WAL mode
- ✅ Stored in user data directory
- ✅ Not accessible without file system access
- ✅ Automatic checkpoint on app quit

**Audit Trail:**
- ✅ All user actions logged
- ✅ Login/logout tracked
- ✅ Password changes recorded
- ✅ Recovery attempts monitored

**Soft Delete:**
- ✅ Users not hard-deleted
- ✅ Preserves audit trail
- ✅ Can be restored if needed

---

## 4. Production Deployment Checklist

### Before Building .exe

- [ ] **Test all features** in development
- [ ] **Set up security questions** for test admin
- [ ] **Test password recovery** flow
- [ ] **Test auto-lock** (lock screen, close app)
- [ ] **Review audit logs** for anomalies
- [ ] **Update version number** in package.json
- [ ] **Clean database** (run clean script)

### Building Production .exe

```bash
# Automatic (recommended)
npm run build:win

# Manual (if needed)
node clean-db-for-production.js
npm run build
electron-builder --win
```

### After Building

- [ ] **Test the .exe** on clean Windows machine
- [ ] **Verify admin setup** prompt appears
- [ ] **Create test admin** account
- [ ] **Set up security questions**
- [ ] **Test login/logout**
- [ ] **Test auto-lock** feature
- [ ] **Test password recovery**
- [ ] **Verify all features** work

### Distribution

- [ ] **Document admin setup** for users
- [ ] **Provide installation guide**
- [ ] **Include security best practices**
- [ ] **Setup support channel**
- [ ] **Monitor first deployments**

---

## 5. User Training Guide

### For System Administrator

**Initial Setup:**
1. Install Khan Trader .exe
2. Open application
3. Complete "Initial Admin Setup"
4. **IMPORTANT:** Set up security questions immediately
5. Document credentials securely
6. Test password recovery feature

**Daily Use:**
- Login when app starts
- Work normally during session
- App auto-locks when system locks
- Must re-login after lock/close

**Security Reminders:**
- Don't share credentials
- Use strong passwords
- Remember security question answers
- Log out when leaving workstation
- Report suspicious activity

### For Regular Users

**Login:**
- Enter username and password
- Stay logged in during work
- Auto-logout on system lock/sleep

**Password Management:**
- Change password regularly (Settings)
- Use strong, unique passwords
- Set up security questions
- Test password recovery

**Best Practices:**
- Lock computer when away (Windows + L)
- Close app when done
- Don't share login credentials
- Report lost/forgotten passwords to admin

---

## 6. Troubleshooting

### "Why do I need to login every time?"

**Answer:** This is a security feature. The application requires login:
- When app is first opened
- After closing the app
- After system lock/sleep
- After 12 hours of inactivity

This ensures unauthorized users cannot access business data.

### "App logged me out automatically"

**Possible Causes:**
1. System was locked (Windows + L)
2. Laptop went to sleep (lid closed)
3. 12-hour timeout reached
4. App was closed and reopened

**Solution:** Simply login again. This is expected behavior for security.

### "I can't set up security questions"

**Solution:**
1. Go to Settings
2. Click "My Account" tab
3. Find "Security Questions" section
4. Click "Set Up Security Questions"
5. Choose 3 different questions
6. Provide answers
7. Click "Save"

### "Production .exe still has old data"

**Solution:**
1. Run cleanup script: `node clean-db-for-production.js`
2. Verify no .db or .sqlite files in project
3. Rebuild: `npm run build:win`
4. Test .exe on clean machine

---

## 7. Security Monitoring

### Audit Logs

**What's Logged:**
- Login attempts (success/failure)
- Logout events
- Password changes
- Password recovery attempts
- Security questions setup/updates
- User creation/deletion
- All data modifications

**How to Access:**
1. Settings → Export Diagnostics
2. Saves to: `khan-trader-diagnostics-[timestamp].log`
3. Review regularly for suspicious activity

**What to Look For:**
- Repeated failed login attempts
- Password recovery attempts
- Unexpected user creations
- Off-hours activity
- Unusual data changes

### Regular Security Tasks

**Daily:**
- Monitor active sessions
- Review critical transactions
- Check for anomalies

**Weekly:**
- Export and review audit logs
- Verify user accounts are current
- Check for unauthorized changes

**Monthly:**
- Full security review
- User access audit
- Password policy review
- Update security questions if needed

---

## 8. Technical Details

### Session Flow

```typescript
// App Startup
clearSessionOnAppRestart() → Logout if user exists

// System Lock
powerMonitor.on('lock-screen') → Send 'system-locked' → Logout

// System Suspend
powerMonitor.on('suspend') → Send 'system-locked' → Logout

// App Close
App quits → Session cleared → Next start requires login
```

### Database Location

**Development:**
```
~/.config/khan-trader/khan-trader.sqlite
```

**Production (.exe):**
```
%APPDATA%/khan-trader/khan-trader.sqlite
```

**Clean Build:**
- No database in packaged .exe
- Created on first run
- Migrations applied automatically

### Files Modified

```
src/renderer/src/stores/auth.store.ts
  - Added clearSessionOnAppRestart()
  - Added appSessionId tracking
  - Removed persist middleware (kept session management)

src/renderer/src/App.tsx
  - Clear session on app startup
  - Listen for system-locked event
  - Auto-logout on lock/sleep

src/main/index.ts
  - Import powerMonitor
  - Listen for lock-screen event
  - Listen for suspend event
  - Send system-locked to renderer

package.json
  - Updated build commands
  - Added clean-db step

clean-db-for-production.js
  - New script to clean database
  - Scans and removes .db/.sqlite files
```

---

## 9. FAQ

**Q: Can I disable auto-lock?**  
A: No, this is a security requirement for production. It protects against unauthorized access.

**Q: Why 12-hour timeout?**  
A: Balance between security and convenience. Users working full day won't be logged out unnecessarily.

**Q: What if I forget password?**  
A: Use "Forgot Password" link. Answer security questions to reset.

**Q: Can I change security questions?**  
A: Yes, go to Settings → My Account → Security Questions → Update.

**Q: What if I don't set up security questions?**  
A: You can still use the app, but cannot self-recover password if forgotten. Admin will need to reset manually.

**Q: Does clean script delete production data?**  
A: No! It only removes database files in the **project directory**. Production databases are in user data directory and are never touched.

---

## 10. Support & Contact

### Getting Help

**Documentation:**
- ADMIN_CREDENTIALS_AND_PASSWORD_RECOVERY.md
- PASSWORD_RECOVERY_GUIDE.md
- PRODUCTION_SECURITY_GUIDE.md (this file)

**Logs Location:**
- Application: `%APPDATA%/khan-trader/crash.log`
- Diagnostics: Settings → Export Diagnostics

**Common Issues:**
1. Can't login → Verify credentials, check caps lock
2. Auto-logged out → Expected behavior after lock/close
3. Forgot password → Use "Forgot Password" link
4. Security questions not working → Check spelling/case

---

**Last Updated:** August 13, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready & Secure  
**Security Level:** High - Auto-lock enabled, session management enforced
