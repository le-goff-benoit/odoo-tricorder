const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');

test('a desktop process survives when its launching terminal closes stdout and stderr',async()=>{
  const modulePath=path.resolve(__dirname,'../electron/output-streams.cjs');
  const script=`require(${JSON.stringify(modulePath)}).protectStandardOutput();
    process.send('ready');
    process.on('message',()=>{
      // Electron's console writes directly to these streams. Node's console
      // alone would hide EPIPE and would make this regression test vacuous.
      process.stdout.write('Detached desktop output'); process.stderr.write('A recoverable IPC error');
      setTimeout(()=>{process.send('still responsive');process.disconnect();},100);
    });`;
  const child=spawn(process.execPath,['-e',script],{stdio:['ignore','pipe','pipe','ipc']});
  const messages=[];
  child.on('message',message=>{messages.push(message);if(message==='ready'){child.stdout.destroy();child.stderr.destroy();child.send('write');}});
  const outcome=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>resolve({code,signal}));});
  assert.deepEqual(outcome,{code:0,signal:null});
  assert.deepEqual(messages,['ready','still responsive']);
});

test('unrelated output stream errors are still raised',()=>{
  const {EventEmitter}=require('node:events');
  const {protectStandardOutput}=require('../electron/output-streams.cjs');
  const output=new EventEmitter(),errorOutput=new EventEmitter();
  protectStandardOutput(output,errorOutput);
  output.emit('error',Object.assign(new Error('closed reader'),{code:'EPIPE'}));
  const realError=Object.assign(new Error('different failure'),{code:'EACCES'});
  assert.throws(()=>errorOutput.emit('error',realError),error=>error===realError);
});
