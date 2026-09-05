"""Pilot stroke-1 wall: the anny-hmr flow template + its verb contract.

Date: 2026-09-05 · Status: landed (pilot record docs/plans/anny-pilot.md
§4 stroke 1 — HMR as the first SUB-ACTION verb; flow
flows/anny-hmr/flow.py; chip
plugins/engines/comfyui/action_cards/3d/anny/ui/studio/component.tsx).

Pins what stroke 1 promises and nothing it defers:
  1. SHAPE — the flow loads through the plugin bus (engines resolve),
     one comfyui stage, the photo:image edge in, the body:mesh edge
     out, and the in-graph pack chain (LoadImage → MultiHMR2ImageToAnny
     → AnnySelectPerson) with the pin-verbatim knobs.
  2. DOOR — {flow:"anny-hmr"} resolves to a runnable graph.
  3. REFUSAL — a wrong-Kind wire (image into a mesh input) refuses AT
     CONSTRUCTION with both kinds named (QUEUE LANE LAW: no GPU cycle).
  4. VERB CONTRACT — the chip's declaration rows name this flow and
     write ⊆ the card's studio.writes (body_glb); the verb posts the
     queue door, never ComfyUI directly (INFERENCE LAW — pinned here
     as source text, the chip has no unit harness).

No GPU, no network — the schema is the wall (test_flows.py pattern).
"""

import pytest
from pydantic import ValidationError

import flow as flow_mod
from flow import Flow, Stage, FromInitial, FromStage

from _anchor import REPO


def _flow() -> Flow:
    return flow_mod.load_flow("anny-hmr")


# ── 1. shape ─────────────────────────────────────────────────────────

def test_anny_hmr_loads_with_matching_id() -> None:
    assert "anny-hmr" in flow_mod.scan_flow_ids()
    assert _flow().id == "anny-hmr"


def test_anny_hmr_is_one_comfyui_stage() -> None:
    (st,) = _flow().stages
    assert st.id == "estimate"
    assert st.engine == "comfyui"


def test_anny_hmr_typed_edges() -> None:
    (st,) = _flow().stages
    assert st.inputs == {"photo": FromInitial(key="photo")}
    assert st.expected == {"photo": flow_mod.Kind.image}
    assert st.outputs == {"body": flow_mod.Kind.mesh}
    (node,) = _flow().to_graph().nodes
    assert node.input_from == ("__initial__.photo",)
    assert node.outputs == {"body": "mesh"}


def test_anny_hmr_in_graph_pack_chain() -> None:
    """The estimator chain lives INSIDE the stage workflow (a
    multi-stage comfyui→comfyui file handoff would not resolve — the
    engine returns {prompt_id} into carry, never file paths)."""
    wf = _flow().stages[0].params["workflow"]
    assert wf["load"] == {"class_type": "LoadImage",
                          "inputs": {"image": "$photo"}}
    hmr = wf["hmr"]["inputs"]
    assert wf["hmr"]["class_type"] == "MultiHMR2ImageToAnny"
    assert hmr["image"] == ["load", 0]
    # pin-verbatim knobs (object_info.json — never retyped from memory)
    assert hmr["conf_thresh"] == 0.4
    assert hmr["dist_thresh_nms"] == 0.25
    assert hmr["lowres"] is False
    assert hmr["save_anny_params"] is True
    assert hmr["save_mesh"] is True
    assert hmr["render"] is False
    assert hmr["filename_prefix"] == "anny/multihmr2"
    assert wf["select"] == {
        "class_type": "AnnySelectPerson",
        "inputs": {"mesh_paths": ["hmr", 2], "index": 0},
    }
    # the estimator→card bridge: camera-space mesh grounded to a
    # world body (Y-up, feet down, origin-centered) before hydration
    assert wf["ground"] == {
        "class_type": "AnnyGroundBody",
        "inputs": {"glb_path": ["select", 0]},
    }


def test_anny_hmr_carries_no_hardcoded_endpoint() -> None:
    """QUEUE LANE LAW: the engine's config/env seam owns server_url."""
    params = _flow().stages[0].params
    assert "server_url" not in params


# ── 2. door ──────────────────────────────────────────────────────────

def test_anny_hmr_resolves_through_the_flow_door() -> None:
    from gateway import resolve_request
    graph = resolve_request({"flow": "anny-hmr", "photo": "p.png"})
    (node,) = graph.nodes
    assert node.node_id == "estimate"
    assert node.node_type == "comfyui"


# ── 3. refusal ───────────────────────────────────────────────────────

def test_image_into_mesh_wire_refuses_at_construction() -> None:
    """The typed-edge promise: an image output wired into a mesh input
    refuses with BOTH kinds named — no GPU cycle needed."""
    with pytest.raises((flow_mod.FlowError, ValidationError)) as exc:
        Flow(id="probe", stages=(
            Stage(id="cam", engine="comfyui",
                  outputs={"png": flow_mod.Kind.image}),
            Stage(id="fit", engine="comfyui",
                  inputs={"body": FromStage(stage="cam", output="png")},
                  expected={"body": flow_mod.Kind.mesh}),
        ))
    msg = str(exc.value)
    assert "expected mesh" in msg
    assert "got image" in msg


# ── 4. verb contract (source-text pin — the chip has no unit harness)
# ─────────────────────────────────────────────────────────────────────

_VERB_SRC = (REPO / "plugins/engines/comfyui/action_cards/3d/anny/ui"
             / "studio/component.tsx").read_text(encoding="utf-8")


def test_verb_rows_name_this_flow_and_write_the_body_slot() -> None:
    # 2026-09-06: the card offers the COMMERCIAL flow only (operator
    # order "I ONLY WANT HTE COMMERICAL FLOW. I DON't WANT A
    # DROPDOWN") — the research lane stays a runnable flow in the
    # tree, but the chip no longer posts it.
    assert '"anny-hmr"' not in _VERB_SRC
    assert '"anny-hmr-commercial"' in _VERB_SRC
    assert "body_glb" in _VERB_SRC


def test_verb_posts_the_queue_door_never_comfyui() -> None:
    assert "/v1/flows/start" in _VERB_SRC
    assert "fetch(" in _VERB_SRC
    # no direct ComfyUI door in the tenant (no /prompt, no :18466)
    assert "/prompt" not in _VERB_SRC
    assert "18466" not in _VERB_SRC


def test_verb_is_one_button_no_picker_no_dead_refine() -> None:
    """The operator's no-dropdown order, pinned: no engine picker,
    no dead refine button — and the way in (Upload source photo →
    POST /v1/uploads) lives beside the button."""
    assert "Estimator engine" not in _VERB_SRC
    assert "ANNY_HMR_REFINE_REFUSAL" not in _VERB_SRC
    assert "Refine body (soon)" not in _VERB_SRC
    assert "Upload source photo" in _VERB_SRC
    assert "/v1/uploads" in _VERB_SRC
