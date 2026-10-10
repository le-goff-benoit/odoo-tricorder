const { _electron:electron }=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs=require('fs'),os=require('os'),path=require('path'),{execFileSync}=require('child_process');
const root='/tmp/tricorder-panel-final',out=__dirname;
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
fs.writeFileSync(path.join(out,'fixture.json'),JSON.stringify({directory,fixture,declared:'Projets synthétiques. Fournisseurs inertes. États créés par Engine.'},null,2));
const app=await electron.launch({args:[root],env});const page=await app.firstWindow();await page.setViewportSize({width:1440,height:1000});page.setDefaultTimeout(10000);
let step='';async function capture(name){step=name;await page.waitForTimeout(400);await page.screenshot({path:path.join(out,name+'.png')});const t=await page.locator('body').ariaSnapshot();fs.writeFileSync(path.join(out,name+'.txt'),t);console.log(name+'\n'+t);}
try{
await page.getByRole('heading',{name:'Activité',exact:true}).waitFor();await capture('01-accueil');
await page.getByText('Renouvellement contrat Atlas',{exact:true}).first().click();await page.locator('.human-intervention').waitFor();await capture('02-demande-atlas');
await page.getByRole('button',{name:'Répondre à la question',exact:true}).click();await capture('02b-reponse');await page.getByLabel('Votre réponse',{exact:true}).fill('Non, support du lundi au vendredi seulement.');await page.getByRole('button',{name:'Répondre',exact:true}).click();await page.getByRole('button',{name:'Voir les résultats',exact:true}).waitFor();await capture('02c-atlas-traite');
await page.getByRole('button',{name:'← Retour à la liste',exact:true}).click();await page.getByRole('button',{name:'Nouvelle demande',exact:true}).click();await capture('03-nouvelle-demande');
await page.getByRole('dialog').getByLabel('Workflow',{exact:true}).selectOption({label:'Clôture de réunion'});await page.getByLabel('Projet principal',{exact:true}).selectOption(fixture.atlas.id);await page.getByRole('button',{name:'Continuer',exact:true}).click();await page.getByLabel('Réunions ou période à analyser',{exact:true}).waitFor();await capture('04-preparer-reunions');
await page.getByLabel('Titre court (facultatif)').fill('Synthèse hebdomadaire Atlas');await page.getByLabel('Réunions ou période à analyser',{exact:true}).fill('Comités Atlas des lundi 5 et jeudi 8 octobre');await page.getByLabel('Notes, transcriptions ou liens des réunions',{exact:true}).fill('Lundi : demander au client sa priorité. Jeudi : Alice prépare un prototype avant vendredi. Sources synthétiques pour recette.');await capture('05-sources-renseignees');
await page.getByRole('button',{name:'Simuler le parcours',exact:true}).click();await page.getByRole('button',{name:'Voir les résultats',exact:true}).waitFor();await capture('06-reunions-terminees');await page.getByRole('button',{name:'Voir les résultats',exact:true}).click();await capture('07-livrable');
await page.getByRole('button',{name:'Fermer',exact:true}).click();await page.getByRole('button',{name:'Workflows',exact:true}).click();await page.getByRole('button',{name:'Historique',exact:true}).click();await capture('08-retrouver-historique');await page.getByText('Synthèse hebdomadaire Atlas',{exact:true}).first().click();await page.getByRole('button',{name:'Voir les résultats',exact:true}).click();await capture('09-livrable-retrouve');
const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});const runs=await call('run.list',{project:fixture.atlas.id});fs.writeFileSync(path.join(out,'run-check.json'),JSON.stringify(runs,null,2));
console.log('DEUX INTENTIONS TERMINEES');


}catch(e){console.error('FAILED after '+step,e);await capture('erreur');process.exitCode=1;}finally{await app.close();}
})();
