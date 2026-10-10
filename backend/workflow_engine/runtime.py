"""Bounded local executors. No shell, network, credentials or runtime DB in jobs."""

import json
from collections import Counter, deque
import os
from pathlib import Path
import resource
import shutil
import signal
import subprocess
import sys
import time

from .contracts import ContractError, require
from .engine import Engine, run_driver
from connectors.providers import execute_text, redact


def sandbox_argv(argv, project=None, work=None):
    binary = shutil.which("bwrap")
    require(binary, "Bubblewrap absent : commande isolée indisponible")
    args = [binary, "--unshare-all", "--die-with-parent", "--new-session", "--ro-bind", "/usr", "/usr",
            "--symlink", "usr/bin", "/bin", "--symlink", "usr/lib", "/lib", "--symlink", "usr/lib64", "/lib64",
            "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp", "--tmpfs", "/home"]
    if project:
        args += ["--ro-bind", str(Path(project).resolve()), "/project"]
    if work:
        args += ["--bind", str(Path(work).resolve()), "/work", "--chdir", "/work"]
    args += ["--clearenv", "--setenv", "PATH", "/usr/bin:/bin", "--setenv", "HOME", "/tmp", "--setenv", "LANG", "C.UTF-8", "--", *argv]
    return args


def capabilities(project=None, engine=None):
    result = []
    for provider in ("codex", "claude"):
        found = bool(shutil.which(provider))
        result.append({"id": provider, "title": "Codex" if provider == "codex" else "Claude Code", "available": True, "installed": found,
                       "connected": None, "usable": found, "qualified": False,
                       "reason": "CLI détecté. Sessions neuves : analyse ou modification dans une copie isolée. La connexion et le modèle sont vérifiés au lancement. Un lancement explicite peut consommer votre abonnement." if found else "CLI non installé.",
                       "operations": ["agent", "code-edit", "design-assistant"]})
    sandbox = False
    if shutil.which("bwrap"):
        try:
            probe = subprocess.run(sandbox_argv(["true"]), capture_output=True, timeout=3)
            sandbox = probe.returncode == 0
        except (OSError, subprocess.TimeoutExpired, ContractError):
            pass
    result.append({"id": "command", "title": "Commandes locales isolées", "available": True, "installed": bool(shutil.which("bwrap")), "connected": sandbox,
                   "usable": sandbox, "qualified": sandbox, "reason": "Sans réseau ; projet en lecture seule ; résultats dans un dossier de travail isolé." if sandbox else "Isolation système indisponible dans cet environnement. Aucun repli sans isolation.", "operations": ["command"]})
    result.extend([
        {"id": "confluence", "title": "Confluence", "available": True, "installed": False, "connected": False, "usable": False, "qualified": False, "reason": "Un plugin Atlassian peut être connecté séparément. Aucun transport authentifié configuré dans Tricorder.", "operations": ["read", "draft", "publish"]},
        {"id": "github-odoo-sh", "title": "GitHub → Odoo.sh", "available": True, "installed": False, "connected": False, "usable": False, "qualified": False, "reason": "Renseigner dépôt, branche et projet Odoo.sh. Publication GitHub, build et déploiement seront suivis séparément.", "operations": ["publish-candidate", "observe-build", "verify-deployment"]}
    ])
    for cid, title, known in [("gmail", "Gmail", True), ("outlook", "Outlook", True), ("slack", "Slack", True), ("telegram", "Telegram", False), ("signal", "Signal", False)]:
        result.append({"id": cid, "title": title, "available": known, "installed": False, "connected": False, "usable": False, "qualified": False,
                       "reason": "Aucun connecteur authentifié dans le runtime Tricorder. L'installation dans Codex est distincte." if known else "Aucun plugin correspondant identifié dans le catalogue consulté. Un adaptateur doit être fourni et qualifié.", "operations": ["watch"] if cid in {"gmail", "outlook"} else ["communicate"]})
    if project:
        from .integrations import capabilities as plugin_capabilities
        result.extend(plugin_capabilities(project, engine))
    return result


