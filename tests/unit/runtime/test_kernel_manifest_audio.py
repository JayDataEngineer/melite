"""AUDIO-CPP PORT WALL (gap 1, lane 4, 2026-09-06 — the last
engine port: audio-cpp is the final compose/ plugin off bespoke
spawn; the tree is fully manifest-driven for subprocess lanes).

Pinned: BOTH kernel manifests' values; argv parity vs the retired
builders across music-full / music-defaults / legacy-full /
legacy-defaults (incl. seed=0 presence semantics); the shim's
shape pick (workflow dict → music, flat → legacy); the four-level
CLI precedence (params.cli → env → runtime → vendored, is_file
filters intact); end-to-end port runs of BOTH shapes against a
fake audiocpp_cli; the bin_override generic rule (model-row pin
wins, ghost paths fall through to the search).
"""

import asyncio
import importlib
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import plugins  # noqa: E402
from flow_graph import NodeRow  # noqa: E402
from kernel_exec import execute_manifest, resolve_binary  # noqa: E402
from kernel_manifest import KernelManifest, resolve_spell  # noqa: E402
from types import ModuleType  # noqa: E402

# Spell namespaces and argv lists are JSON-ish (no future-import — old-style).
JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None

eng = plugins.load_engine("audio_cpp")
manifest = eng._load_manifest()
MUSIC = manifest.AUDIO_MUSIC_MANIFEST
LEGACY = manifest.AUDIO_LEGACY_MANIFEST


def _renderer() -> ModuleType:
    eng._load_card_package("audio/music")
    return importlib.import_module(eng._PKG_ALIAS + ".renderer")


def _expand(m: KernelManifest, params: dict[str, JsonValue]) -> list[str]:
    ns = dict(params)
    ns["bin"] = "/bin/a"
    ns["out"] = "/tmp/run"
    sub = m.subprocess
    cmd = [resolve_spell(str(a), ns) for a in sub.argv]
    for cond, group in sub.argv_when:
        try:
            on = resolve_spell(str(cond), ns)
        except KeyError:
            on = ""
        if on and on.strip():
            cmd.extend(resolve_spell(str(a), ns) for a in group)
    return cmd


def test_manifest_values() -> None:
    for m, out in ((MUSIC, "music_out.wav"),
                   (LEGACY, "audio_out.wav")):
        assert (m.id, m.card, m.engine) == \
            ("audio_cpp", "music-native", "audio_cpp")
        sub = m.subprocess
        assert sub.bin_env == "AUDIO_CPP_CLI"
        assert sub.bin_override == "$cli_path|"
        assert len(sub.bin_candidates) == 2          # runtime, vendored
        assert sub.argv[0] == "$bin"
        assert (sub.output_channel, sub.output_file) == ("wav", out)
        assert sub.timeout_s == 1800.0
    assert MUSIC.subprocess.argv[1:3] == ("--task", "$workflow.task|gen")
    assert LEGACY.subprocess.argv[1:3] == ("--task", "$task|tts")


def test_music_parity_with_build_argv() -> None:
    renderer = _renderer()
    for wf in ({"task": "gen", "family": "ace", "model": "m",
                "backend": "cuda", "duration_sec": 30, "prompt": "p",
                "lyrics": "l", "seed": 3},
               {"family": "f"},                       # omitted → defaults
               {"task": "gen", "seed": 0}):           # seed 0 rides
        assert _expand(MUSIC, {"workflow": wf}) == \
            renderer.build_argv("/bin/a", "/tmp/run", dict(wf))[0], wf


def test_legacy_parity_with_build_argv_legacy() -> None:
    renderer = _renderer()
    for p in ({"task": "tts", "family": "f", "model": "m",
               "backend": "cuda", "instruct": "i", "speaker": "s",
               "temperature": 0.9, "seed": 1},
              {"task": "vdes", "seed": 0},            # sparse flat rows
              {"task": "tts", "temperature": 0.7}):   # boundary value
        assert _expand(LEGACY, p) == \
            renderer.build_argv_legacy(
                "/bin/a", "/tmp/run", dict(p))[0], p


