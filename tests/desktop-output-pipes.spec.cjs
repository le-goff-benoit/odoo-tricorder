const {test, expect, _electron: electron} = require('@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {cleanupBroker} = require('./terminal-fixture.cjs');
const root = path.resolve(__dirname, '..');

test('a recoverable backend rejection stays in the app after its launcher closes log pipes', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-closed-output-'));
  const bin = path.join(directory, 'bin'); fs.mkdirSync(bin);
  for (const provider of ['codex', 'claude']) fs.writeFileSync(path.join(bin, provider), '#!/bin/sh\nprintf "OUTPUT_PIPE_INERT_ONLY\\n"\nexit 78\n', {mode: 0o755});
  const env = {PATH: bin + ':/usr/bin:/bin', HOME: directory, DISPLAY: process.env.DISPLAY, XAUTHORITY: process.env.XAUTHORITY, LANG: 'C.UTF-8',
    XDG_CONFIG_HOME: path.join(directory, 'config'), XDG_CACHE_HOME: path.join(directory, 'cache'), XDG_DATA_HOME: path.join(directory, 'data'),
    CODEX_HOME: path.join(directory, 'codex'), CLAUDE_CONFIG_DIR: path.join(directory, 'claude'), TRICORDER_HOME: directory,
    TRICORDER_STATE_DIR: directory, TRICORDER_RUNTIME_DIR: path.join(directory, 'runtime'), TRICORDER_AGENTS_DIR: path.join(directory, 'no-pack'), TRICORDER_TEST_MODE: '1', PYTHONDONTWRITEBYTECODE: '1'};
  let app;
  try {
    app = await electron.launch({executablePath: process.env.TRICORDER_EXECUTABLE, args: process.env.TRICORDER_EXECUTABLE ? [] : [root], env});
    const page = await app.firstWindow();
    await page.locator('[data-workflow-route=global]').click();
    await app.evaluate(({dialog}) => {
      globalThis.__outputFailures = [];
      process.on('uncaughtExceptionMonitor', error => globalThis.__outputFailures.push(error.code || error.message));
      // A native error dialog would block automation. Record it rather than
      // accepting it, so the test still fails on every uncaught main error.
      dialog.showErrorBox = (title, content) => globalThis.__outputFailures.push({title, content});
    });
    await Promise.all([app.process().stdout, app.process().stderr].map(stream => new Promise(resolve => {
      stream.once('close', resolve); stream.destroy();
    })));
    await app.evaluate(async () => {
      console.error('Recoverable desktop diagnostic after launcher closed');
      process.stderr.write('Direct desktop diagnostic after launcher closed\n');
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    const rejected = await page.evaluate(async () => {
      try { await window.studio.request({action: 'run.get', run: 'nonexistent-synthetic-run'}); return ''; }
      catch (error) { return error.message; }
    });
    expect(rejected).toMatch(/introuvable|not found|inconnu/i);
    // An actual second engine request and navigation prove continued work.
    const project = await page.evaluate(() => window.studio.request({action: 'project.create', title: 'Projet après erreur récupérable'}));
    expect(project.title).toBe('Projet après erreur récupérable');
    await page.locator('[data-workflow-route=projects]').click();
    await expect(page.locator('.project-card').filter({hasText: project.title})).toBeVisible();
    expect(await app.evaluate(() => globalThis.__outputFailures)).toEqual([]);
    await page.screenshot({path: test.info().outputPath('desktop-after-closed-log-pipes.png')});
  } finally {
    if (app) await app.close();
    for (const socket of ['cockpit/odoo-tricorder/pty.sock', 'studio-pty.sock', 'runtime/pty.sock']) await cleanupBroker(path.join(directory, socket));
    fs.rmSync(directory, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
  }
});
