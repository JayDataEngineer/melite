"""Contract snapshot — the recorded object_info for every node class
the estate's flows emit (PROVISIONING LAW's offline twin).

The incident (character flow attempts 5-8, 2026-09-06): the replay
walls pin what our renderers EMIT, not what ComfyUI ACCEPTS. RemeshMesh
went dynamic-combo upstream and every wall stayed green while the
workflow was unpostable — the wire spelling that validates is not the
spelling that executes (dotted top-level keys, "sign_mode.qef"; flat
keys validate nowhere; nested dicts validate but starve execute()).

This tool records the LIVE contract (GET /object_info/<Class> for
every class_type in every compiled flow) beside the core pin, and
tests/walls/suites/test_workflow_contracts.py asserts every emitted
workflow satisfies the recording. Refresh discipline: re-run at every
core pin bump (infra/comfyui/core.pin) and whenever a flow starts
using a new node class — the wall FAILS LOUDLY on an unrecorded class,
so drift is discovered at the wall, never on the GPU.

Usage:
    uv run python tools/contract_snapshot.py [--endpoint http://127.0.0.1:18466]

Writes infra/comfyui/contracts/object_info.json (atomic tmp+rename).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "py"))

from flow import load_flow  # noqa: E402  (path set above)

CONTRACTS_PATH = REPO / "infra" / "comfyui" / "contracts" / "object_info.json"
FLOWS_DIR = REPO / "flows"


def _get(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)


def collect_classes() -> dict[str, set[str]]:
    """class_type -> {flow names} across every compiled flow graph."""
    classes: dict[str, set[str]] = {}
    for f in sorted(FLOWS_DIR.glob("*/flow.py")):
        graph = load_flow(f.parent.name).to_graph()
        for node in graph.nodes:
            wf = (node.params or {}).get("workflow")
            if not isinstance(wf, dict):
                continue
            for entry in wf.values():
                cls = entry.get("class_type") if isinstance(entry, dict) else None
                if cls:
                    classes.setdefault(str(cls), set()).add(f.parent.name)
    return classes


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--endpoint", default="http://127.0.0.1:18466")
    args = ap.parse_args()

    classes = collect_classes()
    if not classes:
        print("no workflow node classes found in any flow — nothing to record")
        return 1

    stats = _get(args.endpoint + "/system_stats")
    version = (stats.get("system", {}) or {}).get(
        "comfyui_version") or stats.get("comfyui_version") or "unknown"

    nodes: dict[str, JsonValue] = {}
    missing: list[str] = []
    for cls in sorted(classes):
        try:
            entry = _get(args.endpoint + "/object_info/" + cls)
        except Exception as e:
            missing.append("%s (%s)" % (cls, e))
            continue
        nodes[cls] = entry[cls]

    if missing:
        print("MISSING on the live endpoint — install the extension or fix")
        print("the flow before recording:")
        for m in missing:
            print("  ", m)
        return 2

    doc = {
        "provenance": {
            "endpoint": args.endpoint,
            "comfyui_version": version,
            "core_pin": (REPO / "infra" / "comfyui" / "core.pin")
            .read_text().strip() if (REPO / "infra" / "comfyui" / "core.pin")
            .exists() else "",
            "captured": __import__("datetime").datetime.now().astimezone()
            .isoformat(timespec="seconds"),
            "flows": {k: sorted(v) for k, v in sorted(classes.items())},
        },
        "nodes": nodes,
    }
    CONTRACTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(CONTRACTS_PATH.parent),
                               suffix=".tmp")
    with os.fdopen(fd, "w") as fh:
        json.dump(doc, fh, indent=1, sort_keys=True)
        fh.write("\n")
    os.replace(tmp, CONTRACTS_PATH)
    print("recorded %d node classes from ComfyUI %s -> %s"
          % (len(nodes), version, CONTRACTS_PATH))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
