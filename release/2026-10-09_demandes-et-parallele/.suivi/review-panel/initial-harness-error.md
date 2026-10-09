# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: review.spec.cjs >> state change rejects a stale proposal and does not approve another request or restore its draft
- Location: release/2026-10-09_demandes-et-parallele/.suivi/review-panel/review.spec.cjs:80:1

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Examiner la décision', exact: true })

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
    - generic [ref=e32]:
      - button "Atelier Azur" [ref=e33] [cursor=pointer]
      - button "Laboratoire Corail" [ref=e35] [cursor=pointer]
    - generic [ref=e37]:
      - navigation "Configuration" [ref=e38]:
        - button "Planifications" [ref=e39] [cursor=pointer]
        - button "Connexions" [ref=e43] [cursor=pointer]
      - button "Paramètres" [ref=e50] [cursor=pointer]
      - group [ref=e54]:
        - generic "Outils et aide" [ref=e55] [cursor=pointer]
  - main [ref=e56]:
    - generic [ref=e57]:
      - generic [ref=e58]: Laboratoire Corail
      - generic [ref=e60]:
        - button "Terminal 1" [pressed] [ref=e61] [cursor=pointer]:
          - generic [ref=e64]: Terminal
          - generic [ref=e65]: "1"
        - generic [ref=e66]:
          - text: IA des prochains lancements
          - combobox "Fournisseur IA" [ref=e67]:
            - option "OpenAI · Codex" [selected]
            - option "Anthropic · Claude"
        - group "Thème de l’interface" [ref=e68]:
          - button "Thème clair" [ref=e69] [cursor=pointer]
          - button "Thème sombre" [ref=e73] [cursor=pointer]
          - button "Thème système" [pressed] [ref=e76] [cursor=pointer]
        - status [ref=e80]: À jour · 00:04
        - button "Actualiser · À jour · 00:04" [ref=e81] [cursor=pointer]
    - generic [ref=e85]:
      - generic [ref=e86]:
        - generic [ref=e87]:
          - strong [ref=e88]: Terminal
          - generic [ref=e89]:
            - button "Contexte" [ref=e90] [cursor=pointer]
            - button "Disposition verticale" [ref=e91] [cursor=pointer]
            - button "Agrandir le terminal" [ref=e92] [cursor=pointer]
        - generic [ref=e93]:
          - generic [ref=e94]:
            - button "Shell 1" [pressed] [ref=e95] [cursor=pointer]:
              - generic "Terminal ouvert — ne prouve pas qu’une étape travaille" [ref=e96]
              - img "Shell" [ref=e97]
            - button "Arrêter ce terminal" [ref=e100] [cursor=pointer]
          - button "Nouveau terminal" [ref=e103] [cursor=pointer]
          - button "Rechercher dans le terminal" [ref=e107] [cursor=pointer]
        - generic [ref=e111]:
          - 'generic "Shell : Atelier Azur · Demande affichée : Laboratoire Corail · Shell du projet" [ref=e112]'
          - generic [ref=e113]: Projet du shell à son ouverture ; le dossier courant peut changer.
        - generic [ref=e118]:
          - textbox "Terminal input" [ref=e119]
          - generic [aria-hidden]:
            - generic: To run a command as administrator (user "root"), use "sudo <command>".
            - generic: See "man sudo_root" for details.
            - generic: blegoff@wrk226:/tmp/tricorder-review-panel-final-6w3Vdw/state/workflows/
            - generic: projects/pca7576e7a3c544d1/.
            - generic: tricorder$ command -v codex; codex --version
            - generic: ; command -v claude; claude --version
            - generic: /tmp/tricorder-review-panel-final-6w3Vdw/bin/codex
            - generic: PANEL INTERACTION INERT
            - generic: /tmp/tricorder-review-panel-final-6w3Vdw/bin/claude
            - generic: PANEL INTERACTION INERT
            - generic: blegoff@wrk226:/tmp/tricorder-review-panel-final-6w3Vdw/state/workflows/
            - generic: projects/pca7576e7a3c544d1/.tricorder$
      - separator "Taille du terminal" [ref=e120]
      - main [ref=e124]:
        - generic [ref=e125]:
          - generic [ref=e126]:
            - generic [ref=e127]:
              - generic [ref=e128]: Suivi · Examiner les propositions
              - heading "Demande 2 — Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver" [level=1] [ref=e129]
            - group [ref=e131]:
              - generic "Options" [ref=e132] [cursor=pointer]
          - group "Périmètre du suivi" [ref=e133]:
            - button "Vue d’ensemble" [ref=e134] [cursor=pointer]
            - button "Demande" [pressed] [ref=e135] [cursor=pointer]
          - tablist "Vues du workflow"
          - generic [ref=e136]:
            - group [ref=e137]:
              - generic "2 demandes" [ref=e138] [cursor=pointer]:
                - text: 2 demandes
                - generic [aria-hidden] [ref=e139]: ⌄
            - paragraph [ref=e140]: Aucune étape en cours · 1 décision · 1 terminée
            - button "Voir le terminal" [ref=e141] [cursor=pointer]
          - region "État et prochaine action" [ref=e142]:
            - generic [ref=e144]:
              - strong [ref=e145]: Décision attendue
              - generic [ref=e146]: 1 / 2 étapes
            - paragraph [ref=e147]: Examiner avant la suite
          - group "Affichage du suivi" [ref=e149]:
            - button "Graphe" [ref=e150] [cursor=pointer]
            - button "Détail" [pressed] [ref=e151] [cursor=pointer]
          - complementary "Inspecteur du bloc" [ref=e153]:
            - generic [ref=e154]:
              - navigation "Position dans le workflow" [ref=e155]:
                - generic [ref=e156]:
                  - generic "Étapes précédentes" [ref=e157]:
                    - button [ref=e158] [cursor=pointer]:
                      - strong [ref=e159]: Préparer la proposition
                  - generic [aria-hidden] [ref=e160]: →
                  - generic "Étape sélectionnée" [ref=e161]:
                    - button "Étape sélectionnée Examiner avant la suite" [ref=e162] [cursor=pointer]:
                      - generic [ref=e163]: Étape sélectionnée
                      - strong [ref=e164]: Examiner avant la suite
              - paragraph [ref=e165]:
                - generic [ref=e166]: Décision attendue
              - paragraph [ref=e167]: "Décision pour cette demande : Demande 2 — Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; FIN DE LA DEMANDE."
              - generic [ref=e168]:
                - strong [ref=e169]: Votre décision est attendue
                - paragraph [ref=e170]: Approuvez-vous uniquement cette proposition ?
              - generic [ref=e171]:
                - heading "Entrées reçues" [level=3] [ref=e172]
                - generic [ref=e173]:
                  - term [ref=e174]: Proposition
                  - definition [ref=e175]: "Paragraphe 0 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 1 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 2 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 3 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 4 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 5 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 6 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 7 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 8 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 9 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 10 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 11 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 12 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 13 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 14 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 15 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 16 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 17 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 18 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 19 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 20 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 21 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 22 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 23 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 24 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 25 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 26 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 27 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 28 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 29 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 30 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 31 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 32 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 33 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 34 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 35 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 36 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 37 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 38 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 39 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 40 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 41 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 42 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 43 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe. Paragraphe 44 : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe."
                - group [ref=e176]:
                  - generic "Données techniques" [ref=e177] [cursor=pointer]
              - paragraph [ref=e178]:
                - text: "Sources : proposition ←"
                - button "Préparer la proposition" [ref=e179] [cursor=pointer]
              - generic [ref=e180]:
                - generic [ref=e181]: Commentaire (facultatif)
                - textbox "Commentaire (facultatif)" [ref=e182]
            - generic [ref=e184]:
              - paragraph [ref=e185]:
                - strong [ref=e186]: Demande 2 — Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; Examiner les pièces et conserver le dossier sans envoi externe ; FIN DE LA DEMANDE
                - generic [ref=e187]: Cette proposition · tentative 1 uniquement.
              - generic [ref=e188]:
                - button "Approuver la suite" [ref=e189] [cursor=pointer]
                - button "Refuser la suite" [ref=e190] [cursor=pointer]
