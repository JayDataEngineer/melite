"""STAGE=CARD LANE WALL (stroke 4, 2026-09-06) — the first
production card= lane, load-bearing end to end.

Design record: docs/queue/card-stage-typing.md. Pins:

  * the lane (flows/music-native) loads with card= set; NodeRow
    carries the card id and the REGISTRY's kind contract (audio)
  * the registry's requires_model row refuses a card= stage with
    no params.model AT CONSTRUCTION — compile-time, never a dead
    run
  * the card schema gate refuses a typo'd knob (extra=forbid)
  * the worker's CARD BRIDGE composes the doc through the owning
    arm into engine params (workflow + model id) — the arm's
    family/model rows ride the composed surface
  * an unknown model id is a LOUD refusal with the arm's verbatim
    text (documented failure, RESILIENCE LAW)
  * the schema door (stroke 2) serves the lane with its card row
"""

import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "python"))

import flow  # noqa: E402
import gateway  # noqa: E402
import stage_params  # noqa: E402
from flow import Flow, Stage, FromInitial  # noqa: E402


def test_lane_loads_with_card_contract() -> None:
    fl = flow.load_flow("music-native")
    st = fl.stages[0]
    assert st.card == "music-native"
    assert st.engine == "audio_cpp"
    g = fl.to_graph()
    n = g.nodes[0]
    assert n.card == "music-native"
    # the registry filled the kind contract — no outputs row needed
    assert dict(n.outputs) == {"default": "audio"}


def test_requires_model_refused_at_construction() -> None:
    with pytest.raises(Exception, match="requires params.model"):
        Flow(id="no-model", stages=(
            Stage(id="m", engine="audio_cpp", card="music-native",
                  inputs={"prompt": FromInitial(key="prompt")},
                  params={"prompt": "$prompt"}),
        ))


def test_typo_knob_refused_at_construction() -> None:
    with pytest.raises(Exception, match="durashion"):
        Flow(id="typo", stages=(
            Stage(id="m", engine="audio_cpp", card="music-native",
                  inputs={"prompt": FromInitial(key="prompt")},
                  params={"prompt": "$prompt", "model": "ace-step-sft",
                          "durashion": 60}),
        ))


def test_registry_row_marks_requires_model() -> None:
    row = stage_params.REGISTRY.get("music-native")
    assert row is not None and row.requires_model is True
    assert row.engine == "audio_cpp"
    assert row.kind_outputs == {"default": "audio"}


def test_card_bridge_composes_the_workflow() -> None:
    fl = flow.load_flow("music-native")
    n = fl.to_graph().nodes[0]
    import copy
    composed = gateway._card_bridge(
        n, copy.deepcopy(dict(n.params)), "probe-run")
    wf = composed.get("workflow")
    assert isinstance(wf, dict), "the bridge must hand the engine a workflow"
    assert wf.get("task") == "gen"
    assert wf.get("family") == "ace-step"
    assert wf.get("model"), "the model row's GGUF rides the workflow"
    assert composed.get("model") == "ace-step-sft"


def test_card_bridge_unknown_model_refuses_loud() -> None:
    fl = flow.load_flow("music-native")
    n = fl.to_graph().nodes[0]
    import copy
    params = copy.deepcopy(dict(n.params))
    params["model"] = "no-such-row"
    with pytest.raises(Exception, match="no-such-row"):
        gateway._card_bridge(n, params, "probe-run")


def test_schema_door_serves_the_card_lane() -> None:
    snap = flow.schema_snapshot()
    row = snap["flows"].get("music-native")
    assert row is not None, "the stroke-2 door must list the lane"
    st = row["stages"][0]
    assert st["card"] == "music-native"
    assert st["engine"] == "audio_cpp"
    assert st["outputs"] == {"default": "audio"}
