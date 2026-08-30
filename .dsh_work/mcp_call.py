#!/usr/bin/env python3
"""Minimal MCP stdio client: call one tool on the meld-assets server.

Usage: mcp_call.py <tool_name> [json_arguments]
"""
import json
import subprocess
import sys

SERVER = ["python3", "/home/user/Documents/programs/ray/scripts/mcp_asset_server.py"]

proc = subprocess.Popen(
    SERVER,
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.DEVNULL,
    text=True,
    cwd="/home/user/Documents/programs/ray/scripts",
)


def send(obj):
    proc.stdin.write(json.dumps(obj) + "\n")
    proc.stdin.flush()


def recv(want_id):
    while True:
        line = proc.stdout.readline()
        if not line:
            raise RuntimeError("server closed stdout")
        line = line.strip()
        if not line:
            continue
        msg = json.loads(line)
        if msg.get("id") == want_id:
            return msg
        # skip notifications / other messages


send({
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "dsh-agent", "version": "1.0"},
    },
})
recv(1)
send({"jsonrpc": "2.0", "method": "notifications/initialized"})

tool = sys.argv[1]
args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
send({
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {"name": tool, "arguments": args},
})
res = recv(2)
if "error" in res:
    print(json.dumps({"ok": False, "error": res["error"]}, indent=2))
    sys.exit(1)
content = res.get("result", {}).get("content", [])
for item in content:
    if item.get("type") == "text":
        print(item["text"])
proc.terminate()
