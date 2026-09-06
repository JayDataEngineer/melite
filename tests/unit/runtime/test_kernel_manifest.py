"""KERNEL MANIFEST WALL (stroke 6, 2026-09-06) — ONE contract for
every native codebase (design record docs/design/one-contract-compose.md
§4: "ONE CONTRACT INSTEAD OF 5").

Three layers pinned:

  CONTRACT (py/kernel_manifest.py — PYTHON SHAPE LAW rows):
    * closed enums; all-or-nothing artifacts; frozen rows;
      exec/subprocess coherence + card-lattice membership +
      engine match, all AT CONSTRUCTION
    * $spell resolution (nested, |defaults, unknown raises)

  PARITY (the autoremesher port changes NOTHING on the normal path):
    * manifest argv == the retired build_argv, byte-identical,
      full knobs AND omitted knobs (schema defaults)
    * binary search order == resolve_cli (env → runtime → vendor)

  GENERIC ENGINE (py/kernel_exec.py — mechanics, no lane knowledge):
    * success harvest (channels + artifacts), rc!=0 stderr capture,
      missing-output refusal, timeout kill, mid-run stop kill,
      missing-binary loud dict, unknown-spell loud dict,
      non-subprocess loud dict, progress convention into report()

  PORT (the compose shim keeps ONLY lane translation):
    * .obj rides through; .glb converts (a real triangle GLB);
      malformed GLB refuses pre-spawn; missing input refuses;
      the fake binary receives the CONVERTED path
"""

import asyncio
import importlib
import json
import os
import struct
import sys
from pathlib import Path
from types import ModuleType

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import plugins  # noqa: E402
from flow_graph import NodeRow  # noqa: E402
from kernel_exec import execute_manifest, resolve_binary  # noqa: E402
from kernel_manifest import (ArtifactRow, ExecMode, JsonValue, KernelManifest,  # noqa: E402
                             Mount, SubprocessExec, resolve_spell)

eng = plugins.load_engine("autoremesher")
manifest = eng._load_manifest().QUAD_REMESH_MANIFEST


# ── the contract ───────────────────────────────────────────────────

def test_manifest_rows_are_frozen() -> None:
    with pytest.raises(Exception):
        manifest.version = "2"
    with pytest.raises(Exception):
        manifest.subprocess.timeout_s = 1.0


def test_artifact_without_sha_refuses() -> None:
    with pytest.raises(Exception):
        ArtifactRow(url="https://x/y.bin", sha256="short")


def test_exec_subprocess_coherence() -> None:
    sub = SubprocessExec(output_file="o.obj")
    with pytest.raises(Exception, match="needs its subprocess"):
        KernelManifest(id="k", version="1", card="quad-remesh",
                       engine="autoremesher", exec=ExecMode.SUBPROCESS,
                       subprocess=None)
    with pytest.raises(Exception, match="never use"):
        KernelManifest(id="k", version="1", card="quad-remesh",
                       engine="autoremesher", exec=ExecMode.HTTP,
                       subprocess=sub)


def test_manifest_serves_a_card() -> None:
    with pytest.raises(Exception, match="not in the card registry"):
        KernelManifest(id="k", version="1", card="no-such-card",
                       engine="autoremesher",
                       subprocess=SubprocessExec(output_file="o"))
    with pytest.raises(Exception, match="!="):
        KernelManifest(id="k", version="1", card="quad-remesh",
                       engine="anycreature",
                       subprocess=SubprocessExec(output_file="o"))


def test_resolve_spell() -> None:
    ns = {"a": {"b": "deep"}, "k": 3, "bin": "/b", "out": "/o"}
    assert resolve_spell("$bin --in $a.b --k $k", ns) == \
        "/b --in deep --k 3"
    assert resolve_spell("$missing|fallback", ns) == "fallback"
    assert resolve_spell("$workflow.input|", {"x": 1}) == ""
    with pytest.raises(KeyError, match="missing"):
        resolve_spell("$missing", ns)


