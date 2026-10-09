#!/usr/bin/python3
import json,sys,time
p=json.load(sys.stdin)
identity='Atelier Boreal — banc local inerte'
ops={'draft':'write','notify':'notify'}
if p.get('action')=='describe':
 r={'protocol':'tricorder.tool/1','connected':True,'identity':identity,'operations':ops,'tool_digest':'inert-boreal-v1'}
else:
 r={'ok':True,'identity':identity,'outputs':{'brouillon':'TRICORDER-T3-AGENTS-CONNEXIONS-STUB Brouillon local fictif. Aucun message envoye.'},'receipt':{'id':'boreal-local-inert','inert':True}}
print(json.dumps(r))
