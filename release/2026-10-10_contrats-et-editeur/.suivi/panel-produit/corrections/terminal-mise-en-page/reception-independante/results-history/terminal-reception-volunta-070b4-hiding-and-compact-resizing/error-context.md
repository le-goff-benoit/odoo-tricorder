# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: terminal-reception.spec.cjs >> voluntary history reading is not pulled to the bottom by hiding and compact resizing
- Location: ../../../tmp/tricorder-review-terminal-final/terminal-reception.spec.cjs:35:1

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "HISTORY_123"
Received string:    "HISTORY_171
HISTORY_172
HISTORY_173
HISTORY_174
HISTORY_175
HISTORY_176
HISTORY_177
HISTORY_178
HISTORY_179
HISTORY_180
HISTORY_181"
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
    - button "Réception indépendante terminal synthétique" [ref=e33] [cursor=pointer]
    - generic [ref=e35]:
      - navigation "Configuration" [ref=e36]:
        - button "Planifications" [ref=e37] [cursor=pointer]
        - button "Connexions" [ref=e41] [cursor=pointer]
      - button "Paramètres" [ref=e48] [cursor=pointer]
      - group [ref=e52]:
        - generic "Outils et aide" [ref=e53] [cursor=pointer]
  - main [ref=e54]:
    - generic [ref=e55]:
      - generic [ref=e56]: Réception indépendante terminal synthétique
      - generic [ref=e58]:
        - button "Terminal 1" [active] [pressed] [ref=e59] [cursor=pointer]:
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
        - button "Actualiser · À jour" [ref=e78] [cursor=pointer]
    - generic [ref=e82]:
      - generic [ref=e83]:
        - generic [ref=e84]:
          - strong [ref=e85]: Terminal
          - generic [ref=e86]:
            - button "Contexte" [ref=e87] [cursor=pointer]
            - button "Agrandir le terminal" [ref=e88] [cursor=pointer]
        - generic [ref=e89]:
          - generic [ref=e90]:
            - button "Shell occupé 1" [pressed] [ref=e91] [cursor=pointer]:
              - generic "Terminal ouvert — ne prouve pas qu’une étape travaille" [ref=e92]
              - img "Shell" [ref=e93]
            - button "Arrêter ce terminal" [ref=e96] [cursor=pointer]
          - button "Nouveau terminal" [ref=e99] [cursor=pointer]
          - button "Rechercher dans le terminal" [ref=e103] [cursor=pointer]
        - generic [ref=e107]:
          - 'generic "Shell : workspace · Demande affichée : Réception indépendante terminal synthétique · Shell du projet" [ref=e108]'
          - generic [ref=e109]: Dossier à l’ouverture ; le dossier courant peut changer.
        - generic [ref=e114]:
          - textbox "Terminal input" [ref=e115]
          - generic [aria-hidden]:
            - generic: HISTORY_171
            - generic: HISTORY_172
            - generic: HISTORY_173
            - generic: HISTORY_174
            - generic: HISTORY_175
            - generic: HISTORY_176
            - generic: HISTORY_177
            - generic: HISTORY_178
            - generic: HISTORY_179
            - generic: HISTORY_180
            - generic: HISTORY_181
      - separator "Taille du terminal" [ref=e118]
      - main [ref=e122]:
        - generic [ref=e123]:
          - generic [ref=e124]:
            - generic [ref=e125]:
              - generic [ref=e126]: Réception indépendante terminal synthétique / Workflow
              - heading "Workflow témoin du terminal" [level=1] [ref=e127]
              - paragraph [ref=e128]: Révision 1 · Enregistré
            - generic [ref=e129]:
              - button "Choisir l’IA" [ref=e130] [cursor=pointer]
              - group [ref=e131]:
                - generic "Options" [ref=e132] [cursor=pointer]
              - button "Enregistrer" [disabled] [ref=e133]
              - button "Exécuter…" [ref=e134] [cursor=pointer]
          - paragraph [ref=e135]: Enregistrez ici ; la navigation principale enregistre aussi vos modifications.
          - tablist "Vues du workflow" [ref=e136]:
            - tab "Éditeur" [selected] [ref=e137] [cursor=pointer]
            - tab "Exécution" [disabled] [ref=e138]
            - tab "Historique" [ref=e139] [cursor=pointer]
            - tab "Rapport" [disabled] [ref=e140]
          - generic [ref=e141]:
            - button "+ Ajouter un bloc" [ref=e142] [cursor=pointer]
            - button "Relier" [ref=e143] [cursor=pointer]
            - button "+ Note" [ref=e144] [cursor=pointer]
            - button "Propriétés" [disabled] [ref=e145]
            - button "Données structurées…" [ref=e146] [cursor=pointer]
            - button "Paramètres du workflow" [ref=e147] [cursor=pointer]
            - button "Annuler la modification" [disabled] [ref=e149]: ↶
            - button "Rétablir la modification" [disabled] [ref=e150]: ↷
            - button "Ouvrir le terminal existant" [ref=e151] [cursor=pointer]: ›_ Terminal
            - group [ref=e152]:
              - generic "Éditeur" [ref=e153] [cursor=pointer]
            - button "✦ Assistant IA" [ref=e154] [cursor=pointer]
            - button "Changer la vue graphe ou liste" [ref=e155] [cursor=pointer]: ☷ Liste
          - generic [ref=e157]:
            - generic "Graphe du workflow" [ref=e158]:
              - generic [ref=e160]:
                - generic:
                  - button "Recueillir la demande · Tâche" [ref=e161]:
                    - generic [ref=e162]:
                      - generic [aria-hidden] [ref=e163]: ◇
                      - generic [ref=e164]:
                        - generic "Recueillir la demande" [ref=e165]
                        - generic [ref=e166]: Tâche
                    - 'generic "Entrées : aucune · Sorties : text" [ref=e168]': 0 entrée → 1 sortie
                  - button "Préparer le plan · Tâche" [ref=e169]:
                    - generic [ref=e170]:
                      - generic [aria-hidden] [ref=e171]: ◇
                      - generic [ref=e172]:
                        - generic "Préparer le plan" [ref=e173]
                        - generic [ref=e174]: Tâche
                    - 'generic "Entrées : text · Sorties : aucune" [ref=e176]': 1 entrée → 0 sortie
                - generic:
                  - button "Relier vers Recueillir la demande" [ref=e177] [cursor=pointer]
                  - button "Relier depuis Recueillir la demande" [ref=e178] [cursor=pointer]
                  - button "Relier vers Préparer le plan" [ref=e179] [cursor=pointer]
                  - button "Relier depuis Préparer le plan" [ref=e180] [cursor=pointer]
            - generic [ref=e181]:
              - generic [ref=e182]: 2 blocs · 0 lien
              - generic [ref=e183]:
                - button "Réduire le graphe" [ref=e184] [cursor=pointer]: −
                - button "100 %" [ref=e185] [cursor=pointer]
                - button "Agrandir le graphe" [ref=e186] [cursor=pointer]: +
                - button "Ajuster" [ref=e187] [cursor=pointer]
                - button "Réorganiser le graphe" [ref=e188] [cursor=pointer]
