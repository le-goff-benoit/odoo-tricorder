const { _electron }=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process'),rl=require('readline');
(async()=>{
 const home='/tmp/tricorder-consultant-2j4Y7l';
 for(const d of ['.codex','.claude','.odoo19-agents/workflows','bin','config','data','cache','state','runtime','tricorder']) fs.mkdirSync(path.join(home,d),{recursive:true});
 for(const cmd of ['codex','claude'])fs.writeFileSync(path.join(home,'bin',cmd),'#!/bin/sh\nexit 78\n',{mode:0o755});
 fs.writeFileSync(path.join(home,'.codex/models_cache.json'),JSON.stringify({models:[{slug:'fixture-model',display_name:'Modèle de test',visibility:'list'}]}));
 fs.writeFileSync(path.join(home,'.odoo19-agents/workflows/model-policy.json'),JSON.stringify({principal:{codex:'fixture-model'}}));
 const xvfb=cp.spawn('/tmp/tricorder-xvfb/usr/bin/Xvfb',[':113','-screen','0','1440x1000x24'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,800));
 const env={...process.env,DISPLAY:':113',HOME:home,XDG_CONFIG_HOME:path.join(home,'config'),XDG_DATA_HOME:path.join(home,'data'),XDG_CACHE_HOME:path.join(home,'cache'),XDG_STATE_HOME:path.join(home,'state'),XDG_RUNTIME_DIR:path.join(home,'runtime'),TRICORDER_HOME:path.join(home,'tricorder'),TRICORDER_STATE_DIR:path.join(home,'state'),TRICORDER_RUNTIME_DIR:path.join(home,'runtime'),TRICORDER_AGENTS_DIR:path.join(home,'.odoo19-agents'),CODEX_HOME:path.join(home,'.codex'),CLAUDE_CONFIG_DIR:path.join(home,'.claude'),PATH:path.join(home,'bin')+':/tmp/tricorder-xvfb/usr/bin:'+process.env.PATH};
 const app=await _electron.launch({executablePath:'/home/blegoff/odoo-tricorder/node_modules/electron/dist/electron',args:['/tmp/tricorder-method-review-v2'],env});
 const page=await app.firstWindow();page.setDefaultTimeout(2500);await page.waitForLoadState();
 console.log(JSON.stringify({home,ready:true,text:await page.locator('body').innerText()}));
 const reader=rl.createInterface({input:process.stdin});
 for await(const line of reader){try{const action=JSON.parse(line);if(action.close){await app.close();xvfb.kill();process.exit(0);} const result=await eval('(async()=>{'+action.code+'})()'); console.log(JSON.stringify({ok:true,result}));}catch(e){console.log(JSON.stringify({ok:false,error:String(e)}));}}
})();
