"""Commercial-lane wall: the anny-hmr-commercial flow template.

Date: 2026-09-05 · Status: landed (design record
docs/design/commercial-estimator-chain.md — the end-to-end executed
chain: SAM 3D Body → MHR → SOMA → anny, 9.6 mm real-person fit).

Pins what the commercial lane promises:
  1. SHAPE — the flow loads through the plugin bus, one comfyui
     stage, the photo:image edge in, the body:mesh edge out, and the
     in-graph commercial pack chain (LoadImage → Sam3dBodyImageToAnny)
     with the pin-verbatim knobs. NO ground/select stage: this lane's
     GLB is born grounded (bind-pose bake, never camera-space).
  2. DOOR — {flow:"anny-hmr-commercial"} resolves to a runnable graph.
  3. LANE SEPARATION — the commercial workflow names NO research-lane
     node (MultiHMR2*/AnnyFit* carry NAVER non-commercial terms —
     QUEUE LANE LAW: explicit doors, no fallbacks).
  4. NO HARDCODED ENDPOINT — the engine's config/env seam owns
     server_url.

No GPU, no network — the schema is the wall (test_flows.py pattern).

ORACLE DEATH 2026-09-08: the §2 door leg drove the py serving
oracle in-process (resolve_request on {flow:"anny-hmr-commercial"}
with a staged photo); the oracle is deleted per the operator order
"we do not need parity, we need to migrate, not keep the old
machinery". The TS plane does not port named-flow compile yet
(doors/flowsValidate.ts refuses it 400 flow_compile — see
test_flow_doors.py §4 unported-half pin), so no TS leg can pin the
stageable-photo door in this stroke — the leg is removed and
re-adds on the flows-port lane. What stays: the flow-declared
shape (loadable, typed edges, pack chain, no hardcoded endpoint)
and lane separation — all keeper-side.

Date: 2026-09-08. Status: landed (oracle-death wean).
"""

import flow as flow_mod
from flow import Flow, Stage, FromInitial

_RESEARCH_NODES = ("MultiHMR2ImageToAnny", "AnnySelectPerson",
                   "AnnyGroundBody", "AnnyFitOptimize")


def _flow() -> Flow:
    return flow_mod.load_flow("anny-hmr-commercial")


# ── 1. shape ─────────────────────────────────────────────────────────

def test_commercial_loads_with_matching_id() -> None:
    assert "anny-hmr-commercial" in flow_mod.scan_flow_ids()
    assert _flow().id == "anny-hmr-commercial"


def test_commercial_is_one_comfyui_stage() -> None:
    (st,) = _flow().stages
    assert st.id == "estimate"
    assert st.engine == "comfyui"


def test_commercial_typed_edges() -> None:
    (st,) = _flow().stages
    assert st.inputs == {"photo": FromInitial(key="photo")}
    assert st.expected == {"photo": flow_mod.Kind.image}
    assert st.outputs == {"body": flow_mod.Kind.mesh}
    (node,) = _flow().to_graph().nodes
    assert node.input_from == ("__initial__.photo",)
    assert node.outputs == {"body": "mesh"}


def test_commercial_in_graph_pack_chain() -> None:
    wf = _flow().stages[0].params["workflow"]
    assert wf["load"] == {"class_type": "LoadImage",
                          "inputs": {"image": "$photo"}}
    s3db = wf["s3db"]["inputs"]
    assert wf["s3db"]["class_type"] == "Sam3dBodyImageToAnny"
    assert s3db["image"] == ["load", 0]
    assert s3db["person_index"] == 0
    # born grounded (fitted bind-pose bake) — no camera-space bridge
    assert "ground" not in wf
    assert "select" not in wf


def test_commercial_carries_no_hardcoded_endpoint() -> None:
    params = _flow().stages[0].params
    assert "server_url" not in params


# ── 2. door ──────────────────────────────────────────────────────────
# (ORACLE DEATH 2026-09-08: the resolve_request leg lived here —
# removed with the oracle; see the header. Re-adds on the
# flows-port lane as a TS-door leg.)


# ── 3. lane separation ───────────────────────────────────────────────

def test_commercial_workflow_names_no_research_node() -> None:
    wf = _flow().stages[0].params["workflow"]
    named = {spec["class_type"] for spec in wf.values()}
    assert not (named & set(_RESEARCH_NODES)), (
        "research-lane nodes are NAVER non-commercial and must never "
        f"enter the commercial workflow: {named & set(_RESEARCH_NODES)}")
