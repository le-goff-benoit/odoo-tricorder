const { _electron:electron }=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs=require('fs'),path=require('path'),readline=require('readline');
const {cleanupBroker}=require('/home/blegoff/odoo-tricorder/tests/terminal-fixture.cjs');
const dir='/tmp/tricorder-personas-produit/06-consultant',home=path.join(dir,'home');
fs.mkdirSync(path.join(home,'bin'),{recursive:true});
for(const name of ['codex','claude'])fs.writeFileSync(path.join(home,'bin',name),'#!/bin/sh\nprintf "CONSULTANT_SYNTHETIQUE_LOCAL aucun fournisseur reel\\n"\nexit 78\n',{mode:0o755});
(async()=>{const app=await electron.launch({executablePath:'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/odoo-tricorder',args:[],env:{PATH:home+'/bin:/usr/bin:/bin',HOME:home,DISPLAY:':189',XAUTHORITY:'/tmp/tricorder-collections-panel/189/Xauthority',LANG:'C.UTF-8',XDG_CONFIG_HOME:home+'/config',XDG_DATA_HOME:home+'/data',XDG_CACHE_HOME:home+'/cache',CODEX_HOME:home+'/codex',CLAUDE_CONFIG_DIR:home+'/claude',TRICORDER_HOME:home,TRICORDER_STATE_DIR:home,TRICORDER_RUNTIME_DIR:home+'/runtime',TRICORDER_AGENTS_DIR:home+'/no-pack',TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'}});
const page=await app.firstWindow();await page.setViewportSize({width:1440,height:1000});await page.context().tracing.start({screenshots:true,snapshots:true,sources:true});
const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
const shot=async(name)=>page.screenshot({path:dir+'/'+name+'.png'});
const body=async()=>page.locator('body').innerText();
console.log('READY\n'+await body());
for await(const line of readline.createInterface({input:process.stdin})){try{if(line==='CLOSE'){await page.context().tracing.stop({path:dir+'/trace.zip'});await app.close();for(const socket of ['cockpit/odoo-tricorder/pty.sock','studio-pty.sock','runtime/pty.sock'])await cleanupBroker(path.join(home,socket));console.log('CLOSED');break;}const result=await eval('(async()=>{'+line+'})()');console.log(JSON.stringify(result));}catch(error){console.log('ERROR '+error.stack);}}
})();
