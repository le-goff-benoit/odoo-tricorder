const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { _electron } = require('/home/blegoff/odoo-tricorder/node_modules/playwright');
const { cleanupBroker } = require('/home/blegoff/odoo-tricorder/tests/terminal-fixture.cjs');
const output = __dirname;
function prepare(name = 'preparation') {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-portefeuille-' + name + '-'));
  const dirs = {};
  for (const name of ['home', 'config', 'cache', 'data', 'runtime', 'codex-home', 'claude-config', 'tricorder-home', 'state', 'pty', 'tmp', 'control', 'bin']) {
    dirs[name] = path.join(scratch, name); fs.mkdirSync(dirs[name], { recursive: true, mode: 0o700 });
  }
  for (const provider of ['codex', 'claude']) {
    const target = path.join(dirs.bin, provider);
    fs.copyFileSync(path.join(output, 'provider-stub.py'), target); fs.chmodSync(target, 0o755);
  }
  const env = {
    PATH: dirs.bin + ':/usr/bin:/bin', HOME: dirs.home, SHELL: '/bin/bash',
    XDG_CONFIG_HOME: dirs.config, XDG_CACHE_HOME: dirs.cache, XDG_DATA_HOME: dirs.data, XDG_RUNTIME_DIR: dirs.runtime,
    CODEX_HOME: dirs['codex-home'], CLAUDE_CONFIG_DIR: dirs['claude-config'],
    TRICORDER_HOME: dirs['tricorder-home'], TRICORDER_STATE_DIR: dirs.state, TRICORDER_RUNTIME_DIR: dirs.pty,
    TRICORDER_AGENTS_DIR: path.join(scratch, 'absent-pack'), TRICORDER_TEST_MODE: '1', PYTHONDONTWRITEBYTECODE: '1',
    TRICORDER_FIXTURE_CONTROL: dirs.control, TMPDIR: dirs.tmp, TEMP: dirs.tmp, TMP: dirs.tmp,
    DISPLAY: ':185', XAUTHORITY: '/tmp/tricorder-functional-display/auth-185', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', TERM: 'xterm-256color'
  };
  const preflight = execFileSync('/bin/bash', ['--noprofile', '--norc', '-c', 'command -v codex\ncommand -v claude\ncodex --version\nclaude --version'], { env, encoding: 'utf8', timeout: 3000 });
  const descriptor = { scratch, dirs, env, engineState: path.join(dirs.state, 'workflows'), preflight, prepared: new Date().toISOString() };
  fs.writeFileSync(path.join(output, 'banc-' + name + '.json'), JSON.stringify(descriptor, null, 2));
  fs.writeFileSync(path.join(output, 'preflight-' + name + '.txt'), preflight);
  return descriptor;
}
function seed(banc, executable, mode = 'volume') {
  const backend = path.join(path.dirname(executable), 'resources/backend');
  const result = execFileSync('/usr/bin/python3', [path.join(output, 'fixtures.py'), backend, banc.engineState, mode], { env: banc.env, encoding: 'utf8', timeout: 20000 });
  fs.writeFileSync(path.join(output, 'fixture-' + mode + '.json'), result);
  return JSON.parse(result);
}
async function launch(banc, executable, expectedSha) {
  if (!executable || !expectedSha) throw Error('Chemin et SHA du candidat validé obligatoires ; ancien paquet interdit.');
  const actual = crypto.createHash('sha256').update(fs.readFileSync(executable)).digest('hex');
  if (actual !== expectedSha) throw Error('SHA différent du candidat validé.');
  fs.writeFileSync(path.join(output, 'candidat.json'), JSON.stringify({ executable, sha256: actual, at: new Date().toISOString() }, null, 2));
  const app = await _electron.launch({ executablePath: executable, args: [], env: banc.env, timeout: 30000 });
  const page = await app.firstWindow();
  await page.setViewportSize({ width: 1440, height: 960 });
  return { app, page };
}
async function capture(page, name) {
  const existing = fs.readdirSync(output).filter(n => n.endsWith('.png'));
  if (existing.length >= 18) throw Error('Budget de 18 captures atteint.');
  await page.screenshot({ path: path.join(output, name + '.png') });
}
async function cleanup(app, banc) {
  if (app) await app.close();
  for (const socket of [path.join(banc.dirs.pty, 'pty.sock'), path.join(banc.engineState, 'studio-pty.sock')]) {
    if (fs.existsSync(socket)) await cleanupBroker(socket);
  }
  for (const name of fs.readdirSync(banc.dirs.control).filter(n => n.startsWith('pid-'))) {
    const pid = Number(name.slice(4));
    try {
      const command = fs.readFileSync('/proc/' + pid + '/cmdline', 'utf8');
      if (command.includes(banc.dirs.bin + '/')) process.kill(pid, 'SIGTERM');
    } catch {}
  }
}
module.exports = { prepare, seed, launch, capture, cleanup };
if (require.main === module) {
  if (process.argv[2] !== 'prepare') throw Error('Mode préparation uniquement ; lancement via followup validé.');
  const banc = prepare(); console.log(JSON.stringify({ scratch: banc.scratch, engineState: banc.engineState, preflight: banc.preflight }));
}
