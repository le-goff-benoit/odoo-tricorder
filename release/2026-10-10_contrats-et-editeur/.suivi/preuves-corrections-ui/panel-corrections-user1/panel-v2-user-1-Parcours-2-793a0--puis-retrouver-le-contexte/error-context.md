# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: panel-v2-user-1.spec.cjs >> Parcours 2 — réutiliser vers un projet, demande en terminal, lire parallèle et dépendance puis retrouver le contexte
- Location: tests/panel-v2-user-1.spec.cjs:26:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.node[data-id=scope] .pill')
Expected substring: "Approuvé par vous"
Received string:    "Approuvée"
Timeout: 5000ms

Call log:
  - Expect "toContainText" locator('.node[data-id=scope] .pill') with timeout 5000ms
  - waiting for locator('.node[data-id=scope] .pill')
    2 × locator resolved to <span class="pill waiting">Décision attendue</span>
      - unexpected value "Décision attendue"
    12 × locator resolved to <span class="pill accepted">Approuvée</span>
       - unexpected value "Approuvée"

```

```yaml
- complementary "Tricorder":
  - text: Tricorder
  - navigation "Navigation principale":
    - button "Activité"
    - button "Workflows"
    - button "Projets"
  - text: Accès rapide aux projets Rechercher un projet
  - searchbox "Rechercher un projet"
  - button "Lancement produit synthétique"
  - button "Réunion commerciale synthétique"
  - navigation "Configuration":
    - button "Planifications"
    - button "Connexions"
  - button "Paramètres"
  - group: Outils et aide
- main:
  - text: Lancement produit synthétique
  - button "Terminal 1" [pressed]
  - text: IA des prochains lancements
  - combobox "Fournisseur IA":
    - option "OpenAI · Codex" [selected]
    - option "Anthropic · Claude"
  - group "Thème de l’interface":
    - button "Thème clair"
    - button "Thème sombre"
    - button "Thème système" [pressed]
  - status: À jour
  - button "Actualiser · À jour"
  - strong: Terminal
  - button "Contexte"
  - button "Disposition verticale"
  - button "Agrandir le terminal"
  - button "Codex · Organiser la préparation du lancement produit avec trois livrables." [pressed]:
    - img "OpenAI"
    - text: Codex · Organiser la préparation du lancement produit avec trois livrables.
  - button "Arrêter ce terminal"
  - button "Nouveau terminal"
  - button "Rechercher dans le terminal"
  - text: "Conversation du workflow affiché · Shell : Lancement produit synthétique"
  - textbox "Terminal input"
  - separator "Taille du terminal"
  - main:
    - text: Suivi · Lancement produit — méthode réutilisée
    - heading "Organiser la préparation du lancement produit avec trois livrables." [level=1]
    - group: Options
    - group "Périmètre du suivi":
      - button "Vue d’ensemble"
      - button "Demande" [pressed]
    - tablist "Vues du workflow"
    - group: 1 demande
    - paragraph: Aucune étape en cours · 1 demande à prendre en charge
    - button "Retrouver la conversation": Terminal
    - region "État et prochaine action":
      - strong: À traiter dans la conversation
      - text: 3 / 5 étapes
      - button "Continuer dans la conversation"
      - paragraph: Cette étape peut être traitée par l’agent de la conversation.
    - group "Affichage du suivi":
      - button "Graphe"
      - button "Détail" [pressed]
    - complementary "Inspecteur du bloc":
      - navigation "Position dans le workflow":
        - button "Préparer un plan":
          - strong: Préparer un plan
        - button "Étape sélectionnée Valider le plan":
          - text: Étape sélectionnée
          - strong: Valider le plan
        - button "Si autorisé Pour chaque élément du plan":
          - text: Si autorisé
          - strong: Pour chaque élément du plan
      - paragraph: Approuvée
      - paragraph
      - paragraph:
        - text: "Décision humaine :"
        - strong: Approuvée
        - text: .
      - group:
        - text: Entrées, sorties et preuves
        - heading "Entrées reçues" [level=3]
        - term: Plan
        - definition:
          - term: Objectif
          - definition: Préparer le lancement produit
          - term: Tâches
          - definition:
            - list:
              - listitem:
                - term: Id
                - definition: analyse
                - term: Titre
                - definition: Analyser les retours clients
              - listitem:
                - term: Id
                - definition: slides
                - term: Titre
                - definition: Préparer les éléments de présentation
              - listitem:
                - term: Après
                - definition:
                  - list:
                    - listitem: Analyser les retours clients
                - term: Id
                - definition: message
                - term: Titre
                - definition: Rédiger le message de lancement
        - group: Données techniques
        - paragraph:
          - text: "Sources : plan ←"
          - button "Préparer un plan"
        - heading "Résultat" [level=3]
        - term: Plan
        - definition:
          - term: Objectif
          - definition: Préparer le lancement produit
          - term: Tâches
          - definition:
            - list:
              - listitem:
                - term: Id
                - definition: analyse
                - term: Titre
                - definition: Analyser les retours clients
              - listitem:
                - term: Id
                - definition: slides
                - term: Titre
                - definition: Préparer les éléments de présentation
              - listitem:
                - term: Après
                - definition:
                  - list:
                    - listitem: Analyser les retours clients
                - term: Id
                - definition: message
                - term: Titre
                - definition: Rédiger le message de lancement
        - group: Données techniques
  - status: Décision enregistrée.
