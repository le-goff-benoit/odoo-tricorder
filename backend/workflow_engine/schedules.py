"""Recurring workflow snapshots. Occurrence and run are committed together.

The local application is the scheduler: while stopped, no work starts. On return,
at most one overdue occurrence is started; overlapping unfinished runs are skipped.
"""

from datetime import datetime, timedelta, timezone
import time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .contracts import require, validate
from .engine import new_id
from .runtime import preflight


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

    def create(self, project_id, graph, rule, simulation=False, now=None, library=None):
        validate(graph)
        now = time.time() if now is None else now
        issues = preflight(graph, simulation, self.engine.project(project_id)["defaults"], self.engine.project(project_id))
        require(not issues, " · ".join(i["message"] for i in issues))
        schedule = {"id": new_id("s"), "project": project_id, "title": graph["title"], "definition": graph, "library": library or {}, "rule": rule,
                    "scope": {"kind": self.engine.project(project_id).get("scope", "project"), "id": project_id},
                    "simulation": bool(simulation), "enabled": True, "created": now, "next": next_due(rule, now), "last_run": None, "last_status": "scheduled"}
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
                    run = self.engine.start(schedule["project"], schedule["definition"], simulation=schedule["simulation"], library=schedule["library"], connection=db,
                                            occurrence={"schedule": schedule["id"], "due": schedule["last_due"]})
                    schedule.update(last_run=run["id"], last_status="started")
                    started.append(run)
                db.execute("UPDATE schedules SET body=? WHERE id=?", (self.engine.store.encode(schedule), schedule["id"]))
        return started