def preflight(graph, simulation=False, defaults=None, project=None, engine=None, mode="automatic", provider=None, model=None, *, primary=True, _catalog=None):
    if "driver" in graph:
        return [{"node": "workflow", "code": "workflow.runtime-context", "stage": "launch", "action": "save-workflow",
                 "message": "Ce modèle contient le contexte d’une ancienne conversation.",
                 "remedy": "Enregistrez le workflow à nouveau puis revérifiez le lancement. L’exécution historique restera inchangée."}]
    if simulation:
        return []
    catalog = _catalog if _catalog is not None else {c["id"]: c for c in capabilities()}
    from .integrations import issues as plugin_issues
    # This function also checks every mandatory component below, preserving
    # its owning block in diagnostics without reporting the same issue twice.
    issues = plugin_issues(graph, project, engine, recursive=False)
    from .packs import profile_issues
    missing_profiles = profile_issues(project, graph, primary=primary) if project else []
    issues += missing_profiles
    missing_profile_nodes = {i["node"] for i in missing_profiles}
    if mode == "native":
        provider = provider or graph.get("defaults", {}).get("provider", "codex")
        if provider not in catalog or not catalog[provider]["installed"]:
            issues.append({"node": "workflow", "code": "provider.cli-missing", "stage": "launch", "action": "choose-ai",
                           "message": "CLI de conversation non installé", "remedy": "Choisissez un fournisseur installé, ou installez son CLI puis relancez la vérification."})
    if mode not in graph.get("execution_modes", ["native", "automatic"]):
        issues.append({"node": graph["nodes"][0]["id"], "message": "Ce workflow n’est pas compatible avec ce mode d’exécution."})
    for node in graph["nodes"]:
        kind = node["kind"]
        if kind == "foreach" and isinstance(node.get("workflow"), dict):
            child = {**node["workflow"], "defaults": {**graph.get("defaults", {}), **node["workflow"].get("defaults", {})}}
            child_issues = preflight(child, defaults=defaults, project=project, engine=engine,
                                     mode="automatic", primary=False, _catalog=catalog)
            issues += [{**issue, "node": node["id"], "child_node": issue.get("node"),
                        "message": f"{node['title']} · {issue['message']}"} for issue in child_issues]
        selection = {**(defaults or {}), **graph.get("defaults", {}), **node}
        native = mode == "native" and kind in {"agent", "task", "document"} and node.get("execution_mode") != "edit" and selection.get("provider", provider) == provider and (not selection.get("model") or selection.get("model") == model)
        if native and selection.get("effort", "medium") != graph.get("defaults", {}).get("effort", "medium"):
            issues.append({"node": node["id"], "code": "provider.effort-mismatch", "stage": "launch", "action": "edit-node",
                           "message": "Le niveau d’effort de cette étape diffère de celui de la conversation.",
                           "remedy": "Alignez le niveau d’effort dans les options IA du bloc avec celui de la conversation avant de lancer le workflow."})
        available = {"text", "read", "edit", "shell", "native-tools"} if native else {"text", "read", "edit"} if node.get("execution_mode") == "edit" else {"shell", "read"} if kind == "command" else {"text"}
        missing = set(node.get("required_capabilities", [])) - available
        if missing:
            issues.append({"node": node["id"], "code": "executor.capabilities-missing", "stage": "launch", "action": "edit-node",
                           "message": "Capacités requises indisponibles dans ce mode : " + ", ".join(sorted(missing)) + ". Utiliser la conversation native ou configurer un exécutant adapté.",
                           "remedy": "Configurez un exécutant disposant de ces capacités, ou lancez le workflow dans le terminal si ces capacités y sont disponibles."})
        if native:
            continue
        if kind == "command" and not catalog["command"]["usable"]:
            issues.append({"node": node["id"], "message": catalog["command"]["reason"]})
        elif kind == "agent":
            if node.get("execution_mode") == "edit" and (not project or project.get("scope") == "workspace" or project.get("library")):
                issues.append({"node": node["id"], "code": "workflow.git-project-required", "stage": "launch", "action": "choose-project",
                               "message": "L’édition de code nécessite un projet Git ; adapter le modèle dans un projet.", "remedy": "Choisissez un projet Git pour y adapter ce workflow avant de le lancer."})
            selection = {**(defaults or {}), **graph.get("defaults", {}), **node}
            selected_provider = selection.get("provider", "codex")
            if not catalog[selected_provider]["installed"]:
                issues.append({"node": node["id"], "code": "provider.cli-missing", "stage": "launch", "action": "edit-node" if "provider" in node else "choose-ai",
                               "message": catalog[selected_provider]["reason"], "remedy": "Choisissez un fournisseur installé, ou installez son CLI puis relancez la vérification."})
            if not selection.get("model"):
                issues.append({"node": node["id"], "code": "provider.model-required", "stage": "launch", "action": "edit-node" if "model" in node or "provider" in node else "choose-ai",
                               "message": "Modèle IA à définir explicitement ; aucun repli automatique.", "remedy": "Choisissez le modèle à utiliser pour cette étape dans les paramètres IA."})
            if selection.get("session", "delegated") != "delegated":
                issues.append({"node": node["id"], "message": "Session principale à qualifier ; seul le mode session déléguée neuve est disponible."})
            if selection.get("profile", "generalist") != "generalist" and not node.get("profile_text") and node["id"] not in missing_profile_nodes:
                issues.append({"node": node["id"], "message": "Profil spécialisé à charger depuis un pack vérifié."})
        elif kind == "external":
            if not node.get("capabilities"):
                issues.append({"node": node["id"], "code": "plugin.connection-required", "stage": "launch", "action": "connections",
                               "message": "Opération externe non connectée : aucune publication ni livraison réelle disponible.", "remedy": "Configurez et vérifiez une connexion, puis associez sa capacité à cette étape."})
            if any("A_CONFIRMER" in str(v) for v in node.get("operation", {}).values()):
                issues.append({"node": node["id"], "message": "Renseigner la cible et le candidat exacts du modèle avant exécution."})
        elif kind == "document" and not node.get("capabilities") and not node.get("content", "").strip():
            issues.append({"node": node["id"], "message": "Contenu du document ou capacité de lecture à configurer."})
        elif kind == "watch":
            if not node.get("capabilities"):
                issues.append({"node": node["id"], "code": "plugin.connection-required", "stage": "launch", "action": "connections",
                               "message": "Connecteur de messagerie non connecté dans Tricorder.", "remedy": "Configurez et vérifiez une connexion de messagerie, puis associez sa capacité de lecture à cette étape."})
            if not node.get("sender") or not node.get("account"):
                issues.append({"node": node["id"], "message": "Compte et adresse d'expéditeur exacts à confirmer ; un nom de client seul ne suffit pas."})
        elif kind == "communication":
            channel = node.get("channel", "slack")
            if not node.get("capabilities"):
                issues.append({"node": node["id"], "code": "plugin.connection-required", "stage": "launch", "action": "connections",
                               "message": f"Connecteur {channel} non connecté dans Tricorder.", "remedy": "Configurez et vérifiez une connexion, puis associez sa capacité de notification à cette étape."})
            if not node.get("recipient"):
                issues.append({"node": node["id"], "message": "Canal ou destinataire exact à configurer avant activation."})
        elif kind == "task" and not node.get("capabilities"):
            issues.append({"node": node["id"], "message": "Travail de démonstration : choisir une commande ou un exécutant connecté."})
    return issues


