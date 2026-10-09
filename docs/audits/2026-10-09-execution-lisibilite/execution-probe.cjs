// Independent UX review. Synthetic projects, providers and engine transitions only.
const { _electron: electron, expect } = require('@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { cleanupBroker } = require('../../../tests/terminal-fixture.cjs');
const root = path.resolve(__dirname, '../../..');
const executable = process.env.TRICORDER_REVIEW_EXECUTABLE || '/home/blegoff/.local/opt/odoo-tricorder-0.6.0-rc.9/odoo-tricorder';
const source = executable === 'source';
const label = process.env.TRICORDER_REVIEW_LABEL || 'rc9';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-execution-review-'));
const output = __dirname;
const facts = { executable, captured: new Date().toISOString(), views: {}, failures: [] };
facts.build = crypto.createHash('sha256').update(fs.readFileSync(source ? path.join(root,'dist/app.js') : path.join(path.dirname(executable),'resources/app.asar'))).digest('hex');
let app, page;
const call = (action, data={}) => page.evaluate(payload=>window.studio.request(payload), {action,...data});
async function capture(name) {
  await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(300);
  await page.screenshot({path:path.join(output,`${label}-${name}.png`)});
  facts.views[name] = await page.evaluate(()=>{
    const shadow=document.querySelector('#workflow-panel').shadowRoot;
    const selectors=['.studio','.workflow-heading','.workflow-heading h1','.conversation-tray','.request-selector','.work-items','.toolbar','.editor','.canvas-scroll','#inspector','.run-focus','.tabs','.run-tabs','.execution-status','.execution-context'];
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
}
(async()=>{
 try {
  const bin=path.join(directory,'bin');fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin,'codex'),'#!/bin/sh\nprintf "Terminal de recette synthétique — aucun fournisseur ni projet client.\\n\\n6 demandes préparées : 1 échec, 4 validations de plan, 1 dépendance.\\nLa préparation de la première demande a échoué. Aucun code modifié.\\nOuvrez son détail pour examiner le résultat avant de reprendre.\\n\\n> "\nwhile IFS= read -r line; do printf "Reçu dans le terminal synthétique : %s\\n> " "$line"; done\n',{mode:0o755});
  app=await electron.launch({executablePath:source?undefined:executable,args:source?[root,'--workflow-studio']:['--workflow-studio'],env:{...process.env,PATH:bin+':/usr/bin:/bin',TRICORDER_STATE_DIR:directory,TRICORDER_HOME:directory,TRICORDER_TEST_MODE:'1'},timeout:20000});
  page=await app.firstWindow();page.setDefaultTimeout(8000);await page.setViewportSize({width:1998,height:1247});
  await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();await page.locator('[data-theme-choice=dark]').click();
  const project=await call('project.create',{title:'Projet de recette UX'});
  const data=await call('bootstrap');const graph=data.templates.find(g=>g.id==='release-conversation');
  graph.defaults={provider:'codex',model:'synthetic-model'};
  const conversation=await page.evaluate(payload=>window.studio.human(payload),{action:'conversation.open',project:project.id,provider:'codex',graph});
  const backend=source?path.join(root,'backend'):path.join(path.dirname(executable),'resources/backend');
  const seeded=spawnSync('python3',['-c',`import json,sys\nsys.path.insert(0,sys.argv[1])\nfrom workflow_engine import Engine\nfrom workflow_engine.conversations import Conversations\ne=Engine(sys.argv[2]);c=Conversations(e);cid=sys.argv[3]\ntitles=['Vérifier le dernier message reçu et préparer les quatre corrections demandées par le client.','R1 — Corriger le calcul des distances sans compter deux fois les trajets.','R2 — Ouvrir le projet créé depuis un devis et présenter les informations utiles.','R3 — Afficher les événements et les jalons prévus dans le planning du projet.','R4 — Recalculer le sous-total après une modification manuelle du montant.','C1 — Consolider les quatre corrections et vérifier leur fonctionnement commun.']\nitems=[]\nfor i,title in enumerate(titles):\n item=c.add(cid,title,key='review-'+str(i),depends_on=[x['id'] for x in items[1:]] if i==5 else []);items.append(item)\n if i==5:continue\n claim=e.claim(item['run'],'intent');e.submit(item['run'],'intent',claim['token'],{'ok':True,'summary':'Demande synthétique comprise.','outputs':{'intent':title}})\n claim=e.claim(item['run'],'plan');plan='Objectif : '+title+'\\n\\nTravail prévu\\n1. Reproduire le comportement dans le projet de test.\\n2. Confirmer la règle attendue et proposer une correction locale.\\n3. Vérifier le résultat et les scénarios voisins.\\n\\nCritères de réception\\nLe résultat affiché doit suivre la règle validée. Les opérations existantes doivent rester utilisables. Aucun déploiement ni notification n’est inclus.\\n\\nDécision attendue\\nConfirmer le périmètre ci-dessus avant toute réalisation.'\n e.submit(item['run'],'plan',claim['token'],{'ok':True,'summary':'Plan proposé, en attente de décision.','outputs':{'plan':plan}})\n if i==0:\n  s=e.run(item['run'])['nodes']['scope'];e.decide(item['run'],'scope',s['nonce'],s['proposal'],'approve',human=True);claim=e.claim(item['run'],'work');e.submit(item['run'],'work',claim['token'],{'ok':False,'summary':'Impossible de préparer l’espace de travail : l’archive synthétique dépasse la limite de test. Aucun code modifié. Examiner le périmètre de copie avant de reprendre.','outputs':{}})\nprint(json.dumps(c.snapshot(cid,limit=25)))`,backend,directory,conversation.id],{encoding:'utf8'});
  expect(seeded.status,seeded.stderr).toBe(0);facts.initial=JSON.parse(seeded.stdout);
  const terminal=await page.evaluate(c=>window.tricorder.workflowTerminal({project:c.project,conversation:c.id}),conversation);facts.terminal={id:terminal.id,pid:terminal.pid};
  await page.reload();await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator('[data-action=open-conversation]').click();
  await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();await expect(page.locator('.xterm-screen:visible')).toBeVisible();
  await select(0);
  for(const [width,height] of [[1998,1247],[1440,900],[1024,768]]) {
    await page.setViewportSize({width,height});await capture(`failed-graph-${width}`);
    const read=page.getByRole('button',{name:'Lire le résultat',exact:true});
    if(await read.isVisible()){await read.click();await capture(`failed-detail-${width}`);await page.getByRole('button',{name:'Graphe et détail',exact:true}).click();}
  }
  await page.setViewportSize({width:1440,height:900});await select(1);await capture('plan-graph-1440');
  const read=page.getByRole('button',{name:'Lire le résultat',exact:true});if(await read.isVisible()){await read.click();await capture('plan-detail-1440');}
  await select(5);await capture('dependent-detail-1440');
  facts.finalTerminals=(await page.evaluate(()=>window.tricorder.terminals.list())).map(s=>({id:s.id,pid:s.pid,alive:s.alive}));
  expect(facts.finalTerminals).toEqual([{id:terminal.id,pid:terminal.pid,alive:true}]);
 } catch(e){facts.failures.push({error:e.message});throw e;} finally {
  fs.writeFileSync(path.join(output,`${label}-results.json`),JSON.stringify(facts,null,2)+'\n');
  if(app){if(page&&!page.isClosed())await page.evaluate(()=>window.tricorder.terminals.list()).catch(()=>{});await app.close().catch(()=>{});}
  await cleanupBroker(path.join(directory,'cockpit/odoo-tricorder/pty.sock'));await cleanupBroker(path.join(directory,'studio-pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 }
 console.log(JSON.stringify({build:facts.build,views:Object.keys(facts.views),failures:facts.failures,terminal:facts.terminal,finalTerminals:facts.finalTerminals}));
})().catch(e=>{console.error(e);process.exitCode=1;});
