# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: studio.spec.cjs >> work journey: name a meeting, select its repository, launch initial intention once and preserve the terminal
- Location: tests/studio.spec.cjs:774:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.xterm-screen:visible')
Expected substring: "INTENTION:Préparer"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" locator('.xterm-screen:visible') with timeout 5000ms
  - waiting for locator('.xterm-screen:visible')

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
  - button "Équipe documentation"
  - navigation "Configuration":
    - button "Planifications"
    - button "Connexions"
  - button "Paramètres"
  - group: Outils et aide
- main:
  - text: Modèles de workflows
  - button "Terminal 1"
  - text: IA des prochains lancements
  - combobox "Fournisseur IA":
    - option "OpenAI · Codex"
    - option "Anthropic · Claude" [selected]
  - group "Thème de l’interface":
    - button "Thème clair"
    - button "Thème sombre"
    - button "Thème système" [pressed]
  - status: À jour
  - button "Actualiser · À jour"
  - main:
    - navigation "Bibliothèque de workflows":
      - button "Mes workflows"
      - button "Modèles"
    - text: Composer et réutiliser
    - heading "Modèles de workflows" [level=1]
    - paragraph: Choisissez un modèle, adaptez ses étapes, puis lancez votre conversation.
    - button "Importer un workflow"
    - button "+ Créer un modèle"
    - text: Rechercher un modèle
    - searchbox "Rechercher un modèle"
    - text: "Destination :"
    - strong: Sans projet
    - article:
      - text: 6 blocs
      - heading "De la demande au résultat" [level=3]
      - paragraph: Un exemple simulé pour découvrir les branches, la validation et les décisions humaines.
      - button "Utiliser"
      - button "Personnaliser une copie…"
    - article:
      - text: 2 blocs
      - heading "Commande locale avec validation" [level=3]
      - paragraph: Une vraie commande isolée, puis examen du résultat. Pas de réseau, projet en lecture seule.
      - button "Utiliser"
      - button "Personnaliser une copie…"
    - article:
      - text: 4 blocs
      - heading "Évolution logicielle" [level=3]
      - paragraph: Analyser, proposer du code dans une copie isolée, tester cette copie et décider de son application locale. Choisir les modèles et adapter la commande de test au projet.
      - button "Utiliser"
      - button "Personnaliser une copie…"
    - article:
      - text: 9 blocs
      - heading "Release — demandes, plan, réalisation et validation" [level=3]
      - paragraph: "Votre parcours de release dans une conversation : recueil, plan, travail, contrôles et préparation de livraison. Chaque demande garde ses preuves."
      - button "Utiliser"
      - button "Personnaliser une copie…"
    - article:
      - text: 6 blocs
      - heading "Support — diagnostic et suite" [level=3]
      - paragraph: Recevoir une demande, qualifier l’impact, poser les questions utiles et préparer la suite. Agent et branches modifiables.
      - button "Utiliser"
      - button "Personnaliser une copie…"
    - article:
      - text: 3 blocs
      - heading "Clôture de réunion" [level=3]
      - paragraph: Vérifier la transcription, extraire décisions et actions, préparer le compte rendu et l’email. Ajouter vos blocs de publication selon les destinations choisies.
      - button "Utiliser"
      - button "Personnaliser une copie…"
    - article:
      - text: 3 blocs
      - heading "Demande ponctuelle" [level=3]
      - paragraph: "Clarifier une demande, effectuer le travail et présenter le résultat. Analyse, recherche, document ou autre activité : aucun pack métier requis."
      - button "Utiliser"
      - button "Personnaliser une copie…"
    - article:
      - text: 6 blocs
      - heading "Correction express" [level=3]
      - paragraph: Qualifier un défaut local et réversible, corriger et vérifier. Les demandes portant sur droits, données, schéma ou calcul financier sont réorientées.
      - button "Utiliser"
      - button "Personnaliser une copie…"
    - article:
      - text: 3 blocs
      - heading "Nouveau message → notification" [level=3]
      - paragraph: "Brouillon : détecter les nouveaux messages d'un expéditeur confirmé, puis notifier le destinataire choisi. Aucun modèle IA nécessaire pour un filtre exact."
      - button "Utiliser"
      - button "Personnaliser une copie…"
    - article:
      - text: 8 blocs
      - 'heading "GitHub → Odoo.sh : staging puis production" [level=3]'
      - paragraph: Configurer les cibles, le SHA testé et les adaptateurs. Publication GitHub, build Odoo.sh et vérification de la version déployée restent distincts. La documentation est facultative.
      - button "Utiliser"
      - button "Personnaliser une copie…"
    - article:
      - text: 5 blocs
      - heading "Livraison directe en production" [level=3]
      - paragraph: "Parcours sans staging imposé : candidat testé, accord exact, publication et version observée. Configurer la cible et le connecteur avant lancement."
      - button "Utiliser"
      - button "Personnaliser une copie…"
    - article:
      - text: 4 blocs
      - heading "Documentation → Confluence" [level=3]
      - paragraph: Préparer le contenu et la version de base, relire, publier après accord exact, puis relire la page distante. Configurer un adaptateur Confluence avec contrôle de version.
      - button "Utiliser"
      - button "Personnaliser une copie…"
    - article:
      - text: 1 bloc
      - heading "Orchestration" [level=3]
      - paragraph: Composant réutilisable à adapter au projet.
      - button "Utiliser"
      - button "Personnaliser une copie…"
    - article:
      - text: 1 bloc
      - heading "Analyse" [level=3]
      - paragraph: Composant réutilisable à adapter au projet.
      - button "Utiliser"
      - button "Personnaliser une copie…"
    - article:
      - text: 1 bloc
      - heading "Développement" [level=3]
      - paragraph: Composant réutilisable à adapter au projet.
      - button "Utiliser"
      - button "Personnaliser une copie…"
    - article:
      - text: 1 bloc
      - heading "Tests" [level=3]
      - paragraph: Composant réutilisable à adapter au projet.
      - button "Utiliser"
      - button "Personnaliser une copie…"
    - article:
      - text: 1 bloc
      - heading "Gestion documentaire" [level=3]
      - paragraph: Composant réutilisable à adapter au projet.
      - button "Utiliser"
      - button "Personnaliser une copie…"
    - article:
      - text: 1 bloc
      - heading "Communication" [level=3]
      - paragraph: Composant réutilisable à adapter au projet.
      - button "Utiliser"
      - button "Personnaliser une copie…"
