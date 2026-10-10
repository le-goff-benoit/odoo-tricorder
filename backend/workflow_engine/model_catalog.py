"""Read model names from explicitly allowed, non-secret local metadata only."""

import json
from pathlib import Path


def _read(path, limit):
    try:
        if path.stat().st_size > limit:
            return {}
        value = json.loads(path.read_text())
        return value if isinstance(value, dict) else {}
    except (OSError, ValueError, TypeError):
        return {}


def provider_models(home=None):
    """A catalogue is a suggestion, never proof of account access or readiness.

    Do not inspect CLI settings, credentials, identity metadata or the keyring.
    Only model IDs and display names leave this function.
    """
    root = Path(home) if home is not None else Path.home()
    result = {"codex": [], "claude": []}

    def add(provider, identifier, label=None, source="local-policy"):
        if provider not in result or not isinstance(identifier, str) or not identifier.strip() or len(identifier) > 100:
            return
        if any(item["id"] == identifier for item in result[provider]):
            return
        label = label if isinstance(label, str) and 0 < len(label) <= 150 else identifier
        result[provider].append({"id": identifier, "label": label, "source": source})

    cache = _read(root / ".codex/models_cache.json", 4_000_000)
    models = cache.get("models", [])
    for model in models if isinstance(models, list) else []:
        if isinstance(model, dict) and model.get("visibility") == "list":
            add("codex", model.get("slug"), model.get("display_name"), "local-catalogue")
    policy = _read(root / ".odoo19-agents/workflows/model-policy.json", 100_000)
    principal = policy.get("principal", {})
    if isinstance(principal, dict):
        for provider, identifier in principal.items():
            add(provider, identifier)
    roles = policy.get("roles", {})
    for role in roles.values() if isinstance(roles, dict) else []:
        candidates = role.get("candidate") if isinstance(role, dict) else None
        for provider, candidate in candidates.items() if isinstance(candidates, dict) else []:
            if isinstance(candidate, dict):
                add(provider, candidate.get("model"))
    return result
