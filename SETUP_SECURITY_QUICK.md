# Quick Setup - Security Questions for Saady

## Run this command to set up security questions:

```bash
cd "/home/saad-afridi/Khan Traders/khan-trader"
node -e "
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('/home/saad-afridi/.config/khan-trader/khan-trader.sqlite');

// Example security questions and answers for Saady
const q1 = 'What is your mother\\'s maiden name?';
const a1 = 'khan';  // Change this!
const q2 = 'In which city were you born?';
const a2 = 'peshawar';  // Change this!
const q3 = 'What was your childhood nickname?';
const a3 = 'saad';  // Change this!

Promise.all([
  bcrypt.hash(a1.toLowerCase().trim(), 12),
  bcrypt.hash(a2.toLowerCase().trim(), 12),
  bcrypt.hash(a3.toLowerCase().trim(), 12)
]).then(([h1, h2, h3]) => {
  db.prepare(\`
    UPDATE users
    SET security_question_1 = ?,
        security_answer_1_hash = ?,
        security_question_2 = ?,
        security_answer_2_hash = ?,
        security_question_3 = ?,
        security_answer_3_hash = ?,
        updated_at = datetime('now')
    WHERE username = 'Saady'
  \`).run(q1, h1, q2, h2, q3, h3);
  
  console.log('✅ Security questions set for Saady!');
  console.log('Question 1:', q1);
  console.log('Answer 1:', a1);
  console.log('Question 2:', q2);
  console.log('Answer 2:', a2);
  console.log('Question 3:', q3);
  console.log('Answer 3:', a3);
  db.close();
});
"
```

## Your Security Questions & Answers:

1. **Question:** What is your mother's maiden name?
   **Answer:** `khan` (case-insensitive)

2. **Question:** In which city were you born?
   **Answer:** `peshawar` (case-insensitive)

3. **Question:** What was your childhood nickname?
   **Answer:** `saad` (case-insensitive)

## To Test:
1. Rebuild: `npm run build`
2. Run: `npm run dev`
3. Click "Forgot Password?"
4. Enter username: `Saady`
5. Answer the 3 questions
6. Set new password

Done!
