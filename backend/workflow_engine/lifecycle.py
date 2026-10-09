"""Reversible visibility changes; never erase runs, definitions or evidence."""
import time
from .contracts import require


def archive(engine, kind, key, archived, *, project=None, human=False):
    require(human and type(archived) is bool, "Archivage réservé à l’interface humaine")
    require(kind in {"project", "workflow", "conversation", "run", "schedule"}, "Élément inconnu")
    if kind == "workflow":
        graph = next((g for g in engine.workflows(project) if g["id"] == key), None)
        require(graph, "Workflow introuvable")
        if archived:
            from .schedules import Schedules
            require(not any(s["enabled"] and s["project"] == project and s["definition"]["id"] == key for s in Schedules(engine).list()), "Suspendre les planifications de ce workflow avant archivage")
        graph["archived"] = archived
        return engine.save(project, graph, graph["revision"])
    table = {"project": "projects", "conversation": "conversations", "run": "runs", "schedule": "schedules"}[kind]
    with engine.store.transaction() as db:
        value = engine.store.body(db.execute(f"SELECT body FROM {table} WHERE id=?", (key,)).fetchone())
        require(value, "Élément introuvable")
        if archived and kind in {"run", "conversation", "project"}:
            if kind == "run": runs = [value]
            else:
                field = "parameters.conversation" if kind == "conversation" else "project"
                runs = [engine.store.body(row) for row in db.execute("SELECT body FROM runs WHERE json_extract(body, '$." + field + "')=?", (key,))]
            require(not any(r["status"] in {"active", "paused"} or any(n["status"] == "running" for n in r["nodes"].values()) for r in runs), "Terminer ou annuler les exécutions et vérifier leurs tentatives avant archivage")
        if kind == "project":
            require(value.get("scope", "project") == "project" and not value.get("library"), "Ce contexte permanent ne peut pas être archivé")
            if archived:
                require(not db.execute("SELECT 1 FROM schedules WHERE json_extract(body, '$.project')=? AND json_extract(body, '$.enabled')=1", (key,)).fetchone(), "Suspendre les planifications du projet avant archivage")
        value["archived"] = archived
        value["archived_at"] = time.time() if archived else None
        if kind == "conversation": value["status"] = "closed" if archived else "open"
        if kind == "schedule" and archived: value["enabled"] = False
        db.execute(f"UPDATE {table} SET body=? WHERE id=?", (engine.store.encode(value), key))
        return {"id": key, "archived": archived}