def dispatch(engine, run_id):
    """Claim before spawn; a crash at either boundary never blindly respawns work."""
    run = engine.run(run_id)
    if any(s.get("status") == "waiting_children" for s in run["nodes"].values()):
        from .iterations import tick
        run = tick(engine, run_id)
    if run["status"] != "active":
        return run
    if run["original"]["id"] == "question-notification" and run["parameters"].get("source_question") and all(s["status"] in {"pending", "ready"} for s in run["nodes"].values()):
        source = engine.run(run["parameters"]["source_run"])
        pending = source["nodes"].get(run["parameters"]["source_node"], {})
        if source["status"] not in {"active", "paused"} or pending.get("status") != "waiting_input" or pending.get("question", {}).get("id") != run["parameters"]["source_question"]:
            return engine.control(run_id, "cancel")
    for nid, state in run["nodes"].items():
        if state["status"] != "ready":
            continue
        node = next(n for n in run["definition"]["nodes"] if n["id"] == nid)
        if node["kind"] == "foreach":
            if run_driver(run) == "automatic":
                from .iterations import activate
                try:
                    activate(engine, run_id, nid)
                except ContractError as error:
                    with engine.store.transaction() as db:
                        current = engine.run(run_id, db)
                        target = current["nodes"][nid]
                        if target["status"] == "ready":
                            target.update(status="blocked", reason=str(error)[:1200], validation_error=str(error)[:1200])
                            engine._event(db, current, "iteration-blocked", nid, reason=str(error)[:1200])
                            engine._save(db, current)
            continue
        if run_driver(run) == "conversation" and node["kind"] in {"agent", "task", "document"}:
            continue  # The native conversation claims work; the graph remains authoritative.
        try:
            _spawn_worker(engine, run_id, nid)
        except ContractError:
            continue  # Another dispatcher/lock owner won the transaction.
    return engine.run(run_id)


