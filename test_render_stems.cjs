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
  await new Promise((r) => setTimeout(r, 2000));

  const result = await win.webContents.executeJavaScript(`
    (() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const textList = allButtons.map(b => b.innerText.trim());

      // Click the first button with EQ
      const eqBtn = allButtons.find(b => b.innerText.trim() === 'EQ');
      if (eqBtn) {
        eqBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }

      // Click the first button with STEMS
      const stemBtn = allButtons.find(b => b.innerText.trim() === 'STEMS');
      if (stemBtn) {
        stemBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }

      // Click YouTube Music
      const ytBtn = allButtons.find(b => b.innerText.includes('YouTube Music'));
      if (ytBtn) {
        ytBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }

      return { foundEQ: !!eqBtn, foundSTEMS: !!stemBtn, foundYT: !!ytBtn, texts: textList.slice(0, 20) };
    })();
  `);

  console.log('DOM CLICK RESULT:', JSON.stringify(result));
  await new Promise((r) => setTimeout(r, 1500));
  const image = await win.webContents.capturePage();
  fs.writeFileSync('C:/Users/icell/.gemini/antigravity/brain/07f9b3c0-fdd2-47ec-b23f-aaf1b5cc9dc3/captured_render_stems.png', image.toPNG());
  console.log('CAPTURED_SUCCESSFULLY');
  app.quit();
});
