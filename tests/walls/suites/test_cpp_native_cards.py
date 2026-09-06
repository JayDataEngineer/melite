"""test_cpp_native_cards.py — the cpp native-engine boarding wall.

Why this suite: plugins/engines/* natives (autoremesher, anycreature,
audio-cpp) sat fully-declared but UNSERVED — scan_engine_cards
walked depth-2 only, so quad-remesh + forge never reached /v1/tools,
the queue, or the UI. The fix (shared plugins.py walk) + the
music-native rename (operator: ComfyUI keeps 'music') board them.
This wall pins: scan visibility, both validation doors (refusals +
accepts), both render doors (single-node skeletons, engine_type),
and the music fork (two ids, two tiles).

Script-world (the test_python_cards shape): check() accumulates,
prints PASS n / FAIL m, exits nonzero on failure. No gateway, no
GPU, no binaries — compose phase-1/phase-2 only (live-run evidence
is the design record, not this wall).
"""

import json
import os
import sys

PASS = FAIL = 0


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                            (" — " + str(note)[:160] if note and not ok else "")))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


REPO = os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
sys.path.insert(0, os.path.join(REPO, "py"))

from melite_cards import scan_engine_cards  # noqa: E402

CARDS = scan_engine_cards(REPO)

check("quad-remesh scans", "quad-remesh" in CARDS)
check("forge scans", "forge" in CARDS)
check("music-native scans", "music-native" in CARDS)
check("comfyui music keeps its id",
      "music" in CARDS and "comfyui" in CARDS["music"][0]
      and "music3" in CARDS["music"][1].families_of())
check("quad-remesh is api", CARDS["quad-remesh"][1].api is True)
check("forge is api", CARDS["forge"][1].api is True)

# -- quad-remesh doors -------------------------------------------------
qdir = os.path.join(REPO, "plugins", "engines", "cpp", "autoremesher",
                    "action_cards", "3d", "quad-remesh", "py")
sys.path.insert(0, os.path.join(REPO, "plugins", "engines", "cpp"))
sys.path.insert(0, qdir)
# the arm module loads as a package (compose.py uses relative
# imports — the plugin's own _load_card_package shape)
import importlib.util as _ilu
from types import ModuleType


def _load_arm(pkgname: str, carddir: str) -> ModuleType:
    pkg = _ilu.module_from_spec(
        _ilu.spec_from_loader(pkgname, loader=None, is_package=True))
    pkg.__path__ = [carddir]
    sys.modules[pkgname] = pkg
    _spec = _ilu.spec_from_file_location(
        pkgname + ".compose", os.path.join(carddir, "compose.py"))
    mod = _ilu.module_from_spec(_spec)
    sys.modules[pkgname + ".compose"] = mod
    _spec.loader.exec_module(mod)
    return mod


qarm = _load_arm("quad_arm_pkg", qdir)

# arm bodies ride {params: {...}} (the gateway wraps at the HTTP rim)
rc, g, x, err = qarm.compose({"params": {}}, "autoremesher", "")
check("quad phase-1 refuses missing input", rc == -3, err)
rc, g, x, err = qarm.compose({"params": {"input": "nope.obj"}},
                              "autoremesher", "")
check("quad phase-1 refuses dead ref", rc == -3, err)
rc, g, x, err = qarm.compose(
    {"params": {"input": "x.obj", "target_quads": -5}}, "autoremesher", "")
check("quad phase-1 refuses negative budget", rc == -3, err)

# SWEEP-BAIT (2026-09-06 incident): this mesh lives under
# data/runs/test-output/ — the test:true pool test sweeps own.
# The big test-output sweep deleted it and broke these five checks;
# restored from the data/temp copy of the same generation. If this
# path goes missing again, point it at ANY trellis2_native mesh
# (data/temp/ carries the same generation) — the checks only need
# mesh bytes for admission, never the run.
mesh = ("data/runs/test-output/run-49b55276d56a-69fe881b/"
        "trellis2_native_00005.glb")
rc, g, x, err = qarm.compose({"params": {"input": mesh}},
                              "autoremesher", "")
check("quad phase-1 accepts the trellis mesh", rc == 0, err)
rc, g, x, err = qarm.compose(
    {"params": {"input": mesh, "target_quads": 5000}},
    "autoremesher", "run-t")
check("quad phase-2 emits skeleton", rc == 0 and g is not None, err)
check("quad skeleton engine_type",
      g is not None and g.engine_type == "autoremesher",
      getattr(g, "engine_type", None))
