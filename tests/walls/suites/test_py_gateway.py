"""Queue-law regression for the python gateway (mirrors the C chaos suite
essentials) + the plugin-bus wall (PLUGIN ARCHITECTURE LAW).
No GPU, no network: flow declarations + resolution + compose laws +
golden parity. (2026-09-04 flows rework: the yaml parser era tests were
reborn as Flow-construction refusals — docs/queue/flows.md.)"""

import json
import subprocess
import sys
from pathlib import Path

import pytest

from _anchor import REPO

from gateway import (  # noqa: E402
    ValidationError, expand_inject, resolve_request,
)
from flow_graph import NodeRow  # noqa: E402
import flow as flow_mod  # noqa: E402
from flow import Flow, Stage, FromInitial, FromStage  # noqa: E402


# C1: every estate flow loads (validation AT construction + engines
# through the plugin bus — the module IS the name)
@pytest.mark.parametrize("name", flow_mod.scan_flow_ids())
def test_load_estate_flow(name: str) -> None:
    fl = flow_mod.load_flow(name)
    assert fl.id == name
    assert len(fl.stages) >= 1


def test_estate_flows_found() -> None:
    # 2026-09-05: trellis2-gate retired (the broken flow bypassed the
    # native comfyui action card; the card IS the trellis lane via
    # {model: "trellis2-native", input_image: ...}). Estate flows are
    # audio-native-tts + kimodo-native — the lanes that survive
    # end-to-end via the {flow:name} door.
    assert len(flow_mod.scan_flow_ids()) >= 2


# C2: unknown flow refused
def test_unknown_flow_refused() -> None:
    with pytest.raises(ValidationError):
        resolve_request({"flow": "no-such-lane"})


# C3: no selection refused
def test_no_selection_refused() -> None:
    with pytest.raises(ValidationError):
        resolve_request({"prompt": "x"})


# ── the multi-step compose surface (flow_inline + validate door) ────
#
# The AI feedback loop (typed-edges design record): an agent
# constructs flows as JSON, compiles them against the SAME
# validators a flows/<id>/flow.py module meets, and iterates on
# verbatim refusals — no queue slot, no GPU, no sidecar.

_INLINE_TWO_STEP = {
    "id": "wall-two-step",
    "description": "still then motion",
    "stages": [
        {"id": "still", "engine": "comfyui", "params": {},
         "outputs": {"default": "image"}},
        {"id": "move", "engine": "comfyui",
         "inputs": {"img": {"stage": "still", "output": "default"}},
         "expected": {"img": "image"},
         "outputs": {"default": "video"}},
    ],
}


def test_flow_inline_resolves_to_graph() -> None:
    graph = resolve_request({"flow_inline": _INLINE_TWO_STEP})
    assert [n.node_id for n in graph.nodes] == ["still", "move"]
    assert graph.nodes[1].input_from == ("still.default",)


def test_flow_inline_kind_mismatch_verbatim() -> None:
    import copy
    body = copy.deepcopy(_INLINE_TWO_STEP)
    body["stages"][1]["expected"]["img"] = "text"
    with pytest.raises(ValidationError) as ei:
        resolve_request({"flow_inline": body})
    assert ("stage 'move' input 'img': expected text, got image from "
            "stage 'still' output 'default' — must be text") in str(ei.value)


def test_flow_inline_dead_rider_refused() -> None:
    import copy
    body = copy.deepcopy(_INLINE_TWO_STEP)
    body["yaml"] = "retired key"
    with pytest.raises(ValidationError) as ei:
        resolve_request({"flow_inline": body})
    assert "unknown keys ['yaml']" in str(ei.value)


def test_flow_inline_kind_typo_names_vocabulary() -> None:
    import copy
    body = copy.deepcopy(_INLINE_TWO_STEP)
    body["stages"][0]["outputs"]["default"] = "vidio"
    with pytest.raises(ValidationError) as ei:
        resolve_request({"flow_inline": body})
    assert "not a Kind" in str(ei.value)
    assert "video" in str(ei.value)  # the vocabulary is in the message


def test_ambiguous_doors_refused() -> None:
    with pytest.raises(ValidationError) as ei:
        resolve_request({"flow": "kimodo-native", "model": "krea-2"})
    assert "ambiguous" in str(ei.value)
    with pytest.raises(ValidationError):
        resolve_request({"flow_inline": _INLINE_TWO_STEP, "model": "krea-2"})


