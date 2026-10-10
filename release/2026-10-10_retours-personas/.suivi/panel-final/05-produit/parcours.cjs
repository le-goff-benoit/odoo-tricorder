const { _electron: electron }=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs=require('fs'),os=require('os'),path=require('path');
const {execFileSync}=require('child_process');
const root='/tmp/tricorder-panel-final', out=__dirname;
const home=fs.mkdtempSync('/tmp/tricorder-produit-');fs.mkdirSync(home+'/bin');
for(const p of ['codex','claude'])fs.writeFileSync(home+'/bin/'+p,'#!/bin/sh\nexit 78\n',{mode:0o755});
const env={PATH:home+'/bin:/usr/bin:/bin',HOME:home,DISPLAY:':93',LANG:'C.UTF-8',XDG_CONFIG_HOME:home+'/config',XDG_CACHE_HOME:home+'/cache',XDG_DATA_HOME:home+'/data',CODEX_HOME:home+'/.codex',CLAUDE_CONFIG_DIR:home+'/claude',TRICORDER_HOME:home,TRICORDER_STATE_DIR:home,TRICORDER_WORKFLOW_STATE_DIR:home,TRICORDER_RUNTIME_DIR:home+'/runtime',TRICORDER_AGENTS_DIR:home+'/no-pack',TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'};
const fixture=JSON.parse(execFileSync('/usr/bin/python3',['-c',String.raw`import sys,json
sys.path.insert(0,sys.argv[1]);from workflow_engine import Engine
e=Engine(sys.argv[2]);p=e.create_project('Produit Orion — synthétique')
g={'schema':1,'id':'bilan-produit','title':'Synthèse des retours produit','description':'Modèle réutilisable de revue produit B2B','nodes':[{'id':'analyse','title':'Regrouper les retours','kind':'task','validation':'contract','outputs':{'constats':'string','segments':'string'}},{'id':'synthese','title':'Conclure la revue produit','kind':'task','validation':'human','criteria':['Les décisions distinguent maintenant et plus tard','Chaque action possède un responsable'],'inputs':{'retours':'string'},'outputs':{'synthese':'string','actions':'array'}}],'edges':[{'id':'suite','from':'analyse','to':'synthese','outcome':'done','mapping':{'constats':'retours'}}]}
e.save(p['id'],g);r=e.start(p['id'],g)
c=e.claim(r['id'],'analyse');e.submit(r['id'],'analyse',c['token'],{'ok':True,'summary':'Données intermédiaires de trois travaux','outputs':{'constats':'Support : import lent. Entretiens : manque de visibilité. Usage : export apprécié.','segments':'PME et équipes finance'}})
c=e.claim(r['id'],'synthese');e.submit(r['id'],'synthese',c['token'],{'ok':True,'summary':'Synthèse prête pour décision produit','outputs':{'synthese':'Décision : prioriser la visibilité des imports.\nReporter le nouveau tableau de bord.\nResponsable : équipe Produit.','actions':['Mesurer le temps des imports — Léa','Présenter le prototype de suivi — Sami']}})
e.accept(r['id'],'synthese',human=True,checks=g['nodes'][1]['criteria'],note='Revue synthétique : critères examinés et décisions retenues.')
print(json.dumps({'project':p,'run':r['id']}))`,root+'/backend',home],{env,encoding:'utf8'}));
(async()=>{let app;try{
app=await electron.launch({args:[root],env});const page=await app.firstWindow();await page.setViewportSize({width:1440,height:1000});await page.getByRole('heading',{name:'Activité',exact:true}).waitFor();
const snap=async n=>{await page.waitForTimeout(250);await page.screenshot({path:out+'/'+n+'.png'});fs.writeFileSync(out+'/'+n+'.txt',await page.locator('body').innerText());};
await snap('01-activite');
await page.locator('[data-workflow-route=global]').click();await page.getByRole('button',{name:'Historique',exact:true}).click();await snap('02-historique');
await page.locator('.activity-row').filter({hasText:'Synthèse des retours produit'}).click();await page.getByRole('button',{name:'Voir les résultats',exact:true}).waitFor();await snap('03-execution');
await page.getByRole('button',{name:'Voir les résultats',exact:true}).click();await snap('04-resultats');
console.log('RESULTATS\n'+await page.getByRole('dialog').innerText());
const copy=page.getByRole('button',{name:'Copier le texte',exact:true});console.log('COPY BUTTONS',await copy.count());
if(await copy.count()){await copy.first().click();fs.writeFileSync(out+'/copie.txt',await app.evaluate(({clipboard})=>clipboard.readText()));}
await page.getByText('Résultats des étapes',{exact:true}).click();await snap('04b-etapes');console.log('DETAILS\n'+await page.getByRole('dialog').innerText());
const synthesis=page.getByText('Décision : prioriser la visibilité des imports.\nReporter le nouveau tableau de bord.\nResponsable : équipe Produit.',{exact:true});
await synthesis.click({clickCount:3});await page.keyboard.press('Control+c');await page.waitForTimeout(100);fs.writeFileSync(out+'/copie-manuelle.txt',await app.evaluate(({clipboard})=>clipboard.readText()));
await page.getByRole('button',{name:'Fermer',exact:true}).click();
await page.locator('[data-workflow-route=global]').click();await page.getByText('Gestion des workflows',{exact:true}).click();await page.locator('[data-action=workflow-hub][data-tab=registered]').click();await page.locator('[data-action=open-workflow][data-id=bilan-produit]').click();await page.locator('.node[data-id=synthese]').click();await page.getByLabel('Validation du résultat',{exact:true}).waitFor();await snap('05-modele');
console.log('INSPECTEUR\n'+await page.locator('#inspector').innerText());
await page.getByLabel('Critères d’acceptation (un par ligne)',{exact:true}).fill('Les décisions distinguent maintenant et plus tard\nChaque action possède un responsable\nChaque priorité cite le segment client concerné');
await page.getByRole('button',{name:'Recevoir un résultat existant…',exact:true}).click();await snap('06-relier');
await page.getByLabel('Résultat à recevoir').selectOption(JSON.stringify(['analyse','segments']));await page.getByLabel('Nom dans cette étape').fill('Segments concernés');await page.getByRole('button',{name:'Ajouter et relier',exact:true}).click();
await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
await page.waitForTimeout(250);await snap('07-modele-enregistre');
const saved=await page.evaluate(p=>window.studio.request({action:'workflow.get',project:p,workflow:'bilan-produit'}),fixture.project.id);fs.writeFileSync(out+'/modele-enregistre.json',JSON.stringify(saved,null,2));
if(!saved.nodes.find(n=>n.id==='synthese').criteria.includes('Chaque priorité cite le segment client concerné'))throw new Error('Critère non sauvegardé');
if(saved.edges[0].mapping.segments!=='Segments_concernes')throw new Error('Liaison non sauvegardée');
console.log('VERIFICATION critères et liaison persistés');
}catch(e){console.error(e);process.exitCode=1;}finally{if(app)await app.close();console.log('HOME',home);}})();