```

# Test source

```ts
  1  | const {test,expect,_electron:electron}=require('@playwright/test');
  2  | const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
  3  | const {cleanupBroker}=require('./terminal-fixture.cjs');
  4  | const root=path.resolve(__dirname,'..');let directory,app,page,backend;
  5  | const call=(action,data={})=>page.evaluate(p=>window.studio.request(p),{action,...data});
  6  | function fixture(command,data={}){const code=`import json,sys\nsys.path.insert(0,sys.argv[1])\nfrom workflow_engine import Engine\ne=Engine(sys.argv[2]);p=json.load(sys.stdin)\n${command}\n`;const r=spawnSync('/usr/bin/python3',['-c',code,backend,path.join(directory,'workflows')],{input:JSON.stringify(data),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});if(r.status)throw new Error(r.stderr);return JSON.parse(r.stdout);}
  7  | async function shot(name){await page.screenshot({path:test.info().outputPath(name+'.png'),fullPage:true});fs.writeFileSync(test.info().outputPath(name+'.txt'),await page.locator('body').innerText());}
  8  | async function projectGUI(title){await page.getByRole('button',{name:'Projets',exact:true}).click();await page.getByRole('button',{name:'+ Nouveau projet',exact:true}).click();await page.getByLabel('Nom du projet',{exact:true}).fill(title);await page.getByRole('button',{name:'Créer le projet',exact:true}).click();await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();return (await call('bootstrap')).projects.find(p=>p.title===title);}
  9  | async function adopt(title){await page.getByRole('button',{name:'Workflows',exact:true}).click();await page.getByRole('button',{name:'Créer un workflow',exact:true}).click();await page.getByLabel('Modèle de workflow',{exact:true}).selectOption('intentions-plan-work');await page.getByLabel('Nom du workflow',{exact:true}).fill(title);await page.getByLabel('Enregistrer dans',{exact:true}).selectOption({label:'Réunion commerciale synthétique'});await page.getByRole('button',{name:'Créer et ouvrir le workflow',exact:true}).click();await expect(page.locator('.node')).toHaveCount(5);}
  10 | async function intentions(values){await page.getByRole('button',{name:'Détail',exact:true}).click();for(const text of values){await page.getByLabel('Nouvelle intention',{exact:true}).fill(text);await page.getByRole('button',{name:'Ajouter à la liste',exact:true}).click();await expect(page.getByLabel('Nouvelle intention',{exact:true})).toHaveValue('');}await expect(page.locator('.collection-items li')).toHaveCount(values.length);await shot('recueil');await page.getByRole('button',{name:'Confirmer la liste et continuer',exact:true}).click();}
  11 | async function approve(){await page.getByRole('button',{name:'Examiner la décision',exact:true}).click();await page.getByRole('button',{name:'Approuver la suite',exact:true}).click();}
  12 | test.beforeEach(async()=>{directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-panel-pm-'));const bin=path.join(directory,'bin');fs.mkdirSync(bin);for(const name of ['codex','claude'])fs.writeFileSync(path.join(bin,name),'#!/bin/sh\nprintf "PANEL_PM_INERT — aucun fournisseur contacte\\n"\nsleep 90\nexit 78\n',{mode:0o755});app=await electron.launch({executablePath:process.env.TRICORDER_TEST_EXECUTABLE||process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_TEST_EXECUTABLE||process.env.TRICORDER_EXECUTABLE?(process.env.TRICORDER_TEST_APP?[process.env.TRICORDER_TEST_APP]:[]):[process.env.TRICORDER_TEST_APP||root],env:{PATH:bin+':/usr/bin:/bin',HOME:directory,DISPLAY:process.env.DISPLAY,XAUTHORITY:process.env.XAUTHORITY,LANG:'C.UTF-8',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_DATA_HOME:path.join(directory,'data'),XDG_CACHE_HOME:path.join(directory,'cache'),CODEX_HOME:path.join(directory,'codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'no-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'}});const resources=await app.evaluate(()=>process.resourcesPath);backend=fs.existsSync(path.join(resources,'backend'))?path.join(resources,'backend'):path.join(root,'backend');page=await app.firstWindow();await page.setViewportSize({width:1600,height:1050});await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();});
  13 | test.afterEach(async({},info)=>{if(page&&!page.isClosed()&&info.status!==info.expectedStatus)await shot('echec-observe');if(app)await app.close();for(const socket of ['cockpit/odoo-tricorder/pty.sock','studio-pty.sock','runtime/pty.sock'])await cleanupBroker(path.join(directory,socket));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
  14 | 
  15 | test('Parcours 1 — chef de projet adopte et configure le modèle puis reçoit deux résultats documentaires par GUI',async()=>{
  16 |  test.setTimeout(120000);const project=await projectGUI('Réunion commerciale synthétique');await adopt('Préparer le suivi commercial');
  17 |  await page.locator('.node[data-id=work]').click();await page.getByLabel('Nom du bloc',{exact:true}).fill('Produire les livrables de la réunion');await page.getByLabel('Travaux simultanés au maximum',{exact:true}).selectOption('3');await page.getByRole('button',{name:'Appliquer au bloc',exact:true}).click();await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await shot('workflow-adopte-configure');
  18 |  await page.getByRole('button',{name:'Exécuter…',exact:true}).click();await page.getByLabel('Quelle demande souhaitez-vous traiter ?').fill('Préparer les suites de notre réunion commerciale.');await page.getByRole('button',{name:'Simuler le parcours',exact:true}).click();
  19 |  await intentions(['Résumer les décisions de la réunion','Préparer un email de suivi sans envoi','Lister les points à confirmer']);await page.getByRole('button',{name:'Graphe',exact:true}).click();await expect(page.locator('.node[data-id=plan]')).toHaveAttribute('data-status','accepted');await shot('plan-a-approuver');await approve();await page.getByRole('button',{name:'Graphe',exact:true}).click();
  20 |  await expect(page.locator('.node[data-id=work] .node-work-items button')).toHaveCount(2);await expect(page.locator('.node[data-id=plan]')).toContainText('2 tâches · un plan');await page.getByRole('button',{name:'Ajuster',exact:true}).click();await page.locator('.node[data-id=work]').scrollIntoViewIfNeeded();await shot('travaux-sur-graphe');
  21 |  for(const title of ['Préparer le compte rendu','Préparer un brouillon d’email']){await page.locator(`.node[data-id=work] .node-work-items button[title="Ouvrir ${title}"]`).click();await expect(page.getByRole('button',{name:'← Revenir au workflow parent',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Voir les résultats',exact:true})).toBeVisible();await page.getByRole('button',{name:'Voir les résultats',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Exemple de résultat documentaire');await shot(title==='Préparer le compte rendu'?'resultat-compte-rendu':'resultat-brouillon');await page.getByRole('button',{name:'Fermer',exact:true}).click();await page.getByRole('button',{name:'← Revenir au workflow parent',exact:true}).click();await page.getByRole('button',{name:'Graphe',exact:true}).click();}
  22 |  await shot('resultats-a-recevoir');await approve();await expect(page.locator('.execution-label')).toContainText('Terminée');await shot('resultat-final');
  23 |  const p=await call('project.get',{project:project.id});expect(p.runs.filter(r=>!r.parent)).toHaveLength(1);expect(p.runs.filter(r=>r.parent)).toHaveLength(2);expect(p.runs.every(r=>r.status==='completed')).toBe(true);
  24 | });
  25 | 
  26 | test('Parcours 2 — réutiliser vers un projet, demande en terminal, lire parallèle et dépendance puis retrouver le contexte',async()=>{
  27 |  test.setTimeout(120000);const project=await projectGUI('Réunion commerciale synthétique');await adopt('Coordonner le lancement produit');
  28 |  const target=await projectGUI('Lancement produit synthétique');await page.getByRole('button',{name:'Workflows',exact:true}).click();await page.locator('.workflow-row').filter({hasText:'Coordonner le lancement produit'}).getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();await page.locator('.design-menu > summary').click();await page.getByRole('button',{name:'Réutiliser…',exact:true}).click();await page.getByLabel('Nom de la copie',{exact:true}).fill('Lancement produit — méthode réutilisée');await page.getByLabel('Destination',{exact:true}).selectOption(target.id);await page.getByRole('button',{name:'Créer la copie',exact:true}).click();await expect(page.locator('.workflow-heading h1')).toHaveText('Lancement produit — méthode réutilisée');await shot('copie-reutilisee');await page.getByRole('button',{name:'Choisir l’IA',exact:true}).click();await page.getByLabel('Modèle',{exact:true}).fill('panel-fixture-model');await page.getByRole('button',{name:'Appliquer à toutes les étapes IA',exact:true}).click();
  29 |  await page.getByRole('button',{name:'Exécuter…',exact:true}).click();await page.getByLabel('Quelle demande souhaitez-vous traiter ?').fill('Organiser la préparation du lancement produit avec trois livrables.');await page.getByRole('button',{name:'Lancer dans le terminal',exact:true}).click();await expect(page.locator('.xterm-screen:visible')).toContainText('PANEL_PM_INERT');const sessions=(await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).map(s=>[s.id,s.pid]);await shot('demande-terminal');
  30 |  await intentions(['Analyser les retours clients','Préparer les éléments de présentation','Rédiger le message de lancement après analyse']);const conversations=await call('conversation.list',{project:target.id});const conversation=await call('conversation.get',{conversation:conversations[0].id});const run=conversation.items[0].run;
  31 |  // Semence IA: un résultat de planificateur via les commandes validées du moteur, aucune vraie IA.
  32 |  fixture("c=e.claim(p['run'],'plan');e.submit(p['run'],'plan',c['token'],{'ok':True,'summary':'Plan synthétique de lancement produit','outputs':{'plan':{'goal':'Préparer le lancement produit','tasks':[{'id':'analyse','title':'Analyser les retours clients'},{'id':'slides','title':'Préparer les éléments de présentation'},{'id':'message','title':'Rédiger le message de lancement','depends_on':['analyse']}]}}});print(json.dumps({'ok':True}))",{run});
> 33 |  await page.getByRole('button',{name:'Graphe',exact:true}).click();await expect(page.locator('.node[data-id=plan]')).toHaveAttribute('data-status','accepted');await expect(page.locator('.node[data-id=plan]')).toContainText('Préparer le lancement produit');await expect(page.locator('.node[data-id=plan] .pill')).toContainText('Produit');await expect(page.locator('.node[data-id=scope]')).toHaveAttribute('data-status','waiting');await approve();await expect(page.locator('.node[data-id=scope] .pill')).toContainText('Approuvé par vous');await page.getByRole('button',{name:'Lancer les éléments',exact:true}).click();await page.getByRole('button',{name:'Lancer le traitement des éléments',exact:true}).click();
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       ^ Error: expect(locator).toContainText(expected) failed
  34 |  await expect.poll(async()=>(await call('run.get',{run})).run.nodes.work.children?.length).toBe(3);
  35 |  await page.getByRole('button',{name:'Graphe',exact:true}).click();await expect(page.locator('.node[data-id=work] .node-work-items button')).toHaveCount(3);await expect(page.locator('.node[data-id=plan]')).toContainText('3 tâches · un plan');await expect(page.locator('.node[data-id=work]')).toContainText('2 en cours');await page.setViewportSize({width:1280,height:800});await page.getByRole('button',{name:'Ajuster',exact:true}).click();await shot('coordination-parallele-1280');
  36 |  await page.locator('.node[data-id=work] .node-work-items button[title="Ouvrir Analyser les retours clients"]').click();await expect(page.getByRole('button',{name:'← Revenir au workflow parent',exact:true})).toBeVisible();await expect(page.locator('.xterm-screen:visible')).toBeVisible();await shot('tache-enfant-terminal');await page.getByRole('button',{name:'← Revenir au workflow parent',exact:true}).click();
  37 |  await page.getByRole('button',{name:'Projets',exact:true}).click();await page.locator('.project-card').filter({hasText:'Lancement produit synthétique'}).click();await shot('projet-retrouve');await page.locator('[data-action=open-conversation]').click();await expect(page.locator('.xterm-screen:visible')).toBeVisible();await expect(page.locator('.workflow-heading')).toContainText('Organiser la préparation');expect((await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).map(s=>[s.id,s.pid])).toEqual(sessions);await shot('demande-retrouvee-terminal');
  38 | });
  39 | 
```