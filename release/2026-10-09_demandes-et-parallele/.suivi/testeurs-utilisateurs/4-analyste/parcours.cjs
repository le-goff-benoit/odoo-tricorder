'use strict';
// Reconstitution exécutable des gestes observés en session Playwright persistante.
// Ce fichier n'a pas été relancé après la recette ; les captures et TXT sont les preuves du run observé.
// Pour un nouvel essai, fournir un répertoire de sortie VIDE et un display explicitement libéré.
const fs = require('node:fs');
const path = require('node:path');
const {prepare, launch} = require('../harness.cjs');
const pkg = require('../paquet.json');
const repo = '/home/blegoff/odoo-tricorder';
async function main() {
  const output = process.argv[2];
  if (!output || !path.isAbsolute(output) || fs.existsSync(output)) throw Error('Nouveau dossier absolu inexistant requis');
  const manifest = prepare({id:'analyste', output, display:182});
  const b = await launch(manifest, {
    executable:repo+'/build-artifacts/linux-unpacked/odoo-tricorder', executableSha256:pkg.executable_sha256,
    asar:repo+'/build-artifacts/linux-unpacked/resources/app.asar', asarSha256:pkg.asar_sha256, displayReleased:true
  });
  const p=b.page;
  const button = name => p.getByRole('button',{name,exact:true});
  const text = name => p.getByText(name,{exact:true});
  const terminal = () => p.locator('button[title="Afficher ou masquer le terminal sans fermer les sessions"]').click();
  async function datum(side,name) {
    await button('Ajouter une '+side).click();
    await p.getByPlaceholder('criticite').fill(name);
    await button('Ajouter la donnée').click();
  }
  async function block(kind,title,prompt) {
    await button('+ Ajouter un bloc').click();
    await p.locator('#add-kind').selectOption(kind);
    await p.locator('#add-title').fill(title);
    await button('Ajouter au workflow').click();
    if(prompt) await p.locator('#node-prompt').fill(prompt);
  }
  async function edge(from,outcome,to,outputKey) {
    await button('Relier').click();
    await p.locator('#edge-from').selectOption({label:from});
    await p.locator('#edge-outcome').selectOption({label:outcome});
    await p.locator('#edge-to').selectOption({label:to});
    if(outputKey) {
      await p.locator('select[name="output"]').selectOption(outputKey);
      await p.locator('select[name="input"]').selectOption(outputKey);
    } else await p.locator('input[name="order_only"]').check();
    await button('Créer le lien').click();
  }
  async function save() {
    await button('Enregistrer').click();
    await p.getByText(/Révision \d+ · Enregistré/).waitFor();
  }
  async function receive(criteria,note) {
    if(await button('Examiner le résultat').count()) await button('Examiner le résultat').click();
    for(let i=0;i<criteria;i++) await p.locator('input[name="criterion"]').nth(i).check();
    await p.locator('#receipt-note').fill(note);
    await button('Valider le résultat').click();
  }
  async function sample(priority,qualification) {
    await button('Qualifier la demande · Tâche').click();
    await button('Données de simulation…').click();
    await p.locator('[data-sample-custom]').nth(0).check();
    await p.locator('#sample-0').fill(priority);
    await p.locator('[data-sample-custom]').nth(1).check();
    await p.locator('#sample-1').fill(qualification);
    await button('Appliquer les données de simulation').click();
  }
  try {
    await button('+ Créer un workflow').waitFor();
    await terminal(); await button('Ouvrir un terminal').click();
    await p.locator('textarea').waitFor(); await p.locator('textarea').focus();
    await p.keyboard.type('command -v codex; codex --version; command -v claude; claude --version');
    await p.keyboard.press('Enter');
    await p.getByText('claude 0.0.0 TRICORDER-PANEL-INERT',{exact:true}).waitFor();
    const pre=await b.visibleText();
    if(!pre.includes(manifest.dirs.stubs+'/codex') || !pre.includes(manifest.dirs.stubs+'/claude')) throw Error('CLI non inerte');
    fs.writeFileSync(output+'/precontrole-gui.txt',pre); await b.capture('01-precontrole');
    await terminal(); await button('+ Créer un workflow').click();
    await p.locator('#work-title').fill('Qualification des demandes fictives');
    await button('Créer et ouvrir le workflow').click();
    await button('Première étape · Tâche').click();
    await p.locator('#node-title').fill('Qualifier la demande');
    await p.locator('#node-prompt').fill('Lire la demande fictive, identifier le besoin et produire une qualification ainsi qu’une priorité normale ou urgente.');
    await p.locator('#node-criteria').fill('Besoin explicite\nPriorité justifiée');
    await datum('entrée','demande'); await datum('sortie','priorite'); await datum('sortie','qualification');
    await button('Appliquer au bloc').click(); await b.capture('02-donnees');
    await block('condition','Priorité urgente ?');
    await p.locator('#node-parameter').fill('priorite'); await p.locator('#node-options').fill('normale\nurgente');
    await datum('entrée','priorite'); await button('Appliquer au bloc').click();
    await block('task','Préparer la réponse normale','Préparer une réponse fictive avec un délai de cinq jours.');
    await button('Appliquer au bloc').click();
    await block('task','Préparer la réponse urgente','Préparer une réponse fictive avec un délai d’une heure.');
    await button('Appliquer au bloc').click();
    await edge('Qualifier la demande','Travail terminé','Priorité urgente ?','priorite');
    await edge('Priorité urgente ?','normale','Préparer la réponse normale');
    await edge('Priorité urgente ?','urgente','Préparer la réponse normale'); // Détour volontaire.
    await save();
    await button('Préparer la réponse normale · Tâche').click();
    await text('Liens entre les blocs').click();
    await button('Retirer').nth(1).click(); await button('Supprimer le lien').click();
    await edge('Priorité urgente ?','urgente','Préparer la réponse urgente'); await save();
    await sample('normale','Demande fictive : tableau de suivi, sans urgence.'); await save();
    await button('Fermer les propriétés').click(); await button('Ajuster').click(); await b.capture('03-graphe-corrige');
    await button('Exécuter…').click(); await p.locator('#initial-request').fill('Demande fictive : créer un tableau de suivi des demandes. Priorité normale.');
    await button('Simuler le parcours').click();
    await receive(2,'Données fictives vérifiées : priorité normale et besoin explicite, réception de simulation uniquement.');
    await p.getByText('3 / 4 étapes',{exact:true}).waitFor();
    await terminal(); await button('Graphe').click(); await b.capture('04-branche-normale');
    fs.writeFileSync(output+'/branche-normale.txt',await b.visibleText());
    await receive(0,'Réception du résultat simulé normal, sans travail métier réel.');
    await p.getByText('4 / 4 étapes',{exact:true}).waitFor();
    await text('Options').click(); await button('Revenir à l’éditeur').click();
    await sample('urgente','Demande fictive : interruption du tableau de suivi, priorité urgente.'); await save();
    await button('Exécuter…').click(); await p.locator('#initial-request').fill('Demande fictive urgente : rétablir le tableau de suivi.');
    await button('Simuler le parcours').click();
    await receive(2,'Qualification fictive urgente vérifiée, essai de simulation uniquement.');
    await p.getByText('3 / 4 étapes',{exact:true}).waitFor();
    await terminal(); await button('Graphe').click(); await b.capture('05-branche-urgente');
    fs.writeFileSync(output+'/branche-urgente.txt',await b.visibleText());
    await receive(0,'Réception du résultat urgent simulé, aucune réponse réelle produite.');
    await p.getByText('4 / 4 étapes',{exact:true}).waitFor();
    await text('Options').click(); await button('Revenir à l’éditeur').click();
    await text('Options').first().click(); await button('Réutiliser…').click();
    await p.locator('#reuse-title').fill('Méthode de qualification fictive'); await button('Créer la copie').click();
    await p.getByText('Méthode de qualification fictive',{exact:true}).waitFor();
    await button('Projets').click(); await button('+ Nouveau projet').click();
    await p.locator('#new-project-title').fill('Atelier fictif B'); await button('Créer le projet').click();
    await button('Créer un workflow').click(); await p.locator('#work-template').selectOption({label:'Méthode de qualification fictive'});
    await p.locator('#work-title').fill('Qualification atelier B'); await p.locator('#work-project').selectOption({label:'Atelier fictif B'});
    await button('Créer et ouvrir le workflow').click(); await button('Ajuster').click(); await b.capture('06-reutilisation');
    fs.writeFileSync(output+'/reutilisation.txt',await b.visibleText());
    await button('Qualifier la demande · Tâche').click(); await button('Données de simulation…').click();
    await b.capture('07-essai-herite'); fs.writeFileSync(output+'/essai-herite.txt',await b.visibleText());
    await button('Fermer la fenêtre').click(); await text('Historique').click();
    fs.writeFileSync(output+'/historique-copie.txt',await b.visibleText());
  } finally { await b.cleanup(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
