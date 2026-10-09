"""Bounded, read-only launch hints for one conversation page.

No claim, state transition, provider invocation or future launch is performed.
The explicit dispatcher repeats the same executor check before its atomic claim.
"""
from collections import Counter

from . import runtime
from .contracts import require


class LaunchReadiness:
    MAX_CHECKS = 100
    MAX_NODES = 25

    def __init__(self, engine, conversation=None):
        self.engine = engine
        self.conversation = conversation
        self.contexts = {}
        self.current_context = conversation
        self.catalog = None
        self.projects = {}
        self.checks = 0
        with engine.store.connect() as db:
            self.active_count = db.execute("SELECT COUNT(*) FROM runs, json_each(runs.body, '$.nodes') AS steps WHERE json_extract(steps.value, '$.status')='running'").fetchone()[0]
            self.resources = {row[0] for row in db.execute('SELECT resource FROM resources')}

    def _native_available(self, run, node, project):
        # Match the native bridge claim contract, not just the broader tools
        # that happen to be installed on the user's machine.
        context = self.current_context
        if not context.get('provider') or node['kind'] not in {'agent', 'task', 'document'} or node.get('execution_mode') == 'edit':
            return False
        selection = {**node, **node.get('execution', {})}
        provider = context['provider']
        model = context.get('model')
        if (selection.get('provider', provider) != provider
                or selection.get('model') and selection['model'] != model
                or selection.get('effort', context.get('effort', 'medium')) != context.get('effort', 'medium')):
            return False
        graph = {**run['definition'], 'nodes': [selection], 'edges': []}
        return not runtime.preflight(graph, simulation=run['simulation'], defaults=project.get('defaults'),
                             project=project, engine=self.engine, mode='native',
                             provider=provider, model=model, _catalog=self.catalog)

    def _node(self, run, node):
        if self.checks >= self.MAX_CHECKS:
            return {'status': 'unknown', 'code': 'check-limit', 'action': 'inspect',
                    'reason': 'Admissibilité non vérifiée sur cette page. Ouvrez la demande pour examiner la suite.'}
        self.checks += 1
        if self.catalog is None:
            self.catalog = {c['id']: c for c in runtime.capabilities()}
        if run['project'] not in self.projects:
            self.projects[run['project']] = self.engine.project(run['project'])
        project = self.projects[run['project']]
        issues = runtime.worker_preflight(self.engine, run, node, project, catalog=self.catalog)
        if issues:
            native = self._native_available(run, node, project)
            codes = {issue.get('code', 'executor-unavailable') for issue in issues}
            needs_model = 'provider.model-required' in codes
            # Missing step context can be prepared inside the native
            # conversation, but is not an authorization to perform the QA.
            prepare = codes == {'odoo.qa.local-copy-required'}
            if native and not needs_model and (prepare or all(
                    code in {'native-step', 'executor.capabilities-missing', 'executor-unavailable'} for code in codes)):
                return {'status': 'native', 'code': 'native-step', 'action': 'terminal',
                        'native_available': True,
                        'reason': ('Préparez et identifiez la copie locale dans le terminal avant la recette.' if prepare else
                                   'Cette étape utilise les outils de la conversation. Continuez dans le terminal.')}
            reason = ' · '.join(issue['message'] for issue in issues)[:500]
            if needs_model:
                reason = 'Aucun modèle explicite pour un agent de bloc. ' + (
                    'Vous pouvez continuer cette demande dans le terminal. ' if native else '') + (
                    'Pour utiliser un agent de bloc, configurez un nouveau lancement ; cette exécution conserve sa version.')
            return {'status': 'configuration', 'code': issues[0].get('code', 'executor-unavailable'),
                    'action': 'new-execution', 'native_available': native, 'reason': reason,
                    'remedy': str(issues[0].get('remedy', 'Examiner la configuration du workflow avant un nouveau lancement.'))[:400]}
        if self.active_count >= 4:
            return {'status': 'waiting', 'code': 'quota', 'action': 'wait',
                    'reason': 'Quatre étapes sont déjà en cours. Une place se libérera à leur arrêt ; le lancement reste explicite.'}
        occupied = [resource for resource in node.get('resources', []) if run['project'] + ':' + resource in self.resources]
        if occupied:
            return {'status': 'waiting', 'code': 'resource-busy', 'action': 'wait',
                    'reason': 'Ressource utilisée par une autre étape : ' + ', '.join(occupied)[:300]}
        return {'status': 'ready', 'code': 'worker-ready', 'action': 'dispatch',
                'reason': 'Agent de bloc disponible. Le lancement revérifie les accès, les places et les ressources.'}

    def project(self, run):
        require(runtime.run_driver(run) == 'conversation', 'Cette disponibilité concerne les agents de la conversation.')
        context = self.conversation
        if context is None:
            cid = run.get('parameters', {}).get('conversation')
            if not isinstance(cid, str):
                cid = None
            if cid not in self.contexts:
                with self.engine.store.connect() as db:
                    row = db.execute("""SELECT json_object(
                        'provider', json_extract(body, '$.provider'),
                        'model', json_extract(body, '$.model'),
                        'effort', coalesce(json_extract(body, '$.effort'), 'medium'),
                        'status', json_extract(body, '$.status'),
                        'archived', json_extract(body, '$.archived')) AS body
                        FROM conversations WHERE id=?""", (cid,)).fetchone() if cid else None
                    self.contexts[cid] = self.engine.store.body(row) or {'status': 'open'}
            context = self.contexts[cid]
        self.current_context = context
        ready = [node for node in run['definition']['nodes'] if run['nodes'][node['id']]['status'] == 'ready']
        enabled = run['status'] == 'active' and context['status'] == 'open' and not context.get('archived')
        entries = []
        counts = Counter()
        for node in ready if enabled else []:
            value = self._node(run, node)
            counts[value['status']] += 1
            if len(entries) < self.MAX_NODES:
                entries.append({'node': node['id'], 'title': node['title'][:120], **value})
        status = next((key for key in ('ready', 'configuration', 'native', 'unknown') if counts[key]), 'waiting')
        labels = {'ready': 'Prête au lancement', 'configuration': 'À configurer',
                  'native': 'À poursuivre dans le terminal', 'unknown': 'À vérifier', 'waiting': 'En attente'}
        return {'status': status, 'label': labels[status], 'ready_count': len(ready) if enabled else 0,
                'worker_count': counts['ready'], 'native_count': counts['native'],
                'configuration_count': counts['configuration'], 'waiting_count': counts['waiting'],
                'unknown_count': counts['unknown'], 'active_count': self.active_count, 'max_parallel': 4,
                'nodes': entries, 'nodes_total': sum(counts.values()),
                'nodes_truncated': sum(counts.values()) > len(entries)}
