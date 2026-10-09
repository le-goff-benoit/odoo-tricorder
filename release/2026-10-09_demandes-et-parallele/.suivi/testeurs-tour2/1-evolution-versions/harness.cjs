const fs=require('node:fs'), path=require('node:path'), readline=require('node:readline');
const {_electron:electron}=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const out=__dirname,b=JSON.parse(fs.readFileSync(path.join(out,'banc.json')));
if(!b.executable)throw Error('Paquet autorisé absent ; GUI interdit');
(async()=>{
 const app=await electron.launch({executablePath:b.executable,args:['--no-sandbox'],env:b.environment});
 const page=await app.firstWindow();page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(8000);await page.setViewportSize({width:1440,height:1000});
 const events=[];page.on('pageerror',e=>events.push(e.message));
 const ctx={app,page,out,b,fs,path,events,fixture:JSON.parse(fs.readFileSync(path.join(out,'fixtures.json')))};
 console.log('READY');
 const rl=readline.createInterface({input:process.stdin,terminal:false});
 for await(const line of rl){
  try{const v=JSON.parse(line);const fun=new (Object.getPrototypeOf(async function(){}).constructor)('ctx',v.code);const result=await fun(ctx);console.log(JSON.stringify({ok:true,result}));}
  catch(e){console.log(JSON.stringify({ok:false,error:e.message,stack:e.stack}));}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
