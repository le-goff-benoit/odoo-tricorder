# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: conversation-overview.spec.cjs >> gates: six demands, cross-project context and true dependency links remain understandable
- Location: tests/conversation-overview.spec.cjs:64:1

# Error details

```
Error: locator.scrollIntoViewIfNeeded: Element is not attached to the DOM
Call log:
  - attempting scroll into view action
    - waiting for element to be stable

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
      - button "Projet Atlas" [ref=e33] [cursor=pointer]
      - button "Projet Boréal" [ref=e35] [cursor=pointer]
    - generic [ref=e37]:
      - navigation "Configuration" [ref=e38]:
        - button "Planifications" [ref=e39] [cursor=pointer]
        - button "Connexions" [ref=e43] [cursor=pointer]
      - button "Paramètres" [ref=e50] [cursor=pointer]
      - group [ref=e54]:
        - generic "Outils et aide" [ref=e55] [cursor=pointer]
  - main [ref=e56]:
    - generic [ref=e57]:
      - generic [ref=e58]: Projet Atlas
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
          - button "Thème sombre" [active] [pressed] [ref=e73] [cursor=pointer]
          - button "Thème système" [ref=e76] [cursor=pointer]
        - button "Actualiser · À jour" [ref=e80] [cursor=pointer]
    - generic [ref=e84]:
      - generic [ref=e85]:
        - generic [ref=e87]:
          - button "Contexte" [ref=e88] [cursor=pointer]
          - button "Agrandir le terminal" [ref=e89] [cursor=pointer]
        - generic [ref=e90]:
          - generic [ref=e91]:
            - button "Shell occupé · R1 — Retrouver les documents du client" [pressed] [ref=e92] [cursor=pointer]:
              - generic "Terminal ouvert — ne prouve pas qu’une étape travaille" [ref=e93]
              - img "Shell" [ref=e94]
            - button "Arrêter ce terminal" [ref=e97] [cursor=pointer]
          - button "Nouveau terminal" [ref=e100] [cursor=pointer]
          - button "Rechercher dans le terminal" [ref=e104] [cursor=pointer]
        - 'generic "Conversation du workflow affiché · Shell : Projet Atlas" [ref=e109]'
        - generic [ref=e114]:
          - textbox "Terminal input" [ref=e115]
          - generic [aria-hidden]:
            - generic: "'python3' '/home/runner/work/odoo-tricorder/odoo-tricorder/backend/agent_laun"
            - generic: ch.py' '/tmp/tricorder-overview-ui-DTEqo8/cockpit/agent-events/f991e977-e090-
            - generic: 40a4-9a3e-44ec1f3c311c.launch.json'
            - generic: runner@runnervmwvtoz:~/projects/p95af2d413eb44cd8$ 'python3' '/home/runner/wo
            - generic: rk/odoo-tricorder/odoo-tricorder/backend/agent_launch.py' '/tmp/tricorder-ove
            - generic: rview-ui-DTEqo8/cockpit/agent-events/f991e977-e090-40a4-9a3e-44ec1f3c311c.lau
            - generic: nch.json'
            - generic: SUIVI SYNTHÉTIQUE PRÊT
      - separator "Taille du terminal" [ref=e116]
      - main [ref=e120]:
        - generic [ref=e121]:
          - generic [ref=e122]:
            - heading "Analyser, réaliser et vérifier les demandes" [level=1] [ref=e124]
            - generic [ref=e125]:
              - button "Ajouter une demande…" [ref=e126] [cursor=pointer]
              - group [ref=e127]:
                - generic "Options" [ref=e128] [cursor=pointer]
          - group "Périmètre du suivi" [ref=e129]:
            - button "Vue d’ensemble" [pressed] [ref=e130] [cursor=pointer]
            - button "Demande" [ref=e131] [cursor=pointer]
            - generic [ref=e132]:
              - group [ref=e133]:
                - generic "6 demandes" [ref=e134] [cursor=pointer]:
                  - text: 6 demandes
                  - generic [aria-hidden] [ref=e135]: ⌄
              - button "Retrouver la conversation" [ref=e136] [cursor=pointer]: Terminal
          - region "Vue d’ensemble des demandes" [ref=e137]:
            - generic [ref=e138]:
              - generic [ref=e139]:
                - heading "Demandes et activité" [level=2] [ref=e140]
                - paragraph [ref=e141]: Aucune étape en cours · 4 décisions · 1 échec · 1 en attente de dépendances
              - button "Lancer les demandes prêtes" [disabled] [ref=e142]
            - paragraph [ref=e143]: 1–6 sur 6. Seules les étapes prêtes seront lancées ; les validations restent à traiter.
            - paragraph [ref=e144]: 0 demande(s) lançable(s) sur cette page. Les autres indiquent leur prochaine action ; aucun agent ne démarre automatiquement.
            - generic [ref=e145]:
              - article [ref=e146]:
                - button "R1 — Retrouver les documents du client Projet Atlas Décision attendue" [ref=e147] [cursor=pointer]:
                  - generic [ref=e148]:
                    - strong [ref=e149]: R1 — Retrouver les documents du client
                    - generic [ref=e150]: Projet Atlas
                  - generic [ref=e151]: Décision attendue
                  - generic [aria-hidden] [ref=e152]: →
                - button "Examiner la décision · Valider le périmètre" [ref=e153] [cursor=pointer]
              - article [ref=e154]:
                - button "R2 — Corriger le filtre des commandes Projet Boréal Décision attendue" [ref=e155] [cursor=pointer]:
                  - generic [ref=e156]:
                    - strong [ref=e157]: R2 — Corriger le filtre des commandes
                    - generic [ref=e158]: Projet Boréal
                  - generic [ref=e159]: Décision attendue
                  - generic [aria-hidden] [ref=e160]: →
                - button "Examiner la décision · Valider le périmètre" [ref=e161] [cursor=pointer]
              - article [ref=e162]:
                - button "R3 — Vérifier les droits de consultation Projet Atlas Décision attendue" [ref=e163] [cursor=pointer]:
                  - generic [ref=e164]:
                    - strong [ref=e165]: R3 — Vérifier les droits de consultation
                    - generic [ref=e166]: Projet Atlas
                  - generic [ref=e167]: Décision attendue
                  - generic [aria-hidden] [ref=e168]: →
                - button "Examiner la décision · Valider le périmètre" [ref=e169] [cursor=pointer]
              - article [ref=e170]:
                - button "R4 — Préparer les tests de réception Projet Boréal Décision attendue" [ref=e171] [cursor=pointer]:
                  - generic [ref=e172]:
                    - strong [ref=e173]: R4 — Préparer les tests de réception
                    - generic [ref=e174]: Projet Boréal
                  - generic [ref=e175]: Décision attendue
                  - generic [aria-hidden] [ref=e176]: →
                - button "Examiner la décision · Valider le périmètre" [ref=e177] [cursor=pointer]
              - article [ref=e178]:
                - button "R5 — Vérifier la copie de travail Projet Atlas Échec · reprise nécessaire" [ref=e179] [cursor=pointer]:
                  - generic [ref=e180]:
                    - strong [ref=e181]: R5 — Vérifier la copie de travail
                    - generic [ref=e182]: Projet Atlas
                  - generic [ref=e183]: Échec · reprise nécessaire
                  - generic [aria-hidden] [ref=e184]: →
                - button "Examiner l’échec · Réaliser la demande" [ref=e185] [cursor=pointer]
                - paragraph [ref=e186]: La copie reste incomplète. Vérifier le répertoire de destination avant une nouvelle demande.
              - article [ref=e187]:
                - button "C1 — Consolider les résultats de R1 à R4 Projet Atlas Attend une autre demande" [ref=e188] [cursor=pointer]:
                  - generic [ref=e189]:
                    - strong [ref=e190]: C1 — Consolider les résultats de R1 à R4
                    - generic [ref=e191]: Projet Atlas
                  - generic [ref=e192]: Attend une autre demande
                  - generic [aria-hidden] [ref=e193]: →
                - button "Voir les dépendances · En attente des demandes précédentes." [ref=e194] [cursor=pointer]
                - generic [ref=e195]:
                  - generic [ref=e196]: "Après :"
                  - button "R1 — Retrouver les documents du client En attente de réussite" [ref=e197] [cursor=pointer]:
                    - generic [ref=e198]: R1 — Retrouver les documents du client
                    - generic [ref=e199]: En attente de réussite
                  - button "R2 — Corriger le filtre des commandes En attente de réussite" [ref=e200] [cursor=pointer]:
                    - generic [ref=e201]: R2 — Corriger le filtre des commandes
                    - generic [ref=e202]: En attente de réussite
                  - button "R3 — Vérifier les droits de consultation En attente de réussite" [ref=e203] [cursor=pointer]:
                    - generic [ref=e204]: R3 — Vérifier les droits de consultation
                    - generic [ref=e205]: En attente de réussite
                  - button "R4 — Préparer les tests de réception En attente de réussite" [ref=e206] [cursor=pointer]:
                    - generic [ref=e207]: R4 — Préparer les tests de réception
                    - generic [ref=e208]: En attente de réussite
            - navigation "Pages des demandes" [ref=e209]:
              - button "Rechercher une demande" [ref=e210] [cursor=pointer]
```

