import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from workflow_engine import Engine, ContractError
from workflow_engine.library import node, edge
from workflow_engine.runtime import execute
from connectors import candidates

class CandidateTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);self.engine=Engine(self.root/'state');self.project=self.engine.create_project('Code')
        self.source=Path(self.project['path'])/'calc.py';self.source.write_text('value = 1\n')
        graph={'schema':1,'id':'code','title':'Code','nodes':[node('edit','Modifier','agent',model='fixture',execution_mode='edit',outputs={'candidate':'object'}),node('test','Tester','command',inputs={'candidate':'object'},argv=['python3','-c','exec(open("/project/calc.py").read()); assert value == 2'],validation='automatic')],'edges':[{**edge('edit','test'),'mapping':{'candidate':'candidate'}}]}
        self.run=self.engine.start(self.project['id'],graph);self.claim=self.engine.claim(self.run['id'],'edit')
        self.prepared=candidates.prepare(self.engine,self.run,self.root/'job')
        (self.prepared['workspace']/'calc.py').write_text('value = 2\n')
        self.ref,self.diff=candidates.capture(self.engine,self.run,self.prepared)
        self.engine.submit(self.run['id'],'edit',self.claim['token'],{'ok':True,'summary':'Code proposé','outputs':{'candidate':self.ref},'patch':self.diff,'evidence':[self.ref,self.diff]})

    def accept(self, tests=True):
        self.engine.accept(self.run['id'],'edit',human=True,checks=[],note='Diff relu')
        if tests:
            claim=self.engine.claim(self.run['id'],'test');execute(self.engine,self.run['id'],'test',claim['token'])

    def test_actual_candidate_test_and_explicit_application(self):
        with self.assertRaises(ContractError):candidates.apply(self.engine,self.run['id'],'edit',self.ref['sha256'],human=True)
        self.accept(tests=False)
        with self.assertRaisesRegex(ContractError,'tests liés'):candidates.apply(self.engine,self.run['id'],'edit',self.ref['sha256'],human=True)
        claim=self.engine.claim(self.run['id'],'test');execute(self.engine,self.run['id'],'test',claim['token'])
        self.assertEqual(self.engine.run(self.run['id'])['nodes']['test']['status'],'accepted')
        self.assertEqual(self.source.read_text(),'value = 1\n')
        with self.assertRaises(ContractError):candidates.apply(self.engine,self.run['id'],'edit',self.ref['sha256'])
        candidates.apply(self.engine,self.run['id'],'edit',self.ref['sha256'],human=True)
        self.assertEqual(self.source.read_text(),'value = 2\n')
        with self.assertRaises(ContractError):candidates.apply(self.engine,self.run['id'],'edit',self.ref['sha256'],human=True)

    def test_any_source_change_blocks_apply_and_materialize(self):
        self.accept();(self.source.parent/'other.py').write_text('user edit')
        with self.assertRaisesRegex(ContractError,'Conflit'):candidates.apply(self.engine,self.run['id'],'edit',self.ref['sha256'],human=True)
        with self.assertRaises(ContractError):candidates.materialize(self.engine,self.ref,self.project['id'],self.root/'test')
        self.assertEqual(self.source.read_text(),'value = 1\n')

    def test_database_failure_rolls_back_files_and_keeps_result_unapplied(self):
        self.accept()
        with patch.object(self.engine,'_save',side_effect=OSError('disk error')):
            with self.assertRaises(OSError):candidates.apply(self.engine,self.run['id'],'edit',self.ref['sha256'],human=True)
        self.assertEqual(self.source.read_text(),'value = 1\n')
        self.assertNotIn('applied_candidate',self.engine.run(self.run['id'])['nodes']['edit'])
        self.assertFalse((self.engine.store.directory/'candidate-application.json').exists())

    def test_crash_recovery_does_not_overwrite_subsequent_edit(self):
        journal=self.engine.store.directory/'candidate-application.json'
        journal.write_text(json.dumps({'run':self.run['id'],'node':'edit','candidate':self.ref['sha256'],'files':[{'path':'calc.py','original':self.engine.artifact(b'value = 1\n'),'mode':420,'before_hash':'before','after_hash':'after'}]}))
        self.source.write_text('later user edit')
        with self.assertRaisesRegex(ContractError,'interrompue'):candidates._recover(self.engine,journal)
        self.assertEqual(self.source.read_text(),'later user edit')

    def test_symlink_and_sensitive_paths_never_enter_candidate(self):
        for name in ['../escape','.git/config','.env','folder/auth.json']:
            with self.assertRaises(ContractError):candidates.safe_path(self.prepared['workspace'],name)
        (self.prepared['workspace']/'link').symlink_to(self.source)
        with self.assertRaises(ContractError):candidates.capture(self.engine,self.run,self.prepared)

if __name__=='__main__':unittest.main()
