"""Conservative local worker identity and explicit recovery, without respawn."""
import os
from pathlib import Path
import time
from .contracts import require
from .engine import run_driver


def identity(pid):
    try:
        fields = Path(f"/proc/{int(pid)}/stat").read_text().rsplit(")", 1)[1].split()
        if fields[0] == "Z":
            return None
        return {"pid": int(pid), "start": fields[19], "session": int(fields[3]),
                "boot": Path("/proc/sys/kernel/random/boot_id").read_text().strip()}
    except (OSError, ValueError, IndexError):
        return None


def alive(record, *, native=False):
    if not record: return False
    if identity(record["pid"]) == record: return True
    if record.get("session") != record["pid"] and not native: return False
    # A group leader may exit while children continue. A native CLI shares its
    # terminal session with the older shell: conservatively keep any process
    # started since the CLI in that session, even if it was reparented on exit.
    # The boot and start checks exclude a new PID on another boot.
    for proc in Path("/proc").iterdir():
        if proc.name.isdigit():
            if native and int(proc.name) == record.get("session") and record["session"] != record["pid"]:
                continue  # The persistent terminal shell predates this CLI.
            current = identity(int(proc.name))
            if current and current["boot"] == record["boot"] and current["session"] == record["session"] and int(current["start"]) >= int(record["start"]):
                return True
    return False


def tracked_argv(engine, rid, nid, token, argv):
    import sys
    return [sys.executable, str(Path(__file__).parents[1] / "tracked_launch.py"), str(engine.store.directory), rid, nid, token, *argv]


def diagnostic(engine, run, nid):
    state = run["nodes"][nid]
    if state["status"] != "running":
        return {"recoverable": False, "reason": "Aucune tentative en cours"}
    if (engine.store.directory / "jobs" / state["token"] / "result.json").is_file():
        return {"recoverable": False, "result_available": True, "reason": "Un résultat est enregistré : le réconcilier"}
    records = state.get("processes", [])
    if any(alive(record, native=state.get("ownership") == "native") for record in records):
        return {"recoverable": False, "reason": "Un processus de cette tentative est encore actif"}
    # Covers the boundary between spawn and registration. A matching live worker
    # prevents recovery even if its parent crashed before recording its PID.
    for proc in Path("/proc").iterdir():
        if not proc.name.isdigit():
            continue
        try:
            if proc.stat().st_uid == os.getuid() and state["token"].encode() in (proc / "cmdline").read_bytes().split(b"\0") and identity(int(proc.name)):
                return {"recoverable": False, "reason": "Un worker de cette tentative est encore actif"}
        except OSError:
            pass
    try:
        boot_at = time.time() - float(Path("/proc/uptime").read_text().split()[0])
    except (OSError, ValueError):
        boot_at = 0
    if not state.get("ownership") and not records and state["started"] >= boot_at:
        return {"recoverable": False, "reason": "Ancienne tentative sans identité vérifiable. Réconcilier son résultat ou terminer son agent ; après redémarrage de l’ordinateur, l’arrêt des processus locaux sera vérifiable."}
    if (state.get("ownership") == "native" or (run_driver(run) == "conversation" and not state.get("ownership"))) and not records and state["started"] >= boot_at:
        return {"recoverable": False, "reason": "Agent natif sans identité vérifiable : un heartbeat ancien ne prouve pas son arrêt. Retrouver la conversation pour terminer le bloc."}
    if not records and time.time() - state.get("heartbeat", state["started"]) < 15:
        return {"recoverable": False, "reason": "Réservation récente : attendre la fin du délai de lancement (15 s)"}
    if state.get("pid") and not records and state["started"] >= boot_at and identity(state["pid"]):
        return {"recoverable": False, "reason": "Ancienne tentative : processus encore présent, identité à vérifier"}
    return {"recoverable": True, "reason": "Aucun processus de cette tentative n’est actif ; aucune relance automatique"}


def finish(engine, rid, nid, *, human=False):
    require(human, "Fin de tentative réservée à l’interface humaine")
    with engine.store.transaction() as db:
        run = engine.run(rid, db)
        check = diagnostic(engine, run, nid)
        require(check["recoverable"], check["reason"])
        state = run["nodes"][nid]
        node = next(n for n in run["definition"]["nodes"] if n["id"] == nid)
        uncertain = node["kind"] in {"external", "communication"} or bool(node.get("capabilities"))
        state.update(status="returned", finished=time.time(), interrupted=True,
                     result={"ok": False, "outputs": {}, "summary": "Tentative interrompue. " + ("Effet externe potentiellement incertain : vérifier l’accusé, puis créer une nouvelle proposition et un nouvel accord." if uncertain else "Aucun résultat enregistré. Une reprise explicite est nécessaire.")})
        state["effect_uncertain"] = uncertain
        db.execute("DELETE FROM resources WHERE run=? AND node=? AND token=?", (rid, nid, state["token"]))
        engine._event(db, run, "attempt-interrupted", nid, token=state["token"], effect_uncertain=uncertain)
        engine._save(db, run)
        return run
