const { _electron: electron }=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs=require('fs'),os=require('os'),path=require('path');
const {execFileSync}=require('child_process');
const root=process.env.TRICORDER_CANDIDATE, out=__dirname+'/contre-epreuve';if(!root)throw new Error('TRICORDER_CANDIDATE requis');fs.mkdirSync(out,{recursive:true});
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
const finalText=(await page.locator('.final-deliverable').allInnerTexts()).join('\n');
const expected='Décision : prioriser la visibilité des imports.\nReporter le nouveau tableau de bord.\nResponsable : équipe Produit.';
if(!finalText.includes(expected))throw new Error('Synthèse finale incomplète');
for(const action of ['Mesurer le temps des imports — Léa','Présenter le prototype de suivi — Sami'])if(!finalText.includes(action))throw new Error('Action finale manquante');
if(finalText.includes('Support : import lent.'))throw new Error('Données intermédiaires mêlées au livrable final');
await page.getByRole('button',{name:'Copier le texte',exact:true}).first().click();
const copied=await app.evaluate(({clipboard})=>clipboard.readText());fs.writeFileSync(out+'/copie.txt',copied);
if(copied!==expected)throw new Error('Copie synthèse non exacte : '+copied);
console.log('PASS Synthèse complète, actions visibles, intermédiaires séparés, copie exacte');
await snap('05-copie');
}catch(e){console.error(e);process.exitCode=1;}finally{if(app)await app.close();console.log('HOME',home);}})();
