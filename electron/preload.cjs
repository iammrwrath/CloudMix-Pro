const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktopApp: true,
  readLocalAudioFile: (filePath) => ipcRenderer.invoke('read-local-audio', filePath),
  scanDirectory: (dirPath) => ipcRenderer.invoke('scan-directory', dirPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  writeNowPlayingBroadcast: (info) => ipcRenderer.invoke('write-now-playing-broadcast', info),
});
