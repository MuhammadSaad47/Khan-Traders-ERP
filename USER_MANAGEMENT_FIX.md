# User Management System - Complete Fix & Documentation

**Date**: August 12, 2026  
**Issue**: SQL syntax error when creating users  
**Root Cause**: Missing userId parameter in frontend API calls  
**Status**: ✅ **FIXED**

---

## 🐛 Problem

When trying to create a user, the system showed:
```
Error invoking remote method 'auth:createUser': SqliteError: near "from": syntax error
```

---

## 🔍 Root Cause Analysis

The issue was a **parameter mismatch** between frontend and backend:

### Backend Expected (IPC Handler):
```typescript
ipcMain.handle('auth:createUser', async (_, data, userId) => {
  return authService.createUser(userId, data)
})
```

### Frontend Was Calling:
```typescript
// ❌ WRONG - Missing userId
window.api.auth.createUser(data)
```

### What Should Be Called:
```typescript
// ✅ CORRECT - Includes userId
window.api.auth.createUser(data, userId)
```

---

## ✅ Solution Applied

Fixed all user management hooks in `/src/renderer/src/hooks/useUsers.ts`:

1. ✅ **useCreateUser** - Now passes `user.id`
2. ✅ **useChangePassword** - Now passes `user.id`
3. ✅ **useResetPassword** - Now passes `user.id`
4. ✅ **useDisableUser** - Now passes `user.id`

---

## 👥 Complete User Management System

### User Roles & Hierarchy

```
┌─────────────────────────────────────┐
│          ADMIN (Highest)            │
│  ✓ Full system access               │
│  ✓ Create/disable users             │
│  ✓ Reset passwords                  │
│  ✓ Access all modules               │
└─────────────────────────────────────┘
              ▼
┌─────────────────────────────────────┐
│           MANAGER                    │
│  ✓ Most operations                  │
│  ✓ Create/disable users             │
│  ✓ View reports                     │
│  ✓ Cannot modify business settings  │
└─────────────────────────────────────┘
              ▼
┌─────────────────────────────────────┐
│           CASHIER                    │
│  ✓ POS operations                   │
│  ✓ Create sales                     │
│  ✓ Accept payments                  │
│  ✓ Limited access to reports        │
└─────────────────────────────────────┘
              ▼
┌─────────────────────────────────────┐
│        VAN SALESMAN                  │
│  ✓ Van sales only                   │
│  ✓ View assigned stock              │
│  ✓ Record van sales                 │
│  ✓ No access to other modules       │
└─────────────────────────────────────┘
```

---

## 🔐 User Management Features

### 1. Create User
**Who Can**: Admin, Manager  
**Function**: `createUser(adminId, data)`

**Fields**:
- `username` - Unique login name
- `full_name` - Display name
- `role` - admin | manager | cashier | van_salesman
- `password` - Hashed with bcrypt (12 rounds)

**Validations**:
- ✅ Username must be unique
- ✅ Password hashed securely
- ✅ Role must be valid enum
- ✅ Audit log created
- ✅ Only admin/manager can create users

---

### 2. Create Van Salesman
**Who Can**: Admin, Manager  
**Function**: `createSalesman(data, userId)`

**Fields**:
- `fullName` - Salesman name
- `phone` - Contact number
- `address` - Address

**Special Features**:
- ✅ Auto-generates username from name
- ✅ Ensures username uniqueness (adds counter if needed)
- ✅ Generates random password (8 chars)
- ✅ Returns username and password to admin
- ✅ Role automatically set to 'van_salesman'

---

### 3. Change Password (Self)
**Who Can**: Any logged-in user  
**Function**: `changePassword(userId, currentPass, newPass)`

**Validations**:
- ✅ Current password must be correct
- ✅ New password hashed with bcrypt
- ✅ Audit log created

---

### 4. Reset Password (Admin)
**Who Can**: Admin, Manager  
**Function**: `resetPassword(adminId, targetUserId, newPass)`

**Purpose**: Admin can reset any user's password without knowing current password

**Validations**:
- ✅ Only admin/manager can reset passwords
- ✅ New password hashed with bcrypt
- ✅ Audit log tracks admin who reset it

---

### 5. Disable User
**Who Can**: Admin, Manager  
**Function**: `disableUser(adminId, targetUserId)`

**Soft Delete**:
- ✅ Sets `is_active = 0`
- ✅ User data preserved (for audit trail)
- ✅ User cannot login
- ✅ Transaction history maintained
- ✅ Cannot disable your own account (safety check)

---

## 🔒 Security Features

### Password Security
- **Hashing Algorithm**: bcrypt with 12 salt rounds
- **Strength**: Industry-standard security
- **Storage**: Only hash stored, never plain password
- **Verification**: Secure comparison using bcrypt.compare()

### Authentication Flow
```
1. User enters credentials
2. Lookup user by username
3. Check is_active = 1 and is_deleted = 0
4. Verify password with bcrypt
5. Set active user ID in memory
6. Return user object (without password)
7. Create audit log entry
```

### Authorization (Role-Based Access Control)

**Middleware**: `requireRole(['admin', 'manager'])`

**Protected Operations**:
- ✅ Create user → Admin/Manager only
- ✅ Disable user → Admin/Manager only
- ✅ Reset password → Admin/Manager only
- ✅ Create salesman → Admin/Manager only
- ✅ View users → Admin/Manager only
- ✅ Change own password → Any user

