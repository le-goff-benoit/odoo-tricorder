"""Opt-in read-only client of an existing Codex daemon, via its stdio proxy.

Only initialize, thread/read, parent-filtered thread/list and account quotas are permitted.
No daemon start, resume, turn/start or approval response is ever sent.
"""
import json
import os
import selectors
import subprocess
import time

from observation import identifier, iso


class Reader:
    def __init__(self, process):
        self.process = process
        self.buffer = b''
        self.sequence = 0
        self.selector = selectors.DefaultSelector()
        self.selector.register(process.stdout, selectors.EVENT_READ)

    def request(self, method, params):
        if method not in ('initialize', 'thread/read', 'thread/list', 'account/rateLimits/read'):
            raise ValueError('Méthode Codex refusée')
        self.sequence += 1
        message = {'id': self.sequence, 'method': method, 'params': params}
        self.process.stdin.write((json.dumps(message) + '\n').encode())
        self.process.stdin.flush()
        deadline = time.monotonic() + 5
        consumed = 0
        while time.monotonic() < deadline:
            while b'\n' in self.buffer:
                line, self.buffer = self.buffer.split(b'\n', 1)
                try:
                    value = json.loads(line)
                except ValueError:
                    continue
                if value.get('id') == self.sequence:
                    if value.get('error'):
                        raise ValueError('Lecture Codex non prise en charge par ce service')
                    return value.get('result', {})
                # Notifications, prompts and approval requests are discarded.
            if not self.selector.select(max(0, deadline - time.monotonic())):
                break
            chunk = os.read(self.process.stdout.fileno(), 65536)
            if not chunk:
                break
            consumed += len(chunk)
            if consumed > 4 * 1024 * 1024:
                raise ValueError('Réponse Codex trop volumineuse')
            self.buffer += chunk
        raise ValueError('Service Codex local indisponible ou délai dépassé')

    def close(self):
        self.selector.close()


def agent(thread, parent=None):
    native = identifier(thread.get('id'))
    status = thread.get('status', {})
    if not native or not isinstance(status, dict):
        raise ValueError('Métadonnées de thread non reconnues')
    kind, flags = status.get('type'), status.get('activeFlags', [])
    state = {'notLoaded': 'unknown', 'idle': 'idle', 'systemError': 'interrupted', 'active': 'active'}.get(kind, 'unknown')
    if kind == 'active' and any(flag in ('waitingOnApproval', 'waitingOnUserInput') for flag in flags):
        state = 'waiting_human'
    at = time.time()
    return {'nativeId': native, 'parentId': parent, 'state': state, 'tool': None, 'lastAt': at,
            'stale': state == 'unknown', 'waitingOpen': state == 'waiting_human',
            'events': [{'nativeId': native, 'parentId': parent, 'state': state, 'at': iso(at),
                        'kind': 'thread/read', 'tool': None, 'line': None}], 'basis': 'runtime-read'}


def snapshot(native):
    if not identifier(native):
        raise ValueError('Identifiant Codex invalide')
    proc = subprocess.Popen(['codex', 'app-server', 'proxy'], stdin=subprocess.PIPE,
                            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    reader = Reader(proc)
    try:
        reader.request('initialize', {'clientInfo': {'name': 'odoo_tricorder', 'version': '0.2.0'}, 'capabilities': {'experimentalApi': True}})
        proc.stdin.write(b'{"method":"initialized"}\n'); proc.stdin.flush()
        response = reader.request('thread/read', {'threadId': native, 'includeTurns': False})
        thread = response.get('thread', {})
        if thread.get('id') != native:
            raise ValueError('Identité de thread incohérente')
        agents, warnings = [agent(thread, identifier(thread.get('parentThreadId')))], []
        try:
            children = reader.request('thread/list', {'parentThreadId': native, 'limit': 30})
            for child in children.get('data', [])[:30]:
                if child.get('parentThreadId') == native:
                    agents.append(agent(child, native))
                else:
                    warnings.append('Un résultat sans parent confirmé a été ignoré.')
            if children.get('nextCursor'):
                warnings.append('Plus de 30 sous-agents directs : affichage limité.')
        except ValueError:
            warnings.append('Sous-agents : filtre natif indisponible dans cette version.')
        return {'nativeId': native, 'agents': agents, 'usage': None, 'usageSource': None,
                'waitingSeconds': None, 'waitingIntervals': [], 'observedAt': iso(time.time()),
                'warnings': warnings + ['Statut du service local. Pour les durées et jetons, associer aussi un historique JSONL ; cette lecture de statut n’est jamais comptée comme une mesure.']}
    finally:
        reader.close()
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except subprocess.TimeoutExpired:
            proc.kill(); proc.wait()
        proc.stdin.close(); proc.stdout.close()


def rate_limits():
    """Read the current service account; no login, credentials or model request."""
    proc = subprocess.Popen(['codex', 'app-server', 'proxy'], stdin=subprocess.PIPE,
                            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    reader = Reader(proc)
    try:
        reader.request('initialize', {'clientInfo': {'name': 'odoo_tricorder', 'version': '0.3.0'}})
        proc.stdin.write(b'{"method":"initialized"}\n'); proc.stdin.flush()
        return reader.request('account/rateLimits/read', {})
    finally:
        reader.close()
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except subprocess.TimeoutExpired:
            proc.kill(); proc.wait()
        proc.stdin.close(); proc.stdout.close()
