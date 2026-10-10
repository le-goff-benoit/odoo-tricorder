# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: desktop.spec.cjs >> roadmap: observations, human alert, measures, files, graph, preparation and preferences
- Location: tests/desktop.spec.cjs:1098:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#content')
Expected substring: "Odoo Online"
Received string:    "Lecture du projet…Chargement des releases et vérification des preuves."
Timeout: 5000ms

Call log:
  - Expect "toContainText" locator('#content') with timeout 5000ms
  - waiting for locator('#content')
    8 × locator resolved to <div id="content">…</div>
      - unexpected value "FichiersEnvironnementsSourcesBibliothèque des sources Odoo Choisir le dossier partagéProjet avec modules · profil déduit des métadonnées.Sources exactes pour analyser, développer et tester les modules ; stack locale distincte./tmp/tri-roadmap-kbw2SC/home/odoo-sources19.0CommunityAbsent/tmp/tri-roadmap-kbw2SC/home/odoo-sources/19.0Nécessaire à la voie module localeEnterpriseAbsent/tmp/tri-roadmap-kbw2SC/home/odoo-sources/19.0-enterpriseAucune dépendance Enterprise trouvéeModules du projetCode propre au projetorbital_customSéries présentes sur ce posteBibliothèque absente ou vide.Sources partagées en lecture seule. Aucune substitution par une autre série. Branches et commits vérifiés ci-dessous. Aucun téléchargement ni mise à jour automatique ; Enterprise nécessite vos accès Odoo.Profil & intégrité des sourcesConfigurer le projetCommunityBranche : Inconnue / HEAD détachée · attendue : InconnueCommit non vérifiéBranche à vérifierEnterpriseBranche : Inconnue / HEAD détachée · attendue : InconnueCommit non vérifiéBranche à vérifierDépendances transitives Enterprise / OCAAucune dépendance Enterprise trouvéeorbital_custom · customGraphe des manifests résolu dans les bibliothèques déclarées. Les dépendances externes Python/système et modules installés uniquement en base ne sont pas déduits."
    2 × locator resolved to <div id="content">…</div>
      - unexpected value "Lecture du projet…Chargement des releases et vérification des preuves."

