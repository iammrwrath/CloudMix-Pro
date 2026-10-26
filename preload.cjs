const { contextBridge, ipcRenderer, webFrame } = require('electron');

// Suppress benign third-party iframe errors and origin mismatch warnings in main world before any scripts load
try {
  webFrame.executeJavaScript(`
    (function() {
      // 1. Intercept Window.prototype.postMessage to prevent origin mismatch DOMExceptions
      try {
        const origPostMessage = Window.prototype.postMessage;
        Window.prototype.postMessage = function(...args) {
          try {
            return Reflect.apply(origPostMessage, this, args);
          } catch (err) {
            const msg = err && err.message ? err.message : String(err || '');
            if (
              msg.includes("Failed to execute 'postMessage' on 'DOMWindow'") ||
              msg.includes("The target origin provided")
            ) {
              return;
            }
            throw err;
          }
        };
      } catch {}

      // 2. Intercept console.error and console.warn for known benign third-party iframe noise
      const origError = console.error;
      console.error = function(...args) {
        const first = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].message ? args[0].message : '');
        if (
          first.includes("Failed to execute 'postMessage' on 'DOMWindow'") ||
          first.includes("The target origin provided") ||
          first.includes("Unrecognized feature: 'web-share'")
        ) {
          return;
        }
        origError.apply(console, args);
      };

      const origWarn = console.warn;
      console.warn = function(...args) {
        const first = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].message ? args[0].message : '');
        if (
          first.includes("Unrecognized feature: 'web-share'") ||
          first.includes("powerPreference option is currently ignored")
        ) {
          return;
        }
        origWarn.apply(console, args);
      };
    })();
  `);
} catch {}

contextBridge.exposeInMainWorld('electron', {
  fetchTrackAudio: (data) => ipcRenderer.invoke('fetch-track-audio', data),
  separateStemsOnnx: (data) => ipcRenderer.invoke('separate-stems-onnx', data),
  readAudioFile: (filePath) => ipcRenderer.invoke('read-local-audio', filePath),
});

contextBridge.exposeInMainWorld('desktopAPI', {
  // Native Stream Extraction & ONNX Stems
  fetchTrackAudio: (data) => ipcRenderer.invoke('fetch-track-audio', data),
  separateStemsOnnx: (data) => ipcRenderer.invoke('separate-stems-onnx', data),
  readAudioFile: (filePath) => ipcRenderer.invoke('read-local-audio', filePath),

  // Local File Access & Native Persistent Storage
  getSystemPaths: () => ipcRenderer.invoke('get-system-paths'),
  readLocalAudio: (filePath) => ipcRenderer.invoke('read-local-audio', filePath),
  getTrackStreamUrl: (videoId) => ipcRenderer.invoke('get-track-stream-url', videoId),
  separateStems: (params) => ipcRenderer.invoke('separate-stems', params),
  scanDirectory: (dirPath) => ipcRenderer.invoke('scan-directory', dirPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  saveUserSetting: (key, value) => ipcRenderer.invoke('save-user-setting', key, value),
  getUserSetting: (key, defaultValue) => ipcRenderer.invoke('get-user-setting', key, defaultValue),

  // YouTube Music OAuth — opens a modal BrowserWindow, intercepts redirect, returns token
  youtubeSessionStatus: () => ipcRenderer.invoke('youtube-session-status'),
  youtubeSessionSignIn: () => ipcRenderer.invoke('youtube-session-sign-in'),
  youtubeSessionSignOut: () => ipcRenderer.invoke('youtube-session-sign-out'),
  openOAuthWindow: (authUrl) => ipcRenderer.invoke('open-oauth-window', authUrl),
  fetchGeniusLyrics: (params) => ipcRenderer.invoke('fetch-genius-lyrics', params),

  // Universal DJ Bridge & NowPlaying Integration
  writeNowPlayingBroadcast: (payload) => ipcRenderer.invoke('write-now-playing-broadcast', payload),
  readDjayNowPlaying: () => ipcRenderer.invoke('read-djay-nowplaying'),
  readDjayLibrary: (customDbPath) => ipcRenderer.invoke('read-djay-library', customDbPath),
  readDjayPlaylists: (customDbPath) => ipcRenderer.invoke('read-djay-playlists', customDbPath),
  readExternalNowPlayingFile: (filePath) => ipcRenderer.invoke('read-external-nowplaying-file', filePath),
  startNativeDrag: (payload) => ipcRenderer.send('start-native-drag', payload),

  // Standalone Window Controls
  setWindowOpacity: (opacity) => ipcRenderer.invoke('set-window-opacity', opacity),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('set-always-on-top', flag),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  toggleFullScreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  isFullScreen: () => ipcRenderer.invoke('is-fullscreen'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  setZoomFactor: (factor) => ipcRenderer.invoke('set-zoom-factor', factor),

  // In-App Auto-Updater & GitHub Patching Engine
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  checkGitHubReleases: () => ipcRenderer.invoke('check-github-releases'),
  startUpdateDownload: () => ipcRenderer.invoke('start-update-download'),
  restartAndInstallPatch: () => ipcRenderer.invoke('restart-and-install-patch'),
  // Live Streaming (OBS, Streamer.bot, Stream Deck) Hub
  updateStreamingBroadcast: (payload) => ipcRenderer.invoke('update-streaming-broadcast', payload),
  getStreamingBroadcastState: () => ipcRenderer.invoke('get-streaming-broadcast-state'),
  onStreamerbotRequest: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('streamerbot-request', subscription);
    return () => ipcRenderer.removeListener('streamerbot-request', subscription);
  },
  onTriggerSamplerPad: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('trigger-sampler-pad', subscription);
    return () => ipcRenderer.removeListener('trigger-sampler-pad', subscription);
  },
  onStreamdeckAction: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('streamdeck-action', subscription);
    return () => ipcRenderer.removeListener('streamdeck-action', subscription);
  },
  onUpdaterStatus: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('updater-status', subscription);
    return () => ipcRenderer.removeListener('updater-status', subscription);
  },
  onDisplayMetricsChanged: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('display-metrics-changed', subscription);
    return () => ipcRenderer.removeListener('display-metrics-changed', subscription);
  },
  submitAutoIssueReport: (report) => ipcRenderer.invoke('submit-auto-issue-report', report),
  reportUITelemetry: (telemetry) => ipcRenderer.invoke('report-ui-telemetry', telemetry),
  captureWindowSnapshot: () => ipcRenderer.invoke('capture-window-snapshot'),
});
