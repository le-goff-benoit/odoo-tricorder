const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('fs'),path=require('path'),os=require('os'),{execFileSync}=require('child_process');
const candidate='/tmp/tricorder-usage-candidate-b',repo='/home/blegoff/odoo-tricorder';
test('Candidat B — PM B2B — suivre une décision produit et adapter une synthèse hebdomadaire',async()=>{
 const home=fs.mkdtempSync('/tmp/tricorder-persona05-');
 fs.mkdirSync(path.join(home,'bin'));
 for(const provider of ['codex','claude'])fs.writeFileSync(path.join(home,'bin',provider),'#!/bin/sh\necho Fournisseur absent du test persona\nexit 78\n',{mode:0o755});
 const env={PATH:home+'/bin:/usr/bin:/bin',HOME:home,DISPLAY:':93',LANG:'C.UTF-8',XDG_CONFIG_HOME:home+'/config',XDG_CACHE_HOME:home+'/cache',XDG_DATA_HOME:home+'/data',CODEX_HOME:home+'/.codex',CLAUDE_CONFIG_DIR:home+'/claude',TRICORDER_HOME:home,TRICORDER_STATE_DIR:home,TRICORDER_WORKFLOW_STATE_DIR:home,TRICORDER_RUNTIME_DIR:home+'/runtime',TRICORDER_AGENTS_DIR:home+'/no-pack',TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'};
 execFileSync('/usr/bin/python3',['-c',`import sys
sys.path.insert(0,sys.argv[1]);from workflow_engine import Engine
e=Engine(sys.argv[2]);p=e.create_project('Portail clients B2B')
g={'schema':1,'id':'arbitrage','title':'Arbitrage export client','nodes':[{'id':'priorite','title':'Choisir la priorité','kind':'question','question':'Faut-il prioriser l’export CSV ou les droits des équipes ?','outputs':{'answer':'string'}}],'edges':[]}
e.save(p['id'],g);e.start(p['id'],g)
d={'schema':1,'id':'synthese','title':'Synthèse entretiens clients','nodes':[{'id':'work','title':'Synthèse livrée','kind':'task','validation':'contract'}],'edges':[]}
e.save(p['id'],d);r=e.start(p['id'],d);c=e.claim(r['id'],'work');e.submit(r['id'],'work',c['token'],{'ok':True,'summary':'Les entretiens confirment le besoin d’export CSV. Prochaine étape : comparer les droits nécessaires.','outputs':{}})
`,candidate+'/backend',home],{env,encoding:'utf8'});
 const app=await electron.launch({executablePath:repo+'/node_modules/electron/dist/electron',args:[candidate],env});
 const page=await app.firstWindow();await page.setViewportSize({width:1440,height:1000});
 await page.context().tracing.start({screenshots:true,snapshots:true});
 let index=0;async function note(name){await page.screenshot({path:path.join(__dirname,'b-'+String(++index).padStart(2,'0')+'-'+name+'.png')});fs.writeFileSync(path.join(__dirname,'b-'+String(index).padStart(2,'0')+'-'+name+'.txt'),await page.locator('body').ariaSnapshot());}
 try {
  await expect(page.getByRole('heading',{name:'Activité',exact:true})).toBeVisible();await note('accueil');
  await page.locator('[data-workflow-route=global]').click();await expect(page.getByRole('heading',{name:'Workflows',exact:true})).toBeVisible();await note('workflows-en-cours');
  await page.getByText('Arbitrage export client',{exact:true}).click();await expect(page.locator('.human-intervention')).toBeVisible();await note('arbitrage');
  await page.getByRole('button',{name:'Répondre à la question',exact:true}).click();await expect(page.locator('#question-answer')).toBeVisible();await note('question-ouverte');
  await page.locator('#question-answer').fill('Prioriser l’export CSV demandé par trois clients ; traiter les droits des équipes au sprint suivant.');await page.getByRole('button',{name:'Répondre',exact:true}).click();await expect(page.locator('.human-intervention')).toHaveCount(0);await note('arbitrage-termine');
  await page.getByRole('button',{name:'← Retour à la liste',exact:true}).click();await expect(page.getByRole('heading',{name:'Workflows',exact:true})).toBeVisible();await note('retour-en-cours');
  await page.getByRole('button',{name:'Historique',exact:true}).click();await expect(page.getByText('Synthèse entretiens clients',{exact:true})).toBeVisible();await note('historique');
  await page.getByText('Synthèse entretiens clients',{exact:true}).click();await expect(page.getByRole('heading',{name:'Synthèse entretiens clients',exact:true})).toBeVisible();await note('synthese-terminee');
  await page.getByRole('button',{name:'Voir le rapport',exact:true}).click();await expect(page.getByRole('heading',{name:'Rapport d’exécution',exact:true})).toBeVisible();await note('rapport');
  await expect(page.getByRole('heading',{name:'Livraison et documentation',exact:true})).toHaveCount(0);
  await expect(page.getByText(/Aucune modification de code/)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.locator('[data-workflow-route=global]').click();await page.getByRole('button',{name:'Modèles',exact:true}).click();await expect(page.locator('.template-card').first()).toBeVisible();await note('modeles');
  await page.locator('.template-card').filter({has:page.getByRole('heading',{name:'Clôture de réunion',exact:true})}).getByRole('button',{name:'Personnaliser une copie…',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await note('personnaliser');
  await page.getByLabel('Nom de votre modèle',{exact:true}).fill('Synthèse hebdomadaire discovery B2B');await page.getByRole('button',{name:'Créer la copie et l’ouvrir',exact:true}).click();await expect(page.getByRole('heading',{name:'Synthèse hebdomadaire discovery B2B',exact:true})).toBeVisible();await note('editeur-modele');
  await page.getByRole('button',{name:'Analyser les réunions sélectionnées · Tâche IA',exact:true}).click();await note('analyse-modele');
  await page.getByLabel('Consigne',{exact:true}).fill('Analyser les entretiens de discovery B2B de la semaine. Distinguer faits clients, hypothèses et décisions. Regrouper les besoins par segment, citer les sources et proposer trois priorités produit. Ne pas inventer de validation client.');
  await page.getByLabel('Critères d’acceptation (un par ligne)',{exact:true}).fill('Chaque priorité cite au moins un entretien source.\nLes hypothèses restent distinguées des demandes exprimées.');
  await page.getByRole('button',{name:'Appliquer au bloc',exact:true}).click();
  await page.getByRole('button',{name:'Ajouter un résultat attendu',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await note('ajout-resultat');
  await page.getByRole('dialog').getByRole('textbox').fill('Priorités produit');await page.getByRole('button',{name:'Ajouter la donnée',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await note('nom-metier-accepte');
  await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
  await expect(page.getByRole('button',{name:'Enregistrer',exact:true})).toBeDisabled();await expect(page.getByRole('alert')).toHaveCount(0);await note('modele-enregistre-sans-contournement');
  await page.getByRole('button',{name:'Fermer les propriétés',exact:true}).click();await page.setViewportSize({width:1024,height:768});
  await page.getByRole('button',{name:'Terminal',exact:true}).first().click();await note('terminal-compact');
  await page.getByRole('button',{name:'Analyser les réunions sélectionnées · Tâche IA',exact:true}).click();await expect(page.getByLabel('Consigne',{exact:true})).toBeVisible();await note('proprietes-compactes');
  await page.getByRole('button',{name:'Retour au graphe',exact:true}).click();await page.getByRole('button',{name:'Terminal',exact:true}).first().click();await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('button',{name:'← Retour à la liste',exact:true}).click();await expect(page.getByRole('heading',{name:'Modèles de workflows',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Synthèse hebdomadaire discovery B2B',exact:true})).toBeVisible();await note('modele-retrouve');
  await page.locator('.template-card').filter({has:page.getByRole('heading',{name:'Clôture de réunion',exact:true})}).getByRole('button',{name:'Utiliser',exact:true}).click();await expect(page.getByRole('heading',{name:'Nouvelle demande',exact:true})).toBeVisible();await note('utiliser-reunion');
  await page.getByLabel('Projet principal',{exact:true}).selectOption({label:'Portail clients B2B'});await page.getByRole('button',{name:'Continuer',exact:true}).click();
  await expect(page.getByLabel('Réunions ou période à analyser',{exact:true})).toBeVisible();await expect(page.getByLabel('Notes, transcriptions ou liens des réunions',{exact:true})).toBeVisible();
  await page.getByLabel('Réunions ou période à analyser',{exact:true}).fill('Entretiens clients du lundi et du jeudi, semaine du 5 octobre.');await page.getByLabel('Notes, transcriptions ou liens des réunions',{exact:true}).fill('Lundi : client Alpha demande export CSV. Jeudi : client Beta confirme le besoin et demande des droits par équipe. Sources synthétiques du test.');await note('sources-reunions');

 } catch(error) {await note('interruption');throw error;} finally {await page.context().tracing.stop({path:path.join(__dirname,'trace-b.zip')});await app.close();}
});
