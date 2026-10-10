"""Durable user contributions. Closing a collection is not a plan approval."""
import copy
import time

from .contracts import require, validate_outputs
from .engine import new_id


def initialize(state):
    state.update(status="collecting", collection={"revision": 0, "items": [], "commands": {}})


def change(engine, rid, nid, revision, operation, *, key, item=None, text=None):
    require(type(revision) is int and revision >= 0, "Révision du recueil requise")
    require(isinstance(key, str) and 0 < len(key) <= 120, "Identifiant de contribution requis")
    require(operation in {"add", "update", "remove", "close"}, "Opération de recueil inconnue")
    if operation in {"add", "update"}:
        require(isinstance(text, str) and 0 < len(text.strip()) <= 12000, "Une contribution doit contenir de 1 à 12 000 caractères")
    with engine.store.transaction() as db:
        run = engine.run(rid, db)
        node = next((n for n in run["definition"]["nodes"] if n["id"] == nid), None)
        require(node and node["kind"] == "input", "Bloc de recueil introuvable")
        state = run["nodes"][nid]
        collection = state.get("collection", {})
        from .contracts import digest
        command = digest({"revision": revision, "operation": operation, "item": item, "text": text})
        previous = collection.get("commands", {}).get(key)
        if previous:
            require(previous == command, "Cette commande a déjà été reçue avec un autre contenu")
            return run
        require(run["status"] in {"active", "paused"} and state["status"] == "collecting",
                "Ce recueil est fermé. Une nouvelle intention nécessite une nouvelle version du travail.")
        require(collection["revision"] == revision, "Le recueil a changé. Relisez la liste avant de confirmer votre modification.")
        entries = collection["items"]
        specification = next(iter(node["outputs"].values()))
        maximum = specification.get("maxItems", 100) if isinstance(specification, dict) else 100
        if operation == "add":
            require(len(entries) < maximum, f"Ce recueil accepte au plus {maximum} contributions")
            entries.append({"id": new_id("i"), "text": text.strip(), "created": time.time()})
        elif operation in {"update", "remove"}:
            entry = next((e for e in entries if e["id"] == item), None)
            require(entry is not None, "Contribution introuvable ; actualisez le recueil")
            if operation == "remove":
                entries.remove(entry)
            else:
                entry.update(text=text.strip(), updated=time.time())
        else:
            port, specification = next(iter(node["outputs"].items()))
            item_type = specification.get("items", "any") if isinstance(specification, dict) else "any"
            values = [e["text"] for e in entries] if item_type == "string" else copy.deepcopy(entries)
            result = {"ok": True, "summary": f"{len(entries)} contribution(s) confirmée(s)", "outputs": {port: values}}
            validate_outputs(node, result)
            state.update(status="accepted", outcome="done", result=result,
                         receipt={"at": time.time(), "actor": "collection-confirmation", "revision": revision})
            collection["closed"] = time.time()
        require(sum(len(e["text"]) for e in entries) <= 60000,
                "Le recueil dépasse 60 000 caractères. Référencez les pièces longues plutôt que de les recopier.")
        require(operation == "close" or len(collection["commands"]) < 2000, "Historique de contributions plein ; terminez ce recueil")
        collection["commands"][key] = command
        collection["revision"] += 1
        engine._event(db, run, "collection-" + operation, nid, revision=collection["revision"], item=item)
        engine._advance(db, run)
        engine._save(db, run)
        return run
