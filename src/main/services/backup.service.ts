import { google } from 'googleapis'
import { app, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import http from 'http'
import { getSqlite } from '../db/connection'
import { db } from '../db/connection'

// Google OAuth credentials are embedded at build time via electron.vite.config.ts
// On a fresh install they are NOT set until the user authenticates from Settings.
// Declare the build-time injected globals with a fallback for dev mode.
declare const __GOOGLE_CLIENT_ID__: string
declare const __GOOGLE_CLIENT_SECRET__: string

// In development, fall back to process.env so dotenv still works
const CLIENT_ID: string = (typeof __GOOGLE_CLIENT_ID__ !== 'undefined' && __GOOGLE_CLIENT_ID__)
  ? __GOOGLE_CLIENT_ID__
  : (process.env.VITE_GOOGLE_CLIENT_ID || '')

const CLIENT_SECRET: string = (typeof __GOOGLE_CLIENT_SECRET__ !== 'undefined' && __GOOGLE_CLIENT_SECRET__)
  ? __GOOGLE_CLIENT_SECRET__
  : (process.env.VITE_GOOGLE_CLIENT_SECRET || '')

const SCOPES = ['https://www.googleapis.com/auth/drive.appdata']
const TOKEN_PATH = path.join(app.getPath('userData'), 'google_token.json')

/**
 * Check if the user has already authenticated Google Drive.
 * On a fresh installation, no token file exists → returns false.
 * The user must go to Settings → Backup → Connect Google Drive to authorize.
 */
export const isAuthorized = (): boolean => {
  if (!fs.existsSync(TOKEN_PATH)) return false
  try {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'))
    // Token file must exist AND have a real access_token to be considered authorized
    if (!token.access_token) return false
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET)
    oauth2Client.setCredentials(token)
    return true
  } catch (e) {
    return false
  }
}

export const disconnectGoogleDrive = (): void => {
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      fs.unlinkSync(TOKEN_PATH)
    } catch (e) {
      console.error('Error removing token file:', e)
    }
  }
}

// Helper to get authorized client
const getAuthClient = () => {
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET)
  if (fs.existsSync(TOKEN_PATH)) {
    oauth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')))
  }
  return oauth2Client
}

export const authenticateGoogleDrive = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isAuthorized()) {
      return resolve()
    }

    if (!CLIENT_ID || CLIENT_ID === 'YOUR_CLIENT_ID.apps.googleusercontent.com') {
      return reject(new Error('Google Drive is not configured. Please ensure the app was built with valid credentials.'))
    }

    // Start a server on any available dynamic port (Port 0)
    const server = http.createServer()

    const timeout = setTimeout(() => {
      server.close()
      reject(new Error('Authentication timed out after 2 minutes. Please try again.'))
    }, 120000)

    server.on('listening', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      const redirectUri = `http://127.0.0.1:${port}/oauth2callback`

      const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUri)

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
      })

      server.on('request', async (req, res) => {
        try {
          if (req.url?.startsWith('/oauth2callback')) {
            const url = new URL(req.url, `http://127.0.0.1:${port}`)
            const code = url.searchParams.get('code')
            if (code) {
              const { tokens } = await oauth2Client.getToken(code)
              fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens))
              res.end('Authentication successful! You can safely close this tab and return to the application.')
              clearTimeout(timeout)
              server.close()
              resolve()
            } else {
              res.end('Error: No code found in the response.')
              clearTimeout(timeout)
              server.close()
              reject(new Error('No code found'))
            }
          }
        } catch (e) {
          res.end('Authentication failed! You can close this tab.')
          clearTimeout(timeout)
          server.close()
          reject(e)
        }
      })

      shell.openExternal(authUrl)
    })

    server.on('error', (err) => {
      reject(err)
    })

    // Listen on port 0 to let the OS assign a random available port
    server.listen(0, '127.0.0.1')
  })
}

export const getBackupStatus = async () => {
  if (!isAuthorized()) return { authorized: false, lastBackup: null }

  try {
    const drive = google.drive({ version: 'v3', auth: getAuthClient() })
    const res = await drive.files.list({
      spaces: 'appDataFolder',
      fields: 'files(id, name, modifiedTime)',
      q: "name='khan-trader.sqlite'",
      pageSize: 1
    })

    const files = res.data.files
    if (files && files.length > 0) {
      return { authorized: true, lastBackup: files[0].modifiedTime }
    }
    return { authorized: true, lastBackup: null }
  } catch (error: any) {
    if (error.code === 'EAI_AGAIN' || error.message?.includes('network') || error.message?.includes('EAI_AGAIN')) {
      console.warn('Backup status check skipped: Network offline.')
    } else {
      console.error('Error fetching backup status:', error)
    }
    return { authorized: true, lastBackup: null }
  }
}

