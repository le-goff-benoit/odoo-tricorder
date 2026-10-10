exec(open('/tmp/tricorder-personas-produit/01-fondateur/inspect.py').read().split('print(json.dumps')[0])
r=engine.run('rce1d066abe5843c0')
c=engine.claim(r['id'],'plan',executor='native',owner_pid=os.getpid())
result={'ok':True,'summary':'FOURNISSEUR SYNTHÉTIQUE : plan de démonstration, aucune implémentation ni connexion réelle.','outputs':{'plan':{'goal':'Préparer onboarding Atlas (données synthétiques)','criteria':['Référent et source CSV confirmés avant import'],'tasks':[{'id':'cadrage','title':'Confirmer fichier CSV et accès auprès de Claire','scope':'Préparer liste locale de prérequis, sans contact client','criteria':['Liste explicite des accès et source attendue']},{'id':'mail','title':'Préparer brouillon local de mail de lancement','scope':'Rédaction locale seulement','criteria':['Mention des 8 utilisateurs et formation le 20 octobre'],'depends_on':['cadrage']}]}},'evidence':[]}
engine.submit(r['id'],'plan',c['token'],result)
print(json.dumps(result,ensure_ascii=False,indent=2))
