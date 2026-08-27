# Bug Fix: User Management Functions Not Working

**Date**: August 12, 2026  
**Issue**: "window.api.auth.createUser is not a function"  
**Status**: ✅ **FIXED**

---

## 🐛 Problem

When trying to add a new user in the Settings page, the application showed an error:

```
Error: window.api.auth.createUser is not a function
```

---

## 🔍 Root Cause

The preload script (`src/preload/index.ts`) was missing the exposure of several user management IPC methods:
- ❌ `createUser` - Create new user
- ❌ `changePassword` - Change own password
- ❌ `resetPassword` - Admin reset user password
- ❌ `disableUser` - Disable a user account

These methods existed in:
- ✅ Backend service (`src/main/services/auth.service.ts`)
- ✅ IPC handlers (`src/main/ipc/auth.ipc.ts`)
- ✅ Type definitions (partially in `src/preload/index.d.ts`)

But were **NOT exposed** in the preload bridge that connects the renderer to the main process.

---

## ✅ Solution

### Fixed Files

1. **`src/preload/index.ts`** - Added missing method exposures
2. **`src/preload/index.d.ts`** - Fixed type signatures to match implementation

### Changes Made

#### In `src/preload/index.ts`:

Added to the `auth` object:
```typescript
createUser: (data: any, userId: number) => ipcRenderer.invoke('auth:createUser', data, userId),
changePassword: (data: any, userId: number) => ipcRenderer.invoke('auth:changePassword', data, userId),
resetPassword: (data: any, userId: number) => ipcRenderer.invoke('auth:resetPassword', data, userId),
disableUser: (targetUserId: number, userId: number) => ipcRenderer.invoke('auth:disableUser', targetUserId, userId)
```

#### In `src/preload/index.d.ts`:

Fixed type signatures to match:
```typescript
createUser: (data: any, userId: number) => Promise<any>
changePassword: (data: any, userId: number) => Promise<any>
resetPassword: (data: any, userId: number) => Promise<any>
disableUser: (targetUserId: number, userId: number) => Promise<any>
```

---

## 🚀 How to Apply Fix

### For Development:
```bash
# Restart the development server
npm run dev
```

The fix will take effect immediately with hot reload.

### For Production:
```bash
# Rebuild the application
npm run build

# Or for specific platform
npm run build:linux
npm run build:win
npm run build:mac
```

---

## ✅ Verification

After applying the fix, you should be able to:

1. ✅ **Add New User** - Create admin/manager/cashier accounts
2. ✅ **Change Password** - Users can change their own passwords
3. ✅ **Reset Password** - Admins can reset user passwords
4. ✅ **Disable User** - Admins can disable user accounts

---

## 📝 Technical Notes

### About the GLib Warning

The console warning you saw:
```
GLib-GObject: ../../../gobject/gsignal.c:2685: instance '0x8240016e790' has no handler with id '5031'
```

This is a **harmless warning** from the Electron/Chromium layer on Linux. It's related to GTK signal handling and does **NOT** affect functionality. This warning can be safely ignored.

### Why This Happened

During development, the IPC handlers and services were implemented, but the preload script exposure was missed. The preload script acts as a security bridge between the renderer (frontend) and main process (backend) in Electron apps with context isolation enabled.

---

## 🎯 User Management Features Now Working

### Create User
- Username and password validation
- Role assignment (admin, manager, cashier)
- Automatic duplicate username prevention

### Change Password
- Current password verification
- Secure password hashing (bcrypt)
- Audit log tracking

### Reset Password
- Admin-only feature
- Reset any user's password
- Audit log tracking

### Disable User
- Admin-only feature
- Soft delete (preserves history)
- Cannot disable own account (safety check)

---

**Fixed By**: Kiro AI Agent  
**Fix Date**: August 12, 2026  
**Status**: ✅ **Ready to Test**

🎉 **Please restart the app and try adding a user again!**
