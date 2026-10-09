/* Independent adaptation harness. Preparation is GUI-free; both package hashes are mandatory. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const REPO = '/home/blegoff/odoo-tricorder';
const OUTPUT = __dirname;
const MARKER = 'TRICORDER-CREATION2-ADAPTATION-STUB';
const scenarios = [
  ['support-interne-a', 'Assistance équipe A', 'Demande fictive : la recherche interne ne retourne plus les documents depuis ce matin. Impact : quatre personnes bloquées. Responsable de qualification : Camille. Prochaine action : recueillir une reproduction.'],
  ['acces-outils-b', 'Accueil nouveaux arrivants B', 'Demande fictive : préparer les accès de Sam à la base documentaire et au suivi des demandes. Approbatrice : Léa. Aucun identifiant ni secret réel.'],
  ['cloture-comite-c', 'Comité décisions C', 'Notes fictives : décision de publier le planning lundi ; responsable Alex ; échéance lundi 12 octobre. Décision de vérifier les contacts fournisseurs ; responsable Jo ; échéance mardi 13 octobre.'],
  ['reception-prestataire-d', 'Suivi prestataires D', 'Livraison fictive : procédure de support et tableau des responsabilités. Preuves attendues : document daté et validation du responsable. Aucun fichier client.']
];
function persist(name, value) { fs.writeFileSync(path.join(OUTPUT,name), JSON.stringify(value,null,2)+'\n'); }
function preflight(manifest) {
  const result=spawnSync('/bin/bash',['--noprofile','--norc','-c','command -v codex; codex --version; command -v claude; claude --version'],{env:manifest.env,cwd:manifest.dirs.project,encoding:'utf8',timeout:5000});
  if(result.status!==0 || !result.stdout.includes(manifest.dirs.stubs+'/codex') || !result.stdout.includes(manifest.dirs.stubs+'/claude') || result.stdout.split(MARKER).length!==3) throw Error('Stub preflight failed');
  return result.stdout;
}
function prepare() {
  const cases=scenarios.map(([id,title,content])=>{
    const temporary=fs.mkdtempSync('/tmp/tricorder-creation2-'+id+'-');
    const dirs=Object.fromEntries(['home','config','cache','data','codex','claude','tricorder','state','runtime','agents','stubs','project'].map(n=>[n,path.join(temporary,n)]));
    for(const dir of Object.values(dirs)) fs.mkdirSync(dir,{recursive:true});
    fs.mkdirSync(path.join(dirs.state,'workflows'),{recursive:true});
    fs.chmodSync(dirs.runtime,0o700);
    for(const provider of ['codex','claude']) {
      const target=path.join(dirs.stubs,provider);
      fs.writeFileSync(target,`#!/usr/bin/python3\nimport sys\nprovider=${JSON.stringify(provider)}\nmarker=${JSON.stringify(MARKER)}\nif '--version' in sys.argv:\n print(provider+' 0.0.0 '+marker)\n sys.exit(0)\nprint(marker+' '+provider+' — fixture inerte, modèle non qualifié', flush=True)\nsys.exit(78)\n`);
      fs.chmodSync(target,0o755);
    }
    const fixedPath=dirs.stubs+':/usr/bin:/bin';
    const shellText=`export PATH='${fixedPath}'\nexport HISTFILE='${dirs.home}/.bash_history'\n`;
    fs.writeFileSync(path.join(dirs.home,'.bashrc'),shellText);
    fs.writeFileSync(path.join(dirs.home,'.bash_profile'),shellText);
    const env={PATH:fixedPath,HOME:dirs.home,XDG_CONFIG_HOME:dirs.config,XDG_CACHE_HOME:dirs.cache,XDG_DATA_HOME:dirs.data,XDG_RUNTIME_DIR:dirs.runtime,CODEX_HOME:dirs.codex,CLAUDE_CONFIG_DIR:dirs.claude,TRICORDER_HOME:dirs.tricorder,TRICORDER_STATE_DIR:dirs.state,STATE_DIR:dirs.state,TRICORDER_RUNTIME_DIR:dirs.runtime,RUNTIME_DIR:dirs.runtime,TRICORDER_AGENTS_DIR:dirs.agents,TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1',DISPLAY:':182',XAUTHORITY:'/tmp/tricorder-functional-display/auth-182',SHELL:'/bin/bash',LANG:'C.UTF-8',LC_ALL:'C.UTF-8'};
    fs.writeFileSync(path.join(dirs.project,'README.md'),'# '+title+'\n\nProjet synthétique indépendant. Aucun accès fournisseur réel.\n');
    fs.writeFileSync(path.join(dirs.project,'besoin.md'),'# Besoin fictif\n\n'+content+'\n');
    fs.writeFileSync(path.join(dirs.project,'AGENTS.md'),'# Projet synthétique\n\nTous les éléments sont fictifs. Ne contacter aucun service. Ne pas modifier les projets externes. Les fournisseurs sont des stubs inertes et ne qualifient aucun résultat métier.\n');
    const manifest={id,title,temporary,dirs,env,fixtures:[path.join(dirs.project,'README.md'),path.join(dirs.project,'besoin.md'),path.join(dirs.project,'AGENTS.md')],guiStarted:false,terminalVerified:false};
    manifest.preflight=preflight(manifest);
    return manifest;
  });
  const result={preparedAt:new Date().toISOString(),marker:MARKER,cases,captures:0,classification:'Préparation du banc — aucun verdict produit'};
  persist('preparation-manifest.json',result);
  return result;
}
function verifyFile(file,expected,label) {
  if(!path.isAbsolute(file||'') || !/^[a-f0-9]{64}$/.test(expected||'')) throw Error(label+' absolute path and SHA-256 required');
  const actual=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if(actual!==expected) throw Error(label+' SHA-256 mismatch');
  return actual;
}
async function launch(preparation,id,pkg) {
  const manifest=preparation.cases.find(c=>c.id===id);
  if(!manifest) throw Error('Unknown scenario');
  const sha256=verifyFile(pkg.executable,pkg.executableSha256,'Executable');
  const asarSha256=verifyFile(pkg.asar,pkg.asarSha256,'ASAR');
  if(path.resolve(pkg.asar)!==path.join(path.dirname(pkg.executable),'resources','app.asar')) throw Error('ASAR must belong to executable package');
  manifest.preflight=preflight(manifest);
  const {_electron}=require(path.join(REPO,'node_modules/@playwright/test'));
  const app=await _electron.launch({executablePath:pkg.executable,args:['--no-sandbox'],env:manifest.env,cwd:manifest.dirs.project,timeout:30000});
  const page=await app.firstWindow();
  await page.setViewportSize({width:1440,height:1000});
  manifest.package={executable:pkg.executable,sha256,asar:pkg.asar,asarSha256};
  manifest.guiStarted=true;
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  persist('execution-manifest.json',preparation);
  return {app,page,errors,manifest,
    verifyTerminal(observedText) {
      if(!observedText.includes(manifest.dirs.stubs+'/codex') || !observedText.includes(manifest.dirs.stubs+'/claude') || observedText.split(MARKER).length<3) throw Error('Visible terminal stub verification missing');
      manifest.terminalVerified=true;
      persist('execution-manifest.json',preparation);
    },
    assertWorkflowReady() { if(!manifest.terminalVerified) throw Error('Verify stub commands in visible terminal before workflow actions'); },
    async capture(name) {
      if(!/^[a-zA-Z0-9_-]+$/.test(name)) throw Error('Capture name must be a basename');
      if(preparation.captures>=12) throw Error('12 useful captures maximum for all scenarios');
      fs.mkdirSync(path.join(OUTPUT,'captures'),{recursive:true});
      await page.screenshot({path:path.join(OUTPUT,'captures',id+'-'+name+'.png')});
      preparation.captures++;
      persist('execution-manifest.json',preparation);
    },
    async visibleText() { return page.evaluate(()=>{function collect(node){let text=node.innerText||(node instanceof ShadowRoot?[...node.children].map(e=>e.innerText||'').join('\n'):'');for(const element of node.querySelectorAll('*'))if(element.shadowRoot)text+='\n'+collect(element.shadowRoot);return text;}return collect(document.body);}); },
    async close() { await app.close().catch(()=>app.process().kill('SIGKILL')); }
  };
}
module.exports={prepare,launch,preflight,MARKER,OUTPUT};
if(require.main===module) {
  if(process.argv[2]!=='--prepare') throw Error('Preparation only: --prepare. GUI awaits new package plus executable and ASAR SHA-256.');
  const preparation=prepare();
  for(const scenario of preparation.cases) process.stdout.write(scenario.id+'\n'+scenario.preflight+'Prepared '+scenario.temporary+'\n');
  process.stdout.write('No GUI started. No product verdict.\n');
}
