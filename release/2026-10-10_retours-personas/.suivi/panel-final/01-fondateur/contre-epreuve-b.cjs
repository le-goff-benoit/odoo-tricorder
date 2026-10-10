const { _electron:electron }=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs=require('fs'),os=require('os'),path=require('path'),{execFileSync}=require('child_process');
const root='/tmp/tricorder-release-final-b',out=__dirname;
(async()=>{
const directory=fs.mkdtempSync('/tmp/tricorder-founder-');fs.mkdirSync(path.join(directory,'bin'));
for(const provider of ['codex','claude'])fs.writeFileSync(path.join(directory,'bin',provider),'#!/bin/sh\nprintf "FOURNISSEUR SYNTHETIQUE INERTE\\n"\nexit 78\n',{mode:0o755});
const env={PATH:path.join(directory,'bin')+':/usr/bin:/bin',HOME:directory,DISPLAY:':93',LANG:'C.UTF-8',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_CACHE_HOME:path.join(directory,'cache'),XDG_DATA_HOME:path.join(directory,'data'),CODEX_HOME:path.join(directory,'.codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_WORKFLOW_STATE_DIR:directory,TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'no-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'};
const fixture=JSON.parse(execFileSync('/usr/bin/python3',['-c',`import json,sys
sys.path.insert(0,sys.argv[1]);from workflow_engine import Engine
e=Engine(sys.argv[2]); atlas=e.create_project('Client Atlas'); orion=e.create_project('Client Orion')
g={'schema':1,'id':'renewal','title':'Renouvellement contrat Atlas','nodes':[{'id':'question','title':'Confirmer le périmètre','kind':'question','question':'Atlas souhaite-t-il inclure le support du samedi ?','outputs':{'answer':'string'}}],'edges':[]}
e.save(atlas['id'],g); a=e.start(atlas['id'],g)
h={'schema':1,'id':'onboarding','title':'Accueil client Orion','nodes':[{'id':'question','title':'Préciser le contact','kind':'question','question':'Quel contact Orion doit recevoir la synthèse ?','outputs':{'answer':'string'}}],'edges':[]}
e.save(orion['id'],h); b=e.start(orion['id'],h)
d={'schema':1,'id':'done','title':'Bilan précédent Atlas','nodes':[{'id':'work','title':'Rédiger le bilan','kind':'task','validation':'contract','outputs':{'draft':'string'}}],'edges':[]}
e.save(atlas['id'],d);r=e.start(atlas['id'],d);c=e.claim(r['id'],'work');e.submit(r['id'],'work',c['token'],{'ok':True,'summary':'Bilan synthétique terminé','outputs':{'draft':'Atlas : renouvellement à examiner le 15 octobre. Donnée synthétique.'}})
print(json.dumps({'atlas':atlas,'orion':orion,'pending':a['id'],'done':r['id']}))`,path.join(root,'backend'),directory],{env,encoding:'utf8'}));
fs.writeFileSync(path.join(out,'b-fixture.json'),JSON.stringify({directory,fixture,declared:'Projets synthétiques. Fournisseurs inertes. États créés par Engine.'},null,2));
const app=await electron.launch({args:[root],env});const page=await app.firstWindow();await page.setViewportSize({width:1440,height:1000});page.setDefaultTimeout(10000);
let step='';async function capture(name){step=name;await page.waitForTimeout(400);await page.screenshot({path:path.join(out,name+'.png')});const t=await page.locator('body').ariaSnapshot();fs.writeFileSync(path.join(out,name+'.txt'),t);console.log(name+'\n'+t);}
try{
await page.getByRole('heading',{name:'Activité',exact:true}).waitFor();await page.getByRole('button',{name:'Nouvelle demande',exact:true}).click();
await page.getByLabel('Projet principal',{exact:true}).selectOption(fixture.atlas.id);
await page.getByRole('dialog').getByLabel('Workflow',{exact:true}).click();await capture('b00-liste-modeles');await page.keyboard.press('Escape');
await page.getByRole('dialog').getByLabel('Workflow',{exact:true}).selectOption({label:'Clôture de réunion'});await capture('b01-choix-reunion');
const selection=await page.getByLabel('Projet principal',{exact:true}).inputValue();if(selection!==fixture.atlas.id)throw new Error('Projet perdu au changement de modèle');
const groups=await page.getByRole('dialog').locator('optgroup').evaluateAll(xs=>xs.map(x=>({label:x.label,options:[...x.children].map(o=>o.textContent)})));fs.writeFileSync(path.join(out,'b-groupes.json'),JSON.stringify(groups,null,2));
await page.getByRole('button',{name:'Continuer',exact:true}).click();await page.getByLabel('Réunions ou période à analyser',{exact:true}).waitFor();await capture('b02-formulaire-atlas');
console.log('CONTRE-EPREUVE ACHEVEE');
}catch(e){console.error('FAILED after '+step,e);await capture('b-erreur');process.exitCode=1;}finally{await app.close();}
})();