_FAKE_CLI = """#!/usr/bin/env python3
import os, sys
args = sys.argv[1:]
open(os.environ["FAKE_RECORD"], "w").write("\\n".join(args))
def _flag(f):
    return args[args.index(f) + 1]
assert _flag("--task") in ("gen", "tts", "vdes")
assert _flag("--backend") in ("cuda", "cpu")
out = _flag("--output")
assert out.endswith((".wav",))
open(out, "w").write("wav-bytes")
"""


@pytest.fixture()
def fake_cli(tmp_path: Path,
             monkeypatch: pytest.MonkeyPatch) -> Path:
    cli = tmp_path / "audiocpp_cli"
    cli.write_text(_FAKE_CLI)
    cli.chmod(0o755)
    monkeypatch.setenv("AUDIO_CPP_CLI", str(cli))
    monkeypatch.setenv("FAKE_RECORD", str(tmp_path / "argv.txt"))
    return cli


def test_port_music_shape_end_to_end(
        tmp_path: Path, fake_cli: Path) -> None:
    seen: list = []
    node = NodeRow(id="n", type="audio_cpp",
                   params={"workflow": {"task": "gen", "family": "ace",
                                        "model": "m", "prompt": "p"}})
    out = asyncio.run(eng.execute(
        node, str(tmp_path), {}, asyncio.Event(),
        report=seen.append))
    assert not out.get("error"), out
    assert out["outputs"] == {"wav": str(tmp_path / "music_out.wav")}
    assert out["artifacts"] == [str(tmp_path / "music_out.wav")]
    assert seen[-1] == {"activity": "audio_cpp complete",
                        "progress": 100}
    rec = (tmp_path / "argv.txt").read_text().split("\n")
    assert "--duration" not in rec   # legitimately absent


def test_port_legacy_shape_end_to_end(
        tmp_path: Path, fake_cli: Path) -> None:
    node = NodeRow(id="n", type="audio_cpp",
                   params={"task": "tts", "family": "moss",
                           "model": "m", "instruct": "hi",
                           "seed": 5})
    out = asyncio.run(eng.execute(
        node, str(tmp_path), {}, asyncio.Event()))
    assert not out.get("error"), out
    assert out["outputs"] == {"wav": str(tmp_path / "audio_out.wav")}
    rec = (tmp_path / "argv.txt").read_text().split("\n")
    assert rec[rec.index("--instruct") + 1] == "hi"
    assert "--speaker" not in rec     # legitimately absent


def test_cli_precedence_keeps_isfile_filters(
        tmp_path: Path, fake_cli: Path,
        monkeypatch: pytest.MonkeyPatch) -> None:
    ghost = tmp_path / "ghost_cli"
    # a GHOST model-row pin falls through to env (retired
    # _resolve_cli semantics — a nonexistent override never wins)
    assert eng._resolve_cli(str(ghost)) == fake_cli
    real = tmp_path / "real_cli"
    real.write_text("#!/bin/sh\n")
    assert eng._resolve_cli(str(real)) == real
    # a GHOST env falls through to the runtime/vendored search
    monkeypatch.setenv("AUDIO_CPP_CLI", str(ghost))
    assert eng._resolve_cli(None) is None or \
        eng._resolve_cli(None) != ghost


def test_generic_bin_override_rule(
        tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    pin = tmp_path / "pinned"
    pin.write_text("#!/bin/sh\n")
    # model-row pin wins over a live env…
    monkeypatch.setenv("AUDIO_CPP_CLI", "/env/bin")
    hit = resolve_binary(MUSIC, {"cli_path": str(pin)})
    assert hit == pin
    # …but a ghost pin is the SHIM's refusal to pass, never the
    # generic's problem: empty override → the search proceeds
    hit = resolve_binary(MUSIC, {})
    assert hit is not None and str(hit) == "/env/bin"
