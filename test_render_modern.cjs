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

  await win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  await new Promise((r) => setTimeout(r, 1500));

  // Switch CH 1 to STEMS mode
  await win.webContents.executeJavaScript(
    const eqButtons = Array.from(document.querySelectorAll('button')).filter(b => b.innerText === 'EQ');
    if (eqButtons[0]) eqButtons[0].click();
    
    // Switch Deck A pads to STEMS mode
    const stemTabButtons = Array.from(document.querySelectorAll('button')).filter(b => b.innerText === 'STEMS');
    if (stemTabButtons[0]) stemTabButtons[0].click();
  );

  await new Promise((r) => setTimeout(r, 1000));
  const image = await win.webContents.capturePage();
  fs.writeFileSync('C:/Users/icell/.gemini/antigravity/brain/07f9b3c0-fdd2-47ec-b23f-aaf1b5cc9dc3/captured_render_modern.png', image.toPNG());
  console.log('RENDER_CAPTURED_MODERN_OK');
  app.quit();
});
