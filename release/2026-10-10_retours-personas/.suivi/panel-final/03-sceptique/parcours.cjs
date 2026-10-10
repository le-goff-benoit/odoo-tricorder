const { _electron: electron, expect } = require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs=require('fs'),os=require('os'),path=require('path'),{execFileSync}=require('child_process');
const out=__dirname,root='/tmp/tricorder-panel-final',stage=process.argv[2]||'discover';
let directory, fixture;
if(stage!=='replay' && fs.existsSync(path.join(out,'fixture.json'))){({directory,fixture}=JSON.parse(fs.readFileSync(path.join(out,'fixture.json'))));}else{
 directory=fs.mkdtempSync('/tmp/panel-final-sceptique-');fs.mkdirSync(path.join(directory,'bin'));
 for(const p of ['codex','claude'])fs.writeFileSync(path.join(directory,'bin',p),'#!/bin/sh\nprintf "FOURNISSEUR INERTE\\n"\nexit 78\n',{mode:0o755});
 fixture=JSON.parse(execFileSync('/usr/bin/python3',['-c',`import json,sys
sys.path.insert(0,sys.argv[1]);from workflow_engine import Engine
e=Engine(sys.argv[2]);p=e.create_project('Atelier sceptique synthétique')
g={'schema':1,'id':'legacy-review','title':'Ancien aiguillage de publication','nodes':[{'id':'gate','kind':'decision','title':'Décider de la publication','question':'Publier cette version ?','options':['approve','reject'],'position':{'x':60,'y':150}},{'id':'publish','kind':'document','title':'Publier la note','content':'PUBLICATION VALIDÉE — donnée synthétique','validation':'automatic','position':{'x':420,'y':50}},{'id':'repair','kind':'document','title':'Demander une correction','content':'CORRECTION DEMANDÉE — donnée synthétique','validation':'automatic','position':{'x':420,'y':300}}],'edges':[{'id':'approved-link','from':'gate','to':'publish','outcome':'approve'},{'id':'rejected-link','from':'gate','to':'repair','outcome':'reject'}]}
e.save(p['id'],g)
print(json.dumps({'project':p}))`,root+'/backend',directory],{encoding:'utf8'}));
 fs.writeFileSync(path.join(out,'fixture.json'),JSON.stringify({directory,fixture},null,2));
}
const env={PATH:directory+'/bin:/usr/bin:/bin',HOME:directory,DISPLAY:':93',LANG:'C.UTF-8',XDG_CONFIG_HOME:directory+'/config',XDG_CACHE_HOME:directory+'/cache',XDG_DATA_HOME:directory+'/data',CODEX_HOME:directory+'/.codex',CLAUDE_CONFIG_DIR:directory+'/claude',TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_WORKFLOW_STATE_DIR:directory,TRICORDER_RUNTIME_DIR:directory+'/runtime',TRICORDER_AGENTS_DIR:directory+'/no-pack',TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'};
(async()=>{let app,page;try{
 app=await electron.launch({executablePath:'/home/blegoff/odoo-tricorder/node_modules/electron/dist/electron',args:[root],env});page=await app.firstWindow();await page.setViewportSize({width:1440,height:1000});page.setDefaultTimeout(12000);
 const call=(action,data={})=>page.evaluate(p=>window.studio.request(p),{action,...data});
 const capture=async name=>{await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});fs.writeFileSync(path.join(out,name+'.txt'),await page.locator('body').innerText());};
 await expect(page.getByRole('heading',{name:'Activité',exact:true})).toBeVisible();
 if(['discover','create','replay'].includes(stage)){
 await capture('01-accueil');await page.locator('[data-workflow-route=global]').click();await page.getByRole('button',{name:'Modèles',exact:true}).click();
 await page.locator('.template-card').filter({has:page.getByRole('heading',{name:'Commande locale avec validation',exact:true})}).getByRole('button',{name:'Créer une adaptation…',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await capture('02-adapter');
 if(['create','replay'].includes(stage)){await page.getByLabel('Nom du workflow',{exact:true}).fill('Contrôle local reprise');await page.getByLabel('Enregistrer dans',{exact:true}).selectOption(fixture.project.id);await page.getByRole('button',{name:'Créer et ouvrir le workflow',exact:true}).click();await page.locator('.node[data-id=check]').click();await capture('03-commande-configuration');}

 }
 if(stage==='evidence'){
 const runs=await call('run.list',{project:fixture.project.id});for(const r of runs.items)fs.writeFileSync(path.join(out,r.original.id==='legacy-review'?'legacy-final-state.json':'local-final-state.json'),JSON.stringify(await call('run.get',{run:r.id}),null,2));
 await page.locator('[data-workflow-route=global]').click();await page.getByRole('button',{name:'Historique',exact:true}).click();await page.locator('.activity-row').filter({hasText:'Ancien aiguillage de publication'}).click();await page.getByRole('button',{name:'Graphe',exact:true}).click();await capture('25-legacy-branches');await page.locator('.node[data-id=repair]').click();await capture('26-legacy-document');
 }
 // STAGES
 if(['configure','run-local','replay'].includes(stage)){
 await page.locator('[data-workflow-route=global]').click();await page.getByText('Gestion des workflows',{exact:true}).click();await page.locator('[data-action=workflow-hub][data-tab=registered]').click();await page.locator('.workflow-row').filter({hasText:'Contrôle local reprise'}).locator('[data-action=open-workflow]').click();await page.locator('.node[data-id=check]').click();await capture('04-configuration-detail');console.log(await page.locator('#inspector').innerText());
 if(['run-local','replay'].includes(stage)){
 await page.getByLabel('Commande et arguments (un par ligne)',{exact:true}).fill('/usr/bin/python3\n-c\nfrom pathlib import Path; import sys; ok=Path("/project/ready.txt").exists(); print("CONTROLE_OK" if ok else "FICHIER_READY_ABSENT — creer ready.txt dans le projet"); sys.exit(0 if ok else 7)');
 await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await page.getByRole('button',{name:'Exécuter…',exact:true}).click();await capture('05-lancement-reel');await page.getByRole('button',{name:'Lancer l’exécution réelle',exact:true}).click();
 await expect(page.locator('.node[data-id=check]')).toHaveAttribute('data-status','returned',{timeout:30000});await page.locator('.node[data-id=check]').click();await capture('06-echec');console.log('ECHEC',await page.locator('#inspector').innerText());
 await page.locator('[data-action=terminal-toggle]').click();await page.getByRole('button',{name:'Ouvrir un terminal',exact:true}).click();await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type('printf "corrige\\n" > ready.txt');await page.keyboard.press('Enter');await expect.poll(()=>fs.existsSync(fixture.project.path+'/ready.txt')).toBe(true);await capture('07-reparation-terminal');
 await page.locator('[data-action=terminal-toggle]').click();await page.getByRole('button',{name:'Relancer cette étape…',exact:true}).click();await capture('08-reprise-confirmee');await page.getByLabel('Correction attendue',{exact:true}).fill('Le fichier ready.txt a été créé dans le projet depuis son terminal.');await page.getByRole('button',{name:'Relancer maintenant',exact:true}).click();
 await expect(page.locator('.node[data-id=decision]')).toHaveAttribute('data-status','waiting',{timeout:30000});await page.getByRole('button',{name:'Examiner la décision',exact:true}).click();await capture('09-decision-preuves');console.log('DECISION',await page.locator('#inspector').innerText());
 await page.locator('.upstream-command-result [data-action=read-proof]').first().click();await capture('10-preuve');await page.locator('[data-action=close-modal]').click();await page.getByRole('button',{name:'Approuver la suite',exact:true}).click();await expect(page.locator('#execution-overview')).toContainText('Terminée');await capture('11-terminee');
 const runs=await call('run.list',{project:fixture.project.id});fs.writeFileSync(path.join(out,'local-runs.json'),JSON.stringify(runs,null,2));
 await page.locator('[data-workflow-route=global]').click();await page.getByRole('button',{name:'Historique',exact:true}).click();await capture('12-historique');await page.locator('.activity-row').filter({hasText:'Contrôle local reprise'}).click();await capture('13-historique-detail');
 }

 }

 if(stage==='finish-local'){
 await page.locator('[data-workflow-route=global]').click();await page.locator('.activity-row').filter({hasText:'Contrôle local reprise'}).click();await page.getByRole('button',{name:'Examiner la décision',exact:true}).click();await capture('09-decision-preuves');console.log(await page.locator('#inspector').innerText());
 await page.locator('.upstream-command-result [data-action=read-proof]').first().click();await capture('10-preuve');await page.locator('[data-action=close-modal]').click();await page.getByRole('button',{name:'Approuver la suite',exact:true}).click();await expect(page.locator('#execution-overview')).toContainText('Terminée');await capture('11-terminee');
 const runs=await call('run.list',{project:fixture.project.id});fs.writeFileSync(path.join(out,'local-runs.json'),JSON.stringify(runs,null,2));
 await page.locator('[data-workflow-route=global]').click();await page.getByRole('button',{name:'Historique',exact:true}).click();await capture('12-historique');await page.locator('.activity-row').filter({hasText:'Contrôle local reprise'}).click();await capture('13-historique-detail');
 }
 if(['legacy','replay'].includes(stage)){
 await page.locator('[data-workflow-route=global]').click();await page.getByText('Gestion des workflows',{exact:true}).click();await page.locator('[data-action=workflow-hub][data-tab=registered]').click();await page.locator('[data-action=open-workflow][data-id=legacy-review]').click();await page.locator('.node[data-id=gate]').click();await capture('20-legacy-avant');
 await page.getByLabel('Choix possibles (un par ligne)',{exact:true}).fill('Publier la version\nRenvoyer pour correction');if(await page.getByRole('button',{name:'Enregistrer',exact:true}).isEnabled())await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await capture('21-legacy-renomme');
 fs.writeFileSync(path.join(out,'legacy-saved.json'),JSON.stringify(await call('workflow.get',{project:fixture.project.id,workflow:'legacy-review'}),null,2));
 await page.getByRole('button',{name:'Exécuter…',exact:true}).click();await capture('22-legacy-lancement');await page.getByText('Exécution automatique sans conversation',{exact:true}).click();await capture('22b-legacy-avance');await page.getByRole('button',{name:'Lancer l’exécution réelle',exact:true}).click();await page.locator('.node[data-id=gate]').click();await capture('23-legacy-decision');await page.getByRole('button',{name:'Renvoyer pour correction',exact:true}).click();await expect(page.locator('.node[data-id=repair]')).toHaveAttribute('data-status','accepted');await expect(page.locator('.node[data-id=publish]')).toHaveAttribute('data-status','skipped');await capture('24-legacy-resultat');fs.writeFileSync(path.join(out,'legacy-runs.json'),JSON.stringify(await call('run.list',{project:fixture.project.id}),null,2));
 }
 }catch(e){console.error(e);if(page){fs.writeFileSync(path.join(out,stage+'-error.txt'),await page.locator('body').innerText());await page.screenshot({path:path.join(out,stage+'-error.png'),fullPage:true});}process.exitCode=1;}finally{if(app)await app.close();}})();
