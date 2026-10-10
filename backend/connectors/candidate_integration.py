"""Deterministic integration of received code contributions, never a rebase.

The engine owns run membership and accepted attempts. Artifact JSON alone grants
neither contribution membership nor permission to apply a candidate.
"""
import copy
import errno
import tempfile
from pathlib import Path

from workflow_engine.contracts import ContractError, require
from . import candidates


def _ancestors(run, node):
    found, pending = set(), [node]
    while pending:
        target = pending.pop()
        for edge in run['definition']['edges']:
            if edge['to'] == target and edge['from'] not in found:
                found.add(edge['from'])
                pending.append(edge['from'])
    return found


def _identity(run, node, state, reference):
    return {'run': run['id'], 'node': node['id'], 'attempt': state['attempt'],
            'candidate': copy.deepcopy(reference)}


def _producer(engine, contribution, project, current=None):
    require(isinstance(contribution, dict) and isinstance(contribution.get('run'), str)
            and isinstance(contribution.get('node'), str) and type(contribution.get('attempt')) is int
            and isinstance(contribution.get('candidate'), dict), 'Référence de contribution incomplète')
    run = current if current and contribution['run'] == current['id'] else engine.run(contribution['run'])
    require(run['project'] == project, 'Les contributions de plusieurs projets nécessitent une intégration par dépôt')
    require(not run.get('simulation') and run['status'] != 'cancelled'
            and run.get('completion_outcome') not in {'rejected', 'blocked'},
            'Contribution simulée, annulée, refusée ou non résolue')
    node = next((n for n in run['definition']['nodes'] if n['id'] == contribution['node']), None)
    require(node is not None and (node.get('execution_mode') == 'edit' or node['kind'] == 'integrate'),
            'Une contribution doit provenir d’un bloc de code ou d’intégration')
    state = run['nodes'][node['id']]
    require(state['status'] == 'accepted' and state.get('attempt') == contribution['attempt'],
            'La tentative de contribution a changé ou son résultat n’est pas validé')
    result = state.get('result') or {}
    require(result.get('ok') is True and not result.get('simulated')
            and result.get('outputs', {}).get('candidate') == contribution['candidate'],
            'La référence ne correspond pas au candidat validé du producteur')
    require(not state.get('applied_candidate'), 'Une contribution est déjà appliquée : préparer un nouveau lot depuis les sources actuelles')
    candidate = candidates.load(engine, contribution['candidate'], project)
    require(candidate.get('source_run') == run['id'], 'Candidat importé d’une autre exécution')
    return run, node, state, candidate


def _member(parent, child):
    lineage = child.get('parent')
    require(isinstance(lineage, dict) and lineage.get('run') == parent['id'],
            'Contribution hors du périmètre de cette exécution')
    group = parent['nodes'].get(lineage.get('node'))
    definition = next((n for n in parent['definition']['nodes'] if n['id'] == lineage.get('node')), None)
    require(group is not None and definition is not None and definition['kind'] == 'foreach'
            and group.get('attempt') == lineage.get('attempt')
            and any(c.get('run') == child['id'] and c.get('element') == lineage.get('element')
                    for c in group.get('children', [])),
            'La contribution n’appartient plus à cette tentative du traitement par élément')
    require(parent['status'] != 'cancelled' and not parent.get('simulation'),
            'Le traitement parent a été annulé ou est simulé')
    return lineage


def _allowed(engine, run, target, source):
    if source['id'] == run['id']:
        return  # The producer node itself is checked by the caller.
    lineage = _member(run, source)
    require(lineage['node'] in _ancestors(run, target),
            'Le traitement des contributions doit précéder ce bloc d’intégration')