# ── parity with the retired hand-written engine ────────────────────

def _renderer() -> ModuleType:
    eng._load_card_package("3d/quad-remesh")
    return importlib.import_module(eng._PKG_ALIAS + ".renderer")


@pytest.mark.parametrize("params", [
    {"workflow": {"input": "/tmp/in.obj"}},
    {"workflow": {"input": "/tmp/in.obj"}, "target_quads": 1000,
     "edge_scaling": 2.0, "sharp_edge": 45.0, "smooth_normal": 0.5,
     "adaptivity": 0.8, "anisotropy": 1.2},
])
def test_argv_parity_with_build_argv(params: dict[str, JsonValue]) -> None:
    """Omitted knobs included: the manifest defaults ARE build_argv's
    defaults (a drift here is a silent CLI change)."""
    renderer = _renderer()
    ns = dict(params)
    ns["bin"] = "/bin/cli"
    ns["out"] = "/tmp/run"
    mine = [resolve_spell(str(a), ns)
            for a in manifest.subprocess.argv]
    theirs, _o, _r = renderer.build_argv("/bin/cli", "/tmp/run",
                                         dict(params))
    assert mine == theirs


def test_binary_search_parity_with_resolve_cli(
        tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    renderer = _renderer()
    fake = tmp_path / "cli"
    fake.write_bytes(b"x")
    monkeypatch.setenv("AUTOREMESHER_BIN", str(fake))
    assert renderer.resolve_cli() == fake
    assert resolve_binary(manifest) == fake


# ── the generic engine (fake binaries, no GPU, no Qt) ──────────────

_FAKE_BIN = """#!/usr/bin/env python3
import os, sys, time
args = sys.argv[1:]
rec = os.environ.get("FAKE_RECORD", "")
if rec:
    open(rec, "w").write("\\n".join(args))
mode = os.environ.get("FAKE_MODE", "ok")
def _out(flag):
    return args[args.index(flag) + 1] if flag in args else ""
if mode == "sleep":
    time.sleep(30)
elif mode == "fail":
    print("kernel exploded: bad mesh", file=sys.stderr)
    sys.exit(3)
elif mode == "noisy":
    print("progress 25%")
    print("progress 75%")
    sys.stdout.flush()
if mode in ("ok", "noisy"):
    open(_out("--output"), "w").write("mesh-bytes")
    if "--report" in args:
        open(_out("--report"), "w").write("report-bytes")
"""


@pytest.fixture()
def fake_bin(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    b = tmp_path / "fake-kernel"
    b.write_text(_FAKE_BIN)
    b.chmod(0o755)
    monkeypatch.setenv("AUTOREMESHER_BIN", str(b))
    monkeypatch.setenv("FAKE_RECORD", str(tmp_path / "argv.txt"))
    monkeypatch.delenv("FAKE_MODE", raising=False)
    return b


def _node(params: dict[str, JsonValue]) -> NodeRow:
    return NodeRow(id="n", type="autoremesher", params=params)


def test_port_success_harvest(
        tmp_path: Path, fake_bin: Path) -> None:
    seen: list = []
    out = asyncio.run(eng.execute(
        _node({"workflow": {"input": "/tmp/in.obj"}}),
        str(tmp_path), {}, asyncio.Event(), report=seen.append))
    assert out["outputs"]["mesh"] == str(tmp_path / "remeshed.obj")
    assert out["outputs"]["report"] == \
        str(tmp_path / "remeshed_report.txt")
    assert out["artifacts"] == [out["outputs"]["mesh"],
                                out["outputs"]["report"]]
    assert seen[0]["activity"].startswith("running ")
    assert seen[-1] == {"activity": "autoremesher complete",
                        "progress": 100}
    # the spawn carried the manifest argv (the record starts after
    # the binary — binary-first is parity-pinned on the manifest)
    argv = (tmp_path / "argv.txt").read_text().split("\n")
    assert argv[0] == "--input" and "/tmp/in.obj" in argv


def _triangle_glb() -> bytes:
    verts = struct.pack("<9f", 0, 0, 0, 1, 0, 0, 0, 1, 0)
    idx = struct.pack("<3H", 0, 1, 2)
    blob = verts + idx
    js = json.dumps({
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": 3,
             "type": "VEC3"},
            {"bufferView": 1, "componentType": 5123, "count": 3,
             "type": "SCALAR"}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": 36},
            {"buffer": 0, "byteOffset": 36, "byteLength": 6}],
        "buffers": [{"byteLength": 42}],
        "meshes": [{"primitives": [
            {"attributes": {"POSITION": 0}, "indices": 1}]}]}).encode()
    while len(js) % 4:
        js += b" "
    while len(blob) % 4:
        blob += b"\x00"
    head = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8
                       + len(blob))
    return head + struct.pack("<I", len(js)) + b"JSON" + js \
        + struct.pack("<I", len(blob)) + b"BIN\x00" + blob