# Test source

```ts
  1   | const {test,expect,_electron:electron}=require('@playwright/test');
  2   | const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
  3   | const {execFileSync}=require('node:child_process');
  4   | const {cleanupBroker}=require('./terminal-fixture.cjs');
  5   | const root=path.resolve(__dirname,'..');
  6   | let directory,app,page,fixture,environment,backend;
  7   | const seed=`
  8   | import json,sys,os
  9   | sys.path.insert(0,sys.argv[1])
  10  | from workflow_engine import Engine
  11  | from workflow_engine.library import node,edge
  12  | from workflow_engine.conversations import Conversations
  13  | e=Engine(sys.argv[2]);p=e.create_project('Projet Atlas');q=e.create_project('Projet Boréal');c=Conversations(e)
  14  | g={'schema':1,'id':'requests','title':'Analyser, réaliser et vérifier les demandes','defaults':{'provider':'codex','model':'synthetic'},'nodes':[
  15  |  node('plan','Préparer le plan','task',outputs={'plan':'string'},validation='contract'),
  16  |  node('gate','Valider le périmètre','decision',inputs={'plan':'string'},question='Le périmètre et les critères proposés conviennent-ils ?',options=['approve','reject']),
  17  |  node('work','Réaliser la demande','agent',max_attempts=2,validation='contract')],
  18  |  'edges':[{**edge('plan','gate'),'mapping':{'plan':'plan'}},edge('gate','work','approve')]}
  19  | e.save(p['id'],g);conversation=c.open(p['id'],g,'codex',projects=[q['id']],model='synthetic');cid=conversation['id'];items=[]
  20  | titles=['R1 — Retrouver les documents du client','R2 — Corriger le filtre des commandes','R3 — Vérifier les droits de consultation','R4 — Préparer les tests de réception','R5 — Vérifier la copie de travail']
  21  | for i,title in enumerate(titles):
  22  |  item=c.add(cid,title,project=p['id'] if i%2==0 else q['id']);items.append(item)
  23  |  token=e.claim(item['run'],'plan')['token'];e.submit(item['run'],'plan',token,{'ok':True,'summary':'Plan prêt pour examen.','outputs':{'plan':'Vérifier le comportement attendu, réaliser la correction dans une copie de travail, puis fournir le résultat des tests.'}})
  24  | def approve(item):
  25  |  state=e.run(item['run'])['nodes']['gate'];e.decide(item['run'],'gate',state['nonce'],state['proposal'],'approve',human=True)
  26  | approve(items[4]);token=e.claim(items[4]['run'],'work')['token'];e.submit(items[4]['run'],'work',token,{'ok':False,'summary':'La copie de travail manque d’espace disque. Libérer de l’espace puis réessayer.','outputs':{}})
  27  | e.retry(items[4]['run'],'work','Utiliser un répertoire local disposant de suffisamment d’espace.',human=True)
  28  | token=e.claim(items[4]['run'],'work')['token'];e.submit(items[4]['run'],'work',token,{'ok':False,'summary':'La copie reste incomplète. Vérifier le répertoire de destination avant une nouvelle demande.','outputs':{}})
  29  | items.append(c.add(cid,'C1 — Consolider les résultats de R1 à R4',depends_on=[i['id'] for i in items[:4]]))
  30  | if sys.argv[3] in ['running','pages','compact']:
  31  |  for item in items[:2]:
  32  |   approve(item);e.claim(item['run'],'work',executor='native',owner_pid=os.getppid())
  33  | if sys.argv[3]=='compact':
  34  |  from workflow_engine.conversations import ask
  35  |  state=e.run(items[0]['run'])['nodes']['work'];ask(e,items[0]['run'],'work',state['token'],'Pour R1, faut-il vérifier uniquement les documents existants ou préparer aussi les pièces manquantes ? La réponse ne vaut pas accord d’envoi.')
  36  | if sys.argv[3]=='pages':
  37  |  for n in range(7,29):items.append(c.add(cid,'R'+str(n)+' — Autre demande à coordonner',depends_on=[items[0]['id']]))
  38  | print(json.dumps({'project':p,'second':q,'conversation':cid,'items':items}))
  39  | `;
  40  | const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
  41  | const rows=()=>page.locator('#conversation-overview .conversation-demand');
  42  | const row=i=>page.locator(`#conversation-overview .conversation-demand[data-run="${fixture.items[i].run}"]`);
  43  | const openRow=async i=>{await row(i).locator('.conversation-demand-open').click();await expect(page.locator('.workflow-heading h1')).toContainText(fixture.items[i].request);};
  44  | async function screenshot(info,name){await page.screenshot({path:info.outputPath(name+'.png')});}
  45  | async function dimensions(width,height,zoom=1){await app.evaluate(({BrowserWindow},factor)=>BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(factor),zoom);await page.setViewportSize({width,height});}
  46  | 
  47  | test.beforeEach(async({},info)=>{
  48  |   directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-overview-ui-'));fs.mkdirSync(path.join(directory,'bin'));
  49  |   fs.writeFileSync(path.join(directory,'bin/codex'),'#!/bin/sh\nprintf "SUIVI SYNTHÉTIQUE PRÊT\\n"\nwhile IFS= read -r line; do printf "DEMANDE : %s\\n" "$line"; done\n',{mode:0o755});
  50  |   environment={...process.env,PATH:path.join(directory,'bin')+':/usr/bin:/bin',HOME:directory,XDG_CONFIG_HOME:path.join(directory,'config'),XDG_CACHE_HOME:path.join(directory,'cache'),XDG_DATA_HOME:path.join(directory,'data'),TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_AGENTS_DIR:path.join(directory,'absent-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'};
  51  |   backend=process.env.TRICORDER_EXECUTABLE?path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend'):path.join(root,'backend');
  52  |   fixture=JSON.parse(execFileSync('/usr/bin/python3',['-c',seed,backend,directory,info.title.startsWith('running')?'running':info.title.startsWith('pages')?'pages':info.title.startsWith('compact')?'compact':'gates'],{env:environment,encoding:'utf8'}));
  53  |   app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?['--workflow-studio']:[root,'--workflow-studio'],env:environment});page=await app.firstWindow();await dimensions(1500,1000);
  54  |   await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:'Projet Atlas'}).click();
  55  |   await page.locator(`[data-action=open-conversation][data-id="${fixture.conversation}"]`).click();
  56  |   await expect(page.getByRole('group',{name:'Périmètre du suivi'}).getByRole('button',{name:'Vue d’ensemble',exact:true})).toHaveAttribute('aria-pressed','true');
  57  |   await expect(rows()).toHaveCount(info.title.startsWith('pages')?25:6);
  58  |   await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();await expect(page.locator('.xterm-screen:visible')).toContainText('SUIVI SYNTHÉTIQUE PRÊT');
  59  | });
  60  | test.afterEach(async()=>{
  61  |   if(app)await app.close();await cleanupBroker(path.join(directory,'cockpit/odoo-tricorder/pty.sock'));await cleanupBroker(path.join(directory,'studio-pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  62  | });
  63  | 
  64  | test('gates: six demands, cross-project context and true dependency links remain understandable',async({},info)=>{
  65  |   const sessions=(await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).map(s=>s.id);
  66  |   await expect(page.locator('.conversation-overview-heading')).toContainText('4 décisions');
  67  |   await expect(row(0)).toContainText('Projet Atlas');await expect(row(1)).toContainText('Projet Boréal');
  68  |   await expect(row(0).locator('.conversation-workers')).toHaveCount(0);
  69  |   await expect(row(5).locator('.dependency-link')).toHaveCount(4);
  70  |   for(let i=0;i<4;i++)await expect(row(5)).toContainText(fixture.items[i].request);
  71  |   await page.locator('[data-theme-choice=light]').click();await screenshot(info,'overview-six-demands-light-1500');
  72  |   await row(5).locator('.dependency-link').filter({hasText:'R3 —'}).click();await expect(page.locator('.workflow-heading h1')).toContainText('R3 —');
  73  |   await page.getByRole('button',{name:'Examiner la décision',exact:true}).click();await expect(page.locator('#inspector')).toContainText('Le périmètre et les critères proposés conviennent-ils');
  74  |   await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await row(5).locator('.conversation-demand-action').click();await expect(page.locator('#inspector .dependency-list button')).toHaveCount(4);
> 75  |   await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await dimensions(1024,768,1.25);await page.locator('[data-theme-choice=dark]').click();await row(5).scrollIntoViewIfNeeded();await screenshot(info,'overview-dependencies-dark-1024-125');
      |                                                                                                                                                                                 ^ Error: locator.scrollIntoViewIfNeeded: Element is not attached to the DOM
  76  |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  77  |   expect(await page.locator('#conversation-overview').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  78  |   expect((await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).map(s=>s.id)).toEqual(sessions);
  79  | });
  80  | 
  81  | test('running: actual agents, failure history and explicit dispatch are distinct',async({},info)=>{
  82  |   await expect(page.locator('.conversation-overview-heading')).toContainText('2 étapes en cours');
  83  |   await expect(row(0).locator('.conversation-workers')).toContainText('Agent · OpenAI · synthetic');await expect(row(1).locator('.conversation-workers')).toContainText('Pris en charge dans le terminal');
  84  |   await expect(row(2).locator('.conversation-workers')).toHaveCount(0);
  85  |   await screenshot(info,'overview-two-agents-light-1500');
  86  |   const before=await call('conversation.get',{conversation:fixture.conversation});
  87  |   await expect(page.getByRole('button',{name:'Lancer les demandes prêtes',exact:true})).toBeDisabled();await expect(page.locator('.overview-page-scope').last()).toContainText('0 demande(s) lançable(s)');
  88  |   const after=await call('conversation.get',{conversation:fixture.conversation});expect(after.activity.running).toBe(before.activity.running);expect(after.activity.decisions).toBe(before.activity.decisions);
  89  |   await openRow(4);await page.getByRole('button',{name:'Examiner l’échec',exact:true}).click();await expect(page.locator('#inspector')).toContainText('La copie reste incomplète');
  90  |   await page.locator('details.result-context > summary').click();await expect(page.locator('.attempt-history')).toContainText('La copie de travail manque d’espace disque');await expect(page.locator('.attempt-history')).toContainText('Utiliser un répertoire local');
  91  |   await screenshot(info,'failure-and-history-light-1500');
  92  |   await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await dimensions(1024,768,1.25);await page.locator('[data-theme-choice=dark]').click();await page.locator('#conversation-overview').evaluate(el=>el.scrollTop=0);await screenshot(info,'overview-two-agents-dark-1024-125');
  93  |   expect(await page.locator('#conversation-overview').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  94  | });
  95  | 
  96  | test('pages: global activity survives paging and off-page dependencies open the named request',async({},info)=>{
  97  |   await expect(page.locator('.conversation-overview-heading')).toContainText('2 étapes en cours');
  98  |   await page.locator('#conversation-overview').getByRole('button',{name:'Demandes suivantes',exact:true}).click();await expect(rows()).toHaveCount(3);
  99  |   await expect(page.locator('.overview-page-scope').first()).toContainText('26–28 sur 28');await expect(page.locator('.conversation-overview-heading')).toContainText('2 étapes en cours');
  100 |   await expect(rows().first().locator('.dependency-link')).toContainText('hors page');
  101 |   await rows().first().locator('.dependency-link').click();await expect(page.locator('.workflow-heading h1')).toContainText('R1 — Retrouver les documents');
  102 |   await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await expect(page.locator('.overview-page-scope').first()).toContainText('26–28 sur 28');
  103 |   await page.getByRole('button',{name:'Rechercher une demande',exact:true}).click();await page.getByRole('searchbox',{name:'Rechercher une demande',exact:true}).fill('R4 —');await page.locator('#conversation-search button').click();await expect(rows()).toHaveCount(1);await expect(rows()).toContainText('R4 —');
  104 |   await expect(page.locator('.conversation-overview-heading')).toContainText('2 étapes en cours');await expect(page.locator('.overview-page-scope').first()).toContainText('28 au total');
  105 |   await page.locator('.request-selector > summary').click();await screenshot(info,'overview-filter-global-activity-light-1500');
  106 | });
  107 | 
  108 | test('compact: terminal working lines and the question answer remain visible together',async({},info)=>{
  109 |   const sessions=(await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).map(s=>s.id);
  110 |   const storedSplit=await page.evaluate(()=>localStorage.getItem('tricorder.terminalStackedSplit'));
  111 |   await dimensions(1024,768,1.25);await page.locator('[data-theme-choice=dark]').click();await row(0).locator('.conversation-demand-action').click();
  112 |   await expect.poll(()=>page.locator('.xterm-screen:visible').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(120);
  113 |   await expect(page.locator('#question-form button')).toBeInViewport({ratio:1});
  114 |   const formFits=()=>page.locator('#question-form').evaluate(el=>{const form=el.getBoundingClientRect(),inspector=el.closest('#inspector').getBoundingClientRect();return form.bottom<=inspector.bottom+1 && form.top>=inspector.top;});
  115 |   expect(await formFits()).toBe(true);
  116 |   await page.getByLabel('Votre réponse',{exact:true}).fill('Vérifier les documents existants, sans envoi.');
  117 |   await screenshot(info,'compact-question-terminal-dark-1024-125');
  118 |   expect(await page.evaluate(()=>localStorage.getItem('tricorder.terminalStackedSplit'))).toBe(storedSplit);
  119 |   const separator=page.getByRole('separator',{name:'Taille du terminal'});
  120 |   const size=()=>page.locator('.main-content').evaluate(el=>{const total=el.getBoundingClientRect().height,height=el.querySelector('#terminal-workspace').getBoundingClientRect().height;return {height,ratio:height/total*100};});
  121 |   const before=await size();expect(Math.abs(Number(await separator.getAttribute('aria-valuenow'))-before.ratio)).toBeLessThan(.2);
  122 |   expect(Number(await separator.getAttribute('aria-valuemin'))).toBeGreaterThan(30);
  123 |   await separator.focus();await separator.press('ArrowDown');await expect.poll(async()=>(await size()).height).toBeGreaterThan(before.height+10);
  124 |   const moved=await size();expect(Math.abs(Number(await separator.getAttribute('aria-valuenow'))-moved.ratio)).toBeLessThan(.2);
  125 |   await separator.press('ArrowUp');expect(await formFits()).toBe(true);
  126 |   await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await row(0).locator('.conversation-demand-action').click();await expect(page.getByLabel('Votre réponse',{exact:true})).toHaveValue('Vérifier les documents existants, sans envoi.');
  127 |   await dimensions(1440,900);await page.locator('[data-theme-choice=light]').click();await page.locator('[data-action=terminal-layout]').click();
  128 |   const handle=await separator.boundingBox(),body=await page.locator('.main-content').boundingBox();await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2,body.y+body.height*.52);await page.mouse.up();
  129 |   expect(Math.abs(Number(await separator.getAttribute('aria-valuenow'))-52)).toBeLessThan(.2);await expect(page.locator('#question-form button')).toBeInViewport({ratio:1});expect(await formFits()).toBe(true);
  130 |   await screenshot(info,'compact-question-terminal-light-1440-52');
  131 |   expect((await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).map(s=>s.id)).toEqual(sessions);
  132 |   await page.locator('#question-form button').click();await expect(page.locator('#question-form')).toHaveCount(0);
  133 | });
  134 | 
```