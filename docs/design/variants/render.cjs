const { chromium } = require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/home/blegoff/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  for (const name of process.argv.slice(2)) {
    await page.goto('file://' + path.resolve(__dirname, name + '.html'));
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.resolve(__dirname, name + '.png') });
    console.log('rendered', name);
  }
  await browser.close();
})();
