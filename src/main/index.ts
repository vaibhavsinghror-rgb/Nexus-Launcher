import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase } from './database/connection'
import { registerIpcHandlers } from './ipc'
import { ProcessManager } from './processes/ProcessManager'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1080,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#090b10',
    title: 'NEXUS LAUNCHER',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false, // strictly required for contextBridge to access Node bridge APIs
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      devTools: is.dev
    }
  })

  // Strip X-Frame-Options & CSP headers for localhost to enable embedded live previews
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    if (details.url.includes('localhost') || details.url.includes('127.0.0.1')) {
      const responseHeaders = { ...details.responseHeaders }
      delete responseHeaders['x-frame-options']
      delete responseHeaders['X-Frame-Options']
      delete responseHeaders['content-security-policy']
      delete responseHeaders['Content-Security-Policy']
      callback({ cancel: false, responseHeaders })
    } else {
      callback({ cancel: false })
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Prevent opening untrusted external URLs inside the app window
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Register all secure IPC channels
  registerIpcHandlers(mainWindow)

  // Load renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.nexus.launcher')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // Initialize singleton SQLite manager with WAL mode & Migration 001
    initDatabase()

    createWindow()

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('before-quit', async () => {
    try {
      await ProcessManager.getInstance().stopAll()
      closeDatabase()
    } catch (err) {
      console.error('Error during shutdown cleanup:', err)
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
