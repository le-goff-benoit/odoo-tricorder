# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: simplicity.spec.cjs >> reuse: two launches reuse one workflow and reopening keeps the same terminal
- Location: tests/simplicity.spec.cjs:21:1

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Retrouver la conversation', exact: true })

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
          - button "Thème sombre" [ref=e73] [cursor=pointer]
          - button "Thème système" [pressed] [ref=e76] [cursor=pointer]
        - status [ref=e80]: À jour · 00:14
        - button "Actualiser · À jour · 00:14" [ref=e81] [cursor=pointer]
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
            - button "Codex · Première demande indépendante." [pressed] [ref=e95] [cursor=pointer]:
              - generic "Terminal ouvert — ne prouve pas qu’une étape travaille" [ref=e96]
              - img "OpenAI" [ref=e97]
            - button "Arrêter ce terminal" [ref=e100] [cursor=pointer]
          - button "Nouveau terminal" [ref=e103] [cursor=pointer]
          - button "Rechercher dans le terminal" [ref=e107] [cursor=pointer]
        - 'generic "Conversation du workflow affiché · Shell : Projet Atlas" [ref=e112]'
        - generic [ref=e117]:
          - textbox "Terminal input" [ref=e118]
          - generic [aria-hidden]:
            - generic: "'python3' '/home/blegoff/odoo-tricorder/backend/agent_launch.py' '/tmp/t"
            - generic: ricorder-simplicity-XObRQd/cockpit/agent-events/8b7028ec-874c-4e34-8f06-
            - generic: 9cb9b3e8c9ae.launch.json'
            - generic: To run a command as administrator (user "root"), use "sudo <command>".
            - generic: See "man sudo_root" for details.
            - generic: blegoff@wrk226:~/projects/p5cc17ecc191942da$ 'python3' '/home/blegoff/od
            - generic: oo-tricorder/backend/agent_launch.py' '/tmp/tricorder-simplicity-XObRQd/
            - generic: cockpit/agent-events/8b7028ec-874c-4e34-8f06-9cb9b3e8c9ae.launch.json'
            - generic: AGENT SYNTHÉTIQUE PRÊT — saisissez votre demande.
            - generic: Première demande indépendante.
            - generic: "DEMANDE REÇUE : Première demande indépendante."
      - separator "Taille du terminal" [ref=e119]
      - main [ref=e123]:
        - generic [ref=e124]:
          - generic [ref=e125]:
            - generic [ref=e126]:
              - generic [ref=e127]: Suivi · Traiter une demande de support
              - heading "Première demande indépendante." [level=1] [ref=e128]
            - group [ref=e130]:
              - generic "Options" [ref=e131] [cursor=pointer]
          - group "Périmètre du suivi" [ref=e132]:
            - button "Vue d’ensemble" [ref=e133] [cursor=pointer]
            - button "Demande" [pressed] [ref=e134] [cursor=pointer]
          - tablist "Vues du workflow"
          - generic [ref=e135]:
            - group [ref=e136]:
              - generic "1 demande" [ref=e137] [cursor=pointer]:
                - text: 1 demande
                - generic [aria-hidden] [ref=e138]: ⌄
            - paragraph [ref=e139]: Aucune étape en cours · 1 question
            - button "Voir le terminal" [ref=e140] [cursor=pointer]
          - region "État et prochaine action" [ref=e141]:
            - generic [ref=e142]:
              - generic [ref=e143]:
                - strong [ref=e144]: Réponse attendue
                - generic [ref=e145]: 0 / 2 étapes
              - button "Répondre à la question" [ref=e146] [cursor=pointer]
            - paragraph [ref=e147]: Préciser le résultat attendu
          - group "Affichage du suivi" [ref=e149]:
            - button "Graphe" [pressed] [ref=e150] [cursor=pointer]
            - button "Détail" [ref=e151] [cursor=pointer]
          - generic [ref=e153]:
            - generic "Graphe du workflow" [ref=e154]:
              - generic [ref=e156]:
                - img [aria-hidden]:
                  - generic [aria-hidden]:
                    - generic: 1 donnée
                - generic:
                  - button "Préciser le résultat attendu · Réponse attendue" [ref=e157] [cursor=pointer]:
                    - generic [ref=e160]:
                      - generic [aria-hidden] [ref=e161]: "?"
                      - generic [ref=e162]:
                        - generic "Préciser le résultat attendu" [ref=e163]
                        - generic [ref=e164]: Question
                    - generic [ref=e165]:
                      - generic [ref=e166]: Réponse attendue
                      - 'generic "Entrées : aucune · Sorties : answer" [ref=e167]': 0 entrée → 1 sortie
                  - button "Préparer la réponse au client · Prévu" [ref=e168] [cursor=pointer]:
                    - generic [ref=e171]:
                      - generic [aria-hidden] [ref=e172]: ▤
                      - generic [ref=e173]:
                        - generic "Préparer la réponse au client" [ref=e174]
                        - generic [ref=e175]: Document
                    - generic [ref=e176]:
                      - generic [ref=e177]: Prévu
                      - 'generic "Entrées : answer · Sorties : report" [ref=e178]': 1 entrée → 1 sortie
            - generic [ref=e179]:
              - generic [ref=e180]: 2 blocs · 1 lien
              - generic [ref=e181]:
                - button "Réduire le graphe" [ref=e182] [cursor=pointer]: −
                - generic [ref=e183]: 100 %
                - button "Agrandir le graphe" [ref=e184] [cursor=pointer]: +
                - button "Ajuster" [ref=e185] [cursor=pointer]
