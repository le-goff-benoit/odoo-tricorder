"""JUnit evidence, per report/run. Never infer passed tests from workflow state."""
from datetime import datetime, timezone
from pathlib import Path
import xml.etree.ElementTree as ET

from catalog import inside, read_text


def junit(root, path, task_ids):
    path = inside(root, path)
    raw = read_text(path, 2 * 1024 * 1024)
    if '<!DOCTYPE' in raw.upper() or '<!ENTITY' in raw.upper():
        raise ValueError('Déclarations XML externes ou entités refusées')
    tree = ET.fromstring(raw)
    if tree.tag not in ('testsuite', 'testsuites'):
        raise ValueError('Ce fichier n’est pas un rapport JUnit')
    cases = list(tree.iter('testcase'))
    if cases:
        failed = sum(c.find('failure') is not None for c in cases)
        errors = sum(c.find('error') is not None for c in cases)
        skipped = sum(c.find('skipped') is not None for c in cases)
        total = len(cases)
        passed = sum(all(c.find(k) is None for k in ('failure', 'error', 'skipped')) for c in cases)
    else:
        # Aggregated counters: use root totals if present, otherwise leaf suites only.
        suites = [tree] if tree.get('tests') is not None else [s for s in tree.iter('testsuite') if s.find('testsuite') is None]
        if not suites or any(s.get('tests') is None for s in suites):
            raise ValueError('Compteurs de tests absents')
        total, failed, errors, skipped = [sum(int(s.get(k, '0')) for s in suites) for k in ('tests', 'failures', 'errors', 'skipped')]
        passed = total - failed - errors - skipped
        if min(total, failed, errors, skipped, passed) < 0:
            raise ValueError('Compteurs de tests incohérents')
    tasks = {p.get('value') for p in tree.iter('property') if p.get('name') in ('odoo.task', 'tricorder.task')}
    task = next(iter(tasks)) if len(tasks) == 1 and tasks <= set(task_ids) else None
    return {'path': str(path.relative_to(root)), 'name': path.name, 'task': task,
            'scope': 'task' if task else 'release', 'total': total, 'passed': passed,
            'failed': failed, 'errors': errors, 'skipped': skipped,
            'modifiedAt': datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
            'status': 'failed' if failed or errors else 'passed' if total > skipped else 'unverified',
            'warning': 'Attribution de tâche absente ou ambiguë : rapport présenté à la release, pas à une tâche.' if not task else None}


def reports(root, release, task_ids):
    root = Path(root).resolve()
    if not release:
        return {'reports': [], 'warnings': [], 'documents': []}
    folder = inside(root, root / 'changelog' / release)
    found, warnings = [], []
    paths = sorted(set(folder.glob('**/junit*.xml')) | set(folder.glob('**/test-results*.xml')))
    for path in paths[:100]:
        if path.is_symlink():
            continue
        try:
            found.append(junit(root, path, task_ids))
        except (ValueError, OSError, ET.ParseError):
            warnings.append('Rapport non exploitable : ' + path.name)
    if len(paths) > 100:
        warnings.append('Inventaire limité à 100 rapports.')
    docs = [str(p.relative_to(root)) for p in (folder / 'qa.md', folder / 'recette.md') if p.is_file() and not p.is_symlink()]
    return {'reports': sorted(found, key=lambda r: r['modifiedAt'], reverse=True), 'warnings': warnings, 'documents': docs}
