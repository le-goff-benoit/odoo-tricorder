"""Recurring workflow snapshots. Occurrence and run are committed together.

The local application is the scheduler: while stopped, no work starts. On return,
at most one overdue occurrence is started; overlapping unfinished runs are skipped.
"""

from datetime import datetime, timedelta, timezone
import math
import time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .contracts import ContractError, require, validate, expand, digest
from .engine import new_id
from .runtime import preflight


def fresh_source_since(schedule, previous):
    """Advance only successful coverage, keeping a one-item backlog and ties.

    A failed/cancelled occurrence leaves the watermark unchanged. Selected
    items advance to just before their timestamp, so other items with the same
    date are still read; durable consumption excludes only successful items.
    An empty successful read covers its due time, never its later finish time.
    Historical schedules retain their original polling window.
    """
    configured = schedule["definition"].get("schedule_source", {})
    since = schedule.get("source_since", schedule["created"])
    if configured.get("version") != 1 or configured.get("mode") != "connection":
        return schedule["created"]
    if not previous or previous["status"] != "completed" or previous.get("completion_outcome") != "succeeded":
        return since
    message = previous["nodes"].get(configured["node"], {}).get("result", {}).get("outputs", {}).get("message", {})
    timestamp = message.get("received")
    if message.get("id") and type(timestamp) in (int, float) and math.isfinite(timestamp):
        return max(since, timestamp - 0.000001)
    return max(since, previous.get("occurrence", {}).get("due", since))


def validate_schedule_source(graph):
    configuration = graph.get("schedule_source")
    if configuration is None:
        return
    require(isinstance(configuration, dict) and set(configuration) == {"version", "mode", "node"}
            and configuration["version"] == 1 and configuration["mode"] in {"fixed", "connection"},
            "Source de planification invalide")
    source = next((node for node in graph["nodes"] if node["id"] == configuration["node"]), None)
    require(source is not None, "Étape de source absente de la planification")
    source_keys = {"schedule_fixed_source", "schedule_source_query", "schedule_source_scope"}
    require(all(not source_keys.intersection(node.get("parameters", {})) for node in graph["nodes"]),
            "Les paramètres d’une étape ne peuvent pas remplacer la source conservée pour cette planification")
    if configuration["mode"] == "connection":
        roots = [node["id"] for node in graph["nodes"] if not any(edge["to"] == node["id"] for edge in graph["edges"])]
        outgoing = [edge for edge in graph["edges"] if edge["from"] == source["id"]]
        require(roots == [source["id"]] and len(outgoing) == 1,
                "Tous les travaux doivent attendre la lecture et la présence d’une nouvelle source")
        gate = next(node for node in graph["nodes"] if node["id"] == outgoing[0]["to"])
        branches = [edge for edge in graph["edges"] if edge["from"] == gate["id"]]
        require(gate["kind"] == "condition" and gate.get("parameter") == "match"
                and set(gate.get("options", [])) == {"yes", "no"}
                and outgoing[0].get("mapping") == {"match": "match", "message": "message"}
                and branches and all(edge.get("outcome") == "yes" for edge in branches),
                "La méthode ne doit effectuer aucun travail quand la recherche ne trouve aucune source")
        polling = source.get("source_polling", {})
        require(source["kind"] == "watch" and isinstance(polling, dict)
                and set(polling) == {"version", "query", "scope"} and polling.get("version") == 1
                and isinstance(polling.get("query"), str) and 0 < len(polling["query"].strip()) <= 2000
                and isinstance(polling.get("scope"), str) and 0 < len(polling["scope"].strip()) <= 200,
                "La planification doit conserver sa recherche et son périmètre de lecture")
    else:
        roots = [node["id"] for node in graph["nodes"] if not any(edge["to"] == node["id"] for edge in graph["edges"])]
        require(roots == [source["id"]], "Tous les travaux doivent attendre le texte fixe fourni")
        require(source["kind"] == "agent" and set(source.get("required_capabilities", [])) == {"text"}
                and not source.get("capabilities") and source.get("execution_mode", "text") == "text"
                and source.get("execution_driver", "delegated") == "delegated",
                "Une source fixe doit être explicitement limitée au texte fourni")


