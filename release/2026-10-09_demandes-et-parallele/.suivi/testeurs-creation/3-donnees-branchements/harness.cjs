/* Isolated creation preparation. GUI only after corrected package + two hashes. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const REPO = '/home/blegoff/odoo-tricorder';
const OUTPUT = __dirname;
const MARKER = 'TRICORDER-CREATION3-DONNEES-STUB';
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function prepare() {
  const temporary = fs.mkdtempSync('/tmp/tricorder-creation3-donnees-');
  const dirs = Object.fromEntries(['home','config','cache','data','codex','claude','state','runtime','agents','stubs','project'].map(n => [n,path.join(temporary,n)]));
  for (const d of Object.values(dirs)) fs.mkdirSync(d,{recursive:true});
  fs.mkdirSync(path.join(dirs.state,'workflows'));
  fs.chmodSync(dirs.runtime,0o700);
  for (const provider of ['codex','claude']) {
    const file = path.join(dirs.stubs,provider);
    fs.writeFileSync(file,`#!/usr/bin/python3\nimport sys\nprovider=${JSON.stringify(provider)}\nmarker=${JSON.stringify(MARKER)}\nif '--version' in sys.argv:\n print(provider+' 0.0.0 '+marker)\n sys.exit(0)\nprint(marker+' '+provider+' — stub inerte, aucun modèle lancé', flush=True)\nsys.exit(78)\n`);
    fs.chmodSync(file,0o755);
  }
  const fixedPath = dirs.stubs+':/usr/bin:/bin';
  const shellText = `export PATH='${fixedPath}'\nexport HISTFILE='${dirs.home}/.bash_history'\n`;
  fs.writeFileSync(path.join(dirs.home,'.bashrc'),shellText);
  fs.writeFileSync(path.join(dirs.home,'.bash_profile'),shellText);
  const env = {PATH:fixedPath,HOME:dirs.home,XDG_CONFIG_HOME:dirs.config,XDG_CACHE_HOME:dirs.cache,XDG_DATA_HOME:dirs.data,XDG_RUNTIME_DIR:dirs.runtime,CODEX_HOME:dirs.codex,CLAUDE_CONFIG_DIR:dirs.claude,TRICORDER_HOME:dirs.home,TRICORDER_STATE_DIR:dirs.state,TRICORDER_RUNTIME_DIR:dirs.runtime,STATE_DIR:dirs.state,RUNTIME_DIR:dirs.runtime,TRICORDER_AGENTS_DIR:dirs.agents,TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1',DISPLAY:':183',XAUTHORITY:'/tmp/tricorder-functional-display/auth-183',SHELL:'/bin/bash',LANG:'C.UTF-8',LC_ALL:'C.UTF-8'};
  const preflight = spawnSync('/bin/bash',['--noprofile','--norc','-c','command -v codex; codex --version; command -v claude; claude --version'],{env,encoding:'utf8'});
  if (preflight.status !== 0 || !preflight.stdout.includes(dirs.stubs+'/codex') || !preflight.stdout.includes(dirs.stubs+'/claude') || preflight.stdout.split(MARKER).length !== 3) throw Error('Stub preflight failed');
  const manifest = {preparedAt:new Date().toISOString(),temporary,dirs,env,preflight:preflight.stdout,guiStarted:false,terminalGuiVerified:false,classification:'Préparation du banc — aucun verdict produit'};
  fs.writeFileSync(path.join(OUTPUT,'preparation-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}

async function launch(manifest,executable,expectedExecutableSha,expectedAsarSha) {
  if (!path.isAbsolute(executable) || !/^[a-f0-9]{64}$/.test(expectedExecutableSha||'') || !/^[a-f0-9]{64}$/.test(expectedAsarSha||'')) throw Error('Corrected package executable and executable/ASAR SHA256 required');
  const asar = path.join(path.dirname(executable),'resources','app.asar');
  const actualExecutableSha = sha256(executable), actualAsarSha = sha256(asar);
  if (actualExecutableSha !== expectedExecutableSha || actualAsarSha !== expectedAsarSha) throw Error('Corrected package SHA mismatch');
  const {_electron} = require(path.join(REPO,'node_modules/@playwright/test'));
  const app = await _electron.launch({executablePath:executable,args:['--no-sandbox'],env:manifest.env,timeout:30000});
  const page = await app.firstWindow();
  const errors = []; page.on('pageerror',e => errors.push(e.message));
  await page.setViewportSize({width:1440,height:1000});
  manifest.package = {executable,sha256:actualExecutableSha,asar,asarSha256:actualAsarSha};
  manifest.guiStarted = true;
  fs.writeFileSync(path.join(OUTPUT,'execution-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  let captureCount = fs.existsSync(path.join(OUTPUT,'captures')) ? fs.readdirSync(path.join(OUTPUT,'captures')).filter(n => n.endsWith('.png')).length : 0;
  return {app,page,errors,manifest,
    async capture(name) {if (++captureCount > 12) throw Error('12 useful captures maximum'); if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw Error('Invalid capture name'); fs.mkdirSync(path.join(OUTPUT,'captures'),{recursive:true}); await page.screenshot({path:path.join(OUTPUT,'captures',name+'.png')});},
    async visibleText() {return page.evaluate(() => {function text(n) {let s=n.innerText||(n instanceof ShadowRoot?[...n.children].map(e => e.innerText||'').join('\n'):''); for (const el of n.querySelectorAll('*')) if(el.shadowRoot) s+='\n'+text(el.shadowRoot); return s;} return text(document.body);});},
    async cleanup() {await app.close().catch(() => app.process().kill('SIGKILL')); const {cleanupBroker} = require(path.join(REPO,'tests/terminal-fixture.cjs')); await cleanupBroker(path.join(manifest.dirs.runtime,'pty.sock'));}
  };
}

module.exports = {prepare,launch,MARKER,OUTPUT};
if (require.main === module) {
  if (process.argv[2] !== '--prepare') throw Error('Preparation only: --prepare. GUI requires followup corrected package/SHA.');
  const m = prepare();
  process.stdout.write(m.preflight+'Prepared '+m.temporary+'\nNo GUI started; shared display untouched.\n');
}