```

```yaml
- heading "Lecture du projet…" [level=2]
- paragraph: Chargement des releases et vérification des preuves.
```

# Test source

```ts
  1098 | test('roadmap: observations, human alert, measures, files, graph, preparation and preferences', async () => {
  1099 |   test.setTimeout(120000);
  1100 |   const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-roadmap-'));
  1101 |   const home = path.join(temp, 'home'); fs.mkdirSync(home);
  1102 |   const { project, releaseId } = fixture(home);
  1103 |   write(path.join(project, 'inbox/ticket.eml'), 'Subject: Demande synthétique\n\nÀ examiner.');
  1104 |   write(path.join(project, 'changelog', releaseId, 'junit-targeted.xml'), '<testsuite tests="12" failures="0" errors="0" skipped="2"><properties><property name="odoo.task" value="T02"/></properties></testsuite>');
  1105 |   const native = path.join(temp, 'session.jsonl');
  1106 |   const date = seconds => new Date(Date.now() - 60000 + seconds * 1000).toISOString();
  1107 |   const rows = [
  1108 |     { type: 'session_meta', timestamp: date(0), payload: { id: 'synthetic-thread', timestamp: date(0) } },
  1109 |     { type: 'turn_context', timestamp: date(0), payload: { turn_id: 'turn1', model: 'synthetic-model' } },
  1110 |     { type: 'event_msg', timestamp: date(0), payload: { type: 'task_started', turn_id: 'turn1' } },
  1111 |     { type: 'token_usage_record', timestamp: date(10), payload: { thread_id: 'synthetic-thread', response_id: 'response1', thread_token_usage: { input_tokens: 100, cached_input_tokens: 0, cache_write_input_tokens: 0, output_tokens: 40, total_tokens: 140 } } },
  1112 |     { type: 'event_msg', timestamp: date(20), payload: { type: 'task_complete', turn_id: 'turn1', duration_ms: 20000 } },
  1113 |     { type: 'event_msg', timestamp: date(21), payload: { type: 'exec_approval_request', command: 'DO-NOT-EXPOSE-PRIVATE' } },
  1114 |   ];
  1115 |   write(native, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  1116 |   const env = { ...process.env, HOME: home, HISTFILE: path.join(temp, 'shell-history'),
  1117 |     TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
  1118 |     TRICORDER_HOME: home, TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') };
  1119 |   const launchOptions = { args: process.env.TRICORDER_EXECUTABLE ? [] : [root], env,
  1120 |     ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}) };
  1121 |   let app;
  1122 |   const errors = [];
  1123 |   try {
  1124 |     app = await electron.launch(launchOptions);
  1125 |     const page = await app.firstWindow();
  1126 |     page.on('pageerror', error => errors.push(error.message));
  1127 |     await expect(page.locator('#project-title')).toHaveText('orbital-industries');
  1128 |     await app.evaluate(({ dialog, clipboard, Notification, BrowserWindow }, source) => {
  1129 |       dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [source] });
  1130 |       let value = ''; clipboard.readText = () => value; clipboard.writeText = text => { value = text; };
  1131 |       globalThis.tricorderNotifications = 0;
  1132 |       Notification.isSupported = () => true;
  1133 |       Notification.prototype.show = () => { globalThis.tricorderNotifications += 1; };
  1134 |       BrowserWindow.getAllWindows()[0].isFocused = () => false;
  1135 |     }, native);
  1136 |     await projectTab(page, 'effort');
  1137 |     await expect(page.locator('#content')).toContainText('À compléter');
  1138 |     await expect(page.locator('#content')).not.toContainText('Mesures natives attribuées');
  1139 |     await expect(page.locator('#content')).not.toContainText('odoo_usage.py');
  1140 |     await projectTab(page, 'work');
  1141 |     await expect(page.locator('#content')).toContainText('Temps réalisé');
  1142 |     await expect(page.locator('[data-cockpit="associate"]')).toHaveCount(0);
  1143 |     await page.evaluate(({ project, releaseId }) => window.tricorder.cockpit.bind({ project, release: releaseId, task: 'T02', flow: '.odoo-agents/flows/maintenance.json', provider: 'codex' }), { project, releaseId });
  1144 |     await page.locator('[data-action="refresh"]').click();
  1145 |     await expect(page.locator('.work-page')).toContainText('Votre décision est attendue');
  1146 |     await expect(page.locator('.project-item.needs-human .human-alert')).toHaveText('!');
  1147 |     expect(await app.evaluate(() => globalThis.tricorderNotifications)).toBeGreaterThan(0);
  1148 |     await kanbanMode(page);
  1149 |     await page.locator('[data-plan-filter="waiting"]').click();
  1150 |     await expect(page.locator('.release-kanban .kanban-card')).toHaveCount(1);
  1151 |     await expect(page.locator('.release-kanban .kanban-card')).toContainText('T02');
  1152 |     await page.locator('[data-release-task="T02"]').click();
  1153 |     await expect(page.locator('.board-detail')).toContainText('Planifier les interventions');
  1154 |     await expect(page.locator('.board-detail')).not.toContainText('DO-NOT-EXPOSE-PRIVATE');
  1155 |     await page.locator('[data-board-close]').click();
  1156 |     await projectTab(page, 'plan');
  1157 |     await expect(page.locator('.quality-panel')).toHaveCount(0);
  1158 |     await projectTab(page, 'work');
  1159 |     await expect(page.locator('#content')).not.toContainText('DO-NOT-EXPOSE-PRIVATE');
  1160 |     const observed = await page.evaluate(p => window.tricorder.cockpit.observations(p), project);
  1161 |     expect(observed[0].usage.active_seconds).toBe(20);
  1162 |     expect(observed[0].usage.tokens.total_tokens).toBe(140);
  1163 |     await projectTab(page, 'effort');
  1164 |     await expect(page.locator('[data-time-task="T02"]')).toContainText('20 s');
  1165 |     await expect(page.locator('[data-time-task="T02"]')).toContainText('140');
  1166 |     expect(fs.existsSync(path.join(project, 'changelog', releaseId, 'effort.json'))).toBe(false);
  1167 |     await page.screenshot({ path: 'test-results/roadmap-effort.png' });
  1168 |     await projectTab(page, 'plan');
  1169 |     await expect(page.locator('.task-acceptance')).toHaveCount(0);
  1170 |     await expect(page.locator('[data-plan-mode="graph"]')).toBeVisible();
  1171 |     await expect(page.locator('[data-cockpit="graph"]')).toHaveCount(0);
  1172 |     await expect(page.locator('[data-cockpit="handoff"]')).toHaveCount(0);
  1173 |     await projectView(page, 'environments');
  1174 |     await expect(page.locator('#content')).not.toContainText('Fichiers reçus');
  1175 |     await expect(page.locator('#content')).toContainText('Stack locale');
  1176 |     await projectView(page, 'documents');
  1177 |     await expect(page.locator('[data-cockpit="handoff"]')).toHaveCount(0);
  1178 |     await page.locator('[data-files="inbox"]').first().click();
  1179 |     await page.locator('[data-preview="inbox/ticket.eml"]').click();
  1180 |     await expect(page.locator('.document-text')).toContainText('Demande synthétique');
  1181 |     await page.locator('[data-action="modal-close"]').click();
  1182 |     await page.locator('#content [data-cockpit="search"]').click();
  1183 |     await page.locator('#global-query').fill('facturation');
  1184 |     await page.locator('[data-cockpit="run-search"]').click();
  1185 |     await expect(page.locator('.search-result').first()).toBeVisible();
  1186 |     await page.locator('[data-action="modal-close"]').click();
  1187 |     if (!(await page.locator('.sidebar-tools').evaluate(el => el.open))) await page.locator('.sidebar-tools > summary').click();
  1188 |     await page.locator('[data-cockpit="palette"]').click();
  1189 |     await page.locator('#skill-provider').selectOption('codex');
  1190 |     await page.locator('#skill-filter').fill('odoo-env');
  1191 |     await page.locator('[data-skill="odoo-env"]').click();
  1192 |     await expect(page.locator('#modal')).toContainText('$odoo-env');
  1193 |     await page.locator('[data-action="modal-close"]').click();
  1194 |     await projectView(page, 'sources');
  1195 |     await page.locator('[data-cockpit="profile"]').click();
  1196 |     await page.locator('#profile-kind').selectOption('online');
  1197 |     await page.locator('[data-cockpit="save-profile"]').click();
> 1198 |     await expect(page.locator('#content')).toContainText('Odoo Online');
       |                                            ^ Error: expect(locator).toContainText(expected) failed
  1199 |     await page.locator('[data-cockpit="preferences"]').click();
  1200 |     await page.locator('#pref-size').fill('16');
  1201 |     await page.locator('#pref-contrast').check();
  1202 |     await page.locator('#preferences-form button[type=submit]').click();
  1203 |     await expect(page.locator('html')).toHaveClass('high-contrast');
  1204 |     const persisted = JSON.parse(fs.readFileSync(path.join(temp, 'state/settings.json')));
  1205 |     expect(persisted.ui.fontSize).toBe(16);
  1206 |     expect(persisted.profiles[project].kind).toBe('online');
  1207 |     expect(persisted.bindings[0].nativeId).toBe('synthetic-thread');
  1208 |     const work = path.join(temp, 'worktree'); fs.mkdirSync(work);
  1209 |     await app.evaluate(({ dialog }, target) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [target] }); }, work);
  1210 |     await page.locator('[data-cockpit="profile"]').click();
  1211 |     await page.locator('[data-cockpit="working-directory"]').click();
  1212 |     await expect(page.locator('#modal')).not.toBeVisible();
  1213 |     await projectTab(page, 'plan');
  1214 |     await page.keyboard.press('Control+Shift+T');
  1215 |     await expect(page.locator('.terminal-host')).toHaveCount(1);
  1216 |     const terminal = await page.evaluate(async () => (await window.tricorder.terminals.list())[0]);
  1217 |     expect(terminal.workingDirectory).toBe(work);
  1218 |     expect(terminal.task).toBeNull();
  1219 |     await expect(page.locator('#terminal-context')).toBeHidden();
  1220 |     const activeTerminalTab = page.locator('.terminal-tab.active [data-session]');
  1221 |     await activeTerminalTab.focus();
  1222 |     await expect(page.locator('#terminal-context')).toBeVisible();
  1223 |     await expect(page.locator('.terminal-session-title')).toHaveText(await activeTerminalTab.getAttribute('aria-label'));
  1224 |     await page.locator('.xterm-helper-textarea:visible').focus();
  1225 |     await expect(page.locator('#terminal-context')).toBeHidden();
  1226 |     const terminalAfterFocus = (await page.evaluate(() => window.tricorder.terminals.list()))[0];
  1227 |     expect([terminalAfterFocus.id, terminalAfterFocus.pid]).toEqual([terminal.id, terminal.pid]);
  1228 |     await expect(page.locator('.provider-icon[aria-label="Shell"]').first()).toBeVisible();
  1229 |     expect((await page.evaluate(async () => (await window.tricorder.terminals.list())[0])).task).toBeNull();
  1230 |     fs.appendFileSync(native, JSON.stringify({ type: 'event_msg', timestamp: new Date().toISOString(), payload: { type: 'task_started', turn_id: 'turn2' } }) + '\n');
  1231 |     await expect(page.locator('.human-alert')).toHaveCount(0, { timeout: 15000 });
  1232 |     await projectTab(page, 'work');
  1233 |     await page.screenshot({ path: 'test-results/roadmap-agents.png' });
  1234 |     expect(errors).toEqual([]);
  1235 |   } finally {
  1236 |     if (app) await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
  1237 |     await cleanupBroker(path.join(temp, 'run/pty.sock'));
  1238 |     fs.rmSync(temp, { recursive: true, force: true });
  1239 |   }
  1240 | });
  1241 | 
  1242 | test('intentions, dependency graph and concurrent activities remain usable at compact size and zoom', async () => {
  1243 |   const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-intentions-'));
  1244 |   const home = path.join(temp, 'home'); fs.mkdirSync(home);
  1245 |   const { project, releaseId } = fixture(home);
  1246 |   write(path.join(project, 'changelog', releaseId, 'intentions.json'), { schema: 1, revision: 1, items: [
  1247 |     { id: 'I01', text: 'Conserver la demande originale et ses décisions.', purpose: 'Rendre les factures fiables', status: 'planned',
  1248 |       source: { path: `changelog/${releaseId}/demande.md`, original: 'Source figée initiale' }, tasks: ['T01', 'T03'], constraints: ['Copie locale'], questions: [], decisions: [{ at: '2026-09-15', text: 'Contrôler la somme des parties.' }] },
  1249 |   ] });
  1250 |   const now = new Date().toISOString();
  1251 |   write(path.join(project, '.odoo-agents/orchestration.json'), { schema: 1, id: 'main-stable', project, release: releaseId,
  1252 |     status: 'active', phase: 'Examine le résultat de T01', owner: 'Codex principal', provider: 'codex', model: 'principal',
  1253 |     started_at: now, phase_started_at: now, updated_at: now, authorized_tasks: ['T01', 'T02', 'T03'] });
  1254 |   const app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root],
  1255 |     ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
  1256 |     env: { ...process.env, HOME: home, TRICORDER_HOME: home,
  1257 |       TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
  1258 |       TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') } });
  1259 |   const errors = [];
  1260 |   try {
  1261 |     const page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
  1262 |     await page.setViewportSize({ width: 1440, height: 900 });
  1263 |     await expect(page.locator('#release-select')).toHaveValue(releaseId);
  1264 |     await app.evaluate(({ ipcMain }, { project, releaseId, now }) => {
  1265 |       ipcMain.removeHandler('observations');
  1266 |       ipcMain.handle('observations', () => ['T02', 'T03'].map((task, i) => ({ id: task, project, release: releaseId, task, provider: 'claude', role: i ? 'odoo-tester' : 'odoo-developer',
  1267 |         agents: [{ nativeId: task, state: i ? 'tool' : 'active', stale: false, startedAt: now, stageStartedAt: now, lastAt: now, events: [] }] })));
  1268 |     }, { project, releaseId, now });
  1269 |     await expect(page.locator('#activity-strip')).toBeHidden();
  1270 |     const nav = await page.locator('#tabs [data-view]').evaluateAll(nodes => nodes.map(n => n.dataset.view));
  1271 |     expect(nav.indexOf('intentions')).toBeLessThan(nav.indexOf('plan'));
  1272 |     await projectTab(page, 'intentions');
  1273 |     await page.locator('[data-intention="I01"]').click();
  1274 |     await expect(page.locator('.intention-detail')).toContainText('Conserver la demande originale');
  1275 |     await expect(page.locator('.intention-detail')).toContainText('Contrôler la somme des parties');
  1276 |     await page.locator('.intention-source summary').click();
  1277 |     await expect(page.locator('.intention-source pre')).toContainText('Source figée initiale');
  1278 |     await page.screenshot({ path: 'test-results/intentions-1440.png' });
  1279 |     await page.locator('.intention-detail [data-task="T01"]').click();
  1280 |     await expect(page.locator('#task-modal')).toContainText('Critères d’acceptation');
  1281 |     await expect(page.locator('#task-modal [data-intention]')).toHaveCount(0);
  1282 |     await page.keyboard.press('Escape');
  1283 |     await projectTab(page, 'plan');
  1284 |     await page.locator('[data-plan-mode="list"]').click();
  1285 |     await expect(page.locator('[data-task="main-stable"]')).toHaveCount(0);
  1286 |     await page.locator('[data-plan-filter="executing"]').click();
  1287 |     await expect(page.locator('.task-card')).toHaveCount(2);
  1288 |     await page.locator('[data-plan-filter="all"]').click();
  1289 |     await page.locator('[data-plan-mode="graph"]').click();
  1290 |     await page.locator('[data-graph-select="T03"]').focus();
  1291 |     await page.keyboard.press('Enter');
  1292 |     await expect(page.locator('.graph-selection')).toContainText('En amont : T01, T02');
  1293 |     await expect(page.locator('[data-graph-select="T03"]')).toBeFocused();
  1294 |     expect(await page.locator('.dependency-canvas > svg').evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(500);
  1295 |     await expect(page.locator('.dependency-edge')).toHaveCount(2);
  1296 |     const stable = await page.locator('.dependency-canvas').evaluate(el => { window.graphNodeBeforeRefresh = el; return true; });
  1297 |     expect(stable).toBe(true);
  1298 |     await page.locator('[data-action="refresh"]').evaluate(el => el.click());
```