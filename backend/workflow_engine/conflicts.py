"""Three-way workflow merge, with explicit choices for conflicting fields."""
import copy
import json
from .contracts import digest, require, validate

MISSING = object()


def merge(base, mine, disk, choices=None):
    conflicts = []
    choices = choices or {}
    def combine(a, b, c, path):
        if b == c or c == a: return copy.deepcopy(b) if b is not MISSING else MISSING
        if b == a: return copy.deepcopy(c) if c is not MISSING else MISSING
        if all(isinstance(v, dict) for v in (a, b, c)):
            result = {}
            for key in sorted(set(a) | set(b) | set(c)):
                value = combine(a.get(key, MISSING), b.get(key, MISSING), c.get(key, MISSING), path + "/" + key)
                if value is not MISSING: result[key] = value
            return result
        if path in {"/nodes", "/edges"} and all(isinstance(v, list) for v in (a, b, c)):
            indexed = [{v["id"]: v for v in seq} for seq in (a, b, c)]
            values = combine(*indexed, path)
            order = list(dict.fromkeys([v["id"] for v in b + c]))
            return [values[key] for key in order if key in values]
        selected = choices.get(path)
        require(selected in {None, "mine", "disk"}, "Choix de conflit invalide")
        if selected is None:
            conflicts.append({"path": path, "base": None if a is MISSING else a, "mine": None if b is MISSING else b, "disk": None if c is MISSING else c})
        value = c if selected == "disk" else b
        return copy.deepcopy(value) if value is not MISSING else MISSING
    return combine(base, mine, disk, ""), conflicts


def inspect(engine, project, draft, revision, choices=None):
    with engine.store.connect() as db:
        base = engine.store.body(db.execute("SELECT body FROM workflows WHERE project=? AND id=? AND revision=?", (project, draft["id"], revision)).fetchone())
    require(base, "Révision de base introuvable")
    path = engine.workflow_path(project, draft["id"])
    require(path.is_file() and path.stat().st_size <= 2_000_000, "Fichier absent ou trop volumineux")
    raw = path.read_text()
    try:
        disk = json.loads(raw)
        validate(disk)
        require(disk["id"] == draft["id"], "Identifiant du fichier modifié")
    except (ValueError, TypeError) as error:
        return {"base": base, "mine": draft, "disk_text": raw, "error": str(error), "digest": digest(raw)}
    merged, conflicts = merge(base, draft, disk, choices)
    merged.pop("_project", None)
    return {"base": base, "mine": draft, "disk": disk, "merged": merged, "conflicts": conflicts, "digest": digest(raw)}


def resolve(engine, project, draft, revision, expected, strategy, choices=None):
    preview = inspect(engine, project, draft, revision, choices)
    require(preview["digest"] == expected, "Le fichier a encore changé : comparer de nouveau")
    require(strategy in {"merge", "disk", "copy"}, "Résolution inconnue")
    if strategy == "copy":
        from .engine import new_id
        result = copy.deepcopy(draft)
        result.update(id=new_id("copy-"), title=draft["title"] + " · copie")
        result.pop("revision", None)
        result.pop("_project", None)
        return engine.save(project, result)
    require(not preview.get("error"), preview.get("error", "Fichier invalide"))
    require(strategy != "merge" or not preview["conflicts"], "Choisir la version de chaque champ en conflit")
    result = preview["disk"] if strategy == "disk" else preview["merged"]
    latest = next(g for g in engine.workflows(project) if g["id"] == draft["id"])
    # A concurrent disk write is checked again under the save transaction.
    return engine.save(project, result, latest["revision"], from_disk=True, expected_disk=expected)
