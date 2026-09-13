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
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];
    const results = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (audioExtensions.includes(ext)) {
          const fullPath = path.join(dirPath, entry.name);
          const stats = fs.statSync(fullPath);
          results.push({
            name: entry.name,
            fullPath,
            size: stats.size,
          });
        }
      }
    }
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

// Auto-Updater & GitHub Patch Engine
let autoUpdater = null;
try {
  const updaterModule = require('electron-updater');
  autoUpdater = updaterModule.autoUpdater;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  log('electron-updater initialized');

  autoUpdater.on('checking-for-update', () => {
    log('[UPDATER] Checking for update on GitHub...');
    mainWindow?.webContents.send('updater-status', { status: 'checking', message: 'Checking GitHub for patches...' });
  });

  autoUpdater.on('update-available', (info) => {
    log(`[UPDATER] Patch available: v${info.version}`);
    mainWindow?.webContents.send('updater-status', {
      status: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
      message: `Patch v${info.version} is available!`
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    log('[UPDATER] CloudMix Pro is up to date.');
    mainWindow?.webContents.send('updater-status', {
      status: 'not-available',
      version: app.getVersion(),
      message: 'CloudMix Pro is up to date.'
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const pct = Math.round(progressObj.percent || 0);
    log(`[UPDATER] Download progress: ${pct}%`);
    mainWindow?.webContents.send('updater-status', {
      status: 'downloading',
      percent: pct,
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total,
      message: `Downloading patch: ${pct}%`
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    log(`[UPDATER] Patch downloaded: v${info.version}`);
    mainWindow?.webContents.send('updater-status', {
      status: 'downloaded',
      version: info.version,
      message: `Patch v${info.version} ready. Restart to apply.`
    });
  });

  autoUpdater.on('error', (err) => {
    log(`[UPDATER] Error: ${err == null ? 'unknown' : (err.stack || err).toString()}`);
    mainWindow?.webContents.send('updater-status', {
      status: 'error',
      error: (err && err.message) || String(err),
      message: 'Update check complete.'
    });
  });
} catch (e) {
  log('electron-updater initialization error: ' + e.message);
}

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('check-for-updates', async () => {
  log('IPC: check-for-updates called');
  if (autoUpdater) {
    try {
      const res = await autoUpdater.checkForUpdates();
      return { success: true, updateInfo: res?.updateInfo };
    } catch (err) {
      log('autoUpdater.checkForUpdates error: ' + err.message);
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'autoUpdater not available' };
});

let downloadedInstallerPath = null;

ipcMain.handle('start-update-download', async () => {
  log('IPC: start-update-download called');
  if (autoUpdater) {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err) {
      log('autoUpdater.downloadUpdate error: ' + err.message + ' - falling back to direct GitHub release asset download');
    }
  }

  // Robust Direct Asset Fallback: Stream directly from GitHub Releases
  try {
    const https = require('https');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const releaseData = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/iammrwrath/CloudMix-Pro/releases/latest',
        method: 'GET',
        headers: {
          'User-Agent': 'CloudMix-Pro/' + app.getVersion(),
          'Accept': 'application/vnd.github.v3+json',
        },
      };
      https.get(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });

    const asset = releaseData?.assets?.find((a) => a.name.endsWith('Setup.exe') || a.name.endsWith('.exe'));
    if (!asset || !asset.browser_download_url) {
      throw new Error('No executable setup asset found in latest GitHub release');
    }

    const downloadUrl = asset.browser_download_url;
    log('Downloading release asset from: ' + downloadUrl);

    const tempFile = path.join(os.tmpdir(), `CloudMix-Pro-Setup-${releaseData.tag_name || 'latest'}.exe`);
    const fileStream = fs.createWriteStream(tempFile);

    const downloadWithRedirect = (url) => {
      return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'CloudMix-Pro' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return downloadWithRedirect(res.headers.location).then(resolve).catch(reject);
          }
          if (res.statusCode !== 200) {
            return reject(new Error('Download failed with status: ' + res.statusCode));
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
          let downloadedBytes = 0;

          res.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            if (totalBytes > 0) {
              const pct = Math.round((downloadedBytes / totalBytes) * 100);
              mainWindow?.webContents.send('updater-status', {
                status: 'downloading',
                percent: pct,
                message: `Downloading patch: ${pct}%`,
              });
            }
          });

          res.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            resolve(tempFile);
          });
          fileStream.on('error', reject);
        }).on('error', reject);
      });
    };

    downloadedInstallerPath = await downloadWithRedirect(downloadUrl);
    log('Successfully downloaded installer to: ' + downloadedInstallerPath);

    mainWindow?.webContents.send('updater-status', {
      status: 'downloaded',
      version: releaseData.tag_name?.replace(/^v/, ''),
      message: `Patch ${releaseData.tag_name} ready. Click Restart & Apply.`,
    });

    return { success: true };
  } catch (err) {
    log('Direct GitHub release download failed: ' + err.message);
    mainWindow?.webContents.send('updater-status', {
      status: 'error',
      error: err.message,
      message: 'Download failed: ' + err.message,
    });
    return { success: false, error: err.message };
  }
});

ipcMain.handle('restart-and-install-patch', async () => {
  log('IPC: restart-and-install-patch called');
  if (downloadedInstallerPath && fs.existsSync(downloadedInstallerPath)) {
    log('Launching downloaded setup executable: ' + downloadedInstallerPath);
    const { spawn } = require('child_process');
    spawn(downloadedInstallerPath, [], { detached: true, stdio: 'ignore' }).unref();
    app.quit();
    return { success: true };
  }

  if (autoUpdater) {
    try {
      autoUpdater.quitAndInstall(false, true);
      return { success: true };
    } catch (err) {
      log('autoUpdater.quitAndInstall error: ' + err.message);
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'No downloaded update available to execute' };
});

ipcMain.handle('check-github-releases', async () => {
  try {
    const https = require('https');
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/iammrwrath/CloudMix-Pro/releases/latest',
        method: 'GET',
        headers: {
          'User-Agent': 'CloudMix-Pro/' + app.getVersion(),
          'Accept': 'application/vnd.github.v3+json'
        }
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const release = JSON.parse(data);
              resolve({ success: true, release });
            } catch {
              resolve({ success: false, error: 'JSON parse error' });
            }
          } else if (res.statusCode === 404) {
            resolve({ success: true, release: null, message: 'No releases published yet' });
          } else {
            resolve({ success: false, statusCode: res.statusCode });
          }
        });
      });
      req.on('error', (e) => resolve({ success: false, error: e.message }));
      req.end();
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
});