```

# Test source

```ts
  1  | const {test,expect,_electron:electron}=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
  2  | const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
  3  | const {cleanupBroker}=require('/home/blegoff/odoo-tricorder/tests/terminal-fixture.cjs');
  4  | const root='/home/blegoff/odoo-tricorder';let app,page,directory,project,phases;
  5  | const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
  6  | const screen=()=>page.locator('.xterm-screen:visible');
  7  | async function size(width,height,zoom=1){await app.evaluate(({BrowserWindow},s)=>{const w=BrowserWindow.getAllWindows()[0];w.setContentSize(s.width,s.height);w.webContents.setZoomFactor(s.zoom);},{width,height,zoom});await expect.poll(()=>page.evaluate(()=>innerWidth)).toBe(Math.round(width/zoom));}
  8  | async function type(command){await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type(command);await page.keyboard.press('Enter');}
  9  | async function phase(label){const data=await page.evaluate(async label=>{const term=globalThis.__reviewTerminal,b=term.buffer.active;const host=document.querySelector('.terminal-host:not([hidden])'),container=document.querySelector('#terminal-hosts'),workflow=document.querySelector('#workflow-panel'),divider=document.querySelector('.terminal-divider');const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};return {label,width:innerWidth,height:innerHeight,rows:term.rows,cols:term.cols,baseY:b.baseY,viewportY:b.viewportY,cursorY:b.cursorY,visible:document.querySelector('.xterm-screen')?.innerText,host:box(host),container:box(container),workflow:box(workflow),divider:box(divider),bodyHeight:document.body.scrollHeight,sessions:(await window.tricorder.terminals.list()).filter(s=>s.alive).map(s=>({id:s.id,pid:s.pid}))};},label);phases.push(data);return data;}
  10 | async function snapshot(label){await phase(label);await page.screenshot({path:test.info().outputPath(label+'.png')});}
  11 | async function atBottom(){await expect.poll(()=>page.evaluate(()=>__reviewTerminal.buffer.active.baseY-__reviewTerminal.buffer.active.viewportY)).toBe(0);}
  12 | async function useful(){await expect.poll(()=>page.evaluate(()=>__reviewTerminal.rows)).toBeGreaterThanOrEqual(10);const p=await phase('useful-check');expect(p.host.height).toBeGreaterThanOrEqual(140);expect(p.workflow.height).toBeGreaterThanOrEqual(140);}
  13 | test.beforeEach(async()=>{
  14 |  phases=[];directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-terminal-independent-'));const bin=path.join(directory,'bin');fs.mkdirSync(bin);for(const c of ['codex','claude'])fs.writeFileSync(path.join(bin,c),'#!/bin/sh\nprintf "INERT_REVIEW_PROVIDER\\n"\nexit 78\n',{mode:0o755});
  15 |  app=await electron.launch({args:[root],env:{PATH:bin+':/usr/bin:/bin',HOME:directory,DISPLAY:process.env.DISPLAY,XAUTHORITY:process.env.XAUTHORITY,LANG:'C.UTF-8',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_DATA_HOME:path.join(directory,'data'),XDG_CACHE_HOME:path.join(directory,'cache'),CODEX_HOME:path.join(directory,'codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'no-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'}});
  16 |  page=await app.firstWindow();await size(1600,1100);await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();
  17 |  // Observation only: retain the real xterm public object from its creation scope.
  18 |  // No mock, source rewrite, forced resize or scroll correction is installed.
  19 |  const cdp=await app.context().newCDPSession(page),scripts=[];cdp.on('Debugger.scriptParsed',s=>scripts.push(s));await cdp.send('Debugger.enable');const appScript=scripts.find(s=>s.url.endsWith('/app.js'));if(!appScript)throw new Error('app.js not found');const source=(await cdp.send('Debugger.getScriptSource',{scriptId:appScript.scriptId})).scriptSource;const lines=source.split('\n');const mount=lines.findIndex(s=>s.includes('async function mountTerminal('));const line=lines.findIndex((s,i)=>i>mount&&s.includes('cockpitUI.applyPreferences();'));if(line<0)throw new Error('terminal observation point not found');await cdp.send('Debugger.setBreakpoint',{location:{scriptId:appScript.scriptId,lineNumber:line},condition:'globalThis.__reviewTerminal=term, false'});
  20 |  await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();await page.locator('[data-action=terminal-toggle]').click();await page.getByRole('button',{name:'Ouvrir un terminal',exact:true}).click();await expect(page.locator('.xterm-helper-textarea:visible')).toBeVisible();await expect.poll(()=>page.evaluate(()=>!!globalThis.__reviewTerminal)).toBe(true);
  21 |  await type('printf "SYNTHETIC_TERMINAL_READY\\n"');await expect(screen()).toContainText('SYNTHETIC_TERMINAL_READY');
  22 |  project=await call('project.create',{title:'Réception indépendante terminal synthétique'});await call('workflow.save',{project:project.id,graph:{schema:1,id:'review-terminal',title:'Workflow témoin du terminal',nodes:[{id:'source',kind:'task',title:'Recueillir la demande',outputs:{text:'string'},position:{x:60,y:60}},{id:'target',kind:'task',title:'Préparer le plan',inputs:{text:'string'},position:{x:410,y:60}}],edges:[]}});
  23 |  await page.locator('[data-action=terminal-toggle]').click();await page.locator('[data-workflow-route=global]').click();await page.locator('[data-action=open-workflow][data-id=review-terminal]').click();await page.locator('[data-action=terminal-toggle]').click();await phase('initial');
  24 | });
  25 | test.afterEach(async()=>{if(app){if(page&&!page.isClosed()){await phase('final').catch(e=>phases.push({observationError:String(e)}));fs.writeFileSync(test.info().outputPath('phases.json'),JSON.stringify(phases,null,2));}await app.close();}for(const socket of ['cockpit/odoo-tricorder/pty.sock','studio-pty.sock','runtime/pty.sock'])await cleanupBroker(path.join(directory,socket));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
  26 | 
  27 | test('current output remains followed after compact reopening and keyboard flow control',async()=>{
  28 |  await type('for n in {1..24}; do printf "CURRENT_%03d\\n" "$n"; done');await expect(screen()).toContainText('CURRENT_024');await atBottom();const before=await phase('before-hide-current');
  29 |  await page.locator('[data-action=terminal-toggle]').click();await size(1024,900,1.25);await page.locator('[data-action=terminal-toggle]').click();await useful();await atBottom();await snapshot('compact-current-before-input');
  30 |  await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type("printf '\\x43\\x4f\\x4d\\x50\\x41\\x43\\x54\\x5f\\x4c\\x49\\x56\\x45\\n'");await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowRight');await page.keyboard.press('Control+s');await page.keyboard.press('Control+q');await page.keyboard.press('Enter');
  31 |  await expect(screen()).toContainText('COMPACT_LIVE');await atBottom();await snapshot('compact-current-after-input');expect((await phase('same-session')).sessions).toEqual(before.sessions);
  32 |  await size(1600,1100);await atBottom();await expect(screen()).toContainText('COMPACT_LIVE');
  33 | });
  34 | 
  35 | test('voluntary history reading is not pulled to the bottom by hiding and compact resizing',async()=>{
  36 |  await type('for n in {1..220}; do printf "HISTORY_%03d\\n" "$n"; done');await expect(screen()).toContainText('HISTORY_220');await atBottom();
  37 |  await screen().hover();for(let i=0;i<12;i++)await page.mouse.wheel(0,-900);await expect.poll(()=>page.evaluate(()=>__reviewTerminal.buffer.active.baseY-__reviewTerminal.buffer.active.viewportY)).toBeGreaterThan(20);
  38 |  const before=await phase('history-before'),marker=before.visible.match(/HISTORY_\d{3}/)?.[0];expect(marker).toBeTruthy();
  39 |  await page.locator('[data-action=terminal-toggle]').click();await size(1024,900,1.25);await page.locator('[data-action=terminal-toggle]').click();await useful();
> 40 |  const after=await phase('history-after');expect(after.baseY-after.viewportY).toBeGreaterThan(20);expect(after.visible).toContain(marker);expect(after.sessions).toEqual(before.sessions);await snapshot('history-preserved-compact');
     |                                                                                                                         ^ Error: expect(received).toContain(expected) // indexOf
  41 | });
  42 | 
  43 | test('compact split preserves useful terminal size and original PTY through split changes',async()=>{
  44 |  const before=await phase('size-before');await page.locator('[data-action=terminal-toggle]').click();await size(1024,900,1.25);await page.locator('[data-action=terminal-toggle]').click();await useful();
  45 |  const separator=page.getByRole('separator',{name:'Taille du terminal'});await separator.focus();await page.keyboard.press('Home');await useful();await snapshot('compact-minimum-split');
  46 |  await page.keyboard.press('End');await useful();await snapshot('compact-maximum-split');await expect(page.locator('.canvas-area')).toBeVisible();
  47 |  await page.getByRole('button',{name:'Agrandir le terminal',exact:true}).click();await expect.poll(()=>page.evaluate(()=>__reviewTerminal.rows)).toBeGreaterThan(25);await page.getByRole('button',{name:'Afficher le workflow',exact:true}).click();await useful();
  48 |  await size(1600,1100);await page.getByRole('button',{name:'Disposition verticale',exact:true}).click();await useful();await page.getByRole('button',{name:'Côte à côte',exact:true}).click();await useful();
  49 |  expect((await phase('size-after')).sessions).toEqual(before.sessions);await type("printf '\\x50\\x54\\x59\\x5f\\x53\\x54\\x49\\x4c\\x4c\\x5f\\x4c\\x49\\x56\\x45\\n'");await expect(screen()).toContainText('PTY_STILL_LIVE');await snapshot('same-pty-after-layouts');
  50 | });
  51 | 
```