def base_producer(engine, run, reference):
    """Resolve a real accepted base; the engine separately freezes code_base_run."""
    candidate = candidates.load(engine, reference, run['project'])
    source = engine.run(candidate.get('source_run'))
    matches = []
    for node in source['definition']['nodes']:
        state = source['nodes'][node['id']]
        if state.get('result', {}).get('outputs', {}).get('candidate') == reference:
            identity = _identity(source, node, state, reference)
            _producer(engine, identity, run['project'], run)
            matches.append(identity)
    require(len(matches) == 1, 'La base de code doit correspondre à un unique producteur validé')
    identity = matches[0]
    if source['id'] == run['id']:
        consumers = [n['id'] for n in run['definition']['nodes'] if n.get('execution_mode') == 'edit'
                     and run['nodes'][n['id']].get('status') == 'running'
                     and run['nodes'][n['id']].get('inputs', {}).get('candidate') == reference]
        require(any(identity['node'] in _ancestors(run, nid) for nid in consumers),
                'La base de code doit venir d’une étape précédente de ce travail')
    else:
        lineage = run.get('parent') or {}
        parent = engine.run(lineage.get('run'))
        child_lineage = _member(parent, run)
        source_lineage = _member(parent, source)
        require(child_lineage['node'] == source_lineage['node'] and child_lineage['attempt'] == source_lineage['attempt'],
                'La dépendance de code doit appartenir au même traitement par élément')
        parameters = run.get('parameters', {})
        require(parameters.get('code_base_run') == source['id'] and source['id'] in parameters.get('depends_on_runs', []),
                'Ce candidat n’est pas la dépendance de code autorisée pour cet élément')
    return identity


def _key(contribution):
    return (contribution['run'], contribution['node'], contribution['attempt'], contribution['candidate']['sha256'])


def validate_candidate_context(engine, run, node, state, candidate):
    """An accepted child cannot escape cancellation through direct application."""
    if run.get('parent'):
        _member(engine.run(run['parent']['run']), run)
    ancestor = candidate.get('parent_candidate')
    if not ancestor:
        return
    require(isinstance(ancestor, dict), 'Filiation candidate invalide')
    require(state.get('inputs', {}).get('candidate') == ancestor.get('candidate'),
            'La filiation candidate ne correspond pas à l’entrée reçue par le producteur')
    source, producer, _, base = _producer(engine, ancestor, run['project'], run)
    require(base['files'] == candidate['files'], 'Base de dépendance de code différente')
    if source['id'] == run['id']:
        require(producer['id'] in _ancestors(run, node['id']), 'La dépendance de code ne précède pas son descendant')
    else:
        parent = engine.run((run.get('parent') or {}).get('run'))
        child_lineage, source_lineage = _member(parent, run), _member(parent, source)
        require(child_lineage['node'] == source_lineage['node'] and child_lineage['attempt'] == source_lineage['attempt'],
                'La dépendance de code doit appartenir au même traitement par élément')
        parameters = run.get('parameters', {})
        require(parameters.get('code_base_run') == source['id'] and source['id'] in parameters.get('depends_on_runs', []),
                'La filiation candidate ne correspond pas à la dépendance de code autorisée')


