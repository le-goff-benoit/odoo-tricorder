const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), { spawnSync } = require('node:child_process');
const { cleanupBroker } = require('./terminal-fixture.cjs');
const root = path.resolve(__dirname, '..');
let directory, app, page, project, workflow;
const call = (action, data = {}) => page.evaluate(payload => window.studio.request(payload), { action, ...data });
const snapshot = () => call('workflow.get', { project: project.id, workflow });
const shot = name => page.screenshot({ path: test.info().outputPath(name + '.png') });
function engine(command, data) {
  const code = `import json,sys\nsys.path.insert(0,sys.argv[1])\nfrom workflow_engine import Engine\ne=Engine(sys.argv[2]);p=json.load(sys.stdin)\n${command}\n`;
  const r = spawnSync('python3', ['-c', code, path.join(root, 'backend'), path.join(directory, 'workflows')], { input: JSON.stringify(data), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
}
async function create(template, title) {
  await page.locator('[data-workflow-route=global]').click();
  await page.locator('summary').filter({ hasText: 'Gestion des workflows' }).click();
  await page.locator('[data-action=workflow-hub][data-tab=registered]').click();
  await page.getByRole('button', { name: 'Créer un workflow', exact: true }).click();
  await page.getByLabel('Modèle de workflow', { exact: true }).selectOption(template);
  await page.getByLabel('Nom du workflow', { exact: true }).fill(title);
  await page.getByLabel('Enregistrer dans', { exact: true }).selectOption(project.id);
  await page.getByRole('button', { name: 'Créer et ouvrir le workflow', exact: true }).click();
  await expect(page.locator('.workflow-heading h1')).toHaveText(title);
  workflow = (await call('workflow.list', { project: project.id })).items.find(g => g.title === title).id;
}
async function openRun(id) {
  await page.locator('[data-workflow-route=projects]').click();
  await page.locator('.project-card').filter({ hasText: project.title }).click();
  await page.locator(`[data-action=open-run][data-id="${id}"]`).click();
}
async function rename(id, title) {
  await page.locator(`.node[data-id=${id}]`).click();
  await page.getByLabel('Nom du bloc', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Appliquer au bloc', exact: true }).click();
}
test.beforeEach(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-panel-meeting-'));
  const bin = path.join(directory, 'bin'); fs.mkdirSync(bin);
  for (const name of ['codex', 'claude']) fs.writeFileSync(path.join(bin, name), '#!/bin/sh\nprintf "MEETING_PANEL_INERT\\n"\nexit 78\n', { mode: 0o755 });
  app = await electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE, args: process.env.TRICORDER_EXECUTABLE ? [] : [root], env: {
    PATH: bin + ':/usr/bin:/bin', HOME: directory, DISPLAY: process.env.DISPLAY, XAUTHORITY: process.env.XAUTHORITY, LANG: 'C.UTF-8',
    XDG_CONFIG_HOME: path.join(directory, 'config'), XDG_CACHE_HOME: path.join(directory, 'cache'), XDG_DATA_HOME: path.join(directory, 'data'),
    CODEX_HOME: path.join(directory, 'codex'), CLAUDE_CONFIG_DIR: path.join(directory, 'claude'), TRICORDER_HOME: directory,
    TRICORDER_STATE_DIR: directory, TRICORDER_RUNTIME_DIR: path.join(directory, 'runtime'), TRICORDER_AGENTS_DIR: path.join(directory, 'no-pack'), TRICORDER_TEST_MODE: '1', PYTHONDONTWRITEBYTECODE: '1'
  } });
  page = await app.firstWindow(); await page.evaluate(() => localStorage.setItem('tricorder-editor-detail','yes')); await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole('heading', { name: 'Un workflow clair.' })).toBeVisible();
  await page.locator('[data-action=terminal-toggle]').click();
  await page.getByRole('button', { name: 'Ouvrir un terminal', exact: true }).click();
  await page.locator('.xterm-helper-textarea:visible').focus();
  await page.keyboard.type('codex --version; claude --version'); await page.keyboard.press('Enter');
  await expect(page.locator('.xterm-screen:visible')).toContainText('MEETING_PANEL_INERT');
  await page.locator('[data-action=terminal-toggle]').click();
  // Fixture de projet fictif ; les workflows ci-dessous sont créés par les formulaires GUI.
  project = await call('project.create', { title: 'Comité de quartier — réunion fictive' });
});
test.afterEach(async () => {
  if (app) await app.close();
  for (const socket of ['cockpit/odoo-tricorder/pty.sock', 'studio-pty.sock', 'runtime/pty.sock']) await cleanupBroker(path.join(directory, socket));
  fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

test('réunion : adapter un modèle par les formulaires, recevoir le compte rendu, activer un brouillon local', async () => {
  await create('meeting-conversation', 'Clôturer le comité de quartier');
  await rename('select', 'Choisir les réunions du comité');
  await rename('review', 'Analyser les décisions et les engagements');
  await page.getByLabel('Consigne', { exact: true }).fill('Analyser les notes fictives des réunions sélectionnées. Séparer les décisions, propositions et actions avec responsable et échéance. Signaler les précisions manquantes.');
  await page.getByRole('button', { name: 'Appliquer au bloc', exact: true }).click();
  await rename('mail', 'Préparer le compte rendu et le texte d’email');
  await shot('01-selection-analyse-et-brouillon-sans-validation-imposee');
  await page.getByRole('button', { name: 'Ajouter une action facultative…', exact: true }).click();
  await page.getByLabel('Nom de l’action', { exact: true }).fill('Préparer un brouillon de suivi');
  await page.getByLabel('Nom du travail', { exact: true }).fill('Brouillon à relire');
  await page.getByLabel('Contenu du document', { exact: true }).fill('Bonjour, le comité a retenu le samedi 24 octobre pour la fête. Léa réserve la salle avant le 15 octobre. Brouillon fictif à relire.');
  await shot('02-configuration-brouillon-facultatif');
  await page.getByRole('button', { name: 'Enregistrer l’action facultative', exact: true }).click();
  await page.getByRole('button', { name: '+ Note', exact: true }).click();
  await page.getByLabel('Titre', { exact: true }).fill('Règle du comité');
  await page.getByLabel('Texte de la note', { exact: true }).fill('Relire les noms et les dates avant toute diffusion.');
  await page.getByRole('button', { name: 'Ajouter la note', exact: true }).click();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect.poll(async () => (await snapshot()).nodes.length).toBe(3);
  const graph = await snapshot(); expect(graph.nodes).toHaveLength(3); expect(graph.actions).toHaveLength(1); expect(graph.layout.notes).toHaveLength(1);
  await shot('03-workflow-reunion-adapte');
  // Fixture IA : demander le périmètre puis fournir des résultats synthétiques.
  // Aucun fournisseur, source réelle ou service externe n’est utilisé.
  const run = engine("r=e.start(p['project'],p['graph'],simulation=False,driver='conversation',parameters={'request':'Clôturer les réunions du comité cette semaine.'});c=e.claim(r['id'],'select');e.submit(r['id'],'select',c['token'],{'ok':True,'summary':'Périmètre à préciser','question':'Quelles réunions du comité souhaitez-vous examiner ? Donnez les titres ou les dates et leurs notes.','outputs':{}});print(json.dumps({'id':r['id']}))", { project: project.id, graph });
  await openRun(run.id);
  await page.getByRole('button', { name: 'Détail', exact: true }).click();
  await expect(page.locator('#inspector')).toContainText('Quelles réunions du comité');
  await page.getByLabel('Votre réponse', { exact: true }).fill('Les ateliers du 8 et du 10 octobre. Notes : fête le 24 octobre ; Léa réserve la salle pour le 15 octobre.');
  await shot('04-question-reunions-et-sources-a-preciser');
  await page.getByRole('button', { name: 'Répondre', exact: true }).click();
  await expect.poll(async () => (await call('run.get', { run: run.id })).run.nodes.select.status).toBe('ready');
  engine("rid=p['run'];c=e.claim(rid,'select');e.submit(rid,'select',c['token'],{'ok':True,'summary':'Deux réunions fictives sélectionnées','outputs':{'selected_meetings':[{'title':'Atelier du 8 octobre','source':'Notes fictives du 8','notes':'Fête le 24 octobre.'},{'title':'Atelier du 10 octobre','source':'Notes fictives du 10','notes':'Léa réserve la salle avant le 15 octobre.'}]}});c=e.claim(rid,'review');e.submit(rid,'review',c['token'],{'ok':True,'summary':'Analyse fictive des deux ateliers','outputs':{'analysis':'Décision : fête de quartier le samedi 24 octobre. Action : Léa réserve la salle avant le 15 octobre.','actions':[{'responsable':'Léa','action':'Réserver la salle','échéance':'15 octobre'}]}});c=e.claim(rid,'mail');e.submit(rid,'mail',c['token'],{'ok':True,'summary':'Compte rendu et texte d’email fictifs','outputs':{'minutes':'Décision : fête de quartier le samedi 24 octobre. Action : Léa réserve la salle avant le 15 octobre.','actions':[{'responsable':'Léa','action':'Réserver la salle','échéance':'15 octobre'}],'draft':'Objet : suivi des ateliers. Bonjour, voici les décisions. Aucun email envoyé.'}});print(json.dumps({'fixture':'deux réunions analysées sans validation intermédiaire'}))", { run: run.id });
  await expect.poll(async () => (await call('run.get', { run: run.id })).run.status).toBe('completed');
  await openRun(run.id);
  await page.getByRole('button', { name: 'Voir les résultats', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Réserver la salle');
  await shot('05-resultat-principal-termine');
  await page.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).click();
  await page.locator('.associated-panel summary').click();
  await page.getByRole('button', { name: 'Activer cette action…', exact: true }).click();
  await page.getByRole('button', { name: 'Activer cette action', exact: true }).click();
  await page.getByRole('button', { name: 'Examiner l’action', exact: true }).click();
  await page.getByRole('button', { name: 'Détail', exact: true }).click();
  await expect(page.locator('#inspector')).toContainText('Bonjour');
  await shot('06-brouillon-local-a-relire');
  await page.getByRole('button', { name: 'Valider le résultat', exact: true }).click();
  await page.getByRole('button', { name: '← Revenir au résultat principal', exact: true }).click();
  await expect.poll(async () => (await call('run.get', { run: run.id })).run.associated.counts.completed || 0).toBe(1);
  expect((await call('run.get', { run: run.id })).run.status).toBe('completed');
  await openRun(run.id); await page.getByRole('button', { name: 'Voir les résultats', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Décision : fête de quartier');
  await shot('07-resultat-retrouve-apres-brouillon');
});

test('plusieurs sujets : un plan, tâches visibles et brouillon en échec sans perdre les résultats', async () => {
  // Fixture volontairement erronée pour éprouver l'échec indépendant, sélectionnée ensuite via le formulaire GUI.
  const broken = { schema: 2, id: 'broken-draft', title: 'Brouillon fictif — erreur de résultat', nodes: [{ id: 'draft', kind: 'task', title: 'Rédiger le brouillon', outputs: { text: { type: 'string', required: true } }, sample_outputs: { text: 42 }, validation: 'contract', max_attempts: 2 }], edges: [] };
  await call('workflow.save', { project: project.id, graph: broken });
  await create('intentions-plan-work', 'Clôture de réunion — sujets et engagements');
  await rename('intentions', 'Recueillir les sujets de réunion');
  const output = page.locator('.port-section').filter({ has: page.locator('strong').filter({ hasText: /Sorties|Produit/ }) });
  await output.getByRole('button', { name: 'Modifier', exact: true }).click();
  await page.getByLabel('Maximum d’éléments (facultatif)', { exact: true }).fill('10');
  await shot('08a-liste-sujets-typee-limitee');
  await page.getByRole('button', { name: 'Enregistrer la donnée', exact: true }).click();
  await rename('plan', 'Proposer les livrables de clôture');
  await rename('work', 'Préparer chaque livrable');
  await page.getByLabel('Travaux simultanés au maximum', { exact: true }).selectOption('2');
  await page.getByRole('button', { name: 'Appliquer au bloc', exact: true }).click();
  await rename('receipt', 'Recevoir le compte rendu et les engagements');
  await page.getByRole('button', { name: 'Ajouter une action facultative…', exact: true }).click();
  await page.getByLabel('Nom de l’action', { exact: true }).fill('Brouillon email facultatif — fixture en erreur');
  await page.getByLabel('Workflow à utiliser', { exact: true }).selectOption({ label: broken.title });
  await page.getByRole('button', { name: 'Enregistrer l’action facultative', exact: true }).click();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect.poll(async () => (await snapshot()).actions?.length).toBe(1);
  const graph = await snapshot();
  // Fixture d'exécution : remplacer le travail IA enfant par une question de réception afin de tout traiter en GUI, sans fournisseur.
  graph.nodes.find(n => n.id === 'work').workflow = { schema: 2, id: 'meeting-receipt', title: 'Recevoir un livrable fictif', nodes: [{ id: 'confirm', kind: 'question', title: 'Confirmer le livrable', question: 'Quel résultat confirmez-vous pour ce livrable fictif ?', inputs: { item: { type: 'object', required: true } }, outputs: { answer: { type: 'string', required: true } } }], edges: [] };
  const run = engine("r=e.start(p['project'],p['graph'],simulation=True,driver='conversation');print(json.dumps({'id':r['id']}))", { project: project.id, graph });
  await openRun(run.id); await page.getByRole('button', { name: 'Détail', exact: true }).click();
  for (const text of ['Rédiger le compte rendu de la fête de quartier', 'Lister les engagements avec responsables et dates']) {
    await page.getByLabel('Nouvelle intention', { exact: true }).fill(text);
    await page.getByRole('button', { name: 'Ajouter à la liste', exact: true }).click();
    await expect(page.getByLabel('Nouvelle intention', { exact: true })).toHaveValue('');
  }
  await expect(page.locator('.collection-items li')).toHaveCount(2); await shot('08-deux-sujets-confirmation-distincte');
  await page.getByRole('button', { name: 'Confirmer la liste et continuer', exact: true }).click();
  await expect.poll(async () => (await call('run.get', { run: run.id })).run.nodes.plan.status).toBe('ready');
  engine("c=e.claim(p['run'],'plan');e.submit(p['run'],'plan',c['token'],{'ok':True,'summary':'Plan unique fictif de clôture','outputs':{'plan':{'title':'Clôture du comité du 10 octobre','tasks':[{'id':'minutes','title':'Compte rendu de la réunion'},{'id':'actions','title':'Engagements et prochaines dates'}]}}});print(json.dumps({'fixture':'plan IA fictif'}))", { run: run.id });
  await page.getByRole('button', { name: 'Examiner la décision', exact: true }).click();
  await expect(page.locator('#inspector')).toContainText('Clôture du comité du 10 octobre');
  await page.getByRole('button', { name: 'Approuver la suite', exact: true }).click();
  await page.getByRole('button', { name: 'Lancer les éléments', exact: true }).click();
  await page.getByRole('button', { name: 'Lancer le traitement des éléments', exact: true }).click();
  await page.getByRole('button', { name: 'Graphe', exact: true }).click();
  await expect(page.locator('.node[data-id=work] .node-work-items button')).toHaveCount(2);
  await shot('09-plan-et-livrables-sur-graphe');
  for (const [title, result] of [['Compte rendu de la réunion', 'Décision confirmée : fête le samedi 24 octobre.'], ['Engagements et prochaines dates', 'Léa réserve la salle avant le 15 octobre ; Marc prépare les affiches avant le 20 octobre.']]) {
    await page.getByRole('button', { name: 'Graphe', exact: true }).click();
    await page.locator('.node[data-id=work] .node-work-items button').filter({ hasText: title }).click();
    await page.getByRole('button', { name: 'Détail', exact: true }).click();
    await page.getByLabel('Votre réponse', { exact: true }).fill(result);
    await page.getByRole('button', { name: 'Répondre', exact: true }).click();
    await page.getByRole('button', { name: '← Revenir au workflow parent', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Examiner la décision', exact: true }).click();
  await expect(page.locator('#inspector')).toContainText('Marc');
  await shot('10-reception-resultats-livrables');
  await page.getByRole('button', { name: 'Approuver la suite', exact: true }).click();
  await expect.poll(async () => (await call('run.get', { run: run.id })).run.status).toBe('completed');
  await page.locator('.associated-panel summary').click();
  await page.getByRole('button', { name: 'Activer cette action…', exact: true }).click();
  await page.getByRole('button', { name: 'Activer cette action', exact: true }).click();
  await expect.poll(async () => (await call('run.get', { run: run.id })).run.associated.counts.failed || 0).toBe(1);
  await expect(page.locator('.associated-panel')).toContainText('Échec à examiner');
  expect((await call('run.get', { run: run.id })).run.status).toBe('completed');
  await shot('11-principal-termine-brouillon-en-echec');
  await page.getByRole('button', { name: 'Examiner l’action', exact: true }).click();
  await page.getByRole('button', { name: 'Détail', exact: true }).click();
  await expect(page.locator('.failure-summary')).toContainText('Le résultat doit fournir un texte');
  await expect(page.locator('.failure-summary > p').filter({hasText:'Le résultat doit fournir un texte'})).not.toContainText('type string');
  await expect(page.getByText('Sortie text absente ou incompatible avec le type string', {exact:true})).not.toBeVisible();
  await shot('12-erreur-brouillon-et-prochaine-action');
  await page.getByRole('button', { name: '← Revenir au résultat principal', exact: true }).click();
  await openRun(run.id); await page.getByRole('button', { name: 'Voir les résultats', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Engagements et prochaines dates');
  await shot('13-resultat-retrouve-malgre-echec');
  // La contre-épreuve initiale nécessitait du JSON ; le texte est maintenant
  // lisible directement, sans ouvrir de données techniques.
  await expect(page.getByRole('dialog').locator('.business-deliverable .business-text').filter({hasText:'Léa réserve la salle'}).first()).toBeVisible();
  await expect(page.getByRole('dialog').locator('pre:visible')).toHaveCount(0);
  await shot('14-engagements-lisibles-directement');
});