def next_due(rule, after):
    try:
        zone = ZoneInfo(rule.get("timezone", "Europe/Zurich"))
    except (ZoneInfoNotFoundError, TypeError):
        raise ValueError("Fuseau horaire inconnu") from None
    kind = rule.get("kind")
    require(kind in {"daily", "weekly", "interval"}, "Fréquence inconnue")
    if kind == "interval":
        minutes = rule.get("minutes")
        require(isinstance(minutes, int) and 5 <= minutes <= 525600, "Intervalle compris entre 5 minutes et 365 jours")
        return after + minutes * 60
    try:
        hour, minute = map(int, rule.get("time", "09:00").split(":"))
    except (ValueError, TypeError, AttributeError):
        raise ValueError("Heure attendue au format HH:MM") from None
    require(0 <= hour < 24 and 0 <= minute < 60, "Heure invalide")
    weekdays = rule.get("weekdays", [0, 1, 2, 3, 4]) if kind == "weekly" else list(range(7))
    require(isinstance(weekdays, list) and weekdays and all(isinstance(d, int) and 0 <= d <= 6 for d in weekdays), "Jours de semaine invalides")
    date = datetime.fromtimestamp(after, zone).date()
    for offset in range(370):
        day = date + timedelta(days=offset)
        if day.weekday() not in weekdays:
            continue
        local = datetime(day.year, day.month, day.day, hour, minute, tzinfo=zone, fold=0)
        utc = local.astimezone(timezone.utc)
        # Skip nonexistent wall-clock times, execute ambiguous times only once.
        if utc.astimezone(zone).replace(tzinfo=None) != local.replace(tzinfo=None):
            continue
        if utc.timestamp() > after:
            return utc.timestamp()
    raise ValueError("Prochaine occurrence introuvable")


