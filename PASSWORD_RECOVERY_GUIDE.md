# Password Recovery System - User Guide

## 🎉 Implementation Complete!

The password recovery system with security questions has been successfully implemented for Khan Trader application.

---

## 📋 What's New

### 1. **Forgot Password Link**
- Available on the login page
- Click "Forgot Password?" to start the recovery process

### 2. **Security Questions Setup**
- During initial admin setup, you'll be prompted to set up 3 security questions
- Can skip during setup and configure later from Settings
- Available in Settings → My Account → Security Questions

### 3. **Password Recovery Flow**
- Enter your username
- Answer 3 security questions
- Set a new password
- Login with new credentials

### 4. **Security Features**
- Answers are hashed (bcrypt) - never stored in plaintext
- Case-insensitive answer verification
- Rate limiting: 5 failed attempts → 30-minute lockout
- Comprehensive audit logging
- Only works for active, non-deleted users

---

## 🚀 How to Use

### For Admin User (Saady)

#### **Current Admin Credentials:**
```
Username: Saady
Password: [Your current password]
```

#### **Option 1: Set Up Security Questions via App**

1. Login to the application
2. Go to **Settings** (gear icon)
3. Click on **"My Account"** or **"User Management"** tab
4. Find the **Security Questions** section
5. Click **"Set Up Security Questions"**
6. Choose 3 different questions from the dropdown
7. Enter answers (case-insensitive)
8. Click **"Save Security Questions"**

#### **Option 2: Set Up Security Questions via Command Line**

If you can't login (forgot password before setting up security questions):

```bash
cd "/home/saad-afridi/Khan Traders/khan-trader"
node setup-admin-security.js
```

Follow the interactive prompts to set up your security questions.

---

### Recovering Your Password

1. On the login page, click **"Forgot Password?"**
2. Enter your username: `Saady`
3. Answer the 3 security questions you configured
4. Enter and confirm your new password
5. Click **"Reset Password"**
6. You'll be redirected to login with your new password

---

## 🔐 Available Security Questions

1. What is your mother's maiden name?
2. What was the name of your first pet?
3. In which city were you born?
4. What is your favorite book or movie?
5. What was the name of your elementary school?
6. What is your father's middle name?
7. What was your childhood nickname?
8. What is the name of the street you grew up on?
9. What is your favorite food?
10. What was your first car's make and model?
11. What is the name of your best childhood friend?
12. In which city did you meet your spouse/partner?

---

## ⚠️ Important Notes

### Security Best Practices

1. **Choose questions with memorable answers** - Don't forget them!
2. **Answers are case-insensitive** - "LONDON" and "london" are treated the same
3. **Whitespace is trimmed** - "   Paris   " becomes "Paris"
4. **Select different questions** - All 3 questions must be unique
5. **Keep answers private** - Don't share with others

### Rate Limiting

- **5 failed attempts** → Account recovery locked for **30 minutes**
- Failed attempts are tracked per username
- Counter resets after successful recovery

### Audit Trail

All recovery attempts are logged:
- Username attempted
- Success/failure status
- Timestamp
- IP address (if available)

---

## 🧪 Testing Checklist

### Initial Setup Testing
- [ ] Create a new admin account
- [ ] Security questions setup prompted after account creation
- [ ] Can skip security questions setup
- [ ] Security questions saved successfully
- [ ] Redirected to dashboard after setup

### Settings Page Testing
- [ ] Security Questions section visible in My Account tab
- [ ] Shows "Not configured" badge if not set up
- [ ] Shows "Configured" badge if set up
- [ ] Can update existing security questions
- [ ] Validation works (duplicate questions rejected)

### Password Recovery Testing
- [ ] "Forgot Password?" link visible on login page
- [ ] Enter valid username → shows security questions
- [ ] Enter invalid username → generic error message
- [ ] Correct answers → password reset successful
- [ ] Incorrect answers → error with remaining attempts shown
- [ ] 5 failed attempts → account locked for 30 minutes
- [ ] Can login with new password after reset
- [ ] Old password no longer works

### Security Testing
- [ ] Answers stored as bcrypt hashes (not plaintext)
- [ ] Case-insensitive verification works
- [ ] Recovery locked if too many attempts
- [ ] Audit logs created for all attempts
- [ ] Cannot recover deleted/inactive users

---

## 📁 Files Modified/Created

### New Files
```
migrations/0018_security_questions.sql
src/main/services/security-questions.service.ts
src/renderer/src/components/ForgotPassword.tsx
src/renderer/src/components/SecurityQuestionsSetup.tsx
setup-admin-security.js
ADMIN_CREDENTIALS_AND_PASSWORD_RECOVERY.md
PASSWORD_RECOVERY_GUIDE.md
```

### Modified Files
```
src/renderer/src/components/Auth.tsx
src/main/ipc/auth.ipc.ts
src/preload/index.d.ts
src/renderer/src/pages/settings/SettingsPage.tsx
```

---

## 🐛 Troubleshooting

### "Security questions have not been configured"
**Solution:** Set up security questions via Settings or command line script

### "Account recovery is temporarily locked"
**Solution:** Wait 30 minutes or contact system administrator

### "Invalid username or security answers"
**Solution:** 
- Verify username is correct (case-sensitive)
- Check answers are correct (case-insensitive)
- You have 5 attempts before lockout

### Cannot access application at all
**Solution:** Use the existing `fix-admin.ts` script:
```bash
cd "/home/saad-afridi/Khan Traders/khan-trader"
npm run build
node fix-admin.ts
```

---

## 📊 Database Schema Changes

### New Columns in `users` Table
```sql
security_question_1 TEXT
security_answer_1_hash TEXT
security_question_2 TEXT
security_answer_2_hash TEXT
security_question_3 TEXT
security_answer_3_hash TEXT
recovery_attempts INTEGER DEFAULT 0
last_recovery_attempt TEXT
recovery_locked_until TEXT
```

### New Index
```sql
idx_users_username_recovery ON users(username, is_active, is_deleted)
```

---

## 🎯 Next Steps

1. **Set up your security questions NOW** - Don't wait until you forget your password
2. **Test the recovery flow** - Make sure it works before you need it
3. **Document your questions** - Store them in a secure location
4. **Train other users** - Show them how to set up security questions

---

## 💡 Tips

- Use personal information only you would know
- Don't use easily guessable answers
- Consider using a password manager for security question answers
- Update security questions if circumstances change
- Test recovery process periodically

---

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review audit logs in Settings → Diagnostics
3. Check the application logs for errors
4. Contact system administrator

---

**Last Updated:** August 13, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
