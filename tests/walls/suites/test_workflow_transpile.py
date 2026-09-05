#!/usr/bin/env python3
"""WORKFLOW TRANSPILE WALL — pins the subgraph-inlining trick.

tools/workflow_transpile.py turns author workflows (web-UI format)
into API format / ComfyScript python. The trick — inlining subgraph
template instances — is subtle enough that two real bugs shipped in
it (widget-boundary links treated as graph edges; internal link ids
never remapped to parent space). This wall pins every rule with a
synthetic workflow: NO live ComfyUI, no network — the object_info
fixture is hand-authored for three fake classes.

Rules pinned:
  - sentinel -10 (input boundary) / -20 (output boundary) wiring
  - instance widgets_values override the exposed WIDGET inputs
    (COMBO/FLOAT/...), landing on the internal consumer's slot
  - widget-boundary links are NOT graph edges (consumer socket
    clears; the value rides the override channel)
  - internal-to-internal links remap to parent lids and stay
    resolvable
  - dangling internal links (author debris) sever LOUDLY
  - UI-only debris (Note/MarkdownNote/rgthree) drops, severed ends
  - API output shape: {id: {class_type, inputs:{name: val|[src,slot]}}}
"""

import json
import sys
from pathlib import Path

from _anchor import REPO
sys.path.insert(0, str(REPO / "tools"))

import workflow_transpile as wt  # noqa: E402

PASS, FAIL = [], []


def check(name: str, ok: bool, detail: str = "") -> None:
    (PASS if ok else FAIL).append(name)
    print("  %s   %s%s" % ("ok" if ok else "FAIL", name,
                           "" if ok else ": %s" % detail))


# ── the vocabulary fixture (three fake classes) ─────────────────────
OI = {
    "FakeLoader": {"input": {"required": {
        "ckpt": [["a", "b"], {}],
        "scale": ["FLOAT", {}],
    }}},
    "FakeSampler": {"input": {"required": {
        "model": ["MODEL", {}],
        "steps": ["INT", {}],
    }}},
    "FakeSave": {"input": {"required": {
        "latent": ["LATENT", {}],
    }}},
}

# ── the synthetic workflow ──────────────────────────────────────────
# parent: FakeLoader --> [subgraph instance] --> FakeSave
# subgraph: FakeSampler(steps exposed as WIDGET input; model linked
# from the boundary; one dangling internal link; a Note to drop)
WF = {
    "nodes": [
        {"id": 1, "type": "FakeLoader",
         "widgets_values": ["a", 1.5],
         "inputs": [], "outputs": [
             {"name": "MODEL", "links": [11]}]},
        {"id": 2, "type": "SG-UUID",
         "widgets_values": [8],          # the exposed `steps` widget
         "inputs": [{"name": "model", "type": "MODEL", "link": 11}],
         "outputs": [{"name": "LATENT", "links": [12]}]},
        {"id": 3, "type": "FakeSave",
         "widgets_values": [],
         "inputs": [{"name": "latent", "type": "LATENT", "link": 12}],
         "outputs": []},
        {"id": 4, "type": "Note",
         "widgets_values": ["prose"], "inputs": [], "outputs": []},
    ],
    "links": [
        [11, 1, 0, 2, 0, "MODEL"],
        [12, 2, 0, 3, 0, "LATENT"],
    ],
    "definitions": {"subgraphs": [{
        "id": "SG-UUID", "name": "sg",
        "nodes": [
            {"id": 100, "type": "FakeSampler",
             "widgets_values": [4],       # template default steps=4
             "inputs": [
                 {"name": "model", "type": "MODEL", "link": 210},
                 {"name": "steps", "type": "INT", "link": 211}],
             "outputs": [{"name": "LATENT", "links": [220]}]},
            {"id": 101, "type": "Note",
             "widgets_values": ["x"], "inputs": [], "outputs": []},
        ],
        "links": [
            # boundary IN (widget): -10 slot 0 -> steps slot
            {"id": 211, "origin_id": -10, "origin_slot": 0,
             "target_id": 100, "target_slot": 1, "type": "INT"},
            # boundary IN (linked): -10 slot 1 -> model slot
            {"id": 210, "origin_id": -10, "origin_slot": 1,
             "target_id": 100, "target_slot": 0, "type": "MODEL"},
            # boundary OUT: latent -> -20 slot 0
            {"id": 220, "origin_id": 100, "origin_slot": 0,
             "target_id": -20, "target_slot": 0, "type": "LATENT"},
            # author debris: dangling internal link
            {"id": 230, "origin_id": 999, "origin_slot": 0,
             "target_id": 100, "target_slot": 0, "type": "MODEL"},
        ],
        "inputs": [
            {"name": "steps", "type": "INT", "linkIds": [211]},
            {"name": "model", "type": "MODEL", "linkIds": [210]},
        ],
        "outputs": [
            {"name": "LATENT", "type": "LATENT", "linkIds": [220]},
        ],
    }]},
}

nodes, links, overrides = wt.expand_subgraphs(WF)
api = wt.to_api(nodes, links, overrides, OI)

check("subgraph inlined (Note dropped, no instance)",
      sorted(v["class_type"] for v in api.values())
      == ["FakeLoader", "FakeSampler", "FakeSave"],
      json.dumps({k: v["class_type"] for k, v in api.items()}))

sampler = [v for v in api.values()
           if v["class_type"] == "FakeSampler"][0]
check("widget-boundary override lands (instance 8, not template 4)",
      sampler["inputs"].get("steps") == 8,
      "steps=%s" % sampler["inputs"].get("steps"))
check("widget-boundary is not a graph edge",
      not isinstance(sampler["inputs"].get("steps"), list),
      "steps is a link ref")
check("linked boundary rides as a real edge from the parent source",
      sampler["inputs"].get("model") == ["1", 0],
      "model=%s" % sampler["inputs"].get("model"))

save = [v for v in api.values() if v["class_type"] == "FakeSave"][0]
sampler_id = [k for k, v in api.items()
              if v["class_type"] == "FakeSampler"][0]
check("boundary OUT re-wires to the internal producer",
      save["inputs"].get("latent") == [sampler_id, 0],
      "latent=%s" % save["inputs"].get("latent"))

check("loader widgets place in spec order",
      [v for v in api.values()
       if v["class_type"] == "FakeLoader"][0]["inputs"]
      == {"ckpt": "a", "scale": 1.5},
      "loader=%s" % [v["inputs"] for v in api.values()
                     if v["class_type"] == "FakeLoader"])

# the census door
check("census counts classes",
      dict(wt.census(api)) == {"FakeLoader": 1, "FakeSampler": 1,
                               "FakeSave": 1},
      str(dict(wt.census(api))))

# presets (same package family — pin the pattern's laws too)
sys.path.insert(0, str(REPO / "plugins/engines/comfyui/compose"))
import presets as _pp  # noqa: E402

_p = _pp.Preset(name="x", knobs={"k": 1})
check("knob floor: explicit wins over preset",
      _pp.knob_floor(_p, {"knobs": {"k": 9}, "j": 2})
      == {"k": 9, "j": 2},
      str(_pp.knob_floor(_p, {"knobs": {"k": 9}, "j": 2})))
check("knob floor: preset rides when card silent",
      _pp.knob_floor(_p, {"j": 2}) == {"k": 1, "j": 2},
      str(_pp.knob_floor(_p, {"j": 2})))
check("resolve: unknown name refuses LOUD",
      (_pp.resolve("", "") is None),
      "empty must be None")

print()
print("PASS %d / FAIL %d" % (len(PASS), len(FAIL)))
sys.exit(1 if FAIL else 0)
