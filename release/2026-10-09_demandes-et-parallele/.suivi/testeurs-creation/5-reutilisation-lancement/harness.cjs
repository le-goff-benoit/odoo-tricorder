/* PMO creation campaign: isolated preparation; GUI needs authorized package hashes. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const REPO = '/home/blegoff/odoo-tricorder';
const OUTPUT = __dirname;
const MARKER = 'TRICORDER-T3-PMO-STUB';

function prepare() {
  const temporary = fs.mkdtempSync('/tmp/tricorder-t3-pmo-');
  const dirs = Object.fromEntries(['home', 'config', 'cache', 'data', 'codex', 'claude', 'state', 'runtime', 'agents', 'stubs', 'projects', 'delivery'].map(n => [n, path.join(temporary, n)]));
  for (const directory of Object.values(dirs)) fs.mkdirSync(directory, {recursive: true});
  fs.chmodSync(dirs.runtime, 0o700);
  for (const provider of ['codex', 'claude']) {
    const file = path.join(dirs.stubs, provider);
    fs.writeFileSync(file, `#!/usr/bin/python3\nimport sys\nprovider=${JSON.stringify(provider)}\nmarker=${JSON.stringify(MARKER)}\nif '--version' in sys.argv:\n print(provider+' 0.0.0 '+marker)\n sys.exit(0)\nprint(marker+' '+provider+' — fournisseur inerte, aucun modèle appelé', flush=True)\nsys.exit(78)\n`);
    fs.chmodSync(file, 0o755);
  }
  const fixedPath = dirs.stubs + ':/usr/bin:/bin';
  const shellText = `export PATH='${fixedPath}'\nexport HISTFILE='${dirs.home}/.bash_history'\n`;
  fs.writeFileSync(path.join(dirs.home, '.bashrc'), shellText);
  fs.writeFileSync(path.join(dirs.home, '.bash_profile'), shellText);
  const projects = {};
  const contexts = {
    Atlas: '# Projet Atlas — contexte synthétique\n\nComité de portefeuille hebdomadaire. Le PMO veut réunir le dossier de comité, recueillir un feu vert humain et conserver le résultat de décision. Responsable fictif : Camille Atlas. Référence : ATLAS-COMITE-001. Aucun accès client ou service externe.\n',
    Boreal: '# Projet Boreal — contexte synthétique\n\nComité de portefeuille mensuel. Le PMO réutilise une routine commune avec sa propre décision et son propre résultat. Responsable fictif : Noa Boreal. Référence : BOREAL-COMITE-002. Aucun accès client ou service externe.\n'
  };
  for (const [name, content] of Object.entries(contexts)) {
    projects[name] = path.join(dirs.projects, name.toLowerCase());
    fs.mkdirSync(projects[name]);
    fs.writeFileSync(path.join(projects[name], 'CONTEXTE.md'), content);
  }
  const env = {
    PATH: fixedPath, HOME: dirs.home, XDG_CONFIG_HOME: dirs.config,
    XDG_CACHE_HOME: dirs.cache, XDG_DATA_HOME: dirs.data, XDG_RUNTIME_DIR: dirs.runtime,
    CODEX_HOME: dirs.codex, CLAUDE_CONFIG_DIR: dirs.claude, TRICORDER_HOME: dirs.home,
    TRICORDER_STATE_DIR: dirs.state, TRICORDER_RUNTIME_DIR: dirs.runtime,
    TRICORDER_AGENTS_DIR: dirs.agents, TRICORDER_TEST_MODE: '1', PYTHONDONTWRITEBYTECODE: '1',
    DISPLAY: ':185', XAUTHORITY: '/tmp/tricorder-functional-display/auth-185',
    SHELL: '/bin/bash', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8'
  };
  const preflight = spawnSync('/bin/bash', ['--noprofile', '--norc', '-c', 'command -v codex; codex --version; command -v claude; claude --version'], {env, encoding: 'utf8'});
  if (preflight.status !== 0 || !preflight.stdout.includes(dirs.stubs + '/codex') || !preflight.stdout.includes(dirs.stubs + '/claude') || preflight.stdout.split(MARKER).length !== 3) throw Error('Stub preflight failed');
  const calls = {};
  for (const provider of ['codex', 'claude']) {
    const inert = spawnSync(provider, ['synthetic-preflight-no-model'], {env, encoding: 'utf8'});
    if (inert.status !== 78 || !inert.stdout.includes(MARKER)) throw Error('Inert provider guard failed: ' + provider);
    calls[provider] = {status: inert.status, output: inert.stdout.trim()};
  }
  const manifest = {preparedAt: new Date().toISOString(), temporary, dirs, projects, env, preflight: preflight.stdout, inertCalls: calls, guiStarted: false, classification: 'Préparation du banc — aucun verdict produit'};
  fs.writeFileSync(path.join(OUTPUT, 'preparation-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(OUTPUT, 'preflight.txt'), preflight.stdout + Object.entries(calls).map(([p, r]) => p + ': exit=' + r.status + ' ' + r.output).join('\n') + '\nNo GUI or broker started.\n');
  return manifest;
}

function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

async function launch(manifest, executable, expectedExecutableSha, expectedAsarSha) {
  if (!path.isAbsolute(executable) || !/^[a-f0-9]{64}$/.test(expectedExecutableSha || '') || !/^[a-f0-9]{64}$/.test(expectedAsarSha || '')) throw Error('Authorized absolute executable and both SHA256 hashes required');
  const asar = path.join(path.dirname(executable), 'resources', 'app.asar');
  const actualExecutableSha = sha256(executable);
  const actualAsarSha = sha256(asar);
  if (actualExecutableSha !== expectedExecutableSha || actualAsarSha !== expectedAsarSha) throw Error('Authorized package hash mismatch');
  const {_electron} = require(path.join(REPO, 'node_modules/@playwright/test'));
  const app = await _electron.launch({executablePath: executable, args: ['--no-sandbox'], env: manifest.env, timeout: 30000});
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({width: 1440, height: 1000});
  manifest.package = {executable, sha256: actualExecutableSha, asar, asarSha256: actualAsarSha};
  manifest.guiStarted = true;
  manifest.launchedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUTPUT, 'execution-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  let captureCount = 0;
  return {app, page, errors, manifest,
    async capture(name) {
      if (!/^[a-z0-9-]+$/.test(name)) throw Error('Capture name must be a simple identifier');
      if (captureCount >= 12) throw Error('12 useful captures maximum');
      fs.mkdirSync(path.join(OUTPUT, 'captures'), {recursive: true});
      await page.screenshot({path: path.join(OUTPUT, 'captures', name + '.png')});
      captureCount++;
    },
    async visibleText() {
      return page.evaluate(() => {
        function text(n) {
          let s = n.innerText || (n instanceof ShadowRoot ? [...n.children].map(e => e.innerText || '').join('\n') : '');
          for (const el of n.querySelectorAll('*')) if (el.shadowRoot) s += '\n' + text(el.shadowRoot);
          return s;
        }
        return text(document.body);
      });
    },
    async cleanup() { await app.close().catch(() => app.process().kill('SIGKILL')); }
  };
}

module.exports = {prepare, launch, MARKER, OUTPUT};
if (require.main === module) {
  if (process.argv[2] !== '--prepare') throw Error('Preparation only: use --prepare. GUI requires authorized package and both SHA256 hashes through launch().');
  const m = prepare();
  process.stdout.write(m.preflight + 'Prepared ' + m.temporary + '\nNo GUI or broker started.\n');
}
