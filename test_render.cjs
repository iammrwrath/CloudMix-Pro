const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('[PAGE CONSOLE]', message);
  });

  win.webContents.on('did-fail-load', (e, code, desc) => {
    console.error('[LOAD FAIL]', code, desc);
  });

  await win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  await new Promise((r) => setTimeout(r, 2500));
  const image = await win.webContents.capturePage();
  fs.writeFileSync('C:/Users/icell/.gemini/antigravity/brain/07f9b3c0-fdd2-47ec-b23f-aaf1b5cc9dc3/captured_render_v4.png', image.toPNG());
  console.log('RENDER_CAPTURED_V4_OK');
  app.quit();
});
