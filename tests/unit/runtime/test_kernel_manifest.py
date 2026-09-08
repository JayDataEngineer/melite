"""KERNEL MANIFEST WALL (stroke 6, 2026-09-06) — ONE contract for
every native codebase (design record docs/design/one-contract-compose.md
§4: "ONE CONTRACT INSTEAD OF 5").

Three layers pinned:

  CONTRACT (python/kernel_manifest.py — PYTHON SHAPE LAW rows):
    * closed enums; all-or-nothing artifacts; frozen rows;
      exec/subprocess coherence + card-lattice membership +
      engine match, all AT CONSTRUCTION
    * $spell resolution (nested, |defaults, unknown raises)

  PARITY (2026-09-07: the quad parity retired with the lane — the
    audio-cpp lane's own parity lives in test_kernel_manifest_audio.py):
    * manifest argv == the retired build_argv, byte-identical,
      full knobs AND omitted knobs (schema defaults)
    * binary search order == resolve_cli (env → runtime → vendor)

  GENERIC ENGINE (python/kernel_exec.py — mechanics, no lane knowledge):
    * success harvest (channels + artifacts), rc!=0 stderr capture,
      missing-output refusal, timeout kill, mid-run stop kill,
      missing-binary loud dict, unknown-spell loud dict,
      non-subprocess loud dict, progress convention into report()

  PORT (the compose shim keeps ONLY lane translation):
    * .obj rides through; .glb converts (a real triangle GLB);
      malformed GLB refuses pre-spawn; missing input refuses;
      the fake binary receives the CONVERTED path

RETIREMENT 2026-09-07 (the cpp→node cutover, ONE-implementation
rule): the quad lane retired with its render arm — the PARITY and
PORT layers below drove the deleted renderer.py / port shim, so
they retired with reason (their notes name the new truth); the
CONTRACT and GENERIC ENGINE layers (live machinery serving
audio-cpp + anycreature) repointed at the audio-cpp MUSIC manifest.
Quad argv truth now lives in the TS literal + the golden
(tests/golden_cordis/mesh_quad-remesh_default.json); lane parity
for the surviving subprocess lanes lives in
test_kernel_manifest_audio.py / test_kernel_manifest_forge.py.
"""

import asyncio
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "python"))

import plugins  # noqa: E402
from flow_graph import NodeRow  # noqa: E402
from kernel_manifest import (ArtifactRow, ExecMode, JsonValue, KernelManifest,  # noqa: E402
                             SubprocessExec, resolve_spell)

# the CONTRACT + GENERIC layers drive the surviving audio-cpp lane
# (the quad lane retired 2026-09-07 — see the header note).
eng = plugins.load_engine("audio_cpp")
manifest = eng._load_manifest().AUDIO_MUSIC_MANIFEST


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
        KernelManifest(id="k", version="1", card="music-native",
                       engine="audio_cpp", exec=ExecMode.SUBPROCESS,
                       subprocess=None)
    with pytest.raises(Exception, match="never use"):
        KernelManifest(id="k", version="1", card="music-native",
                       engine="audio_cpp", exec=ExecMode.HTTP,
                       subprocess=sub)


def test_manifest_serves_a_card() -> None:
    with pytest.raises(Exception, match="not in the card registry"):
        KernelManifest(id="k", version="1", card="no-such-card",
                       engine="audio_cpp",
                       subprocess=SubprocessExec(output_file="o"))
    with pytest.raises(Exception, match="!="):
        KernelManifest(id="k", version="1", card="music-native",
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
#
# RETIRED 2026-09-07 with the quad lane (the cpp→node cutover):
# test_argv_parity_with_build_argv drove the deleted renderer.py's
# build_argv, and test_binary_search_parity_with_resolve_cli drove
# the deleted resolve_cli — the argv truth they pinned now lives in
# the TS literal + the golden
# (tests/golden_cordis/mesh_quad-remesh_default.json), and the
# binary requirement lives in python/card_requires.py
# SYSTEM_BINARY_REQUIRES (pinned hermetically by test_card_requires
# T12). The surviving subprocess lanes pin their own parity in
# test_kernel_manifest_audio.py / test_kernel_manifest_forge.py.


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
    monkeypatch.setenv("AUDIO_CPP_CLI", str(b))
    monkeypatch.setenv("FAKE_RECORD", str(tmp_path / "argv.txt"))
    monkeypatch.delenv("FAKE_MODE", raising=False)
    return b


def _node(params: dict[str, JsonValue]) -> NodeRow:
    return NodeRow(id="n", type="audio_cpp", params=params)


# ── the retired quad port (cpp→node cutover, 2026-09-07) ───────────
#
# RETIRED: test_port_success_harvest, test_port_converts_glb_before_
# spawn and test_port_refusals_ride_error_dicts drove the deleted cpp
# port shim (eng.execute — the GLB→OBJ conversion + .obj ride-
# through + pre-spawn refusals). The quad lane executes through the
# comfyui HTTP path now (the node owns conversion); end-to-end port
# coverage for the surviving subprocess lanes lives in
# test_kernel_manifest_audio.py (music/legacy shapes vs a fake
# audiocpp_cli) and test_kernel_manifest_forge.py (fake node run).
# What stood here named its replacement — no silent coverage loss.


def _synth_manifest(tmp_path: Path, **kw: JsonValue) -> KernelManifest:
    sub = dict(output_file="done.txt", output_channel="mesh",
               timeout_s=30.0, bin_env="AUDIO_CPP_CLI")  # the
    sub.update(kw.pop("subprocess_kw", {}))   # fake_bin fixture sets it
    return KernelManifest(id="synth", version="1", card="music-native",
                          engine="audio_cpp",
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
        id="synth", version="1", card="music-native",
        engine="audio_cpp",
        subprocess=km.SubprocessExec(
            bin_env="AUDIO_CPP_CLI",
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
    monkeypatch.delenv("AUDIO_CPP_CLI", raising=False)
    m = km.KernelManifest(
        id="ghost", version="1", card="music-native",
        engine="audio_cpp",
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
        id="synth", version="1", card="music-native",
        engine="audio_cpp",
        subprocess=km.SubprocessExec(
            bin_env="AUDIO_CPP_CLI",
            argv=("$bin", "$no_such_param"), output_file="done.txt"))
    out = asyncio.run(kernel_exec.execute_manifest(
        m, _node({}), str(tmp_path), {}, asyncio.Event()))
    assert "resolves nowhere" in out["error"]


def test_generic_non_subprocess_is_loud(tmp_path: Path) -> None:
    import kernel_exec
    import kernel_manifest as km
    m = km.KernelManifest(
        id="synth", version="1", card="music-native",
        engine="audio_cpp", exec=km.ExecMode.HTTP)
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
        id="synth", version="1", card="music-native",
        engine="audio_cpp",
        subprocess=km.SubprocessExec(
            bin_env="AUDIO_CPP_CLI",
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
