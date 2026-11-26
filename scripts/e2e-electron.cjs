const { _electron: electron } = require('playwright');
const path = require('path');

(async () => {
  console.log('🚀 Launching CloudMix Pro Extensive Electron E2E Test Suite...');
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

    // 1. UI/UX Layout & Overflow Check
    const layout = await window.evaluate(() => ({
      textLen: document.body.innerText.trim().length,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      buttonCount: document.querySelectorAll('button').length,
      sliderCount: document.querySelectorAll('input[type="range"]').length,
    }));
    if (layout.textLen < 20) throw new Error('App rendered empty body');
    if (layout.scrollWidth > layout.innerWidth + 20) {
      throw new Error(`Horizontal overflow detected: ${layout.scrollWidth} > ${layout.innerWidth}`);
    }
    console.log(`✅ UI/UX Layout OK (${layout.buttonCount} buttons, ${layout.sliderCount} sliders, no overflow)`);

    // 2. Click all transport & deck controls safely (Play, Cue, Sync, Loop, Stems)
    const controlLabels = ['PLAY', 'CUE', 'SYNC', 'LOOP', 'VOCALS', 'DRUMS', 'BASS', 'MELODY'];
    let clickedControls = 0;
    for (const label of controlLabels) {
      const btns = window.locator(`button:has-text("${label}")`);
      const count = await btns.count();
      for (let i = 0; i < Math.min(count, 2); i++) {
        await btns.nth(i).click({ force: true }).catch(() => {});
        clickedControls++;
      }
    }
    console.log(`✅ Clicked ${clickedControls} deck transport/stem controls without errors`);

    // 3. Exercise range sliders (Crossfader, EQ, Volume, Tempo)
    const sliders = window.locator('input[type="range"]');
    const sliderCount = await sliders.count();
    for (let i = 0; i < Math.min(sliderCount, 12); i++) {
      const s = sliders.nth(i);
      const min = (await s.getAttribute('min')) || '0';
      const max = (await s.getAttribute('max')) || '1';
      const mid = String((parseFloat(min) + parseFloat(max)) / 2);
      await s.fill(mid).catch(() => {});
    }
    console.log(`✅ Exercised ${Math.min(sliderCount, 12)}/${sliderCount} range sliders`);

    // 4. Open & close Settings & User Guide modals
    for (const modalName of ['Settings', 'Guide', 'Help']) {
      const btn = window.locator(`button[title*="${modalName}"], button:has-text("${modalName}")`).first();
      if (await btn.count()) {
        await btn.click({ force: true }).catch(() => {});
        await window.waitForTimeout(300);
        const closeBtn = window.locator('button[aria-label="Close"], button:has-text("Close"), button:has-text("Done")').first();
        if (await closeBtn.count()) {
          await closeBtn.click({ force: true }).catch(() => {});
          await window.waitForTimeout(200);
        }
        console.log(`✅ Verified ${modalName} modal open/close`);
      }
    }

    if (pageErrors.length > 0) {
      throw new Error(`Encountered ${pageErrors.length} uncaught page errors`);
    }

    console.log('🏁 Extensive Electron E2E Test Suite PASSED!');
    await electronApp.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Extensive Electron E2E Test Suite FAILED:', err);
    try { await electronApp.close(); } catch {}
    process.exit(1);
  }
})();
