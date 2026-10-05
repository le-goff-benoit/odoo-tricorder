const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { createHash } = require('node:crypto');

async function stopTestBroker(socket) {
  const pid = await new Promise((resolve, reject) => {
    const client = net.createConnection(socket);
    let buffer = '';
    client.setTimeout(5000, () => { client.destroy(); reject(new Error('Test broker did not reply')); });
    client.on('error', reject);
    client.on('connect', () => client.write('{"id":1,"action":"ping"}\n'));
    client.on('data', chunk => {
      buffer += chunk;
      if (!buffer.includes('\n')) return;
      const reply = JSON.parse(buffer.split('\n')[0]);
      client.end(); resolve(reply.result.pid);
    });
  });
  process.kill(pid, 'SIGTERM');
}

test('large release opens with validated memory in read-only mode', async () => {
  test.skip(!process.env.TRICORDER_LARGE_PROJECT, 'Opt-in local sur le projet signalé');
  const project = fs.realpathSync(process.env.TRICORDER_LARGE_PROJECT);
  const release = process.env.TRICORDER_LARGE_RELEASE;
  if (!release || !/^[\w-]+$/.test(release)) throw new Error('Release explicite requise');
  const folder = path.join(project, 'changelog', release);
  const plan = JSON.parse(fs.readFileSync(path.join(folder, 'plan.json')));
  const files = [];
  const collect = directory => {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) collect(file);
      else if (item.isFile()) files.push(file);
    }
  };
  collect(folder);
  const digest = () => files.map(file => createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
  const before = digest();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-large-release-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  const state = path.join(temp, 'state'); fs.mkdirSync(state);
  fs.writeFileSync(path.join(state, 'settings.json'), JSON.stringify({ extras: [project], activeProject: project,
    sourceRoot: path.join(os.homedir(), 'odoo-sources'), contexts: { [project]: { release } } }));
  let app;
  try {
    app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [path.resolve(__dirname, '..')],
      ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
      env: { ...process.env, HOME: home, TRICORDER_HOME: home, TRICORDER_STATE_DIR: state,
        TRICORDER_AGENTS_DIR: path.join(os.homedir(), '.odoo19-agents'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') } });
    const page = await app.firstWindow();
    await expect(page.locator('#release-select')).toHaveValue(release, { timeout: 30000 });
    await page.locator('#tabs [data-view="knowledge"]').click();
    await expect(page.locator('.knowledge-page')).toBeVisible();
    await expect(page.locator('#content')).not.toContainText('Lecture impossible');
    const data = await page.evaluate(async ({ project, release }) => window.tricorder.project(project, release), { project, release });
    expect(data.tasks).toHaveLength(plan.tasks.length);
    expect(data.knowledge.available).toBe(true);
    expect(data.knowledge.contributions.length).toBeGreaterThan(0);
  } finally {
    if (app) {
      const exited = new Promise(resolve => app.process().once('exit', resolve));
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close());
      await Promise.race([exited, new Promise((_, reject) => setTimeout(() => reject(new Error('Test window did not close')), 8000))]);
      await stopTestBroker(path.join(temp, 'run', 'pty.sock'));
    }
    expect(digest()).toEqual(before);
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
