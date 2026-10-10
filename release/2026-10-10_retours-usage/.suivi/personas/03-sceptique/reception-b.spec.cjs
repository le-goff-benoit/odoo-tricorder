const {test,_electron:electron,expect}=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {cleanupBroker}=require('/home/blegoff/odoo-tricorder/tests/terminal-fixture.cjs');
const out=__dirname+'/b';fs.mkdirSync(out,{recursive:true});
test('persona sceptique: usage GUI isolé',async()=>{
const bank=fs.mkdtempSync('/tmp/tricorder-sceptique-'); for(const d of ['home','bin','repo','runtime','state','workflow-state'])fs.mkdirSync(path.join(bank,d));
for(const cli of ['codex','claude'])fs.writeFileSync(path.join(bank,'bin',cli),'#!/bin/sh\nprintf "NO_PROVIDER\\n"\nexit 78\n',{mode:0o755});
cp.execFileSync('git',['init',bank+'/repo'],{stdio:'ignore'});
fs.writeFileSync(bank+'/repo/check.py',"print('CAUSE_EXPLICITE: valeur incorrecte'); raise SystemExit(7)\n");
const env={PATH:bank+'/bin:/usr/bin:/bin',HOME:bank+'/home',SHELL:'/bin/bash',DISPLAY:process.env.DISPLAY,XAUTHORITY:process.env.XAUTHORITY,LANG:'C.UTF-8',XDG_CONFIG_HOME:bank+'/config',XDG_DATA_HOME:bank+'/data',XDG_CACHE_HOME:bank+'/cache',CODEX_HOME:bank+'/codex',CLAUDE_CONFIG_DIR:bank+'/claude',TRICORDER_HOME:bank+'/home',TRICORDER_STATE_DIR:bank+'/state',TRICORDER_WORKFLOW_STATE_DIR:bank+'/workflow-state',TRICORDER_RUNTIME_DIR:bank+'/runtime',TRICORDER_AGENTS_DIR:bank+'/no-pack',TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'};
fs.writeFileSync(out+'/isolation.json',JSON.stringify({bank,candidate:'/tmp/tricorder-usage-candidate-b',env},null,2));
let app,page;const shot=async name=>{await page.screenshot({path:out+'/'+name+'.png'});fs.writeFileSync(out+'/'+name+'.txt',(await page.getByRole('button').allTextContents()).join('\n')+'\n'+(await page.locator('#inspector').count()?await page.locator('#inspector').innerText():''));};
try{
app=await electron.launch({executablePath:'/home/blegoff/odoo-tricorder/node_modules/electron/dist/electron',args:['/tmp/tricorder-usage-candidate-b'],env});
page=await app.firstWindow();page.setDefaultTimeout(10000);await page.setViewportSize({width:1500,height:1000});
await page.getByRole('button',{name:'Projets',exact:true}).click();await page.getByRole('button',{name:'+ Nouveau projet',exact:true}).click();
await page.getByLabel('Nom du projet',{exact:true}).fill('Essai développeur sceptique');await page.getByLabel('Emplacement',{exact:true}).selectOption('repository');await page.locator('#project-path').fill(bank+'/repo');await page.getByRole('button',{name:'Créer le projet',exact:true}).click();
await page.getByRole('button',{name:'Workflows',exact:true}).click();await shot('01-workflows');await page.getByRole('button',{name:'Modèles',exact:true}).click();await shot('02-modeles');
await page.locator('.template-card').filter({has:page.getByRole('heading',{name:'Commande locale avec validation',exact:true})}).getByRole('button',{name:'Créer une adaptation…',exact:true}).click();await shot('03-adapter');
await page.getByLabel('Nom du workflow',{exact:true}).fill('Vérifier un script local');await page.getByLabel('Enregistrer dans',{exact:true}).selectOption({label:'Essai développeur sceptique'});await page.getByRole('button',{name:'Créer et ouvrir le workflow',exact:true}).click();
await shot('04-editeur');await page.getByRole('button',{name:'Exécuter…',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
await expect(page.getByRole('button',{name:'Lancer l’exécution réelle',exact:true})).toBeVisible();await shot('05-lancement-direct');
fs.writeFileSync(out+'/dialogue.txt',await page.getByRole('dialog').innerText());
fs.writeFileSync(out+'/result.json',JSON.stringify({passed:true,realLaunchVisibleWithoutDisclosure:true,candidate:'/tmp/tricorder-usage-candidate-b',bank},null,2));
}catch(e){if(page)await shot('erreur');throw e;}finally{if(app)await app.close();await cleanupBroker(bank+'/runtime/pty.sock');}
});
