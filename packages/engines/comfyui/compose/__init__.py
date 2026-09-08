"""compose/ — the comfyui plugin's translation service (operator order
2026-09-02: three folders — action_cards, models, compose; the compose
package IS the engine surface).

Contract (python/plugins.py, compose-first shape):
    card_compose(body, model, run_id, yaml_text)
        -> (rc, yaml_text, extra_dict, error_str)
    execute(node, run_dir, inputs, stop_event, report=None) -> dict
    stop(params, run_dir)                                # stop door



Dispatch is DATA: the model class's `card` attribute names the action
card directory under action_cards/; compose loads its arm module and
calls it. An unboarded model (no card attribute, or a card the table
does not know) REFUSES LOUD — 4xx before any run registers (QUEUE
LANE LAW: never silently compose a graph when a request fails to
resolve; the absent-card→h3-timeline fallback that surfaced "no calls
in card body — a film needs at least one shot" on the Image card died
2026-09-05). The core names no lane (PLUGIN ARCHITECTURE LAW); this
package is the ONLY place that knows card ids.

Module identity law: every importable in this plugin resolves through
TOP-LEVEL names (co_script, _coscript, _config) with compose/ on
sys.path — ONE namespace per process, whether the loader is the plugin
bus, a test, or a model renderer bootstrap. Package-relative imports
are banned outside action_cards lane packages.
"""


from __future__ import annotations

from flow import Kind  # flow-typed-edges: default output kind
# the flow-typed-edges contract: comfyui is multi-genre (image,
# video, audio, music, tts, sfx, 3d) — the default Kind is image
# (the most common case), flows with non-image stages MUST set
# outputs={'<name>': Kind.X} explicitly on the stage row.
DEFAULT_OUTPUT = Kind.image

import sys
import types
from pathlib import Path

_COMPOSE_DIR = Path(__file__).resolve().parent
_PLUGIN_ROOT = _COMPOSE_DIR.parent
# compose/ joins sys.path via the LOADER (python/plugins.py EngineRef.load —
# shape law rung 5), so every top-level importable below (native,
# _config, _coscript) resolves without any path ritual here. Tests own
# their own path setup, as always.

__version__ = "1.0.0"

# native.py: the engine's OWN transport (2026-09-02, the progress
# restoration — comfy-mcp could not stream and was not installed; see
# native.py's evidence chain). mcp.py is deleted: ONE execution path.
from native import execute, stop, unload  # noqa: E402,F401
# STROKE 5 (2026-09-06): single-graph compile — the merged ABI the
# worker uses for pure-comfyui flows (one submit, per-stage harvest);
# stage_workflow resolves a node's FINAL workflow dict (inline
# workflow + inject) for the merge planner
from mergegraph import execute_flow, plan_merge  # noqa: E402,F401
from native import _splice_workflow as stage_workflow  # noqa: E402,F401
from melite_cards.dsl import ValidationError  # noqa: E402

# engine-owned mapping: the model class's `card` (the card SURFACE id)
# → the action_cards/<genre>/<dir> that owns the arm module. Compose
# dispatch is engine knowledge (PLUGIN ARCHITECTURE LAW). Genre groups
# since the 2026-09-02 reorg: image/ audio/ video/ 3d/ motion/ mask/.
# THE CARD PATTERN, uniform arm name (golden base: h3-timeline):
# every card's compose arm is <card>/python/compose.py — no per-card
# module stems (the generate/edit/music era ended 2026-09-04, the
# structure audit: one shape, every card, walls pin it).
# engine-owned run truth (PLUGIN ARCHITECTURE LAW): keys the card
# never shows but compose consumes — the audio lanes' default mode
# (tts/design) rides defaults and the renderer reads it as data.
ENGINE_TRUTH_KEYS = ("mode", "variant")

