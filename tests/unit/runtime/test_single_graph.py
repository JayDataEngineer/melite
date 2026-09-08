"""SINGLE-GRAPH COMPILE WALL (stroke 5, 2026-09-06) — pure-comfyui
flows submit ONCE.

Design record: docs/design/one-contract-compose.md tier 1 (landed).
Two layers pinned:

  PLANNER (packages/engines/comfyui/compose/mergegraph.py, pure):
    * namespacing (<stage>::<node>) + the cross-stage $spell →
      DIRECT node link (artifacts pass inside the engine)
    * initials substitute from the request pool
    * an unknown $spell refuses LOUD (no later seam in merged mode)
    * ambiguous Save nodes without a declared output_nodes row
      refuse; the declared row wins
    * a wire to an upstream that produces nothing refuses

  WORKER PATH (py/gateway.py _try_merged):
    * a pure-comfyui run executes via ONE execute_flow call, every
      stage row completes with outputs/artifacts stamped (the same
      carry/url/gallery shape the per-stage loop writes), and the
      sidecar marks the merged path
    * a mixed-engine run returns False (the per-stage loop stands)
    * an engine failure fails the stages + raises (no silent replay)
"""

import asyncio
import sys
from collections.abc import Callable
from pathlib import Path
from types import ModuleType

import pytest

# Stub values mirror engine ABIs as decoded JSON (annotations only).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import gateway  # noqa: E402
import flow  # noqa: E402
import plugins  # noqa: E402
from flow_graph import FlowGraph, NodeRow  # noqa: E402

eng = plugins.load_engine("comfyui")


# ── the planner ────────────────────────────────────────────────────

_WF_GEN = {
    "k": {"class_type": "KSampler", "inputs": {"seed": 42}},
    "s": {"class_type": "SaveImage",
          "inputs": {"images": ["k", 0]}},
}
# ROW 4 (2026-09-07): the cross-stage consumer's $spell must sit
# in a TENSOR slot — live-probed run-c97e67b10fb8 refused a producer
# link landing in LoadImage's file slot (exception_during_inner_
# validation at POST /prompt). The fixture's consumer is a tensor
# node; the file-slot refusal has its own wall below.
_WF_EDIT = {
    "k": {"class_type": "ImageScale", "inputs": {
        "image": "$photo", "upscale_method": "lanczos",
        "width": 1920, "height": 1080, "crop": "disabled"}},
    "s": {"class_type": "SaveImage", "inputs": {"images": ["k", 0]}},
}


def _two_stage_rows() -> list[dict[str, JsonValue]]:
    return [
        {"stage_id": "gen", "workflow": dict(_WF_GEN),
         "input_names": {}, "outputs": {"default": "image"}},
        {"stage_id": "edit", "workflow": dict(_WF_EDIT),
         "input_names": {"photo": "gen.default"},
         "outputs": {"default": "image"}},
    ]


def test_planner_namespaces_and_links_cross_stage() -> None:
    plan = eng.plan_merge(_two_stage_rows(), {})
    wf = plan["workflow"]
    assert sorted(wf) == ["edit::k", "edit::s", "gen::k", "gen::s"]
    # the $photo spell became a DIRECT link to the upstream producer
    assert wf["edit::k"]["inputs"]["image"] == ["gen::s", 0]
    # the producers map is namespaced, channel-keyed
    assert plan["producers"]["gen"] == {"gen::s": "default"}


def test_planner_namespaces_in_stage_wires_and_gate_refuses_danglers() -> None:
    """2026-09-06 gap-fix wall (live-probed: krea-2/anima/z-image/
    ideogram all 400'd at the live server — KeyError 'VAEDecode.0'):
    the merge namespaced top-level node ids but left IN-STAGE link
    tuples bare, and no wall checked wire integrity. Now: in-stage
    wires rewrite to the namespaced id, and a dangling wire is a
    plan-time construction refusal."""
    wf = {
        "v": {"class_type": "VAELoader",
              "inputs": {"vae_name": "ae.safetensors"}},
        "d": {"class_type": "VAEDecode",
              "inputs": {"samples": ["k", 0], "vae": ["v", 0]}},
        "k": {"class_type": "KSampler", "inputs": {"seed": 7}},
        "s": {"class_type": "SaveImage", "inputs": {"images": ["d", 0]}},
    }
    plan = eng.plan_merge(
        [{"stage_id": "gen", "workflow": wf, "input_names": {},
          "outputs": {"default": "image"}}], {})
    m = plan["workflow"]
    assert m["gen::d"]["inputs"]["samples"] == ["gen::k", 0]
    assert m["gen::d"]["inputs"]["vae"] == ["gen::v", 0]
    assert m["gen::s"]["inputs"]["images"] == ["gen::d", 0]
    # the gate: a wire naming a node the merged graph does not carry
    # refuses at PLAN time, never at the server
    bad = {"s": {"class_type": "SaveImage",
                 "inputs": {"images": ["ghost", 0]}}}
    with pytest.raises(Exception, match="ghost"):
        eng.plan_merge(
            [{"stage_id": "gen", "workflow": bad, "input_names": {},
              "outputs": {"default": "image"}}], {})


