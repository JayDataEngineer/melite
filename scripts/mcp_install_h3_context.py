#!/usr/bin/env python3
"""mcp_install_h3_context.py — drive comfy-mcp's install_node from an agent.

Built-with-MCP demo (2026-09-01): this script speaks the MCP protocol
(stdio) to the locally installed Comfy MCP server (comfy-mcp 0.10.0),
discovers the install_node tool schema, and installs the one extension
the bootstrap audit found missing (ComfyUI-H3-Motion-Context, the BASE
pack of the h3-timeline lane). Transcript captured for the challenge.

Boundary (docs/comfyui/comfy-mcp.md): MCP is used for provisioning/
introspection only — never for generation (INFERENCE LAW: cards/queue).
"""
import asyncio
import json
import os
import sys

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

TARGET_URL = "https://github.com/NikoDemon80/ComfyUI-H3-Motion-Context.git"
# comfy-mcp's install_node REFUSES git URLs by design (argv guard; registry
# pack ids only). The registry slug for this pack, if it exists:
TARGET_REGISTRY_ID = "comfyui-h3-motion-context"

ENV = dict(os.environ,
           COMFY_BIN="/opt/ComfyUI/.venv/bin/comfy",
           COMFY_LOCAL_URL="http://127.0.0.1:18465")


async def main() -> int:
    def errlog(line: str) -> None:
        print(f"[server] {line.rstrip()}", flush=True)

    params = StdioServerParameters(
        command="/opt/ComfyUI/.venv/bin/comfy-mcp", env=ENV, errlog=errlog)
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as s:
            await s.initialize()
            tools = (await s.list_tools()).tools
            print(f"[mcp] server up — {len(tools)} tools")
            tool = next((t for t in tools if t.name == "install_node"), None)
            if not tool:
                print("[mcp] FATAL: no install_node tool")
                return 1
            # SDK 2.x renamed inputSchema -> input_schema
            schema = getattr(tool, "input_schema", None) \
                or getattr(tool, "inputSchema", {})
            props = (schema or {}).get("properties", {})
            print(f"[mcp] install_node schema: {json.dumps(props)}")

            # registry ids only — git URLs are refused by the server's argv
            # guard (documented boundary: git pins go through the bootstrap).
            # confirm_install=True: operator pre-approved this specific
            # install; our stdio client carries no elicitation channel.
            args = {"names": [TARGET_REGISTRY_ID],
                    "confirm_install": True}
            if args is None:
                print("[mcp] FATAL: unknown install_node arg shape")
                return 1
            print(f"[mcp] calling install_node {args}")
            res = await asyncio.wait_for(
                s.call_tool("install_node", args), timeout=600)
            for c in res.content:
                if hasattr(c, "text"):
                    print("[mcp] result:", c.text[:2000])
            print(f"[mcp] is_error={res.is_error}")
            return 1 if res.is_error else 0


if __name__ == "__main__":
    def _flatten(e: BaseException) -> None:
        subs = getattr(e, "exceptions", None)
        if subs:
            for s in subs:
                _flatten(s)
        else:
            import traceback
            print(f"[mcp] ROOT: {type(e).__name__}: {str(e)[:600]}",
                  file=sys.stderr, flush=True)
            traceback.print_exception(type(e), e, e.__traceback__,
                                      limit=6, file=sys.stderr)
    try:
        sys.exit(asyncio.run(main()))
    except SystemExit:
        raise
    except BaseException as e:
        _flatten(e)
        sys.exit(1)
