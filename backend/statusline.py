"""Collect only quota numbers, then preserve the user's existing status line."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

from quotas import normalize


def collect(target, payload):
    value = normalize('claude', payload)
    folder = Path(target).parent
    descriptor, temporary = tempfile.mkstemp(prefix='.quota-', dir=folder)
    try:
        with os.fdopen(descriptor, 'w') as stream:
            json.dump(value, stream)
        os.replace(temporary, target)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return value


def main():
    raw = sys.stdin.buffer.read(1024 * 1024 + 1)
    if len(raw) > 1024 * 1024:
        return
    try:
        value = collect(sys.argv[1], json.loads(raw))
    except (ValueError, OSError, TypeError):
        value = None
    # This command is the existing user's statusLine, captured at launch, never
    # supplied by renderer or native payload. Its stdin and stdout stay intact.
    command = sys.argv[2] if len(sys.argv) > 2 else ''
    if command:
        try:
            subprocess.run(command, input=raw, shell=True, timeout=4, check=False)
        except (OSError, subprocess.TimeoutExpired):
            pass
    elif value:
        parts = [f"{w['label']} : {w['usedPercent']:g} %" for w in value['windows'] if w['usedPercent'] is not None]
        print(' · '.join(parts) or 'Quotas non disponibles')


if __name__ == '__main__':
    main()
