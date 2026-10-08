"""Conservative evidence reuse: immutable ancestors and unchanged source files."""
import copy
import hashlib
from pathlib import Path
import subprocess
import time

from .contracts import ContractError, digest, require
from .projects import git_environment


def source_fingerprint(project):
    root = Path(project['path'])
    # Global contexts have no Git project and cannot reuse command evidence.
    if project.get('scope') == 'workspace':
        return None
    try:
        result = subprocess.run(['git', '-C', str(root), 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
                                env=git_environment(), capture_output=True, timeout=5, check=True)
        require(len(result.stdout) <= 2_000_000, 'Inventaire trop volumineux')
        paths = sorted(set(result.stdout.decode().split('\0')) - {''})
        require(len(paths) <= 10000, 'Trop de fichiers pour réutiliser les preuves')
        records = []
        size = 0
        for name in paths:
            if name.split('/')[0] in {'.tricorder', 'release'}:
                continue
            path = root / name
            require(path.parent.resolve().is_relative_to(root.resolve()), 'Source hors projet')
            if path.is_symlink():
                return None  # External link target may change independently.
            if not path.exists():
                records.append((name, 'missing'))
                continue
            require(path.is_file(), 'Source non régulière')
            size += path.stat().st_size
            require(size <= 100_000_000, 'Sources trop volumineuses')
            records.append((name, path.stat().st_mode, hashlib.sha256(path.read_bytes()).hexdigest()))
        return digest(records)
    except (OSError, ValueError, subprocess.SubprocessError):
        return None  # Inability to prove equality means execute again.


def signatures(run):
    nodes = {n['id']: n for n in run['definition']['nodes']}
    incoming = {nid: [] for nid in nodes}
    outgoing = {nid: [] for nid in nodes}
    for e in run['definition']['edges']:
        incoming[e['to']].append(e)
        outgoing[e['from']].append(e['to'])
    degree = {nid: len(edges) for nid, edges in incoming.items()}
    ready = [nid for nid, count in degree.items() if not count]
    result = {}
    while ready:
        nid = ready.pop()
        node = copy.deepcopy(nodes[nid])
        for field in ('position', 'collapsed', 'reuse'):
            node.pop(field, None)
        parents = [{**e, 'source_signature': result[e['from']]} for e in incoming[nid]]
        result[nid] = digest({'node': node, 'incoming': parents, 'parameters': run['parameters'], 'packs': run['packs']})
        for child in outgoing[nid]:
            degree[child] -= 1
            if not degree[child]:
                ready.append(child)
    return result


def apply(engine, db, run, source):
    require(source['project'] == run['project'] and source['simulation'] == run['simulation'], 'Réutilisation limitée au même contexte et au même mode')
    old_signatures, new_signatures = signatures(source), signatures(run)
    fingerprint = source_fingerprint(engine.project(run['project'], db))
    changed = True
    while changed:
        changed = False
        for node in run['definition']['nodes']:
            nid = node['id']
            state, previous = run['nodes'][nid], source['nodes'].get(nid, {})
            if state['status'] != 'ready' or not node.get('reuse') or node['kind'] not in {'command', 'document'} or node.get('capabilities'):
                continue
            if previous.get('status') != 'accepted' or old_signatures.get(nid) != new_signatures[nid] or previous.get('inputs', {}) != state.get('inputs', {}):
                continue
            if node['kind'] == 'command' and (not fingerprint or previous.get('source_fingerprint') != fingerprint or not previous.get('source_unchanged')):
                continue
            if time.time() - previous.get('finished', 0) > 86400:
                continue
            proof = previous.get('result', {})
            try:
                require(proof.get('ok') is True and proof.get('evidence'), 'Preuves absentes')
                for reference in proof['evidence']:
                    engine.evidence(reference)
            except ContractError:
                continue
            state.update(status='accepted', outcome='done', finished=previous['finished'], result=copy.deepcopy(proof), receipt=copy.deepcopy(previous['receipt']),
                         reused_from={'run': source['id'], 'node': nid}, source_fingerprint=previous.get('source_fingerprint'), source_unchanged=previous.get('source_unchanged'))
            engine._event(db, run, 'evidence-reused', nid, source_run=source['id'])
            engine._advance(db, run)
            changed = True
