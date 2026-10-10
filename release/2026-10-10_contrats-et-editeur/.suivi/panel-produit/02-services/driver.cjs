const { _electron: electron } = require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs = require('fs'), path = require('path');
const {cleanupBroker}=require('/home/blegoff/odoo-tricorder/tests/terminal-fixture.cjs');
const base=__dirname;
for(const d of ['home','bin','state','runtime','config','data','cache','codex','claude','shots'])fs.mkdirSync(path.join(base,d),{recursive:true});
for(const p of ['codex','claude'])fs.writeFileSync(path.join(base,'bin',p),'#!/bin/sh\nprintf "SERVICES SYNTHETIC PROVIDER\\n"\ncase "$1" in --version) exit 0;; esac\nwhile IFS= read -r line; do printf "NOTE: %s\\n" "$line"; done\n',{mode:0o755});
const env={PATH:base+'/bin:/usr/bin:/bin',HOME:base+'/home',SHELL:'/bin/bash',DISPLAY:':188',XAUTHORITY:'/tmp/tricorder-collections-panel/188/Xauthority',LANG:'C.UTF-8',XDG_CONFIG_HOME:base+'/config',XDG_CACHE_HOME:base+'/cache',XDG_DATA_HOME:base+'/data',CODEX_HOME:base+'/codex',CLAUDE_CONFIG_DIR:base+'/claude',TRICORDER_HOME:base+'/home',TRICORDER_STATE_DIR:base+'/state',TRICORDER_RUNTIME_DIR:base+'/runtime',TRICORDER_AGENTS_DIR:base+'/absent-pack',TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'};
fs.writeFileSync(base+'/env.json',JSON.stringify(env));
(async()=>{
const app=await electron.launch({executablePath:'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/odoo-tricorder',args:[],env});const page=await app.firstWindow();await page.setViewportSize({width:1440,height:1000});await page.context().tracing.start({screenshots:true,snapshots:true});
fs.writeFileSync(base+'/ready','ready');
let previous='';
while(true){await new Promise(r=>setTimeout(r,200));if(!fs.existsSync(base+'/command.json'))continue;const raw=fs.readFileSync(base+'/command.json','utf8');if(raw===previous)continue;previous=raw;let c;try{c=JSON.parse(raw);let result;if(c.code==='STOP'){await page.context().tracing.stop({path:base+'/trace.zip'});await app.close();await cleanupBroker(base+'/runtime/pty.sock');fs.writeFileSync(base+'/result.json',JSON.stringify({id:c.id,result:'clean'}));break;}result=await new Function('page','app','require','return (async()=>{'+c.code+'})()')(page,app,require);fs.writeFileSync(base+'/result.json',JSON.stringify({id:c.id,result}));}catch(e){fs.writeFileSync(base+'/result.json',JSON.stringify({id:c?.id,error:e.stack}));}}
})();
