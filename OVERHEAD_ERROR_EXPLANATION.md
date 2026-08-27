# Overhead Expense Error - Insufficient Funds

**Date**: August 12, 2026  
**Error**: "Insufficient funds in account 'Cash in Hand': available Rs -36596000, required Rs 1000 for overhead"  
**Status**: ⚠️ **DATA INTEGRITY ISSUE - NEEDS FIX**

---

## 🔍 What's Happening

When you try to create a sale **WITH overhead expenses**, you get an error.  
When you create a sale **WITHOUT overhead**, it works fine.

### Error Message:
```
Error: Insufficient funds in account "Cash in Hand": 
available Rs -36596000, required Rs 1000 for overhead
```

---

## 🐛 Root Cause

Your **"Cash in Hand"** account has a **NEGATIVE balance of Rs -36,596,000**.

This means:
- More money was withdrawn/debited than was deposited/credited
- The account is showing you **owe** Rs 36.5 million (which doesn't make sense for cash)
- This is a data integrity issue from historical transactions

---

## 💡 Why It Works Without Overhead

### Sale WITHOUT Overhead:
1. ✅ Create sale record
2. ✅ Deduct stock
3. ✅ **Credit (add to)** Cash account when payment received ← No validation needed
4. ✅ Update customer balance

**No problem** - adding money to account (even negative) always works!

### Sale WITH Overhead:
1. ✅ Create sale record
2. ✅ Deduct stock
3. ✅ Credit Cash account when payment received
4. ✅ Update customer balance
5. ❌ **Debit (subtract from)** Cash account for overhead ← **VALIDATION FAILS!**

**Problem** - system checks if you have enough money before deducting!

---

## ✅ Why This Validation Exists

This validation was implemented as **CRITICAL-09** during the audit:

```typescript
// CRITICAL FIX: Validate account has sufficient balance before deducting
const account = await tx.selectFrom('accounts')
  .select(['current_balance', 'name'])
  .where('id', '=', oh.account_id)
  .executeTakeFirst()

if (account.current_balance < oh.amount) {
  throw new Error(`Insufficient funds in account "${account.name}": 
    available Rs ${account.current_balance}, required Rs ${oh.amount}`)
}
```

**Purpose**: Prevent creating expenses from accounts with insufficient funds (data integrity protection).

---

## 🔧 Solution: Fix Your Account Balance

### Option 1: Automated Fix (Recommended)

Run the fix script I created:

```bash
node fix-account-balance.js
```

This will:
1. Show all your account balances
2. Detect the negative balance
3. Offer to add an opening balance correction
4. Fix the Cash in Hand account

### Option 2: Manual Fix (Via App)

1. Go to **Accounts** page
2. Find "Cash in Hand" account
3. Click **"Add Opening Balance"** or **"Transfer Funds"**
4. Add sufficient amount to make balance positive (e.g., Rs 37,000,000)
5. Description: "Opening Balance Correction"

### Option 3: SQL Fix (Advanced Users)

```sql
-- Check current balance
SELECT id, name, current_balance FROM accounts WHERE name = 'Cash in Hand';

-- Add correction transaction (replace XXX with account_id)
INSERT INTO account_transactions (
  account_id, type, amount, reference_type, 
  description, created_by, created_at
) VALUES (
  XXX, 'credit', 37000000, 'adjustment',
  'Opening Balance Correction', 1, datetime('now')
);

-- Update account balance
UPDATE accounts 
SET current_balance = current_balance + 37000000 
WHERE name = 'Cash in Hand';
```

---

## 📊 Understanding Account Balances

### How Negative Balance Happens:

**Scenario Example:**
```
Starting balance: Rs 0
Payment received: +50,000 (balance: 50,000)
Overhead expense: -100,000 (balance: -50,000) ← NEGATIVE!
Another expense: -200,000 (balance: -250,000)
```

In your case, Rs -36.5M suggests:
- Missing opening balance entries
- Many expenses recorded without corresponding income
- Or expenses transferred from another account

---

## 🎯 What You Should Do

### Immediate Fix:
```bash
# Run the fix script
node fix-account-balance.js

# Answer "yes" when prompted
# This will add opening balance to Cash in Hand
```

### After Fix:
1. ✅ Check all your account balances
2. ✅ Verify the correction makes sense for your business
3. ✅ Try creating a sale with overhead again
4. ✅ It should work now!

### Long Term:
- Always ensure accounts have sufficient balance before expenses
- Use opening balance feature when setting up new accounts
- Regularly review account balances in dashboard
- Use Account Transfers to move money between accounts

---

## 🚨 Important Notes

### This is NOT a Bug
The validation is **working correctly** and protecting your data:
- ✅ Prevents impossible transactions (spending money you don't have)
- ✅ Ensures account balances are always accurate
- ✅ Maintains data integrity

### This is a Data Issue
- ❌ Your Cash in Hand account has negative balance
- ❌ This shouldn't happen in real business
- ❌ Needs to be corrected with opening balance

---

## 📝 Quick Reference

| Scenario | Account Balance | Overhead? | Result |
|----------|----------------|-----------|--------|
| Sale with payment | -36.5M → -36.49M | No | ✅ Works (credit only) |
| Sale with overhead | -36.5M → -36.501M | Yes | ❌ Fails (debit validation) |
| After fix (balance +1M) | +1M → +999K | Yes | ✅ Works (sufficient funds) |

---

**Fix Script**: `fix-account-balance.js`  
**Status**: Ready to run  
**Command**: `node fix-account-balance.js`

🎯 **Run the fix script now to resolve this issue!**
