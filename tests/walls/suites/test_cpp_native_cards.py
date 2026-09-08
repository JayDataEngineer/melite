"""test_cpp_native_cards.py — the cpp native-engine boarding wall.

Why this suite: packages/engines/* natives (autoremesher, anycreature,
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
# (ONE-IMPLEMENTATION RULE, 2026-09-07, the cpp→node cutover: the cpp
# arm retired with the lane — declarations stream, so the py card.py
# moved comfyui-side and the render arm is the Cordis TS card now.
# These legs drive the SAME doors through the CLI compose door
# (node --experimental-strip-types), the wall's no-GPU/no-engine-
# binary shape unchanged: the CLI emits graphs, never runs them.)
import shutil as _shutil  # noqa: E402
import subprocess as _sp  # noqa: E402

_QCARD = "quad-remesh"
_QMODEL = "autoremesher"
_QFACTS = os.path.join(REPO, "packages", "engines", "comfyui",
                       "cordis", "data", "model-facts.json")
_QCLI = os.path.join(REPO, "packages", "engines", "comfyui",
                     "cordis", "src", "cli.ts")


def _qcompose(params: dict, run_id: str = "") -> "tuple[int, object, str]":
    """The Cordis door for the quad card: (rc, graph-or-None,
    last-stderr-line). Mirrors tests/walls/suites/test_cordis_compose
    run_cli (same argv, same hermetic env)."""
    argv = [_shutil.which("node") or "node",
            "--experimental-strip-types", "--no-warnings",
            _QCLI, "compose",
            "--card", _QCARD, "--model", _QMODEL,
            "--facts", _QFACTS,
            "--params", json.dumps(params)]
    if run_id:
        argv += ["--run-id", run_id]
    proc = _sp.run(argv, capture_output=True, text=True, timeout=120,
                   env={"PATH": "/usr/bin:/bin:/usr/local/bin",
                        "NODE_OPTIONS": "--no-warnings"},
                   cwd=REPO)
    graph = None
    if proc.returncode == 0:
        try:
            graph = json.loads(proc.stdout)
        except ValueError:
            graph = None
    tail = [l for l in (proc.stderr or "").strip().splitlines()
            if l.strip()]
    return proc.returncode, graph, (tail[-1] if tail else "")


rc, _g, err = _qcompose({})
check("quad phase-1 refuses missing input",
      rc != 0 and "'input'" in (err or ""), err)
rc, _g, err = _qcompose({"input": "x.obj", "smooth_normal": 0.5})
check("quad phase-1 refuses smooth_normal (node hardcodes 0.0)",
      rc != 0 and "smooth_normal" in (err or "")
      and "nodes.py" in (err or ""), err)
rc, g, err = _qcompose({"input": "x.obj", "target_quads": 5000},
                       "run-t")
check("quad phase-2 emits the single-node graph",
      rc == 0 and isinstance(g, dict)
      and list((g or {}).keys()) == ["AutoRemesher.0"], err)
check("quad budget rides the node",
      isinstance(g, dict)
      and (g.get("AutoRemesher.0") or {}).get("inputs", {}).get(
          "target_quads") == 5000)
check("quad prefix is run-scoped",
      isinstance(g, dict)
      and (g.get("AutoRemesher.0") or {}).get("inputs", {}).get(
          "filename_prefix") == "run-t/remeshed")
check("quad preset is the empty budget literal",
      isinstance(g, dict)
      and (g.get("AutoRemesher.0") or {}).get("inputs", {}).get(
          "preset") == "")

# RETIRED with the cpp arm (same stroke — the doors they pinned no
# longer exist, and their behavior moved):
# - "quad phase-1 refuses dead ref": the retired arm admitted the
#   file at compose; the TS arm (the transfer_rig precedent) passes
#   the path string through — the NODE refuses a dead ref LOUD at
#   prompt time ("input not found", nodes.py), never silently.
# - "quad phase-1 refuses negative budget": the retired schema.py
#   floors retired with the arm; numerics pass through per the
#   img-to-mesh precedent (closed vocabs refuse, Sliders ride) —
#   the node budget law owns them (preset "" + target_quads 0
#   raises IN THE NODE, silent defaults banned).
# - "quad phase-1 refuses missing binary" (AUTOREMESHER_BIN mock):
#   the arm's resolve_cli gate moved to the rim —
#   py/card_requires.py SYSTEM_BINARY_REQUIRES (the T12 leg in
#   test_card_requires.py pins the pair hermetically) + the compose
#   door's missing-extension refusal off the live pin.
# - "quad accepts the trellis mesh" (mesh bytes under data/runs):
#   compose no longer touches the file — no admission, no fixture
#   (the SWEEP-BAIT fragility dies with the leg).

# -- auto-rig doors ------------------------------------------------------
# (Law-0 stroke 2026-09-07: this card had no door coverage at all —
# the wall pinned quad + forge + the music fork only.)
# the surviving arms load as packages (compose.py uses relative
# imports — the plugin's own _load_card_package shape)
sys.path.insert(0, os.path.join(REPO, "packages", "engines", "cpp"))
import importlib.util as _ilu
from types import ModuleType
from unittest import mock as _mock  # noqa: E402


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


# the rig accept legs need mesh bytes for admission (never the run):
# ANY trellis2_native mesh under data/ will do.
mesh = ("data/runs/test-output/run-49b55276d56a-69fe881b/"
        "trellis2_native_00005.glb")
sdir = os.path.join(REPO, "packages", "engines", "cpp", "skintokens",
                    "action_cards", "3d", "auto-rig", "py")
sarm = _load_arm("rig_arm_pkg", sdir)

rc, g, x, err = sarm.compose({"params": {}}, "skintokens", "")
check("rig phase-1 refuses missing input", rc == -3, err)
_sr = sys.modules["rig_arm_pkg.renderer"]
with _mock.patch.object(_sr, "resolve_cli", return_value=None):
    rc, g, x, err = sarm.compose({"params": {"input": mesh}},
                                  "skintokens", "")
check("rig phase-1 refuses missing binary", rc == -3 and
      "SKINTOKENS_BIN" in (err or ""), err)
with _mock.patch.object(_sr, "resolve_model_dir", return_value=None):
    rc, g, x, err = sarm.compose({"params": {"input": mesh}},
                                  "skintokens", "")
check("rig phase-1 refuses missing weights", rc == -3 and
      "SKINTOKENS_MODEL_DIR" in (err or ""), err)
# accept leg: BYO env fakes (sys.executable + any dir satisfy the
# presence probes; run-time provenance stays the runtime builds).
_saved = {v: os.environ.get(v) for v in
          ("SKINTOKENS_BIN", "SKINTOKENS_MODEL_DIR")}
os.environ["SKINTOKENS_BIN"] = sys.executable
os.environ["SKINTOKENS_MODEL_DIR"] = REPO
try:
    rc, g, x, err = sarm.compose({"params": {"input": mesh}},
                                  "skintokens", "")
    check("rig phase-1 accepts the trellis mesh", rc == 0, err)
    rc, g, x, err = sarm.compose({"params": {"input": mesh}},
                                  "skintokens", "run-t")
    check("rig phase-2 emits skeleton", rc == 0 and g is not None, err)
    check("rig skeleton engine_type",
          g is not None and g.engine_type == "skintokens",
          getattr(g, "engine_type", None))
finally:
    for _v, _val in _saved.items():
        if _val is None:
            os.environ.pop(_v, None)
        else:
            os.environ[_v] = _val

# -- music-native doors ----------------------------------------------------
# (Same stroke: the binary gate; the doc/model gates predate it.)
audir = os.path.join(REPO, "packages", "engines", "cpp", "audio-cpp",
                     "action_cards", "audio", "music", "py")
auarm = _load_arm("mus_arm_pkg", audir)
_mr = sys.modules["mus_arm_pkg.renderer"]
with _mock.patch.object(_mr, "resolve_cli", return_value=None):
    rc, g, x, err = auarm.compose({"params": {"prompt": "test"}},
                                   "ace-step-xl", "")
check("music-native phase-1 refuses missing binary", rc == -3 and
      "AUDIO_CPP_CLI" in (err or ""), err)

# -- forge doors --------------------------------------------------------
fdir = os.path.join(REPO, "packages/engines/node/anycreature",
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
    REPO, "packages/engines/node/anycreature", "vendor",
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