def test_validate_door_compiles_without_registering() -> None:
    """The HTTP door: 200 with the typed stage view, 400 with the
    verbatim compile refusal — no queue, no sidecar, no run dir."""
    import asyncio
    import gateway as gw_mod
    import copy

    class _Ctx:
        def __init__(self, j: dict[str, str | list[dict[str, str | dict[str, str] | dict[str, dict[str, str]]]]]) -> None:
            self.json = j

    code, body = asyncio.run(
        gw_mod._h_flows_validate(_Ctx(copy.deepcopy(_INLINE_TWO_STEP))))
    assert code == 200 and body["ok"] is True
    assert body["stages"][1]["outputs"] == {"default": "video"}
    assert body["stages"][1]["inputs"] == ["still.default"]

    bad = copy.deepcopy(_INLINE_TWO_STEP)
    bad["stages"][1]["expected"]["img"] = "mesh"
    code, body = asyncio.run(gw_mod._h_flows_validate(_Ctx(bad)))
    assert code == 400
    assert "must be mesh" in body["error"]


def test_initial_pool_excludes_every_door_key() -> None:
    """The run's tensor pool carries INPUTS, never a graph declaration.
    The flow_inline body is the loudest case: without the exclusion the
    whole typed flow rides the pool as an inert passenger dict (silent
    pollution — every downstream _request.json read sees it)."""
    import gateway as gw_mod
    pool = gw_mod.initial_pool({
        "flow_inline": _INLINE_TWO_STEP,
        "prompt": "a still, then motion",
        "seed": 7,
    })
    assert pool == {"prompt": "a still, then motion", "seed": 7}
    # every door key excluded — including the retired yaml spelling
    for door in gw_mod.DOOR_KEYS:
        pool = gw_mod.initial_pool({door: object(), "prompt": "x"})
        assert door not in pool


# C4: illegal identifier refused (traversal dies at the door)
def test_illegal_ident_refused() -> None:
    with pytest.raises(ValidationError):
        resolve_request({"flow": "../etc"})


# C5: inject unresolved tensor = LOUD
def test_inject_unresolved_loud() -> None:
    with pytest.raises(ValidationError):
        expand_inject({"inject": {"2.prompt": "$missing"}}, {"prompt": "x"})


# C5b: inline workflow + inject = compose bug
def test_workflow_inject_exclusive() -> None:
    with pytest.raises(ValidationError):
        expand_inject({"workflow": {"N.0": {"class_type": "X", "inputs": {}}},
                       "inject": {"N.0.x": 1}}, {})


# C5c: workflow deep-walk substitutes RESOLVING tensors
def test_workflow_deep_walk_resolves() -> None:
    _wf = {"A.0": {"class_type": "X", "inputs": {
        "prompt": "$prompt", "seed": "$seed",
        "note": "$100 bill stays", "img": ["LoadImage.0", 0]}}}
    _out = expand_inject({"workflow": _wf}, {"$prompt": "hi", "seed": 7})
    _i = _out["workflow"]["A.0"]["inputs"]
    assert _i["prompt"] == "hi" and _i["seed"] == 7
    assert _i["note"] == "$100 bill stays"
    assert _i["img"] == ["LoadImage.0", 0]


# C6: unknown stage field refused (extra=forbid — the parser-era
# "bad params" reborn: a wrong shape cannot even be DECLARED).
# ValueError covers FlowError AND pydantic's ValidationError (both
# subclass it — construction refusals, never silent)
def test_bad_stage_shape_refused() -> None:
    with pytest.raises(ValueError):
        Stage(id="a", engine="comfyui", no_such_field=1)


# C7: duplicate stage ids refused at construction
def test_dup_stage_ids_refused() -> None:
    with pytest.raises(ValueError, match="duplicate stage id"):
        Flow(id="x", stages=(
            Stage(id="a", engine="comfyui"),
            Stage(id="a", engine="comfyui")))


# C8: a wire to a LATER/missing stage refused at construction (the
# graph is a chain, not a soup — forward refs die here, not on GPU)
def test_forward_wire_refused() -> None:
    with pytest.raises(ValueError, match="EARLIER"):
        Flow(id="x", stages=(
            Stage(id="a", engine="comfyui",
                  inputs={"mesh": FromStage(stage="b", output="glb")}),
            Stage(id="b", engine="comfyui")))


# C9: missing initial refused
def test_missing_initial_refused() -> None:
    from gateway import resolve_inputs
    with pytest.raises(ValidationError):
        resolve_inputs(NodeRow(node_id="n", node_type="t",
                                input_from=("__initial__.prompt",)), {})


# C10: dollar tensor resolution
def test_dollar_tensor_from_params() -> None:
    from gateway import resolve_inputs
    out = resolve_inputs(NodeRow(node_id="n", node_type="t",
                                  input_from=("__initial__.$seed",)),
                         {"params": {"seed": 7}, "prompt": "x"})
    assert out.get("$seed") == 7, repr(out)


