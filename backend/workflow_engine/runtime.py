"""Bounded local executors. No shell, network, credentials or runtime DB in jobs."""

import json
import os
from pathlib import Path
import resource
import shutil
import signal
import subprocess
import sys
import time

from .contracts import ContractError, require
from .engine import Engine
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


def preflight(graph, simulation=False, defaults=None, project=None, engine=None):
    if simulation:
        return []
    catalog = {c["id"]: c for c in capabilities()}
    from .integrations import issues as plugin_issues
    issues = plugin_issues(graph, project, engine)
    for node in graph["nodes"]:
        kind = node["kind"]
        if kind == "command" and not catalog["command"]["usable"]:
            issues.append({"node": node["id"], "message": catalog["command"]["reason"]})
        elif kind == "agent":
            if node.get("execution_mode") == "edit" and (not project or project.get("scope") == "workspace" or project.get("library")):
                issues.append({"node": node["id"], "message": "L’édition de code nécessite un projet Git ; adapter le modèle dans un projet."})
            selection = {**(defaults or {}), **graph.get("defaults", {}), **node}
            provider = selection.get("provider", "codex")
            if not catalog[provider]["installed"]:
                issues.append({"node": node["id"], "message": catalog[provider]["reason"]})
            if not selection.get("model"):
                issues.append({"node": node["id"], "message": "Modèle IA à définir explicitement ; aucun repli automatique."})
            if selection.get("session", "delegated") != "delegated":
                issues.append({"node": node["id"], "message": "Session principale à qualifier ; seul le mode session déléguée neuve est disponible."})
            if selection.get("profile", "generalist") != "generalist" and not node.get("profile_text"):
                issues.append({"node": node["id"], "message": "Profil spécialisé à charger depuis un pack vérifié."})
        elif kind == "external":
            if not node.get("capabilities"):
                issues.append({"node": node["id"], "message": "Opération externe non connectée : aucune publication ni livraison réelle disponible."})
            if any("A_CONFIRMER" in str(v) for v in node.get("operation", {}).values()):
                issues.append({"node": node["id"], "message": "Renseigner la cible et le candidat exacts du modèle avant exécution."})
        elif kind == "document" and not node.get("capabilities") and not node.get("content", "").strip():
            issues.append({"node": node["id"], "message": "Contenu du document ou capacité de lecture à configurer."})
        elif kind == "watch":
            if not node.get("capabilities"):
                issues.append({"node": node["id"], "message": "Connecteur de messagerie non connecté dans Tricorder."})
            if not node.get("sender") or not node.get("account"):
                issues.append({"node": node["id"], "message": "Compte et adresse d'expéditeur exacts à confirmer ; le nom NECA seul ne suffit pas."})
        elif kind == "communication":
            channel = node.get("channel", "slack")
            if not node.get("capabilities"):
                issues.append({"node": node["id"], "message": f"Connecteur {channel} non connecté dans Tricorder."})
            if not node.get("recipient"):
                issues.append({"node": node["id"], "message": "Canal ou destinataire exact à configurer avant activation."})
        elif kind == "task" and not node.get("capabilities"):
            issues.append({"node": node["id"], "message": "Travail de démonstration : choisir une commande ou un exécutant connecté."})
    return issues


def dispatch(engine, run_id):
    """Claim before spawn; a crash at either boundary never blindly respawns work."""
    run = engine.run(run_id)
    if run["status"] != "active":
        return run
    for nid, state in run["nodes"].items():
        if state["status"] != "ready":
            continue
        node = next(n for n in run["definition"]["nodes"] if n["id"] == nid)
        if run["definition"].get("driver") == "conversation" and node["kind"] in {"agent", "task", "document"}:
            continue  # The native conversation claims work; the graph remains authoritative.
        try:
            claim = engine.claim(run_id, nid)
        except ContractError:
            continue  # Another dispatcher/lock owner won the transaction.
        try:
            subprocess.Popen([sys.executable, str(Path(__file__).parents[1] / "studio.py"), "--state", str(engine.store.directory), "--worker", run_id, nid, claim["token"]],
                             stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True, close_fds=True)
        except OSError as exc:
            engine.submit(run_id, nid, claim["token"], {"ok": False, "summary": f"Lancement impossible : {exc.__class__.__name__}"})
    return engine.run(run_id)


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
        require(run["status"] != "cancelled", "Exécution annulée avant lancement de l'outil")
        if run["simulation"]:
            time.sleep(0.4)
            text = "SIMULATION — " + node.get("sample", f"Résultat d'exemple pour « {node['title']} ». Aucun outil métier ni service externe n'a été appelé.")
            result = {"ok": True, "summary": text, "simulated": True, "outputs": node.get("sample_outputs", {}), "evidence": [engine.artifact(text.encode())]}
        elif node.get("capabilities"):
            from connectors.tool_runtime import execute_tool
            result = execute_tool(engine, run, node, token)
            if node["kind"] == "agent":
                run["nodes"][node_id].setdefault("inputs", {})["tool_data"] = result["outputs"]
                generated = execute_text(engine, run, node, token, job)
                generated["evidence"] = result["evidence"] + generated.get("evidence", [])
                result = generated
        elif node["kind"] == "command":
            work = job / "work"
            work.mkdir(exist_ok=True)
            project = engine.project(run["project"])
            source = project.get("path")
            candidate = run["nodes"][node_id].get("inputs", {}).get("candidate")
            if candidate:
                from connectors.candidates import materialize
                source = materialize(engine, candidate, run["project"], job / "candidate")
            args = sandbox_argv(node["argv"], source, work)
            with (job / "output").open("wb") as output:
                process = subprocess.Popen(args, stdout=output, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, start_new_session=True, preexec_fn=_limits)
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
