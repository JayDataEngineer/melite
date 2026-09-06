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
    JsonValue, ValidationError, expand_inject, resolve_request,
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


# ── CARD BIRTH LAW (operator order 2026-09-06, verbatim) ────────────
#
#   "IF THERE IS NO DRAFT_ID, THAT IS A HARD ERROR! THAT NEEDS TO
#    HAPPEN!"
#
# Every run is born from an action card: submit() refuses a start
# body without a valid, doc-backed draft_id 4xx BEFORE any run
# registers. This is the wall that makes the media sidebar's
# "run has no action card (no draft_id in its run row)" click error
# UNREACHABLE for every run born after the law — the row shape
# cannot exist. (QUEUE LANE LAW shape: refusal before registration,
# no zombie slot; law text: AGENTS.md CARD BIRTH LAW.)

import asyncio  # noqa: E402

import gateway as gw_mod  # noqa: E402


class TestStartDoorRequiresDraft:
    """The registration door hard-refuses cardless starts."""

    @staticmethod
    def _gateway(monkeypatch: pytest.MonkeyPatch,
                 tmp_path: Path) -> gw_mod.Gateway:
        # submit()'s existence check reads STATE_ROOT; registration
        # writes run dirs under OUT_ROOT/TEST_OUT_ROOT — all patched
        # to the scratch so the wall never touches repo state.
        monkeypatch.setattr(gw_mod, "STATE_ROOT", tmp_path)
        monkeypatch.setattr(gw_mod, "OUT_ROOT", tmp_path / "output")
        monkeypatch.setattr(gw_mod, "TEST_OUT_ROOT", tmp_path / "test-output")
        return gw_mod.Gateway()

    def test_missing_draft_id_refused_before_registration(
            self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        gw = self._gateway(monkeypatch, tmp_path)
        with pytest.raises(ValidationError) as ei:
            asyncio.run(gw.submit({"flow_inline": _INLINE_TWO_STEP}))
        assert "draft_id is required" in str(ei.value)
        # 4xx BEFORE registration: no run row, no queue slot, no dir
        assert gw.runs == {} and gw.order == []
        assert not (tmp_path / "output").exists()

    def test_envelope_first_draft_named_before_flow_resolution(
            self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        # even a body that would ALSO refuse at resolve names its own
        # field first — the envelope refusal never masquerades as a
        # flow/params error (ENVELOPE-FIRST, 2026-09-06)
        gw = self._gateway(monkeypatch, tmp_path)
        with pytest.raises(ValidationError) as ei:
            asyncio.run(gw.submit({"flow": "no-such-lane"}))
        assert "draft_id is required" in str(ei.value)

    def test_empty_and_malformed_draft_id_refused(
            self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        gw = self._gateway(monkeypatch, tmp_path)
        for bad, want in (("", "draft_id is required"),
                          ("bad id!", "draft_id malformed"),
                          ("draft/" + "x" * 90, "draft_id malformed")):
            with pytest.raises(ValidationError) as ei:
                asyncio.run(gw.submit(
                    {"flow_inline": _INLINE_TWO_STEP, "draft_id": bad}))
            assert want in str(ei.value)
        assert gw.runs == {} and gw.order == []

    def test_dangling_draft_id_refused(
            self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        # a draft_id naming no card doc reproduces the exact click
        # error the law kills (the reader strips dangling ids) — the
        # door refuses it like any unresolved request
        gw = self._gateway(monkeypatch, tmp_path)
        with pytest.raises(ValidationError) as ei:
            asyncio.run(gw.submit({"flow_inline": _INLINE_TWO_STEP,
                                   "draft_id": "draft-nope"}))
        assert "unknown draft_id" in str(ei.value)
        assert gw.runs == {} and gw.order == []

    def test_doc_backed_draft_registers_and_sidecar_carries_it(
            self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        import editor_runs as _er
        gw = self._gateway(monkeypatch, tmp_path)
        code, resp = _er.drafts_save(
            str(tmp_path / "drafts"), {"intent": "wall card",
                                       "stages": []})
        assert code == 200
        did = resp["draftId"]
        run = asyncio.run(gw.submit({"flow_inline": _INLINE_TWO_STEP,
                                     "draft_id": did}))
        assert run.draft_id == did
        assert gw.order == [run.run_id]
        flow_doc = json.loads(
            (tmp_path / "output" / run.run_id / "_flow.json").read_text())
        assert flow_doc["draft_id"] == did


def test_validate_door_compiles_without_registering() -> None:
    """The HTTP door: 200 with the typed stage view, 400 with the
    verbatim compile refusal — no queue, no sidecar, no run dir."""
    import asyncio
    import gateway as gw_mod
    import copy

    class _Ctx:
        def __init__(self, j: dict[str, str | list[dict[str, str | dict[str, str] | dict[str, dict[str, str]]]]]) -> None:
            self.json = j
            # R4.3: validate reads ctx.gw for the cost block
            self.gw = gw_mod.Gateway()

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


# ── PIPE-CARRY RETIREMENT (2026-09-05) ──
# The card wire is params-only: no gateway ever read `pipe`/`stage_id`,
# no status ever emitted `flow_doc` (the revive rail is the draft +
# the run registry). The client stopped sending the stowaways and the
# gateway refuses them BEFORE registration — a fossil card body is a
# compile error, never a run. Operator order: "THESE ERRORS NEED BE
# CAUGHT COMPILE TIME, NOT INFERENCE TIME".

def test_retired_carry_keys_refused_before_registration() -> None:
    import gateway as gw_mod
    with pytest.raises(ValidationError) as ei:
        gw_mod._strict_body({"model": "krea-2", "prompt": "x",
                             "pipe": {"stages": []}, "stage_id": "s0"})
    assert "retired pipe-carry key(s)" in str(ei.value)
    assert "params only" in str(ei.value)


def test_card_compose_body_lifts_envelope() -> None:
    """The body a card arm receives: envelope keys (door + draft_id +
    test) lifted, everything else restaged as the ONE params stanza.
    Wall-pinned shape — the arms' flat-form branch retired with it.
    Two payload shapes ride the stanza: flat cards post params at top
    level ({model, prompt} -> {"params": {"prompt"}}); doc cards (h3)
    post their doc under a literal `params` key, which the lift keeps
    ({model, params: {calls}} -> {"params": {"params": {calls}}})."""
    import gateway as gw_mod
    assert gw_mod.card_compose_body(
        {"model": "krea-2", "prompt": "x"}) == {"params": {"prompt": "x"}}
    assert gw_mod.card_compose_body(
        {"model": "h3-timeline", "params": {"calls": []},
         "draft_id": "d", "test": True}) == {
             "params": {"params": {"calls": []}}}


def test_validate_model_arm_catches_card_errors_compile_time() -> None:
    """The {model} arm of the validate door runs the EXACT phase-1 chain
    a start would run — no queue slot, no GPU claim, no sidecar, no
    registration. Four cases, verbatim refusals."""
    import asyncio
    import gateway as gw_mod

    class _Ctx:
        def __init__(self, j: dict[str, str | int | dict[str, list[str]]]) -> None:
            self.json = j
            self.gw = gw_mod.Gateway()   # R4.3: validate cost block

    # 1. a clean card compiles
    code, out = asyncio.run(gw_mod._h_flows_validate(
        _Ctx({"model": "krea-2", "prompt": "x"})))
    assert code == 200
    # R4.3: the model-arm 200 now also carries the cost block
    # (queue truth; engine medians unknown until compose builds
    # the graph, so stages is empty here)
    assert out == {"ok": True, "model": "krea-2", "card": True,
                   "cost": {"queue_depth": 0, "eta_queue_s": None,
                            "stages": []}}

    # 2. an unknown knob is the frozen-row refusal (the 2026-09-05 live
    # failure: ImageGenParams stepz "Extra inputs are not permitted") —
    # at COMPILE time, not inference time
    code, out = asyncio.run(gw_mod._h_flows_validate(
        _Ctx({"model": "krea-2", "prompt": "x", "stepz": 1})))
    assert code == 400
    assert "Extra inputs are not permitted" in out["error"]

    # 3. a dangling artifact ref is the sweep refusal (the 2026-09-05
    # live failure: SaveImage gallery url of a pruned run)
    code, out = asyncio.run(gw_mod._h_flows_validate(
        _Ctx({"model": "qwen-img-edit-2511", "prompt": "x",
              "input_image": "/v1/assets/runs/no-such-run/x.png"})))
    assert code == 400
    assert "dangling artifact ref" in out["error"]

    # 4. the retired stowaways refuse with the retirement reason
    code, out = asyncio.run(gw_mod._h_flows_validate(
        _Ctx({"model": "krea-2", "prompt": "x",
              "pipe": {"stages": []}, "stage_id": "s0"})))
    assert code == 400
    assert "retired pipe-carry key(s)" in out["error"]


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


# C15: stanza-less model refused (input boarded 2026-09-05, so the
# pin moves to auto-detect: offered form, no engine stanza)
def test_stanza_less_model_refused() -> None:
    with pytest.raises(plugins.ValidationError):
        plugins.resolve_model("auto-detect")


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


# C21: the uploads door (browser → estate input stream, 2026-09-06 —
# operator order "THERE IS NO WAY FOR ME TO PUT AN IMAGE IN").
# Strict JSON {filename, data:}; the handler writes
# data/input/<stem>-<id>.<ext> and returns the composable
# repo-relative path. Refusals are 4xx — never a stored partial.
# REPO is monkeypatched so the wall never touches the real stream.
class _UploadCtx:
    """The uploads-door request double: carries the JSON doc.
    Also doubles for validate-door calls — R4.3 added the cost
    block, which reads ctx.gw (fresh Gateway: empty rings, honest
    Nones)."""
    def __init__(self, j: JsonValue) -> None:
        self.json = j
        import gateway as _gw
        self.gw = _gw.Gateway()


def _upload_ctx(doc: JsonValue) -> _UploadCtx:
    return _UploadCtx(doc)


def _tiny_png_data_url() -> str:
    import base64
    raw = b"\x89PNG\r\n\x1a\n" + b"0" * 64
    return "data:image/png;base64," + base64.b64encode(raw).decode()


def test_uploads_door_happy_path(monkeypatch: pytest.MonkeyPatch,
                                 tmp_path: Path) -> None:
    import asyncio
    import gateway as gw_mod
    monkeypatch.setattr(gw_mod, "REPO", tmp_path)
    code, out = asyncio.run(gw_mod._h_uploads(
        _upload_ctx({"filename": "me.png", "data": _tiny_png_data_url()})))
    assert code == 200
    assert out["path"].startswith("data/input/me-")
    assert out["path"].endswith(".png")
    assert (tmp_path / out["path"]).is_file()


def test_uploads_door_refusal_matrix() -> None:
    import asyncio
    import gateway as gw_mod
    cases = [
        ({}, "filename is required"),
        ({"filename": "a.png", "data": "not-a-data-url"},
         "must be a FileReader"),
        ({"filename": "a.png", "data": "data:image/png;base64"},
         "malformed"),
        ({"filename": "a.gif", "data": "data:image/gif;base64,AAAA"},
         "refused"),
        ({"filename": "a.png", "data": "data:image/png;base64,!!!"},
         "does not decode"),
    ]
    for doc, needle in cases:
        code, out = asyncio.run(gw_mod._h_uploads(_upload_ctx(doc)))
        assert code == 400, doc
        assert needle in out["error"], (doc, out)


def test_uploads_door_sanitizes_traversal(monkeypatch: pytest.MonkeyPatch,
                                          tmp_path: Path) -> None:
    import asyncio
    import gateway as gw_mod
    monkeypatch.setattr(gw_mod, "REPO", tmp_path)
    code, out = asyncio.run(gw_mod._h_uploads(
        _upload_ctx({"filename": "../../evil.png",
                     "data": _tiny_png_data_url()})))
    assert code == 200
    assert ".." not in out["path"]
    assert (tmp_path / out["path"]).is_file()


# C23: the input preview door (2026-09-06 — "We need to have an image
# preview when the card is drilled out for ANNY and IMAGE->3d"). The
# uploads rail returns repo-relative data/input/<name> paths no <img>
# can load; this door serves those bytes back so the drilled-out card
# keeps its source-image preview after reload.
class _PathCtx:
    """Handler double for path-shaped GET doors."""
    def __init__(self, path: str) -> None:
        self.path = path


def test_input_preview_door_roundtrip(monkeypatch: pytest.MonkeyPatch,
                                      tmp_path: Path) -> None:
    import asyncio
    import gateway as gw_mod
    monkeypatch.setattr(gw_mod, "REPO", tmp_path)
    # upload through the real door, then serve the returned path back
    code, out = asyncio.run(gw_mod._h_uploads(
        _upload_ctx({"filename": "me.png", "data": _tiny_png_data_url()})))
    assert code == 200
    name = out["path"].rsplit("/", 1)[1]
    code, data = asyncio.run(gw_mod._h_asset_input(
        _PathCtx("/v1/assets/inputs/" + name)))
    assert code == 200, data
    headers, body = data[1], data[2]
    assert headers["content-type"] == "image/png"
    assert body.startswith(b"\x89PNG")


def test_input_preview_door_refusal_matrix(monkeypatch: pytest.MonkeyPatch,
                                           tmp_path: Path) -> None:
    import asyncio
    import gateway as gw_mod
    monkeypatch.setattr(gw_mod, "REPO", tmp_path)
    target = tmp_path / "data" / "input"
    target.mkdir(parents=True)
    (target / "real.png").write_bytes(b"\x89PNG")
    for path, want, needle in [
        ("/v1/assets/inputs/real.png", 200, None),
        ("/v1/assets/inputs/ghost.png", 404, "input not found"),
        ("/v1/assets/inputs/../../py/gateway.py", 400, "bad path"),
        ("/v1/assets/inputs/nested/real.png", 400, "bad path"),
        ("/v1/assets/inputs/secret.txt", 400, "png/jpeg/webp only"),
    ]:
        code, out = asyncio.run(gw_mod._h_asset_input(_PathCtx(path)))
        assert code == want, (path, code, out)
        if needle is not None:
            assert needle in out["error"], (path, out)


# C22: the validate door's {flow} arm (2026-09-06 — "WHERE THE [REDACTED 2026-11-05]
# IS COMPILE TIME ERRORS"). A named flow + its initials compile
# through the EXACT initial door a start would run: ghost photos
# 400 with the door text, stageable photos 200 with the stage view
# — no queue slot, no sidecar, no registration either way.
def test_validate_flow_arm_happy_path(monkeypatch: pytest.MonkeyPatch,
                                      tmp_path: Path) -> None:
    import asyncio
    import gateway as gw_mod
    target = tmp_path / "data" / "input"
    target.mkdir(parents=True)
    (target / "me.png").write_bytes(b"\x89PNG\r\n\x1a\n")
    monkeypatch.chdir(tmp_path)
    code, out = asyncio.run(gw_mod._h_flows_validate(
        _upload_ctx({"flow": "anny-hmr-commercial",
                     "photo": "data/input/me.png"})))
    assert code == 200, out
    assert out["flow"] == "anny-hmr-commercial"
    assert out["stages"][0]["id"] == "estimate"


def test_validate_flow_arm_refusals(monkeypatch: pytest.MonkeyPatch,
                                    tmp_path: Path) -> None:
    import asyncio
    import gateway as gw_mod
    monkeypatch.chdir(tmp_path)
    code, out = asyncio.run(gw_mod._h_flows_validate(
        _upload_ctx({"flow": "anny-hmr-commercial",
                     "photo": "data:image/png;base64,AAAA"})))
    assert code == 400
    assert "browser-local" in out["error"]
    code, out = asyncio.run(gw_mod._h_flows_validate(
        _upload_ctx({"flow": "anny-hmr-commercial",
                     "photo": "data/input/ghost.png"})))
    assert code == 400
    assert "not on disk" in out["error"]
    code, out = asyncio.run(gw_mod._h_flows_validate(
        _upload_ctx({"flow": "no-such-flow", "photo": "x.png"})))
    assert code == 400