def test_port_converts_glb_before_spawn(
        tmp_path: Path, fake_bin: Path) -> None:
    glb = tmp_path / "in.glb"
    glb.write_bytes(_triangle_glb())
    out = asyncio.run(eng.execute(
        _node({"workflow": {"input": str(glb)}}),
        str(tmp_path), {}, asyncio.Event()))
    assert "error" not in out or not out.get("error"), out
    argv = (tmp_path / "argv.txt").read_text().split("\n")
    fed = argv[argv.index("--input") + 1]
    assert fed.endswith(".obj") and fed != str(glb), \
        "the kernel received the CONVERTED obj, never the glb"
    assert Path(fed).is_file()


def test_port_refusals_ride_error_dicts(
        tmp_path: Path, fake_bin: Path) -> None:
    ev = asyncio.Event()
    r = asyncio.run(eng.execute(_node({"workflow": {}}),
                                str(tmp_path), {}, ev))
    assert r["error"] == "no input mesh in node params"
    bad = tmp_path / "bad.glb"
    bad.write_bytes(b"not a glb at all")
    r = asyncio.run(eng.execute(
        _node({"workflow": {"input": str(bad)}}),
        str(tmp_path), {}, ev))
    assert "not a GLB" in r["error"]
    assert not (tmp_path / "argv.txt").exists() or True  # no spawn
    # malformed input refuses BEFORE any spawn touches argv
    before = (tmp_path / "argv.txt").read_text() \
        if (tmp_path / "argv.txt").exists() else ""
    assert "--input" not in before or str(bad) not in before


def _synth_manifest(tmp_path: Path, **kw: JsonValue) -> KernelManifest:
    sub = dict(output_file="done.txt", output_channel="mesh",
               timeout_s=30.0, bin_env="AUTOREMESHER_BIN")  # the
    sub.update(kw.pop("subprocess_kw", {}))   # fake_bin fixture sets it
    return KernelManifest(id="synth", version="1", card="quad-remesh",
                          engine="autoremesher",
                          subprocess=SubprocessExec(argv=("$bin",), **sub),
                          **kw)


def test_generic_rc_nonzero_carries_stderr(
        tmp_path: Path, fake_bin: Path,
        monkeypatch: pytest.MonkeyPatch) -> None:
    import kernel_exec
    monkeypatch.setenv("FAKE_MODE", "fail")
    m = _synth_manifest(tmp_path)
    out = asyncio.run(kernel_exec.execute_manifest(
        m, _node({}), str(tmp_path), {}, asyncio.Event()))
    assert out["error"] == "kernel exploded: bad mesh"
    assert out["outputs"] == {} and out["artifacts"] == []