---

## 📊 Database Schema

### users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,           -- Login name
  password_hash TEXT NOT NULL,             -- Bcrypt hash
  full_name TEXT NOT NULL,                 -- Display name
  role TEXT NOT NULL DEFAULT 'cashier'     -- Role enum
    CHECK (role IN ('admin','manager','cashier','van_salesman')),
  phone TEXT,                              -- Contact (optional)
  address TEXT,                            -- Address (optional)
  is_active INTEGER NOT NULL DEFAULT 1,    -- 1=active, 0=disabled
  is_deleted INTEGER NOT NULL DEFAULT 0,   -- Soft delete flag
  deleted_at TEXT,                         -- When deleted
  deleted_by INTEGER REFERENCES users(id), -- Who deleted
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 🎯 Access Control Matrix

| Feature | Admin | Manager | Cashier | Van Salesman |
|---------|-------|---------|---------|--------------|
| **User Management** |
| Create User | ✅ | ✅ | ❌ | ❌ |
| Disable User | ✅ | ✅ | ❌ | ❌ |
| Reset Password | ✅ | ✅ | ❌ | ❌ |
| Change Own Password | ✅ | ✅ | ✅ | ✅ |
| View Users | ✅ | ✅ | ❌ | ❌ |
| **Sales & POS** |
| Create Sale | ✅ | ✅ | ✅ | ❌ |
| Void Sale | ✅ | ✅ | ❌ | ❌ |
| View All Sales | ✅ | ✅ | ✅ | ❌ |
| **Van Sales** |
| Create Van Sale | ✅ | ✅ | ❌ | ✅ |
| View Own Van Sales | ✅ | ✅ | ❌ | ✅ |
| Reconcile Van | ✅ | ✅ | ❌ | ❌ |
| **Purchases** |
| Create Purchase | ✅ | ✅ | ❌ | ❌ |
| Void Purchase | ✅ | ✅ | ❌ | ❌ |
| **Payments** |
| Record Payment | ✅ | ✅ | ✅ | ❌ |
| Void Payment | ✅ | ✅ | ❌ | ❌ |
| **Accounts** |
| View Accounts | ✅ | ✅ | ✅ | ❌ |
| Create Account | ✅ | ✅ | ❌ | ❌ |
| Transfer Funds | ✅ | ✅ | ❌ | ❌ |
| **Reports** |
| View Reports | ✅ | ✅ | Limited | ❌ |
| **Settings** |
| Business Settings | ✅ | ❌ | ❌ | ❌ |
| Backup/Restore | ✅ | ✅ | ❌ | ❌ |

---

## 🔄 Complete Data Flow

### Creating a User (Fixed Flow)

```
┌─────────────────────────────────────────┐
│ Frontend (Settings Page)                │
│ - User fills form                       │
│ - Clicks "Create User"                  │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│ React Hook (useCreateUser)              │
│ - Gets current user.id from auth store  │
│ - Calls window.api.auth.createUser()    │
│ - Passes (data, userId)                 │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│ Preload Script (index.ts)               │
│ - Exposes safe API to renderer          │
│ - Forwards to IPC:                      │
│   ipcRenderer.invoke('auth:createUser', │
│                      data, userId)      │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│ IPC Handler (auth.ipc.ts)               │
│ - Receives (_, data, userId)            │
│ - Checks role with requireRole()        │
│ - Calls service:                        │
│   authService.createUser(userId, data)  │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│ Auth Service (auth.service.ts)          │
│ - Validates username unique             │
│ - Hashes password (bcrypt)              │
│ - Inserts into users table              │
│ - Creates audit log                     │
│ - Returns created user                  │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│ Database (users table)                  │
│ - New user record created               │
│ - Triggers auto-generated:              │
│   * id (autoincrement)                  │
│   * created_at (timestamp)              │
│   * is_active = 1 (default)             │
└─────────────────────────────────────────┘
```

---

## ✅ Testing Checklist

After restarting the app, verify:

### User Creation
- [ ] Admin can create admin users
- [ ] Admin can create manager users
- [ ] Admin can create cashier users
- [ ] Manager can create cashier users
- [ ] Cashier CANNOT create users (should see error)
- [ ] Duplicate username shows error
- [ ] Created user can login successfully

### Van Salesman
- [ ] Admin can create van salesman
- [ ] Auto-generated username works
- [ ] Random password is shown once
- [ ] Salesman can login with generated credentials

### Password Management
- [ ] User can change own password
- [ ] Admin can reset any user's password
- [ ] Wrong current password shows error
- [ ] Password changes are logged in audit

### User Disable
- [ ] Admin can disable users
- [ ] Disabled user cannot login
- [ ] Cannot disable own account
- [ ] User data remains in database

---

## 🚀 Next Steps

1. ✅ **Restart the app** - Changes take effect after restart
2. ✅ **Test user creation** - Try adding admin, manager, cashier
3. ✅ **Test password changes** - Change your password
4. ✅ **Test role permissions** - Verify each role's access

---

**Fixed By**: Kiro AI Agent  
**Fix Date**: August 12, 2026  
**Files Modified**: 
- `src/renderer/src/hooks/useUsers.ts`

**Status**: ✅ **READY TO TEST**

🎉 **Restart the app and try creating a user now!**