# C11: card model arm resolves
def test_card_model_arm() -> None:
    resolved = resolve_request({"model": "h3-timeline",
                                "params": {"calls": [
                                    {"text": "x", "start_frame": 0,
                                     "end_frame": 56}]}})
    assert isinstance(resolved, dict) and resolved.get("__card__"), repr(type(resolved))


# C12: unknown model refused
def test_unknown_model_refused() -> None:
    with pytest.raises(ValidationError):
        resolve_request({"model": "no-such-model"})


# ── PLUGIN BUS WALL ──
import plugins  # noqa: E402


# C13: every engine type is owned by exactly one plugin
def test_engine_scan_one_owner() -> None:
    engines = plugins.scan_engines()
    owners = {k: e.plugin_id for k, e in engines.items()}
    assert owners.get("comfyui") == "comfyui"
    assert owners.get("audio_cpp") == "audio-cpp"
    # ffmpeg_concat retired 2026-09-04: concat goes through comfyui's
    # VHS / melite-audio-nodes (the live ffmpeg-backed nodes); the
    # CLI-wrapper engine plugin and its dedicated type are gone.
    assert "ffmpeg_concat" not in owners
    assert "echo" not in owners


# C14: deterministic model resolution
def test_music3_resolves_comfyui() -> None:
    etype, _my = plugins.resolve_model("music3")
    assert etype == "comfyui", etype


def test_qwen3_tts_resolves_comfyui() -> None:
    etype, _my = plugins.resolve_model("qwen3-tts")
    assert etype == "comfyui", etype


# C15: stanza-less model refused
def test_stanza_less_model_refused() -> None:
    with pytest.raises(plugins.ValidationError):
        plugins.resolve_model("input")


# C16: engines load from owning plugin dir
@pytest.mark.parametrize("engine_type,attr", [
    ("comfyui", "execute"),
    ("audio_cpp", "execute"),
    # ffmpeg_concat retired (VHS / melite-audio-nodes handle concat)
])
def test_engine_loads(engine_type: str, attr: str) -> None:
    mod = plugins.load_engine(engine_type)
    has = (hasattr(mod, attr) or hasattr(mod, "card_compose") or
           getattr(mod, "ENGINE_TYPE", None))
    assert bool(has), "engine %s did not load" % engine_type


# C17: compose refusals are LOUD and BY NAME
@pytest.mark.parametrize("name,body,model,engines", [
    ("knob-map refusal", {"model": "moss-sfx", "params": {"prompt": "x"}}, "moss-sfx", ["audio_cpp"]),
    ("unknown knob refusal", {"model": "qwen3-tts", "params": {"text": "hi", "bogus": 1}}, "qwen3-tts", ["audio_cpp"]),
    ("required missing refusal", {"model": "qwen3-tts", "params": {"seed": 5}}, "qwen3-tts", ["audio_cpp"]),
])
def test_compose_refusals(name: str, body: dict[str, str | dict[str, str | int]], model: str, engines: list[str]) -> None:
    with pytest.raises(plugins.ValidationError):
        plugins.compose(body, model, "", None, engines)


# C18: card kinds compose real graphs
def test_krea2_composes_generate_node() -> None:
    yml, extra = plugins.compose({"model": "krea-2", "params": {"prompt": "fox"}},
                                  "krea-2", "run-W1", None, ["comfyui"])
    _wf = json.dumps(yml.nodes[0].params["workflow"])
    assert yml.nodes[0].node_id == "generate" and "SaveImage" in _wf
    assert isinstance(yml.nodes[0].params["workflow"], dict)


def test_music3_composes_music_node() -> None:
    yml, extra = plugins.compose({"model": "music3", "params": {"prompt": "Genre: x"}},
                                  "music3", "run-W2", None, ["comfyui"])
    _wf = json.dumps(yml.nodes[0].params["workflow"])
    assert yml.nodes[0].node_id == "music" and "SaveAudio" in _wf
    assert isinstance(yml.nodes[0].params["workflow"], dict)


# C19: no engine names in the core (ffmpeg_concat retired 2026-09-04
# — the core never named it and never should; the check is gone too)
def test_core_names_no_engine() -> None:
    gw_src = (REPO / "py" / "gateway.py").read_text()
    core_ok = not any(t in gw_src for t in ('"comfyui"', '"audio_cpp"'))
    assert core_ok, "engine literal in gateway.py"


# C20: golden parity wall
def test_golden_parity_wall() -> None:
    r = subprocess.run([sys.executable, str(REPO / "tests" / "golden_compose" / "_runner.py")],
                       capture_output=True, text=True)
    assert r.returncode == 0, r.stdout[-400:] if r.returncode else ""
