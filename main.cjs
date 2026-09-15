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

const isStandaloneCortex =
  process.argv.includes('--cortex') ||
  process.argv.includes('--standalone-cortex') ||
  path.basename(process.execPath).toLowerCase().includes('cortex') ||
  (app.name && app.name.toLowerCase().includes('cortex'));

function getAppIconPath() {
  const iconCandidates = [
    path.join(__dirname, 'build', 'cortex-icon.png'),
    path.join(__dirname, 'public', 'cortex-icon.png'),
    path.join(__dirname, '..', 'build', 'cortex-icon.png'),
  ];
  for (const p of iconCandidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function createStandaloneCortexWindow() {
  log('createStandaloneCortexWindow() called (Standalone MixCortex App)');
  mainWindow = new BrowserWindow({
    width: 440,
    height: 760,
    minWidth: 300,
    minHeight: 360,
    backgroundColor: '#07090e',
    title: 'MixCortex AI — Neural DJ Co-Pilot',
    autoHideMenuBar: true,
    frame: false,
    alwaysOnTop: true,
    icon: getAppIconPath(),
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

  log(`Target standalone index.html path: ${targetPath}`);

  if (targetPath) {
    mainWindow.loadFile(targetPath, { hash: 'standalone-cortex', query: { view: 'standalone-cortex' } });
  } else {
    mainWindow.loadURL('http://localhost:3000/?view=standalone-cortex#standalone-cortex');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createWindow() {
  log('createWindow() called (CloudMix Pro Workstation)');
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0a0d14',
    title: 'CloudMix Pro — Next-Gen Cloud DJ',
    autoHideMenuBar: true,
    frame: true,
    icon: getAppIconPath(),
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
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc, validatedURL) => {
    log(`mainWindow FAILED to load (${errorCode}): ${errorDesc} URL: ${validatedURL}`);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    log(`Renderer process gone: reason=${details.reason}, exitCode=${details.exitCode}`);
  });

  mainWindow.on('closed', () => {
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

  app.whenReady().then(() => {
    if (isStandaloneCortex) {
      createStandaloneCortexWindow();
    } else {
      createWindow();
    }
  });
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

// ==============================================================================
// MIXCORTEX AI CO-PILOT ELECTRON INTEGRATION
// ==============================================================================
let cortexWindow = null;

async function openCortexCompanionWindow() {
  try {
    if (cortexWindow && !cortexWindow.isDestroyed()) {
      cortexWindow.show();
      cortexWindow.focus();
      return true;
    }

    cortexWindow = new BrowserWindow({
      width: 440,
      height: 760,
      minWidth: 300,
      minHeight: 360,
      backgroundColor: '#07090e',
      title: 'MixCortex AI Co-Pilot — CloudMix Pro',
      alwaysOnTop: true,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
      },
    });

    const distPaths = [
      path.join(__dirname, 'dist', 'index.html'),
      path.join(process.resourcesPath || '', 'app.asar', 'dist', 'index.html'),
      path.join(__dirname, '..', 'dist', 'index.html'),
    ];

    let targetPath = null;
    for (const p of distPaths) {
      if (fs.existsSync(p)) {
        targetPath = p;
        break;
      }
    }

    if (targetPath) {
      cortexWindow.loadFile(targetPath, { hash: 'cortex-companion', query: { view: 'cortex-companion' } });
    } else {
      cortexWindow.loadURL('http://localhost:3000/?view=cortex-companion#cortex-companion');
    }

    cortexWindow.on('closed', () => {
      cortexWindow = null;
    });

    return true;
  } catch (err) {
    log('Failed to open MixCortex companion window: ' + err);
    return false;
  }
}

ipcMain.handle('open-cortex-companion', openCortexCompanionWindow);
ipcMain.handle('open-pulsedj-companion', openCortexCompanionWindow);

ipcMain.handle('read-music-csv', async () => {
  const candidatePaths = [
    path.join(__dirname, 'Music.csv'),
    path.join(__dirname, 'public', 'Music.csv'),
    path.join(__dirname, '..', 'Music.csv'),
    'G:\\My Drive\\Backup\\Antigravity\\djyapro\\Music.csv',
    'C:\\Users\\icell\\AppData\\Local\\cloudmix_build\\Music.csv',
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        log('Reading Music.csv from: ' + p);
        return fs.readFileSync(p, 'utf8');
      } catch (e) {
        log('Error reading ' + p + ': ' + e.message);
      }
    }
  }
  return '';
});

// Algoriddim djay Pro Database & Native Integration
const djayDbPath = 'C:\\Users\\icell\\Music\\djay\\djay Media Library\\MediaLibrary.db';
let djayDbInstance = null;

function getDjayDb() {
  if (!djayDbInstance && fs.existsSync(djayDbPath)) {
    try {
      const { DatabaseSync } = require('node:sqlite');
      djayDbInstance = new DatabaseSync(djayDbPath, { readOnly: true });
    } catch (e) {
      log('[DJAY DB ERROR] ' + e.message);
    }
  }
  return djayDbInstance;
}

const camelotMajor = ['8B', '3B', '10B', '5B', '12B', '7B', '2B', '9B', '4B', '11B', '6B', '1B'];
const camelotMinor = ['5A', '12A', '7A', '2A', '9A', '4A', '11A', '6A', '1A', '8A', '3A', '10A'];

function getCamelotKeyFromIndex(keyIdx) {
  if (keyIdx >= 0 && keyIdx < 12) return camelotMajor[keyIdx];
  if (keyIdx >= 12 && keyIdx < 24) return camelotMinor[keyIdx - 12];
  return '8A';
}

ipcMain.handle('read-djay-nowplaying', async () => {
  // 1. Direct SQLite MediaLibrary.db Query (<2ms)
  try {
    const db = getDjayDb();
    if (db) {
      const row = db.prepare("SELECT rowid, data FROM database2 WHERE collection='historySessionItems' ORDER BY rowid DESC LIMIT 1").get();
      if (row && row.data) {
        const buf = Buffer.from(row.data);
        
        let deck = 1;
        const deckIdx = buf.indexOf(Buffer.from('deckNumber'));
        if (deckIdx >= 9) {
          try { deck = Math.round(buf.readDoubleLE(deckIdx - 9)); } catch {}
        }

        let startTime = 0;
        const stIdx = buf.indexOf(Buffer.from('startTime'));
        if (stIdx >= 9) {
          try {
            const cocoaSecs = buf.readDoubleLE(stIdx - 9);
            startTime = (978307200 + cocoaSecs) * 1000;
          } catch {}
        }

        const str = buf.toString('utf8');
        const matches = [...str.matchAll(/[\u0020-\u007E\u00A0-\u024F]{2,}/gu)].map((m) => m[0].trim());
        let title = 'Unknown';
        let artist = 'djay Pro Artist';
        let titleId = null;

        for (let i = 0; i < matches.length; i++) {
          if (matches[i].toLowerCase() === 'title' && i > 0) title = matches[i - 1];
          if (matches[i].toLowerCase() === 'artist' && i > 0) artist = matches[i - 1];
          if (matches[i].toLowerCase() === 'titleid' && i > 0) titleId = matches[i - 1];
        }

        let bpm = 124.0;
        let keyIdx = 4;
        let duration = 210;

        if (titleId) {
          try {
            const aRow = db.prepare("SELECT data FROM database2 WHERE collection='mediaItemAnalyzedData' AND key = ?").get(titleId);
            if (aRow && aRow.data) {
              const aBuf = Buffer.from(aRow.data);
              const bIdx = aBuf.indexOf(Buffer.from('bpm'));
              if (bIdx >= 9) {
                try { bpm = Math.round(aBuf.readDoubleLE(bIdx - 9) * 10) / 10; } catch {}
              }
              const kIdx = aBuf.indexOf(Buffer.from('keySignatureIndex'));
              if (kIdx >= 9) {
                try { keyIdx = Math.round(aBuf.readDoubleLE(kIdx - 9)); } catch {}
              }
              const dIdx = aBuf.indexOf(Buffer.from('duration'));
              if (dIdx >= 9) {
                try { duration = Math.round(aBuf.readDoubleLE(dIdx - 9)); } catch {}
              }
            }
          } catch {}
        }

        const camelotKey = getCamelotKeyFromIndex(keyIdx);
        const now = Date.now();
        const elapsedSec = startTime > 0 ? Math.max(0, Math.floor((now - startTime) / 1000)) : 0;
        const remainingTime = Math.max(0, duration - elapsedSec);

        if (title && title !== 'Unknown') {
          return {
            title,
            artist,
            deck: String(deck),
            deckId: deck === 1 ? 'A' : 'B',
            bpm: bpm > 20 && bpm < 300 ? bpm : 124.0,
            key: camelotKey,
            camelotKey,
            duration,
            currentTime: elapsedSec,
            remainingTime,
            isPlaying: true,
          };
        }
      }
    }
  } catch (err) {
    log('read-djay-nowplaying sqlite error: ' + err.message);
  }

  // 2. Fast HTTP daemon fallback (port 8765)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 350);
    const res = await fetch('http://127.0.0.1:8765/lyrics?meta=1', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.current_song && data.current_song !== '...') {
        let title = data.current_song;
        let artist = 'djay Pro Artist';
        if (title.includes(' - ')) {
          const parts = title.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        }
        const elapsedSec = Math.floor((data.elapsed_ms || 0) / 1000);
        return {
          title,
          artist,
          deck: '1',
          deckId: 'A',
          bpm: 124.0,
          key: '8A',
          camelotKey: '8A',
          duration: 210,
          currentTime: elapsedSec,
          remainingTime: Math.max(0, 210 - elapsedSec),
          isPlaying: !!data.is_playing,
        };
      }
    }
  } catch {}

  // 3. Watched output text file fallback
  const watchedFiles = [
    'G:\\My Drive\\Backup\\Streamerbot\\Output\\nowplaying.txt',
    'C:\\StreamerBot\\nowplaying.txt',
  ];
  for (const fpath of watchedFiles) {
    if (fs.existsSync(fpath)) {
      try {
        const raw = fs.readFileSync(fpath, 'utf8').trim();
        if (raw) {
          const firstLine = raw.split('\n')[0].trim();
          let title = firstLine;
          let artist = 'djay Pro';
          if (title.includes(' - ')) {
            const parts = title.split(' - ');
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
          }
          return {
            title,
            artist,
            deck: '1',
            deckId: 'A',
            bpm: 124.0,
            key: '8A',
            camelotKey: '8A',
            duration: 180,
            currentTime: 0,
            remainingTime: 180,
            isPlaying: true,
          };
        }
      } catch {}
    }
  }

  return null;
});

// Full djay Pro Library Extraction (Loads 6,000+ tracks directly from MediaLibrary.db)
ipcMain.handle('read-djay-library', async () => {
  try {
    const db = getDjayDb();
    if (!db) return [];

    log('[DJAY LIBRARY] Indexing tracks from djay MediaLibrary.db...');
    const t0 = Date.now();

    // 1. Analyzed data (BPM, Key, Duration)
    const analyzedStmt = db.prepare("SELECT key, data FROM database2 WHERE collection='mediaItemAnalyzedData'");
    const analyzed = new Map();
    for (const r of analyzedStmt.all()) {
      const buf = Buffer.from(r.data);
      let bpm = 0;
      let keyIdx = 4;
      let dur = 180;

      const bpmIdx = buf.indexOf(Buffer.from('bpm'));
      if (bpmIdx >= 9) {
        try { bpm = buf.readDoubleLE(bpmIdx - 9); } catch {}
      }
      const keyIdxPos = buf.indexOf(Buffer.from('keySignatureIndex'));
      if (keyIdxPos >= 9) {
        try { keyIdx = Math.round(buf.readDoubleLE(keyIdxPos - 9)); } catch {}
      }
      const durIdx = buf.indexOf(Buffer.from('duration'));
      if (durIdx >= 9) {
        try { dur = buf.readDoubleLE(durIdx - 9); } catch {}
      }

      analyzed.set(r.key, { bpm, keyIdx, dur });
    }

    // 2. Local locations (Real filesystem paths)
    const locStmt = db.prepare("SELECT key, data FROM database2 WHERE collection='localMediaItemLocations'");
    const locations = new Map();
    for (const r of locStmt.all()) {
      const str = Buffer.from(r.data).toString('utf8');
      const match = str.match(/file:\/\/\/([^\x00-\x1F\x7F]+)/);
      if (match) {
        try {
          const clean = decodeURIComponent(match[1].split('\0')[0]).replace(/\//g, '\\');
          locations.set(r.key, clean);
        } catch {}
      }
    }

    // 3. Media Items
    const itemStmt = db.prepare("SELECT key, data FROM database2 WHERE collection='mediaItems'");
    const tracks = [];

    for (const r of itemStmt.all()) {
      const buf = Buffer.from(r.data);
      const str = buf.toString('utf8');
      const matches = [...str.matchAll(/[\u0020-\u007E\u00A0-\u024F]{2,}/gu)].map((m) => m[0].trim());

      let title = null;
      let artist = null;
      for (let i = 0; i < matches.length; i++) {
        if (matches[i].toLowerCase() === 'title' && i > 0) title = matches[i - 1];
        if (matches[i].toLowerCase() === 'artist' && i > 0) artist = matches[i - 1];
      }

      if (title && title !== 'Unknown') {
        const meta = analyzed.get(r.key) || { bpm: 124, keyIdx: 4, dur: 180 };
        const filePath = locations.get(r.key) || '';
        const camelotKey = getCamelotKeyFromIndex(meta.keyIdx);

        tracks.push({
          id: r.key,
          title,
          artist: artist || 'Unknown Artist',
          bpm: meta.bpm > 20 && meta.bpm < 300 ? Math.round(meta.bpm * 10) / 10 : 124.0,
          key: camelotKey,
          camelotKey,
          duration: meta.dur > 10 ? Math.round(meta.dur) : 180,
          fileUrl: filePath ? `file:///${filePath.replace(/\\/g, '/')}` : '',
          filePath,
          fileSource: 'djay_pro',
        });
      }
    }

    log(`[DJAY LIBRARY] Extracted ${tracks.length} tracks in ${Date.now() - t0}ms`);
    return tracks;
  } catch (err) {
    log('[DJAY LIBRARY ERROR] ' + err.message);
    return [];
  }
});

// Native Windows OS File Drag-and-Drop
ipcMain.on('start-native-drag', (event, payload) => {
  try {
    let filePath = typeof payload === 'string' ? payload : (payload.filePath || payload.fileUrl || '');
    if (filePath && filePath.startsWith('file:///')) {
      filePath = decodeURIComponent(filePath.replace(/^file:\/\/\/?/, '')).replace(/\//g, '\\');
    }

    if (!filePath || !fs.existsSync(filePath)) {
      const musicDir = 'G:\\My Drive\\Music\\djayPro\\music';
      if (payload && payload.title && fs.existsSync(musicDir)) {
        try {
          const files = fs.readdirSync(musicDir);
          const tLower = payload.title.toLowerCase();
          const match = files.find((f) => f.toLowerCase().includes(tLower));
          if (match) {
            filePath = path.join(musicDir, match);
          }
        } catch {}
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      const tempDir = path.join(os.tmpdir(), 'cloudmix_drag');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const safeName = (((payload && payload.artist) || 'DJ') + ' - ' + ((payload && payload.title) || 'Track')).replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
      filePath = path.join(tempDir, `${safeName}.m3u`);
      fs.writeFileSync(filePath, `#EXTM3U\n#EXTINF:180,${(payload && payload.artist) || ''} - ${(payload && payload.title) || ''}\n`, 'utf8');
    }

    log(`[NATIVE DRAG] Starting Windows OS file drag for: ${filePath}`);
    const iconCandidates = [
      path.join(__dirname, 'public', 'cortex-icon.png'),
      path.join(__dirname, 'build', 'cortex-icon.png'),
    ];
    let iconPath = iconCandidates.find((p) => fs.existsSync(p));

    event.sender.startDrag({
      file: filePath,
      icon: iconPath || filePath,
    });
  } catch (err) {
    log('[NATIVE DRAG ERROR] ' + err.message);
  }
});

ipcMain.handle('read-external-nowplaying-file', async (event, filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch (err) {
    log('read-external-nowplaying-file error: ' + err.message);
  }
  return null;
});

// Standalone Window Controls
ipcMain.handle('set-window-opacity', (event, opacity) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && typeof opacity === 'number') {
    const clamped = Math.max(0.1, Math.min(1.0, opacity));
    win.setOpacity(clamped);
    return { success: true, opacity: clamped };
  }
  return { success: false };
});

ipcMain.handle('set-always-on-top', (event, flag) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && typeof flag === 'boolean') {
    win.setAlwaysOnTop(flag, 'screen-saver');
    return { success: true, alwaysOnTop: flag };
  }
  return { success: false };
});

ipcMain.handle('minimize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.minimize();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('maximize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
    return { success: true, isMaximized: win.isMaximized() };
  }
  return { success: false };
});

ipcMain.handle('close-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.close();
    return { success: true };
  }
  return { success: false };
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