def test_planner_substitutes_initials() -> None:
    wf = {"t": {"class_type": "CLIPTextEncode", "inputs": {"text": "$prompt"}},
          "s": {"class_type": "SaveImage", "inputs": {"images": ["t", 0]}}}
    plan = eng.plan_merge(
        [{"stage_id": "one", "workflow": wf, "input_names": {},
          "outputs": {"default": "image"}}],
        {"prompt": "a cat"})
    assert plan["workflow"]["one::t"]["inputs"]["text"] == "a cat"


def test_planner_refuses_unknown_spells() -> None:
    wf = {"t": {"class_type": "CLIPTextEncode", "inputs": {"text": "$nope"}},
          "s": {"class_type": "SaveImage", "inputs": {}}}
    with pytest.raises(Exception, match="nope"):
        eng.plan_merge(
            [{"stage_id": "x", "workflow": wf, "input_names": {},
              "outputs": {}}], {})


def test_planner_ambiguous_saves_refuse_and_declared_row_wins() -> None:
    two_saves = {
        "a": {"class_type": "SaveImage", "inputs": {}},
        "b": {"class_type": "SaveImage", "inputs": {}},
    }
    row = {"stage_id": "x", "workflow": two_saves, "input_names": {},
           "outputs": {"default": "image"}}
    with pytest.raises(Exception, match="output_nodes"):
        eng.plan_merge([row], {})
    ok = eng.plan_merge(
        [{**row, "output_nodes": {"default": "a"}}], {})
    assert ok["producers"]["x"] == {"x::a": "default"}


def test_planner_refuses_wire_to_barren_upstream() -> None:
    barren = {"k": {"class_type": "KSampler", "inputs": {}}}  # no Save
    rows = [
        {"stage_id": "up", "workflow": barren, "input_names": {},
         "outputs": {"default": "image"}},
        {"stage_id": "down", "workflow": dict(_WF_EDIT),
         "input_names": {"photo": "up.default"},
         "outputs": {"default": "image"}},
    ]
    with pytest.raises(Exception, match="up"):
        eng.plan_merge(rows, {})


# ── the worker path ────────────────────────────────────────────────


def _run_for(nodes: tuple[NodeRow, ...], tmp_path: Path) -> "gateway.Run":
    run = gateway.Run(
        run_id="run-m", graph=FlowGraph(name="t", nodes=nodes),
        request={"prompt": "hi"}, draft_id="d" * 96,  # CARD BIRTH LAW
        stages=[{"id": n.node_id, "index": i, "status": "queued"}
                for i, n in enumerate(nodes)],
        out_root=tmp_path)
    run.dir.mkdir(parents=True, exist_ok=True)   # the worker's
    # registration step normally creates it before execute()
    return run


def _fake_comfyui(calls: list[dict[str, JsonValue]],
                    result: dict[str, JsonValue] | Exception) -> ModuleType:
    stub = ModuleType("fake_comfyui")

    def stage_workflow(params: dict[str, JsonValue]) -> JsonValue | None:
        return params.get("workflow")

    async def execute_flow(rows: list[dict[str, JsonValue]],
                           run_dir: str | Path,
                           stop_event: asyncio.Event,
                           report: Callable[[dict[str, JsonValue]], None] | None = None,
                           initials: dict[str, JsonValue] | None = None
                           ) -> dict[str, JsonValue]:
        calls.append({"rows": rows, "initials": dict(initials or {})})
        if isinstance(result, Exception):
            raise result
        return result

    stub.stage_workflow = stage_workflow
    stub.execute_flow = execute_flow
    return stub


