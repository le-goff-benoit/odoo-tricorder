"""JUnit evidence, per report/run. Never infer passed tests from workflow state."""
from datetime import datetime, timezone
from pathlib import Path
import re
import xml.etree.ElementTree as ET

from catalog import inside, read_text


COUNTERS = ('tests', 'failures', 'errors', 'skipped')


def declared_counts(suite):
    try:
        counts = {key: int(suite.get(key)) for key in COUNTERS if suite.get(key) is not None}
    except ValueError:
        raise ValueError('Compteurs de tests invalides') from None
    if any(value < 0 for value in counts.values()):
        raise ValueError('Compteurs de tests incohérents')
    return counts


def verify_counts(suite, observed):
    if any(value != observed[COUNTERS.index(key)] for key, value in declared_counts(suite).items()):
        raise ValueError('Compteurs de tests incohérents avec les cas ou les sous-suites')


def case_counts(cases):
    outcomes = [tuple(c.find(key) is not None for key in ('failure', 'error', 'skipped')) for c in cases]
    if any(sum(row) > 1 for row in outcomes):
        raise ValueError('Résultats de test contradictoires')
    return (len(cases), *(sum(row[index] for row in outcomes) for index in range(3)))


def summary_counts(suite):
    children = [child for child in suite if child.tag in ('testsuite', 'testsuites')]
    if children:
        rows = [summary_counts(child) for child in children]
        counts = tuple(sum(row[index] for row in rows) for index in range(4))
    else:
        declared = declared_counts(suite)
        if 'tests' not in declared:
            raise ValueError('Compteurs de tests absents')
        counts = tuple(declared.get(key, 0) for key in COUNTERS)
        if counts[0] < sum(counts[1:]):
            raise ValueError('Compteurs de tests incohérents')
    verify_counts(suite, counts)
    return counts


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
        total, failed, errors, skipped = case_counts(cases)
        # A summary-only sibling must not disappear behind a detailed green case.
        # Check each container independently; parent counters are never added.
        for suite in tree.iter():
            if suite.tag in ('testsuite', 'testsuites'):
                verify_counts(suite, case_counts(list(suite.iter('testcase'))))
    else:
        total, failed, errors, skipped = summary_counts(tree)
    passed = total - failed - errors - skipped
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
    docs = [str(p.relative_to(root)) for p in (folder / 'qa.md', folder / 'recette.md', folder / 'README.md') if p.is_file() and not p.is_symlink()]
    declarations = []
    for relative in docs:
        try:
            for line, text in enumerate(read_text(inside(root, root / relative), 512000).splitlines(), 1):
                if re.search(r'\b(?:tests?|méthodes|scénarios)\b', text, re.I) and re.search(r'\d', text):
                    declarations.append({'path': relative, 'line': line, 'text': text[:700]})
                    if len(declarations) >= 30:
                        break
        except (OSError, ValueError):
            warnings.append('Déclarations de QA non lisibles : ' + relative)
        if len(declarations) >= 30:
            break
    return {'reports': sorted(found, key=lambda r: r['modifiedAt'], reverse=True), 'warnings': warnings,
            'documents': docs, 'declarations': declarations}
