# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: launch-repair.spec.cjs >> repair missing model preserves request and additional project through native launch
- Location: tests/launch-repair.spec.cjs:96:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: getByLabel('Quelle demande souhaitez-vous traiter ?')
Expected: "Comparer les observations du client sur Alpha et Bêta."
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveValue" getByLabel('Quelle demande souhaitez-vous traiter ?') with timeout 5000ms
  - waiting for getByLabel('Quelle demande souhaitez-vous traiter ?')

```

```yaml
- complementary "Tricorder":
  - text: Tricorder
  - navigation "Navigation principale":
    - button "Tableau de bord"
    - button "Modèles"
    - button "Workflows globaux"
    - button "Projets"
  - text: Accès rapide aux projets
  - button "Projet Alpha synthétique"
  - button "Projet Bêta synthétique"
  - navigation "Configuration":
    - button "Planifications"
    - button "Connexions"
  - button "Paramètres"
  - group: Outils et aide
- main:
  - text: Projet Alpha synthétique
  - button "Terminal"
  - text: Fournisseur IA
  - combobox "Fournisseur IA":
    - option "OpenAI · Codex" [selected]
    - option "Anthropic · Claude"
  - group "Thème de l’interface":
    - button "Thème clair"
    - button "Thème sombre"
    - button "Thème système" [pressed]
  - status: À jour
  - button "Actualiser · À jour"
  - main:
    - text: Projet Alpha synthétique / Workflow
    - heading "Analyser les observations" [level=1]
    - paragraph: Révision 1 · Enregistré
    - button "Choisir l’IA"
    - button "Exporter…"
    - button "Enregistrer" [disabled]
    - button "Exécuter…"
    - tablist "Vues du workflow":
      - tab "Éditeur" [selected]
      - tab "Exécution" [disabled]
      - tab "Historique"
      - tab "Rapport" [disabled]
    - button "+ Ajouter un bloc"
    - button "Relier"
    - button "Paramètres du workflow"
    - button "Annuler la modification" [disabled]: ↶
    - button "Rétablir la modification" [disabled]: ↷
    - button "Ouvrir le terminal du workflow": ›_ Terminal
    - group: Options
    - button "✦ Assistant IA"
    - button "Changer la vue graphe ou liste": ☷ Liste
    - button "Comprendre la demande · Tâche IA": Comprendre la demande Tâche IA Tâche IA 0 entrée → 0 sortie
    - text: 1 bloc · 0 lien
    - button "Réduire le graphe": −
    - text: 80 %
    - button "Agrandir le graphe": +
    - button "Ajuster"
  - dialog "Choisir l’IA pour ce workflow":
    - heading "Choisir l’IA pour ce workflow" [level=2]
    - button "Fermer la fenêtre": ×
    - strong: IA pour les étapes de travail
    - paragraph: Un choix commun à toutes les étapes IA. Les profils d’agents sont conservés.
    - text: Fournisseur IA
    - combobox "Fournisseur IA":
      - option "OpenAI · Codex" [selected]
      - option "Anthropic · Claude"
    - text: Modèle
    - textbox "Modèle":
      - /placeholder: Modèle configuré chez le fournisseur
    - text: Le modèle proposé provient de votre configuration locale. La connexion sera vérifiée au lancement.
    - button "Appliquer ce choix et vérifier"
    - button "Revenir au lancement"
