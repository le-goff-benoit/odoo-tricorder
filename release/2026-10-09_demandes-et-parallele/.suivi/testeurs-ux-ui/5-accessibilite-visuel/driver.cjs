const fs=require('node:fs');
const readline=require('node:readline');
const {launch}=require('../harness.cjs');
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(__dirname+'/ux5-accessibilite-visuel-preparation.json'));
 const session=await launch(manifest,{displayReleased:true,executable:'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/odoo-tricorder',executableSha256:'9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3',asar:'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/resources/app.asar',asarSha256:'a344374116f8ada276e426dd94279450b73cee31ba46aa981ae830a1fb64f44b'});
 console.log('READY');
 const rl=readline.createInterface({input:process.stdin});
 for await(const line of rl){
  try{const {code}=JSON.parse(line); const result=await new (Object.getPrototypeOf(async function(){}).constructor)('s','fs',code)(session,fs);console.log(JSON.stringify({result}));}
  catch(e){console.log(JSON.stringify({error:e.message}));}
 }
 await session.cleanup();
})();
