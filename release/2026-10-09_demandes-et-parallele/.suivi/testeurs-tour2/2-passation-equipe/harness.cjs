const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const {createInterface}=require('node:readline');
const { _electron:electron }=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const {cleanupBroker}=require('/home/blegoff/odoo-tricorder/tests/terminal-fixture.cjs');
const evidence=__dirname;
const packagePath=process.argv[2];
if(!packagePath)throw Error('Paquet figé obligatoire');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-tour2-passation-'));
const bin=path.join(temp,'bin');fs.mkdirSync(bin);
for(const p of ['codex','claude'])fs.writeFileSync(path.join(bin,p),'#!/bin/sh\ncase "$1" in --version) printf "'+p+' SYNTHETIC_PASSATION_STUB 1.0\\n"; exit 0;; esac\nprintf "SYNTHETIC_PASSATION_STUB '+p+' INERT\\n"\nwhile IFS= read -r line; do printf "SYNTHETIC_INPUT %s\\n" "$line"; done\n',{mode:0o755});
const env={PATH:bin+':/usr/bin:/bin',HOME:path.join(temp,'home'),DISPLAY:':182',XAUTHORITY:'/tmp/tricorder-functional-display/auth-182',LANG:'C.UTF-8',XDG_CONFIG_HOME:path.join(temp,'config'),XDG_CACHE_HOME:path.join(temp,'cache'),XDG_DATA_HOME:path.join(temp,'data'),CODEX_HOME:path.join(temp,'codex'),CLAUDE_CONFIG_DIR:path.join(temp,'claude'),TRICORDER_HOME:path.join(temp,'tricorder'),TRICORDER_STATE_DIR:path.join(temp,'state'),TRICORDER_RUNTIME_DIR:path.join(temp,'runtime'),TRICORDER_AGENTS_DIR:path.join(temp,'no-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'};
for(const [key,value]of Object.entries(env))if(/HOME|DIR$/.test(key))fs.mkdirSync(value,{recursive:true});
const check=execFileSync('/bin/bash',['--noprofile','--norc','-c','command -v codex; codex --version; printf "\\n" | codex; command -v claude; claude --version; printf "\\n" | claude'],{env,encoding:'utf8'});
if(!check.includes(bin+'/codex')||!check.includes(bin+'/claude')||!check.includes('SYNTHETIC_PASSATION_STUB codex INERT')||!check.includes('SYNTHETIC_PASSATION_STUB claude INERT'))throw Error('Contrôle fournisseurs échoué');
fs.writeFileSync(path.join(evidence,'stub-preflight.txt'),check);
const ctx={temp,env,evidence,packagePath,shots:0};
ctx.git=(args,cwd)=>execFileSync('/usr/bin/git',args,{cwd,env,encoding:'utf8'});
ctx.source=path.join(temp,'atelier-nord');fs.mkdirSync(ctx.source);fs.writeFileSync(path.join(ctx.source,'README.md'),'# Atelier Nord\nPréparer une exposition associative. Contexte entièrement synthétique.\n');
ctx.git(['init'],ctx.source);ctx.git(['-c','user.name=Atelier synthétique','-c','user.email=synthetic@example.invalid','add','README.md'],ctx.source);ctx.git(['-c','user.name=Atelier synthétique','-c','user.email=synthetic@example.invalid','commit','-m','Contexte synthétique exposition'],ctx.source);
ctx.clone=path.join(temp,'atelier-sud');ctx.git(['clone',ctx.source,ctx.clone],temp);
let app,page;
async function stop(){if(app)await app.close();for(const socket of [path.join(env.TRICORDER_RUNTIME_DIR,'pty.sock'),path.join(env.TRICORDER_STATE_DIR,'studio-pty.sock'),path.join(env.TRICORDER_HOME,'cockpit/odoo-tricorder/pty.sock')])await cleanupBroker(socket);fs.writeFileSync(path.join(evidence,'session-environment.json'),JSON.stringify({temp,packagePath,env,source:ctx.source,clone:ctx.clone},null,2));}
(async()=>{try{
 app=await electron.launch({executablePath:packagePath,args:[],env});page=await app.firstWindow();await page.setViewportSize({width:1440,height:1000});
 ctx.shot=async name=>{if(++ctx.shots>18)throw Error('Limite captures 18');await page.screenshot({path:path.join(evidence,'captures',name+'.png')});};
 console.log(JSON.stringify({ready:true,temp,source:ctx.source,clone:ctx.clone,text:await page.locator('body').innerText()}));
 const rl=createInterface({input:process.stdin,terminal:false});
 for await(const line of rl){try{const command=JSON.parse(line);if(command.stop){await stop();console.log(JSON.stringify({stopped:true}));process.exit(0);}const result=await new (Object.getPrototypeOf(async function(){}).constructor)('page','app','ctx','require',command.code)(page,app,ctx,require);console.log(JSON.stringify({result}));}catch(e){console.log(JSON.stringify({error:e.stack}));}}
}finally{await stop();}})().catch(e=>{console.error(e);process.exit(1)});