```

# Test source

```ts
  1   | const {test,expect,_electron:electron}=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
  2   | const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
  3   | const {execFileSync}=require('node:child_process');
  4   | const {cleanupBroker}=require('/home/blegoff/odoo-tricorder/tests/terminal-fixture.cjs');
  5   | const root='/home/blegoff/odoo-tricorder';
  6   | let directory,environment,app,page,fixture,backend;
  7   | const seed=`
  8   | import sys,json
  9   | sys.path.insert(0,sys.argv[1])
  10  | from workflow_engine import Engine
  11  | from workflow_engine.library import node,edge
  12  | from workflow_engine.conversations import Conversations
  13  | e=Engine(sys.argv[2]);p=e.create_project('Atelier Azur');q=e.create_project('Laboratoire Corail');c=Conversations(e)
  14  | g={'schema':1,'id':'examen','title':'Examiner les propositions','defaults':{'provider':'codex','model':'inert'},'nodes':[node('plan','Préparer la proposition','task',outputs={'proposition':'string'},validation='contract'),node('gate','Examiner avant la suite','decision',inputs={'proposition':'string'},question='Approuvez-vous uniquement cette proposition ?',options=['approve','reject'])],'edges':[{**edge('plan','gate'),'mapping':{'proposition':'proposition'}}]}
  15  | e.save(p['id'],g);v=c.open(p['id'],g,'codex',projects=[q['id']]);items=[]
  16  | for index,project in enumerate([p,q]):
  17  |  item=c.add(v['id'],'Demande '+str(index+1)+' — '+('Examiner les pièces et conserver le dossier sans envoi externe ; '*35)+'FIN DE LA DEMANDE',project=project['id']);items.append(item)
  18  |  t=e.claim(item['run'],'plan')['token'];e.submit(item['run'],'plan',t,{'ok':True,'summary':'Proposition synthétique à examiner','outputs':{'proposition':'\\n\\n'.join('Paragraphe '+str(n)+' : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe.' for n in range(45))}})
  19  | rgraph={'schema':1,'id':'reception','title':'Valider un résultat','defaults':{'provider':'codex','model':'inert'},'nodes':[node('work','Vérifier le résultat','task',criteria=['Les pièces ont été vérifiées.'],validation='human',max_attempts=2)],'edges':[]}
  20  | e.save(p['id'],rgraph);receipt=e.start(p['id'],rgraph,parameters={'request':'Recevoir les pièces vérifiées'},driver='conversation');t=e.claim(receipt['id'],'work')['token'];e.submit(receipt['id'],'work',t,{'ok':True,'summary':'Résultat synthétique : les pièces sont disponibles.','outputs':{}})
  21  | extra=[]
  22  | if sys.argv[3]=='tabs':
  23  |  for n in range(4):
  24  |   cv=c.open(p['id'],g,'codex');ci=c.add(cv['id'],'Conversation supplémentaire '+str(n+1)+' — Examiner les décisions du comité');extra.append({'conversation':cv['id'],'run':ci['run']})
  25  | print(json.dumps({'project':p,'second':q,'conversation':v['id'],'items':items,'receipt':receipt['id'],'extra':extra}))
  26  | `;
  27  | const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
  28  | const sessions=()=>page.evaluate(()=>window.tricorder.terminals.list());
  29  | const sessionIdentity=async()=>(await sessions()).map(s=>[s.id,s.pid,s.project,s.conversation,s.provider]);
  30  | async function openRun(run=fixture.items[0].run){
  31  |  await page.locator('[data-workflow-route="overview"]').click();
  32  |  await page.locator(`.activity-row[data-id="${run}"]`).click();
  33  |  await expect(page.locator('.execution-heading')).toBeVisible();
  34  | }
  35  | async function compact(){
  36  |  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1.25));
  37  |  await page.setViewportSize({width:1024,height:768});
  38  | }
  39  | async function preflight(){
  40  |  await page.locator('[data-action="new-terminal"]').first().click();
  41  |  const input=page.locator('.xterm-helper-textarea:visible');await input.focus();
  42  |  await page.keyboard.type('command -v codex; codex --version; command -v claude; claude --version');await page.keyboard.press('Enter');
  43  |  await expect(page.locator('.xterm-screen:visible')).toContainText('PANEL INTERACTION INERT');
  44  |  await expect(page.locator('.xterm-screen:visible')).toContainText(path.join(directory,'bin'));
  45  | }
  46  | async function launchConversation(){
  47  |  await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();
  48  |  await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
  49  |  await expect(page.locator('.xterm-screen:visible')).toContainText('PANEL INTERACTION AGENT EXITED');
  50  |  await expect.poll(async()=>(await sessions()).filter(s=>s.alive).every(s=>s.idleShell)).toBe(true);
  51  | }
  52  | test.beforeEach(async({},info)=>{
  53  |  directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-review-panel-final-'));
  54  |  fs.mkdirSync(path.join(directory,'bin'));fs.mkdirSync(path.join(directory,'home'));
  55  |  for(const provider of ['codex','claude'])fs.writeFileSync(path.join(directory,'bin',provider),'#!/bin/sh\nif [ "$1" = --version ]; then printf "PANEL INTERACTION INERT\\n"; exit 0; fi\nprintf "PANEL INTERACTION AGENT EXITED\\n"\nexit 78\n',{mode:0o755});
  56  |  environment={PATH:path.join(directory,'bin')+':/usr/bin:/bin',HOME:path.join(directory,'home'),SHELL:'/bin/bash',DISPLAY:process.env.DISPLAY,XAUTHORITY:process.env.XAUTHORITY,LANG:'C.UTF-8',PYTHONDONTWRITEBYTECODE:'1',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_DATA_HOME:path.join(directory,'data'),XDG_CACHE_HOME:path.join(directory,'cache'),XDG_RUNTIME_DIR:path.join(directory,'xdg-runtime'),CODEX_HOME:path.join(directory,'codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:path.join(directory,'home'),TRICORDER_STATE_DIR:path.join(directory,'state'),TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'absent-pack'),TRICORDER_TEST_MODE:'1'};
  57  |  backend=process.env.TRICORDER_EXECUTABLE?path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend'):path.join(root,'backend');
  58  |  fixture=JSON.parse(execFileSync('/usr/bin/python3',['-c',seed,backend,path.join(directory,'state/workflows'),info.title.startsWith('initial')?'tabs':'normal'],{env:environment,encoding:'utf8'}));
  59  |  app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?[]:[root],env:environment});page=await app.firstWindow();await page.setViewportSize({width:1440,height:1000});
  60  |  await openRun();await page.locator('[data-action="terminal-toggle"]').click();await preflight();
  61  | });
  62  | test.afterEach(async()=>{if(app)await app.close();app=null;await cleanupBroker(path.join(directory,'runtime/pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
  63  | 
  64  | test('long request and proposal keep decision controls reachable at 1024x768 with terminal and 125 percent zoom',async({},info)=>{
  65  |  await launchConversation();await openRun();await compact();
  66  |  await page.getByRole('button',{name:'Examiner la décision',exact:true}).click();
  67  |  const footer=page.locator('.interaction-footer');
  68  |  await expect(footer.getByRole('button',{name:'Approuver la suite',exact:true})).toBeInViewport({ratio:1});
  69  |  await expect(footer.getByRole('button',{name:'Refuser la suite',exact:true})).toBeInViewport({ratio:1});
  70  |  const dimensions=await page.locator('#inspector').evaluate(el=>Object.fromEntries(['.interaction-scroll','.interaction-footer','.interaction-scope strong'].map(sel=>{const e=el.querySelector(sel),r=e.getBoundingClientRect();return [sel,{x:r.x,y:r.y,width:r.width,height:r.height,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight}];})));
  71  |  expect(dimensions['.interaction-scroll'].height).toBeGreaterThan(50);
  72  |  await page.locator('.interaction-scope strong').evaluate(el=>el.scrollTop=el.scrollHeight);
  73  |  await page.locator('.interaction-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
  74  |  await page.getByLabel('Commentaire (facultatif)',{exact:true}).fill('Commentaire long — '+('Périmètre vérifié. '.repeat(80)));
  75  |  await expect(page.getByLabel('Commentaire (facultatif)',{exact:true})).toBeInViewport();
  76  |  await page.screenshot({path:info.outputPath('long-content-1024x768-125.png')});
  77  |  fs.writeFileSync(info.outputPath('geometry.json'),JSON.stringify(dimensions,null,2));
  78  | });
  79  | 
  80  | test('state change rejects a stale proposal and does not approve another request or restore its draft',async({},info)=>{
  81  |  await openRun();await page.getByRole('button',{name:'Examiner la décision',exact:true}).click();
  82  |  await page.getByLabel('Commentaire (facultatif)',{exact:true}).fill('Ancien commentaire — proposition 1 seulement');
  83  |  const first=(await call('run.get',{run:fixture.items[0].run})).run.nodes.gate;
  84  |  const decision={action:'run.decide',run:fixture.items[0].run,node:'gate',nonce:first.nonce,proposal:first.proposal};
  85  |  const result=await page.evaluate(async payload=>{
  86  |    await window.studio.human({...payload,outcome:'reject',note:'Refus humain concurrent préparé par API validée'});
  87  |    try {await window.studio.human({...payload,outcome:'approve',note:'Accord périmé'});return {unexpectedSuccess:true};}
  88  |    catch(error){return {message:error.message};}
  89  |  },decision);
  90  |  expect(result.unexpectedSuccess).toBeUndefined();
  91  |  expect(result.message).toMatch(/périmée|terminée/);
  92  |  await expect(page.locator('#decision-form')).toHaveCount(0);
> 93  |  await openRun(fixture.items[1].run);await page.getByRole('button',{name:'Examiner la décision',exact:true}).click();
      |                                                                                                              ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  94  |  await expect(page.getByLabel('Commentaire (facultatif)',{exact:true})).toHaveValue('');
  95  |  const after=await call('run.get',{run:fixture.items[0].run});
  96  |  expect(after.events.filter(e=>e.type==='decision')).toHaveLength(1);expect(after.run.nodes.gate.decision.outcome).toBe('reject');
  97  |  expect((await call('run.get',{run:fixture.items[1].run})).run.nodes.gate.status).toBe('waiting');
  98  |  fs.writeFileSync(info.outputPath('stale-proposal.json'),JSON.stringify({result,decision:after.run.nodes.gate.decision,events:after.events.filter(e=>e.type==='decision')},null,2));
  99  | });
  100 | 
  101 | test('a new result attempt clears the previous receipt draft and selected criteria',async({},info)=>{
  102 |  await openRun(fixture.receipt);await page.getByRole('button',{name:'Examiner le résultat',exact:true}).click();
  103 |  await page.getByLabel('Commentaire de validation (obligatoire)',{exact:true}).fill('Commentaire de la tentative 1 uniquement');
  104 |  await page.getByRole('checkbox',{name:'Les pièces ont été vérifiées.',exact:true}).check();
  105 |  const before=await call('run.get',{run:fixture.receipt});
  106 |  const replacement=`import sys,json\nsys.path.insert(0,sys.argv[1])\nfrom workflow_engine import Engine\ne=Engine(sys.argv[2]);r=sys.argv[3]\ne.retry(r,'work','Contre-épreuve explicite : nouvelle remise',human=True)\nt=e.claim(r,'work')['token']\ne.submit(r,'work',t,{'ok':True,'summary':'Nouveau résultat synthétique, tentative 2 à examiner.','outputs':{}})\nprint(json.dumps(e.run(r)))`;
  107 |  const changed=JSON.parse(execFileSync('/usr/bin/python3',['-c',replacement,backend,path.join(directory,'state/workflows'),fixture.receipt],{env:environment,encoding:'utf8'}));
  108 |  expect(changed.nodes.work.attempt).toBe(2);expect(changed.nodes.work.started).not.toBe(before.run.nodes.work.started);
  109 |  await expect(page.locator('.interaction-footer')).toContainText('tentative 2 uniquement');
  110 |  await expect(page.getByLabel('Commentaire de validation (obligatoire)',{exact:true})).toHaveValue('');
  111 |  await expect(page.getByRole('checkbox',{name:'Les pièces ont été vérifiées.',exact:true})).not.toBeChecked();
  112 |  await page.screenshot({path:info.outputPath('new-attempt-cleared-draft.png')});
  113 |  fs.writeFileSync(info.outputPath('new-attempt.json'),JSON.stringify({before:before.run.nodes.work,after:changed.nodes.work},null,2));
  114 | });
  115 | 
  116 | 
```