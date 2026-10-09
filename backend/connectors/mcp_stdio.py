"""Bounded MCP stdio client with explicitly mapped tools and account probes.

No sampling, elicitation, inherited servers or secrets. The trusted server owns
its authentication. Tool annotations never grant permissions.
"""
import json
import os
import selectors
import signal
import subprocess
import time
from workflow_engine.contracts import digest, require

LIMIT = 2_000_000
VERSIONS = {'2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'}


def select(value, path):
    require(isinstance(path, str) and path.startswith('/'), 'Chemin JSON Pointer requis')
    for part in path[1:].split('/'):
        part = part.replace('~1', '/').replace('~0', '~')
        if isinstance(value, list):
            require(part.isdigit() and int(part) < len(value), 'Index de résultat absent')
            value = value[int(part)]
        else:
            require(isinstance(value, dict) and part in value, 'Champ de résultat absent : '+part)
            value = value[part]
    return value


def bind(value, context):
    if isinstance(value, dict):
        if set(value) == {'$ref'}:
            return select(context, value['$ref'])
        return {k: bind(v, context) for k, v in value.items()}
    if isinstance(value, list):
        return [bind(v, context) for v in value]
    return value


def validate_config(config):
    require(isinstance(config.get('identity'), dict) and set(config['identity']) == {'tool', 'arguments', 'path'}, 'MCP : sonde d’identité tool/arguments/path requise')
    require(isinstance(config['identity']['tool'], str) and isinstance(config['identity']['arguments'], dict), 'Sonde MCP invalide')
    require(isinstance(config['identity']['path'], str) and config['identity']['path'].startswith('/'), 'Chemin d’identité requis')
    operations = config.get('operations')
    require(isinstance(operations, dict) and 0 < len(operations) <= 100, 'MCP : opérations explicitement sélectionnées requises')
    for item in operations.values():
        require(isinstance(item, dict) and set(item) <= {'tool', 'effect', 'arguments', 'outputs', 'receipt'}, 'Liaison MCP invalide')
        require(isinstance(item.get('tool'), str) and item.get('effect') in {'read', 'notify', 'write'}, 'Outil et effet MCP requis')
        require(isinstance(item.get('arguments', {}), dict) and isinstance(item.get('outputs', {}), dict), 'Mappage MCP invalide')
        if item['effect'] != 'read':
            require(isinstance(item.get('receipt'), str) and item['receipt'].startswith('/'), 'Chemin de l’accusé distant requis pour une écriture MCP')


