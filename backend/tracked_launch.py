#!/usr/bin/env python3
"""Record a worker child before it can execute an effectful command."""
import os
import sys
from workflow_engine import Engine

if __name__ == '__main__':
    state, run, node, token, *argv = sys.argv[1:]
    engine = Engine(state)
    engine.heartbeat(run, node, token, os.getpid())
    if engine.run(run)['status'] == 'cancelled':
        sys.exit('Exécution annulée avant lancement')
    os.execvp(argv[0], argv)
