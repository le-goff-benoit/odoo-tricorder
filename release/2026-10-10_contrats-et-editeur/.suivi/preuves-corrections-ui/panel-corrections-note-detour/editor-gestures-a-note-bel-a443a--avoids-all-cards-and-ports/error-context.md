# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: editor-gestures.spec.cjs >> a note below adjacent blocks stays draggable while its detour avoids all cards and ports
- Location: tests/editor-gestures.spec.cjs:153:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('dialog')
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" getByRole('dialog') with timeout 5000ms
  - waiting for getByRole('dialog')
    14 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - complementary "Tricorder" [ref=e3]:
    - navigation "Navigation principale" [ref=e9]:
      - button "Activité" [ref=e10] [cursor=pointer]
      - button "Workflows" [ref=e17] [cursor=pointer]
      - button "Projets" [ref=e24] [cursor=pointer]
    - generic [ref=e28]: Accès rapide aux projets
    - generic [ref=e29]:
      - generic [ref=e30]: Rechercher un projet
      - searchbox "Rechercher un projet" [ref=e31]
    - button "Gestes du workflow synthétique" [ref=e33] [cursor=pointer]
    - generic [ref=e35]:
      - navigation "Configuration" [ref=e36]:
        - button "Planifications" [ref=e37] [cursor=pointer]
        - button "Connexions" [ref=e41] [cursor=pointer]
      - button "Paramètres" [ref=e48] [cursor=pointer]
      - group [ref=e52]:
        - generic "Outils et aide" [ref=e53] [cursor=pointer]
  - main [ref=e54]:
    - generic [ref=e55]:
      - generic [ref=e56]: Gestes du workflow synthétique
      - generic [ref=e58]:
        - button "Terminal 1" [ref=e59] [cursor=pointer]:
          - generic [ref=e62]: Terminal
          - generic [ref=e63]: "1"
        - generic [ref=e64]:
          - text: IA des prochains lancements
          - combobox "Fournisseur IA" [ref=e65]:
            - option "OpenAI · Codex" [selected]
            - option "Anthropic · Claude"
        - group "Thème de l’interface" [ref=e66]:
          - button "Thème clair" [ref=e67] [cursor=pointer]
          - button "Thème sombre" [ref=e71] [cursor=pointer]
          - button "Thème système" [pressed] [ref=e74] [cursor=pointer]
        - status [ref=e78]: À jour
        - button "Actualiser · À jour" [ref=e79] [cursor=pointer]
    - generic [ref=e85]:
      - main [ref=e87]:
        - generic [ref=e88]:
          - generic [ref=e89]:
            - generic [ref=e90]:
              - generic [ref=e91]: Gestes du workflow synthétique / Workflow
              - heading "Dessiner ensemble" [level=1] [ref=e92]
              - paragraph [ref=e93]: Révision 1 · Enregistré
            - generic [ref=e94]:
              - button "Choisir l’IA" [ref=e95] [cursor=pointer]
              - group [ref=e96]:
                - generic "Options" [ref=e97] [cursor=pointer]
              - button "Enregistrer" [disabled] [ref=e98]
              - button "Exécuter…" [ref=e99] [cursor=pointer]
          - paragraph [ref=e100]: Enregistrez ici ; la navigation principale enregistre aussi vos modifications.
          - tablist "Vues du workflow" [ref=e101]:
            - tab "Éditeur" [selected] [ref=e102] [cursor=pointer]
            - tab "Exécution" [disabled] [ref=e103]
            - tab "Historique" [ref=e104] [cursor=pointer]
            - tab "Rapport" [disabled] [ref=e105]
          - generic [ref=e106]:
            - button "+ Ajouter un bloc" [ref=e107] [cursor=pointer]
            - button "Relier" [ref=e108] [cursor=pointer]
            - button "+ Note" [ref=e109] [cursor=pointer]
            - button "Propriétés" [disabled] [ref=e110]
            - button "Paramètres du workflow" [ref=e111] [cursor=pointer]
            - button "Annuler la modification" [disabled] [ref=e113]: ↶
            - button "Rétablir la modification" [disabled] [ref=e114]: ↷
            - button "Ouvrir le terminal existant" [ref=e115] [cursor=pointer]: ›_ Terminal
            - group [ref=e116]:
              - generic "Éditeur" [ref=e117] [cursor=pointer]
            - button "✦ Assistant IA" [ref=e118] [cursor=pointer]
            - button "Changer la vue graphe ou liste" [ref=e119] [cursor=pointer]: ☷ Liste
          - generic [ref=e121]:
            - generic "Graphe du workflow" [ref=e122]:
              - generic [ref=e124]:
                - generic:
                  - 'article "Note : Précision de conception"':
                    - button "Note · sans effet sur l’exécution Précision de conception" [ref=e125]:
                      - generic [ref=e126]: Note · sans effet sur l’exécution
                      - strong [ref=e127]: Précision de conception
                    - generic [ref=e128]: Cette note ne doit cacher ni les étapes ni les liens.
                - img:
                  - 'button "Corriger le lien : intentions → plan · plan · un élément" [ref=e129] [cursor=pointer]'
                  - 'button "Corriger le lien : plan → scope · plan · un élément" [ref=e132] [cursor=pointer]'
                  - 'button "Corriger le lien : scope → work · plan · un élément" [ref=e135] [cursor=pointer]'
                  - generic [ref=e140] [cursor=pointer]: plan · un élément
                  - generic [ref=e143] [cursor=pointer]: plan · un élément
                  - generic [ref=e146] [cursor=pointer]: plan · un élément
                - generic:
                  - button "intentions · Tâche" [ref=e147]:
                    - generic [ref=e148]:
                      - generic [aria-hidden] [ref=e149]: ◇
                      - generic [ref=e150]:
                        - generic "intentions" [ref=e151]
                        - generic [ref=e152]: Tâche
                    - 'generic "Entrées : aucune · Sorties : plan" [ref=e154]': plan · un élément
                  - button "plan · Tâche" [ref=e155]:
                    - generic [ref=e156]:
                      - generic [aria-hidden] [ref=e157]: ◇
                      - generic [ref=e158]:
                        - generic "plan" [ref=e159]
                        - generic [ref=e160]: Tâche
                    - 'generic "Entrées : plan · Sorties : plan" [ref=e162]': plan · un élément
                  - button "scope · Tâche" [ref=e163]:
                    - generic [ref=e164]:
                      - generic [aria-hidden] [ref=e165]: ◇
                      - generic [ref=e166]:
                        - generic "scope" [ref=e167]
                        - generic [ref=e168]: Tâche
                    - 'generic "Entrées : plan · Sorties : plan" [ref=e170]': plan · un élément
                  - button "work · Tâche" [ref=e171]:
                    - generic [ref=e172]:
                      - generic [aria-hidden] [ref=e173]: ◇
                      - generic [ref=e174]:
                        - generic "work" [ref=e175]
                        - generic [ref=e176]: Tâche
                    - 'generic "Entrées : plan · Sorties : plan" [ref=e178]': plan · un élément
                - generic:
                  - button "Relier vers intentions" [ref=e179] [cursor=pointer]
                  - button "Relier depuis intentions" [ref=e180] [cursor=pointer]
                  - button "Relier vers plan" [ref=e181] [cursor=pointer]
                  - button "Relier depuis plan" [ref=e182] [cursor=pointer]
                  - button "Relier vers scope" [ref=e183] [cursor=pointer]
                  - button "Relier depuis scope" [ref=e184] [cursor=pointer]
                  - button "Relier vers work" [ref=e185] [cursor=pointer]
                  - button "Relier depuis work" [ref=e186] [cursor=pointer]
            - generic [ref=e187]:
              - generic [ref=e188]: 4 blocs · 3 liens
              - generic [ref=e189]:
                - button "Réduire le graphe" [ref=e190] [cursor=pointer]: −
                - button "100 %" [ref=e191] [cursor=pointer]
                - button "Agrandir le graphe" [ref=e192] [cursor=pointer]: +
                - button "Ajuster" [ref=e193] [cursor=pointer]
                - button "Réorganiser le graphe" [ref=e194] [cursor=pointer]
      - dialog [ref=e196]:
        - generic [ref=e197]:
          - heading "Modifier le lien" [level=2] [ref=e198]
          - button "Fermer la fenêtre" [ref=e199] [cursor=pointer]: ×
        - generic [ref=e200]:
          - generic [ref=e201]: Depuis
          - combobox "Depuis" [ref=e202]:
            - option "intentions"
            - option "plan" [selected]
            - option "scope"
            - option "work"
          - generic [ref=e203]: Après l’issue
          - combobox "Après l’issue" [ref=e204]:
            - option "Travail terminé" [selected]
          - generic [ref=e205]: Vers
          - combobox "Vers" [ref=e206]:
            - option "intentions"
            - option "plan"
            - option "scope" [selected]
            - option "work"
          - status [ref=e207]: "Données reliées par leur nom : plan"
          - generic [ref=e208]:
            - checkbox "Ne transmettre aucune donnée (ordre d’exécution uniquement)" [ref=e209]
            - text: Ne transmettre aucune donnée (ordre d’exécution uniquement)
          - generic [ref=e210]:
            - text: Sortie à transmettre
            - combobox "Sortie à transmettre" [ref=e211]:
              - option "Aucune donnée supplémentaire" [selected]
              - option "plan — Objet structuré · un élément · facultatif"
          - generic [ref=e212]:
            - text: Entrée destinataire
            - combobox "Entrée destinataire" [ref=e213]:
              - option "Choisir une entrée" [selected]
              - option "plan — Objet structuré · un élément · facultatif"
          - group [ref=e214]:
            - generic "Configuration des échanges" [ref=e215]
          - button "Enregistrer le lien" [ref=e217] [cursor=pointer]
        - generic [ref=e219]:
          - button "Conserver le lien" [ref=e220] [cursor=pointer]
          - button "Retirer ce lien…" [ref=e221] [cursor=pointer]
```

# Test source

```ts
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
  91  |   await expect(page.locator('.xterm-screen:visible')).toContainText('GESTURE_TERMINAL_OK');
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
> 168 |   await drag(note.locator('.note-heading'),40,-25);await expect(page.getByRole('dialog')).toHaveCount(0);
      |                                                                                           ^ Error: expect(locator).toHaveCount(expected) failed
  169 |   expect(await position(note)).toEqual({x:before.x+40,y:before.y-25});expect(await collisions()).toEqual([]);await expectNotesClear();
  170 |   await save();await open();expect(await collisions()).toEqual([]);
  171 |   await page.screenshot({path:test.info().outputPath('note-routes-outside-source-destination.png')});
  172 | });
  173 | 
```