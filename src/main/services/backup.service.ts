import { google } from 'googleapis'
import { app, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import http from 'http'
import { getSqlite } from '../db/connection'

// Load .env variables into the main process
import dotenv from 'dotenv'
dotenv.config({ path: path.join(app.getAppPath(), '../../.env') }) 
// Fallback if running directly from source
if (!process.env.VITE_GOOGLE_CLIENT_ID) {
  dotenv.config({ path: path.join(__dirname, '../../.env') })
}
if (!process.env.VITE_GOOGLE_CLIENT_ID) {
  dotenv.config({ path: path.join(process.cwd(), '.env') })
}

const CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID.apps.googleusercontent.com'
const CLIENT_SECRET = process.env.VITE_GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET'
const REDIRECT_URI = 'http://localhost:3000/oauth2callback'

const SCOPES = ['https://www.googleapis.com/auth/drive.appdata']
const TOKEN_PATH = path.join(app.getPath('userData'), 'google_token.json')

export const isAuthorized = (): boolean => {
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'))
      const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET)
      oauth2Client.setCredentials(token)
      return true
    } catch (e) {
      return false
    }
  }
  return false
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

    // Start a server on any available dynamic port (Port 0)
    const server = http.createServer()
    
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
              server.close()
              resolve()
            } else {
              res.end('Error: No code found in the response.')
              server.close()
              reject(new Error('No code found'))
            }
          }
        } catch (e) {
          res.end('Authentication failed! You can close this tab.')
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
  } catch (error) {
    console.error('Error fetching backup status:', error)
    return { authorized: true, lastBackup: null }
  }
}

export const backupToGoogleDrive = async (): Promise<void> => {
  if (!isAuthorized()) throw new Error('Not authorized')

  const drive = google.drive({ version: 'v3', auth: getAuthClient() })
  const sqlite = getSqlite()
  
  // Safely backup the database to a temporary file
  const backupPath = path.join(app.getPath('temp'), 'khan-trader-backup.sqlite')
  await sqlite.backup(backupPath)

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

  // Cleanup local temporary backup
  if (fs.existsSync(backupPath)) {
    fs.unlinkSync(backupPath)
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
