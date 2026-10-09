"""Independent processes race on real SQLite/Git state; no model or service."""
import copy,json,multiprocessing,os,sys,tempfile,traceback
from pathlib import Path
from unittest.mock import patch
root=Path(__file__).resolve().parents[3]
sys.path[:0]=[os.environ.get('TRICORDER_REVIEW_BACKEND',str(root/'backend'))]
from workflow_engine import Engine,ContractError
from workflow_engine.projects import initialize
from workflow_engine.setup import configure
from studio import request

def worker(state,entry,pack,method,gate,released,out):
    try:
        engine=Engine(state);original=getattr(engine,method);first=True
        def snapshot(*args,**kwargs):
            nonlocal first
            value=original(*args,**kwargs)
            if first:
                first=False;gate.wait(timeout=10)
                if not released.wait(10):raise AssertionError('Coordinator did not release snapshot')
            return value
        with patch.object(engine,method,snapshot):value=configure(engine,[entry],pack)
        out.put({'ok':True,'result':value})
    except BaseException:out.put({'ok':False,'traceback':traceback.format_exc()})

def race(state,entry,pack,method,interleave=None):
    ctx=multiprocessing.get_context('fork');gate=ctx.Barrier(3);released=ctx.Event();out=ctx.Queue()
    children=[ctx.Process(target=worker,args=(state,entry,pack,method,gate,released,out)) for _ in range(2)]
    for child in children:child.start()
    try:
        gate.wait(timeout=10)
        if interleave:interleave()
        released.set()
        replies=[out.get(timeout=15) for _ in children]
        for reply in replies:assert reply['ok'],reply
        results=[r['result'][0] for r in replies]
        assert all(r['status']=='configured' for r in results),results
        assert len({r['project'] for r in results})==1,results
        return results
    finally:
        released.set()
        for child in children:
            child.join(15)
            if child.is_alive():child.terminate();child.join(5)
        out.close()

def reject(call):
    try:call()
    except (ContractError,OSError) as exc:return str(exc)
    raise AssertionError('Invalid or stale operation accepted')