# The PACKAGE-load arms: every arm whose python/ is a package (has
# __init__.py — THE CARD PATTERN's required entry, so ALL of them)
# loads under its canonical alias (dir basename, hyphens→underscores;
# package-relative imports inside the arm — `from . import schema` —
# resolve). DERIVED from the tree (no restated card list): a
# load-shape fact, not lane knowledge.
# Wire-JSON shape: request bodies and arm extras (decoded JSON).
JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
JsonDict = dict[str, JsonValue]



def _card_of(model: str) -> str | None:
    """The model CLASS decides (model.py flip — class beats yaml).
    None = unboarded (the caller refuses LOUD — never a fallback)."""
    from _coscript import model_pys
    # melite_models resolves via the caller's process (the gateway runs
    # with python/ as its script dir; the loader injects python/ at model
    # resolution — plugins.py load path). No path ritual here.
    for mpy in model_pys(model):
        try:
            from melite_models import load_model_py
            engine = mpy.parent.parent.parent.name
            cls = load_model_py(str(mpy), engine)
        except Exception:
            continue
        card = getattr(cls, "card", "") or ""
        if card:
            return card
    return None


def card_compose(body: JsonDict, model: str, run_id: str,
                 graph: FlowGraph) -> tuple[int, FlowGraph | JsonDict | None, JsonDict | None, str | None]:
    """THE CUTOVER (operator order 2026-09-07 "keep moving until the
    vision is realized"; ladder stage 3, design record
    docs/design/cordis-compose-runtime-2026-09-07.md): ALL graph
    truth lives in the Cordis TS plane (@comfyui/cordis). This hook
    SHELLS the CLI compose door. ATOMIC — every card at once, no
    python-renderer fallback branch (QUEUE LANE LAW). The model.py
    flip stays python (the MODEL CLASS decides its card — engine
    data, not graph truth); params validation, boarding, extension
    gates and graph building are the TS door's, walled byte-stable
    against python-rendered goldens in tests/golden_cordis/.
    Success contract unchanged: (0, graph_json_text, None, None) —
    the rim validates the text as FlowGraph. Refusal: (rc, None,
    None, last_stderr_line) — the TS door refuses loudly with the
    cause named; its voice is the door's now."""
    card = _card_of(model)
    if card is None:
        raise ValidationError(
            "model %r boards no action card — every offered model's "
            "class declares card= (the unboarded data-family era "
            "ended 2026-09-05)" % model)
    import json as _json
    import shutil as _shutil
    import subprocess as _sp
    node = _shutil.which("node")
    if node is None:
        raise ValidationError(
            "node runtime not found on PATH — the compose plane is "
            "the Cordis CLI (@comfyui/cordis, "
            "--experimental-strip-types); a python renderer no "
            "longer exists to fall back to (by order)")
    cli = _PLUGIN_ROOT / "cordis" / "src" / "cli.ts"
    facts = _PLUGIN_ROOT / "cordis" / "data" / "model-facts.json"
    if not cli.is_file() or not facts.is_file():
        raise ValidationError(
            "cordis compose plane incomplete: cli.ts=%s facts=%s" %
            (cli.is_file(), facts.is_file()))
    params = body.get("params") if isinstance(body, dict) else None
    if not isinstance(params, dict):
        params = {}
    # THE $SPELL BRANCH (retired compose.py row-4 semantics, the
    # contract row restored): a PHASE-1 call (run_id="" — the
    # validation-door shape, no run context) whose SPELL param
    # (card-decls "spells" row — file-typed params that may name a
    # wired stage input) carries a $-value composes NO graph: shape
    # validated, the pool passes, no refusal. A RUN-CONTEXT call
    # (the card bridge — run_id set) composes VERBATIM: the $spell
    # wires into the Load* file slot, the merged path (mergegraph
    # plan_merge) refuses the link-in-file-slot LOUDLY and the
    # per-stage loop substitutes the resolved artifact at the
    # bridge. Pinned by test_two_card_flow (tolerates-the-spell +
    # refuses-link-in-file-slot legs).
    _decl = {}
    try:
        _decl = _json.loads(
            (_PLUGIN_ROOT / "cordis" / "data" / "card-decls.json")
            .read_text()).get(card) or {}
    except Exception:
        _decl = {}
    if not run_id:
        _spells = _decl.get("spells", ()) or ()
        _pool = {k: params[k] for k in _spells
                 if k in params and isinstance(params[k], str)
                 and str(params[k]).startswith("$")}
        if _pool:
            return (0, None,
                    {"skeleton": str(_decl.get("skeleton") or ""),
                     "inputs": _pool},
                    None)
    argv = [node, "--experimental-strip-types", "--no-warnings",
            str(cli), "compose", "--card", card, "--model", model,
            "--facts", str(facts),
            "--params", _json.dumps(params)]
    if run_id:
        argv += ["--run-id", str(run_id)]
    proc = _sp.run(argv, capture_output=True, text=True,
                   cwd=str(_PLUGIN_ROOT.parents[2]))
    if proc.returncode != 0:
        lines = [l for l in (proc.stderr or "").strip().splitlines()
                 if l.strip()]
        detail = lines[-1] if lines else "no detail (rc=%d)" % proc.returncode
        return (proc.returncode, None, None, detail)
    # the skeleton rides the extra: the rim names the FlowGraph
    # stage-row from the CARD-DECLARED id (card-decls.json — the
    # retired compose.py voice rows' skeleton=, SSOT'd), never a
    # hardcode. Empty skeleton (cpp-lane cards) names the model.
    # (_decl already loaded for the spell branch — same read.)
    _skel = str(_decl.get("skeleton") or "")
    return (0, proc.stdout, {"skeleton": _skel}, None)


