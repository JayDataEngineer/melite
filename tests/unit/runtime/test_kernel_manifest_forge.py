"""FORGE PORT WALL (gap 1, lane 2, 2026-09-06) — anyCreature rides
the kernel manifest (plugins/engines/node/anycreature/manifest.py +
the compose shim; mechanics in py/kernel_exec.py).

The two-binary shape ($bin = the node interpreter = argv[0];
$cli/$spec/$cli_dir = caller-resolved lane extras) and the vendor-
root cwd are GENERIC contract slots (bin_path_names, cwd,
namespace_extra) — no lane knowledge in the core.

Pinned: manifest values; argv parity vs the retired build_argv;
interpreter search-order parity vs resolve_node (env → PATH →
~/.local); end-to-end port run against a fake node (spec content,
cwd, outputs {"glb"}, report boundaries); shim refusals; generic
cwd + reserved-wins behavior.
"""

import asyncio
import importlib
import json
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import plugins  # noqa: E402
from flow_graph import NodeRow  # noqa: E402
from kernel_exec import execute_manifest, resolve_binary  # noqa: E402

# Manifest overrides ride JSON-ish literals (no future-import — old-style).
JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None
from kernel_manifest import KernelManifest, SubprocessExec  # noqa: E402
from kernel_manifest import resolve_spell  # noqa: E402
from types import ModuleType  # noqa: E402

eng = plugins.load_engine("anycreature")
manifest = eng._load_manifest().FORGE_MANIFEST


def _renderer() -> ModuleType:
    eng._load_card_package("3d/forge")
    return importlib.import_module(eng._PKG_ALIAS + ".renderer")


def test_manifest_values() -> None:
    assert (manifest.id, manifest.card, manifest.engine) == \
        ("anycreature", "forge", "anycreature")
    sub = manifest.subprocess
    assert sub.bin_env == "ANYCREATURE_NODE"
    assert sub.bin_path_names == ("node",)
    assert sub.argv == ("$bin", "$cli", "$spec",
                        "$out/creature.glb")
    assert sub.cwd == "$cli_dir"
    assert sub.output_channel == "glb"
    assert sub.output_file == "creature.glb"
    assert sub.timeout_s == 300.0


