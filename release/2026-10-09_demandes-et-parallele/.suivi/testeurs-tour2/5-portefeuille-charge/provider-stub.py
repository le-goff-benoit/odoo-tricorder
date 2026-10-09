#!/usr/bin/python3
"""Local CLI fixture. No network/account/service access; controlled completion."""
import json
import os
import sys
import time
from pathlib import Path

provider = Path(sys.argv[0]).name
marker = 'PORTEFEUILLE-CHARGE-STUB-' + provider.upper()
if '--version' in sys.argv or '-v' in sys.argv:
    print(marker + ' 1.0-local', flush=True)
    raise SystemExit(0)
root = Path(os.environ['TRICORDER_FIXTURE_CONTROL'])
root.mkdir(parents=True, exist_ok=True)
worker = 'exec' in sys.argv or '--output-format' in sys.argv or '-p' in sys.argv or '--print' in sys.argv
pid = os.getpid()
def record(kind, **details):
    with (root / 'events.jsonl').open('a') as handle:
        handle.write(json.dumps({'at': time.time(), 'pid': pid, 'provider': provider, 'kind': kind, **details}) + '\n')
record('worker-start' if worker else 'coordinator-start')
(root / ('pid-' + str(pid))).write_text(provider)
if not worker:
    print(marker + ' COORDINATEUR LOCAL PRÊT', flush=True)
    for line in sys.stdin:
        print(marker + ' REÇU: ' + line.strip(), flush=True)
    record('coordinator-end')
    raise SystemExit(0)
if (root / ('unavailable-' + provider)).exists():
    print(marker + ' RESSOURCE LOCALE INDISPONIBLE', file=sys.stderr, flush=True)
    record('worker-unavailable')
    raise SystemExit(78)
if provider == 'codex':
    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = None
    print(json.dumps({'type': 'thread.started', 'thread_id': 'local-' + str(pid)}), flush=True)
else:
    print(json.dumps({'type': 'system', 'subtype': 'init', 'session_id': 'local-' + str(pid)}), flush=True)
# A GUI tester explicitly releases local worker(s); no artificial workflow state edit.
deadline = time.monotonic() + 180
while not (root / 'release-all').exists() and not (root / ('release-' + str(pid))).exists():
    if (root / ('fail-' + str(pid))).exists():
        record('worker-failed')
        print(marker + ' ÉCHEC LOCAL DEMANDÉ', file=sys.stderr, flush=True)
        raise SystemExit(75)
    if time.monotonic() > deadline:
        record('worker-timeout')
        raise SystemExit(74)
    time.sleep(.15)
result = {'summary': 'Analyse synthétique terminée par le worker local ' + str(pid), 'question': '', 'outputs': {'result': 'Résultat synthétique vérifiable ; aucune donnée réelle.'}}
if provider == 'codex':
    print(json.dumps({'type': 'item.completed', 'item': {'type': 'agent_message', 'text': json.dumps(result)}}), flush=True)
    print(json.dumps({'type': 'turn.completed', 'usage': {'input_tokens': 1, 'output_tokens': 1}}), flush=True)
else:
    print(json.dumps({'type': 'result', 'subtype': 'success', 'is_error': False, 'result': json.dumps(result), 'usage': {'input_tokens': 1, 'output_tokens': 1}}), flush=True)
record('worker-completed')
