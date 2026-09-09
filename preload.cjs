const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktopApp: true,
  readLocalAudioFile: (filePath) => ipcRenderer.invoke('read-local-audio', filePath),
  scanDirectory: (dirPath) => ipcRenderer.invoke('scan-directory', dirPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  writeNowPlayingBroadcast: (info) => ipcRenderer.invoke('write-now-playing-broadcast', info),

  // In-App Auto-Updater & GitHub Patching Engine
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  startUpdateDownload: () => ipcRenderer.invoke('start-update-download'),
  restartAndInstallPatch: () => ipcRenderer.invoke('restart-and-install-patch'),
  checkGitHubReleases: () => ipcRenderer.invoke('check-github-releases'),
  onUpdaterStatus: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('updater-status', subscription);
    return () => ipcRenderer.removeListener('updater-status', subscription);
  },
});