def test_worker_merged_path_one_submit(tmp_path: Path,
                                        monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list = []
    art = str(tmp_path / "out.png")
    stub = _fake_comfyui(calls, {
        "stages": {"gen": {"outputs": {"default": art},
                           "artifacts": [art]}}})
    monkeypatch.setattr(gateway, "load_engine", lambda _t: stub)
    nodes = (
        NodeRow(id="gen", type="comfyui",
                params={"workflow": dict(_WF_GEN)},
                outputs={"default": "image"},
                input_names={}),
    )
    run = _run_for(nodes, tmp_path)
    gw = gateway.Gateway()
    assert asyncio.run(gw._try_merged(run, {"prompt": "hi"})) is True
    assert len(calls) == 1, "ONE submit, not one per stage"
    assert calls[0]["initials"]["prompt"] == "hi"
    stage = run.stages[0]
    assert stage["status"] == "completed"
    assert stage.get("merged") is True
    assert stage["url"].endswith("out.png")
    assert run.artifacts == [art]


def test_worker_mixed_engines_fall_back(
        tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list = []
    monkeypatch.setattr(
        gateway, "load_engine",
        lambda _t: _fake_comfyui(calls, {}))
    nodes = (
        NodeRow(id="a", type="comfyui", params={"workflow": {}}),
        NodeRow(id="b", type="autoremesher", params={}),
    )
    run = _run_for(nodes, tmp_path)
    gw = gateway.Gateway()
    assert asyncio.run(gw._try_merged(run, {})) is False
    assert not calls, "mixed engines never reach the merged path"


def test_worker_merged_failure_fails_stages(
        tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list = []
    stub = _fake_comfyui(calls, RuntimeError("boom on the server"))
    monkeypatch.setattr(gateway, "load_engine", lambda _t: stub)
    nodes = (NodeRow(id="gen", type="comfyui",
                     params={"workflow": dict(_WF_GEN)}),)
    run = _run_for(nodes, tmp_path)
    gw = gateway.Gateway()
    with pytest.raises(RuntimeError):
        asyncio.run(gw._try_merged(run, {}))
    assert run.stages[0]["status"] == "failed"
    assert "boom" in run.stages[0]["error"]


# ── the transport: ONE submit through the REAL execute_flow ────────

def test_execute_flow_submits_once_and_harvests_per_stage(
        tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    import mergegraph as mg   # the compose package's flat module name
    posts: list[str] = []
    fetches: list[tuple[str, dict]] = []

    monkeypatch.setattr(mg, "_server_url", lambda: "http://fake")
    monkeypatch.setattr(mg, "_upload_referenced", _fake_upload)
    monkeypatch.setattr(mg, "_ws_tap", _fake_tap)

    def _http(method: str, url: str, *a: JsonValue, **k: JsonValue
                ) -> tuple[int, dict[str, JsonValue]]:
        if method == "POST" and url.endswith("/prompt"):
            posts.append(url)
            return 200, {}
        if url.startswith("http://fake/history/"):
            pid = url.rsplit("/", 1)[1]   # the merged prompt_id
            return 200, {pid: {
                "status": {"status_str": "success", "completed": True},
                "outputs": {
                    "gen::s": {"images": [
                        {"filename": "a.png", "subfolder": "",
                         "type": "temp"}]},
                    "edit::s": {"images": [
                        {"filename": "b.png", "subfolder": "",
                         "type": "temp"}]},
                }}}
        raise AssertionError("unexpected %s %s" % (method, url))

    monkeypatch.setattr(mg, "_http", _http)

    def _fake_fetch(server: str, stage_dir: str | Path,
                      sub_entry: dict[str, JsonValue]) -> list[str]:
        fetches.append((str(stage_dir), dict(sub_entry)))
        name = sorted(sub_entry["outputs"])[0]
        p = Path(stage_dir)
        p.mkdir(parents=True, exist_ok=True)
        out = p / (name.split("::")[-1] + ".png")
        out.write_bytes(b"png")
        return [str(out)]

    monkeypatch.setattr(mg, "_fetch_outputs", _fake_fetch)

    rows = _two_stage_rows()
    for r in rows:      # a tight budget: a regression must fail in
        r["params"] = {"timeout_s": 5}   # seconds, never hours
    result = asyncio.run(eng.execute_flow(
        rows, tmp_path, asyncio.Event(), initials={}))
    assert len(posts) == 1, "the merged graph submits exactly ONCE"
    assert list(result["stages"]) == ["gen", "edit"]
    # per-stage harvest: each stage's namespaced nodes, its own dir
    dirs = {Path(d).name for d, _ in fetches}
    assert dirs == {"gen", "edit"}
    assert set(fetches[0][1]["outputs"]) == {"s"}   # prefix stripped
    gen_out = result["stages"]["gen"]["outputs"]
    assert list(gen_out) == ["default"]
    # the submitted graph carried the DIRECT link, not a disk path
    assert _fake_upload.wf["edit::k"]["inputs"]["image"] == ["gen::s", 0]


def _fake_upload(server: str, wf: dict[str, dict[str, JsonValue]]
                 ) -> tuple[dict[str, dict[str, JsonValue]], dict[str, JsonValue]]:
    _fake_upload.wf = wf
    return wf, {}


async def _fake_tap(server: str, client_id: str,
                    events: asyncio.Queue[dict[str, JsonValue]],
                    prompt_id: str) -> None:
    return None


# ── coverage: what the REAL flows do today ──────────────────────────

def test_real_flow_coverage() -> None:
    """Pinned 2026-09-06, updated ROW 4 (2026-09-07): pure-comfyui
    card flows merge (image-upscale is now TWO card stages — the
    bridge expands doc $spells against the initials pool the merged
    path builds, both Save producers auto-bind, ONE submit); the
    multi-stage character pipeline REFUSES at its mesh wires (non-
    Save producers need output_nodes declarations — the declared-
    producer follow-up, gated on a live socket-type canary) and
    falls back per-stage; music-native is mixed (audio_cpp) and
    never enters the path."""
    def build(fid: str, initials: dict[str, JsonValue] | None = None) -> tuple[tuple[NodeRow, ...], list[dict[str, JsonValue]]]:
        fl = flow.load_flow(fid)
        nodes = fl.to_graph().nodes
        # the merged path's own pool build: name-keyed initials,
        # artifact-absolutized per FILE-kind expected
        pool = dict(initials or {})
        for n in nodes:
            names = getattr(n, "input_names", None) or {}
            ins = {}
            for name, ref in names.items():
                if str(ref).startswith("__initial__."):
                    key = str(ref).split(".", 1)[1]
                    if key in pool:
                        ins[str(name)] = pool[key]
            pool.update(ins)
        rows = []
        for n in nodes:
            params = dict(n.params or {})
            if getattr(n, "card", ""):
                params = gateway._card_bridge(n, params, "probe",
                                              inputs=pool)
            wf = eng.stage_workflow(params)
            rows.append({"stage_id": n.node_id, "workflow": wf,
                         "input_names": dict(n.input_names or {}),
                         "outputs": dict(n.outputs or {}),
                         "output_nodes": params.get("output_nodes") or {},
                         "params": params})
        return nodes, rows

    nodes, rows = build("image-upscale", {"prompt": "x"})
    assert all(n.node_type == "comfyui" for n in nodes)
    # ROW 4 (2026-09-07, live-probed run-c97e67b10fb8): the upscale
    # arm renders its wired input through LoadImage — a producer
    # link cannot land in a file slot, so the plan REFUSES and the
    # gateway falls back per-stage (the disk handoff path). The
    # tensor entry (drop the loader) is the recorded follow-up.
    with pytest.raises(Exception, match="file slot"):
        eng.plan_merge(rows, {"prompt": "x"})

    nodes, rows = build("character")
    # the character pipeline's body stage ALSO renders its wired
    # image through LoadImage — the file-slot gate fires BEFORE the
    # mesh-wire gate (both refuse at plan time; both fall back
    # per-stage). ROW 4 2026-09-07: the earlier refusal class wins.
    with pytest.raises(Exception, match="file slot"):
        eng.plan_merge(rows, {"prompt": "x", "character_prompt": "x",
                              "garment_prompt": "x"})

    fl = flow.load_flow("music-native")
    types = {n.node_type for n in fl.to_graph().nodes}
    assert types == {"audio_cpp"}                  # mixed never enters
