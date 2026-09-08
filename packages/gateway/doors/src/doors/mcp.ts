/** MCP rail — the TS door's stdio client to the VENDOR comfy-mcp server.
 *
 * NO-ESTATE-PYTHON LAW: the estate writes zero Python. ComfyUI +
 * ComfyUI-Manager ARE the Python; they offer an API (MCP tools over
 * stdio on their own `comfy-mcp` server binary) and this module
 * connects to it via Cordis-side primitives (@modelcontextprotocol/sdk
 * Client + StdioClientTransport). No estate Python is spawned, read,
 * or imported anywhere on this path — the only Python process is the
 * vendor's own server binary, the same one a GUI MCP client launches.
 *
 * Shape: one vendor-server spawn per tool call (manage calls are
 * infra-upkeep, never the hot path; per-call spawn matches the old
 * in-process call freshness and needs no process lifecycle). The
 * caller passes the routing env (COMFY_BIN / COMFYUI_PATH /
 * VIRTUAL_ENV) that _ensure_routing owns; this module only forwards.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface McpRailOpts {
  /** Absolute path of the vendor `comfy-mcp` server binary. */
  serverBin: string;
  /** Routing env for the vendor server (COMFY_BIN + COMFYUI_PATH + set). */
  env: Record<string, string>;
  /** Per-call ceiling ms (installs/downloads are slow). */
  timeoutMs: number;
}

function textOf(content: unknown): string {
  if (!Array.isArray(content)) return JSON.stringify(content ?? null);
  const parts: string[] = [];
  for (const block of content as Array<Record<string, unknown>>) {
    if (block == null || typeof block !== "object") continue;
    if (block["type"] === "text" && typeof block["text"] === "string") {
      parts.push(block["text"] as string);
    } else {
      parts.push(JSON.stringify(block));
    }
  }
  return parts.join("\n");
}

/** Call one vendor MCP tool; resolves the pared tool payload (parsed
 *  JSON when the text parses, else the raw text). THROWS McpRailError
 *  on transport failure, non-zero vendor exit, or tool isError. */
export async function callMcpTool(
  tool: string,
  args: Record<string, unknown>,
  opts: McpRailOpts,
): Promise<unknown> {
  const transport = new StdioClientTransport({
    command: opts.serverBin,
    args: [],
    env: { ...process.env, ...opts.env } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "melite-manage-door", version: "1.0.0" });
  const fail = (detail: string): never => {
    const err = new Error(detail) as Error & { mcpRail: true };
    (err as unknown as Record<string, unknown>)["mcpRail"] = true;
    throw err;
  };
  try {
    await client.connect(transport);
  } catch (e) {
    try { await transport.close(); } catch { /* already down */ }
    fail("cannot start vendor comfy-mcp at " + opts.serverBin + ": " + String(e));
  }
  try {
    const res = await client.callTool(
      { name: tool, arguments: args },
      undefined,
      { timeout: opts.timeoutMs },
    );
    const out = res as unknown as Record<string, unknown>;
    if (out["isError"] === true) {
      fail("vendor tool " + tool + " failed: " + textOf(out["content"]).slice(0, 500));
    }
    const text = textOf(out["content"]);
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (e) {
    if ((e as Record<string, unknown>)["mcpRail"] === true) throw e;
    fail("vendor tool " + tool + " failed: " + String(e).slice(0, 500));
  } finally {
    try { await client.close(); } catch { /* best effort */ }
  }
}

/** Vendor tool catalogue probe (engineering discovery + the
 *  unknown-tool 502 path). Returns the tool name list. */
export async function listMcpTools(opts: McpRailOpts): Promise<string[]> {
  const transport = new StdioClientTransport({
    command: opts.serverBin,
    args: [],
    env: { ...process.env, ...opts.env } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "melite-manage-door", version: "1.0.0" });
  try {
    await client.connect(transport);
    const res = await client.listTools(undefined, { timeout: opts.timeoutMs });
    const tools = (res as unknown as { tools?: Array<{ name?: unknown }> }).tools ?? [];
    return tools.map((t) => String(t.name ?? ""));
  } finally {
    try { await client.close(); } catch { /* best effort */ }
  }
}
