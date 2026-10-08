"""Durable idempotency boundary for future authenticated transports.

Adapters are supplied by the caller. No service credential, URL or provider SDK
is selected here; this contract is tested with independent synthetic transports.
"""

import json
import time
from email.utils import parseaddr

from workflow_engine.contracts import digest, require


def matching_messages(messages, sender, since):
    """Exact address, new messages only. Display names and message instructions are data."""
    require(isinstance(sender, str) and "@" in sender, "Adresse exacte de l'expéditeur requise")
    expected = sender.strip().casefold()
    seen = set()
    for message in messages:
        mid = message.get("id")
        if not mid or mid in seen or message.get("received", 0) <= since:
            continue
        seen.add(mid)
        if parseaddr(message.get("sender", ""))[1].casefold() == expected:
            yield message


class Effects:
    def __init__(self, store):
        self.store = store
        with store.transaction() as db:
            db.execute("CREATE TABLE IF NOT EXISTS effects(id TEXT PRIMARY KEY, body TEXT NOT NULL)")

    def perform(self, operation, authorization, event_id, send):
        require(authorization.get("operation") == digest(operation) and authorization.get("approved") is True, "Autorisation invalide pour cette cible et ce contenu")
        key = digest({"operation": operation, "event": event_id})
        with self.store.transaction() as db:
            row = db.execute("SELECT body FROM effects WHERE id=?", (key,)).fetchone()
            if row:
                return json.loads(row["body"])
            record = {"id": key, "operation": operation, "event": event_id, "status": "uncertain", "started": time.time()}
            db.execute("INSERT INTO effects VALUES (?, ?)", (key, self.store.encode(record)))
        # Commit intent first. A lost response must never result in a blind resend.
        try:
            receipt = send(operation, key)
            require(isinstance(receipt, dict) and receipt.get("id"), "Accusé de réception distant absent")
            record.update(status="sent", receipt=receipt, finished=time.time())
        except (TimeoutError, OSError):
            record["reason"] = "Résultat distant inconnu : réconciliation nécessaire avant toute autre action"
        with self.store.transaction() as db:
            db.execute("UPDATE effects SET body=? WHERE id=?", (self.store.encode(record), key))
        return record


def confluence_update(read_page, write_page, proposal):
    """Version checked before write; transport must send that version atomically."""
    page = read_page(proposal["page"])
    require(page["version"] == proposal["base_version"], "Page Confluence modifiée depuis la préparation")
    require(page["space"] == proposal["space"], "Espace Confluence différent de la proposition")
    receipt = write_page({"id": proposal["page"], "space": proposal["space"], "version": proposal["base_version"] + 1, "title": proposal["title"], "body": proposal["body"]})
    current = read_page(proposal["page"])
    require(current["version"] == receipt["version"] and current["body"] == proposal["body"], "Publication Confluence déclenchée mais contenu/version non vérifiés")
    return {"id": current["id"], "version": current["version"], "url": current["url"], "verified": True}


def deployment_verdict(candidate, tested_candidate, target, observations):
    require(candidate == tested_candidate, "Le candidat proposé n'est pas celui qui a été testé")
    require(observations.get("target") == target, "Observation d'une autre cible")
    if observations.get("published_sha") != candidate:
        return "publication-unverified"
    if observations.get("build_sha") != candidate or observations.get("build_status") != "success":
        return "build-unverified"
    if observations.get("deployed_sha") != candidate or observations.get("health") != "pass":
        return "deployment-unverified"
    return "verified"