def _spawn_worker(engine, run_id, node_id):
    """Reserve atomically before a detached spawn; never wait for worker output."""
    claim = engine.claim(run_id, node_id)
    current = engine.run(run_id)
    try:
        from .associated_actions import check_current
        check_current(engine, current)
    except ContractError as error:
        engine.submit(run_id, node_id, claim['token'], {'ok': False, 'summary': 'Lancement interrompu : ' + str(error)[:400]})
        return None
    try:
        worker = subprocess.Popen([sys.executable, str(Path(__file__).parents[1] / 'studio.py'), '--state', str(engine.store.directory), '--worker', run_id, node_id, claim['token']],
                                  stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True, close_fds=True)
    except OSError as exc:
        engine.submit(run_id, node_id, claim['token'], {'ok': False, 'summary': f'Lancement impossible : {exc.__class__.__name__}. Vérifiez les ressources du système avant de demander une reprise.'})
        return None
    try:
        engine.heartbeat(run_id, node_id, claim['token'], worker.pid)
    except ContractError:
        pass  # Worker may already have returned. Never spawn a replacement.
    return {'node': node_id, 'pid': worker.pid, 'attempt': claim['run']['nodes'][node_id]['attempt']}


def worker_preflight(engine, run, node, project, *, catalog=None):
    """Read-only executor check shared by the overview and explicit dispatch.

    The claim still owns quota, locks and authorization atomically. Readiness is
    only an observation, never a reservation or permission to run future work.
    """
    if node['kind'] not in {'agent', 'command', 'document', 'integrate'}:
        return [{'node': node['id'], 'code': 'native-step', 'action': 'terminal',
                 'message': 'Ce bloc se traite dans la conversation du terminal.'}]
    checked_node = {**node, **node.get('execution', {})}
    context = run['nodes'][node['id']].get('inputs', {}).get('execution_context', {})
    graph = {**run['definition'], 'nodes': [checked_node], 'edges': [],
             'parameters': {**run['parameters'], **context}}
    issues = preflight(graph, simulation=run['simulation'], defaults=project.get('defaults'),
                       project=project, engine=engine, _catalog=catalog)
    if not run['simulation']:
        from .packs import policy_issues
        issues += policy_issues(project, graph)
    return issues


