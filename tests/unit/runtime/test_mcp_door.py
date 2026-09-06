"""test_mcp_door.py - the R4.6b MCP wall (2026-09-06).
design record docs/design/production-architecture-review.md
R4 item 6 second half: any MCP-capable agent runtime mounts the
estate without the DSH host. The door derives its tool surface from
gateway.ROUTES (no restatement) and proxies calls to the LIVE gateway
over HTTP (it never constructs a Gateway - no second queue).
All offline: closed-port gateway, --dump to tmp, in-process handle.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import mcp_door as mc  # noqa: E402
import gateway as gw_mod  # noqa: E402

JsonV = dict[str, "JsonV"] | list["JsonV"] | str | int | float | bool | None
DEAD = "http://127.0.0.1:9"


def test_catalog_covers_the_wire() -> None:
    tools, excluded = mc.catalog()
    assert len(tools) >= 40
    names = [str(t["name"]) for t in tools]
    assert len(set(names)) == len(names)
    for t in tools:
        assert str(t["description"])
        schema = t["inputSchema"]
        assert isinstance(schema, dict)
        assert schema.get("type") == "object"
    assert "get_v1_agent_boot" in names
    assert "post_v1_flows_start" in names
    assert "post_v1_flows_reproduce_run_id" in names


def test_exclusions_are_honest() -> None:
    _tools, excluded = mc.catalog()
    assert len(excluded) == 4
    for row in excluded:
        assert row["tool"] and row["reason"], row


def test_shipped_manifest_matches_catalog() -> None:
    manifest = json.loads((REPO / "docs" / "gateway" / "tools.json").read_text())
    tools, excluded = mc.catalog()
    assert manifest["gateway_routes"] == len(gw_mod.ROUTES)
    assert manifest["tools"] == tools
    assert manifest["excluded"] == excluded


def test_build_request_shapes() -> None:
    tools, _ex = mc.catalog()
    rows = {mc._slug(r): r for r in gw_mod.ROUTES if r.handler is not None}
    url, body = mc._build_request(rows["get_v1_flows_status_run_id"],
                                   {"run_id": "run-abc"}, "http://g")
    assert url == "http://g/v1/flows/status/run-abc"
    assert body is None
    url, body = mc._build_request(rows["post_v1_flows_start"],
                                   {"body": {"draft_id": "d"}}, "http://g")
    assert url == "http://g/v1/flows/start"
    assert json.loads(bytes(body)) == {"draft_id": "d"}
    url, body = mc._build_request(rows["get_v1_ledger"],
                                   {"limit": "5"}, "http://g")
    assert url == "http://g/v1/ledger?limit=5"


def test_build_request_refusals_name_the_offender() -> None:
    tools, _ex = mc.catalog()
    rows = {mc._slug(r): r for r in gw_mod.ROUTES if r.handler is not None}
    with pytest.raises(KeyError, match="run_id"):
        mc._build_request(rows["get_v1_flows_status_run_id"], {}, "http://g")
    with pytest.raises(ValueError, match="bogus"):
        mc._build_request(rows["get_v1_ledger"], {"bogus": "1"}, "http://g")


def test_protocol_initialize_ping_unknown() -> None:
    tools, _ex = mc.catalog()
    init = mc.handle({"jsonrpc": "2.0", "id": 1,
                        "method": "initialize"}, tools, DEAD)
    assert isinstance(init, dict)
    assert init["result"]["serverInfo"]["name"] == "melite-gateway"
    assert mc.handle({"jsonrpc": "2.0", "id": 2, "method": "ping"},
                     tools, DEAD) == {"jsonrpc": "2.0", "id": 2,
                                              "result": {}}
    unk = mc.handle({"jsonrpc": "2.0", "id": 3, "method": "nope"},
                     tools, DEAD)
    assert isinstance(unk, dict)
    assert unk["error"]["code"] == -32601
    assert mc.handle({"jsonrpc": "2.0",
                        "method": "notifications/initialized"},
                     tools, DEAD) is None


def test_call_unknown_tool_and_bad_params_offline() -> None:
    tools, _ex = mc.catalog()
    res = mc.tool_call(tools, "no_such_tool", {}, DEAD)
    assert res["isError"] is True
    res = mc.tool_call(tools, "get_v1_flows_status_run_id", {}, DEAD)
    assert res["isError"] is True
    assert "run_id" in str(res["content"])


def test_call_unreachable_gateway_is_honest_error() -> None:
    tools, _ex = mc.catalog()
    res = mc.tool_call(tools, "get_v1_agent_boot", {}, DEAD)
    assert res["isError"] is True
    assert "unreachable" in str(res["content"])


def test_post_without_body_stays_post(monkeypatch: pytest.MonkeyPatch) -> None:
    tools, _ex = mc.catalog()
    seen: dict[str, str] = {}

    def _fake(method: str, url: str,
              body: bytes | None) -> tuple[int, str]:
        seen["method"] = method
        seen["url"] = url
        return 200, "{}"

    monkeypatch.setattr(mc, "_http", _fake)
    res = mc.tool_call(tools, "post_v1_flows_reproduce_run_id",
                        {"run_id": "run-x"}, DEAD)
    assert res.get("isError") is not True, res
    assert seen["method"] == "POST"
    assert seen["url"].endswith("/v1/flows/reproduce/run-x")


def test_dump_subprocess_offline(tmp_path: Path) -> None:
    out = tmp_path / "tools.json"
    r = subprocess.run([sys.executable, str(REPO / "py" / "mcp_door.py"),
                        "--dump", str(out)], capture_output=True, text=True,
                        timeout=60)
    assert r.returncode == 0, r.stderr
    manifest = json.loads(out.read_text())
    assert manifest["gateway_routes"] == len(gw_mod.ROUTES)
    assert manifest["tools"]
