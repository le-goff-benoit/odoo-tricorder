/* Third campaign: independent preparation. UI requires followup + both hashes. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const REPO = '/home/blegoff/odoo-tricorder';
const OUTPUT = __dirname;
const MARKER = 'TRICORDER-T3-AGENTS-CONNEXIONS-STUB';
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function prepare() {
  const temporary = fs.mkdtempSync('/tmp/tricorder-t3-agents-connexions-');
  const dirs = Object.fromEntries(['home','config','cache','data','codex','claude','tricorder','state','runtime','agents','stubs','project'].map(n => [n,path.join(temporary,n)]));
  for (const d of Object.values(dirs)) fs.mkdirSync(d,{recursive:true});
  fs.mkdirSync(path.join(dirs.state,'workflows'),{recursive:true});
  fs.chmodSync(dirs.runtime,0o700);
  for (const provider of ['codex','claude']) {
    const file = path.join(dirs.stubs,provider);
    fs.writeFileSync(file,`#!/usr/bin/python3\nimport sys\nprovider=${JSON.stringify(provider)}\nmarker=${JSON.stringify(MARKER)}\nif '--version' in sys.argv:\n print(provider+' 0.0.0 '+marker)\n sys.exit(0)\nprint(marker+' '+provider+' : fournisseur inerte, aucun modèle appelé', flush=True)\nsys.exit(78)\n`);
    fs.chmodSync(file,0o755);
  }
  const tool = path.join(dirs.stubs,'brouillon-atelier');
  fs.writeFileSync(tool,`#!/usr/bin/python3\nimport sys\nif '--version' in sys.argv:\n print('brouillon-atelier 0.0.0 ${MARKER}')\nelse:\n print('${MARKER} OUTIL-LOCAL : Brouillon fictif prêt pour relecture. Aucune notification envoyée.')\n`);
  fs.chmodSync(tool,0o755);
  const fixedPath = dirs.stubs+':/usr/bin:/bin';
  const shellText = `export PATH='${fixedPath}'\nexport HISTFILE='${dirs.home}/.bash_history'\n`;
  fs.writeFileSync(path.join(dirs.home,'.bashrc'),shellText);
  fs.writeFileSync(path.join(dirs.home,'.bash_profile'),shellText);
  const env = {PATH:fixedPath,HOME:dirs.home,XDG_CONFIG_HOME:dirs.config,XDG_CACHE_HOME:dirs.cache,XDG_DATA_HOME:dirs.data,XDG_RUNTIME_DIR:dirs.runtime,CODEX_HOME:dirs.codex,CLAUDE_CONFIG_DIR:dirs.claude,TRICORDER_HOME:dirs.tricorder,STATE_DIR:dirs.state,RUNTIME_DIR:dirs.runtime,TRICORDER_STATE_DIR:dirs.state,TRICORDER_RUNTIME_DIR:dirs.runtime,TRICORDER_AGENTS_DIR:dirs.agents,TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1',DISPLAY:':184',XAUTHORITY:'/tmp/tricorder-functional-display/auth-184',SHELL:'/bin/bash',LANG:'C.UTF-8',LC_ALL:'C.UTF-8'};
  const terminalPreflight = 'command -v codex; codex --version; command -v claude; claude --version';
  const preflight = spawnSync('/bin/bash',['--noprofile','--norc','-c',terminalPreflight],{env,encoding:'utf8',timeout:3000});
  if (preflight.status!==0 || !preflight.stdout.includes(dirs.stubs+'/codex') || !preflight.stdout.includes(dirs.stubs+'/claude') || preflight.stdout.split(MARKER).length!==3) throw Error('Stub preflight failed');
  const inert = spawnSync(tool,[],{env,encoding:'utf8',timeout:3000});
  if (inert.status!==0 || !inert.stdout.includes(MARKER)) throw Error('Inert tool preflight failed');
  fs.cpSync(path.join(OUTPUT,'sources'),path.join(dirs.project,'sources'),{recursive:true});
  const manifest = {preparedAt:new Date().toISOString(),temporary,dirs,env,terminalPreflight,preflight:preflight.stdout,inertTool:tool,inertToolOutput:inert.stdout,engineRoot:path.join(dirs.state,'workflows'),guiStarted:false,classification:'Préparation seulement — aucun verdict produit'};
  fs.writeFileSync(path.join(OUTPUT,'preparation-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}

async function launch(manifest, candidate) {
  if (candidate.authorization!=='FOLLOWUP_RECEIVED') throw Error('Parent followup required before GUI');
  const {executable,executableSha,asar,asarSha} = candidate;
  for (const [file,expected] of [[executable,executableSha],[asar,asarSha]]) {
    if (!path.isAbsolute(file||'') || !/^[a-f0-9]{64}$/.test(expected||'')) throw Error('Absolute paths and both expected SHA256 required');
    if (sha256(file)!==expected) throw Error('Package fingerprint mismatch: '+file);
  }
  if (manifest.guiStarted) throw Error('Use a fresh preparation for a new GUI session');
  const check = spawnSync('/bin/bash',['--noprofile','--norc','-c',manifest.terminalPreflight],{env:manifest.env,encoding:'utf8',timeout:3000});
  if (check.status!==0 || check.stdout!==manifest.preflight) throw Error('Pre-GUI stub paths or markers changed');
  const {_electron} = require(path.join(REPO,'node_modules/@playwright/test'));
  const app = await _electron.launch({executablePath:executable,args:['--no-sandbox'],env:manifest.env,timeout:30000});
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1000});
  manifest.package = {executable,executableSha,asar,asarSha};
  manifest.guiStarted = true;
  fs.writeFileSync(path.join(OUTPUT,'execution-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  let captureCount = 0;
  return {app,page,errors,manifest,
    async capture(name) {
      if (++captureCount>12) throw Error('12 useful captures maximum');
      if (!/^[a-z0-9-]+$/.test(name)) throw Error('Safe capture name required');
      fs.mkdirSync(path.join(OUTPUT,'captures'),{recursive:true});
      await page.screenshot({path:path.join(OUTPUT,'captures',name+'.png')});
    },
    async visibleText() {
      return page.evaluate(()=>{
        function text(n) {
          let s=n.innerText||(n instanceof ShadowRoot?[...n.children].map(e=>e.innerText||'').join('\n'):'');
          for(const el of n.querySelectorAll('*')) if(el.shadowRoot) s+='\n'+text(el.shadowRoot);
          return s;
        }
        return text(document.body);
      });
    },
    async cleanup() { await app.close().catch(()=>app.process().kill('SIGKILL')); }
  };
}

module.exports = {prepare,launch,MARKER,OUTPUT};
if (require.main===module) {
  if (process.argv[2]!=='--prepare') throw Error('Preparation only. GUI requires parent followup and executable + ASAR fingerprints.');
  const m=prepare();
  process.stdout.write(m.preflight+'Prepared '+m.temporary+'\nNo GUI started.\n');
}