```

# Test source

```ts
  1  | const {test,expect,_electron:electron}=require('@playwright/test');
  2  | const fs=require('fs'),os=require('os'),path=require('path'),{execFileSync}=require('child_process');
  3  | const {cleanupBroker}=require('./terminal-fixture.cjs');
  4  | const root=path.resolve(__dirname,'..');let directory,app,page,fixture,environment;
  5  | const call=(action,data={})=>page.evaluate(p=>window.studio.request(p),{action,...data});
  6  | const output=path.join(root,'docs/audits/2026-10-09-simplification-independante');
  7  | async function capture(name){if(process.env.TRICORDER_CAPTURE_SIMPLICITY)await page.screenshot({path:path.join(output,'after-'+name+'.png')});}
  8  | async function startSupport(){await page.getByRole('button',{name:'Nouvelle demande',exact:true}).click();await page.getByRole('dialog').getByRole('combobox',{name:'Workflow',exact:true}).selectOption(fixture.project.id+':support');await expect(page.locator('#request-reuse')).toContainText('sera réutilisé');await page.getByRole('button',{name:'Continuer',exact:true}).click();await expect(page.getByRole('button',{name:'Lancer dans le terminal',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Lancer dans le terminal',exact:true}).click();await expect(page.getByRole('heading',{name:'Prêt pour votre demande'})).toBeVisible();await expect(page.locator('.xterm-screen:visible')).toContainText('AGENT SYNTHÉTIQUE PRÊT');}
  9  | async function type(text){await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type(text);await page.keyboard.press('Enter');}
  10 | test.beforeEach(async({},info)=>{directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-simplicity-'));fs.mkdirSync(path.join(directory,'bin'));for(const provider of ['codex','claude']){fs.copyFileSync(path.join(root,'tests/fixtures/simplicity-agent.py'),path.join(directory,'bin',provider));fs.chmodSync(path.join(directory,'bin',provider),0o755);}
  11 | environment={...process.env,HOME:directory,PATH:path.join(directory,'bin')+':/usr/bin:/bin',TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_TEST_MODE:'1',TRICORDER_AGENTS_DIR:path.join(directory,'no-pack'),XDG_CONFIG_HOME:path.join(directory,'config'),XDG_DATA_HOME:path.join(directory,'data'),XDG_CACHE_HOME:path.join(directory,'cache')};
  12 | const backend=process.env.TRICORDER_EXECUTABLE?path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend'):path.join(root,'backend');
  13 | fixture=info.title.startsWith('first project:') ? {} : JSON.parse(execFileSync('/usr/bin/python3',['-c',`import sys,json;sys.path.insert(0,sys.argv[1]);from workflow_engine import Engine;from workflow_engine.library import node,edge
  14 | e=Engine(sys.argv[2]);p=e.create_project('Projet Atlas');q=e.create_project('Projet Boréal');g={'schema':1,'id':'support','title':'Traiter une demande de support','defaults':{'provider':'codex','model':'inert'},'nodes':[node('question','Préciser le résultat attendu','question',question='Quel résultat doit obtenir le client ?',outputs={'answer':'string'}),node('draft','Préparer la réponse au client','document',inputs={'answer':'string'},outputs={'report':'string'},criteria=[],validation='automatic')],'edges':[{**edge('question','draft'),'mapping':{'answer':'answer'}}]};e.save(p['id'],g);print(json.dumps({'project':p,'second':q}))`,backend,directory],{env:environment,encoding:'utf8'}));
  15 | if(info.title.startsWith('legacy:')) {const legacy=path.join(directory,'legacy-odoo');fs.mkdirSync(path.join(legacy,'.odoo-agents'),{recursive:true});fs.writeFileSync(path.join(legacy,'.odoo-agents/config'),'series = 19.0\n');execFileSync('git',['init','-q',legacy]);const release=path.join(legacy,'changelog/2026-10-01_historique');fs.mkdirSync(release,{recursive:true});fs.writeFileSync(path.join(release,'README.md'),'<!-- release ouverte -->\n# Release historique synthétique\n\nContenu à conserver.');fixture.legacy={path:legacy,file:path.join(release,'README.md'),original:fs.readFileSync(path.join(release,'README.md'),'utf8')};}
  16 | app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?['--workflow-studio']:[root,'--workflow-studio'],env:environment});page=await app.firstWindow();await page.setViewportSize({width:1440,height:900});await expect(page.getByRole('heading',{name:info.title.startsWith('first project:')?'Vos projets':'Activité',exact:true})).toBeVisible();});
  17 | test.afterEach(async({},info)=>{if(info.status!==info.expectedStatus && page && !page.isClosed())console.log('SYNTHETIC FAILURE',await page.locator('#execution-overview').innerText({timeout:500}).catch(()=>''),await page.locator('.xterm-screen:visible').innerText({timeout:500}).catch(()=>''));if(app){if(page&&!page.isClosed())await page.evaluate(()=>window.tricorder.terminals.list());await app.close();}await cleanupBroker(path.join(directory,'cockpit/odoo-tricorder/pty.sock'));await cleanupBroker(path.join(directory,'studio-pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
  18 | test('support: intent stays in terminal, empty conversation has a next action, question leads to result',async()=>{
  19 | await capture('activity');await startSupport();await capture('ready-terminal');const before=await call('workflow.list',{project:fixture.project.id});expect(before.total).toBe(1);await type('Analyser le message du client et préparer une réponse.');await expect(page.locator('.execution-label')).toHaveText('Réponse attendue');await capture('support-question-graph');await page.getByRole('button',{name:'Répondre à la question',exact:true}).click();await expect(page.getByRole('navigation',{name:'Position dans le workflow'})).toBeVisible();await page.getByLabel('Votre réponse',{exact:true}).fill('Le client doit pouvoir retrouver le document.');await capture('support-question-detail');await page.locator('#question-form').getByRole('button').click();await expect(page.locator('.execution-label')).toHaveText('Terminée');await page.getByRole('button',{name:'Voir le rapport',exact:true}).click();await expect(page.locator('#document-view')).toContainText('Le client doit pouvoir retrouver le document.');await capture('support-result');expect((await call('workflow.list',{project:fixture.project.id})).total).toBe(1);
  20 | });
  21 | test('reuse: two launches reuse one workflow and reopening keeps the same terminal',async()=>{
> 22 | await startSupport();await type('Première demande indépendante.');await expect(page.locator('.execution-label')).toHaveText('Réponse attendue');const terminal=(await page.evaluate(()=>window.tricorder.terminals.list())).find(s=>s.alive);const c=(await call('conversation.list',{project:fixture.project.id}))[0];await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:'Projet Atlas'}).click();await expect(page.getByRole('heading',{name:'Reprendre le travail'})).toBeVisible();await capture('project-resume');await page.locator(`[data-action=open-conversation][data-id="${c.id}"]`).click();await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();expect((await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).map(s=>s.id)).toEqual([terminal.id]);await page.locator('[data-workflow-route=overview]').click();await startSupport();expect((await call('workflow.list',{project:fixture.project.id})).total).toBe(1);expect(await call('conversation.list',{project:fixture.project.id})).toHaveLength(2);
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  23 | });
  24 | 
  25 | test('scope: adaptation is explicit and reusable on another project',async()=>{
  26 | await page.getByRole('button',{name:'Nouvelle demande',exact:true}).click();await page.getByRole('dialog').getByRole('combobox',{name:'Workflow',exact:true}).selectOption(fixture.project.id+':support');await page.getByLabel('Projet principal',{exact:true}).selectOption(fixture.second.id);await expect(page.locator('#request-reuse')).toContainText('Une adaptation');await expect(page.locator('#request-reuse')).toContainText('Projet Boréal');await capture('adaptation-explicit');await page.getByRole('button',{name:'Enregistrer et continuer',exact:true}).click();await page.getByRole('button',{name:'Lancer dans le terminal',exact:true}).click();await expect(page.getByRole('heading',{name:'Prêt pour votre demande'})).toBeVisible();expect((await call('workflow.list',{project:fixture.project.id})).total).toBe(1);const copied=await call('workflow.list',{project:fixture.second.id});expect(copied.total).toBe(1);expect(fs.existsSync(path.join(fixture.second.path,'.tricorder/workflows',copied.items[0].id+'.json'))).toBe(true);
  27 | await page.locator('[data-workflow-route=global]').click();await expect(page.getByRole('heading',{name:'Mes workflows'})).toBeVisible();await page.getByLabel('Rechercher un workflow').fill('Boréal');await expect(page.locator('.workflow-row:visible')).toHaveCount(1);await capture('all-project-workflows');await page.locator('.workflow-row:visible').getByRole('button',{name:'Exécuter…',exact:true}).click();await page.getByRole('button',{name:'Lancer dans le terminal',exact:true}).click();await expect(page.getByRole('heading',{name:'Prêt pour votre demande'})).toBeVisible();expect((await call('workflow.list',{project:fixture.second.id})).total).toBe(1);
  28 | });
  29 | 
  30 | test('cross project: one terminal coordinates two projects without copying the workflow',async()=>{
  31 | await page.getByRole('button',{name:'Nouvelle demande',exact:true}).click();await page.getByRole('dialog').getByRole('combobox',{name:'Workflow',exact:true}).selectOption(fixture.project.id+':support');await page.getByRole('button',{name:'Continuer',exact:true}).click();await page.getByText('Inclure d’autres projets',{exact:true}).click();await page.getByLabel('Projet Boréal',{exact:true}).check();await capture('cross-project-scope');await page.getByRole('button',{name:'Lancer dans le terminal',exact:true}).click();await expect(page.locator('.xterm-screen:visible')).toContainText('AGENT SYNTHÉTIQUE PRÊT');await type('Demande du projet Atlas.');await expect(page.locator('.execution-label')).toHaveText('Réponse attendue');await type('Autre projet: vérifier également Boréal.');await expect(page.locator('.request-selector > summary')).toContainText('2 demandes');await page.locator('.request-selector > summary').click();await expect(page.locator('.work-items')).toContainText('Projet Atlas');await expect(page.locator('.work-items')).toContainText('Projet Boréal');await page.locator('.work-items button').filter({hasText:'Autre projet:'}).click();await expect(page.locator('.workflow-heading h1')).toContainText('Autre projet:');await capture('cross-project-follow');const conversations=await call('conversation.list',{project:fixture.project.id});expect(conversations).toHaveLength(1);const c=await call('conversation.get',{conversation:conversations[0].id});expect(new Set(c.items.map(i=>i.project))).toEqual(new Set([fixture.project.id,fixture.second.id]));expect((await call('workflow.list',{project:fixture.second.id})).total).toBe(0);expect((await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive)).toHaveLength(1);
  32 | });
  33 | 
  34 | test('meeting: work without a project produces a draft and requires the intended decision',async()=>{
  35 | await call('workspace.get');const graph={schema:1,id:'meeting-local',title:'Clôturer la réunion',defaults:{provider:'codex',model:'inert'},nodes:[{id:'minutes',kind:'document',title:'Préparer le compte rendu',outputs:{report:'string'},criteria:[],validation:'automatic'},{id:'approval',kind:'decision',title:'Vérifier le destinataire du brouillon',question:'Préparer un brouillon pour equipe@example.test ?',options:['approve','reject'],inputs:{report:'string'},operation:{action:'prepare-draft',target:'equipe@example.test',candidate:'minutes-reviewed'}},{id:'mail',kind:'document',title:'Préparer le brouillon d’email',outputs:{draft:'string'},criteria:[],validation:'automatic'}],edges:[{id:'minutes-approval',from:'minutes',to:'approval',outcome:'done',mapping:{report:'report'}},{id:'approval-mail',from:'approval',to:'mail',outcome:'approve'}]};await call('workflow.save',{project:'workspace',graph});await page.getByRole('button',{name:'Nouvelle demande',exact:true}).click();await page.getByRole('dialog').getByRole('combobox',{name:'Workflow',exact:true}).selectOption('workspace:meeting-local');await expect(page.getByLabel('Projet principal',{exact:true})).toHaveValue('workspace');await expect(page.locator('#request-reuse')).toContainText('Sans projet');await page.getByRole('button',{name:'Continuer',exact:true}).click();await page.getByRole('button',{name:'Lancer dans le terminal',exact:true}).click();await expect(page.locator('.xterm-screen:visible')).toContainText('AGENT SYNTHÉTIQUE PRÊT');await type('Le compte rendu doit rappeler les décisions de la réunion.');await expect(page.locator('.execution-label')).toHaveText('Décision attendue');await page.getByRole('button',{name:'Examiner la décision',exact:true}).click();await expect(page.locator('#inspector')).toContainText('equipe@example.test');await capture('meeting-decision');await page.locator('#inspector .interaction-footer').getByRole('button',{name:'Autoriser cette opération',exact:true}).click();await expect(page.locator('.execution-label')).toHaveText('Terminée');await page.getByRole('button',{name:'Voir le rapport',exact:true}).click();await expect(page.locator('#document-view')).toContainText('Préparer le brouillon d’email');await capture('meeting-result');expect((await call('workflow.list',{project:'workspace'})).total).toBe(1);
  36 | });
  37 | 
  38 | test('home terminal: shell and workflow entry remain usable before selecting a project',async()=>{
  39 | await page.locator('[data-action=terminal-toggle]').click();await expect(page.getByRole('button',{name:'Choisir un workflow',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Ouvrir un terminal',exact:true}).click();await expect.poll(async()=>(await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).length).toBe(1);await type('printf "TERMINAL_ACCESSIBLE\\n"');await expect(page.locator('.xterm-screen:visible')).toContainText('TERMINAL_ACCESSIBLE');await capture('home-shell');
  40 | });
  41 | 
  42 | test('terminal answer: input in the same PTY answers the pending workflow question',async()=>{
  43 | await startSupport();await type('Analyser une demande puis poser la question utile.');await expect(page.locator('.execution-label')).toHaveText('Réponse attendue');const terminal=(await page.evaluate(()=>window.tricorder.terminals.list())).find(s=>s.alive);await type('Réponse: Le client attend une proposition claire et relue.');await expect(page.locator('.xterm-screen:visible')).toContainText('RÉPONSE TRANSMISE AU WORKFLOW');await expect(page.locator('.execution-label')).toHaveText('Terminée');const c=(await call('conversation.list',{project:fixture.project.id}))[0],detail=await call('conversation.get',{conversation:c.id});expect(detail.items).toHaveLength(1);const {run}=await call('run.get',{run:detail.items[0].run});expect(run.nodes.question.result.outputs.answer).toBe('Le client attend une proposition claire et relue.');expect((await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).map(s=>[s.id,s.pid])).toEqual([[terminal.id,terminal.pid]]);await capture('terminal-answer-result');
  44 | });
  45 | 
  46 | test('reading context: graph, other request and compact layout preserve the answer draft',async()=>{
  47 | await startSupport();await type('Une demande qui nécessite une réponse.');await expect(page.locator('.execution-label')).toHaveText('Réponse attendue');await page.getByRole('button',{name:'Répondre à la question',exact:true}).click();await page.getByLabel('Votre réponse',{exact:true}).fill('Brouillon conservé pendant la lecture du workflow.');await page.getByRole('button',{name:'Graphe',exact:true}).click();await page.getByRole('button',{name:'Détail',exact:true}).click();await expect(page.getByLabel('Votre réponse',{exact:true})).toHaveValue('Brouillon conservé pendant la lecture du workflow.');await page.setViewportSize({width:1024,height:768});await page.locator('[data-theme-choice=dark]').click();await capture('question-compact-dark');await expect(page.getByLabel('Votre réponse',{exact:true})).toBeVisible();await expect(page.locator('#question-form button')).toBeInViewport();await page.getByRole('button',{name:'Graphe',exact:true}).click();await capture('graph-compact-dark');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  48 | });
  49 | 
  50 | test('design: create a blank generic workflow, connect typed I/O, save and launch in the same app',async()=>{
  51 | await page.locator('[data-workflow-route=global]').click();await page.getByRole('button',{name:'Créer un workflow',exact:true}).click();await expect(page.getByLabel('Modèle de workflow',{exact:true})).toHaveValue('__blank__');await page.getByLabel('Nom du workflow',{exact:true}).fill('Préparer un diagnostic');await page.getByRole('button',{name:'Créer et ouvrir le workflow'}).click();await expect(page.getByRole('heading',{name:'Préparer un diagnostic',exact:true})).toBeVisible();await expect(page.locator('#terminal-workspace')).toBeHidden();await page.locator('.node[data-id=start]').click();await page.getByLabel('Nom du bloc',{exact:true}).fill('Lire la demande');await page.getByRole('button',{name:'Ajouter une sortie',exact:true}).click();await page.getByLabel('Nom (sans espaces)').fill('diagnostic');await page.getByRole('button',{name:'Ajouter la donnée',exact:true}).click();await expect(page.getByLabel('Nom du bloc',{exact:true})).toHaveValue('Lire la demande');await page.getByRole('button',{name:'+ Ajouter un bloc',exact:true}).click();await page.getByLabel("Type d'étape").selectOption('document');await page.getByRole('dialog').getByLabel('Nom du bloc').fill('Rédiger la réponse');await page.getByRole('button',{name:'Ajouter au workflow'}).click();await page.getByRole('button',{name:'Ajouter une entrée',exact:true}).click();await page.getByLabel('Nom (sans espaces)').fill('diagnostic');await page.getByRole('button',{name:'Ajouter la donnée',exact:true}).click();await page.getByRole('button',{name:'Relier',exact:true}).click();await page.getByLabel('Depuis',{exact:true}).selectOption('start');await page.getByLabel('Vers',{exact:true}).selectOption({label:'Rédiger la réponse'});await page.getByLabel('Sortie à transmettre').selectOption('diagnostic');await page.getByLabel('Entrée destinataire').selectOption('diagnostic');await page.getByRole('button',{name:'Créer le lien'}).click();await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await capture('editor-io');const catalog=await call('workflow.list',{project:'workspace'});const saved=await call('workflow.get',{project:'workspace',workflow:catalog.items.find(g=>g.title==='Préparer un diagnostic').id});expect(saved.edges[0].mapping).toEqual({diagnostic:'diagnostic'});expect(saved.nodes).toHaveLength(2);expect(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length)).toBe(1);await page.getByRole('button',{name:'Exécuter…',exact:true}).click();await page.getByRole('button',{name:'Simuler le parcours',exact:true}).click();await expect(page.locator('#run-banner')).toContainText('Simulation');await expect(page.locator('.node')).toHaveCount(2);await capture('created-workflow-follow');
  52 | });
  53 | 
  54 | test('empty conversation: Activity resumes the open terminal before any task exists',async()=>{
  55 | await startSupport();const before=(await page.evaluate(()=>window.tricorder.terminals.list())).find(s=>s.alive);const c=(await call('conversation.list',{project:fixture.project.id}))[0];await page.locator('[data-workflow-route=overview]').click();await expect(page.getByRole('heading',{name:'Conversations ouvertes'})).toBeVisible();const row=page.locator(`[data-action=open-conversation][data-id="${c.id}"]`);await expect(row).toContainText('Aucune étape en cours');await capture('activity-empty-conversation');await row.click();await expect(page.getByRole('heading',{name:'Prêt pour votre demande'})).toBeVisible();await page.getByRole('button',{name:'Retrouver le terminal',exact:true}).click();expect((await call('conversation.list',{project:fixture.project.id})).length).toBe(1);expect((await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).map(s=>[s.id,s.pid])).toEqual([[before.id,before.pid]]);await type('Reprendre ici cette conversation déjà ouverte.');await expect(page.locator('.execution-label')).toHaveText('Réponse attendue');await page.locator('[data-workflow-route=overview]').click();await expect(page.getByRole('heading',{name:'Conversations ouvertes'})).toBeHidden();await expect(page.getByRole('heading',{name:'À traiter',exact:true})).toBeVisible();await capture('activity-needs-answer');
  56 | });
  57 | 
  58 | test('legacy: historical Odoo release remains accessible in the same app without changing it',async()=>{
  59 | await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:'legacy-odoo'}).click();await page.locator('.project-menu > summary').click();await page.getByRole('button',{name:'Releases et suivi Odoo',exact:true}).click();await expect(page.locator('#release-select')).toHaveValue('2026-10-01_historique');await expect(page.locator('#release-title')).toContainText('Release historique synthétique');await capture('legacy-release');expect(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length)).toBe(1);expect(fs.readFileSync(fixture.legacy.file,'utf8')).toBe(fixture.legacy.original);await page.locator('[data-workflow-route=overview]').click();await expect(page.getByRole('heading',{name:'Activité',exact:true})).toBeVisible();
  60 | });
  61 | 
  62 | 
  63 | test('first project: an empty installation can add an existing Git repository',async()=>{
  64 | const repo=path.join(directory,'first-repository');fs.mkdirSync(repo);execFileSync('git',['init','-q',repo]);
  65 | await page.locator('[data-workflow-route=projects]').click();await expect(page.locator('.project-card')).toHaveCount(0);await capture('first-project');
  66 | await page.getByRole('button',{name:'+ Nouveau projet',exact:true}).click();await page.getByRole('dialog').getByLabel('Nom du projet',{exact:true}).fill('Premier projet');
  67 | await page.getByLabel('Emplacement',{exact:true}).selectOption('repository');
  68 | await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},repo);await page.getByRole('button',{name:'Choisir…',exact:true}).click();await page.getByRole('button',{name:'Créer le projet',exact:true}).click();await expect(page.getByRole('heading',{name:'Premier projet',exact:true})).toBeVisible();expect((await call('bootstrap')).projects).toHaveLength(1);await expect(page.getByRole('button',{name:'Nouvelle demande',exact:true})).toBeEnabled();
  69 | });
  70 | 
  71 | test('catalog pagination: a workflow beyond the first project page opens and launches without a copy',async()=>{
  72 | for(let i=0;i<26;i++)await call('workflow.save',{project:fixture.project.id,graph:{schema:1,id:'catalog-'+String(i).padStart(2,'0'),title:'Workflow du catalogue '+i,defaults:{provider:'codex',model:'inert'},nodes:[{id:'question',title:'Préciser la demande',kind:'question',question:'Quel résultat ?',outputs:{answer:'string'}}],edges:[]}});
  73 | await page.locator('[data-workflow-route=global]').click();await page.getByLabel('Rechercher un workflow').fill('catalogue 25');const row=page.locator('.workflow-row:visible');await expect(row).toHaveCount(1);await row.getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();await expect(page.getByRole('heading',{name:'Workflow du catalogue 25',exact:true})).toBeVisible();await page.locator('[data-workflow-route=global]').click();await page.getByLabel('Rechercher un workflow').fill('catalogue 25');await page.locator('.workflow-row:visible').getByRole('button',{name:'Exécuter…',exact:true}).click();await page.getByRole('button',{name:'Lancer dans le terminal',exact:true}).click();await expect(page.getByRole('heading',{name:'Prêt pour votre demande'})).toBeVisible();expect((await call('workflow.list',{project:fixture.project.id})).total).toBe(27);const conversations=await call('conversation.list',{project:fixture.project.id});expect(conversations).toHaveLength(1);expect((await call('conversation.get',{conversation:conversations[0].id})).definition.id).toBe('catalog-25');
  74 | });
  75 | 
```