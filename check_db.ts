import Database from 'better-sqlite3';
import path from 'path';

// Get the DB path. Since this is just a raw node script, we'll try the likely locations.
const pathsToTry = [
  path.join(process.env.HOME || '', '.config', 'khan-trader', 'khan-trader.sqlite'),
  path.join(process.env.HOME || '', '.config', 'Khan Trader', 'khan-trader.sqlite')
];

let db = null;
for (const p of pathsToTry) {
  try {
    db = new Database(p, { fileMustExist: true });
    console.log(`Successfully opened DB at: ${p}`);
    break;
  } catch (e) {
    // ignore
  }
}

if (!db) {
  console.log("Could not find database.");
  process.exit(1);
}

try {
  const schema = db.prepare("PRAGMA table_info(stock_adjustments)").all();
  console.log(JSON.stringify(schema, null, 2));
} catch (e) {
  console.error("Error running query", e);
}