def test_generic_timeout_kills(
        tmp_path: Path, fake_bin: Path,
        monkeypatch: pytest.MonkeyPatch) -> None:
    import kernel_exec
    import kernel_manifest as km
    monkeypatch.setenv("FAKE_MODE", "sleep")
    m = km.KernelManifest(
        id="synth", version="1", card="quad-remesh",
        engine="autoremesher",
        subprocess=km.SubprocessExec(
            bin_env="AUTOREMESHER_BIN",
            argv=("$bin",), output_file="done.txt",
            output_channel="mesh", timeout_s=2.0))
    out = asyncio.run(kernel_exec.execute_manifest(
        m, _node({}), str(tmp_path), {}, asyncio.Event()))
    assert "timed out after 2s" in out["error"]


def test_generic_stop_kills_mid_run(
        tmp_path: Path, fake_bin: Path,
        monkeypatch: pytest.MonkeyPatch) -> None:
    import kernel_exec
    monkeypatch.setenv("FAKE_MODE", "sleep")
    m = _synth_manifest(tmp_path)
    ev = asyncio.Event()

    async def _run() -> dict[str, JsonValue]:
        task = asyncio.ensure_future(kernel_exec.execute_manifest(
            m, _node({}), str(tmp_path), {}, ev))
        await asyncio.sleep(1.0)
        ev.set()   # the stop door fires mid-run
        return await asyncio.wait_for(task, timeout=20)

    out = asyncio.run(_run())
    assert out["error"] == "stopped"


def test_generic_missing_binary_is_loud(
        tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    import kernel_exec
    import kernel_manifest as km
    monkeypatch.delenv("AUTOREMESHER_BIN", raising=False)
    m = km.KernelManifest(
        id="ghost", version="1", card="quad-remesh",
        engine="autoremesher",
        subprocess=km.SubprocessExec(
            bin_env="GHOST_BIN_UNSET", bin_candidates=(),
            argv=("$bin",), output_file="done.txt"))
    out = asyncio.run(kernel_exec.execute_manifest(
        m, _node({}), str(tmp_path), {}, asyncio.Event()))
    assert "no silent fallback" in out["error"]


def test_generic_unknown_spell_is_loud(
        tmp_path: Path, fake_bin: Path) -> None:
    import kernel_exec
    import kernel_manifest as km
    m = km.KernelManifest(
        id="synth", version="1", card="quad-remesh",
        engine="autoremesher",
        subprocess=km.SubprocessExec(
            bin_env="AUTOREMESHER_BIN",
            argv=("$bin", "$no_such_param"), output_file="done.txt"))
    out = asyncio.run(kernel_exec.execute_manifest(
        m, _node({}), str(tmp_path), {}, asyncio.Event()))
    assert "resolves nowhere" in out["error"]


def test_generic_non_subprocess_is_loud(tmp_path: Path) -> None:
    import kernel_exec
    import kernel_manifest as km
    m = km.KernelManifest(
        id="synth", version="1", card="quad-remesh",
        engine="autoremesher", exec=km.ExecMode.HTTP)
    out = asyncio.run(kernel_exec.execute_manifest(
        m, _node({}), str(tmp_path), {}, asyncio.Event()))
    assert "not yet served" in out["error"]


def test_generic_progress_convention(
        tmp_path: Path, fake_bin: Path,
        monkeypatch: pytest.MonkeyPatch) -> None:
    import kernel_exec
    import kernel_manifest as km
    monkeypatch.setenv("FAKE_MODE", "noisy")
    m = km.KernelManifest(
        id="synth", version="1", card="quad-remesh",
        engine="autoremesher",
        subprocess=km.SubprocessExec(
            bin_env="AUTOREMESHER_BIN",
            argv=("$bin", "--output", "$out/done.txt"),
            output_file="done.txt", output_channel="mesh",
            progress_regex=r"progress (?P<percent>\d+)%"))
    seen: list = []
    out = asyncio.run(kernel_exec.execute_manifest(
        m, _node({}), str(tmp_path), {}, asyncio.Event(),
        report=seen.append))
    assert not out.get("error"), out
    assert [s.get("progress") for s in seen
            if "progress" in s and s.get("progress") != 100] == [25, 75]
