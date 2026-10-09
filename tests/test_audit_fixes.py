"""User journeys from the independent rc.7 audit, synthetic state only."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine, ContractError
from workflow_engine.contracts import expand
from workflow_engine.conversations import Conversations
from workflow_engine.documentation import markdown
from workflow_engine.recovery import diagnostic, finish
from studio import request


def graph(nodes, edges=(), name='audit-test'):
    return {'schema': 1, 'id': name, 'title': 'Parcours synthétique', 'nodes': nodes, 'edges': list(edges)}


def task(nid='work', **kw):
    return {'id': nid, 'title': nid, 'kind': 'task', **kw}


class AuditFixes(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='tricorder-audit-dev-')
        self.addCleanup(self.temp.cleanup)
        self.engine = Engine(self.temp.name)
        self.project = self.engine.create_project('Parcours synthétique')

    def done(self, run, nid, outputs):
        claim = self.engine.claim(run['id'], nid)
        return self.engine.submit(run['id'], nid, claim['token'], {'ok': True, 'summary': 'Résultat produit', 'outputs': outputs})

    def test_visible_decision_output_and_safe_paginated_evidence(self):
        g = graph([task(outputs={'plan': 'string'}, validation='contract'), {'id':'review','title':'Revue','kind':'decision','inputs':{'plan':'string'}}], [{'id':'link','from':'work','to':'review','mapping':{'plan':'plan'}}])
        run = self.engine.start(self.project['id'], g)
        plan = 'PLAN_SENTINEL ' + 'ligne de résultat\n' * 3000
        run = self.done(run, 'work', {'plan': plan})
        self.assertIn(plan, markdown(run))
        view = request(self.engine, {'action':'run.get','run':run['id']})['run']
        ref = view['nodes']['review']['inputs']['$artifact']
        first = request(self.engine, {'action':'run.proof','run':run['id'],'sha256':ref['sha256']})
        self.assertIn('PLAN_SENTINEL', first['text'])
        self.assertIsNotNone(first['next'])
        with self.assertRaises(ContractError):
            request(self.engine, {'action':'run.proof','run':run['id'],'sha256':'../etc/passwd'})
        other = self.engine.artifact(b'Not attached to this run')
        with self.assertRaises(ContractError):
            request(self.engine, {'action':'run.proof','run':run['id'],'sha256':other['sha256']})

    def test_orphan_recovery_releases_locks_and_slots_without_respawn(self):
        for i in range(5):
            run = self.engine.start(self.project['id'], graph([task(resources=['repo'])]))
            self.engine.claim(run['id'], 'work')
            self.engine.control(run['id'], 'cancel')
            with patch('workflow_engine.recovery.time.time', return_value=time.time()+20):
                result = finish(self.engine, run['id'], 'work', human=True)
            self.assertEqual(result['status'], 'cancelled')
            self.assertEqual(result['nodes']['work']['status'], 'returned')
        next_run = self.engine.start(self.project['id'], graph([task(resources=['repo'])]))
        self.engine.claim(next_run['id'], 'work')

    def test_live_worker_blocks_recovery_and_late_result_is_stale(self):
        run = self.engine.start(self.project['id'], graph([task()]))
        claim = self.engine.claim(run['id'], 'work')
        process = subprocess.Popen([sys.executable, '-c', 'import time;time.sleep(30)'])
        try:
            self.engine.heartbeat(run['id'], 'work', claim['token'], process.pid)
            with self.assertRaisesRegex(ContractError, 'encore actif'):
                finish(self.engine, run['id'], 'work', human=True)
        finally:
            process.terminate(); process.wait()
        finish(self.engine, run['id'], 'work', human=True)
        with self.assertRaisesRegex(ContractError, 'périmée'):
            self.engine.submit(run['id'], 'work', claim['token'], {'summary':'late','ok':True})

    def test_subworkflow_data_roundtrip_and_terminal_decision(self):
        child = graph([task(inputs={'request':'string'}, outputs={'answer':'string'}, validation='contract')], name='child')
        outer = graph([task('source', outputs={'request':'string'}, validation='contract'), {'id':'component','title':'Analyse','kind':'subworkflow','workflow':'child','inputs':{'request':'string'},'outputs':{'answer':'string'}}, task('after',inputs={'answer':'string'})], [{'id':'in','from':'source','to':'component','mapping':{'request':'request'}}, {'id':'out','from':'component','to':'after','mapping':{'answer':'answer'}}])
        run = self.engine.start(self.project['id'], outer, library={'child':child})
        run = self.done(run, 'source', {'request':'REQUEST_SENTINEL'})
        self.assertEqual(run['nodes']['component.work']['inputs']['request'], 'REQUEST_SENTINEL')
        run = self.done(run, 'component.work', {'answer':'DIAGNOSTIC_SENTINEL'})
        self.assertEqual(run['nodes']['after']['inputs']['answer'], 'DIAGNOSTIC_SENTINEL')
        child['nodes'][0]['inputs']['request'] = 'number'
        with self.assertRaisesRegex(ContractError, 'type incompatible'):
            expand(outer, {'child':child})

    def test_dynamic_publication_freezes_exact_body_and_candidate(self):
        from connectors.tool_runtime import execute_tool
        op={'action':'draft','target':'synthetic-inbox','candidate':{'input':'version'}}
        g=graph([task('draft',outputs={'body':'string','version':'string'},validation='contract'), {'id':'approve','kind':'decision','title':'Valider','operation':op,'inputs':{'body':'string','version':'string'},'outputs':{'body':'string','version':'string'}}, {'id':'publish','kind':'external','title':'Brouillon','operation':op,'approval':'approve','inputs':{'body':'string','version':'string'},'capabilities':[{'plugin':'test','operation':'create'}]}], [{'id':'a','from':'draft','to':'approve','mapping':{'body':'body','version':'version'}},{'id':'b','from':'approve','to':'publish','outcome':'approve','mapping':{'body':'body','version':'version'}}])
        record={'config':{'argv':['/fixture']},'identity':'local-fixture','descriptor':'fixture','operations':{'create':'write'},'tool_digest':None}
        calls=[]
        def exchange(config,payload,**kw):
            if payload['action']=='describe': return {'connected':True, **{k:record[k] for k in ('identity','operations','tool_digest')}}
            calls.append(payload);return {'ok':True,'identity':record['identity'],'outputs':{},'receipt':{'id':'draft-fixture'}}
        with patch('workflow_engine.integrations.issues',return_value=[]),patch('connectors.local_tools.approved',return_value=record),patch('connectors.tool_runtime.approved',return_value=record),patch('connectors.tool_runtime.exchange',side_effect=exchange):
            run=self.engine.start(self.project['id'],g)
            run=self.done(run,'draft',{'body':'DRAFT_SENTINEL','version':'sha-exact'})
            gate=run['nodes']['approve'];self.assertEqual(gate['operation']['body'],'DRAFT_SENTINEL')
            self.assertEqual(gate['operation']['candidate'],'sha-exact')
            self.engine.decide(run['id'],'approve',gate['nonce'],gate['proposal'],'approve',human=True)
            claim=self.engine.claim(run['id'],'publish')
            execute_tool(self.engine,claim['run'],claim['node'],claim['token'])
            execute_tool(self.engine,claim['run'],claim['node'],claim['token'])
            self.assertEqual(len(calls),1)
            self.assertEqual(calls[0]['arguments']['body'],'DRAFT_SENTINEL')
            self.assertEqual(calls[0]['arguments']['candidate'],'sha-exact')

    def test_large_conversation_is_paged_and_last_request_accessible(self):
        service=Conversations(self.engine)
        c=service.open(self.project['id'],graph([task()]),'codex')
        for i in range(50): service.add(c['id'],f'Request {i} '+ 'x'*90000,key=str(i))
        for action,payload in [('project.get',{'project':self.project['id']}),('conversation.get',{'conversation':c['id']}),('runtime.tick',{})]:
            data=request(self.engine,{'action':action,**payload})
            self.assertLess(len(json.dumps(data).encode()), 700000,action)
        page=request(self.engine,{'action':'conversation.get','conversation':c['id'],'offset':25})
        self.assertEqual(page['total'],50)
        self.assertIn('Request 49',page['items'][-1]['request'])
        last=request(self.engine,{'action':'run.get','run':page['items'][-1]['run']})
        self.assertIn('$artifact',last['run']['parameters']['request'])

    def test_native_claim_never_expires_into_permission_to_recover(self):
        run=self.engine.start(self.project['id'],graph([task()]))
        self.engine.claim(run['id'],'work',executor='native',owner_pid=os.getpid())
        with patch('workflow_engine.recovery.time.time',return_value=time.time()+3600):
            self.assertFalse(diagnostic(self.engine,self.engine.run(run['id']),'work')['recoverable'])
        other=self.engine.start(self.project['id'],graph([task()]))
        self.engine.claim(other['id'],'work',executor='native')
        with patch('workflow_engine.recovery.time.time',return_value=time.time()+3600):
            self.assertIn('sans identité',diagnostic(self.engine,self.engine.run(other['id']),'work')['reason'])

    def test_legacy_unidentified_attempt_requires_verified_reboot(self):
        run=self.engine.start(self.project['id'],graph([task()]))
        self.engine.claim(run['id'],'work',executor='native')
        legacy=self.engine.run(run['id'])
        legacy['nodes']['work'].pop('ownership')
        self.assertFalse(diagnostic(self.engine,legacy,'work')['recoverable'])
        read_text=Path.read_text
        def fresh_boot(path,*args,**kwargs):
            return '0.01 0.01' if str(path)=='/proc/uptime' else read_text(path,*args,**kwargs)
        with patch('workflow_engine.recovery.Path.read_text',new=fresh_boot),patch('workflow_engine.recovery.time.time',return_value=time.time()+30):
            self.assertTrue(diagnostic(self.engine,legacy,'work')['recoverable'])
            self.assertTrue(diagnostic(self.engine,self.engine.run(run['id']),'work')['recoverable'])

    def test_native_cli_exit_does_not_hide_a_surviving_terminal_child(self):
        import signal
        from workflow_engine.recovery import identity
        child_code='import subprocess,sys,time;subprocess.Popen([sys.executable,"-c","import time;time.sleep(30)"]);print("child-started",flush=True);time.sleep(30)'
        shell_code='import subprocess,sys,time;p=subprocess.Popen([sys.executable,"-c",sys.argv[1]]);print(p.pid,flush=True);time.sleep(30)'
        shell=subprocess.Popen([sys.executable,'-c',shell_code,child_code],stdout=subprocess.PIPE,text=True,start_new_session=True)
        try:
            owner=int(shell.stdout.readline());self.assertEqual(shell.stdout.readline().strip(),'child-started')
            run=self.engine.start(self.project['id'],graph([task()]))
            self.engine.claim(run['id'],'work',executor='native',owner_pid=owner)
            os.kill(owner,signal.SIGTERM)
            for _ in range(100):
                if identity(owner) is None:break
                time.sleep(.01)
            self.assertIsNone(identity(owner))
            self.assertFalse(diagnostic(self.engine,self.engine.run(run['id']),'work')['recoverable'])
        finally:
            os.killpg(shell.pid,signal.SIGTERM);shell.wait();shell.stdout.close()

    def test_multi_megabyte_result_is_readable_without_growing_proof_store(self):
        g=graph([task(outputs={'report':'string'},validation='contract'),{'id':'review','title':'Revue','kind':'decision','inputs':{'report':'string'}}],[{'id':'review','from':'work','to':'review','mapping':{'report':'report'}}])
        run=self.engine.start(self.project['id'],g)
        result='Report start\n'+'x'*2_500_000+'\nReport end'
        self.done(run,'work',{'report':result})
        view=request(self.engine,{'action':'run.get','run':run['id']})
        self.assertLess(len(json.dumps(view)),50000)
        ref=view['run']['nodes']['review']['inputs']['$artifact']
        page=request(self.engine,{'action':'run.proof','run':run['id'],'sha256':ref['sha256'],'offset':2_490_000})
        self.assertIn('Report end',page['text'])
        self.assertFalse((self.engine.store.directory/'artifacts').exists())

    def test_execution_event_pages_reach_the_complete_history(self):
        from workflow_engine.conversations import ask
        run=self.engine.start(self.project['id'],graph([task(f't{i}') for i in range(110)]))
        for i in range(110):
            claim=self.engine.claim(run['id'],f't{i}')
            ask(self.engine,run['id'],f't{i}',claim['token'],'Question '+str(i)+' '+ 'x'*11000)
        seen=[];after=0
        while True:
            page=request(self.engine,{'action':'run.get','run':run['id'],'after':after})
            self.assertLess(len(json.dumps(page)),2_000_000)
            self.assertLessEqual(len(page['events']),100)
            seen.extend(page['events'])
            if page['events_next'] is None:break
            after=page['events_next']
        self.assertEqual([e['seq'] for e in seen],[e['seq'] for e in self.engine.events(run['id'])])
        self.assertEqual(sum(e['type']=='question' for e in seen),110)

    def test_conversation_focus_distinguishes_ready_running_question_and_failed_contract(self):
        from workflow_engine.projections import summary
        from workflow_engine.conversations import ask
        run=self.engine.start(self.project['id'],graph([task(validation='contract',outputs={'verdict':'string'})]))
        self.assertEqual(summary(run)['focus']['status'],'ready')
        claim=self.engine.claim(run['id'],'work')
        self.assertEqual(summary(claim['run'])['focus']['status'],'running')
        run=ask(self.engine,run['id'],'work',claim['token'],'Which criterion?')
        self.assertEqual(summary(run)['focus']['status'],'waiting_input')
        from workflow_engine.conversations import answer
        answer(self.engine,run['id'],'work',run['nodes']['work']['question']['id'],'Expected business result')
        claim=self.engine.claim(run['id'],'work')
        run=self.engine.submit(run['id'],'work',claim['token'],{'ok':True,'summary':'Malformed provider output','outputs':[]})
        self.assertEqual(summary(run)['focus']['status'],'failed')
        self.assertEqual(summary(run)['focus']['node'],'work')

    def test_four_support_requests_keep_sources_question_scope_and_release_dependencies(self):
        from workflow_engine.conversations import ask,answer
        sources=Path(self.project['path'])/'sources';sources.mkdir()
        (sources/'message.eml').write_text('Subject: Synthetic support observations\n\nFour observations only.\n')
        for i in range(6):(sources/f'observation-{i+1}.txt').write_text('Synthetic observation, not a diagnosis or a passed QA test.\n')
        g=graph([task('plan',outputs={'plan':'string'},validation='contract'),task('diagnosis',inputs={'plan':'string'},outputs={'finding':'string'},validation='contract'),task('correction',inputs={'finding':'string'},outputs={'change':'string'},validation='contract'),task('qa',inputs={'change':'string'},evidence_required=True,criteria=['Synthetic workflow receipt'])], [
            {'id':'p','from':'plan','to':'diagnosis','mapping':{'plan':'plan'}},
            {'id':'d','from':'diagnosis','to':'correction','mapping':{'finding':'finding'}},
            {'id':'q','from':'correction','to':'qa','mapping':{'change':'change'}},
        ])
        service=Conversations(self.engine);c=service.open(self.project['id'],g,'codex')
        needs=[('R1','Conflicting distance rule; quote calculation; full analysis, not Express',[1,2]),('R2','Project created from quote has wrong state and menu',[3]),('R3','Planning empty despite milestone rules',[4,5]),('R4','Manual amount does not recalculate quote subtotal; not Express',[6])]
        items=[]
        for key,description,pieces in needs:
            links='sources/message.eml '+ ' '.join(f'sources/observation-{n}.txt' for n in pieces)
            item=service.add(c['id'],f'{key}: {description}\nObservations: {links}',key=key);items.append(item)
            run=self.done(self.engine.run(item['run']),'plan',{'plan':f'{key}: qualify observations before cause; preserve {links}'})
            self.assertNotIn('Synthetic support observations',json.dumps(run))
        first=items[0]
        claim=self.engine.claim(first['run'],'diagnosis');asked=ask(self.engine,first['run'],'diagnosis',claim['token'],'Which business rule is intended for the distance factor?')
        question=asked['nodes']['diagnosis']['question']
        self.assertEqual(request(self.engine,{'action':'runtime.tick'})['counts']['waiting_input'],1)
        def complete_analysis_and_fix(item):
            run=self.done(self.engine.run(item['run']),'diagnosis',{'finding':'Synthetic diagnosis result; client observations alone do not prove the cause.'})
            return self.done(run,'correction',{'change':'Synthetic correction proposal, QA still required.'})
        def submit_qa(item):
            claim=self.engine.claim(item['run'],'qa')
            return self.engine.submit(item['run'],'qa',claim['token'],{'ok':True,'summary':'Synthetic workflow check, not an Odoo test.','outputs':{},'evidence':[self.engine.artifact(b'Only synthetic orchestration checked.')]})
        for item in items[1:]:
            complete_analysis_and_fix(item);submit_qa(item)
            self.engine.accept(item['run'],'qa',human=True,checks=['Synthetic workflow receipt'],note='Synthetic receipt; no client application tested.')
        before=Conversations(Engine(self.temp.name)).snapshot(c['id'])
        self.assertEqual(len(before['items']),4)
        self.assertEqual([i['execution']['status'] for i in before['items']],['active','completed','completed','completed'])
        self.assertTrue(all('sources/message.eml' in i['request'] for i in before['items']))
        # This fifth technical coordination item is not a fifth customer need.
        release=service.add(c['id'],'Technical release consolidation — coordination only, four customer needs above.',key='coordination',depends_on=[i['id'] for i in items])
        self.assertEqual(self.engine.run(release['run'])['status'],'paused')
        answer(self.engine,first['run'],'diagnosis',question['id'],'Synthetic agreed business rule.')
        after=service.snapshot(c['id']);self.assertEqual(len(after['items']),5)
        self.assertEqual(after['items'][0]['execution']['nodes']['diagnosis']['status'],'ready')
        self.assertEqual([i['execution']['status'] for i in after['items'][1:4]],['completed']*3)
        complete_analysis_and_fix(first);submit_qa(first)
        self.assertEqual(service.snapshot(c['id'])['items'][-1]['execution']['status'],'paused')
        report=markdown(self.engine.run(first['run']))
        self.assertIn('sources/message.eml',report);self.assertIn('Synthetic agreed business rule.',report)
        self.assertEqual(self.engine.run(first['run'])['nodes']['qa']['status'],'returned')
        self.engine.accept(first['run'],'qa',human=True,checks=['Synthetic workflow receipt'],note='Synthetic receipt only.')
        self.assertEqual(service.snapshot(c['id'])['items'][-1]['execution']['status'],'active')

    def test_nested_component_rejection_does_not_release_success_path(self):
        child=graph([{'id':'gate','kind':'decision','title':'Autorisation'}],name='child')
        middle=graph([{'id':'nested','kind':'subworkflow','title':'Composant','workflow':'child'}],name='middle')
        parent=graph([{'id':'component','kind':'subworkflow','title':'Composant','workflow':'middle'},task('after')],[{'id':'next','from':'component','to':'after'}])
        run=self.engine.start(self.project['id'],parent,library={'child':child,'middle':middle})
        gate=run['nodes']['component.nested.gate']
        run=self.engine.decide(run['id'],'component.nested.gate',gate['nonce'],gate['proposal'],'reject',human=True)
        self.assertEqual(run['nodes']['after']['status'],'skipped')
        self.assertEqual(run['completion_outcome'],'rejected')

    def test_candidate_requires_agent_qa_same_reference_and_approval(self):
        from connectors.candidates import prepare,capture,apply
        for outcome in ('approve','reject','pending','qa-fail'):
            project=self.engine.create_project('Candidat '+outcome)
            file=Path(project['path'])/'sample.txt';file.write_text('original')
            g=graph([{'id':'build','title':'Build','kind':'agent','execution_mode':'edit','outputs':{'candidate':'object'},'validation':'contract'}, {'id':'qa','title':'QA','kind':'agent','inputs':{'candidate':'object'},'outputs':{'verdict':'string'},'candidate_check':True,'validation':'contract'}, {'id':'review','title':'Revue','kind':'decision'}], [{'id':'qa','from':'build','to':'qa','mapping':{'candidate':'candidate'}},{'id':'review','from':'qa','to':'review'}])
            run=self.engine.start(project['id'],g)
            claim=self.engine.claim(run['id'],'build');prepared=prepare(self.engine,run,Path(self.temp.name)/outcome)
            (prepared['workspace']/'sample.txt').write_text('modified');ref,diff=capture(self.engine,run,prepared)
            run=self.engine.submit(run['id'],'build',claim['token'],{'ok':True,'summary':'Candidat','outputs':{'candidate':ref},'evidence':[ref,diff],'patch':diff})
            with self.assertRaises(ContractError):apply(self.engine,run['id'],'build',ref['sha256'],human=True)
            if outcome=='pending':continue
            claim=self.engine.claim(run['id'],'qa');run=self.engine.submit(run['id'],'qa',claim['token'],{'ok':True,'summary':'QA','outputs':{'verdict':'fail' if outcome=='qa-fail' else 'pass'},'evidence':[self.engine.artifact(b'synthetic QA evidence')]})
            gate=run['nodes']['review'];self.engine.decide(run['id'],'review',gate['nonce'],gate['proposal'],'reject' if outcome=='reject' else 'approve',human=True)
            if outcome=='approve':
                apply(self.engine,run['id'],'build',ref['sha256'],human=True);self.assertEqual(file.read_text(),'modified')
            else:
                with self.assertRaises(ContractError):apply(self.engine,run['id'],'build',ref['sha256'],human=True)
                self.assertEqual(file.read_text(),'original')

    def test_candidate_qa_selected_branch_and_explicit_controls(self):
        from connectors.candidates import prepare, capture, apply
        for scenario in ('short', 'full', 'no-proof', 'reject', 'explicit-skipped', 'no-qa'):
            with self.subTest(scenario=scenario):
                project = self.engine.create_project('Branch QA ' + scenario)
                original = Path(project['path']) / 'sample.txt'
                original.write_text('original')
                build = {'id': 'build', 'title': 'Build', 'kind': 'agent', 'execution_mode': 'edit',
                         'outputs': {'candidate': 'object', 'path': 'string'}, 'route_output': 'path',
                         'options': ['short', 'full', 'none'], 'validation': 'contract'}
                if scenario == 'explicit-skipped':
                    build['application_requires'] = ['qa-full']
                nodes = [build] + [task('qa-' + path, inputs={'candidate': 'object'}, outputs={'verdict':'string'}, candidate_check=True, validation='contract') for path in ('short', 'full')]
                nodes += [{'id': 'review', 'title': 'Final review', 'kind': 'decision'}]
                edges = [{'id': path, 'from': 'build', 'to': 'qa-' + path, 'outcome': path, 'mapping': {'candidate': 'candidate'}} for path in ('short', 'full')]
                edges += [{'id': 'review-' + path, 'from': 'qa-' + path, 'to': 'review'} for path in ('short', 'full')]
                run = self.engine.start(project['id'], graph(nodes, edges))
                claim = self.engine.claim(run['id'], 'build')
                prepared = prepare(self.engine, run, Path(self.temp.name) / scenario)
                (prepared['workspace'] / 'sample.txt').write_text('modified')
                reference, diff = capture(self.engine, run, prepared)
                path = 'full' if scenario == 'full' else 'none' if scenario == 'no-qa' else 'short'
                run = self.engine.submit(run['id'], 'build', claim['token'], {'ok': True, 'summary': 'Candidate',
                    'outputs': {'candidate': reference, 'path': path}, 'evidence': [reference, diff], 'patch': diff})
                if path != 'none':
                    qa = 'qa-' + path
                    claim = self.engine.claim(run['id'], qa)
                    run = self.engine.submit(run['id'], qa, claim['token'], {'ok': True, 'summary': 'Selected QA',
                        'outputs': {'verdict': 'pass'}, 'evidence': [] if scenario == 'no-proof' else [self.engine.artifact(b'Selected candidate checked')]})
                    gate = run['nodes']['review']
                    run = self.engine.decide(run['id'], 'review', gate['nonce'], gate['proposal'], 'reject' if scenario == 'reject' else 'approve', human=True)
                    self.assertEqual(run['nodes']['qa-' + ('short' if path == 'full' else 'full')]['status'], 'skipped')
                self.assertEqual(run['status'], 'completed')
                if scenario in {'short', 'full'}:
                    apply(self.engine, run['id'], 'build', reference['sha256'], human=True)
                    self.assertEqual(original.read_text(), 'modified')
                else:
                    with self.assertRaises(ContractError):
                        apply(self.engine, run['id'], 'build', reference['sha256'], human=True)
                    self.assertEqual(original.read_text(), 'original')

    def test_candidate_checks_are_explicit_composable_and_not_documentary(self):
        from connectors.candidates import prepare, capture, apply
        for scenario in ('nested', 'join', 'document', 'no-verdict', 'unmarked'):
            with self.subTest(scenario=scenario):
                project = self.engine.create_project('Explicit QA ' + scenario)
                original = Path(project['path']) / 'source.txt'; original.write_text('before')
                build = {'id':'build','title':'Build','kind':'agent','execution_mode':'edit','outputs':{'candidate':'object'},'validation':'contract'}
                qa = task('qa', inputs={'candidate':'object'}, outputs={'verdict':'string'}, candidate_check=True, validation='contract')
                nodes = [build, qa]
                edges = [{'id':'qa','from':'build','to':'qa','mapping':{'candidate':'candidate'}}]
                if scenario == 'document':
                    nodes[1] = {'id':'qa','title':'Changelog only, no tests','kind':'document','inputs':{'candidate':'object'},'validation':'contract'}
                if scenario == 'unmarked':
                    nodes[1].pop('candidate_check')
                if scenario == 'join':
                    nodes.append({'id':'copy','title':'Transfer only','kind':'join','inputs':{'candidate':'object'},'outputs':{'candidate':'object'}})
                    edges.append({'id':'copy','from':'build','to':'copy','mapping':{'candidate':'candidate'}})
                library = {}; prefix = ''; g = graph(nodes, edges, 'child')
                if scenario == 'nested':
                    build['application_requires'] = ['qa']
                    middle = graph([{'id':'inner','title':'Inner','kind':'subworkflow','workflow':'child'}], name='middle')
                    library = {'child':g,'middle':middle}
                    g = graph([{'id':'outer','title':'Outer','kind':'subworkflow','workflow':'middle'}])
                    prefix = 'outer.inner.'
                run = self.engine.start(project['id'], g, library=library)
                if prefix:
                    self.assertEqual(next(n for n in run['definition']['nodes'] if n['id']==prefix+'build')['application_requires'], [prefix+'qa'])
                claim = self.engine.claim(run['id'], prefix+'build')
                prepared = prepare(self.engine, run, Path(self.temp.name)/scenario)
                (prepared['workspace']/'source.txt').write_text('after')
                reference, diff = capture(self.engine, run, prepared)
                self.engine.submit(run['id'], prefix+'build', claim['token'], {'ok':True,'summary':'Code proposed','outputs':{'candidate':reference},'evidence':[reference,diff],'patch':diff})
                claim = self.engine.claim(run['id'], prefix+'qa')
                outputs = {} if scenario in {'document','no-verdict'} else {'verdict':'pass'}
                self.engine.submit(run['id'], prefix+'qa', claim['token'], {'ok':True,'summary':'Synthetic result','outputs':outputs,'evidence':[self.engine.artifact(b'Synthetic check or document')]})
                if scenario in {'nested','join'}:
                    apply(self.engine, run['id'], prefix+'build', reference['sha256'], human=True)
                    self.assertEqual(original.read_text(), 'after')
                else:
                    with self.assertRaises(ContractError):
                        apply(self.engine, run['id'], prefix+'build', reference['sha256'], human=True)
                    self.assertEqual(original.read_text(), 'before')
        invalid = task('fake', kind='document', candidate_check=True, inputs={'candidate':'object'}, outputs={'verdict':'string'})
        with self.assertRaises(ContractError):self.engine.start(self.project['id'], graph([invalid]))

    def test_failed_branch_keeps_independent_question_actionable(self):
        from workflow_engine.conversations import ask
        from workflow_engine.projections import focus
        run = self.engine.start(self.project['id'], graph([task('qa',validation='contract'),task('clarify')]))
        run = self.done(run, 'qa', {'verdict':'fail'})
        claim = self.engine.claim(run['id'], 'clarify')
        run = ask(self.engine, run['id'], 'clarify', claim['token'], 'Which business rule?')
        selected = focus(run)
        self.assertEqual(selected['node'],'clarify');self.assertEqual(selected['status'],'failed')
        self.assertIn('Répondre',selected['action']);self.assertIn('échec',selected['action'])

    def test_native_ready_pages_share_context_and_mutations_use_readable_references(self):
        from workflow_cli import request as native
        service = Conversations(self.engine)
        c = service.open(self.project['id'],graph([task(f'work{i}',validation='contract') for i in range(100)]),'codex')
        source = 'Request contents '+ 'x'*90000
        item = service.add(c['id'],source,key='heavy')
        ids=[];offset=0
        while True:
            page=native(self.engine,c['id'],'ready',{'run':item['run'],'offset':offset})
            self.assertLess(len(json.dumps(page).encode()),200000)
            self.assertEqual(page['total'],100);self.assertLessEqual(len(page['items']),25)
            ids += [row['node']['id'] for row in page['items']]
            self.assertTrue(all('parameters' not in row for row in page['items']))
            if page['next'] is None:break
            offset=page['next']
        self.assertEqual(len(set(ids)),100)
        sha=page['parameters']['request']['$artifact']['sha256'];read='';offset=0
        while True:
            part=native(self.engine,c['id'],'read',{'run':item['run'],'sha256':sha,'offset':offset});read+=part['text']
            if part['next'] is None:break
            offset=part['next']
        self.assertEqual(read,source)
        claim=native(self.engine,c['id'],'claim',{'run':item['run'],'node':ids[0]})
        self.assertLess(len(json.dumps(claim).encode()),200000)
        result=native(self.engine,c['id'],'result',{'run':item['run'],'node':ids[0],'token':claim['token'],'result':{'ok':True,'summary':'Large result','outputs':{'text':'y'*1000000}}})
        self.assertLess(len(json.dumps(result).encode()),200000)
        proof=result['nodes'][ids[0]]['result']['outputs']['$artifact']
        self.assertIn('yyyy',native(self.engine,c['id'],'read',{'run':item['run'],'sha256':proof['sha256']})['text'])
        with self.assertRaises(ContractError):native(self.engine,c['id'],'ready',{'run':item['run'],'offset':-1})

    def test_native_task_qa_materializes_exact_candidate_without_touching_original(self):
        from connectors.candidates import prepare, capture
        from workflow_cli import request as native
        original=Path(self.project['path'])/'sample.txt';original.write_text('before')
        g=graph([{'id':'build','title':'Build','kind':'agent','execution_mode':'edit','outputs':{'candidate':'object'},'validation':'contract'},task('qa',inputs={'candidate':'object'},outputs={'verdict':'string'},candidate_check=True,validation='contract')],[{'id':'qa','from':'build','to':'qa','mapping':{'candidate':'candidate'}}])
        service=Conversations(self.engine);c=service.open(self.project['id'],g,'codex',model='fixture');item=service.add(c['id'],'Verify the actual copy')
        run=self.engine.run(item['run']);claim=self.engine.claim(run['id'],'build')
        job=prepare(self.engine,run,Path(self.temp.name)/'prepared');(job['workspace']/'sample.txt').write_text('after')
        reference,diff=capture(self.engine,run,job)
        self.engine.submit(run['id'],'build',claim['token'],{'ok':True,'summary':'Candidate','outputs':{'candidate':reference},'evidence':[reference,diff],'patch':diff})
        claim=native(self.engine,c['id'],'claim',{'run':run['id'],'node':'qa'})
        with self.assertRaises(ContractError):native(self.engine,c['id'],'prepare-candidate',{'run':run['id'],'node':'qa','token':'wrong'})
        prepared=native(self.engine,c['id'],'prepare-candidate',{'run':run['id'],'node':'qa','token':claim['token']})
        self.assertEqual((Path(prepared['path'])/'sample.txt').read_text(),'after')
        self.assertEqual(original.read_text(),'before')
        self.assertEqual(prepared['candidate'],reference)

    def test_three_way_conflict_keeps_both_changes_and_rechecks_file(self):
        from workflow_engine.conflicts import inspect,resolve
        saved=self.engine.save(self.project['id'],graph([task()]))
        mine=json.loads(json.dumps(saved));mine['nodes'][0]['title']='Edited in form'
        disk=json.loads(json.dumps(saved));disk['description']='Edited in terminal'
        path=self.engine.workflow_path(self.project['id'],saved['id']);path.write_text(json.dumps(disk))
        preview=inspect(self.engine,self.project['id'],mine,saved['revision'])
        self.assertEqual(preview['conflicts'],[])
        result=resolve(self.engine,self.project['id'],mine,saved['revision'],preview['digest'],'merge')
        self.assertEqual(result['nodes'][0]['title'],'Edited in form');self.assertEqual(result['description'],'Edited in terminal')
        mine=json.loads(json.dumps(result));mine['nodes'][0]['title']='Mine'
        disk=json.loads(json.dumps(result));disk['nodes'][0]['title']='Disk';path.write_text(json.dumps(disk))
        preview=inspect(self.engine,self.project['id'],mine,result['revision'])
        self.assertEqual(preview['conflicts'][0]['path'],'/nodes/work/title')
        with self.assertRaises(ContractError):resolve(self.engine,self.project['id'],mine,result['revision'],preview['digest'],'merge')
        restored=resolve(self.engine,self.project['id'],mine,result['revision'],preview['digest'],'merge',{'/nodes/work/title':'disk'})
        self.assertEqual(restored['nodes'][0]['title'],'Disk')
        path.write_text('{invalid')
        preview=inspect(self.engine,self.project['id'],mine,result['revision'])
        copied=resolve(self.engine,self.project['id'],mine,result['revision'],preview['digest'],'copy')
        self.assertNotEqual(copied['id'],saved['id']);self.assertEqual(path.read_text(),'{invalid')

    def test_archival_is_reversible_preserves_proofs_and_refuses_active_work(self):
        from workflow_engine.lifecycle import archive
        g=graph([task(validation='contract')]);saved=self.engine.save(self.project['id'],g)
        run=self.engine.start(self.project['id'],saved)
        with self.assertRaises(ContractError):archive(self.engine,'run',run['id'],True,human=True)
        run=self.done(run,'work',{})
        archive(self.engine,'run',run['id'],True,human=True)
        self.assertEqual(request(self.engine,{'action':'run.list','project':self.project['id']})['total'],0)
        self.assertEqual(request(self.engine,{'action':'run.list','project':self.project['id'],'archived':True})['total'],1)
        archive(self.engine,'run',run['id'],False,human=True)
        archive(self.engine,'workflow',saved['id'],True,project=self.project['id'],human=True)
        self.assertEqual(self.engine.run(run['id'])['definition'],run['definition'])
        archive(self.engine,'workflow',saved['id'],False,project=self.project['id'],human=True)
        self.assertFalse(self.engine.workflows(self.project['id'])[0]['archived'])

    def test_thousand_demands_search_and_last_page(self):
        service=Conversations(self.engine);c=service.open(self.project['id'],graph([task()]),'codex')
        for i in range(1000):service.add(c['id'],f'Demande {i:04}',key=str(i))
        page=request(self.engine,{'action':'conversation.get','conversation':c['id'],'offset':975})
        self.assertEqual(page['item_count'],1000);self.assertEqual(page['items'][-1]['request'],'Demande 0999');self.assertIsNone(page['next'])
        found=request(self.engine,{'action':'run.list','project':self.project['id'],'query':'Demande 0999'})
        self.assertEqual(found['total'],1)
        tick=request(self.engine,{'action':'runtime.tick'})
        self.assertEqual(tick['total'],1000);self.assertLess(len(json.dumps(tick)),100000)

    def test_automatic_text_mode_cannot_claim_editing_or_tests(self):
        from workflow_engine.runtime import preflight
        from workflow_engine.work_templates import templates
        for g in templates():
            if g['id'] not in {'release-conversation','express-conversation'}:continue
            g['defaults']={'provider':'codex','model':'fixture','session':'delegated'}
            auto=preflight(g,project=self.project,engine=self.engine)
            self.assertTrue(any('Capacités requises' in i['message'] for i in auto))
            for provider in ('codex','claude'):
                g['defaults']['provider']=provider
                native=preflight(g,project=self.project,engine=self.engine,mode='native',provider=provider,model='fixture')
                self.assertEqual(native,[])

if __name__=='__main__':unittest.main()
