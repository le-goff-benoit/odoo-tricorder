const fs=require('fs'); const os=require('os'); const path=require('path'); const readline=require('readline'); const {_electron}=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
(async()=>{
 const base=fs.mkdtempSync('/tmp/tricorder-expert-cold-'); const bin=path.join(base,'bin');fs.mkdirSync(bin);for(const name of ['codex','claude']){fs.writeFileSync(path.join(bin,name),'#!/bin/sh\nexit 78\n',{mode:0o755});}
 const env={...process.env,PATH:bin+':'+process.env.PATH};for(const key of ['HOME','XDG_CONFIG_HOME','XDG_DATA_HOME','XDG_CACHE_HOME','TRICORDER_HOME','TRICORDER_STATE_DIR','TRICORDER_WORKFLOW_STATE_DIR','TRICORDER_RUNTIME_DIR','TRICORDER_AGENTS_DIR','CODEX_HOME','CLAUDE_CONFIG_DIR']){const dir=path.join(base,key.toLowerCase());fs.mkdirSync(dir,{recursive:true});env[key]=dir;}
 global.app=await _electron.launch({executablePath:'/home/blegoff/.local/opt/odoo-tricorder-0.6.0-rc.17/odoo-tricorder',args:['--no-sandbox'],env});global.page=await app.firstWindow();await page.waitForTimeout(3000);global.out=path.resolve('release/2026-10-10_methodes-reutilisables/.suivi/baseline/09-expert');
 console.log('VISIBLE',await page.locator('body').innerText());const rl=readline.createInterface({input:process.stdin});for await(const line of rl){try{const result=await eval(line);console.log('RESULT',JSON.stringify(result));}catch(e){console.log('ERROR',e.message);}}
 await app.close();
})();
