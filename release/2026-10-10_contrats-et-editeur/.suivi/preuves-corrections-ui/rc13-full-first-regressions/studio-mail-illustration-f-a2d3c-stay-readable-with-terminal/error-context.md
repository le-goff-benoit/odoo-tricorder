# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: studio.spec.cjs >> mail illustration: four independent states, selected question and QA failure stay readable with terminal
- Location: tests/studio.spec.cjs:1136:1

# Error details

```
Error: expect(locator).toBeInViewport() failed

Locator:  locator('.question-context > summary')
Expected: in viewport
Received: viewport ratio 0
Timeout:  5000ms

Call log:
  - Expect "toBeInViewport" locator('.question-context > summary') with timeout 5000ms
  - waiting for locator('.question-context > summary')
    14 × locator resolved to <summary>Sources référencées : original.eml, provenance.js…</summary>
       - unexpected value "viewport ratio 0"

```

```yaml
- text: "Sources référencées : original.eml, provenance.json"
```

# Test source

```ts
  1054 |   expect(resumed.id).toBe(first.id);await expect.poll(()=>fs.readFileSync(marker,'utf8').trim().split('\n').length).toBe(2);
  1055 |   const conversations=await page.evaluate(project=>window.studio.request({action:'conversation.list',project}),c.project);expect(conversations).toHaveLength(1);
  1056 | });
  1057 | 
  1058 | test('audit reception: history pages and archives preserve the completed work',async()=>{
  1059 |   const resources=await app.evaluate(()=>process.resourcesPath);const backend=process.env.TRICORDER_EXECUTABLE ? path.join(resources,'backend') : path.join(root,'backend');
  1060 |   const script=`import sys,json\nsys.path.insert(0,sys.argv[1])\nfrom workflow_engine import Engine\ne=Engine(sys.argv[2]);p=e.create_project('Historique durable');g={'schema':1,'id':'history','title':'Historique','nodes':[{'id':'work','title':'Résultat','kind':'task','validation':'contract'}],'edges':[]};e.save(p['id'],g)\nfor i in range(30):\n r=e.start(p['id'],g,parameters={'request':f'Demande {i:02}'});c=e.claim(r['id'],'work');e.submit(r['id'],'work',c['token'],{'ok':True,'summary':'Résultat conservé','outputs':{}})\nprint(json.dumps(p))`;
  1061 |   const seed=require('node:child_process').spawnSync('python3',['-c',script,backend,directory],{encoding:'utf8'});expect(seed.status,seed.stderr).toBe(0);const project=JSON.parse(seed.stdout);
  1062 |   await page.reload();await page.locator('[data-workflow-route="projects"]').click();await page.locator('.project-card').filter({hasText:project.title}).click();
  1063 |   await expect(page.locator('tbody tr')).toHaveCount(25);await page.locator('.history-filters > summary').click();await page.getByRole('button',{name:'Suivantes',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(5);await page.locator('.history-filters > summary').click();
  1064 |   await page.getByLabel('Rechercher',{exact:true}).fill('Demande 00');await page.getByRole('button',{name:'Filtrer',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(1);
  1065 |   await page.locator('tbody').getByRole('button',{name:'Archiver',exact:true}).click();await page.getByRole('button',{name:'Confirmer',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(0);
  1066 |   await page.locator('.history-filters > summary').click();await page.getByLabel('Avec archives').check();await page.getByRole('button',{name:'Filtrer',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(1);
  1067 |   await page.locator('tbody').getByRole('button',{name:'Restaurer',exact:true}).click();await page.getByRole('button',{name:'Confirmer',exact:true}).click();await page.getByRole('button',{name:'Consulter',exact:true}).click();await page.locator('.node[data-id="work"]').click();await expect(page.locator('#inspector')).toContainText('Résultat conservé');
  1068 | });
  1069 | 
  1070 | async function selectRequest(index) {
  1071 |   const selector=page.locator('.request-selector');
  1072 |   if(!await selector.getAttribute('open').then(value=>value!==null)) await selector.locator(':scope > summary').click();
  1073 |   await page.locator('.work-items button').nth(index).click();
  1074 |   await expect(selector).not.toHaveAttribute('open','');
  1075 | }
  1076 | 
  1077 | async function mailFixture(mode='ready') {
  1078 |   const bin=path.join(directory,'bin');fs.mkdirSync(bin,{recursive:true});
  1079 |   fs.copyFileSync(path.join(root,'tests/fixtures/mail-intake-agent.py'),path.join(bin,'codex'));fs.chmodSync(path.join(bin,'codex'),0o755);
  1080 |   fs.copyFileSync(path.join(root,'tests/fixtures/mail-adapter.py'),path.join(directory,'mail-adapter.py'));
  1081 |   const config={adapter:path.join(directory,mode==='missing'?'unavailable-adapter.py':'mail-adapter.py'),ambiguous:mode==='ambiguous',question_first:mode==='illustration',requests:['Règle de distance contradictoire dans les devis.','État et menu du projet créé depuis un devis.','Planning vide malgré les jalons.','Montant manuel sans recalcul du sous-total.']};
  1082 |   fs.writeFileSync(path.join(directory,'mail-fixture.json'),JSON.stringify(config));
  1083 |   require('node:child_process').execFileSync('python3',['-c',`from email.message import EmailMessage\nfrom pathlib import Path\nimport sys,json\nm=EmailMessage();m['From']='support@example.test';m['To']='team@example.test';m['Subject']='Four synthetic observations';m.set_content('Synthetic observations only; neither causes nor passed QA.\\n'+'\\n'.join(f'R{i}: {text}' for i,text in enumerate(json.loads(sys.argv[2]),1)))\nfor i in range(6): m.add_attachment(b'synthetic image observation '+str(i).encode(),maintype='image',subtype='png',filename=f'observation-{i+1}.png')\nPath(sys.argv[1]).write_bytes(m.as_bytes())`,path.join(directory,'source.eml'),JSON.stringify(config.requests)]);
  1084 |   const c=await page.evaluate(async()=>{const p=await window.studio.request({action:'project.create',title:'Email synthétique — préparation de release'});const data=await window.studio.request({action:'bootstrap'});return window.studio.human({action:'conversation.open',project:p.id,provider:'codex',graph:data.templates.find(g=>g.id==='release-conversation')});});
  1085 |   const terminal=await page.evaluate(c=>window.tricorder.workflowTerminal({project:c.project,conversation:c.id}),c);
  1086 |   await expect.poll(()=>fs.existsSync(path.join(directory,'mail-agent-ready'))).toBe(true);
  1087 |   await page.evaluate(id=>window.tricorder.terminals.write({session:id,data:'Va chercher cet email et prépare une release.\r'}),terminal.id);
  1088 |   return {c,terminal,config};
  1089 | }
  1090 | 
  1091 | test('mail intake: native terminal prepares four requests, source files and plan without duplicate or deployment',async()=>{
  1092 |   const {c,terminal}=await mailFixture();
  1093 |   const snapshot=()=>page.evaluate(id=>window.studio.request({action:'conversation.get',conversation:id}),c.id);
  1094 |   await expect.poll(async()=>{const s=await snapshot();return s.item_count===4 && s.items.every(i=>i.execution.counts.waiting===1);}).toBe(true);
  1095 |   const first=await snapshot();const project=first.project_contexts[0];const release=path.join(project.path,'release/synthetic-mail');
  1096 |   const sourceHash=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(directory,'source.eml'))).digest('hex');
  1097 |   const sources=path.join(release,'sources',sourceHash);expect(fs.readdirSync(path.join(release,'sources'))).toEqual([sourceHash]);
  1098 |   expect(fs.readFileSync(path.join(sources,'original.eml'))).toEqual(fs.readFileSync(path.join(directory,'source.eml')));
  1099 |   const provenance=JSON.parse(fs.readFileSync(path.join(sources,'provenance.json')));expect(provenance.attachments).toHaveLength(6);
  1100 |   for(const part of provenance.attachments)expect(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(sources,part.file))).digest('hex')).toBe(part.sha256);
  1101 |   const requests=await Promise.all(first.items.map(item=>page.evaluate(run=>window.studio.request({action:'run.get',run}),item.run)));
  1102 |   expect(requests.every(r=>r.run.parameters.request.includes(sourceHash) && r.run.nodes.scope.status==='waiting' && r.run.nodes.work.status==='pending')).toBe(true);
  1103 |   expect(fs.readFileSync(path.join(release,'README.md'),'utf8')).toContain('Préparation locale seulement');
  1104 |   expect(require('node:child_process').spawnSync('git',['-C',project.path,'rev-parse','--verify','HEAD'],{encoding:'utf8'}).status).not.toBe(0);
  1105 |   expect(require('node:child_process').execFileSync('git',['-C',project.path,'remote'],{encoding:'utf8'})).toBe('');
  1106 |   await page.reload();await page.locator('[data-workflow-route="projects"]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator('[data-action=open-conversation]').click();
  1107 |   await expect(page.locator('.work-items button')).toHaveCount(4);
  1108 |   await expect(page.locator('.work-items strong').first()).toHaveText('R1: Règle de distance contradictoire dans les devis.');
  1109 |   await page.locator('.request-selector > summary').click();
  1110 |   await page.locator('.conversation-search-details > summary').click();
  1111 |   await expect(page.locator('#conversation-query')).toBeVisible();await expect.poll(()=>page.locator('#conversation-search').evaluate(form=>{const input=form.querySelector('input'),button=form.querySelector('button');return input.offsetHeight && button.offsetHeight ? Math.abs(button.getBoundingClientRect().y-input.getBoundingClientRect().y) : Infinity;})).toBeLessThan(8);await page.locator('.conversation-search-details > summary').click();
  1112 |   await expect(page.locator('.xterm-screen:visible')).toBeVisible();
  1113 |   await expect(page.getByRole('button',{name:'Reprendre l’agent…',exact:true}).first()).toBeVisible();
  1114 |   await selectRequest(0);await page.locator('.node[data-id=scope]').click();await expect(page.locator('#inspector')).toContainText('Règle de distance');
  1115 |   await page.screenshot({path:test.info().outputPath('mail-release-plan.png'),fullPage:true});
  1116 |   await expect.poll(async()=> (await page.evaluate(()=>window.tricorder.terminals.list())).find(s=>s.id===terminal.id)?.idleShell).toBe(true);
  1117 |   await quitApplication();app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?['--workflow-studio']:[root,'--workflow-studio'],env:{...process.env,PATH:path.join(directory,'bin')+':'+process.env.PATH,TRICORDER_STATE_DIR:directory,TRICORDER_HOME:directory,TRICORDER_TEST_MODE:'1'},timeout:20000});page=await studioPage();
  1118 |   const resumed=await page.evaluate(c=>window.tricorder.workflowTerminal({project:c.project,conversation:c.id,resume:true}),c);expect(resumed.id).toBe(terminal.id);expect(resumed.pid).toBe(terminal.pid);
  1119 |   await expect.poll(()=>fs.readFileSync(path.join(directory,'mail-agent-ready'),'utf8').trim().split('\n').length).toBe(2);
  1120 |   await page.evaluate(id=>window.tricorder.terminals.write({session:id,data:'Reprends cet email et sa release.\r'}),terminal.id);
  1121 |   await expect.poll(async()=> (await page.evaluate(()=>window.tricorder.terminals.list())).find(s=>s.id===terminal.id)?.idleShell).toBe(true);
  1122 |   const second=await snapshot();expect(second.item_count).toBe(4);expect(second.items.map(i=>i.run)).toEqual(first.items.map(i=>i.run));expect(fs.readdirSync(path.join(release,'sources'))).toEqual([sourceHash]);
  1123 |   const calls=fs.readFileSync(path.join(directory,'mail-calls.jsonl'),'utf8').trim().split('\n').map(JSON.parse);expect(calls.map(c=>c.action)).toEqual(['search','read','search','read']);
  1124 | });
  1125 | 
  1126 | for(const mode of ['missing','ambiguous'])test(`mail intake: ${mode} access becomes a visible question without inventing a source`,async()=>{
  1127 |   const {c}=await mailFixture(mode);
  1128 |   await expect.poll(async()=>{const s=await page.evaluate(id=>window.studio.request({action:'conversation.get',conversation:id}),c.id);return s.items[0]?.execution.counts.waiting_input;}).toBe(1);
  1129 |   const s=await page.evaluate(id=>window.studio.request({action:'conversation.get',conversation:id}),c.id);expect(s.item_count).toBe(1);expect(s.items[0].request).toContain('Coordination');
  1130 |   const detail=await page.evaluate(run=>window.studio.request({action:'run.get',run}),s.items[0].run);
  1131 |   expect(detail.run.nodes.intent.question.text).toContain(mode==='missing'?'recherche n’a pas été effectuée':'Plusieurs messages');
  1132 |   expect(fs.existsSync(path.join(s.project_contexts[0].path,'release/synthetic-mail'))).toBe(false);
  1133 |   const log=path.join(directory,'mail-calls.jsonl');expect(fs.existsSync(log)).toBe(mode==='ambiguous');if(mode==='ambiguous')expect(fs.readFileSync(log,'utf8')).not.toContain('"action": "read"');
  1134 | });
  1135 | 
  1136 | test('mail illustration: four independent states, selected question and QA failure stay readable with terminal',async()=>{
  1137 |   const {c,terminal}=await mailFixture('illustration');
  1138 |   const snapshot=()=>page.evaluate(id=>window.studio.request({action:'conversation.get',conversation:id}),c.id);
  1139 |   await expect.poll(async()=>{const s=await snapshot();return s.item_count===4 && s.items.filter(i=>i.execution.counts.waiting===1).length===3;}).toBe(true);
  1140 |   const initial=await snapshot();
  1141 |   const resources=await app.evaluate(()=>process.resourcesPath);const backend=process.env.TRICORDER_EXECUTABLE?path.join(resources,'backend'):path.join(root,'backend');
  1142 |   const script=`import json,sys\nsys.path.insert(0,sys.argv[1])\nfrom workflow_engine import Engine\ne=Engine(sys.argv[2]);items=json.loads(sys.argv[3])\nfor index,item in enumerate(items[1:],2):\n r=e.run(item['run']);s=r['nodes']['scope'];e.decide(r['id'],'scope',s['nonce'],s['proposal'],'approve',human=True);claim=e.claim(r['id'],'work')\n if index==2:continue\n e.submit(r['id'],'work',claim['token'],{'ok':True,'summary':'Proposition synthétique, aucune application client modifiée.','outputs':{'result':f'Résultat R{index} : proposition prête pour contrôle, pas encore validée.'}})\n if index==4:\n  claim=e.claim(r['id'],'check');e.submit(r['id'],'check',claim['token'],{'ok':True,'summary':'QA synthétique en échec.','outputs':{'verdict':'fail','evidence_summary':'Le sous-total ne respecte pas le résultat attendu dans le scénario synthétique.'},'evidence':[e.artifact(b'Synthetic failed QA fixture, no client test performed.')]})\n`;
  1143 |   const seeded=require('node:child_process').spawnSync('python3',['-c',script,backend,directory,JSON.stringify(initial.items)],{encoding:'utf8'});expect(seeded.status,seeded.stderr).toBe(0);
  1144 |   await page.reload();await page.locator('[data-workflow-route="projects"]').click();await page.locator('.project-card').filter({hasText:initial.project_contexts[0].title}).click();await page.locator('[data-action=open-conversation]').click();
  1145 |   await expect(page.locator('.xterm-screen:visible')).toBeVisible();await expect(page.locator('#conversation-tray')).toContainText('Agent arrêté');
  1146 |   const cards=page.locator('.work-items button');await expect(cards).toHaveCount(4);
  1147 |   await expect(cards.nth(0)).toContainText('Réponse attendue');await expect(cards.nth(1)).toContainText('En cours');await expect(cards.nth(2)).toContainText('Agent arrêté');await expect(cards.nth(3)).toContainText('Réponse attendue');await expect(cards.nth(3)).not.toContainText('Échec · reprise nécessaire');
  1148 |   await selectRequest(0);await expect(page.locator('.workflow-heading h1')).toHaveText('R1: Règle de distance contradictoire dans les devis.');await expect(page.locator('.breadcrumb')).toContainText('Suivi · Release');
  1149 |   await expect(page.locator('#inspector')).toContainText('Quelle règle de distance');await expect(page.locator('#inspector')).toContainText('original.eml');await expect(cards.nth(0)).toHaveAttribute('aria-pressed','true');
  1150 |   await page.getByRole('button',{name:'Détail',exact:true}).click();
  1151 |   await page.screenshot({path:test.info().outputPath('mail-mixed-states-wide.png'),fullPage:true});
  1152 |   await page.setViewportSize({width:1024,height:768});await expect(page.locator('.xterm-screen:visible')).toBeVisible();
  1153 |   await expect(page.locator('#inspector').getByText('Quelle règle de distance', {exact:false})).toBeInViewport();
> 1154 |   await expect(page.locator('.question-context > summary')).toBeInViewport();
       |                                                             ^ Error: expect(locator).toBeInViewport() failed
  1155 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  1156 |   await page.locator('.request-selector > summary').click();
  1157 |   for(let i=0;i<4;i++)await expect.poll(async()=>{const box=await cards.nth(i).boundingBox();return !!box && box.x+box.width<=1024;}).toBe(true);
  1158 |   await page.locator('.request-selector > summary').press('Escape');
  1159 |   await page.screenshot({path:test.info().outputPath('mail-mixed-states-1024.png'),fullPage:true});
  1160 |   await selectRequest(2);await expect(page.locator('#inspector')).toContainText('Résultat R3');await expect(page.locator('#inspector').getByRole('button',{name:'Reprendre l’agent…',exact:true})).toBeVisible();await page.locator('#inspector summary').filter({hasText:'Agent de bloc séparé (facultatif)'}).click();await expect(page.locator('#inspector')).toContainText('Aucun modèle explicite pour un agent de bloc');await expect(page.locator('#inspector').getByRole('button',{name:'Configurer un nouveau lancement…',exact:true})).toBeVisible();
  1161 |   await expect(cards.nth(2)).toHaveAttribute('aria-pressed','true');
  1162 |   await page.screenshot({path:test.info().outputPath('mail-r3-next-action-1024.png'),fullPage:true});
  1163 |   await selectRequest(3);await expect(page.locator('.editor.review-focus')).toBeVisible();
  1164 |   await page.getByRole('button',{name:'Graphe',exact:true}).click();
  1165 |   await expect(page.locator('.node[data-id=failure]')).toBeInViewport();
  1166 |   const focusBounds=await page.locator('.node[data-id=failure]').boundingBox(),canvasBounds=await page.locator('.canvas-scroll').boundingBox();
  1167 |   expect(focusBounds.x+focusBounds.width/2).toBeGreaterThanOrEqual(canvasBounds.x);
  1168 |   expect(focusBounds.x+focusBounds.width/2).toBeLessThanOrEqual(canvasBounds.x+canvasBounds.width);
  1169 |   expect(focusBounds.y+focusBounds.height/2).toBeGreaterThanOrEqual(canvasBounds.y);
  1170 |   expect(focusBounds.y+focusBounds.height/2).toBeLessThanOrEqual(canvasBounds.y+canvasBounds.height);
  1171 |   await page.screenshot({path:test.info().outputPath('mail-r4-graph-focus-1024.png'),fullPage:true});
  1172 |   await page.setViewportSize({width:1440,height:900});await selectRequest(0);
  1173 |   await page.getByRole('button',{name:'Détail',exact:true}).click();
  1174 |   await page.locator('[data-action=terminal-layout]').click();
  1175 |   await expect(page.locator('.request-selector')).toBeVisible();await expect(cards.nth(0)).toBeHidden();
  1176 |   await expect(page.locator('.xterm-screen:visible')).toBeVisible();
  1177 |   await expect(page.locator('#inspector').getByText('Quelle règle de distance', {exact:false})).toBeInViewport();
  1178 |   await expect(page.locator('#question-form button')).toBeInViewport();
  1179 |   await page.screenshot({path:test.info().outputPath('mail-question-stacked-1440.png'),fullPage:true});
  1180 |   await page.locator('.request-selector > summary').click();await expect(cards).toHaveCount(4);await expect(cards.nth(3)).toBeVisible();
  1181 |   await selectRequest(2);await expect(page.locator('.editor.review-focus')).toBeVisible();await expect(page.locator('.request-selector')).not.toHaveAttribute('open','');
  1182 |   await page.locator('[data-workflow-route=overview]').click();
  1183 |   const failed=page.locator('.activity-row').filter({hasText:'R4: Montant manuel'});await expect(failed).toContainText('Réponse attendue');await expect(failed).not.toContainText('Échec · reprise nécessaire');await expect(failed).not.toContainText('Original :');
  1184 | 
  1185 | });
  1186 | 
  1187 | 
  1188 | test('candidate QA: explicit editor control persists typed ports and remains visible after reload', async()=>{
  1189 |   await example();await page.locator('.node[data-id=analyse]').click();
  1190 |   await page.getByLabel('Nom du bloc',{exact:true}).fill('Vérifier le candidat sans agent imposé');
  1191 |   await page.locator('#node-form details').filter({has:page.getByText('Contrôle de code (QA)',{exact:true})}).locator('summary').click();
  1192 |   await page.getByLabel('Contrôle QA du candidat',{exact:true}).check();
  1193 |   await page.reload();await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').first().click();await page.getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();
  1194 |   await expect(page.getByLabel('Contrôle QA du candidat',{exact:true})).toBeChecked();
  1195 |   await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
  1196 |   await expect(page.getByLabel('Contrôle QA du candidat',{exact:true})).toBeChecked();
  1197 |   await expect(page.locator('.ports')).toContainText('candidate');await expect(page.locator('.ports')).toContainText('verdict');
  1198 |   const mission=page.locator('.node[data-id=analyse] .mission');await expect(mission).toHaveAttribute('title','Vérifier le candidat sans agent imposé');
  1199 |   const titleBounds=await mission.boundingBox(),nodeBounds=await page.locator('.node[data-id=analyse]').boundingBox(),kindBounds=await page.locator('.node[data-id=analyse] .kind').boundingBox();
  1200 |   expect(titleBounds.x+titleBounds.width).toBeLessThanOrEqual(nodeBounds.x+nodeBounds.width);
  1201 |   expect(titleBounds.y+titleBounds.height).toBeLessThanOrEqual(kindBounds.y);
  1202 |   await page.screenshot({path:test.info().outputPath('qa-candidate-title-final.png'),fullPage:true});
  1203 |   await page.reload();await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').first().click();await page.getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();
  1204 |   await page.locator('.node[data-id=analyse]').click();await expect(page.getByLabel('Contrôle QA du candidat',{exact:true})).toBeChecked();
  1205 |   await page.getByLabel('Contrôle QA du candidat',{exact:true}).uncheck();await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
  1206 |   await expect(page.getByLabel('Contrôle QA du candidat',{exact:true})).not.toBeChecked();
  1207 | });
  1208 | 
```