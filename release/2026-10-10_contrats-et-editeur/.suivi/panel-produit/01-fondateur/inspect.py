import os,sys,json
base='/tmp/tricorder-personas-produit/01-fondateur'
os.environ.update(HOME=base+'/home',XDG_CONFIG_HOME=base+'/config',XDG_DATA_HOME=base+'/data',XDG_CACHE_HOME=base+'/cache',TRICORDER_STATE_DIR=base+'/state',TRICORDER_RUNTIME_DIR=base+'/runtime',CODEX_HOME=base+'/codex',CLAUDE_CONFIG_DIR=base+'/claude',TRICORDER_AGENTS_DIR=base+'/absent-pack',PATH=base+'/bin:/usr/bin:/bin',PYTHONDONTWRITEBYTECODE='1')
sys.path.insert(0,'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/resources/backend')
from workflow_engine import Engine
engine=Engine(base+'/state/workflows')
print(json.dumps([{'project':p,'runs':[{'id':r['id'],'request':r.get('parameters'),'nodes':r['nodes'],'definition':r['definition']} for r in engine.runs(p['id'])]} for p in engine.projects()],ensure_ascii=False,indent=2))
