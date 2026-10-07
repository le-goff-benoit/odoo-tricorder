"""Read-only project knowledge through the installed canonical Crew validator."""
from pathlib import Path
from contextlib import contextmanager
from copy import deepcopy
import json


@contextmanager
def validation_session():
    """Use Crew's public per-read cache; older releases remain readable."""
    from catalog import trusted_module
    try:
        module = trusted_module('odoo_pilotage')
    except (ImportError, FileNotFoundError, ValueError):
        yield
        return
    with module.read_session():
        yield


def snapshot(root, release=None):
    from catalog import trusted_module
    try:
        with validation_session():
            result = trusted_module('odoo_knowledge').snapshot(Path(root).resolve(), release)
        try:
            result['feedback'] = trusted_module('odoo_feedback').snapshot(Path(root).resolve(), release)
        except Exception as exc:
            result['feedback'] = {'pending': 0, 'events': [], 'warnings': ['Retours non disponibles : ' + str(exc)]}
        return {**result, 'available': True}
    except Exception as exc:
        return {'available': False, 'decisions': [], 'documents': [], 'contributions': [],
                'receipts': [], 'warnings': ['Mémoire non vérifiée : ' + str(exc)]}