def _composition(engine, run, node, state):
    require(run['scope']['kind'] == 'project' and not run.get('simulation') and run['status'] != 'cancelled',
            'L’intégration nécessite une exécution réelle dans un projet Git')
    contributions = state.get('inputs', {}).get('contributions')
    require(isinstance(contributions, list) and 0 < len(contributions) <= 100,
            'Fournir de 1 à 100 contributions de code validées à intégrer')
    received, by_key, original = [], {}, None
    for contribution in contributions:
        source, producer, saved, candidate = _producer(engine, contribution, run['project'], run)
        _allowed(engine, run, node['id'], source)
        if source['id'] == run['id']:
            require(producer['id'] in _ancestors(run, node['id']), 'Le producteur doit précéder le bloc d’intégration')
        identity = _identity(source, producer, saved, contribution['candidate'])
        key = _key(identity)
        require(key not in by_key, 'Une même contribution est fournie plusieurs fois')
        if original is None:
            original = candidate['files']
        require(candidate['files'] == original, 'Bases de code différentes : aucune intégration ni rebase automatique')
        received.append(identity)
        by_key[key] = candidate
    # A cumulative descendant covers an ancestor only through verified lineage.
    covered = set()
    for identity in received:
        candidate = by_key[_key(identity)]
        descendant = identity
        seen = {_key(identity)}
        while candidate.get('parent_candidate'):
            ancestor = candidate['parent_candidate']
            descendant_run, descendant_node, descendant_state, _ = _producer(engine, descendant, run['project'], run)
            validate_candidate_context(engine, descendant_run, descendant_node, descendant_state, candidate)
            source, producer, saved, ancestor_candidate = _producer(engine, ancestor, run['project'], run)
            _allowed(engine, run, node['id'], source)
            if source['id'] == run['id']:
                require(producer['id'] in _ancestors(run, node['id']), 'Ancêtre de code hors du chemin d’intégration')
            key = _key(ancestor)
            require(key not in seen and len(seen) <= 100, 'Filiation de candidats cyclique ou trop longue')
            require(ancestor_candidate['files'] == original, 'Base de dépendance de code différente')
            seen.add(key)
            if key in by_key:
                covered.add(key)
            candidate = ancestor_candidate
            descendant = ancestor
    changes, owners = {}, {}
    for identity in sorted(received, key=_key):
        key = _key(identity)
        if key in covered:
            continue
        for change in by_key[key]['changes']:
            name = change['path']
            require(name not in changes or changes[name] == change,
                    f'Conflit sur {name} entre {owners.get(name, "")} et {identity["node"]} ({identity["run"]}). Examiner ces contributions ; aucun fichier n’a été intégré.')
            changes[name] = copy.deepcopy(change)
            owners[name] = f'{identity["node"]} ({identity["run"]})'
    require(0 < len(changes) <= 100, 'Le lot intégré dépasse 100 fichiers modifiés. Réduisez le lot ou adaptez explicitement sa capacité.')
    integration = {'node': node['id'], 'attempt': state['attempt'], 'contributions': sorted(received, key=_key)}
    result = {'schema': 1, 'project': run['project'], 'source_run': run['id'], 'files': original,
              'changes': [changes[n] for n in sorted(changes)], 'integration': integration}
    candidates.check_tree(result)
    require(candidates.snapshot(engine.project(run['project'])) == original,
            'Les sources ont changé depuis les contributions : préparer un nouveau lot avant intégration')
    return result


def integrate(engine, run, node, state):
    """Materialize the entire deterministic union before returning immutable proof."""
    combined = _composition(engine, run, node, state)
    try:
        with tempfile.TemporaryDirectory(prefix='candidate-integration-', dir=engine.store.directory) as folder:
            prepared = candidates.prepare(engine, run, Path(folder))
            require(prepared['files'] == combined['files'], 'Les sources ont changé pendant l’intégration')
            prepared['integration'] = combined['integration']
            candidates.write_changes(combined, prepared['workspace'])
            reference, patch = candidates.capture(engine, run, prepared)
            require(candidates.load(engine, reference, run['project']) == combined, 'Le résultat matérialisé diffère des contributions attendues')
    except OSError as error:
        if error.errno == errno.ENOSPC:
            raise ContractError('Le disque est plein pendant l’intégration. Libérez de l’espace puis reprenez ce bloc ; le dépôt original et les contributions restent intacts.') from None
        raise
    except ContractError as error:
        if '2 Mo' in str(error):
            raise ContractError('Le candidat commun ou son diff dépasse 2 Mo. Réduisez le lot à intégrer ou adaptez explicitement sa capacité ; aucune contribution n’a été tronquée.') from None
        raise
    validate_integration(engine, run, node, reference)
    return {'ok': True, 'summary': f'{len(combined["integration"]["contributions"])} contributions intégrées ; {len(combined["changes"])} fichiers proposés. Tests communs requis avant application.',
            'outputs': {'candidate': reference}, 'patch': patch, 'evidence': [reference, patch]}


def validate_integration(engine, run, node, reference):
    """Call on receipt and again on application: previous proofs cannot go stale."""
    candidate = candidates.load(engine, reference, run['project'])
    expected = _composition(engine, run, node, run['nodes'][node['id']])
    require(candidate == expected, 'Le candidat commun ne correspond plus aux contributions et tentatives validées')
    return candidate
