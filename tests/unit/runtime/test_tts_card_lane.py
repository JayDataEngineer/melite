"""TTS CARD LANE WALL (row 4, 2026-09-06) — the second production
card= lane, load-bearing end to end. Mirrors the music-native lane
wall (tests/unit/runtime/test_stage_card_lane.py) for the comfyui
voice lane.

Design records: docs/queue/card-stage-typing.md (the lattice),
docs/design/row4-template-library.md (the slice). Pins:

  * the lane (flows/audio-native-tts) loads with card="tts"; the
    NodeRow carries the card id and the "wav" channel stays
    EXPLICIT (card_io — downstream artifact names don't move)
  * the registry's requires_model row refuses a card= stage with
    no params.model AT CONSTRUCTION — compile-time, never a dead
    run
  * the card schema gate refuses a typo'd knob (extra=forbid)
  * the worker's CARD BRIDGE composes the doc through the owning
    arm into engine params (workflow + model id) — the arm's
    family/model rows ride the composed surface
  * an unknown model id is a LOUD refusal naming the model
    (documented failure, RESILIENCE LAW)
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


@pytest.fixture(scope="module", autouse=True)
def _pin_compose_card() -> None:
    """Test-process hygiene (ROW 4, 2026-09-06): the comfyui arms
    import the compose helper as bare `from card import ...`, which
    resolves via sys.path. `_mount_cards_for_wall` inserts card
    DEFINITION dirs (each with its own card.py) ahead of the
    compose dir, so the first in-process bridge in a combined run
    can resolve `card` to e.g. skin/python/card.py (no emit_render).
    The serving gateway never hits this (the bus owns load order
    — proven by two live runs). Lead with the compose package dir
    (the loader's own resolution) for this process. Estate-wide fix
    (dotted imports across the arms) is next-conversion work,
    noted in docs/design/row4-executor-tts-lane.md."""
    compose_dir = str(REPO / "packages/engines/comfyui/compose")
    if compose_dir in sys.path:
        sys.path.remove(compose_dir)
    sys.path.insert(0, compose_dir)
    # ...AND evict a poisoned pin: an earlier in-process compose
    # (e.g. the music lane wall, running before this module) binds
    # bare `card` while a card DEFINITION dir leads the path — the
    # stale sys.modules entry would win over the corrected path.
    helper_file = str(REPO / "packages/engines/comfyui/compose/card.py")
    if getattr(sys.modules.get("card"), "__file__", "") != helper_file:
        sys.modules.pop("card", None)
        import importlib
        importlib.import_module("card")


def test_lane_loads_with_card_contract() -> None:
    fl = flow.load_flow("audio-native-tts")
    st = fl.stages[0]
    assert st.card == "tts"
    assert st.engine == "comfyui"
    g = fl.to_graph()
    n = g.nodes[0]
    assert n.card == "tts"
    # the wav channel stays explicit — the registry default would
    # rename the artifact channel and move downstream names
    assert dict(n.outputs) == {"wav": "audio"}


def test_requires_model_refused_at_construction() -> None:
    with pytest.raises(Exception, match="requires params.model"):
        Flow(id="no-model", stages=(
            Stage(id="m", engine="comfyui", card="tts",
                  inputs={"prompt": FromInitial(key="prompt")},
                  params={"text": "$prompt"}),
        ))


def test_typo_knob_refused_at_construction() -> None:
    with pytest.raises(Exception, match="voise"):
        Flow(id="typo", stages=(
            Stage(id="m", engine="comfyui", card="tts",
                  inputs={"prompt": FromInitial(key="prompt")},
                  params={"text": "$prompt", "model": "qwen3-tts",
                          "voise": "x"}),
        ))


def test_registry_row_marks_requires_model() -> None:
    row = stage_params.REGISTRY.get("tts")
    assert row is not None and row.requires_model is True
    assert row.engine == "comfyui"
    assert row.kind_inputs == {"prompt": "text"}


def test_card_bridge_composes_the_workflow() -> None:
    fl = flow.load_flow("audio-native-tts")
    n = fl.to_graph().nodes[0]
    import copy
    composed = gateway._card_bridge(
        n, copy.deepcopy(dict(n.params)), "probe-run")
    wf = composed.get("workflow")
    assert isinstance(wf, dict), "the bridge must hand the engine a workflow"
    assert composed.get("model") == "qwen3-tts"


def test_card_bridge_unknown_model_refuses_loud() -> None:
    fl = flow.load_flow("audio-native-tts")
    n = fl.to_graph().nodes[0]
    import copy
    params = copy.deepcopy(dict(n.params))
    params["model"] = "no-such-row"
    with pytest.raises(Exception, match="no-such-row"):
        gateway._card_bridge(n, params, "probe-run")


def test_schema_door_serves_the_card_lane() -> None:
    snap = flow.schema_snapshot()
    row = snap["flows"].get("audio-native-tts")
    assert row is not None, "the stroke-2 door must list the lane"
    st = row["stages"][0]
    assert st["card"] == "tts"
    assert st["engine"] == "comfyui"


def _bridge_voice(params: "dict[str, object]") -> "dict[str, object]":
    fl = flow.load_flow("audio-native-tts")
    n = fl.to_graph().nodes[0]
    import copy
    doc = copy.deepcopy(dict(n.params))
    doc.update(params)
    composed = gateway._card_bridge(n, doc, "probe-run")
    wf = composed["workflow"]
    node2 = None
    for key, val in wf.items():
        if isinstance(val, dict) and val.get("class_type") == "AudiocoreTTS":
            node2 = val
    assert node2 is not None, "the composed workflow carries AudiocoreTTS"
    return node2["inputs"]["voice"]


def test_unstated_voice_falls_back_to_model_default() -> None:
    """ROW 4 parity (2026-09-06): the retired engine-only flow
    inherited voice 'vivian' from the template inject; the arm
    builds fresh — the MODEL's defaults row fills an unstated doc
    voice. A silent voiceless CustomVoice run fails at prefill."""
    assert _bridge_voice({}) == "vivian"


def test_stated_voice_wins_over_model_default() -> None:
    assert _bridge_voice({"voice": "marcus"}) == "marcus"