def dispatch_conversation(engine, cid, *, runs=None, offset=0, limit=25, node_offsets=None):
    """Explicit one-wave launch. Reads/status never enroll future paid work.

    At most four starts and 100 eligibility checks per call, round-robin across
    up to 25 requests. Repeated calls observe the durable claims and never retry
    a running/returned attempt. The engine owns locks, quota and all transitions.
    """
    from .conversations import Conversations
    service = Conversations(engine)
    conversation = service.get(cid)
    require(conversation['status'] == 'open' and not conversation.get('archived'), 'Conversation fermée ou archivée')
    require(runs is None or isinstance(runs, list) and len(runs) <= 1000 and all(isinstance(r, str) for r in runs), 'Sélection attendue : au plus 1 000 identifiants d’exécution')
    require(type(offset) is int and 0 <= offset <= 1000 and type(limit) is int and 1 <= limit <= 25, 'Pagination : offset positif et limit entre 1 et 25')
    authorized = {item['run'] for item in conversation['items']}
    selected = list(dict.fromkeys(runs)) if runs is not None else [item['run'] for item in conversation['items']]
    require(all(rid in authorized for rid in selected), 'Tâche d’une autre conversation ; aucun lancement effectué')
    require(node_offsets is None or isinstance(node_offsets, dict) and all(rid in selected and type(index) is int and 0 <= index <= 1000 for rid, index in node_offsets.items()), 'Curseurs de blocs invalides ou hors de la sélection')
    node_offsets = node_offsets or {}
    page = selected[offset:offset + limit]
    records, queues = {}, {}
    for rid in page:
        run = service.checked_run(cid, rid)
        require(run_driver(run) == 'conversation', 'Cette exécution n’est pas pilotée par la conversation')
        record = records[rid] = {'run': rid, 'project': run['project'], 'started': [], 'problems': {}}
        if run['status'] == 'paused' and run.get('coordination_wait') and not run.get('coordination_hold'):
            try:
                run = engine.control(rid, 'resume')
            except ContractError as exc:
                record['run_wait'] = {'code': 'dependencies', 'reason': str(exc)[:500]}
        if run['status'] == 'active':
            queues[rid] = deque((index, n) for index, n in enumerate(run['definition']['nodes']) if index >= node_offsets.get(rid, 0) and run['nodes'][n['id']]['status'] == 'ready')
    starts = checks = 0
    catalog = None
    while any(queues.values()) and starts < 4 and checks < 100:
        for rid, queue in queues.items():
            if not queue or starts >= 4 or checks >= 100:
                continue
            _, node = queue.popleft(); nid = node['id']; checks += 1
            record = records[rid]
            run = engine.run(rid)
            project = engine.project(run['project'])
            # Check this executor, not unrelated future stages or the native
            # coordinator's broader tool access. Frozen node selection is kept.
            if catalog is None:
                catalog = {c['id']: c for c in capabilities()}
            issues = worker_preflight(engine, run, node, project, catalog=catalog)
            if issues:
                record['problems'][nid] = {'code': issues[0].get('code', 'executor-unavailable'),
                                          'reason': ' · '.join(i['message'] for i in issues)[:500]}
                continue
            try:
                started = _spawn_worker(engine, rid, nid)
                if started:
                    record['started'].append(started); starts += 1
                else:
                    record['problems'][nid] = {'code': 'launch-failed', 'reason': 'Aucun worker démarré. Consultez le résultat enregistré avant de demander une reprise.'}
            except ContractError as exc:
                record['problems'][nid] = {'code': 'claim-blocked', 'reason': str(exc)[:500]}
    with engine.store.connect() as db:
        active_count = db.execute("SELECT COUNT(*) FROM runs, json_each(runs.body, '$.nodes') AS steps WHERE json_extract(steps.value, '$.status')='running'").fetchone()[0]
    items = []
    messages = {'running': ('running', 'Tentative déjà en cours ; aucun nouvel exécutant lancé.'),
                'waiting_input': ('question', 'Réponse à la question attendue avant de poursuivre.'),
                'waiting': ('decision', 'Décision humaine attendue dans Tricorder.'),
                'returned': ('receipt', 'Résultat à examiner ; aucune réception ou reprise automatique.'),
                'blocked': ('blocked', 'Blocage à examiner avant de poursuivre.'),
                'pending': ('dependencies', 'Attend les étapes précédentes du workflow.'),
                'ready': ('batch-limit', 'D’autres étapes sont prêtes. Relancez les demandes prêtes après les résultats en cours.')}
    for rid in page:
        record, run = records[rid], engine.run(rid)
        started_ids = {entry['node'] for entry in record['started']}
        waiting = []
        if run['status'] == 'paused':
            waiting.append({'node': None, 'status': 'paused', **record.get('run_wait', {'code': 'paused', 'reason': 'Exécution suspendue manuellement ; reprise explicite requise dans Tricorder.'})})
        elif run['status'] == 'cancelled':
            waiting.append({'node': None, 'status': 'cancelled', 'code': 'cancelled', 'reason': 'Exécution annulée ; aucun lancement.'})
        else:
            for nid, state in run['nodes'].items():
                if nid in started_ids or state['status'] not in messages:
                    continue
                code, reason = messages[state['status']]
                if state['status'] == 'ready' and active_count >= 4:
                    code, reason = 'quota', 'Quatre étapes sont déjà en cours : attente d’une place d’exécution, puis rappeler dispatch.'
                waiting.append({'node': nid, 'status': state['status'], **record['problems'].get(nid, {'code': code, 'reason': reason})})
        items.append({'run': rid, 'project': run['project'], 'status': run['status'], 'started': record['started'],
                      'counts': dict(Counter(s['status'] for s in run['nodes'].values())),
                      'waiting': waiting[:25], 'waiting_total': len(waiting), 'waiting_truncated': len(waiting) > 25,
                      'next_node': queues[rid][0][0] if queues.get(rid) else None})
    return {'conversation': cid, 'items': items, 'offset': offset, 'limit': limit, 'total': len(selected),
            'next': offset + len(page) if offset + len(page) < len(selected) else None,
            'started_count': starts, 'checks': checks, 'max_parallel': 4, 'active_count': active_count,
            'continuation': 'Vague explicite terminée. Consulter status/inspect puis rappeler dispatch après les résultats ou les décisions ; aucune file de lancements futurs créée.'}


def _limits():
    resource.setrlimit(resource.RLIMIT_FSIZE, (2_000_000, 2_000_000))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))


