// Local Electron audit. All projects, provider binaries, state and PTYs are synthetic.
const { _electron: electron, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cleanupBroker } = require('../../../tests/terminal-fixture.cjs');
const root = path.resolve(__dirname, '../../..');
const output = __dirname;
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-audit-ui-'));
const facts = {};
let app, page;
const call = (action, data = {}) => page.evaluate(payload => window.studio.request(payload), { action, ...data });
const shot = name => page.screenshot({ path: path.join(output, name), fullPage: true });

(async () => {
  try {
    fs.mkdirSync(path.join(directory, 'bin'));
    fs.writeFileSync(path.join(directory, 'bin/codex'), '#!/usr/bin/python3\nimport os,sys\nif "--" in sys.argv:\n with open(os.environ["TRICORDER_AUDIT_MARKER"], "a") as f: f.write("launch\\n")\nprint("SYNTHETIC AGENT EXITED")\n', { mode: 0o755 });
    app = await electron.launch({ args: [root, '--workflow-studio'], env: { ...process.env, HOME: directory, PATH: path.join(directory, 'bin') + ':' + process.env.PATH, TRICORDER_STATE_DIR: directory, TRICORDER_HOME: directory, TRICORDER_TEST_MODE: '1', TRICORDER_AUDIT_MARKER: path.join(directory, 'launches') } });
    page = await app.firstWindow();
    await expect(page.getByRole('heading', { name: 'Un workflow clair.' })).toBeVisible();
    const project = await call('project.create', { title: 'Projet de revue synthétique' });
    const graph = { schema: 1, id: 'audit-plan', title: 'Préparer et valider un plan', nodes: [
      { id: 'plan', kind: 'task', title: 'Préparer le plan', outputs: { plan: 'string' }, validation: 'contract', sample_outputs: { plan: 'PLAN_SENTINEL — Modifier la recherche, puis vérifier son résultat.' }, sample: 'Le plan a été préparé.', position: { x: 40, y: 90 } },
      { id: 'approve', kind: 'decision', title: 'Valider le plan', inputs: { plan: 'string' }, question: 'Le plan affiché vous convient-il ?', position: { x: 350, y: 90 } },
    ], edges: [{ id: 'plan-approve', from: 'plan', to: 'approve', mapping: { plan: 'plan' } }] };
    const saved = await call('workflow.save', { project: project.id, graph });
    const run = await call('run.start', { project: project.id, graph: saved, simulation: true });
    await expect.poll(async () => (await call('run.get', { run: run.id })).run.nodes.approve.status).toBe('waiting');
    await page.locator('[data-workflow-route="projects"]').click();
    await page.locator('.project-card').filter({ hasText: project.title }).click();
    await page.getByRole('button', { name: 'Consulter', exact: true }).click();
    await page.locator('.node[data-id="approve"]').click();
    facts.decisionInspectorShowsPlan = (await page.locator('#inspector').innerText()).includes('PLAN_SENTINEL');
    facts.decisionInputExists = (await call('run.get', { run: run.id })).run.nodes.approve.inputs.plan.includes('PLAN_SENTINEL');
    await shot('decision-without-input.png');
    await page.locator('.node[data-id="plan"]').click();
    facts.producerInspectorShowsPlan = (await page.locator('#inspector').innerText()).includes('PLAN_SENTINEL');
    await page.getByRole('tab', { name: 'Rapport', exact: true }).click();
    await expect(page.locator('#document-view')).toContainText('Réalisation');
    facts.reportShowsPlan = (await page.locator('#document-view').innerText()).includes('PLAN_SENTINEL');
    facts.reportProofLinksActionable = await page.locator('#document-view a[href]').count();
    await shot('report-without-output.png');

    await page.getByRole('button', { name: 'Revenir à l’éditeur', exact: true }).click();
    await page.locator('.node[data-id="plan"]').click();
    await page.getByLabel('Nom du bloc', { exact: true }).fill('Titre modifié dans le formulaire');
    const file = path.join(project.path, '.tricorder/workflows/audit-plan.json');
    const fromTerminal = JSON.parse(fs.readFileSync(file, 'utf8'));
    fromTerminal.description = 'Changement concurrent depuis le terminal';
    fs.writeFileSync(file, JSON.stringify(fromTerminal, null, 2));
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page.locator('#feedback')).toContainText('Le fichier a été modifié depuis le terminal');
    facts.saveConflict = await page.locator('#feedback').innerText();
    await page.locator('.workflow-options > summary').click();
    await page.getByRole('button', { name: 'Recharger et valider', exact: true }).click();
    await expect(page.locator('#feedback')).toContainText('Enregistrez-les avant de recharger');
    facts.reloadConflict = await page.locator('#feedback').innerText();
    await shot('editor-conflict-no-recovery.png');

    const c = await call('conversation.open', { project: project.id, graph: {schema: 1, id:'agent-exit', title:'Reprise synthétique', nodes:[{id:'work',kind:'task',title:'Travail'}],edges:[]}, provider:'codex' });
    const first = await page.evaluate(payload => window.tricorder.workflowTerminal(payload), { project: project.id, conversation: c.id });
    await expect.poll(() => fs.existsSync(path.join(directory, 'launches')) ? fs.readFileSync(path.join(directory, 'launches'), 'utf8').trim().split('\n').length : 0).toBe(1);
    await expect.poll(async () => (await page.evaluate(() => window.tricorder.terminals.list())).find(s => s.id === first.id)?.program).toBe('bash');
    const again = await page.evaluate(payload => window.tricorder.workflowTerminal(payload), { project: project.id, conversation: c.id });
    facts.closedAgentConversationReturnsSameShell = first.id === again.id;
    facts.providerLaunchCountAfterReopen = fs.readFileSync(path.join(directory, 'launches'), 'utf8').trim().split('\n').length;
    facts.shellStillAlive = (await page.evaluate(() => window.tricorder.terminals.list())).find(s => s.id === first.id)?.alive;

    // A fresh renderer is the current practical escape from the edit conflict.
    // Its stored workflow is intact; the unsaved form edit is intentionally lost
    // in this disposable fixture only.
    await page.reload();
    await page.locator('[data-workflow-route="projects"]').click();
    await page.locator('.project-card').filter({ hasText: project.title }).click();
    await page.getByRole('button', { name: 'Consulter', exact: true }).click();
    await page.setViewportSize({width:1024,height:768});
    await page.locator('[data-action="terminal"]').click();
    await expect(page.locator('#terminal-workspace')).toBeVisible();
    await page.locator('.node[data-id="approve"]').click();
    await expect(page.locator('#inspector')).toContainText('Le plan affiché vous convient-il');
    facts.compactSplitGeometry = await page.evaluate(() => {
      const root = document.querySelector('#workflow-panel').shadowRoot;
      const bounds = element => {const b=element.getBoundingClientRect();return {width:Math.round(b.width),height:Math.round(b.height)};};
      return {terminal:bounds(document.querySelector('#terminal-workspace')),workflow:bounds(document.querySelector('#workflow-panel')),canvas:bounds(root.querySelector('.canvas-scroll')),inspector:bounds(root.querySelector('#inspector'))};
    });
    await shot('terminal-inspector-1024.png');
  } finally {
    fs.writeFileSync(path.join(output, 'ui-results.json'), JSON.stringify(facts, null, 2) + '\n');
    if (app) { if (page && !page.isClosed()) await page.evaluate(() => window.tricorder.terminals.list()); await app.close(); }
    await cleanupBroker(path.join(directory, 'cockpit/odoo-tricorder/pty.sock'));
    await cleanupBroker(path.join(directory, 'studio-pty.sock'));
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
  console.log(JSON.stringify(facts, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
