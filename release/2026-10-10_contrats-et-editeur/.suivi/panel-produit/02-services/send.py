import sys,json,pathlib,time
p=pathlib.Path(__file__).parent
ident=str(time.time_ns())
p.joinpath('command.json').write_text(json.dumps({'id':ident,'code':sys.argv[1]}))
for _ in range(200):
 time.sleep(.2)
 try:
  x=json.loads(p.joinpath('result.json').read_text())
  if x['id']==ident:print(json.dumps(x,ensure_ascii=False));break
 except (FileNotFoundError,json.JSONDecodeError):pass
else:print('TIMEOUT')
