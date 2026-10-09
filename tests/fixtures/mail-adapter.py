#!/usr/bin/python3
"""Read-only synthetic mail search/read transport, never a remote connector."""
import json
from pathlib import Path
import sys

root = Path(__file__).parent
config = json.loads((root / 'mail-fixture.json').read_text())
action = sys.argv[1]
assert action in {'search', 'read'}, 'No publication or deployment operation exists'
with (root / 'mail-calls.jsonl').open('a') as log:
    log.write(json.dumps({'action': action, 'argument': sys.argv[2]}) + '\n')
if action == 'search':
    print(json.dumps([{'id': 'synthetic-message', 'subject': 'Four synthetic support observations'}] * (2 if config.get('ambiguous') else 1)))
else:
    assert sys.argv[2] == 'synthetic-message'
    print(json.dumps({'path': str(root / 'source.eml')}))
