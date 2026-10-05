"""Read-only project knowledge through the installed canonical Crew validator."""
from pathlib import Path
from contextlib import contextmanager
from copy import deepcopy
import json


@contextmanager
def validation_session():
    """Share canonical plan verdicts within one read, never across refreshes.

    Crew validates the whole plan for each accepted implementation contribution.
    The reader runs in a dedicated, single-threaded Python process; temporarily
    memoizing that read avoids repeating the same evidence checks dozens of times.
    """
    from catalog import trusted_module
    try:
        module = trusted_module('odoo_plan')
    except Exception:
        yield
        return
    original = module.statuses
    cache = {}

    def statuses(plan, project):
        key = (str(Path(project).resolve()), json.dumps(plan, sort_keys=True))
        if key not in cache:
            cache[key] = original(plan, project)
        return deepcopy(cache[key])

    module.statuses = statuses
    try:
        yield
    finally:
        module.statuses = original


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
