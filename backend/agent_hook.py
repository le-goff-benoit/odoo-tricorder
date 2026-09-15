"""Invocation-scoped native hook. Metadata only; never blocks or approves."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import sys
import time

from observation import claude_hook, identifier, iso


def record(target, row):
    value = claude_hook(row)
    if not value or not value['nativeId'] or not identifier(row.get('session_id')):
        return
    value['rootId'] = row['session_id']
    value['model'] = identifier(row.get('model'))
    value['role'] = identifier(row.get('agent_type'))
    correlation = row.get('tool_use_id') or row.get('turn_id')
    if identifier(correlation):
        value['eventId'] = hashlib.sha256(json.dumps([value['rootId'], value['nativeId'], value['kind'], correlation]).encode()).hexdigest()
    # Only the main transcript is used for usage; child work is not silently added.
    source = row.get('transcript_path')
    if not row.get('agent_id') and isinstance(source, str) and Path(source).is_absolute() and Path(source).suffix == '.jsonl':
        value['usageSource'] = source
    fd = os.open(target, os.O_WRONLY | os.O_APPEND | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'a') as stream:
        fcntl.flock(stream, fcntl.LOCK_EX)
        os.fchmod(stream.fileno(), 0o600)
        if os.fstat(stream.fileno()).st_size >= 64 * 1024 * 1024:
            return
        value['at'] = iso(time.time())
        stream.write(json.dumps(value) + '\n')


if __name__ == '__main__':
    try:
        raw = sys.stdin.buffer.read(1024 * 1024 + 1)
        if len(raw) <= 1024 * 1024:
            record(sys.argv[1], json.loads(raw))
    except Exception:
        pass  # Observability failure must never interrupt the user's agent.
