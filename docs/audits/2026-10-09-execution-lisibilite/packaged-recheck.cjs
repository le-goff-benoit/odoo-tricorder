// Independent UX review. Synthetic projects, providers and engine transitions only.
const { _electron: electron, expect } = require('@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { cleanupBroker } = require('../../../tests/terminal-fixture.cjs');
const root = path.resolve(__dirname, '../../..');
const executable = process.env.TRICORDER_REVIEW_EXECUTABLE || path.join(root,'build-artifacts/linux-unpacked/odoo-tricorder');
const source = executable === 'source';
const label = process.env.TRICORDER_REVIEW_LABEL || 'packaged-final';
const failureReason = process.env.TRICORDER_REVIEW_FAILURE_REASON || 'Espace disque insuffisant pour préparer l’espace de travail synthétique. Libérez de l’espace sur le disque de test avant de reprendre. Aucun code modifié.';
const retryNote = 'Libérer de l’espace sur le disque de test avant une nouvelle tentative.';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-execution-review-'));
const output = __dirname;
const facts = { executable, failureReason, captured: new Date().toISOString(), views: {}, failures: [] };
facts.build = crypto.createHash('sha256').update(fs.readFileSync(source ? path.join(root,'dist/app.js') : path.join(path.dirname(executable),'resources/app.asar'))).digest('hex');
let app, page;
const call = (action, data={}) => page.evaluate(payload=>window.studio.request(payload), {action,...data});
async function capture(name) {
  await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(300);
  await page.screenshot({path:path.join(output,`${label}-${name}.png`)});
  facts.views[name] = await page.evaluate(()=>{
    const shadow=document.querySelector('#workflow-panel').shadowRoot;
    const selectors=['.studio','.workflow-heading','.workflow-heading h1','.conversation-tray','.request-selector','.work-items','.toolbar','.editor','.canvas-scroll','#inspector','.run-focus','.tabs','.run-tabs','.execution-status','.execution-context','#execution-overview','.execution-state','.execution-next','.failure-summary','.dependency-list','.node.selected','#decision-form','.request-options'];
    const record = e => {if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {text:(e.innerText||'').slice(0,1800),x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,display:s.display,overflow:s.overflow,overflowY:s.overflowY,fontSize:s.fontSize,lineHeight:s.lineHeight};};
    const out={width:innerWidth,height:innerHeight,rootOverflow:document.documentElement.scrollWidth>innerWidth,terminal:record(document.querySelector('#terminal-workspace')),workflow:record(document.querySelector('#workflow-panel')),elements:{}};
    for(const sel of selectors)out.elements[sel]=record(shadow.querySelector(sel));
    out.buttons=[...shadow.querySelectorAll('button,summary')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.y<innerHeight}).map(e=>({text:e.innerText,action:e.dataset.action,box:record(e)}));
    out.scrollRegions=[...shadow.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&e.scrollHeight>e.clientHeight+4&&['auto','scroll'].includes(s.overflowY)}).map(e=>({tag:e.tagName,id:e.id,class:e.className,box:record(e)}));
    return out;
  });
  fs.writeFileSync(path.join(output,`${label}-results.json`),JSON.stringify(facts,null,2)+'\n');
}
async function select(index) {
  const cards = page.locator('.work-items button');
  if(!await cards.nth(index).isVisible()) {
    const summary=page.locator('.request-selector > summary');
    if(await summary.isVisible())await summary.click();
  }
  await cards.nth(index).click();
  await expect(page.locator('.request-selector')).not.toHaveAttribute('open','');
}
async function attempt(name,fn) {try {await fn();facts.checks ||= {};facts.checks[name]='passed';}catch(e){facts.failures.push({name,error:e.message});console.log('CHECK FAILED',name,e.message.slice(0,1000));}}
async function expectFullNode() {
 const viewport=await page.locator('.canvas-scroll').boundingBox(), node=await page.locator('.node.selected').boundingBox();
 expect(node).not.toBeNull();expect(node.x).toBeGreaterThanOrEqual(viewport.x);expect(node.y).toBeGreaterThanOrEqual(viewport.y);expect(node.x+node.width).toBeLessThanOrEqual(viewport.x+viewport.width);expect(node.y+node.height).toBeLessThanOrEqual(viewport.y+viewport.height);
}
(async()=>{
 try {
  const bin=path.join(directory,'bin');fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin,'codex'),`#!/usr/bin/python3
from pathlib import Path
print('Terminal de recette synthétique — aucun fournisseur ni projet client.\\n\\n6 demandes préparées : 1 échec, 4 validations de plan, 1 dépendance.\\nLa préparation de la première demande a échoué. Aucun code modifié.\\nOuvrez son détail pour examiner le résultat avant de reprendre.\\n',flush=True)
while True:
 try: value=input('> ')
 except EOFError: break
 (Path(__file__).parent.parent/'terminal-input.txt').write_text(value)
 print('Reçu dans le terminal synthétique : '+value,flush=True)
`,{mode:0o755});
  app=await electron.launch({executablePath:source?undefined:executable,args:source?[root,'--workflow-studio']:['--workflow-studio'],env:{...process.env,PATH:bin+':/usr/bin:/bin',TRICORDER_STATE_DIR:directory,TRICORDER_HOME:directory,TRICORDER_TEST_MODE:'1'},timeout:20000});
  page=await app.firstWindow();page.setDefaultTimeout(8000);await page.setViewportSize({width:1998,height:1247});
  await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();await page.locator('[data-theme-choice=dark]').click();
  const project=await call('project.create',{title:'Projet de recette UX'});
  const data=await call('bootstrap');const graph=data.templates.find(g=>g.id==='release-conversation');
  graph.defaults={provider:'codex',model:'synthetic-model'};
  const conversation=await page.evaluate(payload=>window.studio.human(payload),{action:'conversation.open',project:project.id,provider:'codex',graph});
  const backend=source?path.join(root,'backend'):path.join(path.dirname(executable),'resources/backend');
  const seeded=spawnSync('python3',['-c',`import json,sys\nsys.path.insert(0,sys.argv[1])\nfrom workflow_engine import Engine\nfrom workflow_engine.conversations import Conversations\ne=Engine(sys.argv[2]);c=Conversations(e);cid=sys.argv[3]\ntitles=['Vérifier le dernier message reçu et préparer les quatre corrections demandées par le client.','R1 — Corriger le calcul des distances sans compter deux fois les trajets.','R2 — Ouvrir le projet créé depuis un devis et présenter les informations utiles.','R3 — Afficher les événements et les jalons prévus dans le planning du projet.','R4 — Recalculer le sous-total après une modification manuelle du montant.','C1 — Consolider les quatre corrections et vérifier leur fonctionnement commun.']\nitems=[]\nfor i,title in enumerate(titles):\n item=c.add(cid,title,key='review-'+str(i),depends_on=[x['id'] for x in items[1:]] if i==5 else []);items.append(item)\n if i==5:continue\n claim=e.claim(item['run'],'intent');e.submit(item['run'],'intent',claim['token'],{'ok':True,'summary':'Demande synthétique comprise.','outputs':{'intent':title}})\n claim=e.claim(item['run'],'plan');plan='Objectif : '+title+'\\n\\nTravail prévu\\n1. Reproduire le comportement dans le projet de test.\\n2. Confirmer la règle attendue et proposer une correction locale.\\n3. Vérifier le résultat et les scénarios voisins.\\n\\nCritères de réception\\nLe résultat affiché doit suivre la règle validée. Les opérations existantes doivent rester utilisables. Aucun déploiement ni notification n’est inclus.\\n\\nDécision attendue\\nConfirmer le périmètre ci-dessus avant toute réalisation.'\n e.submit(item['run'],'plan',claim['token'],{'ok':True,'summary':'Plan proposé, en attente de décision.','outputs':{'plan':plan}})\n if i==0:\n  s=e.run(item['run'])['nodes']['scope'];e.decide(item['run'],'scope',s['nonce'],s['proposal'],'approve',human=True);claim=e.claim(item['run'],'work');e.submit(item['run'],'work',claim['token'],{'ok':False,'summary':sys.argv[4],'outputs':{}})\nprint(json.dumps(c.snapshot(cid,limit=25)))`,backend,directory,conversation.id,failureReason],{encoding:'utf8'});
  expect(seeded.status,seeded.stderr).toBe(0);facts.initial=JSON.parse(seeded.stdout);
  const terminal=await page.evaluate(c=>window.tricorder.workflowTerminal({project:c.project,conversation:c.id}),conversation);facts.terminal={id:terminal.id,pid:terminal.pid};
  await page.reload();await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator('[data-action=open-conversation]').click();
  await page.locator('.conversation-tray').getByRole('button',{name:'Retrouver la conversation',exact:true}).click();await expect(page.locator('.xterm-screen:visible')).toBeVisible();
  await select(0);
  for(const [width,height] of [[1998,1247],[1440,900],[1024,768]]) {
    await page.setViewportSize({width,height});await page.getByRole('button',{name:'Graphe',exact:true}).click();await capture(`failed-graph-${width}`);
    await attempt(`graph-${width}`,async()=>{await expectFullNode();const c=await page.locator('.canvas-scroll').boundingBox();expect(c.height).toBeGreaterThanOrEqual(width===1024?280:350);await expect(page.locator('#inspector')).toBeHidden();await expect(page.locator('#execution-overview')).toContainText('Échec');await expect(page.locator('#execution-overview')).toContainText(failureReason);await expect(page.locator('.node.selected')).toContainText('Échec');await expect(page.locator('[data-action=execution-next-action]')).toBeInViewport({ratio:1});});
    await page.locator('[data-action=execution-next-action]').click();await capture(`failed-detail-${width}`);
    await attempt(`failure-detail-${width}`,async()=>{await expect(page.locator('.failure-summary')).toContainText(failureReason);await expect(page.locator('.failure-summary')).toBeInViewport({ratio:1});await expect(page.locator('#inspector')).not.toContainText('À valider');await expect(page.locator('.failure-actions [data-action=retry]')).toBeInViewport({ratio:1});const nested=await page.locator('#inspector').evaluate(e=>[...e.querySelectorAll('*')].filter(c=>c.scrollHeight>c.clientHeight+4&&['auto','scroll'].includes(getComputedStyle(c).overflowY)).length);expect(nested).toBe(0);});
  }
  await attempt('retry-dialog',async()=>{await page.locator('.failure-actions [data-action=retry]').click();await expect(page.getByRole('dialog')).toContainText('Demander une reprise');await page.getByLabel('Correction attendue').fill(retryNote);await page.waitForTimeout(2300);await expect(page.getByLabel('Correction attendue')).toHaveValue(retryNote);await capture('retry-dialog-1024');await page.getByRole('button',{name:'Fermer la fenêtre',exact:true}).click();await expect(page.locator('.failure-summary')).toContainText(failureReason);});
  await page.setViewportSize({width:1440,height:900});await select(1);await capture('plan-detail-1440');
  await attempt('plan-before-decision',async()=>{await expect(page.getByRole('button',{name:'Détail',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('#inspector')).toContainText('Travail prévu');await expect(page.locator('#inspector')).toContainText('Critères de réception');const input=await page.locator('#inspector .execution-data').first().boundingBox(),form=await page.locator('#decision-form').boundingBox();expect(input.y).toBeLessThan(form.y);await page.locator('#decision-note').fill('Commentaire synthétique conservé pendant le rafraîchissement.');await page.waitForTimeout(2300);await expect(page.locator('#decision-note')).toHaveValue('Commentaire synthétique conservé pendant le rafraîchissement.');await capture('plan-decision-action-1440');});
  await select(5);await capture('dependent-detail-1440');
  await attempt('dependencies-explicit',async()=>{await expect(page.getByRole('button',{name:'Détail',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.dependency-list button')).toHaveCount(4);await expect(page.locator('#inspector')).toContainText('En attente d’autres demandes');await page.locator('.dependency-list button').nth(2).click();await expect(page.locator('.workflow-heading h1')).toContainText('R3');await expect(page.locator('#inspector')).toContainText('Afficher les événements');await capture('dependency-destination-r3-1440');});
  await page.getByRole('button',{name:'Graphe',exact:true}).click();await attempt('return-graph-focus',expectFullNode);await capture('plan-graph-1440');
  await attempt('selector-keyboard',async()=>{const summary=page.locator('.request-selector > summary');await summary.focus();await page.keyboard.press('Enter');await expect(page.locator('.request-selector')).toHaveAttribute('open','');await page.waitForTimeout(2600);facts.selectorFocus=await page.evaluate(()=>{const s=document.querySelector('#workflow-panel').shadowRoot;return {outer:document.activeElement.id,inner:s.activeElement?.outerHTML}});await capture('six-requests-open-1440');await expect(summary).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('.request-selector')).not.toHaveAttribute('open','');await expect(summary).toBeFocused();});
  await select(0);await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1.25));await capture('failed-graph-zoom125-1440');
  await attempt('zoom125-main-action',async()=>{await expect(page.locator('[data-action=execution-next-action]')).toBeInViewport({ratio:1});await expectFullNode();});
  await page.getByRole('button',{name:'Détail',exact:true}).click();await capture('failed-detail-zoom125-1440');await attempt('zoom125-failure-cause',async()=>{await expect(page.locator('.failure-summary')).toBeInViewport({ratio:1});});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1));await page.setViewportSize({width:1440,height:900});await page.locator('[data-theme-choice=light]').click();
  await page.locator('[data-action=terminal-layout]').click();await capture('failed-detail-stacked-1440');await attempt('stacked-main-action',async()=>{await expect(page.locator('[data-action=execution-next-action]')).toBeInViewport({ratio:1});await expect(page.locator('.failure-summary')).toBeInViewport({ratio:1});});
  await select(5);await capture('dependent-detail-stacked-1440');
  await attempt('terminal-keyboard',async()=>{await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type('Continuer le suivi synthetique.');await page.keyboard.press('Enter');await expect.poll(()=>fs.existsSync(path.join(directory,'terminal-input.txt'))?fs.readFileSync(path.join(directory,'terminal-input.txt'),'utf8'):'').toBe('Continuer le suivi synthetique.');await capture('terminal-input-preserved-stacked-1440');});
  facts.finalTerminals=(await page.evaluate(()=>window.tricorder.terminals.list())).map(s=>({id:s.id,pid:s.pid,alive:s.alive}));
  expect(facts.finalTerminals).toEqual([{id:terminal.id,pid:terminal.pid,alive:true}]);
 } catch(e){facts.failures.push({error:e.message});throw e;} finally {
  fs.writeFileSync(path.join(output,`${label}-results.json`),JSON.stringify(facts,null,2)+'\n');
  if(app){if(page&&!page.isClosed())await page.evaluate(()=>window.tricorder.terminals.list()).catch(()=>{});await app.close().catch(()=>{});}
  await cleanupBroker(path.join(directory,'cockpit/odoo-tricorder/pty.sock'));await cleanupBroker(path.join(directory,'studio-pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 }
 console.log(JSON.stringify({build:facts.build,views:Object.keys(facts.views),failures:facts.failures,terminal:facts.terminal,finalTerminals:facts.finalTerminals}));
})().catch(e=>{console.error(e);process.exitCode=1;});
