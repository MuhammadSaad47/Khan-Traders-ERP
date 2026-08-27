# Khan Traders - Windows Build Ready

## 🎯 Status: READY FOR BUILD

All configurations have been fixed and optimized for production build.

---

## ✅ What's Been Configured

### 1. **Publisher Information**
- **Publisher Name:** Saad Afridi
- **Copyright:** Copyright © 2025 Saad Afridi
- **Company:** Khan Traders
- **Email:** saad@khantraders.com

### 2. **Build Configuration** (`electron-builder.yml`)
- ✅ Windows executable name: "Khan Traders"
- ✅ Desktop shortcut: Auto-creates with logo2 icon
- ✅ Start menu shortcut: Enabled
- ✅ Installer icon: build/icon.ico (639KB PNG converted)
- ✅ User-friendly installer: Allows custom install directory
- ✅ Runs after installation
- ✅ Native dependencies unpacked (better-sqlite3)
- ✅ Excludes dev files from build
- ✅ Publisher name set for code signing

### 3. **Security Features** (Already Implemented)
- ✅ Password recovery with 3 security questions
- ✅ Auto-lock on system lock/sleep/app restart
- ✅ Bcrypt-hashed security answers
- ✅ Rate limiting on forgot password attempts

### 4. **Database**
- ✅ Clean database script for production builds
- ✅ Fresh install shows "Initial Admin Setup"
- ✅ Windows DB location: `%APPDATA%/khan-trader/khan-trader.sqlite`

---

## 🚀 Build Instructions

### Step 1: Run Pre-Build Check
```bash
./pre-build-check.sh
```
This validates:
- Wine installation
- Icon files
- Dependencies
- Config validity
- Disk space

### Step 2: Build Windows Installer
```bash
npm run build:win
```

### Step 3: Locate Output
```
dist/khan-trader-1.0.0-setup.exe
```

---

## 📦 What Gets Built

**File:** `khan-trader-1.0.0-setup.exe`  
**Size:** ~150-200 MB  
**Includes:**
- Electron runtime
- SQLite database engine
- Node.js native modules
- All application code
- Desktop shortcut with logo2 icon
- Uninstaller

---

## 🖥️ Windows Installation

### User Experience:
1. **Run installer** → `khan-trader-1.0.0-setup.exe`
2. **SmartScreen warning** (if unsigned):
   - Click "More info"
   - Click "Run anyway"
   - *(This is normal for apps without $300/year certificate)*
3. **Choose install location** (default: `C:\Program Files\Khan Traders`)
4. **Desktop shortcut auto-creates** with logo2 icon
5. **First run** → "Initial Admin Setup" screen
6. **Set admin credentials** → Start using app

---

## 🔐 Code Signing (with Wine)

Since Wine is now installed, electron-builder will:
- ✅ Sign the .exe with your publisher name
- ✅ Reduce SmartScreen warnings (after enough installs)
- ✅ Show "Saad Afridi" as publisher in Windows properties

**Note:** Full code signing (to eliminate all warnings) requires a purchased certificate from:
- DigiCert (~$300/year)
- Sectigo (~$200/year)
- For your use case, basic signing with Wine is sufficient

---

## 🧪 Testing Checklist (on Windows Laptop)

### Installation:
- [ ] Installer runs without errors
- [ ] Desktop shortcut created
- [ ] Start menu entry created
- [ ] Icon displays correctly

### First Run:
- [ ] "Initial Admin Setup" shows
- [ ] Can create admin account
- [ ] Security questions setup works

### Features:
- [ ] Login works
- [ ] Forgot password with security questions works
- [ ] Auto-lock on laptop lock works
- [ ] Auto-lock on app close/restart works
- [ ] Database persists between restarts
- [ ] All CRUD operations work (Products, Sales, Purchases, etc.)
- [ ] Reports generate correctly
- [ ] Receipt printing works (if printer available)

### Uninstall:
- [ ] Uninstaller works
- [ ] Database remains (for reinstall)
- [ ] Shortcuts removed

---

## 🐛 Troubleshooting

### Build Fails with "wine process failed"
**Solution:** Wine not installed or not in PATH
```bash
wine --version  # Should show version
```

### "Invalid configuration" Error
**Solution:** Config already fixed, but if it persists:
```bash
rm -rf dist/
npm run build:win
```

### TypeScript Errors
**Solution:** Check and fix, or build will stop:
```bash
npm run typecheck
```

### Better-sqlite3 Errors on Windows
**Solution:** Already handled - native module unpacked in config

### Icon Not Showing
**Solution:** Icon already converted to .ico format in `build/icon.ico`

---

## 📊 Build Output Details

### Expected Console Output:
```
===========================================
Clean Database for Production Build
===========================================
✓ Cleaned database files

> typecheck
✓ No TypeScript errors

> electron-vite build
✓ Built in X seconds

• electron-builder
• packaging       platform=win32 arch=x64
• building        target=nsis
• building block map
✓ Built dist/khan-trader-1.0.0-setup.exe
```

### Output Files:
```
dist/
├── khan-trader-1.0.0-setup.exe       ← Main installer
├── khan-trader-1.0.0-x64.nsis.7z     ← Compressed package
├── win-unpacked/                      ← Unpacked app (for testing)
└── builder-effective-config.yaml     ← Final config used
```

---

## 🎉 Ready to Ship!

After Wine installation completes, run:

```bash
./pre-build-check.sh && npm run build:win
```

Copy `dist/khan-trader-1.0.0-setup.exe` to your Windows laptop and test!

---

**Built with ❤️ by Saad Afridi for Khan Traders**
