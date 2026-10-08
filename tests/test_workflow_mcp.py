import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from workflow_engine import Engine, ContractError
from workflow_engine.contracts import digest
from workflow_engine.library import node
from workflow_engine.runtime import execute
from connectors.local_tools import inspect, qualify, exchange

SERVER='''import json,sys
from pathlib import Path
root=Path(__file__).parent
for line in sys.stdin:
 p=json.loads(line);m=p.get('method')
 if 'id' not in p:continue
 if m=='initialize':r={'protocolVersion':'2025-11-25','capabilities':{'tools':{}},'serverInfo':{'name':'fixture','version':'1'}}
 elif m=='tools/list':r={'tools':[{'name':n,'inputSchema':{'type':'object'},'description':(root/'revision').read_text() if (root/'revision').exists() else 'fixture'} for n in ['whoami','read','send']]}
 elif m=='tools/call':
  tool=p['params']['name'];a=p['params']['arguments']
  if tool=='whoami':value={'account':(root/'account').read_text()}
  elif tool=='read':value={'answer':a['question']}
  else:
   with (root/'sent').open('a') as f:f.write(json.dumps(a)+'\\n')
   value={'id':'remote-123','sent':True}
  r={'structuredContent':value,'content':[]}
 print(json.dumps({'jsonrpc':'2.0','id':p['id'],'result':r}),flush=True)
'''

class MCPTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
  self.engine=Engine(self.root/'state');self.project=self.engine.workspace_context()
  script=self.root/'server.py';script.write_text(SERVER);(self.root/'account').write_text('synthetic-account')
  self.config={'type':'mcp-stdio','argv':[sys.executable,str(script)],'timeout':3,'identity':{'tool':'whoami','arguments':{},'path':'/account'},'operations':{
   'read':{'tool':'read','effect':'read','arguments':{'question':{'$ref':'/arguments/parameters/question'}},'outputs':{'answer':{'$ref':'/answer'}}},
   'send':{'tool':'send','effect':'notify','arguments':{'to':{'$ref':'/arguments/target'},'text':{'$ref':'/arguments/content'},'key':{'$ref':'/idempotency_key'}},'outputs':{'sent':{'$ref':'/sent'}},'receipt':'/id'}}}
  manifest={'schema':1,'plugins':[{'id':'mcp','title':'MCP fixture','provider':'local','operations':['read','send'],'transport':self.config}]}
  (Path(self.project['path'])/'.tricorder/plugins.json').write_text(json.dumps(manifest))
  preview=inspect(self.engine,self.project,'mcp');self.record=qualify(self.engine,self.project,'mcp',digest(preview),human=True)

 def test_standard_handshake_mapped_read_and_notification(self):
  graph={'schema':1,'id':'mcp','title':'MCP','nodes':[node('read','Lire','document',parameters={'question':'READY'},outputs={'answer':'string'},capabilities=[{'plugin':'mcp','operation':'read'}],validation='automatic')],'edges':[]}
  run=self.engine.start('workspace',graph);claim=self.engine.claim(run['id'],'read');execute(self.engine,run['id'],'read',claim['token'])
  self.assertEqual(self.engine.run(run['id'])['nodes']['read']['result']['outputs'],{'answer':'READY'})
  graph['nodes']=[node('notify','Notifier','communication',recipient='synthetic-channel',template='Message synthétique',capabilities=[{'plugin':'mcp','operation':'send'}],validation='automatic')]
  run=self.engine.start('workspace',graph,notifications_authorized=True);claim=self.engine.claim(run['id'],'notify');execute(self.engine,run['id'],'notify',claim['token'])
  self.assertEqual(self.engine.run(run['id'])['status'],'completed')
  sent=json.loads((self.root/'sent').read_text());self.assertEqual(sent['to'],'synthetic-channel');self.assertEqual(len(sent['key']),64)

 def test_changed_account_or_schema_refuses_before_send(self):
  payload={'action':'call','operation':'send','arguments':{'target':'synthetic-channel','content':'hello'},'expected_identity':self.record['identity'],'expected_tool_digest':self.record['tool_digest'],'idempotency_key':'test'}
  (self.root/'account').write_text('other-account')
  with self.assertRaisesRegex(ContractError,'Compte MCP'):exchange(self.config,payload)
  (self.root/'account').write_text('synthetic-account');(self.root/'revision').write_text('changed tools')
  with self.assertRaisesRegex(ContractError,'Outils MCP'):exchange(self.config,payload)
  self.assertFalse((self.root/'sent').exists())

 def test_unavailable_tool_is_not_declared_connected(self):
  config=copy.deepcopy(self.config);config['operations']['read']['tool']='absent'
  with self.assertRaisesRegex(ContractError,'absent'):exchange(config,{'action':'describe'})


 def test_questions_notify_once_through_mcp_and_keep_the_work_waiting(self):
  from workflow_engine.conversations import Conversations, ask, answer
  from workflow_engine.notifications import queue_question
  for planned in (True, False):
   graph={'schema':1,'id':'questions','title':'Meeting hebdomadaire','on_question':{'plugin':'mcp','operation':'send','recipient':'synthetic-channel'},'nodes':[node('work','Clarifier','question' if planned else 'agent',**({'question':'Information confidentielle ?'} if planned else {}))],'edges':[]}
   with self.assertRaisesRegex(ContractError,'notifications'):
    self.engine.start('workspace',graph)
   service=Conversations(self.engine)
   c=service.open('workspace',graph,'codex',notifications_authorized=True)
   item=service.add(c['id'],'Préparer le compte rendu')
   run=self.engine.run(item['run'])
   if not planned:
    claim=self.engine.claim(run['id'],'work')
    run=ask(self.engine,run['id'],'work',claim['token'],'Information confidentielle imprévue ?')
   q=run['nodes']['work']['question'];child=q['notification']['run']
   with self.engine.store.transaction() as db:queue_question(self.engine,db,run,'work',q)
   claim=self.engine.claim(child,'question-notification');execute(self.engine,child,'question-notification',claim['token'])
   self.assertEqual(self.engine.run(child)['status'],'completed')
   self.assertEqual(self.engine.run(run['id'])['nodes']['work']['status'],'waiting_input')
   self.assertNotIn('confidentielle',(self.root/'sent').read_text())
   answer(self.engine,run['id'],'work',q['id'],'Précision reçue')
  self.assertEqual(len((self.root/'sent').read_text().splitlines()),2)

 def test_changed_connection_does_not_lose_an_unplanned_question(self):
  from workflow_engine.conversations import ask
  graph={'schema':1,'id':'questions','title':'Diagnostic','on_question':{'plugin':'mcp','operation':'send','recipient':'synthetic-channel'},'nodes':[node('work','Analyser','agent')],'edges':[]}
  run=self.engine.start('workspace',graph,notifications_authorized=True)
  claim=self.engine.claim(run['id'],'work')
  self.config['timeout']=4
  manifest=Path(self.project['path'])/'.tricorder/plugins.json'
  data=json.loads(manifest.read_text());data['plugins'][0]['transport']=self.config;manifest.write_text(json.dumps(data))
  run=ask(self.engine,run['id'],'work',claim['token'],'Quelle cible ?')
  self.assertEqual(run['nodes']['work']['status'],'waiting_input')
  self.assertEqual(run['nodes']['work']['question']['notification']['status'],'blocked')
  self.assertFalse((self.root/'sent').exists())

 def test_conversation_notifications_require_human_ui_and_portable_import_keeps_no_authorization(self):
  from studio import request
  from workflow_engine.portable import export, preview
  graph={'schema':1,'id':'questions','title':'Diagnostic','on_question':{'plugin':'mcp','operation':'send','recipient':'synthetic-channel'},'nodes':[node('work','Analyser','agent')],'edges':[]}
  payload={'action':'conversation.open','project':'workspace','graph':graph,'provider':'codex','authorize_notifications':True,'request':'Analyser'}
  with self.assertRaisesRegex(ContractError,'notifications'):request(self.engine,payload)
  c=request(self.engine,payload,human=True)
  self.assertTrue(c['notifications_authorized']);self.assertEqual(len(c['items']),1)
  bundle=export(graph,{})
  self.assertNotIn('notifications_authorized',bundle['workflow'])
  self.assertEqual(preview(bundle)['requirements']['capabilities'],[{'plugin':'mcp','operation':'send'}])
  graph['on_question']['operation']='read'
  with self.assertRaisesRegex(ContractError,'notification'):request(self.engine,payload,human=True)

 def test_answer_before_notification_dispatch_cancels_the_obsolete_notification(self):
  from workflow_engine.conversations import answer
  from workflow_engine.runtime import dispatch
  graph={'schema':1,'id':'questions','title':'Meeting','on_question':{'plugin':'mcp','operation':'send','recipient':'synthetic-channel'},'nodes':[node('work','Préciser','question',question='Qui relit ?')],'edges':[]}
  run=self.engine.start('workspace',graph,notifications_authorized=True)
  q=run['nodes']['work']['question']
  answer(self.engine,run['id'],'work',q['id'],'Réponse immédiate')
  self.assertEqual(dispatch(self.engine,q['notification']['run'])['status'],'cancelled')
  self.assertFalse((self.root/'sent').exists())