class Session:
    def __init__(self, config, check=None, timeout=None):
        self.config, self.check = config, check
        self.deadline = time.monotonic() + (timeout or config.get('timeout', 30))
        self.env = {k: os.environ[k] for k in ('HOME','PATH','LANG','XDG_CONFIG_HOME','XDG_RUNTIME_DIR') if k in os.environ}
        self.buffer = bytearray(); self.total = 0; self.sequence = 0

    def __enter__(self):
        self.process = subprocess.Popen(self.check.launch(self.config['argv']) if self.check and hasattr(self.check, 'launch') else self.config['argv'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, env=self.env, cwd='/', start_new_session=True, close_fds=True)
        self.selector = selectors.DefaultSelector()
        for stream in (self.process.stdin,self.process.stdout):os.set_blocking(stream.fileno(),False)
        self.selector.register(self.process.stdout,selectors.EVENT_READ)
        return self

    def tick(self):
        if self.check:self.check()
        require(time.monotonic() < self.deadline, 'Délai MCP dépassé ; résultat distant à vérifier avant reprise')

    def send(self, message):
        data = json.dumps(message,ensure_ascii=False).encode()+b'\n'
        require(len(data) <= LIMIT, 'Requête MCP trop volumineuse')
        self.selector.register(self.process.stdin,selectors.EVENT_WRITE)
        try:
            while data:
                self.tick()
                for key,_ in self.selector.select(.1):
                    if key.fileobj is self.process.stdin:
                        count=os.write(self.process.stdin.fileno(),data[:65536]);data=data[count:]
                    else:self.read()
        finally:self.selector.unregister(self.process.stdin)

    def read(self):
        chunk=os.read(self.process.stdout.fileno(),65536)
        require(chunk, 'Serveur MCP déconnecté avant sa réponse')
        self.total+=len(chunk)
        require(self.total <= LIMIT, 'Réponse MCP trop volumineuse')
        self.buffer.extend(chunk)

    def rpc(self, method, params=None):
        self.sequence+=1; rid=self.sequence
        self.send({'jsonrpc':'2.0','id':rid,'method':method,'params':params or {}})
        while True:
            self.tick()
            if b'\n' not in self.buffer:
                if self.selector.select(.1):self.read()
                continue
            line,_,self.buffer=self.buffer.partition(b'\n')
            if not line:continue
            message=json.loads(line)
            require(message.get('jsonrpc')=='2.0','Message MCP JSON-RPC invalide')
            if 'method' in message:
                if 'id' in message:
                    reply={'result':{}} if message['method']=='ping' else {'error':{'code':-32601,'message':'Client capability unavailable'}}
                    self.send({'jsonrpc':'2.0','id':message['id'],**reply})
                continue
            require(message.get('id')==rid, 'Réponse MCP sans requête correspondante')
            require('error' not in message, 'Le serveur MCP a refusé la requête')
            require(isinstance(message.get('result'),dict),'Résultat MCP invalide')
            return message['result']

    def initialize(self):
        info=self.rpc('initialize',{'protocolVersion':'2025-11-25','capabilities':{},'clientInfo':{'name':'Tricorder','version':'0.6.0'}})
        require(info.get('protocolVersion') in VERSIONS and 'tools' in info.get('capabilities',{}),'Version ou capacité MCP incompatible')
        self.send({'jsonrpc':'2.0','method':'notifications/initialized'})
        tools={}; cursor=None; seen=set()
        for _ in range(20):
            response=self.rpc('tools/list',{'cursor':cursor} if cursor else {})
            require(isinstance(response.get('tools'),list),'Catalogue MCP absent')
            for tool in response['tools']:
                require(isinstance(tool,dict) and isinstance(tool.get('name'),str) and tool['name'] not in tools,'Outil MCP invalide ou dupliqué')
                tools[tool['name']]=tool
            require(len(tools)<=1000,'Catalogue MCP trop volumineux')
            cursor=response.get('nextCursor')
            if not cursor:return tools
            require(isinstance(cursor,str) and cursor not in seen,'Pagination MCP invalide');seen.add(cursor)
        raise ValueError('Pagination MCP trop longue')

    def call(self, tool, arguments):
        result=self.rpc('tools/call',{'name':tool,'arguments':arguments})
        require(not result.get('isError'), 'L’outil MCP a signalé une erreur')
        if isinstance(result.get('structuredContent'),dict):return result['structuredContent']
        texts=[c.get('text','') for c in result.get('content',[]) if c.get('type')=='text']
        require(len(texts)==1,'Résultat MCP structuré ou texte JSON unique requis')
        value=json.loads(texts[0]);require(isinstance(value,dict),'Objet MCP requis');return value

    def __exit__(self,*exc):
        try:os.killpg(self.process.pid,signal.SIGKILL)
        except ProcessLookupError:pass
        self.process.wait();self.selector.close();self.process.stdin.close();self.process.stdout.close()


def exchange(config, payload, *, check=None, timeout=None):
    validate_config(config)
    with Session(config,check,timeout) as session:
        tools=session.initialize()
        selected={config['identity']['tool'],*(v['tool'] for v in config['operations'].values())}
        require(selected <= tools.keys(),'Outil sélectionné absent du serveur MCP')
        # Identity probe is explicitly approved as a read during qualification.
        probe=config['identity']; identity=select(session.call(probe['tool'],probe['arguments']),probe['path'])
        require(isinstance(identity,str) and 0<len(identity)<=200,'Identité MCP absente')
        signature=digest({name:tools[name] for name in sorted(selected)})
        description={'protocol':'tricorder.tool/1','connected':True,'identity':identity,'operations':{k:v['effect'] for k,v in config['operations'].items()},'tool_digest':signature}
        if payload['action']=='describe':return description
        require(payload.get('expected_identity')==identity,'Compte MCP différent du compte vérifié')
        require(payload.get('expected_tool_digest')==signature,'Outils MCP modifiés depuis la vérification')
        operation=config['operations'][payload['operation']]
        result=session.call(operation['tool'],bind(operation.get('arguments',{}),payload))
        outputs=bind(operation.get('outputs',{}),result)
        response={'ok':True,'identity':identity,'outputs':outputs}
        if operation['effect']!='read':
            receipt=select(result,operation['receipt'])
            require(isinstance(receipt,(str,int)) and not isinstance(receipt,bool) and str(receipt),'Accusé MCP absent')
            response['receipt']={'id':str(receipt)}
        return response
