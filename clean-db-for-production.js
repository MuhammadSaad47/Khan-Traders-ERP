#!/usr/bin/env node
/**
 * Clean Database for Production Build
 * 
 * This script removes the development database so that the production
 * build (.exe) starts with a clean database and requires admin setup.
 * 
 * Run this before building the .exe file for distribution.
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'khan_trader.db');
const devDbPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'khan-trader', 'khan-trader.sqlite');

console.log('\n===========================================');
console.log('Clean Database for Production Build');
console.log('===========================================\n');

let cleaned = false;

// Remove local db file if it exists (shouldn't be packaged)
if (fs.existsSync(dbPath)) {
  try {
    fs.unlinkSync(dbPath);
    console.log('✓ Removed:', dbPath);
    cleaned = true;
  } catch (err) {
    console.error('✗ Failed to remove:', dbPath, err.message);
  }
}

// Check for any .db or .sqlite files in the project
const checkDir = (dir, depth = 0) => {
  if (depth > 3) return; // Don't go too deep
  
  try {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        checkDir(fullPath, depth + 1);
      } else if (stat.isFile() && (item.endsWith('.db') || item.endsWith('.sqlite'))) {
        console.log(`⚠️  Found database file: ${fullPath}`);
        try {
          fs.unlinkSync(fullPath);
          console.log('✓ Removed:', fullPath);
          cleaned = true;
        } catch (err) {
          console.error('✗ Failed to remove:', fullPath, err.message);
        }
      }
    });
  } catch (err) {
    // Ignore permission errors
  }
};

console.log('Scanning project for database files...\n');
checkDir(__dirname);

console.log('\n===========================================');
if (cleaned) {
  console.log('✅ Database cleaned successfully!');
  console.log('\nProduction build will:');
  console.log('  1. Start with empty database');
  console.log('  2. Run migrations automatically');
  console.log('  3. Prompt for admin setup on first run');
  console.log('\n⚠️  IMPORTANT: Run migrations are included in the build');
  console.log('   No manual database setup required by end users.');
} else {
  console.log('ℹ️  No database files found to clean.');
  console.log('   This is normal if database hasn\'t been created yet.');
}
console.log('===========================================\n');

console.log('📦 Ready for production build!');
console.log('   Run: npm run build:win (or build:linux, build:mac)\n');
