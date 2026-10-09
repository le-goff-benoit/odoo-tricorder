'use strict';
// Banc indépendant. Aucun moteur, broker ou GUI ne démarre pendant prepare().
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const OUTPUT = __dirname;
const REPO = '/home/blegoff/odoo-tricorder';
const MARKER = 'TRICORDER-CREATION-1-INERT';
const SCENARIOS = ['01-commande-simple', '02-consignes-resultats', '03-validation-humaine', '04-premier-essai-reprise'];
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function prepare(id) {
  if (!SCENARIOS.includes(id)) throw Error('Unknown independent scenario');
  const temporary = fs.mkdtempSync('/tmp/tricorder-creation1-' + id + '-');
  const dirs = Object.fromEntries(['home','config','cache','data','codex','claude','state','runtime','agents','stubs','project'].map(n => [n, path.join(temporary,n)]));
  for (const d of Object.values(dirs)) fs.mkdirSync(d, {recursive:true});
  fs.mkdirSync(path.join(dirs.state,'workflows'));
  fs.chmodSync(dirs.runtime, 0o700);
  for (const provider of ['codex','claude']) {
    const file = path.join(dirs.stubs, provider);
    fs.writeFileSync(file, `#!/usr/bin/python3
import sys
provider = ${JSON.stringify(provider)}
marker = ${JSON.stringify(MARKER)}
if '--version' in sys.argv:
    print(provider + ' 0.0.0 ' + marker)
    sys.exit(0)
print(marker + ' ' + provider + ' — fournisseur inerte, aucune exécution modèle', flush=True)
sys.exit(78)
`);
    fs.chmodSync(file, 0o755);
  }
  const fixedPath = dirs.stubs + ':/usr/bin:/bin';
  const shell = `export PATH='${fixedPath}'
export HISTFILE='${dirs.home}/.bash_history'
`;
  fs.writeFileSync(path.join(dirs.home,'.bashrc'), shell);
  fs.writeFileSync(path.join(dirs.home,'.bash_profile'), shell);
  const env = {PATH:fixedPath, HOME:dirs.home, XDG_CONFIG_HOME:dirs.config,
    XDG_CACHE_HOME:dirs.cache, XDG_DATA_HOME:dirs.data, XDG_RUNTIME_DIR:dirs.runtime,
    CODEX_HOME:dirs.codex, CLAUDE_CONFIG_DIR:dirs.claude, TRICORDER_HOME:dirs.home,
    TRICORDER_STATE_DIR:dirs.state, TRICORDER_RUNTIME_DIR:dirs.runtime,
    TRICORDER_AGENTS_DIR:dirs.agents, TRICORDER_TEST_MODE:'1', PYTHONDONTWRITEBYTECODE:'1',
    DISPLAY:':181', XAUTHORITY:'/tmp/tricorder-functional-display/auth-181',
    SHELL:'/bin/bash', LANG:'C.UTF-8', LC_ALL:'C.UTF-8'};
  const preflight = spawnSync('/bin/bash', ['--noprofile','--norc','-c',
    'command -v codex; codex --version; command -v claude; claude --version'], {env,encoding:'utf8'});
  if (preflight.status !== 0 || !preflight.stdout.includes(dirs.stubs+'/codex') ||
      !preflight.stdout.includes(dirs.stubs+'/claude') || preflight.stdout.split(MARKER).length !== 3)
    throw Error('Stub preflight failed');
  const manifest = {id,preparedAt:new Date().toISOString(),temporary,dirs,env,
    preflight:preflight.stdout,guiStarted:false,brokerStarted:false,
    externalFixtures:'Aucune : répertoire projet vide, aucun workflow précréé.',
    classification:'Préparation uniquement — aucun verdict produit'};
  fs.writeFileSync(path.join(OUTPUT,id+'-preparation.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}

async function launch(manifest, candidate) {
  // Appel réservé au followup autorisant le paquet corrigé et libérant DISPLAY :181.
  if (!candidate || candidate.displayReleased !== true) throw Error('Display :181 must be explicitly released');
  const {executable,executableSha256,asar,asarSha256} = candidate;
  for (const [file,expected] of [[executable,executableSha256],[asar,asarSha256]]) {
    if (!path.isAbsolute(file || '') || !/^[a-f0-9]{64}$/.test(expected || ''))
      throw Error('Absolute executable/ASAR paths and exact SHA256 hashes required');
    if (sha256(file) !== expected) throw Error('Candidate SHA256 mismatch: '+file);
  }
  if (manifest.guiStarted) throw Error('Scenario already started: prepare a fresh bench');
  const {_electron} = require(path.join(REPO,'node_modules/@playwright/test'));
  const app = await _electron.launch({executablePath:executable,args:['--no-sandbox'],
    env:manifest.env,timeout:30000});
  const page = await app.firstWindow();
  await page.setViewportSize({width:1440,height:1000});
  manifest.guiStarted = true;
  manifest.candidate = {executable,executableSha256,asar,asarSha256};
  fs.writeFileSync(path.join(OUTPUT,manifest.id+'-execution.json'),JSON.stringify(manifest,null,2)+'\n');
  const errors = [];
  page.on('pageerror',e => errors.push(e.message));
  return {app,page,errors,manifest,
    async capture(name) {
      const captureDir = path.join(OUTPUT,'captures');
      fs.mkdirSync(captureDir,{recursive:true});
      if (fs.readdirSync(captureDir).filter(n=>n.endsWith('.png')).length >= 12)
        throw Error('12 useful captures maximum for the whole campaign');
      await page.screenshot({path:path.join(captureDir,manifest.id+'-'+name+'.png')});
    },
    async visibleText() {
      return page.evaluate(() => {
        const collect = node => {
          let text = node.innerText || (node instanceof ShadowRoot ? [...node.children].map(e=>e.innerText||'').join('\n') : '');
          for (const el of node.querySelectorAll('*')) if (el.shadowRoot) text += '\n'+collect(el.shadowRoot);
          return text;
        };
        return collect(document.body);
      });
    },
    async cleanup() {
      await app.close().catch(()=>app.process().kill('SIGKILL'));
      const {cleanupBroker} = require(path.join(REPO,'tests/terminal-fixture.cjs'));
      await cleanupBroker(path.join(manifest.dirs.runtime,'pty.sock'));
    }
  };
}

module.exports = {prepare,launch,MARKER,SCENARIOS,OUTPUT};
if (require.main === module) {
  if (process.argv[2] !== '--prepare') throw Error('Preparation only: --prepare');
  for (const id of SCENARIOS) {
    const m = prepare(id);
    process.stdout.write(id+'\n'+m.preflight+'Prepared '+m.temporary+'\n');
  }
  process.stdout.write('No GUI, broker or workflow engine started.\n');
}
