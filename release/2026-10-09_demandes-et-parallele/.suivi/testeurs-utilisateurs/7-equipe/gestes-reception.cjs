'use strict';
// Conservation des gestes de la session du 09/10. Non relancé après réception.
// Le pilote interactif parcours.cjs a exécuté ces mêmes contrôles GUI par étapes.
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
module.exports=async function gestes(b,m,output){
 const p=b.page;
 const waitText=async s=>p.getByText(s,{exact:true}).first().waitFor({state:'visible'});
 const click=async name=>p.getByRole('button',{name,exact:true}).first().click();
 const terminal=async()=>p.getByRole('button',{name:/^Terminal/}).first().click();
 await click('Terminal'); await click('Ouvrir un terminal');
 await p.locator('.xterm-helper-textarea').focus();
 await p.keyboard.type('command -v codex; codex --version; command -v claude; claude --version');
 await p.keyboard.press('Enter');
 // La sortie a été lue et capturée avant tout lancement : deux stubs TRICORDER-PANEL-INERT.
 await terminal();await click('+ Nouveau projet');
 await p.getByLabel('Nom du projet').fill('Équipe opérations fictive');
 await click('Créer le projet');await waitText('Reprendre le travail');
 await click('Nouvelle demande');await click('Enregistrer et continuer');
 await p.locator('#initial-request').fill('Préparer le comité équipe : formulaire congés urgent, export statistiques à vérifier, bilan hebdomadaire à lire.');
 await click('Lancer dans le terminal');
 // Fixture collègues : commandes moteur du paquet, aucun accès SQL ni écriture JSON d'état.
 const backend='/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/resources/backend';
 const state=m.dirs.state+'/workflows';
 const listing=spawnSync('/usr/bin/python3',['-c',`import sys,json;sys.path.insert(0,${JSON.stringify(backend)});from workflow_engine import Engine;from workflow_engine.conversations import Conversations;print(json.dumps(Conversations(Engine(${JSON.stringify(state)})).list()))`],{env:m.env,encoding:'utf8'});
 const cid=JSON.parse(listing.stdout)[0].id;
 function cli(action,payload={}){
  const r=spawnSync('/usr/bin/python3',[backend+'/workflow_cli.py','--state',state,'--conversation',cid,action],{env:m.env,encoding:'utf8',input:JSON.stringify(payload)});
  const v=JSON.parse(r.stdout);if(!v.ok)throw Error(v.error);return v.result;
 }
 function submit(item,node,result){const c=cli('claim',{run:item.run,node});return cli('result',{run:item.run,node,token:c.token,result});}
 const a=cli('add',{request:'URGENT — formulaire congés : décision sur le périmètre avant le comité de 09h',key:'urgent-conges'});
 const d=cli('add',{request:'Export statistiques équipe : tentative échouée, reprise demandée',key:'export'});
 const f=cli('add',{request:'Bilan hebdomadaire équipe : résultat final à examiner',key:'bilan'});
 for(const item of[a,d,f])submit(item,'clarify',{ok:true,summary:'Cadrage fictif effectué par un collègue',outputs:{brief:item.request}});
 submit(a,'work',{ok:true,summary:'Proposition formulaire congés prête pour décision',outputs:{result:'Décision demandée : limiter le formulaire aux congés annuels. Exclure les absences maladie et les données médicales. Livraison proposée vendredi à 16h. Coût estimé : 2 heures. Aucun envoi externe autorisé.'}});
 submit(d,'work',{ok:false,summary:'Export arrêté : fichier source absent. Fournir le relevé hebdomadaire avant de reprendre.',outputs:{result:''}});
 submit(f,'work',{ok:true,summary:'Bilan hebdomadaire préparé par un collègue fictif',outputs:{result:'Bilan semaine : 12 demandes reçues, 9 closes, 3 à traiter. Le formulaire congés nécessite une décision avant 09h. Export statistiques suspendu : source manquante. Limite : données entièrement fictives.'}});
 await click('Activité');await waitText('À traiter');
 await p.getByRole('button',{name:/^URGENT — formulaire/}).click();
 await click('Examiner la décision');await waitText('Votre décision est attendue');
 await p.locator('#decision-note').fill('Accord limité aux congés annuels, livraison vendredi 16h, sans envoi externe.');
 await click('Approuver la suite');
 await click('Activité');await waitText('À traiter');
 // Vérification GUI : urgent terminé, bilan encore en décision, export encore en échec.
 await p.getByRole('button',{name:/^Export statistiques/}).click();
 await click('Préparer la reprise');
 await p.locator('#retry-note').fill('Le collègue doit utiliser le relevé hebdomadaire fictif puis fournir le total et signaler les lignes manquantes.');
 await click('Préparer cette étape pour reprise');
 await click('Reprendre l’agent…');await click('Reprendre dans ce terminal');
 // Seconde fixture collègue après la préparation GUI ; le stub ne réalise aucun travail IA.
 submit(d,'work',{ok:true,summary:'Deuxième tentative fictive : relevé traité, export prêt',outputs:{result:'Export final fictif : 12 demandes, 9 clôturées, 3 ouvertes. Aucune ligne manquante. Relevé hebdomadaire fourni pour la reprise. Aucune connexion ni publication.'}});
 await waitText('Tentatives précédentes · 1');await terminal();
 await p.getByText('Tentatives précédentes · 1',{exact:true}).scrollIntoViewIfNeeded();
 await click('Examiner la décision');
 await p.locator('#decision-note').fill('Résultat fictif lu : totaux cohérents avec le relevé fourni.');
 await click('Approuver la suite');await click('Activité');await waitText('À traiter');
 await p.getByRole('button',{name:/^Bilan hebdomadaire/}).click();
 // Le détail de décision déjà sélectionné est conservé entre demandes. Lecture seule du bilan.
 await waitText('Votre décision est attendue');await terminal();
 // La vraie session conserve 8 captures, etat-final-lu.json, fixtures-journal.jsonl et cleanup.json.
};