class Schedules:
    def __init__(self, engine):
        self.engine = engine

    def list(self):
        with self.engine.store.connect() as db:
            return [self.engine.store.body(row) for row in db.execute("SELECT body FROM schedules ORDER BY id")]

    def create(self, project_id, graph, rule, simulation=False, now=None, library=None, notifications_authorized=False, parameters=None):
        validate(graph)
        validate_schedule_source(graph)
        now = time.time() if now is None else now
        project = self.engine.project(project_id)
        graph = expand(graph, library or {})
        from .launch_fields import resolve_parameters
        parameters = resolve_parameters(graph, parameters)
        if graph.get("schedule_source", {}).get("mode") == "fixed":
            content = parameters.get("schedule_fixed_source")
            require(isinstance(content, str) and 0 < len(content.strip()) <= 48000,
                    "Fournir le texte fixe effectivement conservé dans cette planification")
        from .packs import resolve_profiles, policy_issues
        if not simulation:
            graph = resolve_profiles(project, graph)
        issues = preflight({**graph, "parameters": parameters}, simulation, project["defaults"], project, self.engine)
        if not simulation:
            issues += policy_issues(project, {**graph, "parameters": parameters})
            from .notifications import execution_nodes
            if any(n["kind"] == "communication" for n in execution_nodes(graph)):
                require(notifications_authorized, "Autoriser explicitement les notifications de cette révision avant activation")
        require(not issues, " · ".join(i["message"] for i in issues))
        schedule = {"id": new_id("s"), "project": project_id, "title": graph["title"], "definition": graph, "parameters": parameters, "library": library or {}, "rule": rule,
                    "scope": {"kind": self.engine.project(project_id).get("scope", "project"), "id": project_id},
                    "notifications_authorized": bool(notifications_authorized), "simulation": bool(simulation), "enabled": True, "created": now, "next": next_due(rule, now), "last_run": None, "last_status": "scheduled"}
        from .integrations import catalog
        schedule["plugins_digest"] = catalog(project)["sha256"]
        schedule["project_config_digest"] = digest({"defaults": project["defaults"], "packs": project.get("packs", [])})
        schedule["transports"] = {}
        if not simulation:
            from connectors.local_tools import approved
            from .notifications import execution_nodes
            for node in execution_nodes(graph):
                for binding in node.get("capabilities", []):
                    schedule["transports"][binding["plugin"]] = approved(self.engine, project, binding["plugin"])
        with self.engine.store.transaction() as db:
            db.execute("INSERT INTO schedules VALUES (?, ?)", (schedule["id"], self.engine.store.encode(schedule)))
        return schedule

    def toggle(self, schedule_id, enabled):
        require(isinstance(enabled, bool), "Activation attendue : booléen")
        with self.engine.store.transaction() as db:
            schedule = self.engine.store.body(db.execute("SELECT body FROM schedules WHERE id=?", (schedule_id,)).fetchone())
            require(schedule is not None, "Récurrence introuvable")
            schedule["enabled"] = enabled
            if enabled:
                schedule["next"] = next_due(schedule["rule"], time.time())
            db.execute("UPDATE schedules SET body=? WHERE id=?", (self.engine.store.encode(schedule), schedule_id))
        return schedule

    def tick(self, now=None):
        now = time.time() if now is None else now
        started = []
        with self.engine.store.transaction() as db:
            for row in db.execute("SELECT body FROM schedules").fetchall():
                schedule = self.engine.store.body(row)
                if not schedule["enabled"] or schedule["next"] > now:
                    continue
                previous = self.engine.run(schedule["last_run"], db) if schedule.get("last_run") else None
                schedule["last_due"] = schedule["next"]
                schedule["next"] = next_due(schedule["rule"], now)
                if previous and previous["status"] in {"active", "paused"}:
                    schedule["last_status"] = "skipped-overlap"
                else:
                    schedule["source_since"] = fresh_source_since(schedule, previous)
                    db.execute("SAVEPOINT occurrence")
                    try:
                        project = self.engine.project(schedule["project"], db)
                        if not schedule["simulation"]:
                            require(schedule.get("project_config_digest") == digest({"defaults": project["defaults"], "packs": project.get("packs", [])}), "Modèles ou packs du contexte modifiés : recréer la récurrence après vérification")
                            from .integrations import catalog
                            from connectors.local_tools import approved
                            require(schedule.get("plugins_digest") == catalog(project)["sha256"], "Catalogue modifié : recréer la récurrence après vérification")
                            for plugin, expected in schedule.get("transports", {}).items():
                                require(approved(self.engine, project, plugin) == expected, "Transport modifié : recréer la récurrence après vérification")
                            issues = preflight({**schedule["definition"], "parameters": schedule.get("parameters", schedule["definition"].get("parameters", {}))}, False, project["defaults"], project, self.engine)
                            require(not issues, " · ".join(i["message"] for i in issues))
                        run = self.engine.start(schedule["project"], schedule["definition"], simulation=schedule["simulation"], library=schedule["library"], connection=db,
                                                notifications_authorized=schedule.get("notifications_authorized", False), parameters=schedule.get("parameters"),
                                                occurrence={"schedule": schedule["id"], "due": schedule["last_due"], "since": schedule["source_since"]})
                        schedule.update(last_run=run["id"], last_status="started")
                        started.append(run)
                    except (ContractError, OSError, ValueError) as exc:
                        db.execute("ROLLBACK TO occurrence")
                        schedule.update(enabled=False, last_status="blocked", error=str(exc))
                    finally:
                        db.execute("RELEASE occurrence")
                db.execute("UPDATE schedules SET body=? WHERE id=?", (self.engine.store.encode(schedule), schedule["id"]))
        return started
