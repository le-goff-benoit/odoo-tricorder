const fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
const {_electron}=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const out=__dirname, profile=fs.mkdtempSync('/tmp/tricorder-support-');
for(const d of ['.codex','.odoo19-agents/workflows','bin','config','data','cache','state','runtime','tricorder','claude'])fs.mkdirSync(path.join(profile,d),{recursive:true});
fs.writeFileSync(path.join(profile,'.codex/models_cache.json'),JSON.stringify({models:[{slug:'fixture-model',display_name:'Modèle de test',visibility:'list'}]}));
fs.writeFileSync(path.join(profile,'.odoo19-agents/workflows/model-policy.json'),JSON.stringify({principal:{codex:'fixture-model'}}));
for(const n of ['codex','claude']){let p=path.join(profile,'bin',n);fs.writeFileSync(p,'#!/bin/sh\nexit 78\n');fs.chmodSync(p,0o755);}
const xvfb=cp.spawn('/tmp/tricorder-xvfb/usr/bin/Xvfb',[':94','-screen','0','1440x1000x24','-nolisten','tcp'],{stdio:'ignore'});
(async()=>{await new Promise(r=>setTimeout(r,500));
const app=await _electron.launch({executablePath:'/home/blegoff/odoo-tricorder/node_modules/electron/dist/electron',args:['/tmp/tricorder-method-review-v2','--no-sandbox'],env:{...process.env,DISPLAY:':94',HOME:profile,XDG_CONFIG_HOME:path.join(profile,'config'),XDG_DATA_HOME:path.join(profile,'data'),XDG_CACHE_HOME:path.join(profile,'cache'),XDG_STATE_HOME:path.join(profile,'state'),XDG_RUNTIME_DIR:path.join(profile,'runtime'),TRICORDER_HOME:path.join(profile,'tricorder'),TRICORDER_STATE_DIR:path.join(profile,'state'),TRICORDER_RUNTIME_DIR:path.join(profile,'runtime'),AGENTS_DIR:path.join(profile,'.odoo19-agents'),CODEX_HOME:path.join(profile,'.codex'),CLAUDE_CONFIG_DIR:path.join(profile,'claude'),PATH:path.join(profile,'bin')+':/tmp/tricorder-xvfb/usr/bin:'+process.env.PATH}});
const page=await app.firstWindow();await page.waitForLoadState('domcontentloaded');
console.log('READY '+profile);console.log(await page.locator('body').innerText());
const rl=require('readline').createInterface({input:process.stdin});for await(const code of rl){try{console.log(JSON.stringify(await eval('(async()=>{'+code+'})()')));}catch(e){console.log('ERROR '+e.message)}}await app.close();xvfb.kill();})().catch(e=>{console.error(e);xvfb.kill();process.exit(1)});
