"""Inspect structural execution metadata, never customer requests or results.

This probe deliberately avoids Engine/Conversations.snapshot: that read API may
resume dependency waits. The SQLite connection and transaction are read-only.
All identifiers are replaced with local positions in the exported evidence.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sqlite3

parser = argparse.ArgumentParser()
parser.add_argument("database", type=Path)
parser.add_argument("--project-fragment", required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
assert not args.output.exists(), "Evidence already exists; choose another name"
db = sqlite3.connect(args.database.resolve().as_uri() + "?mode=ro", uri=True)
db.execute("PRAGMA query_only=ON")
db.execute("BEGIN")
projects = db.execute("SELECT id FROM projects WHERE instr(lower(json_extract(body,'$.title')),lower(?))>0", (args.project_fragment,)).fetchall()
assert len(projects) == 1
cid = db.execute("SELECT id FROM conversations WHERE json_extract(body,'$.project')=? ORDER BY rowid DESC LIMIT 1", (projects[0][0],)).fetchone()[0]
items = db.execute("SELECT json_extract(i.value,'$.id'),json_extract(i.value,'$.run'),json_extract(i.value,'$.depends_on') FROM conversations c,json_each(c.body,'$.items') i WHERE c.id=? ORDER BY cast(i.key AS INTEGER)", (cid,)).fetchall()
positions = {item[0]: index + 1 for index, item in enumerate(items)}
results, hashes = [], []
for index, (_, rid, deps) in enumerate(items):
    status, wait, hold, graph = db.execute("SELECT json_extract(body,'$.status'),json_extract(body,'$.coordination_wait'),json_extract(body,'$.coordination_hold'),json_extract(body,'$.original') FROM runs WHERE id=?", (rid,)).fetchone()
    hashes.append(hashlib.sha256(graph.encode()).hexdigest())
    kinds = dict(db.execute("SELECT json_extract(n.value,'$.id'),json_extract(n.value,'$.kind') FROM runs r,json_each(r.body,'$.definition.nodes') n WHERE r.id=?", (rid,)).fetchall())
    states = db.execute("SELECT n.key,json_extract(n.value,'$.status'),json_extract(n.value,'$.result.ok'),json_extract(n.value,'$.result.outputs.verdict'),json_extract(n.value,'$.outcome'),json_extract(n.value,'$.attempt'),json_type(n.value,'$.validation_error') FROM runs r,json_each(r.body,'$.nodes') n WHERE r.id=? ORDER BY n.key", (rid,)).fetchall()
    nodes = [{"position": pos + 1, "kind": kinds.get(node), "state": state, "ok": ok, "failed_verdict": verdict == "fail", "approved": outcome == "approve", "attempt": attempt, "has_validation_error": error not in (None, "null")} for pos, (node, state, ok, verdict, outcome, attempt, error) in enumerate(states)]
    results.append({"item": index + 1, "depends_on_items": [positions[d] for d in json.loads(deps or '[]')], "status": status, "coordination_wait": bool(wait), "manual_hold": bool(hold), "nodes": nodes})
evidence = {"method": "SQLite mode=ro + PRAGMA query_only=ON + read transaction; no application API", "privacy": "No request, title, source, result content, customer identifier or timestamp exported", "same_original_definition": len(set(hashes)) == 1, "items": results}
db.rollback()
db.close()
args.output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"items": len(items), "same_original_definition": evidence["same_original_definition"], "output": str(args.output)}))
