const { _electron: electron }=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs=require('fs');const os=require('os');const path=require('path');const readline=require('readline');
const base=fs.mkdtempSync('/tmp/tricorder-operations-cold-'); fs.mkdirSync(base+'/bin');for(const b of ['codex','claude'])fs.writeFileSync(base+'/bin/'+b,'#!/bin/sh\nexit 78\n',{mode:0o755});
const out='/home/blegoff/odoo-tricorder/release/2026-10-10_methodes-reutilisables/.suivi/baseline/03-operations';
const env={...process.env,PATH:base+'/bin:'+process.env.PATH};for(const k of ['HOME','XDG_CONFIG_HOME','XDG_DATA_HOME','XDG_CACHE_HOME','TRICORDER_HOME','TRICORDER_STATE_DIR','TRICORDER_WORKFLOW_STATE_DIR','TRICORDER_RUNTIME_DIR','TRICORDER_AGENTS_DIR','CODEX_HOME','CLAUDE_CONFIG_DIR']) {env[k]=base+'/'+k.toLowerCase();fs.mkdirSync(env[k],{recursive:true});}env.ELECTRON_DISABLE_SANDBOX='1';
fs.mkdirSync(base+'/commandes');fs.writeFileSync(base+'/commandes/commandes.csv','commande,client,montant,statut\nC-1001,Atelier Lac,1200,validée\nC-1002,Nord Service,900,en attente\nC-1003,Atelier Lac,-450,validée\nC-1004,Rivage,3200,validée\n');
(async()=>{
 const app=await electron.launch({executablePath:'/home/blegoff/.local/opt/odoo-tricorder-0.6.0-rc.17/odoo-tricorder',args:['--no-sandbox'],env});
 const page=await app.firstWindow();page.setDefaultTimeout(8000);
 const shot=async name=>{await page.waitForTimeout(500);await page.screenshot({path:out+'/replay-'+name+'.png',fullPage:true});};
 try {
 await page.getByRole('button',{name:'Workflows',exact:true}).click();await shot('workflows');
 await page.getByRole('button',{name:'Modèles',exact:true}).click();await shot('modeles');
 await page.getByRole('button',{name:'+ Créer un modèle',exact:true}).click();await shot('creation');
 await page.getByLabel('Nom du workflow',{exact:true}).fill('Contrôle hebdomadaire des commandes');
 await page.getByRole('button',{name:'Créer et ouvrir le workflow',exact:true}).click();
 await page.getByRole('button',{name:/Première étape/}).click();await shot('proprietes');
 await page.getByLabel('Nom du bloc',{exact:true}).fill('Analyser les commandes de la semaine');
 await page.getByLabel('Consigne',{exact:true}).fill('À partir du fichier CSV de commandes que je fournirai à chaque lancement, produire une synthèse des montants et statuts. Signaler les montants négatifs et me demander une décision sur chaque anomalie avant de finaliser la synthèse.');
 await page.getByLabel('Critères d’acceptation (un par ligne)',{exact:true}).fill('Toutes les commandes du fichier sont incluses.\nLes anomalies sont identifiées sans inventer de données.\nLa synthèse finale tient en une page.');
 await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
 await page.getByRole('button',{name:'Exécuter…',exact:true}).click();await shot('lancement');
 await page.getByLabel('Titre court (facultatif)',{exact:true}).fill('Commandes semaine 41');
 await page.getByLabel('Quelle demande souhaitez-vous traiter ?',{exact:true}).fill('Contrôle des commandes semaine 41. Fichier : '+base+'/commandes/commandes.csv. Contenu : commande,client,montant,statut ; C-1001,Atelier Lac,1200,validée ; C-1002,Nord Service,900,en attente ; C-1003,Atelier Lac,-450,validée ; C-1004,Rivage,3200,validée. Préparer la synthèse et me demander comment traiter le montant négatif.');
 await page.getByRole('button',{name:'Lancer dans le terminal',exact:true}).click();await page.waitForTimeout(2000);await shot('agent-inerte');
 await page.getByRole('button',{name:'Planifications',exact:true}).click();await shot('planifications');
 await page.getByRole('button',{name:/^Terminal/}).first().click();
 await page.getByRole('button',{name:'Workflows',exact:true}).click();await page.getByRole('button',{name:'Modèles',exact:true}).click();
 await page.getByPlaceholder('Rechercher un modèle…',{exact:true}).fill('Contrôle hebdomadaire');await shot('retrouver-modele');
 console.log(JSON.stringify({base,limite:'Fournisseurs inertes, aucune qualification du résultat ou de la décision métier.'}));
 } finally {await app.close();}
})();
