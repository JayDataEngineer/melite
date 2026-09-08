"""compose.py — the forge card's compose arm (ONE door).

The arm contract (the dispatcher loads this module and calls it —
same shape as every action-card arm, golden base h3-timeline):

    compose(body, model, run_id) -> (rc, graph, extra, error)

    graph is a FlowGraph-bearing STRUCTURE (Skeleton subclass —
    python hands python structures, PYTHON SHAPE rung 5; text exists
    only at the disk/HTTP rims).

    run_id == ""   the VALIDATION door: document construction is the
                   gate — schema.py refuses malformed params, the
                   engine validator refuses invalid specs — everything
                   that can 4xx dies here, BEFORE any run registers
                   (QUEUE LANE LAW). No render payload rides.
    run_id set     the RENDER door: emits the single-node skeleton
                   (THE ACTION CARD LAW: one node, one workflow dict
                   — the workflow IS the creature spec).

rc codes (the refusal contract): 0 = ok, -3 = malformed/refused
param document (schema or engine validator).
"""

from flow_graph import NodeRow, Skeleton

from . import schema
from . import renderer

type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None


def compose(body: dict[str, JsonValue], model: str,
            run_id: str) -> tuple[int, Skeleton | None,
                                  dict[str, JsonValue] | None, str | None]:
    """The ONE compose door — (rc, graph, extra, error)."""
    # -- the document gate (schema.py: construction IS validation) -----
    try:
        doc = schema.parse_card(body)
    except ValueError as e:
        return -3, None, None, str(e)

    # -- phase 1: the validation door -------------------------------
    # schema.py IS the gate (structural floor: volumes/parts + knob
    # vocabularies, validated at construction). The engine ships no
    # --check door (its CLI treats flags as filenames) — a malformed
    # spec dies at execute with the engine's own crash message:
    # honest refusal, never ours to guess.
    if not run_id:
        return 0, None, {"spec": doc.spec}, None

    # -- phase 2: the render door — emit the skeleton -------------------
    step_doc = renderer.spec_with_knobs(doc)
    row = NodeRow(
        node_id="forge", node_type="anycreature",
        input_from=(),
        params=step_doc,
    )
    graph = Skeleton(
        name=model, engine_type="anycreature",
        description="anyCreature forge — spec → skinned GLB",
        nodes=(row,),
    )
    return 0, graph, {}, None
