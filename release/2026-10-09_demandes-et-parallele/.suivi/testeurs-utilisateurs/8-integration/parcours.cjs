'use strict';
// Reconstitution des gestes effectués dans Node REPL / Playwright Electron.
// Aucun code produit lu ; aucune écriture d'état hors commandes de la GUI.
// Ce fichier n'a pas été rejoué après la réception indépendante.
// Les dialogues natifs sont propres à DISPLAY181 / GTK et leurs boutons sont
// pilotés par coordonnées de fenêtre observées (1124 x 822).
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const {prepare, launch} = require('../harness.cjs');
const output = __dirname;
const repo = '/home/blegoff/odoo-tricorder';
const frozen = JSON.parse(fs.readFileSync(path.join(output, '../paquet.json')));
const candidate = {
  executable: path.join(repo, 'build-artifacts/linux-unpacked/odoo-tricorder'),
  executableSha256: frozen.executable_sha256,
  asar: path.join(repo, 'build-artifacts/linux-unpacked/resources/app.asar'),
  asarSha256: frozen.asar_sha256,
  displayReleased: true,
};
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function run() {
  const manifest = prepare({id: '8-integration', output, display: 181});
  let bench = await launch(manifest, candidate);
  let page = bench.page;
  const pids = [bench.app.process().pid];
  const errors = [];
  const button = name => page.getByRole('button', {name, exact: true});
  const waitText = async text => page.getByText(text, {exact: false}).first().waitFor();
  const saveText = async file => fs.writeFileSync(path.join(output, file), await bench.visibleText());
  const xd = args => {
    const result = cp.spawnSync('/usr/bin/xdotool', args, {env: manifest.env, encoding: 'utf8'});
    if (result.status !== 0) throw Error(result.stderr || 'xdotool a échoué');
    return result.stdout.trim();
  };
  const nativeWindow = title => xd(['search', '--onlyvisible', '--name', title]).split('\n')[0];
  const nativeCapture = async name => {
    const base64 = await bench.app.evaluate(async ({desktopCapturer}) =>
      (await desktopCapturer.getSources({types: ['screen'], thumbnailSize: {width: 1920, height: 1080}}))[0]
        .thumbnail.toPNG().toString('base64'));
    fs.mkdirSync(path.join(output, 'captures'), {recursive: true});
    fs.writeFileSync(path.join(output, 'captures', `8-integration-${name}.png`), Buffer.from(base64, 'base64'));
  };
  try {
    await waitText('Votre premier projet commence ici');
    await page.getByRole('button', {name: /^Terminal/}).first().click();
    await button('Ouvrir un terminal').click();
    await page.getByLabel('Terminal input').waitFor();
    await page.getByLabel('Terminal input').fill('command -v codex; codex --version; command -v claude; claude --version');
    await page.getByLabel('Terminal input').press('Enter');
    await page.waitForFunction(() => document.body.innerText.split('TRICORDER-PANEL-INERT').length >= 3);
    const preflight = await bench.visibleText();
    if (!preflight.includes(manifest.dirs.stubs + '/codex') || !preflight.includes(manifest.dirs.stubs + '/claude')) {
      throw Error('Précontrôle GUI des chemins inertes refusé');
    }
    await bench.capture('01-precontrole');
    await saveText('observations.txt');
    await page.getByRole('button', {name: /^Terminal/}).first().click();
    await button('+ Nouveau projet').click();
    await page.getByLabel('Nom du projet', {exact: true}).fill('Equipe Alpha — méthode transfert');
    await button('Créer le projet').click();
    await button('Créer un workflow').waitFor();
    await button('Créer un workflow').click();
    await page.getByLabel('Nom du workflow', {exact: true}).fill('Transmission méthode Alpha');
    await button('Créer et ouvrir le workflow').click();
    await button('Première étape · Tâche').click();
    await page.getByLabel('Nom du bloc', {exact: true}).fill('Documenter les règles de transfert Alpha');
    await page.getByLabel('Consigne', {exact: true}).fill('Préparer un guide de passage entre équipes fictives : contexte, étapes et critères vérifiables.');
    await page.getByLabel('Critères d’acceptation (un par ligne)', {exact: true}).fill('Le guide identifie le dépôt cible\nLes étapes sont vérifiables par la seconde équipe');
    await button('Appliquer au bloc').click();
    await button('Enregistrer').click();
    await waitText('Révision 2 · Enregistré');
    await page.getByText('Options', {exact: true}).first().click();
    await page.getByText('Réutiliser…', {exact: true}).click();
    await page.getByLabel('Nom de la copie', {exact: true}).fill('Méthode intégration — modèle partagé');
    await page.getByLabel('Destination', {exact: true}).selectOption({label: 'Modèles de workflows'});
    await bench.capture('02-modele-transfert');
    await button('Créer la copie').click();
    await waitText('MODÈLES / WORKFLOW');
    await button('Projets').click();

    const beta = path.join(manifest.temporary, 'depot-beta-fictif');
    fs.mkdirSync(beta);
    const git = cp.spawnSync('/usr/bin/git', ['init', beta], {env: manifest.env, encoding: 'utf8'});
    if (git.status !== 0) throw Error('Initialisation dépôt synthétique refusée');
    fs.writeFileSync(path.join(beta, 'README.md'), 'Dépôt synthétique Beta pour réception intégration.\n');
    await button('+ Nouveau projet').click();
    await page.getByLabel('Nom du projet', {exact: true}).fill('Equipe Beta — dépôt existant');
    await page.getByLabel('Emplacement', {exact: true}).selectOption({label: 'Dépôt Git existant'});
    const stderr = [], consoleEvents = [];
    bench.app.process().stderr.on('data', b => stderr.push(b.toString()));
    page.on('console', m => consoleEvents.push({type: m.type(), text: m.text()}));
    for (let attempt = 0; attempt < 2; attempt++) {
      await button('Choisir…').click();
      const win = nativeWindow('Choisir le dossier du projet');
      if (attempt === 0) await nativeCapture('03-selecteur-natif');
      xd(['windowfocus', win, 'key', 'ctrl+l']);
      xd(['type', '--clearmodifiers', beta]);
      if (attempt === 1) await nativeCapture('04-selecteur-chemin');
      xd(['key', 'Return']);
      // Réception d'origine : fermé, Racine restée vide. Aucun bouton Open.
      await page.waitForTimeout(300);
    }
    await bench.capture('05-retour-selecteur-vide');
    await saveText('incident-retour-selecteur.txt');
    fs.writeFileSync(path.join(output, 'incident-selecteur.json'), JSON.stringify({
      gestes: ['Choisir', 'Ctrl+L', 'chemin Beta', 'Return ; Open non activé'],
      selectedPath: beta, fieldAfter: await page.getByPlaceholder('Choisir un dépôt Git existant').inputValue(),
      stderr, consoleEvents, cause: 'indéterminée',
    }, null, 2));
    // Unique substitution déclarée : retour du sélecteur vers le chemin fictif.
    await bench.app.evaluate(({dialog}, fakePath) => {
      globalThis.__panel8OriginalDialog = dialog.showOpenDialog;
      dialog.showOpenDialog = async () => ({canceled: false, filePaths: [fakePath]});
    }, beta);
    await button('Choisir…').click();
    await page.getByPlaceholder('Choisir un dépôt Git existant').evaluate((e, expected) => {
      if (e.value !== expected) throw Error('Chemin substitué non reçu');
    }, beta);
    await bench.app.evaluate(({dialog}) => {
      dialog.showOpenDialog = globalThis.__panel8OriginalDialog;
      delete globalThis.__panel8OriginalDialog;
    });
    await button('Créer le projet').click();
    await button('Workflows').click();
    await button('Ouvrir le workflow').click();
    await page.getByText('Options', {exact: true}).first().click();
    await page.getByText('Exporter…', {exact: true}).click();
    const exportWin = nativeWindow('Exporter le workflow');
    const portable = path.join(manifest.temporary, 'transmission-alpha.tricorder-workflow');
    xd(['windowfocus', exportWin, 'key', 'ctrl+l']);
    xd(['key', 'ctrl+a']);
    xd(['type', '--clearmodifiers', portable]);
    xd(['key', 'Escape']); // ferme les propositions, conserve le nom saisi
    xd(['mousemove', '--window', exportWin, '1075', '800', 'click', '1']); // Save observé
    await waitText('Workflow exporté');
    if (!fs.existsSync(portable)) throw Error('Fichier portable absent');
    fs.copyFileSync(portable, path.join(output, 'transmission-alpha.tricorder-workflow'));
    await button('Equipe Beta — dépôt existant').click();
    await button('Projets').click();
    await button('Importer un workflow').click();
    const importWin = nativeWindow('Importer un workflow');
    xd(['windowfocus', importWin, 'key', 'ctrl+l']);
    xd(['type', '--clearmodifiers', portable]);
    xd(['mousemove', '--window', importWin, '1075', '800', 'click', '1']); // Open observé
    await page.getByLabel('Destination', {exact: true}).selectOption({label: 'Equipe Beta — dépôt existant'});
    await bench.capture('07-import-beta');
    await saveText('import-preview.txt');
    await button('Importer le brouillon').click();
    await button('Documenter les règles de transfert Alpha · Tâche').click();
    await page.getByLabel('Nom du bloc', {exact: true}).fill('Adaptation Beta — contrôle dépôt cible');
    await page.getByLabel('Consigne', {exact: true}).fill('Contrôler le dépôt fictif Beta et remettre le guide adapté à cette équipe.');
    await button('Appliquer au bloc').click();
    await button('Enregistrer').click();
    await waitText('Révision 2 · Enregistré');
    await button('Paramètres du workflow').click();
    await page.getByLabel('Nom', {exact: true}).fill('Transmission méthode Beta adaptée');
    await button('Appliquer').click();
    await button('Enregistrer').click();
    await waitText('Révision 3 · Enregistré');
    await bench.capture('06-beta-adaptation');
    await saveText('beta-avant-fermeture.txt');
    errors.push(...bench.errors);
    await bench.cleanup();
    bench = await launch({...manifest, guiStarted: false}, candidate);
    page = bench.page;
    pids.push(bench.app.process().pid);
    await waitText('0 demandes enregistrées');
    await button('Equipe Beta — dépôt existant').click();
    await button('Ouvrir le workflow').click();
    await button('Adaptation Beta — contrôle dépôt cible · Tâche').click();
    await waitText('Révision 3 · Enregistré');
    await saveText('beta-apres-reouverture.txt');
    await button('Equipe Alpha — méthode transfert').click();
    await button('Ouvrir le workflow').click();
    await button('Documenter les règles de transfert Alpha · Tâche').click();
    await saveText('alpha-independant.txt');
    const alpha = await page.locator('#node-title,#node-prompt,#node-criteria').evaluateAll(es => es.map(e => ({id: e.id, value: e.value})));
    await button('Workflows').click();
    await button('Modèles').click();
    await button('Modifier le modèle').click();
    await button('Documenter les règles de transfert Alpha · Tâche').click();
    await saveText('modele-independant.txt');
    const model = await page.locator('#node-title,#node-prompt,#node-criteria').evaluateAll(es => es.map(e => ({id: e.id, value: e.value})));
    if (JSON.stringify(alpha) !== JSON.stringify(model)) throw Error('Source et modèle divergent après modification de la copie');
    await button('Equipe Beta — dépôt existant').click();
    await button('Créer un workflow').click();
    await page.getByLabel('Modèle de workflow', {exact: true}).selectOption({label: 'Méthode intégration — modèle partagé'});
    await page.getByLabel('Nom du workflow', {exact: true}).fill('Beta — deuxième workflow issu du modèle');
    await button('Créer et ouvrir le workflow').click();
    await button('Documenter les règles de transfert Alpha · Tâche').click();
    await saveText('reemploi-modele.txt');
    const reuse = await page.locator('#node-title,#node-prompt,#node-criteria').evaluateAll(es => es.map(e => ({id: e.id, value: e.value})));
    if (JSON.stringify(alpha) !== JSON.stringify(reuse)) throw Error('Le modèle ne reprend pas la méthode initiale');
    await button('Equipe Beta — dépôt existant').click();
    await waitText('Beta — deuxième workflow issu du modèle');
    await bench.capture('08-reprise-et-modele-beta');
    await saveText('reprise-projet-beta.txt');
    if (bench.app.windows().length !== 1) throw Error('Plusieurs fenêtres applicatives');
  } finally {
    errors.push(...bench.errors);
    await bench.cleanup();
    const hashes = {executable: sha(candidate.executable), asar: sha(candidate.asar)};
    const remaining = cp.spawnSync('/usr/bin/ps', ['-eo', 'pid,ppid,args'], {encoding: 'utf8'}).stdout
      .split('\n').filter(line => line.includes(manifest.temporary));
    fs.writeFileSync(path.join(output, 'cleanup-script.json'), JSON.stringify({
      cleanupCalled: true, pidsExited: pids.map(pid => ({pid, exited: !fs.existsSync('/proc/' + pid)})),
      hashes, hashesMatch: hashes.executable === candidate.executableSha256 && hashes.asar === candidate.asarSha256,
      remainingScopedProcesses: remaining, pageerrors: errors,
    }, null, 2));
  }
}
run().catch(e => { console.error(e); process.exitCode = 1; });
