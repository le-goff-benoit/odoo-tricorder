# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: studio.spec.cjs >> large release history: startup and refresh preserve projects, workflows and terminal
- Location: tests/studio.spec.cjs:104:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 2
+ Received  + 4

  Array [
-   ObjectContaining {
-     "status": "configured",
+   Object {
+     "path": "/tmp/tricorder-studio-ui-mubGlH/history-project",
+     "reason": "Ce dépôt Git est déjà enregistré comme projet",
+     "status": "unavailable",
    },
  ]
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - complementary "Tricorder" [ref=e3]:
    - navigation "Navigation principale" [ref=e9]:
      - button "Tableau de bord" [ref=e10] [cursor=pointer]
      - button "Modèles" [ref=e17] [cursor=pointer]
      - button "Workflows globaux" [ref=e21] [cursor=pointer]
      - button "Projets" [ref=e28] [cursor=pointer]
    - generic [ref=e32]: Accès rapide aux projets
    - button "history-project" [ref=e34] [cursor=pointer]
    - generic [ref=e36]:
      - navigation "Configuration" [ref=e37]:
        - button "Planifications" [ref=e38] [cursor=pointer]
        - button "Connexions" [ref=e42] [cursor=pointer]
      - button "Paramètres" [ref=e49] [cursor=pointer]
      - group [ref=e53]:
        - generic "Outils et aide" [ref=e54] [cursor=pointer]
  - main [ref=e55]:
    - generic [ref=e56]:
      - generic [ref=e57]:
        - heading "history-project" [level=1] [ref=e58]
        - generic [ref=e59]:
          - button "Mettre en favori" [ref=e60] [cursor=pointer]
          - button "Ouvrir le dossier /tmp/tricorder-studio-ui-mubGlH/history-project" [ref=e63] [cursor=pointer]
      - generic [ref=e66]:
        - button "Terminal" [pressed] [ref=e67] [cursor=pointer]
        - generic [ref=e71]:
          - text: Fournisseur IA
          - combobox "Fournisseur IA" [ref=e72]:
            - option "OpenAI · Codex" [selected]
            - option "Anthropic · Claude"
        - group "Thème de l’interface" [ref=e73]:
          - button "Thème clair" [ref=e74] [cursor=pointer]
          - button "Thème sombre" [ref=e78] [cursor=pointer]
          - button "Thème système" [pressed] [ref=e81] [cursor=pointer]
        - status [ref=e85]: Lecture des projets…
        - button "Actualiser" [ref=e86] [cursor=pointer]
    - region "Release sélectionnée" [ref=e89]:
      - generic [ref=e90]:
        - generic [ref=e91]: Projet
        - generic [ref=e93]:
          - heading "Préparer la prochaine release" [level=2] [ref=e94]
          - combobox "Release" [ref=e97] [cursor=pointer]:
            - option "Aucune release" [selected]
            - option "2026-10-09 · Historique synthétique · Close"
    - navigation "Vues du projet" [ref=e98]:
      - button "Statut" [ref=e99] [cursor=pointer]
      - button "Terminal" [ref=e100] [cursor=pointer]
      - button "Demandes" [ref=e101] [cursor=pointer]
      - button "Plan" [ref=e102] [cursor=pointer]
      - button "Mémoire" [ref=e103] [cursor=pointer]
      - button "Express" [ref=e104] [cursor=pointer]
      - button "Temps" [ref=e105] [cursor=pointer]
      - button "Workflows du projet" [ref=e106] [cursor=pointer]
    - generic [ref=e108]:
      - generic [ref=e110]:
        - heading "Lecture du projet…" [level=2] [ref=e113]
        - paragraph [ref=e114]: Chargement des releases et vérification des preuves.
      - generic [ref=e115]:
        - generic [ref=e116]:
          - generic [ref=e117]:
            - text: Workflow
            - combobox "Workflow" [ref=e118]:
              - option "Release Odoo" [selected]
              - option "Demande Odoo"
              - option "Diagnostic Odoo"
          - button "Démarrer le workflow" [disabled] [ref=e119]
        - generic [ref=e120]:
          - strong [ref=e121]: Terminal
          - button "Agrandir le terminal" [ref=e123] [cursor=pointer]
        - generic [ref=e124]:
          - generic [ref=e125]:
            - generic [ref=e126]: Environnement
            - combobox "Environnement" [ref=e131] [cursor=pointer]:
              - option "Shell local" [selected]
          - generic [ref=e134]: Pour les nouveaux terminaux
        - generic [ref=e135]:
          - button "Nouveau terminal" [ref=e136] [cursor=pointer]
          - button "Rechercher dans le terminal" [ref=e140] [cursor=pointer]
        - generic [ref=e145]:
          - heading "Chargement du projet…" [level=2] [ref=e148]
          - paragraph [ref=e149]: Les commandes seront disponibles dès que son contexte sera prêt.
```

# Test source

```ts
  8   | async function studioPage() {
  9   |   return app.firstWindow();
  10  | }
  11  |
  12  | async function quitApplication() { await app.close(); }
  13  |
  14  | test.beforeEach(async ({}, testInfo) => {
  15  |   directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-studio-ui-'));
  16  |   const extraEnv = {};
  17  |   if (testInfo.title.startsWith('large release history')) {
  18  |     const project = path.join(directory, 'history-project');
  19  |     const release = path.join(project, 'changelog', '2026-10-09_history');
  20  |     fs.mkdirSync(release, { recursive: true });
  21  |     fs.mkdirSync(path.join(project, '.odoo-agents'));
  22  |     require('node:child_process').execFileSync('git', ['init', '-q', project]);
  23  |     fs.writeFileSync(path.join(release, 'README.md'), '# Historique synthétique\n');
  24  |     // Included in the releases and current-release views: > 4 MB in the catalog.
  25  |     fs.writeFileSync(path.join(release, 'intentions.json'), JSON.stringify({ schema: 1, items: [{ id: 'I01', status: 'ready', title: 'Demande historique', detail: 'x'.repeat(2200000) }] }));
  26  |   }
  27  |   if (testInfo.title.startsWith('optional workflow setup')) {
  28  |     const pack = path.join(directory, 'invalid-pack'); fs.mkdirSync(pack);
  29  |     fs.writeFileSync(path.join(pack, 'tricorder-pack.json'), '{invalid');
  30  |     extraEnv.TRICORDER_AGENTS_DIR = pack;
  31  |     const project = path.join(directory, 'sample-project'); fs.mkdirSync(project); fs.mkdirSync(path.join(project, '.odoo-agents'));
  32  |     require('node:child_process').execFileSync('git', ['init', '-q', project]);
  33  |   }
  34  |   app = await electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE, args: process.env.TRICORDER_EXECUTABLE ? ['--workflow-studio'] : [root, '--workflow-studio'], env: { ...process.env, PATH: path.join(directory, 'bin') + ':' + process.env.PATH, TRICORDER_STATE_DIR: directory, TRICORDER_HOME: directory, TRICORDER_TEST_MODE: '1', ...extraEnv }, timeout: 20000 });
  35  |   page = await studioPage();
  36  |   await expect(page.getByRole('heading', { name: 'Un workflow clair.' })).toBeVisible();
  37  | });
  38  | test.afterEach(async () => {
  39  |   // Startup detaches a persistent broker. Wait until it has created its socket,
  40  |   // then close this test's sessions before removing the synthetic home.
  41  |   if (app) {
  42  |     if (page && !page.isClosed()) await page.evaluate(() => window.tricorder.terminals.list());
  43  |     await quitApplication();
  44  |   }
  45  |   if (directory) {
  46  |     await cleanupBroker(path.join(directory, 'cockpit/odoo-tricorder/pty.sock'));
  47  |     await cleanupBroker(path.join(directory, 'studio-pty.sock'));
  48  |     fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  49  |   }
  50  | });
  51  |
  52  | async function example() { await page.getByRole('button', { name: 'Essayer un exemple' }).click(); await expect(page.getByRole('heading', { name: "De la demande au résultat" })).toBeVisible(); }
  53  |
  54  | async function odooLaunchProject({ model = 'fixture-model' } = {}) {
  55  |   const bin = path.join(directory, 'bin'); fs.mkdirSync(bin, { recursive: true });
  56  |   for (const provider of ['codex', 'claude']) {
  57  |     fs.copyFileSync(path.join(root, 'tests/fixtures/odoo-intake-agent.py'), path.join(bin, provider));
  58  |     fs.chmodSync(path.join(bin, provider), 0o755);
  59  |   }
  60  |   const pack = path.join(directory, 'synthetic-odoo-pack'); fs.mkdirSync(pack);
  61  |   fs.writeFileSync(path.join(pack, 'roles.md'), 'Synthetic orchestration profiles; no model or Odoo connection.');
  62  |   fs.writeFileSync(path.join(pack, 'tricorder-pack.json'), JSON.stringify({ schema: 1, engine_schema: 1, id: 'synthetic-odoo', version: '1',
  63  |     profiles: ['odoo-analyst', 'odoo-developer', 'odoo-tester', 'odoo-deployer', 'odoo-support', 'odoo-studio'].map(id => ({ id, source: 'roles.md' })),
  64  |     policies: { domain: 'odoo', series_required: true, online_requires_studio: true, qa_requires_local_copy: true } }));
  65  |   const project = await page.evaluate(() => window.studio.request({ action: 'project.create', title: 'Release Odoo synthétique' }));
  66  |   const module = path.join(project.path, 'synthetic_module'); fs.mkdirSync(module);
  67  |   fs.writeFileSync(path.join(module, '__manifest__.py'), "{'name':'Synthetic','version':'19.0.1.0.0'}");
  68  |   // Fixture setup uses the same engine command as desktop catalog setup.
  69  |   // It is intentionally not an arbitrary command exposed to the renderer.
  70  |   const backend = process.env.TRICORDER_EXECUTABLE ? path.join(path.dirname(process.env.TRICORDER_EXECUTABLE), 'resources/backend') : path.join(root, 'backend');
  71  |   require('node:child_process').execFileSync('/usr/bin/python3', ['-c',
  72  |     'import json,sys;sys.path.insert(0,sys.argv[1]);from workflow_engine import Engine;from workflow_engine.setup import configure;r=configure(Engine(sys.argv[2]),json.loads(sys.argv[3]),sys.argv[4]);assert r[0]["status"]=="configured",r',
  73  |     backend, directory, JSON.stringify([{ path: project.path, name: project.title, series: '19.0' }]), pack]);
  74  |   await page.evaluate(async ({ project, model }) => {
  75  |     const graph = await window.studio.request({ action: 'workflow.get', project: project.id, workflow: 'odoo-release-conversation' });
  76  |     graph.defaults = { ...graph.defaults, provider: 'codex', model };
  77  |     await window.studio.request({ action: 'workflow.save', project: project.id, graph, revision: graph.revision });
  78  |   }, { project, model });
  79  |   await page.getByRole('button', { name: 'Projets', exact: true }).click();
  80  |   await page.locator('.project-card').filter({ hasText: project.title }).click();
  81  |   await page.locator('[data-action="open-workflow"][data-id="odoo-release-conversation"]').click();
  82  |   return project;
  83  | }
  84  |
  85  | test('Odoo launch journey: missing QA database does not block intake through the actual launch dialog', async () => {
  86  |   const project = await odooLaunchProject();
  87  |   await page.getByRole('button', { name: 'Exécuter…', exact: true }).click();
  88  |   const dialog = page.getByRole('dialog');
  89  |   await page.getByLabel('Quelle demande souhaitez-vous traiter ?').fill('Analyser la demande client avant de préparer les tests.');
  90  |   await page.screenshot({ path: test.info().outputPath('odoo-launch-without-database.png') });
  91  |   await expect(page.getByRole('button', { name: 'Lancer dans le terminal', exact: true })).toBeEnabled();
  92  |   await expect(dialog).toContainText('avant la recette');
  93  |   await expect(dialog).not.toContainText('neutralized_copy');
  94  |   await expect(dialog).not.toContainText('environment=');
  95  |   await page.getByRole('button', { name: 'Lancer dans le terminal', exact: true }).click();
  96  |   await expect(page.locator('.xterm-screen:visible')).toContainText('ODOO INTAKE RECEIVED');
  97  |   await expect(page.locator('.node[data-id="intent"]')).toHaveAttribute('data-status', 'accepted');
  98  |   const conversations = await page.evaluate(project => window.studio.request({ action: 'conversation.list', project }), project.id);
  99  |   expect(conversations).toHaveLength(1);
  100 |   expect(conversations[0].item_count).toBe(1);
  101 |   expect(app.context().pages()).toHaveLength(1);
  102 | });
  103 |
  104 | test('large release history: startup and refresh preserve projects, workflows and terminal', async () => {
  105 |   const initial = await page.evaluate(() => window.tricorder.bootstrap());
  106 |   expect(JSON.stringify(initial.projects).length).toBeGreaterThan(4000000);
  107 |   expect(initial.workflowWarning).toBeNull();
> 108 |   expect(initial.configured).toEqual([expect.objectContaining({ status: 'configured' })]);
      |                              ^ Error: expect(received).toEqual(expected) // deep equality
  109 |   await expect(page.locator('#catalog-warning')).toBeHidden();
  110 |   const workflows = await page.evaluate(() => window.studio.request({ action: 'bootstrap' }));
  111 |   expect(workflows.projects.some(p => p.title === 'history-project')).toBe(true);
  112 |   await page.locator('[data-action="refresh"]').click();
  113 |   await expect(page.locator('#sync-status')).toContainText('À jour');
  114 |   await expect(page.locator('#catalog-warning')).toBeHidden();
  115 |   await page.locator('[data-workflow-route="projects"]').click();
  116 |   await page.locator('.project-card').filter({ hasText: 'history-project' }).click();
  117 |   await page.locator('[data-action="terminal-toggle"]').click();
  118 |   await page.getByRole('button', { name: 'Ouvrir un terminal', exact: true }).click();
  119 |   await expect.poll(async () => (await page.evaluate(() => window.tricorder.terminals.list())).filter(s => s.alive).length).toBe(1);
  120 |   await page.screenshot({ path: test.info().outputPath('large-history-startup.png') });
  121 | });
  122 | async function simulate() { await page.getByRole('button', { name: 'Exécuter…' }).click(); await page.getByRole('button', { name: 'Simuler le parcours' }).click(); await expect(page.locator('#run-banner')).toContainText('Simulation'); }
  123 | async function receive(id, hasCriteria = false) {
  124 |   const node = page.locator(`.node[data-id="${id}"]`);
  125 |   await expect(node).toHaveAttribute('data-status', 'returned'); await node.click();
  126 |   if (hasCriteria) await page.locator('#receipt-form input[type=checkbox]').check();
  127 |   await page.getByLabel('Commentaire de validation').fill('Résultat examiné dans le contexte simulé.');
  128 |   await page.getByRole('button', { name: 'Valider le résultat' }).click();
  129 |   await expect(node).toHaveAttribute('data-status', 'accepted');
  130 | }
  131 |
  132 | test('first use: generic project, graph editing, undo, persisted workflow and keyboard list', async () => {
  133 |   await example();
  134 |   await expect(page.locator('.node')).toHaveCount(6);
  135 |   await page.locator('.node[data-id="analyse"]').click();
  136 |   await page.getByLabel('Nom du bloc', { exact: true }).fill('Clarifier le besoin métier');
  137 |   await page.getByText('Reprises, ressources et position').click();
  138 |   await page.getByLabel('Position X', { exact: true }).fill('110');
  139 |   await page.getByRole('button', { name: 'Appliquer au bloc' }).click();
  140 |   await expect(page.locator('.node[data-id="analyse"] .mission')).toHaveText('Clarifier le besoin métier');
  141 |   await page.getByRole('button', { name: 'Annuler la modification' }).click();
  142 |   await expect(page.locator('.node[data-id="analyse"] .mission')).toHaveText('Comprendre la demande');
  143 |   await page.getByRole('button', { name: 'Rétablir la modification' }).click();
  144 |   await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  145 |   await page.getByRole('button', { name: 'Changer la vue graphe ou liste' }).click();
  146 |   await expect(page.getByRole('cell', { name: 'Clarifier le besoin métier' })).toBeVisible();
  147 |   await page.getByRole('button', { name: 'Projets', exact: true }).click();
  148 |   await page.locator('.project-card').filter({hasText:/Mon premier projet/}).click();
  149 |   await page.getByRole('button', { name: 'Ouvrir le workflow' }).click();
  150 |   await expect(page.getByRole('cell', { name: 'Clarifier le besoin métier' })).toBeVisible();
  151 |   await page.screenshot({ path: path.join(test.info().outputDir, 'studio-list.png'), fullPage: true });
  152 | });
  153 |
  154 | test('simulation: two branches, human decision, truthful results and single documentation view', async () => {
  155 |   await example(); await simulate();
  156 |   await receive('analyse', true);
  157 |   await receive('build'); await receive('test');
  158 |   await expect(page.locator('.node[data-id="decision"]')).toHaveAttribute('data-status', 'waiting');
  159 |   await page.locator('.node[data-id="decision"]').click();
  160 |   await expect(page.getByRole('button', { name: 'Approuver la suite' })).toBeVisible();
  161 |   await page.screenshot({ path: path.join(test.info().outputDir, 'studio-decision.png'), fullPage: true });
  162 |   await page.getByRole('button', { name: 'Approuver la suite' }).click();
  163 |   await receive('bilan');
  164 |   await expect(page.locator('#run-banner')).toContainText('Terminée');
  165 |   await page.getByRole('tab', { name: 'Rapport' }).click();
  166 |   for (const heading of ['Demande', 'Plan', 'Réalisation', 'Tests et limites', 'Livraison et documentation', 'Décisions et suite']) await expect(page.locator('#document-view').getByRole('heading', { name: heading, exact: true })).toBeVisible();
  167 |   await expect(page.locator('#document-view')).toContainText('aucun résultat métier réel');
  168 | });
  169 |
  170 | test('decisions persist after application restart and reject skips its branch', async () => {
  171 |   await example(); await simulate(); await receive('analyse', true); await receive('build'); await receive('test');
  172 |   await expect(page.locator('.node[data-id="decision"]')).toHaveAttribute('data-status', 'waiting');
  173 |   await quitApplication();
  174 |   app = await electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE, args: process.env.TRICORDER_EXECUTABLE ? ['--workflow-studio'] : [root, '--workflow-studio'], env: { ...process.env, PATH: path.join(directory, 'bin') + ':' + process.env.PATH, TRICORDER_STATE_DIR: directory, TRICORDER_HOME: directory, TRICORDER_TEST_MODE: '1' } });
  175 |   page = await studioPage();
  176 |   await page.getByRole('button', { name: 'Projets', exact: true }).click();
  177 |   await page.locator('.project-card').filter({hasText:/Mon premier projet/}).click();
  178 |   await page.getByRole('button', { name: 'Consulter', exact: true }).click();
  179 |   await page.locator('.node[data-id="decision"]').click();
  180 |   await page.getByRole('button', { name: 'Refuser la suite' }).click();
  181 |   await expect(page.locator('.node[data-id="bilan"]')).toHaveAttribute('data-status', 'skipped');
  182 | });
  183 |
  184 | test('connections never infer native authentication and real unconfigured launch is blocked', async () => {
  185 |   await page.getByRole('button', { name: 'Connexions', exact: true }).click();
  186 |   await expect(page.getByText('GitHub → Odoo.sh', { exact: true })).toBeVisible();
  187 |   await expect(page.getByText(/Aucun transport authentifié/)).toBeVisible();
  188 |   await page.getByRole('button', { name: 'Modèles', exact: true }).click();
  189 |   await page.locator('article').filter({ has: page.getByRole('heading', { name: 'Évolution logicielle', exact: true }) }).getByRole('button', { name: 'Utiliser' }).click();
  190 |   await page.getByRole('button', { name: 'Créer et ouvrir le workflow' }).click();
  191 |   await page.getByRole('button', { name: 'Exécuter…' }).click();
  192 |   await page.getByText('Exécution automatique sans conversation',{exact:true}).evaluate(el => { el.parentElement.open = true; });
  193 |   await expect(page.getByRole('button', { name: 'Lancer l’exécution réelle' })).toBeDisabled();
  194 |   await expect(page.getByRole('dialog')).toContainText('Modèle IA à définir');
  195 | });
  196 |
  197 | test('live events preserve text input and focus; layout fits 1024 and dark theme', async () => {
  198 |   await page.setViewportSize({ width: 1024, height: 768 });
  199 |   await example(); await simulate();
  200 |   await expect(page.locator('.node[data-id="analyse"]')).toHaveAttribute('data-status', 'returned');
  201 |   await page.locator('.node[data-id="analyse"]').click();
  202 |   const note = page.getByLabel('Commentaire de validation'); await note.fill('Texte en cours de rédaction');
  203 |   await page.waitForTimeout(2200);
  204 |   await expect(note).toBeFocused(); await expect(note).toHaveValue('Texte en cours de rédaction');
  205 |   await page.getByRole('button', { name: 'Thème sombre' }).click();
  206 |   await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  207 |   const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  208 |   expect(overflow).toBe(false);
```