```

# Test source

```ts
  711 | });
  712 | 
  713 | test('terminal visibility preserves a live session while browsing and editing', async () => {
  714 |   await example();
  715 |   await page.getByRole('button', {name:'Ouvrir le terminal existant',exact:true}).click();
  716 |   await expect(page.locator('#terminal-workspace')).toBeVisible();
  717 |   const before = await page.evaluate(() => window.tricorder.terminals.list());
  718 |   expect(before.length).toBe(1);
  719 |   await library();
  720 |   await expect(page.locator('#terminal-workspace')).toBeHidden();
  721 |   await page.locator('[data-action="terminal-toggle"]').click();
  722 |   await expect(page.locator('#terminal-workspace')).toBeVisible();
  723 |   await expect(page.locator('.xterm-screen')).toBeVisible();
  724 |   const after = await page.evaluate(() => window.tricorder.terminals.list());
  725 |   expect(after[0].id).toBe(before[0].id); expect(after[0].pid).toBe(before[0].pid);
  726 |   expect(after[0].alive).toBe(true);
  727 |   for (const width of [1024, 800]) {
  728 |     await page.setViewportSize({width,height:900});
  729 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  730 |     const term = await page.locator('#terminal-workspace').boundingBox();
  731 |     const graph = await page.locator('#workflow-panel').boundingBox();
  732 |     if (width === 800) expect(graph.y).toBeGreaterThanOrEqual(term.y + term.height - 1);
  733 |     else expect(graph.x).toBeGreaterThanOrEqual(term.x + term.width - 1);
  734 |     if (!(await page.locator('.sidebar-tools').evaluate(el => el.open))) await page.locator('.sidebar-tools > summary').click();
  735 |     await page.locator('[data-action="workflow-updates"]').click();
  736 |     const dialog = await page.getByRole('dialog').boundingBox();
  737 |     expect(dialog.width).toBeGreaterThan(500);
  738 |     await page.getByRole('button', {name:'Fermer la fenêtre',exact:true}).click();
  739 |   }
  740 |   await page.locator('[data-action="terminal-toggle"]').click();
  741 |   expect(await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows().length)).toBe(1);
  742 | });
  743 | 
  744 | test('bootstrap failure is distinct from an empty catalog and Actualiser recovers', async () => {
  745 |   await app.evaluate(({ipcMain}) => {
  746 |     // Fault injection is confined to this synthetic Electron instance.
  747 |     const channel = [...ipcMain._invokeHandlers.keys()].find(key => key.endsWith('bootstrap') && !key.startsWith('studio:'));
  748 |     global.bootstrapChannel = channel;
  749 |     global.originalBootstrap = ipcMain._invokeHandlers.get(channel);
  750 |     ipcMain.removeHandler(channel); ipcMain.handle(channel, () => {throw new Error('Catalogue synthétique indisponible');});
  751 |   });
  752 |   await page.reload();
  753 |   await expect(page.locator('#catalog-warning')).toContainText('Catalogue synthétique indisponible');
  754 |   await expect(page.locator('#project-list')).not.toContainText('Aucun projet trouvé');
  755 |   await app.evaluate(({ipcMain}) => {ipcMain.removeHandler(global.bootstrapChannel);ipcMain.handle(global.bootstrapChannel,global.originalBootstrap);});
  756 |   await page.locator('[data-action="refresh"]').click();
  757 |   await expect(page.locator('#catalog-warning')).toBeHidden();
  758 |   await expect(page.locator('#sync-status')).toContainText('À jour');
  759 | });
  760 | 
  761 | 
  762 | test('optional workflow setup failure keeps native projects and can be retried', async () => {
  763 |   await expect(page.locator('#catalog-warning')).toBeVisible();
  764 |   await expect(page.locator('#project-list')).toContainText('sample-project');
  765 |   await expect(page.locator('#sync-status')).toHaveText('Workflows à vérifier');
  766 |   fs.writeFileSync(path.join(directory, 'invalid-pack/tricorder-pack.json'), JSON.stringify({schema:1,engine_schema:1,id:'fixture',version:'1',profiles:[]}));
  767 |   await page.locator('[data-action="refresh"]').click();
  768 |   await expect(page.locator('#catalog-warning')).toBeHidden();
  769 |   await expect(page.locator('#project-list')).toContainText('sample-project');
  770 |   await page.locator('[data-workflow-route="projects"]').click();
  771 |   await expect(page.locator('.project-card')).toContainText('sample-project');
  772 | });
  773 | 
  774 | test('work journey: name a meeting, select its repository, launch initial intention once and preserve the terminal', async () => {
  775 |   const bin = path.join(directory, 'bin'); fs.mkdirSync(bin, {recursive:true});
  776 |   const fake = `#!/usr/bin/python3
  777 | import json,re,shlex,subprocess,sys
  778 | prompt=sys.argv[-1]
  779 | command=shlex.split(re.search(r'^Pont : (.*)$',prompt,re.M).group(1))
  780 | state=json.loads(subprocess.run(command+['status'],capture_output=True,text=True).stdout)['result']
  781 | print('INITIAL-TASKS:'+str(len(state['items'])),flush=True)
  782 | for item in state['items']:print('INTENTION:'+item['request'],flush=True)
  783 | for line in sys.stdin:
  784 |  if line.strip()=='exit':break
  785 |  print('DIALOGUE:'+line.strip(),flush=True)
  786 | `;
  787 |   for (const provider of ['codex','claude']) fs.writeFileSync(path.join(bin,provider),fake,{mode:0o755});
  788 |   const project = await page.evaluate(() => window.studio.request({action:'project.create',title:'Équipe documentation'}));
  789 |   await page.getByRole('button',{name:'Projets',exact:true}).click();
  790 |   await page.locator('.project-card').filter({hasText:/Équipe documentation/}).click();
  791 |   await page.getByRole('button',{name:'Créer un workflow',exact:true}).click();
  792 |   await page.getByLabel('Modèle de workflow',{exact:true}).selectOption('meeting-conversation');
  793 |   await page.getByLabel('Nom du workflow').fill('Décisions du comité produit');
  794 |   await expect(page.getByLabel('Enregistrer dans')).toHaveValue(project.id);
  795 |   await page.screenshot({path:test.info().outputPath('new-meeting.png')});
  796 |   await page.getByRole('button',{name:'Créer et ouvrir le workflow'}).click();
  797 |   await expect(page.getByRole('heading',{name:'Décisions du comité produit',exact:true})).toBeVisible();
  798 |   const files = fs.readdirSync(path.join(project.path,'.tricorder/workflows'));
  799 |   expect(files).toHaveLength(1);
  800 |   expect(JSON.parse(fs.readFileSync(path.join(project.path,'.tricorder/workflows',files[0]))).title).toBe('Décisions du comité produit');
  801 |   await page.getByLabel('Fournisseur IA',{exact:true}).selectOption('claude');
  802 |   await page.getByRole('button',{name:'Exécuter…',exact:true}).click();
  803 |   await page.getByLabel('Quelle demande souhaitez-vous traiter ?').fill('Préparer les décisions et actions du comité de vendredi.');
  804 |   await page.getByRole('button',{name:'Lancer dans le terminal'}).click();
  805 |   await expect(page.locator('.xterm-screen:visible')).toContainText('INITIAL-TASKS:1');
  806 |   await expect(page.locator('.workflow-heading')).toContainText('Préparer les décisions');
  807 |   await expect(page.locator('.node[data-id=review]')).toHaveAttribute('data-status','ready');
  808 |   const before = await page.evaluate(() => window.tricorder.terminals.list());
  809 |   await library();
  810 |   await page.locator('[data-action=terminal-toggle]').click();
> 811 |   await expect(page.locator('.xterm-screen:visible')).toContainText('INTENTION:Préparer');
      |                                                       ^ Error: expect(locator).toContainText(expected) failed
  812 |   const after = await page.evaluate(() => window.tricorder.terminals.list());
  813 |   expect(after[0].pid).toBe(before[0].pid); expect(app.context().pages()).toHaveLength(1);
  814 |   await page.evaluate(id => window.tricorder.terminals.write({session:id,data:'exit\nexit\n'}),before[0].id);
  815 | });
  816 | 
  817 | test('repository journey: resume a cloned workflow, simulate a question and export a generic work dossier', async () => {
  818 |   const project = await page.evaluate(() => window.studio.request({action:'project.create',title:'Atelier sans pack métier'}));
  819 |   const folder = path.join(project.path,'.tricorder/workflows'); fs.mkdirSync(folder);
  820 |   const definition = {schema:1,id:'meeting-import',revision:7,title:'Relire les minutes',nodes:[{id:'question',kind:'question',title:'Préciser les participants',question:'Qui doit relire les minutes ?',outputs:{answer:'string'}}],edges:[]};
  821 |   const file = path.join(folder,'meeting-import.json'); fs.writeFileSync(file,JSON.stringify(definition));
  822 |   const before = fs.readFileSync(file,'utf8');
  823 |   await page.getByRole('button',{name:'Projets',exact:true}).click();
  824 |   await page.locator('.project-card').filter({hasText:/Atelier sans pack métier/}).click();
  825 |   await page.getByRole('button',{name:'Examiner les workflows du dépôt'}).click();
  826 |   await page.getByRole('button',{name:'Importer ce workflow'}).click();
  827 |   await expect(page.locator('.workflow-heading')).toContainText('Révision 7');
  828 |   expect(fs.readFileSync(file,'utf8')).toBe(before);
  829 |   await page.getByRole('button',{name:'Exécuter…',exact:true}).click();
  830 |   await page.getByLabel('Quelle demande souhaitez-vous traiter ?').fill('Vérifier les décisions du comité.');
  831 |   await page.getByRole('button',{name:'Simuler le parcours'}).click();
  832 |   await page.locator('.node[data-id=question]').click();
  833 |   await expect(page.locator('#inspector')).toContainText('Qui doit relire');
  834 |   await page.locator('.execution-menu > summary').click();await page.getByRole('tab',{name:'Rapport',exact:true}).click();
  835 |   await expect(page.locator('#document-view')).toContainText('Vérifier les décisions du comité.');
  836 |   await page.getByRole('button',{name:'Exporter le rapport dans le projet'}).click();
  837 |   await page.getByLabel('Nom du dossier').fill('comite-produit');
  838 |   await page.getByRole('button',{name:'Exporter le rapport',exact:true}).click();
  839 |   await expect.poll(() => fs.existsSync(path.join(project.path,'work/comite-produit/README.md'))).toBe(true);
  840 |   expect(fs.existsSync(path.join(project.path,'release'))).toBe(false);
  841 |   await page.screenshot({path:test.info().outputPath('generic-work-bilan.png')});
  842 | });
  843 | 
  844 | test('question journey: configure a verified tool, authorize notifications and follow delivery without answering the question', async () => {
  845 |   const project = await page.evaluate(() => window.studio.request({action:'project.create',title:'Questions et outils · démonstration'}));
  846 |   const script = path.join(directory,'notify.py');
  847 |   fs.writeFileSync(script, `import json,sys
  848 | from pathlib import Path
  849 | p=json.load(sys.stdin)
  850 | if p['action']=='describe':
  851 |  print(json.dumps({'protocol':'tricorder.tool/1','connected':True,'identity':'synthetic-team','operations':{'notify':'notify'}}))
  852 | else:
  853 |  with (Path(__file__).parent/'notifications.txt').open('a') as f:f.write(json.dumps(p['arguments'])+'\\n')
  854 |  print(json.dumps({'ok':True,'identity':'synthetic-team','outputs':{},'receipt':{'id':'local-proof-1'}}))
  855 | `);
  856 |   fs.writeFileSync(path.join(project.path,'.tricorder/plugins.json'),JSON.stringify({schema:1,plugins:[{id:'local-notifications',title:'Notifications de test',provider:'local',operations:['notify'],transport:{argv:['/usr/bin/python3',script],timeout:5}}]}));
  857 |   await page.getByRole('button',{name:'Projets',exact:true}).click();
  858 |   await page.locator('.project-card').filter({hasText:/Questions et outils/}).click();
  859 |   await page.getByRole('button',{name:'Connexions',exact:true}).click();
  860 |   await page.getByRole('button',{name:'Vérifier l’adaptateur…'}).click();
  861 |   await page.getByRole('button',{name:'Exécuter le contrôle'}).click();
  862 |   await expect(page.locator('.card').filter({has:page.getByRole('heading',{name:'Notifications de test'})})).toContainText('Utilisable');
  863 |   await page.evaluate(id => window.studio.request({action:'workflow.save',project:id,graph:{schema:1,id:'questions',title:'Préparation du compte rendu',nodes:[{id:'clarify',kind:'question',title:'Identifier le relecteur',question:'Qui doit relire le compte rendu ?',outputs:{answer:'string'}}],edges:[]}}),project.id);
  864 |   await page.getByRole('button',{name:'Projets',exact:true}).click();
  865 |   await page.locator('.project-card').filter({hasText:/Questions et outils/}).click();
  866 |   await page.getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();
  867 |   await page.getByRole('button',{name:'Paramètres du workflow',exact:true}).click();
  868 |   await page.getByLabel('Me prévenir avec').selectOption({label:'Notifications de test · notify'});
  869 |   await page.getByLabel('Canal ou destinataire exact').fill('canal-synthetique');
  870 |   await page.getByRole('button',{name:'Appliquer',exact:true}).click();
  871 |   await page.getByRole('button',{name:'Exécuter…',exact:true}).click();
  872 |   await expect(page.getByRole('dialog')).toContainText('canal-synthetique');
  873 |   await page.getByLabel(/J’autorise ces notifications/).check();
  874 |   await page.getByText('Exécution automatique sans conversation',{exact:true}).evaluate(el => { el.parentElement.open = true; });
  875 |   await page.getByRole('button',{name:'Lancer l’exécution réelle'}).click();
  876 |   await page.locator('.node[data-id=clarify]').click();
  877 |   await expect(page.locator('#inspector')).toContainText('Qui doit relire');
  878 |   await expect.poll(() => fs.existsSync(path.join(directory,'notifications.txt'))).toBe(true);
  879 |   await page.getByRole('button',{name:'Suivre la notification'}).click();
  880 |   await expect(page.locator('#run-banner')).toContainText('Terminée');
  881 |   await page.getByRole('button',{name:'Revenir à l’exécution'}).click();
  882 |   await expect(page.locator('.node[data-id=clarify]')).toHaveAttribute('data-status','waiting_input');
  883 |   await expect(page.getByRole('button',{name:'Détail',exact:true})).toHaveAttribute('aria-pressed','true');
  884 |   await expect(page.locator('#inspector')).toContainText('Qui doit relire');
  885 |   await page.screenshot({path:test.info().outputPath('question-notification.png')});
  886 |   await page.getByLabel('Votre réponse',{exact:true}).fill('La responsable produit');
  887 |   await page.getByRole('button',{name:'Répondre',exact:true}).click();
  888 |   await expect(page.locator('.node[data-id=clarify]')).toHaveAttribute('data-status','accepted');
  889 |   expect(fs.readFileSync(path.join(directory,'notifications.txt'),'utf8').trim().split('\n')).toHaveLength(1);
  890 | });
  891 | 
  892 | test('workspace layout: focused navigation, adjustable split and editor preserve the same terminal', async () => {
  893 |   await expect(page.locator('.side-nav button')).toHaveText(['Activité','Workflows','Projets']);
  894 |   await expect(page.locator('.sidebar-tools')).not.toHaveAttribute('open','');
  895 |   await expect(page.locator('[data-cockpit="preferences"]')).toHaveText('Paramètres');
  896 |   await example();
  897 |   await page.getByRole('button',{name:'Ouvrir le terminal existant',exact:true}).click();
  898 |   await expect(page.locator('.xterm-screen')).toBeVisible();
  899 |   const before = await page.evaluate(() => window.tricorder.terminals.list());
  900 |   expect(before).toHaveLength(1);
  901 |   await page.evaluate(id => window.tricorder.terminals.write({session:id,data:"printf 'WORKSPACE-CONTINUITY\\n'\n"}),before[0].id);
  902 |   await expect(page.locator('.xterm-screen')).toContainText('WORKSPACE-CONTINUITY');
  903 |   const separator = page.getByRole('separator',{name:'Taille du terminal'});
  904 |   await expect(separator).toBeVisible();
  905 |   await separator.focus(); await page.keyboard.press('Home');
  906 |   await expect(separator).toHaveAttribute('aria-valuenow','30');
  907 |   await page.keyboard.press('ArrowRight');
  908 |   await expect(separator).toHaveAttribute('aria-valuenow','35');
  909 |   await page.locator('[data-action="terminal-layout"]').click();
  910 |   await expect(separator).toHaveAttribute('aria-orientation','horizontal');
  911 |   const term = await page.locator('#terminal-workspace').boundingBox();
```