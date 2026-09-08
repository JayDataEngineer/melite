"""compose.py — the music card's compose arm (ONE door).

The arm contract (the dispatcher loads this module and calls it —
same shape as every action-card arm, golden base h3-timeline):

    compose(body, model, run_id) -> (rc, graph, extra, error)

    `model` is the model ID STRING (the bus contract — the peer
    arms receive the same). The row is re-resolved here to read
    lane_inputs (family + model_path — the audiocpp_cli pair).

    graph is a FlowGraph-bearing STRUCTURE (Skeleton subclass —
    python hands python structures, PYTHON SHAPE rung 5; text exists
    only at the disk/HTTP rims).

    run_id == ""   the VALIDATION door: document construction is
                   the gate — schema.py refuses malformed params
                   (missing prompt, duration out of range, unknown
                   family) BEFORE any run registers (QUEUE LANE
                   LAW). No render payload rides.
    run_id set     the RENDER door: emits the single-node skeleton
                   (THE ACTION CARD LAW: one node, one workflow dict
                   — the workflow is the audiocpp_cli invocation).

rc codes (the refusal contract): 0 = ok, -3 = malformed/refused
param document (schema or model-row resolution).
"""

from flow_graph import NodeRow, Skeleton

from . import renderer
from . import schema

type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None


def _resolve_row(model_id: str) -> "type[Model] | None":
    """The model row for the id (family + model_path live on
    lane_inputs). None = no such audio_cpp model row."""
    import os
    from melite_models import load_model_py
    _HERE = os.path.dirname(os.path.abspath(__file__))
    _MODELS_ROOT = os.path.normpath(os.path.join(
        _HERE, "..", "..", "..", "..", "models"))
    for genre in sorted(os.listdir(_MODELS_ROOT)):
        gdir = os.path.join(_MODELS_ROOT, genre)
        if not os.path.isdir(gdir):
            continue
        for mid in sorted(os.listdir(gdir)):
            p = os.path.join(gdir, mid, "model.py")
            if not os.path.isfile(p):
                continue
            try:
                cls = load_model_py(p, "audio_cpp")
            except Exception:
                continue
            if cls.id == model_id:
                return cls
    return None


def compose(body: dict[str, JsonValue], model: str, run_id: str
            ) -> tuple[int, Skeleton | None, dict[str, JsonValue] | None,
                       str | None]:
    """The ONE compose door — (rc, graph, extra, error)."""
    # -- the document gate (schema.py: construction IS validation) -----
    try:
        doc = schema.parse_card(body)
    except ValueError as e:
        return -3, None, None, str(e)

    # STROKE 4 (2026-09-06): a FLOW card= stage names its model row
    # IN the doc (the {model:} door's flow equivalent) — the arg
    # wins (request path), the doc is the fallback (flow path).
    model = model or getattr(doc, "model", "") or ""

    if not model:
        return -3, None, None, "music card requires a model id"
    cls = _resolve_row(model)
    if cls is None:
        return -3, None, None, (
            "music card: no audio_cpp model row for %r "
            "(boarded: ace-step-xl, ace-step-sft, txt2music)" % model)

    # family coherence: the picked row must carry the named family
    li_family = getattr(cls.lane_inputs, "family", "") if cls.lane_inputs else ""
    if doc.family and li_family and doc.family not in (li_family, "minimax") \
            and not doc.family.startswith("ace-step"):
        return -3, None, None, (
            "music card family %r does not match model %r "
            "lane_inputs.family=%r" % (doc.family, model, li_family))

    # -- phase 1: the validation door -----------------------------------
    if not run_id:
        # Law 0 (2026-09-07): the native binary is a declared
        # requirement — refuse here, before any run registers, with
        # the same need execute() names at run time.
        if renderer.resolve_cli() is None:
            return -3, None, None, (
                "audio.cpp binary not found — AUDIO_CPP_CLI env or the "
                "runtime build under data/runtime/audio.cpp "
                "(QUEUE LANE LAW: no silent fallback)")
        return 0, None, {"prompt": doc.prompt}, None

    # -- phase 2: the render door — emit the skeleton -------------------
    li = cls.lane_inputs
    family = getattr(li, "family", "") or "ace-step"
    model_path = getattr(li, "model_path", "") or ""
    workflow: dict[str, JsonValue] = {
        "task": "gen",          # Delusion's task enum (12-kind)
        "family": family,       # ace-step | minimax
        "model": model_path,    # the GGUF name from lane_inputs
        "duration_sec": doc.duration,
        "sample_rate": 44100,
        "backend": doc.backend,
    }
    if doc.seed is not None and int(doc.seed) != -1:
        workflow["seed"] = int(doc.seed)
    workflow["prompt"] = doc.prompt
    if doc.lyrics and family == "minimax":
        workflow["lyrics"] = doc.lyrics

    row = NodeRow(
        node_id="music", node_type="audio_cpp",
        input_from=(),
        description="audio.cpp music — %s" % (model_path or family),
        params={"workflow": workflow},
    )
    graph = Skeleton(
        name=model, engine_type="audio_cpp",
        description="audio.cpp music — %s (%s)" % (model_path, family),
        nodes=(row,),
    )
    return 0, graph, {}, None
