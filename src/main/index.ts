import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs/promises'

function createWindow(): void {
  // Create the browser window with native modern desktop aesthetics
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: 'ReviewClassifier AI - Enterprise CSV Classifier Studio',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#faf8ff',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Setup IPC handlers for native file dialogues & desktop system operations
function setupIpcHandlers(): void {
  // Native Open File Dialog for CSV / TSV files
  ipcMain.handle('dialog:open-csv', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Seleccionar archivo CSV / TSV de reseñas',
      properties: ['openFile'],
      filters: [
        { name: 'CSV / TSV Datasets', extensions: ['csv', 'tsv', 'txt'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = result.filePaths[0]
    const content = await fs.readFile(filePath, { encoding: 'utf-8' })
    const stats = await fs.stat(filePath)

    return {
      filePath,
      fileName: filePath.split(/[/\\]/).pop() || 'dataset.csv',
      content,
      sizeBytes: stats.size
    }
  })

  // Native Save File Dialog for exporting classified CSV with UTF-8 BOM
  ipcMain.handle('dialog:save-csv', async (_, { defaultName, content }: { defaultName: string; content: string }) => {
    const result = await dialog.showSaveDialog({
      title: 'Guardar CSV Enriquecido con Clasificación IA',
      defaultPath: defaultName || 'reviews_classified_ai.csv',
      filters: [
        { name: 'Archivo CSV (con UTF-8 BOM)', extensions: ['csv'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true }
    }

    // Save with UTF-8 encoding (content already includes \ufeff BOM from frontend)
    await fs.writeFile(result.filePath, content, { encoding: 'utf-8' })
    return { success: true, filePath: result.filePath }
  })

  // App platform metadata
  ipcMain.handle('app:get-platform', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: app.getVersion()
    }
  })
}

// App lifecycle
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.reviewclassifier.ai')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupIpcHandlers()
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
