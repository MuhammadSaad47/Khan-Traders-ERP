/**
 * Script to manually set up security questions for admin user (Saady)
 * Run this if you want to set up security questions from command line
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  const dbPath = '/home/saad-afridi/.config/khan-trader/khan-trader.sqlite';
  const db = new Database(dbPath);

  console.log('\n===========================================');
  console.log('Admin Security Questions Setup');
  console.log('===========================================\n');

  // Get admin user
  const admin = db.prepare('SELECT id, username, full_name FROM users WHERE username = ? AND role = ?').get('Saady', 'admin');
  
  if (!admin) {
    console.log('❌ Admin user "Saady" not found!');
    db.close();
    rl.close();
    return;
  }

  console.log(`✓ Found admin: ${admin.full_name} (${admin.username})\n`);

  console.log('Available security questions:');
  console.log('1. What is your mother\'s maiden name?');
  console.log('2. What was the name of your first pet?');
  console.log('3. In which city were you born?');
  console.log('4. What is your favorite book or movie?');
  console.log('5. What was the name of your elementary school?');
  console.log('6. What is your father\'s middle name?');
  console.log('7. What was your childhood nickname?');
  console.log('8. What is the name of the street you grew up on?\n');

  // Question 1
  const q1Num = await question('Select question 1 (1-8): ');
  const questions = [
    "What is your mother's maiden name?",
    'What was the name of your first pet?',
    'In which city were you born?',
    'What is your favorite book or movie?',
    'What was the name of your elementary school?',
    "What is your father's middle name?",
    'What was your childhood nickname?',
    'What is the name of the street you grew up on?'
  ];
  const question1 = questions[parseInt(q1Num) - 1];
  const answer1 = await question(`Answer for "${question1}": `);

  // Question 2
  const q2Num = await question('\nSelect question 2 (1-8, different from question 1): ');
  const question2 = questions[parseInt(q2Num) - 1];
  const answer2 = await question(`Answer for "${question2}": `);

  // Question 3
  const q3Num = await question('\nSelect question 3 (1-8, different from questions 1 and 2): ');
  const question3 = questions[parseInt(q3Num) - 1];
  const answer3 = await question(`Answer for "${question3}": `);

  console.log('\n⏳ Hashing answers...');

  // Hash answers (case-insensitive)
  const answer1Hash = await bcrypt.hash(answer1.toLowerCase().trim(), 12);
  const answer2Hash = await bcrypt.hash(answer2.toLowerCase().trim(), 12);
  const answer3Hash = await bcrypt.hash(answer3.toLowerCase().trim(), 12);

  // Update database
  db.prepare(`
    UPDATE users
    SET security_question_1 = ?,
        security_answer_1_hash = ?,
        security_question_2 = ?,
        security_answer_2_hash = ?,
        security_question_3 = ?,
        security_answer_3_hash = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(question1, answer1Hash, question2, answer2Hash, question3, answer3Hash, admin.id);

  console.log('\n✅ Security questions have been set up successfully!');
  console.log('You can now use the "Forgot Password" feature on the login page.\n');

  db.close();
  rl.close();
}

main().catch(console.error);
