const { app } = require('electron');
const path = require('path');
const sqlite3 = require('better-sqlite3');

const dbPath = '/home/saad-afridi/.config/khan-trader/khan-trader.sqlite'; 
// Wait, the app name might be different. Let's just find the sqlite file!