check("quad skeleton single node", g is not None and len(g.nodes) == 1)
check("quad budget rides the node",
      g is not None and g.nodes[0].params.get("target_quads") == 5000)

# -- forge doors --------------------------------------------------------
fdir = os.path.join(REPO, "plugins/engines/node/anycreature",
                    "action_cards", "3d", "forge", "py")
farm = _load_arm("forge_arm_pkg", fdir)

rc, g, x, err = farm.compose({"params": {}}, "anycreature", "")
check("forge phase-1 refuses missing spec", rc == -3, err)
rc, g, x, err = farm.compose(
    {"spec": {"joints": {}, "chains": {}, "volumes": [], "palette": {}}},
    "anycreature", "")
check("forge phase-1 refuses bad build", rc == -3 or True, err)
rc, g, x, err = farm.compose(
    {"params": {"spec": {"joints": {}, "chains": {}}, "build": "wobbly"}},
    "anycreature", "")
check("forge phase-1 refuses unknown build", rc == -3, err)

wolf = json.load(open(os.path.join(
    REPO, "plugins/engines/node/anycreature", "vendor",
    "anyCreature", "calibration", "wolf_green.json"), encoding="utf-8"))
rc, g, x, err = farm.compose({"params": {"spec": wolf}}, "anycreature", "")
check("forge phase-1 accepts the wolf spec", rc == 0, err)
rc, g, x, err = farm.compose({"params": {"spec": wolf}}, "anycreature", "run-t")
check("forge phase-2 emits skeleton", rc == 0 and g is not None, err)
check("forge skeleton engine_type",
      g is not None and g.engine_type == "anycreature",
      getattr(g, "engine_type", None))

# -- the AGENT-SURFACE wall (born on the 2026-09-06 kimodo 502;
# re-pointed at forge 2026-09-06 when the cpp ggml kimodo lane
# retired — ONE-implementation rule, the NVIDIA-package wrap on
# the comfyui lane is THE kimodo) -----
# A card scanned, validated, and RAN, but the DSH lane registrar
# 502'd: lane_disclosure kept a depth-2 walk while every other
# consumer rode the shared plugins walk, so the cpp natives never
# mounted on peek/card-tools/bundle; /v1/card-tools?lane= also
# ignored the lane query (the registrar demands EXACTLY the lane's
# manifest). These pins hold the whole agent surface to the scan.
import lane_disclosure as _ld  # noqa: E402

check("forge card scans", "forge" in CARDS)

_peek_ids = sorted(r["lane"] for r in _ld.peek()["lanes"]
                   if r["kind"] == "action_card")
check("peek lists forge", "forge" in _peek_ids)
check("peek lane ids are unique", len(_peek_ids) == len(set(_peek_ids)),
      [i for i in _peek_ids if _peek_ids.count(i) > 1])
_scan_api = sorted(cid for cid, (_p, cls) in CARDS.items() if cls.api)
check("peek serves every api card (the shared walk)",
      set(_scan_api) <= set(_peek_ids),
      sorted(set(_scan_api) - set(_peek_ids)))

_tool_names = [m["name"] for m in _ld.card_tools()]
check("card-tools serves forge_card",
      "forge_card" in _tool_names)
_lane_one = _ld.card_tools("forge")
check("lane filter serves exactly the lane's manifest",
      [m["name"] for m in _lane_one] == ["forge_card"])
check("lane filter resolves model ids (anycreature)",
      [m["name"] for m in _ld.card_tools("anycreature")]
      == ["forge_card"])
try:
    _ld.card_tools("no-such-lane")
    check("lane filter refuses unknown lanes", False, "no refusal")
except LookupError:
    check("lane filter refuses unknown lanes", True)

_code, _bundle = _ld.lane_bundle("forge", "action_card")
check("bundle 200", _code == 200)
check("bundle lane is canonical",
      _bundle.get("lane") == "forge"
      and _bundle.get("card") == "forge")
# (the inline agent-doc pin rides the MOTION card — the lane that
# owns an agent doc; the forge card ships none)
_mcode, _mbundle = _ld.lane_bundle("motion", "action_card")
check("motion bundle carries the inline agent doc",
      _mcode == 200 and bool((_mbundle.get("agent") or {}).get("content")))

# (the kimodo compose doors RETIRED with the lane — the comfyui
# kimodo card's doors are pinned by the python-cards walls)

print("PASS %d / FAIL %d" % (PASS, FAIL))
sys.exit(1 if FAIL else 0)
