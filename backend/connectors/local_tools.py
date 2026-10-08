"""Explicitly trusted local adapters over bounded, one-shot JSON stdin/stdout.

Adapters run with the user's permissions and own their authentication. Tricorder
never loads their secrets. This is not a sandbox or an automatic MCP connection.
"""

import hashlib
import json
import os
from pathlib import Path
import selectors
import signal
import subprocess
import time

from workflow_engine.contracts import ContractError, digest, identifier, require

LIMIT = 2_000_000


def fingerprint(config):
    require(isinstance(config, dict) and set(config) <= {"argv", "timeout", "type", "identity", "operations"}, "Transport : argv et timeout uniquement, sans secret")
    require(config.get("type", "tricorder") in {"tricorder", "mcp-stdio"}, "Type de transport inconnu")
    if config.get("type") == "mcp-stdio":
        from .mcp_stdio import validate_config
        validate_config(config)
    else:
        require(set(config) <= {"argv", "timeout", "type"}, "Options MCP réservées au transport mcp-stdio")
    argv = config.get("argv")
    require(isinstance(argv, list) and 1 <= len(argv) <= 32 and all(isinstance(v, str) and 0 < len(v) <= 4096 and "\0" not in v for v in argv), "Arguments du transport invalides")
    require(Path(argv[0]).is_absolute() and os.access(argv[0], os.X_OK), "Exécutable absolu et installé requis")
    require(type(config.get("timeout", 30)) in (int, float) and 1 <= config.get("timeout", 30) <= 120, "Délai du transport entre 1 et 120 secondes")
    files = {}
    for argument in argv:
        path = Path(argument)
        if path.is_absolute() and path.is_file():
            require(path.stat().st_size <= 100_000_000, "Fichier du transport trop volumineux")
            files[str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
    return digest({"config": config, "files": files})


def exchange(config, payload, *, check=None, timeout=None):
    if config.get("type") == "mcp-stdio":
        from .mcp_stdio import exchange as mcp_exchange
        return mcp_exchange(config, payload, check=check, timeout=timeout)
    data = json.dumps(payload, ensure_ascii=False).encode()
    require(len(data) <= LIMIT, "Requête de transport trop volumineuse")
    # No inherited tokens/API keys. Adapter-managed OAuth/configuration remains
    # the adapter's responsibility; execution itself is explicitly trusted.
    env = {k: os.environ[k] for k in ("HOME", "PATH", "LANG", "XDG_CONFIG_HOME", "XDG_RUNTIME_DIR") if k in os.environ}
    process = subprocess.Popen(config["argv"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                               env=env, cwd="/", start_new_session=True, close_fds=True)
    selector = selectors.DefaultSelector()
    out = bytearray()
    sent = 0
    try:
        os.set_blocking(process.stdin.fileno(), False)
        os.set_blocking(process.stdout.fileno(), False)
        selector.register(process.stdin, selectors.EVENT_WRITE)
        selector.register(process.stdout, selectors.EVENT_READ)
        deadline = time.monotonic() + (timeout or config.get("timeout", 30))
        while selector.get_map():
            if check:
                check()
            if time.monotonic() >= deadline:
                raise TimeoutError("Délai du transport dépassé ; vérifier les opérations externes avant reprise")
            for key, _ in selector.select(0.1):
                if key.fileobj is process.stdin:
                    sent += os.write(process.stdin.fileno(), data[sent:sent + 65536])
                    if sent == len(data):
                        selector.unregister(process.stdin)
                        process.stdin.close()
                else:
                    chunk = os.read(process.stdout.fileno(), 65536)
                    if not chunk:
                        selector.unregister(process.stdout)
                    else:
                        out.extend(chunk)
                        require(len(out) <= LIMIT, "Réponse du transport trop volumineuse")
        process.wait(timeout=max(0.01, deadline - time.monotonic()))
        require(process.returncode == 0, "Le transport a échoué ; consulter ses diagnostics locaux")
        try:
            result = json.loads(out)
        except (ValueError, UnicodeError):
            raise ContractError("Réponse JSON du transport invalide") from None
        require(isinstance(result, dict), "Réponse objet du transport requise")
        return result
    finally:
        # Descendants may hold pipes even after the adapter itself exited.
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait()
        selector.close()
        if not process.stdin.closed:
            process.stdin.close()
        process.stdout.close()


def inspect(engine, project, plugin):
    from workflow_engine.integrations import catalog
    item = next((p for p in catalog(project)["plugins"] if p["id"] == plugin), None)
    require(item and item.get("transport"), "Adaptateur local à configurer dans plugins.json")
    return {"plugin": plugin, "config": item["transport"], "fingerprint": fingerprint(item["transport"]), "descriptor": digest(item)}


def approved(engine, project, plugin):
    preview = inspect(engine, project, plugin)
    with engine.store.connect() as db:
        record = engine.store.body(db.execute("SELECT body FROM tool_trust WHERE project=? AND plugin=?", (project["id"], plugin)).fetchone())
    require(record and record["fingerprint"] == preview["fingerprint"] and record["descriptor"] == preview["descriptor"], "Transport non qualifié ou modifié : vérification humaine requise")
    return record


def qualify(engine, project, plugin, expected, *, human=False):
    require(human, "Vérification du transport réservée à l'interface humaine")
    preview = inspect(engine, project, plugin)
    require(expected == digest(preview), "Configuration du transport modifiée depuis sa présentation")
    response = exchange(preview["config"], {"protocol": "tricorder.tool/1", "action": "describe"}, timeout=8)
    require(response.get("protocol") == "tricorder.tool/1" and response.get("connected") is True, "Adaptateur non connecté ou protocole incompatible")
    identity = response.get("identity")
    require(isinstance(identity, str) and 0 < len(identity) <= 200, "Identité du compte ou service requise (référence non secrète)")
    operations = response.get("operations")
    require(isinstance(operations, dict) and 0 < len(operations) <= 100, "Capacités vérifiées absentes")
    for name, effect in operations.items():
        identifier(name, "Opération")
        require(effect in {"read", "notify", "write"}, "Effet read, notify ou write requis")
    require(inspect(engine, project, plugin) == preview, "Transport modifié pendant la vérification")
    record = {**preview, "identity": identity, "operations": operations, "tool_digest": response.get("tool_digest"), "verified_at": time.time()}
    with engine.store.transaction() as db:
        db.execute("INSERT OR REPLACE INTO tool_trust VALUES (?, ?, ?)", (project["id"], plugin, engine.store.encode(record)))
    return record
