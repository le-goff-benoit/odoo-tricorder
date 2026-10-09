#!/usr/bin/python3
# Exécuté uniquement avec le backend extrait du paquet autorisé.
import sys,json,copy
from pathlib import Path
backend=Path(sys.argv[1]); out=Path(__file__).parent
sys.path.insert(0,str(backend))
from workflow_engine import Engine,validate
from workflow_engine.library import node,edge
from workflow_engine.packs import install,inspect_pack
b=json.loads((out/'banc.json').read_text()); root=Path(b['temporaryRoot'])
e=Engine(root/'state'/'workflows')
p=e.create_project('Procédures Achats et RH')
g={'schema':1,'id':'achats','title':'Référencement fournisseur achats','description':'Procédure achats version un','defaults':{'provider':'codex','model':'modele-test-v1','effort':'medium'},'nodes':[
node('besoin','Préciser le besoin achats','question',question='Quel plafond budgétaire confirmer pour le dossier ACH-042 ?',outputs={'answer':'string'}),
node('analyse','Comparer les offres','agent',x=380,prompt='Comparer deux offres selon le coût total, délai et garantie.',inputs={'budget':'string'},outputs={'synthese':'string'},criteria=['Coût total, délai et garantie explicités.'])],
'edges':[{**edge('besoin','analyse'),'mapping':{'answer':'budget'}}]}
validate(g);g=e.save(p['id'],g);r=e.start(p['id'],g,parameters={'request':'ACH-042 — choisir une offre pour les écrans'})
h=copy.deepcopy(g);h.update(id='rh',title='Préparer un accueil RH',description='Accueil RH version un');h.pop('revision',None);h['nodes'][0]['question']='Quelle date confirmer pour l’arrivée de Camille ?';h['nodes'][1]['prompt']='Préparer accès, matériel et rencontre avec le tuteur.';h['nodes'][1]['title']='Préparer le parcours RH';h=e.save(p['id'],h)
bad=copy.deepcopy(g);bad.update(id='non-lancable',title='Procédure achats à reconfigurer');bad.pop('revision',None);bad['defaults']['model']='';bad['nodes']=bad['nodes'][1:];bad['nodes'][0]['inputs']={};bad['edges']=[];bad=e.save(p['id'],bad);br=e.start(p['id'],bad,parameters={'request':'ACH-043 — procédure à reconfigurer'})
packpaths=[]
for version,text in [('1.0','Comparer le coût complet et le délai annoncé.'),('2.0','Comparer le coût complet et le délai garanti par écrit.')]:
 folder=root/('pack-achats-'+version);folder.mkdir();(folder/'analyste.md').write_text(text)
 manifest={'schema':1,'engine_schema':1,'id':'proc-achats','title':'Méthodes achats','version':version,'description':'Pack synthétique de méthodes achats','profiles':[{'id':'analyste-achats','title':'Analyste achats','source':'analyste.md'}],'policies':{}}
 (folder/'tricorder-pack.json').write_text(json.dumps(manifest));packpaths.append(str(folder))
(out/'fixtures.json').write_text(json.dumps({'project':p,'workflow':g,'oldRun':r,'rh':h,'badRun':br,'packpaths':packpaths},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'project':p['id'],'oldRun':r['id'],'badRun':br['id']}))
