const { _electron: electron }=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs=require('fs'),os=require('os'),path=require('path'),readline=require('readline');
(async()=>{
 const root=fs.mkdtempSync('/tmp/tricorder-support-froid-'); const env={...process.env};
 for(const k of ['HOME','XDG_CONFIG_HOME','XDG_DATA_HOME','XDG_CACHE_HOME','TRICORDER_HOME','TRICORDER_STATE_DIR','TRICORDER_WORKFLOW_STATE_DIR','TRICORDER_RUNTIME_DIR','TRICORDER_AGENTS_DIR','CODEX_HOME','CLAUDE_CONFIG_DIR']){env[k]=path.join(root,k.toLowerCase());fs.mkdirSync(env[k],{recursive:true});}
 const bin=path.join(root,'bin');fs.mkdirSync(bin);for(const agent of ['codex','claude'])fs.writeFileSync(path.join(bin,agent),'#!/bin/sh\nexit 78\n',{mode:0o755});env.PATH=bin+':'+process.env.PATH;
 const app=await electron.launch({executablePath:'/home/blegoff/.local/opt/odoo-tricorder-0.6.0-rc.17/odoo-tricorder',args:['--no-sandbox'],env,timeout:30000}); const page=await app.firstWindow();await page.waitForTimeout(1800);
 global.page=page;global.app=app;global.root=root;global.fs=fs;global.path=path;
 global.snap=async(name)=>{await page.screenshot({path:path.join('/home/blegoff/odoo-tricorder/release/2026-10-10_methodes-reutilisables/.suivi/baseline/04-support',name+'.png')});console.log(await page.locator('body').innerText());};
 console.log('ROOT '+root);await snap('01-accueil');console.log('READY');
 const rl=readline.createInterface({input:process.stdin});for await(const line of rl){try{if(line==='EXIT'){await app.close();break;}console.log(await eval(line));}catch(e){console.log('ERROR '+e.message);}}
})().catch(e=>{console.error(e);process.exit(1)});
