"""mcp_door.py - the MCP/stdio door (R4.6b, 2026-09-06).

R4 item 6 second half: the melite-tools headless surface is DSH-only.
Any OTHER agent runtime speaks MCP - so the gateway ships a stdio
JSON-RPC door (MCP subset: initialize, tools/list, tools/call, ping)
that exposes the gateway wire AS tools. Any MCP client (Claude Code,
Cline, MCP Inspector, a headless python loop) mounts the estate
without the DSH host.

NO RESTATEMENT: tool definitions DERIVE from gateway.ROUTES - name
from the template, description from the row summary, params from the
template braces + the row query tuple + the row body kind. A new door
appears here with zero door-side edits; --dump regenerates
docs/gateway/tools.json (the shipped manifest).

CALLS proxy to the LIVE gateway over HTTP (base URL via argv/ENV) -
the door holds NO queue state of its own (an in-process Gateway()
would own a SECOND empty registry; the serial-GPU law forbids two
queues, so this process never constructs one). Binary bytes doors
(asset streams) and WS doors are EXCLUDED with reasons - MCP tools
carry JSON, and the exclusion list rides the dump honestly.

Usage:
  python python/mcp_door.py [--gateway URL]   # stdio loop on stdin/out
  python python/mcp_door.py --dump PATH          # write tools.json, exit
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import gateway as gw_mod  # noqa: E402

JsonV = dict[str, "JsonV"] | list["JsonV"] | str | int | float | bool | None
SERVER = {"name": "melite-gateway", "version": "0.1.0"}

# Binary-stream / socket doors MCP tools cannot carry (JSON only).
# Each exclusion rides the dump WITH its reason - never silent.
EXCLUDE_WHY_WS = "websocket door - MCP tools carry request/response JSON"
EXCLUDE_WHY_BYTES = "binary artifact bytes - use the HTTP door"
EXCLUDE_PREFIXES: tuple[str, ...] = ("/v1/assets/runs/", "/v1/assets/inputs/")


def _slug(row: gw_mod.Route) -> str:
    """GET /v1/flows/status/{run_id} -> get_v1_flows_status_run_id."""
    raw = (row.template or row.path).split("?")[0].lower()
    raw = re.sub(r"[^a-z0-9]+", "_", raw).strip("_")
    method = row.method.lower().split("|")[0]
    if method == "*":
        method = "get"
    return "%s_%s" % (method, raw)


def _tool_def(row: gw_mod.Route) -> dict[str, JsonV]:
    """One ROUTES row -> one MCP tool definition."""
    template = row.template or row.path
    props: dict[str, JsonV] = {}
    required: list[str] = []
    for name in re.findall(r"\{(\w+)\}", template):
        props[name] = {"type": "string",
                          "description": "path parameter"}
        required.append(name)
    for name in row.query or ():
        if name not in props:
            props[name] = {"type": "string",
                              "description": "query parameter"}
    if row.body in ("strict", "lenient"):
        props["body"] = {
            "type": "object",
            "description": "JSON request body, passed through verbatim"}
    schema: dict[str, JsonV] = {"type": "object",
                                   "properties": props}
    if required:
        schema["required"] = required
    return {"name": _slug(row),
            "description": "[%s] %s" % (row.group, row.summary),
            "inputSchema": schema}


def catalog() -> tuple[list[dict[str, JsonV]], list[dict[str, str]]]:
    """The whole mountable surface + the honest exclusion list."""
    tools: list[dict[str, JsonV]] = []
    excluded: list[dict[str, str]] = []
    for row in gw_mod.ROUTES:
        if row.handler is None:
            continue
        template = row.template or row.path
        if row.ws:
            excluded.append({"tool": _slug(row), "reason": EXCLUDE_WHY_WS})
            continue
        hit = next((p for p in EXCLUDE_PREFIXES
                      if template.startswith(p)), "")
        if hit:
            excluded.append({"tool": _slug(row),
                               "reason": EXCLUDE_WHY_BYTES})
            continue
        tools.append(_tool_def(row))
    return tools, excluded


def _build_request(row: gw_mod.Route, args: dict[str, JsonV],
                     base: str) -> tuple[str, bytes | None]:
    """Arguments -> (URL, POST-body). KeyError/ValueError refusals name
    the offender (the MCP InvalidParams text) - never a silent drop."""
    template = row.template or row.path
    path = template
    for name in re.findall(r"\{(\w+)\}", template):
        if name not in args:
            raise KeyError("missing path parameter %r" % name)
        if not isinstance(args[name], str):
            raise ValueError("path parameter %r must be a string" % name)
        path = path.replace("{%s}" % name,
                              urllib.parse.quote(str(args[name]), safe=""))
    query = {k: str(args[k]) for k in (row.query or ()) if k in args}
    url = base.rstrip("/") + path
    if query:
        url += "?" + urllib.parse.urlencode(query)
    known = set(re.findall(r"\{(\w+)\}", template))
    known |= set(row.query or ())
    if row.body in ("strict", "lenient"):
        known.add("body")
    unknown = sorted(k for k in args if k not in known)
    if unknown:
        raise ValueError("unknown argument(s) %s" % ", ".join(unknown))
    body: bytes | None = None
    if row.body in ("strict", "lenient"):
        payload = args.get("body", {})
        if not isinstance(payload, dict):
            raise ValueError("body must be a JSON object")
        body = json.dumps(payload).encode()
    return url, body


def _http(method: str, url: str,
           body: bytes | None) -> tuple[int, str]:
    req = urllib.request.Request(url, data=body, method=method,
                                     headers={"content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def tool_call(tools: list[dict[str, JsonV]], name: str,
              args: dict[str, JsonV], base: str) -> dict[str, JsonV]:
    """One tools/call -> MCP result. Gateway 4xx bodies (the R4.2
    envelope) ride isError WITH their code - the agent loop routes
    on it exactly as on HTTP."""
    names = {str(t.get("name")) for t in tools}
    if name not in names:
        return {"isError": True,
                "content": [{"type": "text",
                              "text": "unknown tool %r" % name}]}
    rows = {_slug(r): r for r in gw_mod.ROUTES if r.handler is not None}
    row = rows[name]
    if not isinstance(args, dict):
        args = {}
    try:
        url, body = _build_request(row, args, base)
    except (KeyError, ValueError) as e:
        return {"isError": True,
                "content": [{"type": "text",
                              "text": "invalid params: %s" % e}]}
    # R4.6b FIX (live probe 2026-09-06): POST doors WITHOUT a body
    # (stop/resume/reproduce) were forced to GET - no such route.
    # The row method is the contract; only "*" defaults to GET.
    method = row.method.split("|")[0]
    if method == "*":
        method = "GET"
    try:
        status, text = _http(method, url, body)
    except Exception as e:
        return {"isError": True,
                "content": [{"type": "text",
                              "text": "gateway unreachable: %s" % e}]}
    try:
        payload = json.loads(text)
    except ValueError:
        payload = {"raw": text[:2000]}
    if 200 <= status < 300:
        return {"content": [{"type": "text",
                                  "text": json.dumps(payload)}]}
    err = text[:300]
    code = "http_%d" % status
    if isinstance(payload, dict):
        raw_err = payload.get("error", err)
        err = str(raw_err)[:300]
        raw_code = payload.get("code", code)
        code = str(raw_code)
    return {"isError": True,
            "content": [{"type": "text",
                          "text": "[%s] %s" % (code, err)}]}


def handle(msg: JsonV, tools: list[dict[str, JsonV]],
             base: str) -> dict[str, JsonV] | None:
    """One JSON-RPC message -> reply (None for notifications)."""
    if not isinstance(msg, dict):
        return {"jsonrpc": "2.0", "id": None,
                "error": {"code": -32600,
                          "message": "invalid request"}}
    mid = msg.get("id")
    method = msg.get("method", "")
    if method == "notifications/initialized":
        return None
    if method == "initialize":
        return {"jsonrpc": "2.0", "id": mid,
                "result": {"protocolVersion": "2024-11-05",
                           "capabilities": {"tools": {}},
                           "serverInfo": SERVER}}
    if method == "ping":
        return {"jsonrpc": "2.0", "id": mid, "result": {}}
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": mid,
                "result": {"tools": tools}}
    if method == "tools/call":
        params = msg.get("params", {})
        if not isinstance(params, dict):
            params = {}
        name = params.get("name", "")
        args = params.get("arguments", {})
        if not isinstance(name, str) or not isinstance(args, dict):
            return {"jsonrpc": "2.0", "id": mid,
                    "error": {"code": -32602,
                              "message": "name: string, arguments: object"}}
        return {"jsonrpc": "2.0", "id": mid,
                "result": tool_call(tools, name, args, base)}
    return {"jsonrpc": "2.0", "id": mid,
            "error": {"code": -32601,
                      "message": "unknown method %s" % method}}


def dump_manifest() -> dict[str, JsonV]:
    """The shippable tools.json payload (also what tools/list serves)."""
    tools, excluded = catalog()
    return {"server": dict(SERVER),
            "gateway_routes": len(gw_mod.ROUTES),
            "generated": "python/mcp_door.py --dump (derived from ROUTES)",
            "tools": tools, "excluded": excluded}


def main(argv: list[str]) -> int:
    base = os.environ.get("MELITE_GATEWAY", "http://127.0.0.1:33081")
    rest = list(argv)
    while rest and rest[0] == "--gateway":
        base = rest[1] if len(rest) > 1 else base
        rest = rest[2:]
    if rest[:1] == ["--dump"]:
        out = rest[1] if len(rest) > 1 else "-"
        text = json.dumps(dump_manifest(), indent=2) + chr(10)
        if out == "-":
            sys.stdout.write(text)
        else:
            with open(out, "w", encoding="utf-8") as f:
                f.write(text)
        return 0
    tools, _excluded = catalog()
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except ValueError:
            sys.stdout.write(json.dumps({"jsonrpc": "2.0", "id": None,
                                                "error": {"code": -32700,
                                                          "message": "parse error"}})
                                  + chr(10))
            sys.stdout.flush()
            continue
        reply = handle(msg, tools, base)
        if reply is not None:
            sys.stdout.write(json.dumps(reply) + chr(10))
            sys.stdout.flush()
    return 0


if __name__ == "__main__":
    main(sys.argv[1:])