export const backupToGoogleDrive = async (): Promise<void> => {
  if (!isAuthorized()) throw new Error('Not authorized. Please connect Google Drive from Settings first.')

  const drive = google.drive({ version: 'v3', auth: getAuthClient() })
  const sqlite = getSqlite()

  // Safely backup the database to a temporary file
  const backupPath = path.join(app.getPath('temp'), 'khan-trader-backup.sqlite')
  await sqlite.backup(backupPath)

  // CRITICAL: Verify backup integrity before uploading
  const isValid = await verifyBackupIntegrity(backupPath)
  if (!isValid) {
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath)
    // Record failed backup to DB
    await recordBackupLog(null, 'failed')
    throw new Error('Backup verification failed: Database file is corrupt or incomplete')
  }

  try {
    // Find if we already have a backup file
    const listRes = await drive.files.list({
      spaces: 'appDataFolder',
      fields: 'files(id, name)',
      q: "name='khan-trader.sqlite'"
    })

    const fileMetadata = {
      name: 'khan-trader.sqlite',
      parents: ['appDataFolder']
    }

    const media = {
      mimeType: 'application/x-sqlite3',
      body: fs.createReadStream(backupPath)
    }

    const existingFile = listRes.data.files?.[0]

    if (existingFile?.id) {
      // Update existing file
      await drive.files.update({
        fileId: existingFile.id,
        media: media
      })
    } else {
      // Create new file
      await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id'
      })
    }

    // Record successful backup to the database
    const stats = fs.statSync(backupPath)
    await recordBackupLog(stats.size, 'success')

    console.log('Backup uploaded and verified successfully')
  } catch (error: any) {
    if (error.code === 'EAI_AGAIN' || error.message?.includes('network') || error.message?.includes('EAI_AGAIN')) {
      console.warn('Backup upload skipped: Network offline.')
    } else {
      // Record failed backup to DB
      await recordBackupLog(null, 'failed').catch(() => {})
      console.error('Failed to upload backup to Google Drive:', error)
    }
  } finally {
    // Cleanup local temporary backup
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath)
    }
  }
}

/**
 * Record a backup attempt to the backup_log table for history tracking.
 */
async function recordBackupLog(sizeBytes: number | null, status: 'success' | 'failed'): Promise<void> {
  try {
    await db.insertInto('backup_log')
      .values({
        file_path: 'google_drive:khan-trader.sqlite',
        size_bytes: sizeBytes ?? 0,
        destination: 'google_drive',
        status: status
      })
      .execute()
  } catch (e) {
    // Non-critical — don't crash the backup process if logging fails
    console.error('Failed to record backup log:', e)
  }
}

/**
 * Verify backup database integrity
 * Checks file size, opens DB, verifies critical tables exist, and runs integrity check
 */
async function verifyBackupIntegrity(backupPath: string): Promise<boolean> {
  try {
    // 1. Check file exists and has non-zero size
    const stats = fs.statSync(backupPath)
    if (stats.size === 0) {
      console.error('Backup verification failed: File is empty')
      return false
    }

    // 2. Try opening the database with better-sqlite3
    const Database = require('better-sqlite3')
    const testDb = new Database(backupPath, { readonly: true })

    try {
      // 3. Run SQLite integrity check
      const integrityResult = testDb.prepare('PRAGMA integrity_check').get() as any
      if (integrityResult.integrity_check !== 'ok') {
        console.error('Backup verification failed: Integrity check failed:', integrityResult)
        testDb.close()
        return false
      }

      // 4. Verify critical tables exist
      const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]
      const requiredTables = ['users', 'sales', 'purchases', 'items', 'customers', 'suppliers', 'accounts']
      const tableNames = tables.map((row: any) => row.name)

      for (const requiredTable of requiredTables) {
        if (!tableNames.includes(requiredTable)) {
          console.error(`Backup verification failed: Missing critical table "${requiredTable}"`)
          testDb.close()
          return false
        }
      }

      // 5. Verify tables have data (at least users table should have records)
      const userCount = testDb.prepare('SELECT COUNT(*) as count FROM users').get() as any
      if (userCount.count === 0) {
        console.error('Backup verification failed: Users table is empty')
        testDb.close()
        return false
      }

      testDb.close()
      return true
    } catch (error) {
      console.error('Backup verification failed: Error checking database:', error)
      testDb.close()
      return false
    }
  } catch (error) {
    console.error('Backup verification failed: Cannot open backup file:', error)
    return false
  }
}

export const restoreFromGoogleDrive = async (): Promise<void> => {
  if (!isAuthorized()) throw new Error('Not authorized')

  const drive = google.drive({ version: 'v3', auth: getAuthClient() })

  const listRes = await drive.files.list({
    spaces: 'appDataFolder',
    fields: 'files(id, name)',
    q: "name='khan-trader.sqlite'"
  })

  const existingFile = listRes.data.files?.[0]
  if (!existingFile?.id) {
    throw new Error('No backup found on Google Drive')
  }

  const res = await drive.files.get(
    { fileId: existingFile.id, alt: 'media' },
    { responseType: 'stream' }
  )

  const downloadPath = path.join(app.getPath('temp'), 'khan-trader-restored.sqlite')
  const dest = fs.createWriteStream(downloadPath)

  await new Promise<void>((resolve, reject) => {
    res.data
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .pipe(dest)
  })

  // We need to gracefully replace the DB
  const sqlite = getSqlite()
  sqlite.close() // Close current connection

  const dbPath = path.join(app.getPath('userData'), 'khan-trader.sqlite')

  // Also remove WAL files to prevent corruption after restore
  const walPath = dbPath + '-wal'
  const shmPath = dbPath + '-shm'

  fs.copyFileSync(downloadPath, dbPath)

  if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)

  if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath)

  // Restart app to re-initialize everything cleanly
  app.relaunch()
  app.exit(0)
}
