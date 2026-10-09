# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: desktop.spec.cjs >> roadmap: observations, human alert, measures, files, graph, preparation and preferences
- Location: tests/desktop.spec.cjs:1083:1

# Error details

```
Error: expect(locator).toBeHidden() failed

Locator:  locator('#terminal-context')
Expected: hidden
Received: visible
Timeout:  5000ms

Call log:
  - Expect "toBeHidden" locator('#terminal-context') with timeout 5000ms
  - waiting for locator('#terminal-context')
    14 × locator resolved to <div id="terminal-context" class="terminal-context">…</div>
       - unexpected value "visible"

```

# Test source

```ts
  1104 |   const launchOptions = { args: process.env.TRICORDER_EXECUTABLE ? [] : [root], env,
  1105 |     ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}) };
  1106 |   let app;
  1107 |   const errors = [];
  1108 |   try {
  1109 |     app = await electron.launch(launchOptions);
  1110 |     const page = await app.firstWindow();
  1111 |     page.on('pageerror', error => errors.push(error.message));
  1112 |     await expect(page.locator('#project-title')).toHaveText('orbital-industries');
  1113 |     await app.evaluate(({ dialog, clipboard, Notification, BrowserWindow }, source) => {
  1114 |       dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [source] });
  1115 |       let value = ''; clipboard.readText = () => value; clipboard.writeText = text => { value = text; };
  1116 |       globalThis.tricorderNotifications = 0;
  1117 |       Notification.isSupported = () => true;
  1118 |       Notification.prototype.show = () => { globalThis.tricorderNotifications += 1; };
  1119 |       BrowserWindow.getAllWindows()[0].isFocused = () => false;
  1120 |     }, native);
  1121 |     await projectTab(page, 'effort');
  1122 |     await expect(page.locator('#content')).toContainText('À compléter');
  1123 |     await expect(page.locator('#content')).not.toContainText('Mesures natives attribuées');
  1124 |     await expect(page.locator('#content')).not.toContainText('odoo_usage.py');
  1125 |     await projectTab(page, 'work');
  1126 |     await expect(page.locator('#content')).toContainText('Temps réalisé');
  1127 |     await expect(page.locator('[data-cockpit="associate"]')).toHaveCount(0);
  1128 |     await page.evaluate(({ project, releaseId }) => window.tricorder.cockpit.bind({ project, release: releaseId, task: 'T02', flow: '.odoo-agents/flows/maintenance.json', provider: 'codex' }), { project, releaseId });
  1129 |     await page.locator('[data-action="refresh"]').click();
  1130 |     await expect(page.locator('.work-page')).toContainText('Votre décision est attendue');
  1131 |     await expect(page.locator('.project-item.needs-human .human-alert')).toHaveText('!');
  1132 |     expect(await app.evaluate(() => globalThis.tricorderNotifications)).toBeGreaterThan(0);
  1133 |     await kanbanMode(page);
  1134 |     await page.locator('[data-plan-filter="waiting"]').click();
  1135 |     await expect(page.locator('.release-kanban .kanban-card')).toHaveCount(1);
  1136 |     await expect(page.locator('.release-kanban .kanban-card')).toContainText('T02');
  1137 |     await page.locator('[data-release-task="T02"]').click();
  1138 |     await expect(page.locator('.board-detail')).toContainText('Planifier les interventions');
  1139 |     await expect(page.locator('.board-detail')).not.toContainText('DO-NOT-EXPOSE-PRIVATE');
  1140 |     await page.locator('[data-board-close]').click();
  1141 |     await projectTab(page, 'plan');
  1142 |     await expect(page.locator('.quality-panel')).toHaveCount(0);
  1143 |     await projectTab(page, 'work');
  1144 |     await expect(page.locator('#content')).not.toContainText('DO-NOT-EXPOSE-PRIVATE');
  1145 |     const observed = await page.evaluate(p => window.tricorder.cockpit.observations(p), project);
  1146 |     expect(observed[0].usage.active_seconds).toBe(20);
  1147 |     expect(observed[0].usage.tokens.total_tokens).toBe(140);
  1148 |     await projectTab(page, 'effort');
  1149 |     await expect(page.locator('[data-time-task="T02"]')).toContainText('20 s');
  1150 |     await expect(page.locator('[data-time-task="T02"]')).toContainText('140');
  1151 |     expect(fs.existsSync(path.join(project, 'changelog', releaseId, 'effort.json'))).toBe(false);
  1152 |     await page.screenshot({ path: 'test-results/roadmap-effort.png' });
  1153 |     await projectTab(page, 'plan');
  1154 |     await expect(page.locator('.task-acceptance')).toHaveCount(0);
  1155 |     await expect(page.locator('[data-plan-mode="graph"]')).toBeVisible();
  1156 |     await expect(page.locator('[data-cockpit="graph"]')).toHaveCount(0);
  1157 |     await expect(page.locator('[data-cockpit="handoff"]')).toHaveCount(0);
  1158 |     await projectView(page, 'environments');
  1159 |     await expect(page.locator('#content')).not.toContainText('Fichiers reçus');
  1160 |     await expect(page.locator('#content')).toContainText('Stack locale');
  1161 |     await projectView(page, 'documents');
  1162 |     await expect(page.locator('[data-cockpit="handoff"]')).toHaveCount(0);
  1163 |     await page.locator('[data-files="inbox"]').first().click();
  1164 |     await page.locator('[data-preview="inbox/ticket.eml"]').click();
  1165 |     await expect(page.locator('.document-text')).toContainText('Demande synthétique');
  1166 |     await page.locator('[data-action="modal-close"]').click();
  1167 |     await page.locator('#content [data-cockpit="search"]').click();
  1168 |     await page.locator('#global-query').fill('facturation');
  1169 |     await page.locator('[data-cockpit="run-search"]').click();
  1170 |     await expect(page.locator('.search-result').first()).toBeVisible();
  1171 |     await page.locator('[data-action="modal-close"]').click();
  1172 |     if (!(await page.locator('.sidebar-tools').evaluate(el => el.open))) await page.locator('.sidebar-tools > summary').click();
  1173 |     await page.locator('[data-cockpit="palette"]').click();
  1174 |     await page.locator('#skill-provider').selectOption('codex');
  1175 |     await page.locator('#skill-filter').fill('odoo-env');
  1176 |     await page.locator('[data-skill="odoo-env"]').click();
  1177 |     await expect(page.locator('#modal')).toContainText('$odoo-env');
  1178 |     await page.locator('[data-action="modal-close"]').click();
  1179 |     await projectView(page, 'sources');
  1180 |     await page.locator('[data-cockpit="profile"]').click();
  1181 |     await page.locator('#profile-kind').selectOption('online');
  1182 |     await page.locator('[data-cockpit="save-profile"]').click();
  1183 |     await expect(page.locator('#content')).toContainText('Odoo Online');
  1184 |     await page.locator('[data-cockpit="preferences"]').click();
  1185 |     await page.locator('#pref-size').fill('16');
  1186 |     await page.locator('#pref-contrast').check();
  1187 |     await page.locator('#preferences-form button[type=submit]').click();
  1188 |     await expect(page.locator('html')).toHaveClass('high-contrast');
  1189 |     const persisted = JSON.parse(fs.readFileSync(path.join(temp, 'state/settings.json')));
  1190 |     expect(persisted.ui.fontSize).toBe(16);
  1191 |     expect(persisted.profiles[project].kind).toBe('online');
  1192 |     expect(persisted.bindings[0].nativeId).toBe('synthetic-thread');
  1193 |     const work = path.join(temp, 'worktree'); fs.mkdirSync(work);
  1194 |     await app.evaluate(({ dialog }, target) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [target] }); }, work);
  1195 |     await page.locator('[data-cockpit="profile"]').click();
  1196 |     await page.locator('[data-cockpit="working-directory"]').click();
  1197 |     await expect(page.locator('#modal')).not.toBeVisible();
  1198 |     await projectTab(page, 'plan');
  1199 |     await page.keyboard.press('Control+Shift+T');
  1200 |     await expect(page.locator('.terminal-host')).toHaveCount(1);
  1201 |     const terminal = await page.evaluate(async () => (await window.tricorder.terminals.list())[0]);
  1202 |     expect(terminal.workingDirectory).toBe(work);
  1203 |     expect(terminal.task).toBeNull();
> 1204 |     await expect(page.locator('#terminal-context')).toBeHidden();
       |                                                     ^ Error: expect(locator).toBeHidden() failed
  1205 |     await expect(page.locator('.provider-icon[aria-label="Shell"]').first()).toBeVisible();
  1206 |     expect((await page.evaluate(async () => (await window.tricorder.terminals.list())[0])).task).toBeNull();
  1207 |     fs.appendFileSync(native, JSON.stringify({ type: 'event_msg', timestamp: new Date().toISOString(), payload: { type: 'task_started', turn_id: 'turn2' } }) + '\n');
  1208 |     await expect(page.locator('.human-alert')).toHaveCount(0, { timeout: 15000 });
  1209 |     await projectTab(page, 'work');
  1210 |     await page.screenshot({ path: 'test-results/roadmap-agents.png' });
  1211 |     expect(errors).toEqual([]);
  1212 |   } finally {
  1213 |     if (app) await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
  1214 |     await cleanupBroker(path.join(temp, 'run/pty.sock'));
  1215 |     fs.rmSync(temp, { recursive: true, force: true });
  1216 |   }
  1217 | });
  1218 | 
  1219 | test('intentions, dependency graph and concurrent activities remain usable at compact size and zoom', async () => {
  1220 |   const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-intentions-'));
  1221 |   const home = path.join(temp, 'home'); fs.mkdirSync(home);
  1222 |   const { project, releaseId } = fixture(home);
  1223 |   write(path.join(project, 'changelog', releaseId, 'intentions.json'), { schema: 1, revision: 1, items: [
  1224 |     { id: 'I01', text: 'Conserver la demande originale et ses décisions.', purpose: 'Rendre les factures fiables', status: 'planned',
  1225 |       source: { path: `changelog/${releaseId}/demande.md`, original: 'Source figée initiale' }, tasks: ['T01', 'T03'], constraints: ['Copie locale'], questions: [], decisions: [{ at: '2026-09-15', text: 'Contrôler la somme des parties.' }] },
  1226 |   ] });
  1227 |   const now = new Date().toISOString();
  1228 |   write(path.join(project, '.odoo-agents/orchestration.json'), { schema: 1, id: 'main-stable', project, release: releaseId,
  1229 |     status: 'active', phase: 'Examine le résultat de T01', owner: 'Codex principal', provider: 'codex', model: 'principal',
  1230 |     started_at: now, phase_started_at: now, updated_at: now, authorized_tasks: ['T01', 'T02', 'T03'] });
  1231 |   const app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root],
  1232 |     ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
  1233 |     env: { ...process.env, HOME: home, TRICORDER_HOME: home,
  1234 |       TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
  1235 |       TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') } });
  1236 |   const errors = [];
  1237 |   try {
  1238 |     const page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
  1239 |     await page.setViewportSize({ width: 1440, height: 900 });
  1240 |     await expect(page.locator('#release-select')).toHaveValue(releaseId);
  1241 |     await app.evaluate(({ ipcMain }, { project, releaseId, now }) => {
  1242 |       ipcMain.removeHandler('observations');
  1243 |       ipcMain.handle('observations', () => ['T02', 'T03'].map((task, i) => ({ id: task, project, release: releaseId, task, provider: 'claude', role: i ? 'odoo-tester' : 'odoo-developer',
  1244 |         agents: [{ nativeId: task, state: i ? 'tool' : 'active', stale: false, startedAt: now, stageStartedAt: now, lastAt: now, events: [] }] })));
  1245 |     }, { project, releaseId, now });
  1246 |     await expect(page.locator('#activity-strip')).toBeHidden();
  1247 |     const nav = await page.locator('#tabs [data-view]').evaluateAll(nodes => nodes.map(n => n.dataset.view));
  1248 |     expect(nav.indexOf('intentions')).toBeLessThan(nav.indexOf('plan'));
  1249 |     await projectTab(page, 'intentions');
  1250 |     await page.locator('[data-intention="I01"]').click();
  1251 |     await expect(page.locator('.intention-detail')).toContainText('Conserver la demande originale');
  1252 |     await expect(page.locator('.intention-detail')).toContainText('Contrôler la somme des parties');
  1253 |     await page.locator('.intention-source summary').click();
  1254 |     await expect(page.locator('.intention-source pre')).toContainText('Source figée initiale');
  1255 |     await page.screenshot({ path: 'test-results/intentions-1440.png' });
  1256 |     await page.locator('.intention-detail [data-task="T01"]').click();
  1257 |     await expect(page.locator('#task-modal')).toContainText('Critères d’acceptation');
  1258 |     await expect(page.locator('#task-modal [data-intention]')).toHaveCount(0);
  1259 |     await page.keyboard.press('Escape');
  1260 |     await projectTab(page, 'plan');
  1261 |     await page.locator('[data-plan-mode="list"]').click();
  1262 |     await expect(page.locator('[data-task="main-stable"]')).toHaveCount(0);
  1263 |     await page.locator('[data-plan-filter="executing"]').click();
  1264 |     await expect(page.locator('.task-card')).toHaveCount(2);
  1265 |     await page.locator('[data-plan-filter="all"]').click();
  1266 |     await page.locator('[data-plan-mode="graph"]').click();
  1267 |     await page.locator('[data-graph-select="T03"]').focus();
  1268 |     await page.keyboard.press('Enter');
  1269 |     await expect(page.locator('.graph-selection')).toContainText('En amont : T01, T02');
  1270 |     await expect(page.locator('[data-graph-select="T03"]')).toBeFocused();
  1271 |     expect(await page.locator('.dependency-canvas > svg').evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(500);
  1272 |     await expect(page.locator('.dependency-edge')).toHaveCount(2);
  1273 |     const stable = await page.locator('.dependency-canvas').evaluate(el => { window.graphNodeBeforeRefresh = el; return true; });
  1274 |     expect(stable).toBe(true);
  1275 |     await page.locator('[data-action="refresh"]').evaluate(el => el.click());
  1276 |     await expect(page.locator('#sync-status')).toContainText('À jour');
  1277 |     expect(await page.locator('.dependency-canvas').evaluate(el => el === window.graphNodeBeforeRefresh)).toBe(true);
  1278 |     await page.screenshot({ path: 'test-results/dependencies-1440.png' });
  1279 |     await app.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; win.setSize(1000, 700); win.webContents.setZoomFactor(1.25); });
  1280 |     await page.setViewportSize({ width: 1000, height: 700 });
  1281 |     await expect(page.locator('#tabs [data-view="intentions"]')).toBeInViewport();
  1282 |     await page.locator('[data-plan-mode="list"]').click();
  1283 |     await expect(page.locator('[data-plan-mode="list"]')).toBeFocused();
  1284 |     await projectTab(page, 'work');
  1285 |     await expect(page.locator('#content')).toContainText('Temps réalisé');
  1286 |     const metrics = await page.evaluate(() => {
  1287 |       const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
  1288 |       const luminance = value => rgb(value).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  1289 |       const ratios = [...document.querySelectorAll('.activity-row strong, .activity-row > span, #content h2')].map(el => {
  1290 |         let parent = el, background;
  1291 |         while (parent) { background = getComputedStyle(parent).backgroundColor; if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') break; parent = parent.parentElement; }
  1292 |         const fg = luminance(getComputedStyle(el).color), bg = luminance(background || 'rgb(0, 0, 0)');
  1293 |         return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05);
  1294 |       });
  1295 |       return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, ratios };
  1296 |     });
  1297 |     expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
  1298 |     expect(Math.min(...metrics.ratios)).toBeGreaterThanOrEqual(4.5);
  1299 |     fs.writeFileSync('test-results/ui-measurements.json', JSON.stringify(metrics, null, 2));
  1300 |     await page.screenshot({ path: 'test-results/activities-1000-zoom125.png' });
  1301 |     await app.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; win.setSize(1000, 900); win.webContents.setZoomFactor(1); });
  1302 |     await page.setViewportSize({ width: 1000, height: 900 });
  1303 |     await kanbanMode(page);
  1304 |     await page.screenshot({ path: 'test-results/orchestration-1000.png' });
```