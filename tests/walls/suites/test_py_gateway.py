"""Queue-law regression for the python gateway (mirrors the C chaos suite
essentials) + the plugin-bus wall (PLUGIN ARCHITECTURE LAW).
No GPU, no network: parser + resolution + compose laws + golden parity."""

import json
import subprocess
import sys
from pathlib import Path

import pytest

from _anchor import REPO

from gateway import (  # noqa: E402
    ValidationError, expand_inject, parse_pipeline_text, resolve_request,
)
from pipeline_graph import NodeRow  # noqa: E402


# C1: every estate yaml parses
@pytest.mark.parametrize("yard", sorted((REPO / "pipelines").glob("*/pipeline.yaml")),
                         ids=lambda y: y.parent.name)
def test_parse_estate_yaml(yard):
    parse_pipeline_text(yard.read_text())


def test_estate_yamls_found():
    yards = sorted((REPO / "pipelines").glob("*/pipeline.yaml"))
    assert len(yards) >= 8, str(len(yards))


# C2: unknown yaml refused
def test_unknown_yaml_refused():
    with pytest.raises(ValidationError):
        resolve_request({"yaml": "no-such-lane"})


# C3: no selection refused
def test_no_selection_refused():
    with pytest.raises(ValidationError):
        resolve_request({"prompt": "x"})


# C4: illegal identifier refused
def test_illegal_ident_refused():
    with pytest.raises(ValidationError):
        resolve_request({"yaml": "../etc"})


# C5: inject unresolved tensor = LOUD
def test_inject_unresolved_loud():
    with pytest.raises(ValidationError):
        expand_inject({"inject": {"2.prompt": "$missing"}}, {"prompt": "x"})


# C5b: inline workflow + inject = compose bug
def test_workflow_inject_exclusive():
    with pytest.raises(ValidationError):
        expand_inject({"workflow": {"N.0": {"class_type": "X", "inputs": {}}},
                       "inject": {"N.0.x": 1}}, {})


# C5c: workflow deep-walk substitutes RESOLVING tensors
def test_workflow_deep_walk_resolves():
    _wf = {"A.0": {"class_type": "X", "inputs": {
        "prompt": "$prompt", "seed": "$seed",
        "note": "$100 bill stays", "img": ["LoadImage.0", 0]}}}
    _out = expand_inject({"workflow": _wf}, {"$prompt": "hi", "seed": 7})
    _i = _out["workflow"]["A.0"]["inputs"]
    assert _i["prompt"] == "hi" and _i["seed"] == 7
    assert _i["note"] == "$100 bill stays"
    assert _i["img"] == ["LoadImage.0", 0]


# C6: bad params refused
def test_bad_params_refused():
    with pytest.raises(ValidationError):
        parse_pipeline_text("nodes:\n  - id: a\n    type: t\n    params: {bad}\n")


# C7: duplicate node ids refused
def test_dup_ids_refused():
    with pytest.raises(ValidationError):
        parse_pipeline_text("nodes:\n  - id: a\n    type: t\n  - id: a\n    type: t\n")


# C8: typeless node refused
def test_typeless_node_refused():
    with pytest.raises(ValidationError):
        parse_pipeline_text("nodes:\n  - id: a\n")


# C9: missing initial refused
def test_missing_initial_refused():
    from gateway import resolve_inputs
    with pytest.raises(ValidationError):
        resolve_inputs(NodeRow(node_id="n", node_type="t",
                                input_from=("__initial__.prompt",)), {})


# C10: dollar tensor resolution
def test_dollar_tensor_from_params():
    from gateway import resolve_inputs
    out = resolve_inputs(NodeRow(node_id="n", node_type="t",
                                  input_from=("__initial__.$seed",)),
                         {"params": {"seed": 7}, "prompt": "x"})
    assert out.get("$seed") == 7, repr(out)


# C11: card model arm resolves
def test_card_model_arm():
    resolved = resolve_request({"model": "h3-timeline",
                                "params": {"calls": [
                                    {"text": "x", "start_frame": 0,
                                     "end_frame": 56}]}})
    assert isinstance(resolved, dict) and resolved.get("__card__"), repr(type(resolved))


# C12: unknown model refused
def test_unknown_model_refused():
    with pytest.raises(ValidationError):
        resolve_request({"model": "no-such-model"})


# ── PLUGIN BUS WALL ──
import plugins  # noqa: E402


# C13: every engine type is owned by exactly one plugin
def test_engine_scan_one_owner():
    engines = plugins.scan_engines()
    owners = {k: e.plugin_id for k, e in engines.items()}
    assert owners.get("comfyui") == "comfyui"
    assert owners.get("audio_cpp") == "audio-cpp"
    assert owners.get("ffmpeg_concat") == "ffmpeg"
    assert "echo" not in owners


# C14: deterministic model resolution
def test_music3_resolves_comfyui():
    etype, _my = plugins.resolve_model("music3")
    assert etype == "comfyui", etype


def test_qwen3_tts_resolves_comfyui():
    etype, _my = plugins.resolve_model("qwen3-tts")
    assert etype == "comfyui", etype


# C15: stanza-less model refused
def test_stanza_less_model_refused():
    with pytest.raises(plugins.ValidationError):
        plugins.resolve_model("input")


# C16: engines load from owning plugin dir
@pytest.mark.parametrize("engine_type,attr", [
    ("comfyui", "execute"),
    ("audio_cpp", "execute"),
    ("ffmpeg_concat", "execute"),
])
def test_engine_loads(engine_type, attr):
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
def test_compose_refusals(name, body, model, engines):
    with pytest.raises(plugins.ValidationError):
        plugins.compose(body, model, "", None, engines)


# C18: card kinds compose real graphs
def test_krea2_composes_generate_node():
    yml, extra = plugins.compose({"model": "krea-2", "params": {"prompt": "fox"}},
                                  "krea-2", "run-W1", None, ["comfyui"])
    _wf = json.dumps(yml.nodes[0].params["workflow"])
    assert yml.nodes[0].node_id == "generate" and "SaveImage" in _wf
    assert isinstance(yml.nodes[0].params["workflow"], dict)


def test_music3_composes_music_node():
    yml, extra = plugins.compose({"model": "music3", "params": {"prompt": "Genre: x"}},
                                  "music3", "run-W2", None, ["comfyui"])
    _wf = json.dumps(yml.nodes[0].params["workflow"])
    assert yml.nodes[0].node_id == "music" and "SaveAudio" in _wf
    assert isinstance(yml.nodes[0].params["workflow"], dict)


# C19: no engine names in the core
def test_core_names_no_engine():
    gw_src = (REPO / "py" / "gateway.py").read_text()
    core_ok = not any(t in gw_src for t in ('"comfyui"', '"audio_cpp"', '"ffmpeg_concat"'))
    assert core_ok, "engine literal in gateway.py"


# C20: golden parity wall
def test_golden_parity_wall():
    r = subprocess.run([sys.executable, str(REPO / "tests" / "golden_compose" / "_runner.py")],
                       capture_output=True, text=True)
    assert r.returncode == 0, r.stdout[-400:] if r.returncode else ""
