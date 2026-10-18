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

contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktopApp: true,
  readLocalAudioFile: (filePath) => ipcRenderer.invoke('read-local-audio', filePath),
  scanDirectory: (dirPath) => ipcRenderer.invoke('scan-directory', dirPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  writeNowPlayingBroadcast: (info) => ipcRenderer.invoke('write-now-playing-broadcast', info),
  setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
  getZoomFactor: () => webFrame.getZoomFactor(),
});

