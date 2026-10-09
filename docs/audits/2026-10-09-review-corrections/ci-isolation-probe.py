"""Independent CI fixture review; no provider installation or model invocation."""
import hashlib,json,os,shutil,subprocess,sys,tempfile,time,unittest
from pathlib import Path
from unittest.mock import patch
root=Path(__file__).resolve().parents[3]
sys.path[:0]=[str(root/'backend'),str(root/'tests')]
from workflow_engine import Engine,ContractError
from workflow_engine.conversations import Conversations
from workflow_engine.recovery import diagnostic
from native_cli_fixture import use_native_cli_fixtures,cli_directory
results={}
with tempfile.TemporaryDirectory(prefix='tricorder-ci-independent-') as temp:
 e=Engine(Path(temp)/'state');p=e.create_project('Synthetic CI review');service=Conversations(e)
 graph={'schema':1,'id':'availability','title':'Review availability','nodes':[{'id':'work','title':'Inspect','kind':'agent','validation':'contract'}],'edges':[]}
 empty=Path(temp)/'empty';empty.mkdir();denied={}
 with patch.dict(os.environ,{'PATH':str(empty)}):
  for provider in ('codex','claude'):
   assert shutil.which(provider) is None
   try:service.open(p['id'],graph,provider);raise AssertionError('Missing CLI accepted')
   except ContractError as error:denied[provider]=str(error)
  assert service.list()==[]
 results['both_missing']={'denied':denied,'conversations_created':0}
 prior=os.environ.get('PATH');test=unittest.TestCase()
 folder=use_native_cli_fixtures(test,temp);exits={}
 try:
  for provider in ('codex','claude'):
   assert shutil.which(provider)==str(folder/provider)
   created=service.open(p['id'],graph,provider)
   assert created['provider']==provider
   executed=subprocess.run([provider,'--unexpected-model-flag'],capture_output=True,text=True,timeout=3)
   assert executed.returncode==78 and 'model execution is forbidden' in executed.stderr
   exits[provider]=executed.returncode
 finally:test.doCleanups()
 assert os.environ.get('PATH')==prior
 results['fixture_execution']={'exit_codes':exits,'path_restored':True}
 run=e.start(p['id'],graph);e.claim(run['id'],'work',executor='native')
 now=time.time();original=Path.read_text;conditions={}
 for name,uptime,expected in [('same_boot_young',3630,False),('same_boot_old',90000,False),('reboot_after_claim',5,True)]:
  def proc_read(path,*args,**kwargs):return f'{uptime} 0' if str(path)=='/proc/uptime' else original(path,*args,**kwargs)
  with patch('workflow_engine.recovery.time.time',return_value=now+3600),patch('workflow_engine.recovery.Path.read_text',new=proc_read):
   state=diagnostic(e,e.run(run['id']),'work');assert state['recoverable'] is expected,(name,state)
   conditions[name]=state
 results['boot_distinction']=conditions
manifest=json.loads((root/'docs/audits/2026-10-09-review-corrections/source-manifest-final.json').read_text())
changed=[name for name,expected in manifest['files'].items() if hashlib.sha256((root/name).read_bytes()).hexdigest()!=expected]
assert not changed,changed
results['application_manifest']={'checked':len(manifest['files']),'changed':changed}
print(json.dumps(results,ensure_ascii=False,indent=2))
