import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const logFile = path.join(__dirname, 'electron_debug.log');
function log(msg: string) {
  try { fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`); } catch {}
}

process.on('uncaughtException', (err) => {
  log(`UNCAUGHT EXCEPTION: ${err?.stack || err?.message}`);
});

process.on('unhandledRejection', (reason) => {
  log(`UNHANDLED REJECTION: ${reason}`);
});

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow(): void {
  log('createWindow called');
  try {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 1080,
      minHeight: 700,
      frame: false,
      backgroundColor: '#051424',
      show: true,
      center: true,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
    });
    log('BrowserWindow instance created');
  } catch (err: any) {
    log(`BrowserWindow creation error: ${err?.message}`);
    throw err;
  }

  mainWindow.setMenuBarVisibility(false);

  // Abrir enlaces externos en el navegador predeterminado del sistema
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    log(`did-fail-load: ${errorCode} ${errorDescription}`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log('did-finish-load successfully');
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    log(`render-process-gone: ${JSON.stringify(details)}`);
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    log(`console [lvl ${level}]: ${message} (${sourceId}:${line})`);
  });

  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    log(`loading devServerUrl: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl);
  } else {
    const prodFile = path.join(__dirname, '../dist/index.html');
    log(`loading prodFile: ${prodFile}`);
    mainWindow.loadFile(prodFile);
  }

  mainWindow.focus();

  mainWindow.on('closed', () => {
    log('mainWindow closed');
    mainWindow = null;
  });
}

// IPC Handlers para el marco de ventana sin bordes
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