def main():
    results={}
    with tempfile.TemporaryDirectory(prefix='tricorder-receipt-setup-race-') as t:
        temp=Path(t);state=temp/'state';engine=Engine(state)
        pack=temp/'pack';pack.mkdir();(pack/'roles.md').write_text('Synthetic role; no Odoo execution')
        roles=['odoo-analyst','odoo-developer','odoo-tester','odoo-deployer','odoo-support','odoo-studio']
        (pack/'tricorder-pack.json').write_text(json.dumps({'schema':1,'engine_schema':1,'id':'synthetic','version':'1','profiles':[{'id':r,'source':'roles.md'} for r in roles],'policies':{'domain':'odoo'}}))
        repo=temp/'repo';initialize(repo)
        entry={'path':str(repo),'name':'Catalog title','series':'19.0'}
        registrations=race(state,entry,None,'projects')
        project=engine.project(registrations[0]['project'])
        assert len(engine.projects())==1
        assert engine.create_project('Discarded refresh title',repo,if_absent=True)==project
        alias=temp/'alias';alias.symlink_to(repo,target_is_directory=True)
        assert engine.create_project('Alias refresh title',alias,if_absent=True)==project
        reject(lambda:engine.create_project('Manual duplicate',repo))
        reject(lambda:request(engine,{'action':'project.create','title':'Manual via API','path':str(repo),'if_absent':True}))
        reject(lambda:engine.create_project(' ',repo,if_absent=True))
        reject(lambda:engine.create_project('Missing path',if_absent=True))
        results['two_process_project_registration_unique_and_manual_strict']='pass'
        workflows=race(state,entry,str(pack),'workflows')
        definitions=engine.workflows(project['id'])
        assert len(definitions)==2 and all(g['revision']==1 for g in definitions)
        with engine.store.connect() as db:
            assert db.execute('SELECT COUNT(*) FROM workflows WHERE project=?',(project['id'],)).fetchone()[0]==2
        for graph in definitions:assert json.loads(engine.workflow_path(project['id'],graph['id']).read_text())==graph
        assert len(engine.project(project['id'])['packs'])==1 and engine.runs(project['id'])==[]
        results['two_process_template_setup_one_revision_each']='pass'

        repo2=temp/'custom-repo';initialize(repo2);custom_project=engine.create_project('User title',repo2)
        entry2={'path':str(repo2),'name':'Catalog must not rename','series':'19.0'}
        expected={}
        def user_saves_after_both_empty_snapshots():
            graph={'schema':1,'id':'odoo-release-conversation','title':'User revision one','nodes':[{'id':'task','title':'Keep my task','kind':'task'}],'edges':[]}
            first=engine.save(custom_project['id'],graph)
            run=engine.start(custom_project['id'],first,simulation=True)
            graph['title']='User revision two';second=engine.save(custom_project['id'],graph,first['revision'])
            disk=engine.workflow_path(custom_project['id'],graph['id']);external={**second,'title':'Unimported terminal change'}
            disk.write_text(json.dumps(external)+'\n')
            guidance=repo2/'.tricorder/AGENTS.md';guidance.write_text('User custom guidance\n')
            expected.update(first=first,second=second,run=run,disk=disk,bytes=disk.read_bytes(),guidance=guidance)
        race(state,entry2,str(pack),'workflows',user_saves_after_both_empty_snapshots)
        second=expected['second'];stored=next(g for g in engine.workflows(custom_project['id']) if g['id']==second['id'])
        assert stored==second and expected['disk'].read_bytes()==expected['bytes']
        assert engine.run(expected['run']['id'])==expected['run']
        assert expected['guidance'].read_text()=='User custom guidance\n'
        assert engine.project(custom_project['id'])['title']=='User title'
        assert engine.save(custom_project['id'],{**second,'title':'Ignored setup input'},if_absent=True)==second
        reject(lambda:engine.save(custom_project['id'],second,expected['first']['revision']))
        reject(lambda:request(engine,{'action':'workflow.save','project':custom_project['id'],'graph':second,'revision':0,'if_absent':True}))
        disk_error=reject(lambda:request(engine,{'action':'workflow.save','project':custom_project['id'],'graph':second,'revision':second['revision'],'if_absent':True}))
        assert 'fichier' in disk_error,disk_error
        reject(lambda:engine.save(custom_project['id'],second,1,if_absent=True))
        reject(lambda:engine.save(custom_project['id'],second,from_disk=True,if_absent=True))
        reject(lambda:engine.save(custom_project['id'],second,expected_disk='unexpected',if_absent=True))
        malformed=copy.deepcopy(second);malformed['nodes']=[]
        reject(lambda:engine.save(custom_project['id'],malformed,if_absent=True))
        with engine.store.connect() as db:
            revisions=[row[0] for row in db.execute('SELECT revision FROM workflows WHERE project=? AND id=? ORDER BY revision',(custom_project['id'],second['id']))]
        assert revisions==[1,2],revisions
        assert expected['disk'].read_bytes()==expected['bytes'] and engine.run(expected['run']['id'])==expected['run']
        results['two_stale_setup_processes_preserve_interleaved_user_revisions_disk_guidance_run']='pass'
        results['internal_options_cannot_weaken_public_save_or_validation']='pass'
        results['explicit_save_dirty_disk_refusal']=disk_error

        bad=temp/'not-git';bad.mkdir()
        invalid=configure(engine,[{'path':str(bad),'name':'Invalid'}]);assert invalid[0]['status']=='unavailable'
        library=engine.library_project();reject(lambda:engine.create_project('Must not reuse library',library['path'],if_absent=True))
        assert engine.project('library')==library
        assert not (state/'jobs').exists()
        results['invalid_repository_and_internal_library_still_refused']='pass'
        results['model_or_service_calls']=0
    print(json.dumps(results,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
