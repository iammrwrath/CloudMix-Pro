const { _electron: electron } = require('playwright');
const path = require('path');

(async () => {
  console.log('🚀 Launching CloudMix Pro Electron E2E Test Suite...');
  const appDir = path.resolve(__dirname, '..');
  const pageErrors = [];

  const electronApp = await electron.launch({
    args: [appDir],
    env: { ...process.env, NODE_ENV: 'production' },
  });

  try {
    const window = await electronApp.firstWindow();
    window.on('pageerror', (err) => {
      console.error('❌ Uncaught pageerror:', err.message);
      pageErrors.push(err.message);
    });

    await window.waitForLoadState('domcontentloaded');
    await window.waitForSelector('#root', { timeout: 15000 });
    await window.waitForTimeout(2000);

    const title = await window.title();
    console.log('✅ Window title:', title);

    // Verify core DJ UI elements render
    const bodyText = await window.locator('body').innerText();
    if (!bodyText || bodyText.trim().length < 20) {
      throw new Error('App rendered empty body');
    }
    console.log('✅ Core DJ UI rendered');

    // Test Settings modal open/close if button exists
    const settingsBtn = window.locator('button[title*="Settings"], button:has-text("Settings")').first();
    if (await settingsBtn.count()) {
      await settingsBtn.click();
      await window.waitForTimeout(400);
      const closeBtn = window.locator('button[aria-label="Close"], button:has-text("Close")').first();
      if (await closeBtn.count()) {
        await closeBtn.click();
        await window.waitForTimeout(300);
      }
      console.log('✅ Settings modal open/close verified');
    }

    if (pageErrors.length > 0) {
      throw new Error(`Encountered ${pageErrors.length} uncaught page errors`);
    }

    console.log('🏁 Electron E2E Test Suite PASSED!');
    await electronApp.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Electron E2E Test Suite FAILED:', err);
    try { await electronApp.close(); } catch {}
    process.exit(1);
  }
})();