```

# Test source

```ts
  9   | let directory, app, page;
  10  | 
  11  | const call = (action, data = {}) => page.evaluate(payload => window.studio.request(payload), { action, ...data });
  12  | const requestField = () => page.getByLabel('Quelle demande souhaitez-vous traiter ?');
  13  | const launchButton = () => page.getByRole('button', { name: 'Lancer dans le terminal', exact: true });
  14  | const remedy = action => page.locator(`[data-action="repair-launch"][data-remedy="${action}"]`);
  15  | 
  16  | test.beforeEach(async () => {
  17  |   directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-launch-repair-'));
  18  |   const bin = path.join(directory, 'bin'); fs.mkdirSync(bin);
  19  |   const inert = '#!/usr/bin/python3\nimport sys\nprint("LAUNCH_REPAIR_INERT_AGENT",flush=True)\nfor line in sys.stdin:\n if line.strip()=="exit": break\n';
  20  |   for (const provider of ['codex', 'claude']) fs.writeFileSync(path.join(bin, provider), inert, { mode: 0o755 });
  21  |   app = await electron.launch({
  22  |     executablePath: process.env.TRICORDER_EXECUTABLE,
  23  |     args: process.env.TRICORDER_EXECUTABLE ? ['--workflow-studio'] : [root, '--workflow-studio'],
  24  |     env: { ...process.env, HOME: directory, PATH: bin + ':/usr/bin:/bin',
  25  |       XDG_CONFIG_HOME: path.join(directory, 'config'), XDG_CACHE_HOME: path.join(directory, 'cache'), XDG_DATA_HOME: path.join(directory, 'data'),
  26  |       TRICORDER_AGENTS_DIR: path.join(directory, 'no-installed-pack'), TRICORDER_HOME: directory,
  27  |       TRICORDER_STATE_DIR: directory, TRICORDER_TEST_MODE: '1' }, timeout: 20000,
  28  |   });
  29  |   page = await app.firstWindow();
  30  |   await expect(page.getByRole('heading', { name: 'Un workflow clair.' })).toBeVisible();
  31  | });
  32  | 
  33  | test.afterEach(async () => {
  34  |   try {
  35  |     if (app) {
  36  |       if (page && !page.isClosed()) await page.evaluate(() => window.tricorder.terminals.list());
  37  |       await app.close();
  38  |     }
  39  |   } finally {
  40  |     if (directory) {
  41  |       await cleanupBroker(path.join(directory, 'cockpit/odoo-tricorder/pty.sock'));
  42  |       await cleanupBroker(path.join(directory, 'studio-pty.sock'));
  43  |       fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  44  |     }
  45  |     app = page = directory = undefined;
  46  |   }
  47  | });
  48  | 
  49  | async function openWorkflow(project, graph) {
  50  |   await page.getByRole('button', { name: 'Projets', exact: true }).click();
  51  |   await page.locator('.project-card').filter({ hasText: project.title }).click();
  52  |   await page.locator('article').filter({ has: page.getByRole('heading', { name: graph.title, exact: true }) })
  53  |     .getByRole('button', { name: 'Ouvrir le workflow', exact: true }).click();
  54  | }
  55  | 
  56  | async function launchDialog(text) {
  57  |   await page.getByRole('button', { name: 'Exécuter…', exact: true }).click();
  58  |   await requestField().fill(text);
  59  | }
  60  | 
  61  | async function selectAdditional(project) {
  62  |   const details = page.locator('.launch-projects');
  63  |   if (!await details.evaluate(el => el.open)) await details.locator('summary').click();
  64  |   await page.locator(`[name="conversation-project"][value="${project.id}"]`).check();
  65  | }
  66  | 
  67  | async function returnToLaunch(text, additional) {
  68  |   await page.getByRole('button', { name: 'Revenir au lancement', exact: true }).click();
  69  |   await expect(requestField()).toHaveValue(text);
  70  |   if (additional) await expect(page.locator(`[name="conversation-project"][value="${additional.id}"]`)).toBeChecked();
  71  | }
  72  | 
  73  | async function launchInert(project, graph, text) {
  74  |   await expect(launchButton()).toBeEnabled();
  75  |   await launchButton().click();
  76  |   await expect(page.locator('.xterm-screen:visible')).toContainText('LAUNCH_REPAIR_INERT_AGENT');
  77  |   const conversations = await call('conversation.list', { project: project.id });
  78  |   expect(conversations).toHaveLength(1);
  79  |   const conversation = await call('conversation.get', { conversation: conversations[0].id });
  80  |   expect(conversation.definition.title).toBe(graph.title);
  81  |   expect(conversation.items).toHaveLength(1);
  82  |   expect(conversation.items[0].request).toBe(text);
  83  |   const { run } = await call('run.get', { run: conversation.items[0].run });
  84  |   expect(run.nodes[graph.nodes[0].id].status).toBe('ready'); // Inert means no claimed/model work.
  85  |   expect(app.context().pages()).toHaveLength(1);
  86  |   return conversation;
  87  | }
  88  | 
  89  | async function qualifyLocalAdapter() {
  90  |   const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Lecture locale synthétique', exact: true }) });
  91  |   await card.getByRole('button', { name: 'Vérifier l’adaptateur…' }).click();
  92  |   await page.getByRole('button', { name: 'Exécuter le contrôle', exact: true }).click();
  93  |   await expect(card).toContainText('Utilisable');
  94  | }
  95  | 
  96  | test('repair missing model preserves request and additional project through native launch', async () => {
  97  |   const alpha = await call('project.create', { title: 'Projet Alpha synthétique' });
  98  |   const beta = await call('project.create', { title: 'Projet Bêta synthétique' });
  99  |   const graph = { schema: 1, id: 'analyse', title: 'Analyser les observations', nodes: [
  100 |     { id: 'analyse', kind: 'agent', title: 'Comprendre la demande' }], edges: [] };
  101 |   await call('workflow.save', { project: alpha.id, graph });
  102 |   await openWorkflow(alpha, graph);
  103 |   const text = 'Comparer les observations du client sur Alpha et Bêta.';
  104 |   await launchDialog(text); await selectAdditional(beta);
  105 |   await page.locator('.launch-automatic > summary').click();
  106 |   await page.locator('[data-diagnostic="provider.model-required"]').locator('[data-remedy="choose-ai"]').first().click();
  107 |   await page.getByLabel('Modèle', { exact: true }).fill('synthetic-model');
  108 |   await page.getByRole('button', { name: 'Appliquer ce choix et vérifier', exact: true }).click();
> 109 |   await expect(requestField()).toHaveValue(text);
      |                                ^ Error: expect(locator).toHaveValue(expected) failed
  110 |   await expect(page.locator(`[name="conversation-project"][value="${beta.id}"]`)).toBeChecked();
  111 |   const conversation = await launchInert(alpha, graph, text);
  112 |   expect(conversation.projects).toEqual([alpha.id, beta.id]);
  113 |   expect(conversation.model).toBe('synthetic-model');
  114 | });
  115 | 
  116 | test('repair secondary-project connection diagnoses before launch and returns without retyping', async () => {
  117 |   const alpha = await call('project.create', { title: 'Projet Alpha synthétique' });
  118 |   const beta = await call('project.create', { title: 'Projet Bêta synthétique' });
  119 |   const adapter = path.join(directory, 'local-adapter.py');
  120 |   fs.writeFileSync(adapter, "import json,sys\np=json.load(sys.stdin)\nprint(json.dumps({'protocol':'tricorder.tool/1','identity':'synthetic-repair','connected':True,'operations':{'read':'read'}} if p['action']=='describe' else {'ok':True,'identity':'synthetic-repair','outputs':{'value':42}}))\n");
  121 |   const manifest = { schema: 1, plugins: [{ id: 'local-read', title: 'Lecture locale synthétique', provider: 'local', operations: ['read'], transport: { argv: ['/usr/bin/python3', adapter], timeout: 3 } }] };
  122 |   for (const project of [alpha, beta]) fs.writeFileSync(path.join(project.path, '.tricorder/plugins.json'), JSON.stringify(manifest));
  123 |   const graph = { schema: 1, id: 'minutes', title: 'Comparer les comptes rendus', nodes: [
  124 |     { id: 'read', title: 'Lire le compte rendu', kind: 'document', validation: 'automatic', outputs: { value: 'number' }, capabilities: [{ plugin: 'local-read', operation: 'read' }] }], edges: [] };
  125 |   await call('workflow.save', { project: alpha.id, graph });
  126 |   await openWorkflow(alpha, graph);
  127 |   await page.getByRole('button', { name: 'Connexions', exact: true }).click();
  128 |   await expect(page.getByLabel('Contexte', { exact: true })).toHaveValue(alpha.id);
  129 |   await qualifyLocalAdapter();
  130 |   await openWorkflow(alpha, graph);
  131 |   const text = 'Comparer les minutes des deux projets, garder cette demande.';
  132 |   await launchDialog(text); await expect(launchButton()).toBeEnabled();
  133 |   await selectAdditional(beta);
  134 |   const issue = page.locator('#launch-native-check [data-diagnostic="plugin.connection-required"]').filter({ hasText: beta.title });
  135 |   await expect(issue).toBeVisible();
  136 |   await expect(launchButton()).toBeDisabled();
  137 |   expect(await call('conversation.list', { project: alpha.id })).toEqual([]);
  138 |   await issue.locator('[data-remedy="connections"]').click();
  139 |   await expect(page.getByLabel('Contexte', { exact: true })).toHaveValue(beta.id);
  140 |   await qualifyLocalAdapter();
  141 |   await returnToLaunch(text, beta);
  142 |   await expect(page.locator('#launch-native-check [data-diagnostic="plugin.connection-required"]')).toHaveCount(0);
  143 |   const conversation = await launchInert(alpha, graph, text);
  144 |   expect(conversation.projects).toEqual([alpha.id, beta.id]);
  145 | });
  146 | 
  147 | for (const viaProfile of [false, true]) test(`repair missing Odoo version exposes its field and preserves the launch request (${viaProfile ? 'domain from pack profile' : 'explicit domain'})`, async () => {
  148 |   const project = await call('project.create', { title: 'Projet Odoo synthétique sans version' });
  149 |   const pack = path.join(directory, 'synthetic-pack'); fs.mkdirSync(pack);
  150 |   fs.writeFileSync(path.join(pack, 'role.md'), 'Synthetic role; no real Odoo work.');
  151 |   fs.writeFileSync(path.join(pack, 'tricorder-pack.json'), JSON.stringify({ schema: 1, engine_schema: 1, id: 'synthetic-odoo', version: '1', profiles: [{ id: 'specialist', source: 'role.md' }], policies: { domain: 'odoo', series_required: true } }));
  152 |   const preview = await call('pack.preview', { path: pack });
  153 |   await call('pack.install', { project: project.id, path: pack, digest: preview.sha256 });
  154 |   const graph = { schema: 1, id: 'odoo-analysis', title: 'Analyser une demande Odoo', ...(viaProfile ? {} : { domain: 'odoo' }), defaults: { provider: 'codex', model: 'synthetic-model' }, nodes: [
  155 |     { id: 'analyse', kind: 'agent', title: 'Comprendre les observations', ...(viaProfile ? { profile: 'specialist' } : {}) }], edges: [] };
  156 |   await call('workflow.save', { project: project.id, graph });
  157 |   await openWorkflow(project, graph);
  158 |   const text = 'Comprendre le besoin avant de préparer une release.';
  159 |   await launchDialog(text);
  160 |   await expect(launchButton()).toBeDisabled();
  161 |   await page.locator('#launch-native-check [data-diagnostic="odoo.series-required"]').locator('[data-remedy="workflow-settings"]').click();
  162 |   await page.getByLabel('Version d’Odoo', { exact: true }).fill('19.0');
  163 |   await page.getByRole('button', { name: 'Appliquer', exact: true }).click();
  164 |   await returnToLaunch(text);
  165 |   await expect(launchButton()).toBeEnabled();
  166 |   const saved = await call('workflow.get', { project: project.id, workflow: graph.id });
  167 |   expect(saved.parameters.series).toBe('19.0');
  168 |   expect(await call('conversation.list', { project: project.id })).toEqual([]);
  169 | });
  170 | 
  171 | test('repair global code workflow adapts into a project without changing its origin', async () => {
  172 |   const project = await call('project.create', { title: 'Projet Alpha synthétique' });
  173 |   await call('workspace.get');
  174 |   const graph = { schema: 1, id: 'global-code', title: 'Préparer une modification de code', defaults: { provider: 'codex', model: 'synthetic-model' }, nodes: [
  175 |     { id: 'edit', title: 'Modifier le code', kind: 'agent', execution_mode: 'edit', outputs: { candidate: 'object' } }], edges: [] };
  176 |   const original = await call('workflow.save', { project: 'workspace', graph });
  177 |   await page.getByRole('button', { name: 'Workflows globaux', exact: true }).click();
  178 |   await page.locator('article').filter({ has: page.getByRole('heading', { name: graph.title, exact: true }) }).getByRole('button', { name: 'Ouvrir le workflow', exact: true }).click();
  179 |   const text = 'Préparer la correction dans Alpha, sans lancer le travail.';
  180 |   await launchDialog(text);
  181 |   await expect(launchButton()).toBeDisabled();
  182 |   await remedy('choose-project').first().click();
  183 |   await page.getByLabel('Projet', { exact: true }).selectOption(project.id);
  184 |   await page.getByRole('button', { name: 'Créer la copie et continuer', exact: true }).click();
  185 |   await expect(requestField()).toHaveValue(text);
  186 |   await expect(launchButton()).toBeEnabled();
  187 |   expect(await call('workflow.get', { project: 'workspace', workflow: graph.id })).toEqual(original);
  188 |   const target = await call('project.get', { project: project.id });
  189 |   const copies = target.workflows.filter(item => item.title === graph.title);
  190 |   expect(copies).toHaveLength(1);
  191 |   expect(copies[0].id).not.toBe(graph.id);
  192 |   const copy = await call('workflow.get', { project: project.id, workflow: copies[0].id });
  193 |   expect(copy.nodes).toEqual(original.nodes);
  194 |   expect(await call('conversation.list', { project: project.id })).toEqual([]);
  195 | });
  196 | 
  197 | test('late run response cannot navigate back after the user opens Projects', async () => {
  198 |   const project = await call('project.create', { title: 'Projet de navigation synthétique' });
  199 |   const graph = { schema: 1, id: 'navigation', title: 'Vérifier la navigation', nodes: [
  200 |     { id: 'analyse', kind: 'agent', title: 'Analyser les observations' }], edges: [] };
  201 |   await call('workflow.save', { project: project.id, graph });
  202 |   await app.evaluate(({ ipcMain }) => {
  203 |     const handler = ipcMain._invokeHandlers.get('studio:request');
  204 |     globalThis.__launchRepairPending = false;
  205 |     let delayed = false;
  206 |     ipcMain.removeHandler('studio:request');
  207 |     ipcMain.handle('studio:request', async (event, payload) => {
  208 |       const value = await handler(event, payload); // Real backend result; no workflow state mutation.
  209 |       if (payload.action === 'run.get' && !delayed) {
```