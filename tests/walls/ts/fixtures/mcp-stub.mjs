#!/usr/bin/env node
// mcp-stub.mjs — the fake VENDOR comfy-mcp server for the walls plane.
//
// Speaks just enough newline-delimited JSON-RPC over stdio for the
// SDK client in packages/gateway-doors/src/doors/mcp.ts (initialize
// handshake + tools/call with canned payloads). Hermetic by design:
// no network, no disk writes, instant answers. Point the sandbox at it
// via MELITE_COMFY_MCP_BIN=<this file> (executable bit set).
//
// This is TEST TOOLING (a protocol stub), never estate logic: it owns
// no vocabulary, no envelope, no guard — the wall suites pin those.
import { createInterface } from "node:readline";

const CANNED = {
  server_info: { running: false, version: "wall-stub-1" },
  get_logs: ["wall stub log line 1", "wall stub log line 2"],
};

function reply(id, payload) {
  if (id === undefined || id === null) return; // notifications get no answer
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, ...payload }) + "\n");
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (msg.method === "initialize") {
    reply(msg.id, {
      result: {
        // Echo the client's protocol version (always negotiable).
        protocolVersion: msg.params?.protocolVersion ?? "2024-11-05",
        capabilities: {},
        serverInfo: { name: "wall-stub-comfy-mcp", version: "0.0.0" },
      },
    });
  } else if (msg.method === "tools/call") {
    const name = msg.params?.name ?? "?";
    const payload = Object.hasOwn(CANNED, name) ? CANNED[name] : { stub: true, tool: name };
    reply(msg.id, { result: { content: [{ type: "text", text: JSON.stringify(payload) }] } });
  } else if (msg.method === "tools/list") {
    reply(msg.id, {
      result: { tools: Object.keys(CANNED).map((n) => ({ name: n })) },
    });
  } else if (typeof msg.method === "string" && msg.method.startsWith("notifications/")) {
    // No answer (JSON-RPC notifications).
  } else if (msg.id !== undefined) {
    reply(msg.id, { result: {} });
  }
});
