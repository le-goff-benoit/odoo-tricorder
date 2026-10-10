const root=require('node:path').resolve(__dirname,'../../..');
const { _electron:electron,expect }=require(root+'/node_modules/@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {cleanupBroker}=require(root+'/tests/terminal-fixture.cjs');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-product-capture-'));
const output=path.join(root,'release/2026-10-10_contrats-et-editeur/captures');
fs.mkdirSync(output,{recursive:true});
let app;
(async()=>{
 try {
  app=await electron.launch({executablePath:root+'/build-artifacts/linux-unpacked/odoo-tricorder',args:[],env:{PATH:'/usr/bin:/bin',HOME:directory,DISPLAY:process.env.DISPLAY,XAUTHORITY:process.env.XAUTHORITY,LANG:'C.UTF-8',XDG_CONFIG_HOME:directory+'/config',XDG_DATA_HOME:directory+'/data',XDG_CACHE_HOME:directory+'/cache',CODEX_HOME:directory+'/codex',CLAUDE_CONFIG_DIR:directory+'/claude',TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_RUNTIME_DIR:directory+'/runtime',TRICORDER_AGENTS_DIR:directory+'/absent-pack',TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'}});
  const page=await app.firstWindow();await page.setViewportSize({width:1600,height:1050});
  const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
  await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();
  await page.getByRole('button',{name:'Projets',exact:true}).click();await page.getByRole('button',{name:'+ Nouveau projet',exact:true}).click();
  await page.getByLabel('Nom du projet',{exact:true}).fill('Atelier produit — démonstration');await page.getByRole('button',{name:'Créer le projet',exact:true}).click();
  await page.getByRole('button',{name:'Workflows',exact:true}).click();await page.getByRole('button',{name:'Créer un workflow',exact:true}).click();
  await page.getByLabel('Modèle de workflow',{exact:true}).selectOption('intentions-plan-work');
  await page.getByLabel('Nom du workflow',{exact:true}).fill('Des intentions aux livrables');
  await page.getByLabel('Enregistrer dans',{exact:true}).selectOption({label:'Atelier produit — démonstration'});
  await page.getByRole('button',{name:'Créer et ouvrir le workflow',exact:true}).click();
  await expect(page.locator('.node')).toHaveCount(5);
  await page.getByRole('button',{name:'+ Note',exact:true}).click();await page.getByLabel('Titre',{exact:true}).fill('Un plan, plusieurs livrables');
  await page.getByLabel('Texte de la note',{exact:true}).fill('Chaque intention alimente le plan. Après validation, chaque tâche possède son suivi et ses résultats.');
  await page.getByRole('button',{name:'Ajouter la note',exact:true}).click();await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
  const project=(await call('bootstrap')).projects.find(p=>p.title==='Atelier produit — démonstration');
  const data=await call('project.get',{project:project.id});
  const item=data.workflows.find(g=>g.title==='Des intentions aux livrables');
  const graph=await call('workflow.get',{project:project.id,workflow:item.id});
  graph.title='Recueillir les besoins et valider le plan';
  graph.nodes=graph.nodes.slice(0,3);graph.nodes.forEach((node,index)=>node.position={x:50+index*470,y:100});
  const nodeIds=new Set(graph.nodes.map(node=>node.id));graph.edges=graph.edges.filter(edge=>nodeIds.has(edge.from)&&nodeIds.has(edge.to));
  graph.layout.notes[0].title='Une liste d’intentions, un seul plan';
  graph.layout.notes[0].text='Précisez les besoins dans le terminal ou dans le suivi. La confirmation des intentions et l’approbation du plan sont deux décisions distinctes.';
  graph.layout.notes[0].position={x:500,y:385};graph.layout.notes[0].size={width:400,height:180};
  await call('workflow.save',{project:project.id,graph,revision:graph.revision});
  await page.getByRole('button',{name:'Workflows',exact:true}).click();await page.locator(`[data-action=open-workflow][data-id="${item.id}"]`).click();
  await page.getByRole('button',{name:'Ajuster',exact:true}).click();
  await expect(page.locator('.flash')).toHaveCount(0,{timeout:8000});await expect(page.locator('.graph-note')).toBeVisible();
  const file=path.join(output,'editeur.png');await page.screenshot({path:file});
  fs.writeFileSync(path.join(output,'editeur-provenance.json'),JSON.stringify({version:'0.6.0-rc.13',application:'linux-unpacked',scope:'Temporary synthetic project; built-in model adopted via UI, reduced to its first three blocks and laid out through workflow.save; note added via UI; no execution or provider call.',sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')},null,2)+'\n');
  console.log('Capture créée : '+file);
 } finally {
  if(app)await app.close();
  for(const socket of ['cockpit/odoo-tricorder/pty.sock','studio-pty.sock','runtime/pty.sock'])await cleanupBroker(path.join(directory,socket));
  fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
