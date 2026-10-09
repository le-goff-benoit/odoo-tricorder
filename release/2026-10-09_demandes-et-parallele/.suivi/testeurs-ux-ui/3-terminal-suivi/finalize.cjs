'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {cleanupBroker} = require('/home/blegoff/odoo-tricorder/tests/terminal-fixture.cjs');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname,'terminal-suivi-execution.json'),'utf8'));
const frozen = JSON.parse(fs.readFileSync(path.join(__dirname,'../paquet.json'),'utf8'));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function ownedProcesses() {
  const result=[];
  for (const entry of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      const values = Object.fromEntries(fs.readFileSync('/proc/'+entry+'/environ').toString().split('\0').filter(v=>v.includes('=')).map(v=>[v.slice(0,v.indexOf('=')),v.slice(v.indexOf('=')+1)]));
      if (values.TRICORDER_RUNTIME_DIR===manifest.dirs.runtime)
        result.push({pid:Number(entry),name:fs.readFileSync('/proc/'+entry+'/comm','utf8').trim(),display:values.DISPLAY});
    } catch (_) {}
  }
  return result;
}
(async()=>{
  const before=ownedProcesses();
  const app=before.find(p=>p.name==='odoo-tricorder'&&p.display===':183');
  if(app) process.kill(app.pid,'SIGTERM');
  for(const socket of [path.join(manifest.dirs.runtime,'pty.sock'),path.join(manifest.dirs.state,'studio-pty.sock'),path.join(manifest.dirs.state,'workflows/studio-pty.sock'),path.join(manifest.dirs.state,'cockpit/odoo-tricorder/pty.sock')])
    await cleanupBroker(socket);
  for(const p of ownedProcesses()) {
    try { process.kill(p.pid,'SIGTERM'); } catch(_) {}
  }
  await new Promise(r=>setTimeout(r,300));
  const candidate=manifest.candidate;
  const executableSha256=sha(candidate.executable),asarSha256=sha(candidate.asar);
  const backendMismatches=Object.entries(frozen.backend_files).filter(([file,expected])=>sha(path.join(path.dirname(candidate.executable),'resources/backend',file))!==expected).map(([file])=>file);
  const result={completedAt:new Date().toISOString(),before,remainingOwnedProcesses:ownedProcesses(),executableSha256,asarSha256,backendFilesChecked:Object.keys(frozen.backend_files).length,backendMismatches,integrityPassed:executableSha256===candidate.executableSha256&&asarSha256===candidate.asarSha256&&backendMismatches.length===0,displayServerStopped:false,captures:fs.readdirSync(path.join(__dirname,'captures')).filter(n=>n.endsWith('.png')).length};
  fs.writeFileSync(path.join(__dirname,'NETTOYAGE.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
  if(result.remainingOwnedProcesses.length||!result.integrityPassed) process.exitCode=1;
})();