# ── the validate ABI (stroke 3, 2026-09-06) ──────────────────────────
#
# Engines MAY export validate_workflow(params) -> list[str]: given a
# stage's params row, return refusal rows for everything a compile
# door can check OFFLINE (no server, no GPU). The gateway's validate
# door calls it generically through the plugin bus — the core names
# no node classes (PLUGIN ARCHITECTURE LAW); this plugin checks the
# API-format workflow against the ESTATE PIN
# (data/object_info.json + meta sha) so garbage graphs die at
# compile, not on GPU money (operator order 2026-09-05: "THESE
# ERRORS NEED BE CAUGHT COMPILE TIME, NOT INFERENCE TIME").

_PIN_NODE_CLASSES: "frozenset[str] | None" = None


def _pin_node_classes() -> "frozenset[str]":
    global _PIN_NODE_CLASSES
    if _PIN_NODE_CLASSES is None:
        import json as _json
        pin = _PLUGIN_ROOT / "data" / "object_info.json"
        try:
            obj = _json.loads(pin.read_text())
            _PIN_NODE_CLASSES = frozenset(obj.keys())
        except (OSError, ValueError):
            # an unreadable pin must not brick the door — empty set
            # makes every class "unknown", which IS the honest state
            # of a pinless deployment (loud, actionable).
            _PIN_NODE_CLASSES = frozenset()
    return _PIN_NODE_CLASSES


def validate_workflow(params: JsonDict) -> "list[str]":
    """Offline workflow-vs-pin check. params.workflow is the
    API-format graph {node_id: {class_type, inputs}}; every node's
    class must exist in the pinned object_info. Unknown classes are
    returned as refusal rows (one per node, node id + class named)."""
    import json as _json
    wf = params.get("workflow") if isinstance(params, dict) else None
    if not isinstance(wf, dict):
        return []          # not this engine's shape — not our refusal
    raw = wf.get("workflow") if isinstance(
        wf.get("workflow"), dict) else wf
    rows: list[str] = []
    known = _pin_node_classes()
    for node_id, node in raw.items():
        cls = node.get("class_type") if isinstance(node, dict) else None
        if cls is None:
            rows.append("workflow node %r: no class_type" % node_id)
        elif cls not in known:
            rows.append(
                "workflow node %r: class_type %r is not in the pinned "
                "object_info (%d pinned classes) — refresh the pin or "
                "fix the class name" % (node_id, cls, len(known)))
    return rows
