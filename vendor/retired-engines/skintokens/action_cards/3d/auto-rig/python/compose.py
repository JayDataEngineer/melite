"""compose.py — the auto-rig card's compose arm (ONE door).

The arm contract (the dispatcher loads this module and calls it —
same shape as every action-card arm, golden base h3-timeline):

    compose(body, model, run_id) -> (rc, graph, extra, error)

    run_id == ""   the VALIDATION door: schema.py refuses malformed
                   knobs; the artifact-ref existence gate refuses a
                   dead input path — BEFORE any run registers.
    run_id set     the RENDER door: constructs the document AGAIN,
                   fresh against live mounts (a ref that died in
                   between refuses here with the exact message), then
                   emits the single-node skeleton.

rc codes: 0 = ok, -3 = malformed/refused param document.
"""

from flow_graph import NodeRow, Skeleton

from . import renderer
from . import schema

type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None


def compose(body: dict[str, JsonValue], model: str,
            run_id: str) -> tuple[int, Skeleton | None,
                                  dict[str, JsonValue] | None, str | None]:
    """The ONE compose door — (rc, graph, extra, error)."""
    # -- the document gate (schema.py: construction IS validation) ----
    try:
        doc = schema.parse_card(body)
    except ValueError as e:
        return -3, None, None, str(e)

    # -- the artifact-ref gate (BOTH doors — two moments) --------------
    refusal = schema.input_ref_exists(doc)
    if refusal:
        return -3, None, None, refusal

    # -- phase 1: the validation door ---------------------------------
    if not run_id:
        # Law 0 (2026-09-07): the native binary + weights are declared
        # requirements — refuse here, before any run registers, with
        # the same needs execute() names at run time.
        _cli = renderer.resolve_cli()
        _mdir = renderer.resolve_model_dir()
        if _cli is None or _mdir is None:
            _missing = ("skintokens-cli binary" if _cli is None
                        else "SkinTokens F16 GGUF bundle")
            return -3, None, None, (
                "%s not found — SKINTOKENS_BIN / SKINTOKENS_MODEL_DIR "
                "env or the runtime under data/runtime/skintokens "
                "(cmake build + hf download LocalAI-io/SkinTokens-GGUF) "
                "— QUEUE LANE LAW: no silent fallback" % _missing)
        return 0, None, {}, None

    # -- phase 2: the render door — emit the skeleton ------------------
    step_doc = renderer.params_from_doc(doc)
    row = NodeRow(
        node_id="auto-rig", node_type="skintokens",
        input_from=(),
        params=step_doc,
    )
    graph = Skeleton(
        name=model, engine_type="skintokens",
        description=("SkinTokens auto-rig — static mesh → skeleton + "
                     "learned skin weights → rigged GLB"),
        nodes=(row,),
    )
    return 0, graph, {}, None