def test_argv_parity_with_build_argv(
        tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """The manifest argv IS build_argv (node cli spec out), with
    the spec path and out path identical."""
    renderer = _renderer()
    monkeypatch.setenv("ANYCREATURE_NODE", "/bin/fake-node")
    cli = Path("/v/engine/cli.js")
    params = {"workflow": {"joints": []}}
    cmd, spec_path, out_path, cwd = renderer.build_argv(
        cli, str(tmp_path), dict(params))
    ns = {"bin": "/bin/fake-node", "cli": str(cli),
          "spec": spec_path, "out": str(tmp_path)}
    mine = [resolve_spell(str(a), ns)
            for a in manifest.subprocess.argv]
    assert mine == cmd == ["/bin/fake-node", str(cli),
                           spec_path, out_path]
    assert cwd == str(cli.parents[1])   # the vendor root


def test_interpreter_search_order(
        tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    fake = tmp_path / "node"
    fake.write_text("#!/bin/sh\nexit 0\n")
    fake.chmod(0o755)
    monkeypatch.setenv("ANYCREATURE_NODE", "/bin/env-node")
    assert str(resolve_binary(manifest)) == "/bin/env-node"
    monkeypatch.delenv("ANYCREATURE_NODE")
    monkeypatch.setenv("PATH", str(tmp_path) + ":")
    assert resolve_binary(manifest) == fake


_FAKE_NODE = """#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
rec = os.environ.get("FAKE_RECORD", "")
if rec:
    open(rec, "w").write("\\n".join(args) + "\\nCWD=" + os.getcwd())
spec = json.load(open(args[1]))
assert spec.get("marker") == "forge-spec", spec
open(args[2], "w").write("glb-bytes")
"""


@pytest.fixture()
def fake_lane(tmp_path: Path,
              monkeypatch: pytest.MonkeyPatch) -> dict[str, Path]:
    node = tmp_path / "node"
    node.write_text(_FAKE_NODE)
    node.chmod(0o755)
    cli = tmp_path / "eng" / "cli.js"
    cli.parent.mkdir()
    cli.write_text("// fake cli")
    monkeypatch.setenv("ANYCREATURE_NODE", str(node))
    monkeypatch.setenv("ANYCREATURE_CLI", str(cli))
    monkeypatch.setenv("FAKE_RECORD", str(tmp_path / "argv.txt"))
    return {"node": node, "cli": cli}


def test_port_success_harvest(
        tmp_path: Path, fake_lane: dict[str, Path]) -> None:
    seen: list = []
    node = NodeRow(id="n", type="anycreature",
                   params={"workflow": {"marker": "forge-spec"}})
    out = asyncio.run(eng.execute(
        node, str(tmp_path), {}, asyncio.Event(),
        report=seen.append))
    assert not out.get("error"), out
    assert out["outputs"] == {"glb": str(tmp_path / "creature.glb")}
    assert out["artifacts"] == [str(tmp_path / "creature.glb")]
    assert seen[0]["activity"].startswith("running ")
    assert seen[-1] == {"activity": "anycreature complete",
                        "progress": 100}
    # the spawn carried node cli spec out, under the vendor root
    rec = (tmp_path / "argv.txt").read_text().split("\n")
    assert rec[0] == str(fake_lane["cli"])
    assert json.loads(Path(rec[1]).read_text()) == \
        {"marker": "forge-spec"}
    assert rec[2] == str(tmp_path / "creature.glb")
    assert rec[3] == "CWD=%s" % fake_lane["cli"].parents[1]


def test_port_refusals_ride_error_dicts(
        tmp_path: Path, fake_lane: dict[str, Path],
        monkeypatch: pytest.MonkeyPatch) -> None:
    ev = asyncio.Event()
    r = asyncio.run(eng.execute(
        NodeRow(id="n", type="anycreature", params={}),
        str(tmp_path), {}, ev))
    assert r["error"] == "no spec in node params"
    monkeypatch.setattr(_renderer(), "resolve_cli", lambda: None)
    r = asyncio.run(eng.execute(
        NodeRow(id="n", type="anycreature",
                params={"workflow": {"marker": "x"}}),
        str(tmp_path), {}, ev))
    assert "anyCreature CLI not found" in r["error"]


def _synth(**kw: JsonValue) -> KernelManifest:
    sub = dict(output_file="done.txt", output_channel="mesh",
               bin_env="ANYCREATURE_NODE", timeout_s=30.0)
    sub.update(kw.pop("subprocess_kw", {}))
    return KernelManifest(id="synth", version="1", card="forge",
                          engine="anycreature",
                          subprocess=SubprocessExec(
                              argv=("$bin", "$out/done.txt"), **sub),
                          **kw)


_GENERIC_BIN = """#!/usr/bin/env python3
import os, sys
rec = os.environ.get("FAKE_RECORD", "")
if rec:
    open(rec, "w").write("CWD=" + os.getcwd())
open(sys.argv[1], "w").write("done")
"""


def _generic_bin(tmp_path: Path,
                 monkeypatch: pytest.MonkeyPatch) -> None:
    b = tmp_path / "generic-bin"
    b.write_text(_GENERIC_BIN)
    b.chmod(0o755)
    monkeypatch.setenv("ANYCREATURE_NODE", str(b))
    monkeypatch.setenv("FAKE_RECORD", str(tmp_path / "cwd.txt"))


def test_generic_cwd_honored(
        tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _generic_bin(tmp_path, monkeypatch)
    (tmp_path / "sub").mkdir()
    m = _synth(subprocess_kw={"cwd": "$out/sub"})
    out = asyncio.run(execute_manifest(
        m, NodeRow(id="n", type="x", params={}), str(tmp_path),
        {}, asyncio.Event()))
    assert not out.get("error"), out
    assert (tmp_path / "cwd.txt").read_text() == \
        "CWD=%s" % (tmp_path / "sub")


def test_generic_reserved_wins_over_extras(
        tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _generic_bin(tmp_path, monkeypatch)
    m = _synth()   # argv[0] is $bin…
    out = asyncio.run(execute_manifest(
        m, NodeRow(id="n", type="x", params={}), str(tmp_path),
        {}, asyncio.Event(),
        namespace_extra={"bin": "/bin/evil", "out": "/evil"}))
    assert not out.get("error"), out   # …and extras can't move it
