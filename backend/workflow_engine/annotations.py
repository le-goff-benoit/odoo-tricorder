"""Presentation-only notes, never executable blocks or agent instructions."""
import copy
import math


def validate_annotations(graph):
    from .contracts import identifier, require
    # layout has always been excluded from semantic_digest, including schema 1.
    # Do not repurpose arbitrary historical top-level fields.
    layout = graph.get("layout", {})
    if not isinstance(layout, dict) or "notes" not in layout:
        return
    notes = layout["notes"]
    require(isinstance(notes, list) and len(notes) <= 200, "Au plus 200 notes par workflow")
    seen = set()
    for note in notes:
        require(isinstance(note, dict) and set(note) <= {"id", "title", "text", "position", "size"},
                "Note invalide : texte et présentation uniquement")
        key = identifier(note.get("id"), "Note")
        require(key not in seen, "Identifiant de note dupliqué")
        seen.add(key)
        require(isinstance(note.get("title", ""), str) and len(note.get("title", "")) <= 160,
                "Titre de note limité à 160 caractères")
        require(isinstance(note.get("text"), str) and len(note["text"]) <= 20000,
                "Texte de note limité à 20 000 caractères")
        position = note.get("position")
        require(isinstance(position, dict) and set(position) == {"x", "y"} and
                all(type(position[k]) in (int, float) and math.isfinite(position[k]) and
                    0 <= position[k] <= 100000 for k in ("x", "y")), "Position de note invalide")
        if "size" in note:
            size = note["size"]
            require(isinstance(size, dict) and set(size) == {"width", "height"} and
                    all(type(size[k]) in (int, float) and math.isfinite(size[k]) and
                        160 <= size[k] <= 1000 for k in ("width", "height")), "Taille de note entre 160 et 1 000 pixels")


def without_annotations(graph):
    """Keep user presentation in saved originals; do not send it to workers."""
    graph = copy.deepcopy(graph)
    if isinstance(graph.get("layout"), dict):
        graph["layout"].pop("notes", None)
        if not graph["layout"]:
            graph.pop("layout")
    # Only descend through declared workflow boundaries. Business payloads may
    # legitimately contain fields named layout, notes or annotations.
    for node in graph.get("nodes", []):
        if node.get("kind") == "foreach" and isinstance(node.get("workflow"), dict):
            node["workflow"] = without_annotations(node["workflow"])
    for action in graph.get("actions", []):
        if isinstance(action.get("workflow"), dict):
            action["workflow"] = without_annotations(action["workflow"])
    return graph


def agent_view(value):
    """Strip only workflow presentation, never a business field named annotations."""
    value = copy.deepcopy(value)
    for key in ("definition", "original"):
        if isinstance(value.get(key), dict):
            value[key] = without_annotations(value[key])
    return value
