# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: panel-configuration.spec.cjs >> a pasted repository is validated and the new block receives keyboard focus
- Location: tests/panel-configuration.spec.cjs:135:1

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  locator('#node-title')
Expected: focused
Received: inactive
Timeout:  5000ms

Call log:
  - Expect "toBeFocused" locator('#node-title') with timeout 5000ms
  - waiting for locator('#node-title')
    14 × locator resolved to <input required="" name="title" id="node-title" value="Informer le groupe fictif"/>
       - unexpected value "inactive"

```

```yaml
- textbox "Nom du bloc": Informer le groupe fictif
```

# Test source

```ts
  61  |   await expect(page.locator('.workflow-options > summary')).toHaveText('Éditeur');
  62  |   await topOptions('Planifier');
  63  |   await expect(page.locator('#schedule-form')).toBeVisible();
  64  |   await page.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).click();
  65  |   await page.getByRole('button', { name: 'Planifications', exact: true }).click();
  66  |   const card = page.locator(`[data-schedule="${schedule.id}"]`);
  67  |   await expect(card).toContainText('Toutes les 60 minutes');
  68  |   await expect(card).toContainText('Pacific/Auckland');
  69  |   await card.getByRole('button', { name: 'Version planifiée · révision 1', exact: true }).click();
  70  |   await expect(page.getByRole('dialog')).toContainText('Toutes les 60 minutes · Pacific/Auckland');
  71  |   await page.getByRole('button', { name: 'Préparer une nouvelle version…', exact: true }).click();
  72  |   await page.getByRole('button', { name: 'Archiver et configurer la nouvelle', exact: true }).click();
  73  |   const form = page.locator('#schedule-form');
  74  |   await expect(form.locator('[name=kind]')).toHaveValue('interval');
  75  |   await expect(form.locator('[name=minutes]')).toHaveValue('60');
  76  |   await expect(form.locator('[name=time]')).toHaveValue('17:20');
  77  |   await expect(form.locator('[name=timezone]')).toHaveValue('Pacific/Auckland');
  78  |   await expect(form.locator('[name=weekdays]')).toHaveValue('[0,4]');
  79  |   await expect(form.locator('[name=simulation]')).toBeChecked();
  80  |   await expect(form.locator('[name=authorize_notifications]')).not.toBeChecked();
  81  |   await expect(form.locator('[type=checkbox][required]')).not.toBeChecked();
  82  |   expect((await call('schedule.list')).filter(item => item.enabled)).toHaveLength(0);
  83  |   await page.screenshot({ path: test.info().outputPath('replacement-retained-frequency.png') });
  84  |   await form.locator('[type=checkbox][required]').check();
  85  |   await page.getByRole('button', { name: 'Activer la planification', exact: true }).click();
  86  |   await expect(form).toHaveCount(0);
  87  |   const schedules = await call('schedule.list');
  88  |   const replacement = schedules.find(item => item.id !== schedule.id);
  89  |   expect(replacement.rule).toEqual(schedule.rule);
  90  |   expect(replacement.revision).toBe(2);
  91  |   expect(replacement.notifications_authorized).toBe(false);
  92  |   await expect(page.locator(`[data-schedule="${replacement.id}"]`)).toContainText('Toutes les 60 minutes');
  93  |   await page.screenshot({ path: test.info().outputPath('schedule-frequency-card.png') });
  94  | });
  95  | 
  96  | test('reuse removes old trial examples unless explicitly kept, without carrying request context', async () => {
  97  |   const project = await call('project.create', { title: 'Qualification fictive' });
  98  |   const source = await call('workflow.save', { project: project.id, graph: { schema: 1, id: 'configuration-reuse', title: 'Méthode fictive',
  99  |     parameters: { language: 'fr', request: 'Ancien atelier', source_run: 'old-run' }, nodes: [{ id: 'qualify', title: 'Qualifier la demande', kind: 'task',
  100 |       prompt: 'Lire la demande initiale.', inputs: { demande: 'string' }, outputs: { priorite: 'string' }, sample_outputs: { priorite: 'urgente' } }], edges: [] } });
  101 |   await openWorkflow(source.id);
  102 |   await page.locator('.node[data-id=qualify]').click();
  103 |   await expect(page.locator('.design-guidance')).toContainText('contexte à la consigne');
  104 |   await expect(page.locator('.design-guidance')).toContainText('ne remplit pas automatiquement les entrées nommées');
  105 |   await topOptions('Réutiliser…');
  106 |   const keep = page.getByLabel('Conserver les exemples personnalisés de simulation', { exact: true });
  107 |   await expect(keep).not.toBeChecked();
  108 |   await page.getByLabel('Nom de la copie', { exact: true }).fill('Méthode sans anciens essais');
  109 |   await page.getByLabel('Destination', { exact: true }).selectOption(project.id);
  110 |   await page.screenshot({ path: test.info().outputPath('reuse-simulation-choice.png') });
  111 |   await page.getByRole('button', { name: 'Créer la copie', exact: true }).click();
  112 |   await expect(page.locator('.workflow-heading h1')).toHaveText('Méthode sans anciens essais');
  113 |   let data = await call('project.get', { project: project.id });
  114 |   let copy = data.workflows.find(item => item.title === 'Méthode sans anciens essais');
  115 |   copy = await call('workflow.get', { project: project.id, workflow: copy.id });
  116 |   expect(copy.nodes[0].sample_outputs).toBeUndefined();
  117 |   expect(copy.parameters).toEqual({ language: 'fr' });
  118 |   expect(copy.nodes[0].inputs).toEqual({ demande: 'string' });
  119 |   await openWorkflow(source.id);
  120 |   await topOptions('Réutiliser…');
  121 |   await page.getByLabel('Nom de la copie', { exact: true }).fill('Méthode avec exemples choisis');
  122 |   await page.getByLabel('Destination', { exact: true }).selectOption(project.id);
  123 |   await keep.check();
  124 |   await page.getByRole('button', { name: 'Créer la copie', exact: true }).click();
  125 |   await expect(page.locator('.workflow-heading h1')).toHaveText('Méthode avec exemples choisis');
  126 |   data = await call('project.get', { project: project.id });
  127 |   const model = data.workflows.find(item => item.title === 'Méthode avec exemples choisis');
  128 |   const retained = await call('workflow.get', { project: project.id, workflow: model.id });
  129 |   expect(retained.nodes[0].sample_outputs).toEqual({ priorite: 'urgente' });
  130 |   expect(retained.parameters).toEqual({ language: 'fr' });
  131 |   expect(data.runs).toHaveLength(0);
  132 |   expect(await call('workflow.get', { project: project.id, workflow: source.id })).toEqual(source);
  133 | });
  134 | 
  135 | test('a pasted repository is validated and the new block receives keyboard focus', async () => {
  136 |   const repository = path.join(directory, 'repository'); fs.mkdirSync(repository);
  137 |   execFileSync('/usr/bin/git', ['init', '--quiet', repository], { env: { HOME: directory, PATH: '/usr/bin:/bin', GIT_CONFIG_NOSYSTEM: '1' } });
  138 |   const invalid = path.join(directory, 'not-a-repository'); fs.mkdirSync(invalid);
  139 |   await page.locator('[data-workflow-route=projects]').click();
  140 |   await page.getByRole('button', { name: '+ Nouveau projet', exact: true }).click();
  141 |   await page.getByLabel('Nom du projet', { exact: true }).fill('Dépôt fictif collé');
  142 |   await page.getByLabel('Emplacement', { exact: true }).selectOption('repository');
  143 |   const field = page.getByLabel('Racine du dépôt Git local', { exact: true });
  144 |   await expect(field).toBeEditable();
  145 |   await field.fill(invalid);
  146 |   await page.getByRole('button', { name: 'Créer le projet', exact: true }).click();
  147 |   await expect(page.getByRole('alert')).toContainText('Git');
  148 |   expect((await call('bootstrap')).projects).toHaveLength(0);
  149 |   await field.fill(repository);
  150 |   await page.getByRole('button', { name: 'Créer le projet', exact: true }).click();
  151 |   await expect(page.getByRole('heading', { name: 'Dépôt fictif collé', exact: true })).toBeVisible();
  152 |   const project = (await call('bootstrap')).projects.find(item => item.title === 'Dépôt fictif collé');
  153 |   expect(project.path).toBe(repository);
  154 |   const source = await call('workflow.save', { project: project.id, graph: { schema: 1, id: 'configuration-focus', title: 'Conception clavier',
  155 |     nodes: [{ id: 'draft', kind: 'task', title: 'Préparer', prompt: 'Préparer une réponse.' }], edges: [] } });
  156 |   await openWorkflow(source.id);
  157 |   await page.getByRole('button', { name: '+ Ajouter un bloc', exact: true }).click();
  158 |   await page.locator('#add-kind').selectOption('communication');
  159 |   await page.getByLabel('Nom du bloc', { exact: true }).fill('Informer le groupe fictif');
  160 |   await page.getByRole('button', { name: 'Ajouter au workflow', exact: true }).click();
> 161 |   await expect(page.locator('#node-title')).toBeFocused();
      |                                             ^ Error: expect(locator).toBeFocused() failed
  162 |   await expect(page.locator('#node-title')).toHaveValue('Informer le groupe fictif');
  163 |   await page.getByText('Outils et plugins de cette étape', { exact: true }).click();
  164 |   await expect(page.getByLabel('Capacités de plugins (requises pour l’envoi)', { exact: true })).toBeVisible();
  165 |   await expect(page.locator('#node-form')).toContainText('Un plugin de notification compatible et vérifié est nécessaire');
  166 |   await page.screenshot({ path: test.info().outputPath('new-block-focus-and-required-capability.png') });
  167 |   await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  168 |   await page.locator('.workflow-options > summary').click();
  169 |   await page.getByRole('button', { name: 'Fichier JSON du workflow…', exact: true }).click();
  170 |   const filepath = path.join(repository, '.tricorder', 'workflows', source.id + '.json');
  171 |   await expect(page.getByLabel('Chemin du fichier enregistré', { exact: true })).toHaveValue(filepath);
  172 |   expect(fs.existsSync(filepath)).toBe(true);
  173 |   expect(JSON.parse(fs.readFileSync(filepath)).title).toBe('Conception clavier');
  174 |   await page.screenshot({ path: test.info().outputPath('actual-workflow-json-path.png') });
  175 | });
  176 | 
```