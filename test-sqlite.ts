import Database from 'better-sqlite3';

const dbPath = './khan-trader.sqlite'; // assuming it's in the workspace root or we can find it
console.log("Checking DB path:", dbPath);

// Let's find the db file first
import fs from 'fs';
let foundDb = '';
if (fs.existsSync(dbPath)) foundDb = dbPath;
else if (fs.existsSync('/home/saad-afridi/.config/khan-trader/khan-trader.sqlite')) foundDb = '/home/saad-afridi/.config/khan-trader/khan-trader.sqlite';
else if (fs.existsSync('/home/saad-afridi/.config/Khan Traders/khan-trader.sqlite')) foundDb = '/home/saad-afridi/.config/Khan Traders/khan-trader.sqlite';
console.log("Found DB:", foundDb);
