import { db } from './src/main/db/connection';
import bcrypt from 'bcryptjs';

async function resetAdmin() {
  const admin = await db.selectFrom('users').where('role', '=', 'admin').selectAll().executeTakeFirst();
  if (admin) {
    console.log(`Found admin! Username: ${admin.username}`);
    const newPass = 'admin123';
    const hash = await bcrypt.hash(newPass, 12);
    await db.updateTable('users').where('id', '=', admin.id).set({ password_hash: hash }).execute();
    console.log(`Password reset successfully to: ${newPass}`);
  } else {
    console.log('No admin found!');
  }
}

resetAdmin().catch(console.error);