def execute(engine, run_id, node_id, token):
    run = engine.run(run_id)
    node = next(n for n in run["definition"]["nodes"] if n["id"] == node_id)
    engine.heartbeat(run_id, node_id, token, os.getpid())
    result = {"ok": False, "summary": "Exécutant indisponible"}
    job = engine.store.directory / "jobs" / token
    job.mkdir(parents=True, mode=0o700, exist_ok=True)
    try:
        from .associated_actions import check_current
        check_current(engine, run)
        if run["simulation"]:
            from .simulation import output_examples
            time.sleep(0.4)
            text = "SIMULATION — " + node.get("sample", f"Résultat d'exemple pour « {node['title']} ». Aucun outil métier ni service externe n'a été appelé.")
            result = {"ok": True, "summary": text, "simulated": True, "outputs": output_examples(run['definition'], node), "evidence": [engine.artifact(text.encode())]}
        elif node.get("capabilities"):
            from connectors.tool_runtime import execute_tool
            result = execute_tool(engine, run, node, token)
            if node["kind"] == "agent":
                run["nodes"][node_id].setdefault("inputs", {})["tool_data"] = result["outputs"]
                generated = execute_text(engine, run, node, token, job)
                generated["evidence"] = result["evidence"] + generated.get("evidence", [])
                result = generated
        elif node["kind"] == "integrate":
            from connectors.candidate_integration import integrate
            result = integrate(engine, run, node, run["nodes"][node_id])
        elif node["kind"] == "command":
            work = job / "work"
            work.mkdir(exist_ok=True)
            project = engine.project(run["project"])
            source = project.get("path")
            candidate = run["nodes"][node_id].get("inputs", {}).get("candidate")
            if candidate:
                from connectors.candidates import materialize
                source = materialize(engine, candidate, run["project"], job / "candidate")
            from .recovery import tracked_argv
            args = tracked_argv(engine, run_id, node_id, token, sandbox_argv(node["argv"], source, work))
            with (job / "output").open("wb") as output:
                process = subprocess.Popen(args, stdout=output, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, start_new_session=True, preexec_fn=_limits)
                engine.heartbeat(run_id, node_id, token, process.pid)
                deadline = time.monotonic() + node.get("timeout", 60)
                reason = None
                while process.poll() is None:
                    current = engine.run(run_id)
                    if current["status"] == "cancelled" or time.monotonic() > deadline:
                        reason = "Commande annulée" if current["status"] == "cancelled" else "Délai de commande dépassé"
                        os.killpg(process.pid, signal.SIGKILL)
                        process.wait()
                        break
                    engine.heartbeat(run_id, node_id, token)
                    time.sleep(0.2)
            content = redact((job / "output").read_bytes()[:2_000_000].decode("utf-8", errors="replace")).encode()
            result = {"ok": process.returncode == 0 and not reason, "summary": reason or f"Commande terminée avec le code {process.returncode}. Résultat à examiner.", "exit_code": process.returncode,
                      "evidence": [engine.artifact(content)], "preview": content.decode("utf-8", errors="replace")[:8000], "scope": "Projet en lecture seule ; aucun accès réseau."}
        elif node["kind"] == "agent":
            result = execute_text(engine, run, node, token, job)
        elif node["kind"] == "document":
            content = node.get("content", "")
            require(isinstance(content, str) and content.strip(), "Contenu documentaire requis ; aucun texte généré automatiquement sans fournisseur")
            result = {"ok": True, "summary": "Brouillon préparé. Aucune publication externe.", "preview": content, "evidence": [engine.artifact(content.encode())]}
    except Exception as exc:
        result = {"ok": False, "summary": str(exc)[:500]}
    # Durable result before committing state: reconciliation can recover this boundary.
    spool = job / "result.json"
    temporary = job / "result.tmp"
    with temporary.open("w") as stream:
        json.dump(result, stream, ensure_ascii=False)
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(spool)
    engine.submit(run_id, node_id, token, result)


def reconcile(engine, run_id, node_id):
    run = engine.run(run_id)
    state = run["nodes"][node_id]
    require(state["status"] == "running", "Aucune tentative en cours à réconcilier")
    spool = engine.store.directory / "jobs" / state["token"] / "result.json"
    if spool.is_file():
        return engine.submit(run_id, node_id, state["token"], json.loads(spool.read_text()))
    raise ContractError("Résultat encore inconnu : aucune relance automatique. Le processus peut toujours être actif ; vérifier avant une nouvelle exécution.")
