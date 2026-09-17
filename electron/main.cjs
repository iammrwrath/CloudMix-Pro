const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const logFile = path.join(os.tmpdir(), 'cloudmix_electron.log');
function log(msg) {
  try {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
  console.log(msg);
}

process.on('exit', (code) => log(`[PROCESS EXIT] code: ${code}`));
process.on('uncaughtException', (err) => log('[UNCAUGHT EXCEPTION] ' + (err.stack || err)));
process.on('unhandledRejection', (reason) => log('[UNHANDLED REJECTION] ' + reason));

log('Electron main process starting up...');

// Optimize for real-time audio and high refresh rate displays
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('allow-file-access-from-files');
app.commandLine.appendSwitch('disable-web-security');

let mainWindow = null;

function createWindow() {
  log('createWindow() called');
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0a0d14',
    title: 'CloudMix Pro — Next-Gen Cloud DJ',
    autoHideMenuBar: true,
    frame: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      backgroundThrottling: false,
    },
  });

  const distPaths = [
    path.join(__dirname, 'dist', 'index.html'),
    path.join(process.resourcesPath || '', 'app.asar', 'dist', 'index.html'),
    path.join(process.resourcesPath || '', 'app', 'dist', 'index.html'),
    path.join(__dirname, '..', 'dist', 'index.html'),
  ];

  let targetPath = null;
  for (const p of distPaths) {
    if (fs.existsSync(p)) {
      targetPath = p;
      break;
    }
  }

  log(`Target index.html path: ${targetPath}`);

  if (targetPath) {
    mainWindow.loadFile(targetPath);
  } else {
    mainWindow.loadURL('http://localhost:3000');
  }

  // Support F12 and Ctrl+Shift+I to toggle DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Comprehensive renderer console logging
  mainWindow.webContents.on('console-message', (event, ...args) => {
    let msg, lvl, src, ln;
    if (typeof event === 'object' && event !== null && event.message !== undefined) {
      msg = event.message;
      lvl = event.level;
      src = event.sourceId;
      ln = event.lineNumber;
    } else {
      lvl = event;
      msg = args[0];
      ln = args[1];
      src = args[2];
    }
    log(`[RENDERER ${lvl}] ${msg} (${src}:${ln})`);
  });

  mainWindow.webContents.on('did-finish-load', async () => {
    log('mainWindow finished loading.');
    try {
      const docTitle = await mainWindow.webContents.executeJavaScript('document.title');
      const rootLength = await mainWindow.webContents.executeJavaScript('document.getElementById("root") ? document.getElementById("root").innerHTML.length : 0');
      log(`mainWindow document.title: "${docTitle}", root HTML length: ${rootLength}`);
    } catch (e) {
      log(`Error inspecting rendered page: ${e.message}`);
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc, validatedURL) => {
    log(`mainWindow FAILED to load (${errorCode}): ${errorDesc} URL: ${validatedURL}`);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    log(`Renderer process gone: reason=${details.reason}, exitCode=${details.exitCode}`);
  });

  mainWindow.on('close', (e) => {
    log('mainWindow "close" event fired.');
  });

  mainWindow.on('closed', () => {
    log('mainWindow "closed" event fired.');
    mainWindow = null;
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
log(`requestSingleInstanceLock: gotTheLock=${gotTheLock}`);
if (!gotTheLock) {
  log('Single instance lock rejected. Quitting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    log('Second instance triggered. Focusing main window.');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
  log('app window-all-closed fired.');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for Native Desktop Capabilities
ipcMain.handle('read-local-audio', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }
    throw new Error('File not found: ' + filePath);
  } catch (err) {
    log('Error reading local audio: ' + err);
    throw err;
  }
});

ipcMain.handle('scan-directory', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) return [];
    const audioExtensions = new Set(['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.aif', '.aiff', '.wma']);
    const results = [];

    const scanSubdir = (currentDir, depth = 0) => {
      if (depth > 10) return;
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          try {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
              scanSubdir(fullPath, depth + 1);
            } else if (entry.isFile()) {
              const ext = path.extname(entry.name).toLowerCase();
              if (audioExtensions.has(ext)) {
                const stats = fs.statSync(fullPath);
                results.push({
                  name: entry.name,
                  fullPath,
                  size: stats.size,
                });
              }
            }
          } catch {}
        }
      } catch {}
    };

    scanSubdir(dirPath, 0);
    log(`[SCAN DIRECTORY] Scanned ${results.length} tracks from ${dirPath}`);
    return results;
  } catch (err) {
    log('Error scanning directory: ' + err);
    return [];
  }
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('write-now-playing-broadcast', async (event, { title, artist, bpm, key, deck }) => {
  try {
    const streamerDir = 'C:\\StreamerBot';
    const nowPlayingFile = path.join(streamerDir, 'nowplaying.txt');
    const triggerFile = path.join(streamerDir, 'trigger.txt');

    if (!fs.existsSync(streamerDir)) {
      try { fs.mkdirSync(streamerDir, { recursive: true }); } catch {}
    }

    const content = `${artist} - ${title} [${bpm} BPM | ${key}] (Deck ${deck})`;
    fs.writeFileSync(nowPlayingFile, content, 'utf8');
    fs.writeFileSync(triggerFile, Date.now().toString(), 'utf8');
    return true;
  } catch (err) {
    log('Failed to write now playing trigger: ' + err);
    return false;
  }
});
