# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: editor-gestures.spec.cjs >> compact selection keeps the graph usable, keyboard movement retains focus and terminal shortcuts retain the live session
- Location: tests/editor-gestures.spec.cjs:79:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.xterm-screen:visible')
Expected substring: "GESTURE_TERMINAL_OK"
Received string:    ";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;To run a command as administrator (user \"root\"), use \"sudo <command>\".See \"man sudo_root\" for details.blegoff@wrk226:~/workflows/workspace$ command -v codex; codex --version; comm"
Timeout: 5000ms

Call log:
  - Expect "toContainText" locator('.xterm-screen:visible') with timeout 5000ms
  - waiting for locator('.xterm-screen:visible')
    14 × locator resolved to <div class="xterm-screen">…</div>
       - unexpected value ";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;To run a command as administrator (user "root"), use "sudo <command>".See "man sudo_root" for details.blegoff@wrk226:~/workflows/workspace$ command -v codex; codex --version; comm"

```

```yaml
- textbox "Terminal input"
```

# Test source

```ts
  1   | const { test, expect, _electron: electron } = require('@playwright/test');
  2   | const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  3   | const { cleanupBroker } = require('./terminal-fixture.cjs');
  4   | const root = path.resolve(__dirname, '..');
  5   | let directory, app, page, project;
  6   | const call = (action, data = {}) => page.evaluate(payload => window.studio.request(payload), { action, ...data });
  7   | const snapshot = () => call('workflow.get', { project: project.id, workflow: 'gestures' });
  8   | const card = id => page.locator(`.node[data-id="${id}"]`);
  9   | const position = item => item.evaluate(element => ({ x: element.offsetLeft, y: element.offsetTop }));
  10  | const port = (id, direction) => page.locator(`.graph-port[data-id="${id}"][data-direction="${direction}"]`);
  11  | async function save() { await page.getByRole('button', { name: 'Enregistrer', exact: true }).click(); await expect(page.locator('.workflow-heading p')).toContainText('Enregistré'); }
  12  | async function open() { await page.locator('[data-workflow-route=global]').click(); await page.locator('[data-action=open-workflow][data-id=gestures]').click(); }
  13  | async function seed(graph = {}) {
  14  |   project = await call('project.create', { title: 'Gestes du workflow synthétique' });
  15  |   await call('workflow.save', { project: project.id, graph: { schema: 1, id: 'gestures', title: 'Dessiner ensemble', nodes: [
  16  |     { id: 'source', kind: 'task', title: 'Recueillir le besoin', outputs: { text: 'string' }, position: { x: 60, y: 60 } },
  17  |     { id: 'target', kind: 'task', title: 'Préparer le plan', inputs: { text: 'string' }, position: { x: 430, y: 180 } },
  18  |     { id: 'other', kind: 'task', title: 'Relire le plan', inputs: { text: 'string' }, position: { x: 760, y: 60 } },
  19  |   ], edges: [], ...graph } }); await open();
  20  | }
  21  | async function size(width, height, zoom = 1) {
  22  |   await app.evaluate(({ BrowserWindow }, value) => { const window = BrowserWindow.getAllWindows()[0]; window.setContentSize(value.width, value.height); window.webContents.setZoomFactor(value.zoom); }, { width, height, zoom });
  23  |   await expect.poll(() => page.evaluate(() => innerWidth)).toBe(Math.round(width / zoom));
  24  | }
  25  | async function drag(item, dx, dy, finish = 'up') {
  26  |   await item.scrollIntoViewIfNeeded(); const box = await item.boundingBox();
  27  |   await page.mouse.move(box.x + box.width / 2, box.y + Math.min(28, box.height / 2)); await page.mouse.down();
  28  |   await page.mouse.move(box.x + box.width / 2 + dx, box.y + Math.min(28, box.height / 2) + dy, { steps: 5 });
  29  |   if (finish === 'escape') await page.keyboard.press('Escape');
  30  |   if (finish === 'cancel') await item.dispatchEvent('pointercancel', { pointerId: 1 });
  31  |   if (finish === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  32  |   await page.mouse.up();
  33  | }
  34  | async function expectNotesClear(){expect(await page.locator('.canvas').evaluate(canvas=>{const notes=[...canvas.querySelectorAll('.graph-note')].map(note=>({x:note.offsetLeft,y:note.offsetTop,width:note.offsetWidth,height:note.offsetHeight}));const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;const obstacles=[...canvas.querySelectorAll('.edge-label-background')].map(el=>el.getBBox());for(const path of canvas.querySelectorAll('path.edge')){const points=[...path.getAttribute('d').matchAll(/[ML]([\d.-]+),([\d.-]+)/g)].map(m=>[Number(m[1]),Number(m[2])]);for(let i=1;i<points.length;i++)obstacles.push({x:Math.min(points[i-1][0],points[i][0]),y:Math.min(points[i-1][1],points[i][1]),width:Math.max(1,Math.abs(points[i-1][0]-points[i][0])),height:Math.max(1,Math.abs(points[i-1][1]-points[i][1]))});}return notes.some(note=>obstacles.some(obstacle=>overlaps(note,obstacle)));})).toBe(false);}
  35  | 
  36  | test.beforeEach(async () => {
  37  |   directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-gestures-'));
  38  |   const bin = path.join(directory, 'bin'); fs.mkdirSync(bin);
  39  |   for (const provider of ['codex', 'claude']) fs.writeFileSync(path.join(bin, provider), '#!/bin/sh\nprintf "GESTURES_INERT\\n"\nexit 78\n', { mode: 0o755 });
  40  |   app = await electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE, args: process.env.TRICORDER_EXECUTABLE ? [] : [root], env: {
  41  |     PATH: bin + ':/usr/bin:/bin', HOME: directory, DISPLAY: process.env.DISPLAY, XAUTHORITY: process.env.XAUTHORITY, LANG: 'C.UTF-8',
  42  |     XDG_CONFIG_HOME: path.join(directory, 'config'), XDG_CACHE_HOME: path.join(directory, 'cache'), XDG_DATA_HOME: path.join(directory, 'data'),
  43  |     CODEX_HOME: path.join(directory, 'codex'), CLAUDE_CONFIG_DIR: path.join(directory, 'claude'), TRICORDER_HOME: directory, TRICORDER_STATE_DIR: directory,
  44  |     TRICORDER_RUNTIME_DIR: path.join(directory, 'runtime'), TRICORDER_AGENTS_DIR: path.join(directory, 'no-pack'), TRICORDER_TEST_MODE: '1', PYTHONDONTWRITEBYTECODE: '1',
  45  |   } }); page = await app.firstWindow(); await size(1600, 1100);
  46  |   await expect(page.getByRole('heading', { name: 'Un workflow clair.' })).toBeVisible();
  47  |   await page.locator('[data-action=terminal-toggle]').click(); await page.getByRole('button', { name: 'Ouvrir un terminal', exact: true }).click();
  48  |   await page.locator('.xterm-helper-textarea:visible').focus(); await page.keyboard.type('command -v codex; codex --version; command -v claude; claude --version'); await page.keyboard.press('Enter');
  49  |   await expect(page.locator('.xterm-screen:visible')).toContainText('GESTURES_INERT'); await page.locator('[data-action=terminal-toggle]').click();
  50  | });
  51  | test.afterEach(async () => {
  52  |   if (app) await app.close();
  53  |   for (const socket of ['cockpit/odoo-tricorder/pty.sock', 'studio-pty.sock', 'runtime/pty.sock']) await cleanupBroker(path.join(directory, socket));
  54  |   fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  55  | });
  56  | 
  57  | test('whole-card dragging updates links at each zoom and each gesture has one undo; cancellations restore the graph', async () => {
  58  |   await seed({ edges: [{ id: 'existing', from: 'source', to: 'target', mapping: { text: 'text' } }] });
  59  |   const original = await position(card('source'));
  60  |   for (const zoom of [.5, 1, 1.5]) {
  61  |     await page.locator('#zoom-label').click();
  62  |     for (let i = 0; i < 5 && zoom !== 1; i++) await page.getByRole('button', { name: zoom < 1 ? 'Réduire le graphe' : 'Agrandir le graphe', exact: true }).click();
  63  |     await expect(page.locator('#zoom-label')).toHaveText(`${zoom * 100} %`);
  64  |     await card('source').scrollIntoViewIfNeeded(); const box = await card('source').boundingBox();
  65  |     const wire = page.locator('path.edge[data-edge=existing]'), beforePath = await wire.getAttribute('d');
  66  |     await page.mouse.move(box.x + 75, box.y + 20); await page.mouse.down(); await page.mouse.move(box.x + 135, box.y + 50, { steps: 5 });
  67  |     expect(await wire.getAttribute('d')).not.toBe(beforePath);
  68  |     await page.mouse.up();
  69  |     await expect.poll(() => position(card('source'))).toEqual({ x: original.x + 60 / zoom, y: original.y + 30 / zoom });
  70  |     await page.getByRole('button', { name: 'Annuler la modification', exact: true }).click();
  71  |     expect(await position(card('source'))).toEqual(original); await expect(page.getByRole('button', { name: 'Annuler la modification', exact: true })).toBeDisabled();
  72  |   }
  73  |   await page.locator('#zoom-label').click();
  74  |   for (const cancel of ['escape', 'cancel', 'blur']) { await drag(card('source'), 90, 40, cancel); expect(await position(card('source'))).toEqual(original); }
  75  |   await drag(card('source'), 2, 2); expect(await position(card('source'))).toEqual(original);
  76  |   await drag(card('source'), 70, 50); await save(); await open(); expect(await position(card('source'))).toEqual({ x: original.x + 70, y: original.y + 50 });
  77  | });
  78  | 
  79  | test('compact selection keeps the graph usable, keyboard movement retains focus and terminal shortcuts retain the live session', async () => {
  80  |   await seed(); await size(1024, 900, 1.25);
  81  |   await card('source').click(); await expect(page.locator('.canvas-area')).toBeVisible(); await expect(page.locator('#node-title')).toHaveCount(0);
  82  |   await card('source').focus(); await page.keyboard.press('ArrowRight'); await expect(card('source')).toBeFocused(); expect(await position(card('source'))).toEqual({ x: 70, y: 60 });
  83  |   await page.keyboard.press('Shift+ArrowDown'); expect(await position(card('source'))).toEqual({ x: 70, y: 110 });
  84  |   await page.keyboard.press('Control+z'); await expect(card('source')).toBeFocused(); expect(await position(card('source'))).toEqual({ x: 70, y: 60 });
  85  |   await page.getByRole('button', { name: 'Propriétés', exact: true }).click(); await expect(page.locator('.canvas-area')).toBeHidden();
  86  |   await page.getByLabel('Consigne', { exact: true }).fill('Cette saisie doit rester disponible.');
  87  |   await page.getByRole('button', { name: 'Retour au graphe', exact: true }).click(); await expect(card('source')).toBeFocused(); await expect(page.locator('.canvas-area')).toBeVisible();
  88  |   await save(); const saved = await snapshot(), before = (await page.evaluate(() => window.tricorder.terminals.list())).filter(s => s.alive);
  89  |   await page.locator('[data-action=terminal-toggle]').click(); await page.locator('.xterm-helper-textarea:visible').focus();
  90  |   await page.keyboard.type('printf "GESTURE_TERMINAL_OK\\n"'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Control+s'); await page.keyboard.press('Control+q'); await page.keyboard.press('Enter');
> 91  |   await expect(page.locator('.xterm-screen:visible')).toContainText('GESTURE_TERMINAL_OK');
      |                                                       ^ Error: expect(locator).toContainText(expected) failed
  92  |   expect((await page.evaluate(() => window.tricorder.terminals.list())).filter(s => s.alive).map(s => [s.id,s.pid])).toEqual(before.map(s => [s.id,s.pid])); expect((await snapshot()).nodes).toEqual(saved.nodes);
  93  | });
  94  | 
  95  | test('connections support click, drag and keyboard with confirmation, direct editing and cancellation', async () => {
  96  |   await seed(); await port('source', 'out').click(); await expect(page.locator('.connection-instruction[role=status]')).toContainText('Choisissez une entrée'); await port('target', 'in').click();
  97  |   await expect(page.locator('#edge-from')).toHaveValue('source'); await expect(page.locator('#edge-to')).toHaveValue('target'); await page.getByRole('button', { name: 'Créer le lien', exact: true }).click();
  98  |   const link = page.locator('.graph-link').first(); await link.focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('dialog')).toContainText('Modifier le lien');
  99  |   await page.locator('#edge-to').selectOption('other'); await page.getByRole('button', { name: 'Enregistrer le lien', exact: true }).click(); await save();
  100 |   expect((await snapshot()).edges).toEqual([expect.objectContaining({ from: 'source', to: 'other', mapping: { text: 'text' } })]);
  101 |   await page.getByRole('button', { name: 'Annuler la modification', exact: true }).click(); await save(); expect((await snapshot()).edges[0].to).toBe('target');
  102 |   await port('source', 'out').focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Escape'); await expect(port('source', 'out')).toBeFocused(); await expect(page.locator('.connection-instruction')).toHaveCount(0);
  103 |   await port('target', 'out').focus(); await page.keyboard.press('Enter'); await port('other', 'in').focus(); await page.keyboard.press('Enter');
  104 |   await expect(page.locator('#edge-from')).toHaveValue('target'); await expect(page.locator('#edge-to')).toHaveValue('other'); await page.keyboard.press('Escape');
  105 |   const origin = await port('source', 'out').boundingBox(); await port('other', 'in').scrollIntoViewIfNeeded(); const target = await port('other', 'in').boundingBox();
  106 |   await page.mouse.move(origin.x + origin.width/2, origin.y + origin.height/2); await page.mouse.down(); await page.mouse.move(target.x + target.width/2, target.y + target.height/2, { steps: 8 }); await page.mouse.up();
  107 |   await expect(page.locator('#edge-from')).toHaveValue('source'); await expect(page.locator('#edge-to')).toHaveValue('other'); await page.getByRole('button', { name: 'Créer le lien', exact: true }).click();
  108 |   await expect(page.locator('.graph-link')).toHaveCount(2); await expect(page.locator('.node .graph-port')).toHaveCount(0);
  109 | });
  110 | 
  111 | test('notes are editable, movable and undoable presentation metadata preserved by save and portable export', async () => {
  112 |   await seed({edges:[{id:'note-route',from:'source',to:'target',mapping:{text:'text'}}]}); await page.getByRole('button', { name: '+ Note', exact: true }).click(); await page.getByLabel('Titre', { exact: true }).fill('Décision de conception'); await page.getByLabel('Texte de la note', { exact: true }).fill('Ce texte explique le dessin.\nAucun travail à lancer.'); await page.getByRole('button', { name: 'Ajouter la note', exact: true }).click();
  113 |   const note = page.locator('.graph-note'); await expect(note).toContainText('Note · sans effet sur l’exécution'); await expect(note.locator('.port,.graph-port,.pill')).toHaveCount(0); await expect(page.locator('.canvas-footer')).toContainText('3 blocs · 1 lien');
  114 |   await expectNotesClear();const before = await position(note); await drag(note.locator('.note-heading'), 50, 35);await expectNotesClear(); expect(await position(note)).toEqual({ x: before.x + 50, y: before.y + 35 });
  115 |   await note.locator('.note-heading').focus(); await page.keyboard.press('ArrowLeft'); expect((await position(note)).x).toBe(before.x + 40);
  116 |   await note.locator('.note-heading').click(); await page.getByLabel('Texte de la note', { exact: true }).fill('Version relue'); await page.getByRole('button', { name: 'Enregistrer la note', exact: true }).click(); await save();
  117 |   const graph = await snapshot(); expect(graph.nodes).toHaveLength(3); expect(graph.edges).toHaveLength(1); expect(graph.layout.notes[0].text).toBe('Version relue');
  118 |   const bundle = await call('workflow.export-portable', { project: project.id, graph }); expect(bundle.workflow.layout.notes).toEqual(graph.layout.notes);
  119 |   const imported = await call('workflow.import-portable', { project: project.id, bundle }); expect(imported.layout.notes).toEqual(graph.layout.notes);
  120 |   await note.locator('.note-heading').click(); await page.getByRole('button', { name: 'Supprimer la note', exact: true }).click(); await expect(note).toHaveCount(0); await page.getByRole('button', { name: 'Annuler la modification', exact: true }).click(); await expect(note).toContainText('Version relue');
  121 |   await save(); await open(); await expect(note).toContainText('Version relue');
  122 | });
  123 | 
  124 | test('new blocks and notes appear in the visible part of a large graph and zoom keeps its center', async () => {
  125 |   await seed({ nodes: Array.from({ length: 80 }, (_, i) => ({ id: 'step-'+i, kind: 'task', title: 'Travail '+i, position: { x: 60 + i % 10 * 330, y: 60 + Math.floor(i/10) * 220 } })) });
  126 |   const viewport = page.locator('.canvas-scroll'); await viewport.evaluate(el => { el.scrollLeft = 1700; el.scrollTop = 850; });
  127 |   const center = () => viewport.evaluate(el => ({ x: el.scrollLeft + el.clientWidth/2, y: el.scrollTop + el.clientHeight/2 })); const before = await center();
  128 |   await page.getByRole('button', { name: 'Agrandir le graphe', exact: true }).click(); const after = await center(); expect(after.x/1.1).toBeCloseTo(before.x, 0); expect(after.y/1.1).toBeCloseTo(before.y, 0);
  129 |   await page.getByRole('button', { name: '+ Ajouter un bloc', exact: true }).click(); await page.getByLabel('Nom du bloc', { exact: true }).fill('Ajout dans la zone visible'); await page.getByRole('button', { name: 'Ajouter au workflow', exact: true }).click();
  130 |   const added = page.locator('.node').filter({ hasText: 'Ajout dans la zone visible' }); await expect(added).toBeInViewport();
  131 |   await page.getByRole('button', { name: '+ Note', exact: true }).click(); await page.getByLabel('Titre', { exact: true }).fill('Note proche'); await page.getByRole('button', { name: 'Ajouter la note', exact: true }).click(); await expect(page.locator('.graph-note')).toBeInViewport();
  132 |   const collisions = await page.locator('.canvas').evaluate(canvas => {
  133 |     const note = canvas.querySelector('.graph-note').getBoundingClientRect(), added = [...canvas.querySelectorAll('.node')].find(n => n.textContent.includes('Ajout dans la zone visible'));
  134 |     const overlaps = (a,b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  135 |     return [...canvas.querySelectorAll('.node')].filter(n => overlaps(note,n.getBoundingClientRect()) || (n !== added && overlaps(added.getBoundingClientRect(),n.getBoundingClientRect()))).map(n => n.dataset.id);
  136 |   }); expect(collisions).toEqual([]);
  137 |   await page.screenshot({ path: test.info().outputPath('editor-notes-visible.png') });
  138 | });
  139 | 
  140 | test('a frozen execution exposes neither notes nor editor handles and pointer or keyboard gestures cannot change its definition', async () => {
  141 |   await seed({ nodes: [{ id: 'source', kind: 'task', title: 'Document de travail', outputs: { text: 'string' }, position: { x: 60, y: 60 } }], layout: { notes: [{ id: 'design-only', title: 'Annotation privée au dessin', text: 'NOTE_SENTINEL_DO_NOT_EXECUTE', position: { x: 350, y: 60 } }] } });
  142 |   const graph = await snapshot(), run = await call('run.start', { project: project.id, graph, simulation: true });
  143 |   await page.locator('[data-workflow-route=projects]').click(); await page.locator('.project-card').filter({ hasText: project.title }).click(); await page.getByRole('button', { name: 'Consulter', exact: true }).click();
  144 |   await expect(page.locator('.execution-map')).toBeVisible(); await expect(page.locator('.graph-port,.graph-note')).toHaveCount(0);
  145 |   const before = await position(card('source')); await drag(card('source'), 55, 35);
  146 |   // A click may open the execution detail. Return to its graph before checking.
  147 |   await page.getByRole('button', { name: 'Graphe', exact: true }).click();
  148 |   await card('source').focus(); await page.keyboard.press('ArrowRight'); expect(await position(card('source'))).toEqual(before);
  149 |   const after = await call('run.get', { run: run.id }); expect(after.run.definition.nodes).toEqual(run.definition.nodes); expect(after.run.definition.layout?.notes).toBeUndefined(); expect(after.run.original.layout.notes[0].text).toBe('NOTE_SENTINEL_DO_NOT_EXECUTE');
  150 |   expect((await snapshot()).nodes).toEqual(graph.nodes);
  151 | });
  152 | 
  153 | test('a note below adjacent blocks stays draggable while its detour avoids all cards and ports',async()=>{
  154 |   const object={type:'object',required:false};
  155 |   await seed({schema:2,nodes:['intentions','plan','scope','work'].map((id,index)=>({id,kind:'task',title:id,inputs:index?{plan:object}:{},outputs:{plan:object},position:{x:40+index*330,y:60}})),edges:[['intentions','plan'],['plan','scope'],['scope','work']].map(([from,to])=>({id:from+'-'+to,from,to,mapping:{plan:'plan'}})),layout:{notes:[{id:'memo',title:'Précision de conception',text:'Cette note ne doit cacher ni les étapes ni les liens.',position:{x:496,y:336},size:{width:280,height:180}}]}});
  156 |   const collisions=()=>page.locator('.canvas').evaluate(canvas=>{
  157 |     const boxes=[...canvas.querySelectorAll('.node,.graph-note')].map(e=>({id:e.dataset.id||e.dataset.noteId,x:e.offsetLeft,y:e.offsetTop,width:e.offsetWidth,height:e.offsetHeight}));
  158 |     const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  159 |     const hits=[];
  160 |     for(const path of canvas.querySelectorAll('path.edge')) {
  161 |       const points=[...path.getAttribute('d').matchAll(/[ML]([\d.-]+),([\d.-]+)/g)].map(m=>[+m[1],+m[2]]);
  162 |       for(let i=1;i<points.length;i++) {const a=points[i-1],b=points[i],segment={x:Math.min(a[0],b[0])+.01,y:Math.min(a[1],b[1])+.01,width:Math.max(0,Math.abs(a[0]-b[0])-.02),height:Math.max(0,Math.abs(a[1]-b[1])-.02)};for(const box of boxes)if(overlap(segment,box))hits.push(path.dataset.edge+'/'+box.id);}
  163 |     }
  164 |     return hits;
  165 |   });
  166 |   expect(await collisions()).toEqual([]);await expectNotesClear();
  167 |   const note=page.locator('.graph-note'),before=await position(note);
  168 |   await drag(note.locator('.note-heading'),40,-25);await expect(page.getByRole('dialog')).toHaveCount(0);
  169 |   expect(await position(note)).toEqual({x:before.x+40,y:before.y-25});expect(await collisions()).toEqual([]);await expectNotesClear();
  170 |   await save();await open();expect(await collisions()).toEqual([]);
  171 |   await page.screenshot({path:test.info().outputPath('note-routes-outside-source-destination.png')});
  172 | });
  173 | 
```