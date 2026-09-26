"""THE DEAD-CALL-SITE LAW (found by the 3D lane's first live
commission, 2026-09-26): `mcp_server.py`'s `execute_code` branch still
called `_exec_mELITE`, the name from BEFORE the helper was renamed
`_exec_engine` — so every `execute_code` died with `NameError: name
'_exec_mELITE' is not defined`. Nothing caught it: the MCP smoke
(e2e) proves the door MOUNTS (the binary is found, the provider
loads, the engine is seated), and a mounted door happily proxies a
call that raises on its first line.

The wall is the class, not the instance: EVERY tool the pack
declares must dispatch through `_tool_call` without a NameError. A
tool that needs Blender is allowed to fail for its own reason
(no `bpy` off-engine) — the wall only refuses the dead-name failure,
which is the one a mount check can never see.
"""

import importlib.util
import json
import sys
from pathlib import Path

import pytest


PACK = (
    Path(__file__).resolve().parents[1]
    / "vendor"
    / "comfyui_extensions"
    / "melite-blender-proxy-nodes"
    / "mcp_server.py"
)


def _load():
    spec = importlib.util.spec_from_file_location("melite_mcp_server_wall", PACK)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def mcp():
    # a module-scoped fixture may not take the function-scoped
    # monkeypatch: the stub is installed and removed by hand, so the
    # import-time module reference keeps working for the whole module
    import types

    stub = types.ModuleType("bpy")
    stub.app = types.SimpleNamespace(version=(4, 5, 0))
    stub.data = types.SimpleNamespace(objects=[], meshes=[])
    stub.ops = types.SimpleNamespace()
    previous = sys.modules.get("bpy")
    sys.modules["bpy"] = stub
    try:
        module = _load()
    finally:
        if previous is None:
            sys.modules.pop("bpy", None)
        else:
            sys.modules["bpy"] = previous
    return module


def test_the_pack_declares_the_tools_the_wall_walks(mcp):
    names = [tool["name"] for tool in mcp._TOOLS]
    assert names == ["execute_code", "run_macro", "scene_info", "render_shot"]


def test_execute_code_dispatches_and_carries_the_macro_contract(mcp):
    # the real contract: a final `MELITE_RESULT <json>` line carries
    # the structured result. A working call site returns BOTH it and
    # the stdout tail.
    code = 'import json\nprint("MELITE_RESULT " + json.dumps({"objects": 3, "verts": 42}))\n'
    result = mcp._tool_call("execute_code", {"code": code})
    assert result["isError"] if "isError" in result else True
    payload = json.loads(result["content"][0]["text"])
    assert payload["melite_result"] == {"objects": 3, "verts": 42}
    assert isinstance(payload["stdout_tail"], str)


def test_no_tool_answers_with_a_dead_name(mcp):
    """THE LAW: every declared tool dispatches, and a dead call site
    can never hide behind a refusal-shaped result.

    This is the shape the bug actually took: `_tool_call` catches
    every exception and returns it as an `isError` RESULT
    (`"NameError: name '_exec_mELITE' is not defined"`). So a wall
    that only catches raised exceptions sees nothing — the door
    mounts, answers, and every execute_code is dead. The wall must
    read the refusal TEXT."""
    probes = {
        "execute_code": {"code": "print('MELITE_RESULT {}')"},
        "run_macro": {"macro": "scene_info", "args": {"limit": 1}},
        "scene_info": {"limit": 1},
        "render_shot": {"out": "/tmp/melite-wall-render.png"},
    }
    for tool in mcp._TOOLS:
        name = tool["name"]
        result = mcp._tool_call(name, probes[name])
        text = json.dumps(result)
        # THE DEAD CALL SITE, in either shape: raised, or laundered
        # into the refusal envelope.
        assert "NameError" not in text, f"{name} answers with a dead name: {text[:200]}"
        assert "is not defined" not in text, f"{name} answers with a dead name: {text[:200]}"
        # the pre-rename helper name itself must be gone from the
        # module: a stale reference is a landmine for the next caller
        assert "_exec_mELITE" not in open(PACK, encoding="utf-8").read().replace(
            "pre-rename name `_exec_mELITE`", ""
        ).replace("`NameError: name '_exec_mELITE' is not", ""), (
            "the pack still references the pre-rename helper name"
        )


def test_a_refusal_is_an_isError_result_not_a_protocol_error(mcp):
    # the tool's own law, re-probed here because the call sites are
    # what route refusals: an empty execute_code must come back as a
    # refusal, never as a raised NameError from a stale name.
    result = mcp._tool_call("execute_code", {"code": "   "})
    assert result.get("isError") is True
    text = json.dumps(result)
    assert "_exec_mELITE" not in text
