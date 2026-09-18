// @melite/comfyui-cordis — host-service transport battery (split from comfyui-transport.spec.ts).
// The ComfyUIHostService plugin face. Scripted stub, no engine.
// Env keys are snapshotted per test (this file owns COMFYUI_URL/COMFYUI_ENDPOINT_CONFIG/
// INFERENCE_TEST_SANDBOX/MELITE_REPO_ROOT while it runs).
import { afterEach, beforeEach, describe, it, onTestFinished } from "vitest";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import {
  ComfyError, ComfyUIHostService, comfyuiHostProvider, executeFlow,
  executeSingle, interrupt, needComfyUI, stopForRunDir, unloadModels
} from "../src/comfyui.ts";
import type { EngineJson } from "../src/comfyui.ts";
import { ComfyUIService } from "../src/service.ts";

/** Mint a tree owned by the CURRENT test (disposed with it). */
function mintRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "comfyui-t-"));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

const ENV_KEYS = ["COMFYUI_URL", "COMFYUI_ENDPOINT_CONFIG", "INFERENCE_TEST_SANDBOX", "MELITE_REPO_ROOT"];
let envSnap: Record<string, string | undefined> = {};
beforeEach(() => {
  envSnap = {};
  for (const k of ENV_KEYS) envSnap[k] = process.env[k];
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (envSnap[k] === undefined) delete process.env[k];
    else process.env[k] = envSnap[k];
  }
});

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ── the scripted stub ──────────────────────────────────────────

interface StubCfg {
  promptStatus?: number;
  promptBody?: unknown;
  history?: (Record<string, unknown> | null | undefined)[];
  historyRaw?: { status: number; body: Buffer | string | number };
  view?: (name: string) => { status: number; body: Buffer | string | unknown };
  uploadStatus?: number;
  uploadName?: string;
  uploadBody?: unknown;
  freeStatus?: number;
  statsStatus?: number;
  delayMs?: number;
  /** the /ws upgrade arm (2026-09-13): text frames pushed to every
   *  upgrading client ~60ms after the handshake (the tap battery). */
  wsFrames?: string[];
  /** count upgrades into seen.upgrades (the no-report test's pin). */
  trackUpgrades?: boolean;
  seen: { queue: number; interrupt: number; uploads: number; frees: number; prompts: string[]; upgrades: number };
  calls?: Map<string, number>;
  /** raw multipart bodies per /upload/image POST (the data-URL
   *  byte-identity pin reads these). */
  uploadBodies?: Buffer[];
}

const doneEntry = (outputs: Record<string, unknown> = {}): Record<string, unknown> => ({
  status: { status_str: "success", completed: true, messages: [] },
  outputs,
});
const pendingEntry = (): Record<string, unknown> => ({
  status: { status_str: "running", completed: false, messages: [] },
});

const startStub = async (cfg: StubCfg): Promise<{ url: string; close: () => Promise<void> }> => {
  cfg.calls = new Map();
  const srv: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const respond = (status: number, body: Buffer | string | unknown): void => {
      const send = (): void => {
        if (Buffer.isBuffer(body)) {
          res.writeHead(status, { "content-type": "application/octet-stream" });
          res.end(body);
        } else if (typeof body === "string") {
          res.writeHead(status, { "content-type": "text/plain" });
          res.end(body);
        } else {
          res.writeHead(status, { "content-type": "application/json" });
          res.end(JSON.stringify(body));
        }
      };
      if ((cfg.delayMs ?? 0) > 0) setTimeout(send, cfg.delayMs);
      else send();
    };
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks);
      const url = req.url ?? "/";
      const method = req.method ?? "GET";
      if (method === "POST" && url === "/prompt") {
        cfg.seen.prompts.push(raw.toString("utf8"));
        respond(cfg.promptStatus ?? 200, cfg.promptBody ?? { prompt_id: "stub", number: 1, node_errors: {} });
      } else if (method === "GET" && url.startsWith("/history/")) {
        const id = decodeURIComponent(url.slice("/history/".length));
        const n = cfg.calls!.get(id) ?? 0;
        cfg.calls!.set(id, n + 1);
        if (cfg.historyRaw !== undefined) {
          respond(cfg.historyRaw.status, cfg.historyRaw.body);
        } else {
          const seq = cfg.history ?? [doneEntry()];
          const entry = seq[Math.min(n, seq.length - 1)];
          respond(200, { [id]: entry });
        }
      } else if (method === "GET" && url.startsWith("/view")) {
        const name = new URL(url, "http://x").searchParams.get("filename") ?? "";
        const v = cfg.view !== undefined
          ? cfg.view(name)
          : { status: 200 as number, body: Buffer.from("BYTES:" + name) as Buffer | string | unknown };
        respond(v.status, v.body);
      } else if (method === "POST" && url === "/upload/image") {
        cfg.seen.uploads += 1;
        (cfg.uploadBodies ??= []).push(raw);
        if ((cfg.uploadStatus ?? 200) !== 200) respond(cfg.uploadStatus!, { error: "nope" });
        else if (cfg.uploadBody !== undefined) respond(200, cfg.uploadBody);
        else respond(200, { name: cfg.uploadName ?? "staged.png" });
      } else if (method === "POST" && url === "/queue") {
        cfg.seen.queue += 1;
        respond(200, {});
      } else if (method === "POST" && url === "/interrupt") {
        cfg.seen.interrupt += 1;
        respond(200, {});
      } else if (method === "POST" && url === "/free") {
        cfg.seen.frees += 1;
        respond(cfg.freeStatus ?? 200, {});
      } else if (method === "GET" && url === "/system_stats") {
        respond(cfg.statsStatus ?? 200, { system: "ok" });
      } else if (method === "GET" && url === "/empty") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end("");
      } else if (method === "GET" && url.startsWith("/asset/")) {
        const name = url.slice("/asset/".length);
        if (name === "pic.png") respond(200, Buffer.from("PNG-BYTES"));
        else if (name === "fake.png") respond(200, { not: "bytes" });
        else if (name === "data.json") respond(200, { not: "bytes" });
        else respond(404, { error: "missing" });
      } else if (method === "POST" && url === "/echo") {
        respond(200, { contentType: req.headers["content-type"] ?? "", length: req.headers["content-length"] ?? "" });
      } else {
        respond(404, { error: "unknown " + url });
      }
    });
  });
  // the /ws upgrade arm: same server, same port — the tap's frames
  // ride the same 101 handshake the product client opens
  const wsSockets: import("node:net").Socket[] = [];
  srv.on("upgrade", (req: IncomingMessage, socket, head: Buffer) => {
    if (cfg.trackUpgrades === true) cfg.seen.upgrades += 1;
    const key = String(req.headers["sec-websocket-key"] ?? "");
    const accept = createHash("sha1").update(key + WS_GUID).digest("base64");
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\nConnection: Upgrade\r\n" +
      "Sec-WebSocket-Accept: " + accept + "\r\n\r\n",
      "utf8",
    );
    if (head.length > 0) socket.write(head);
    wsSockets.push(socket);
    const frames = cfg.wsFrames ?? [];
    setTimeout(() => {
      for (const f of frames) socket.write(wsTextFrame(f));
    }, 60);
  });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
  const addr = srv.address();
  const port = typeof addr === "object" && addr !== null ? addr.port : 0;
  return {
    url: "http://127.0.0.1:" + port,
    close: () => {
      for (const sck of wsSockets) sck.destroy();
      return new Promise<void>((r, j) => srv.close((e) => (e ? j(e) : r())));
    },
  };
};

const stub = (over: Partial<StubCfg> = {}): StubCfg => ({
  seen: { queue: 0, interrupt: 0, uploads: 0, frees: 0, prompts: [], upgrades: 0 },
  ...over,
});
/** ── the /ws upgrade arm (2026-09-13, the progress tap battery) ──
 *  A hand-rolled WebSocket SERVER for fixtures only (product code
 *  rides the platform client): 101 + accept key, then unmasked
 *  server→client text frames — the tap is read-only, so the fixture
 *  never needs to read client frames. */
const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const wsTextFrame = (payload: string): Buffer => {
  const data = Buffer.from(payload, "utf8");
  if (data.length < 126) return Buffer.concat([Buffer.from([0x81, data.length]), data]);
  const head = Buffer.alloc(4);
  head[0] = 0x81; head[1] = 126; head.writeUInt16BE(data.length, 2);
  return Buffer.concat([head, data]);
};


const tmpRoot = (): string => mintRoot();

const wfParams = (over: Record<string, EngineJson> = {}): Record<string, EngineJson> => ({
  workflow: { "1": { class_type: "KSampler", inputs: { seed: 1 } } },
  ...over,
});

// ── the host service ───────────────────────────────────────────

describe("ComfyUIHostService (the plugin face)", () => {
  const live: ComfyUIHostService[] = [];
  afterEach(() => {
    for (const svc of live.splice(0)) {
      (svc as unknown as { resetForTests: () => void }).resetForTests();
    }
  });
  const boot = async (config: Record<string, unknown> = {}): Promise<{ ctx: Context; svc: ComfyUIHostService }> => {
    const ctx = new Context();
    await ctx.plugin(comfyuiHostProvider, config);
    const svc = needComfyUI(ctx, "test");
    live.push(svc);
    return { ctx, svc };
  };
  it("baseUrl pins, caches, and falls back (absent everywhere refuses)", async () => {
    const { svc } = await boot({ url: "http://pin:1//" });
    assert.equal(svc.baseUrl(), "http://pin:1");
    assert.equal(svc.baseUrl(), "http://pin:1", "the second read rides the cache");
    const { svc: envSvc } = await boot();
    process.env["COMFYUI_URL"] = "http://env:2";
    assert.equal(envSvc.baseUrl(), "http://env:2");
    const { svc: loud } = await boot();
    delete process.env["COMFYUI_URL"];
    delete process.env["COMFYUI_ENDPOINT_CONFIG"];
    process.env["INFERENCE_TEST_SANDBOX"] = "1";
    assert.throws(() => loud.baseUrl(), (e: unknown) => e instanceof ComfyError);
  });
  it("the supervisor seam (lazy start, guarded face, early re-start)", async () => {
    const { svc } = await boot({ url: "http://pin:1" });
    const peek = svc as unknown as { supervisor: unknown; sup: () => unknown; startSupervisor: (s: string) => void };
    assert.throws(() => peek.sup(), /no supervisor — faces call baseUrl\(\) first/);
    assert.equal(peek.supervisor, null);
    svc.baseUrl();
    assert.ok(peek.supervisor !== null, "first resolution starts the supervisor");
    const first = peek.supervisor;
    peek.startSupervisor("http://pin:1");
    assert.equal(peek.supervisor, first, "the started guard never double-starts");
    (svc as unknown as { resetForTests: () => void }).resetForTests();
    assert.equal(peek.supervisor, null, "reset drops the supervisor");
  });
  it("a virgin repoint reads the ctor source (the entry closure)", async () => {
    const { svc } = await boot({ url: "http://entry:1" });
    svc.repoint();
    assert.equal(svc.baseUrl(), "http://entry:1", "no setSource yet — the ctor arrow answers");
  });
  it("repointing to no pin logs the env/file fallback", async () => {
    const { svc } = await boot({ url: "http://a:1" });
    assert.equal(svc.baseUrl(), "http://a:1");
    svc.setSource(() => ({}));
    svc.repoint();
    process.env["COMFYUI_URL"] = "http://fallback:9";
    assert.equal(svc.baseUrl(), "http://fallback:9", "null pin falls back to the env seam");
  });
  it("repoint swaps silent-unresolved, no-ops same, drops on change", async () => {
    const { svc } = await boot({ url: "http://a:1" });
    svc.setSource(() => ({ url: "http://b:2" }));
    svc.repoint();
    assert.equal(svc.baseUrl(), "http://b:2", "unresolved repoints swap the pin silently");
    const peek = svc as unknown as { supervisor: unknown; resolved: unknown };
    const sup = peek.supervisor;
    svc.repoint();
    assert.equal(peek.supervisor, sup, "same pin is a no-op");
    assert.equal(svc.baseUrl(), "http://b:2");
    svc.setSource(() => ({ url: "http://c:3" }));
    svc.repoint();
    assert.equal(peek.resolved, null, "a change clears the resolution");
    assert.equal(svc.baseUrl(), "http://c:3");
    (svc as unknown as { supervisor: null }).supervisor = null;
    svc.setSource(() => ({ url: "http://d:4" }));
    svc.repoint();
    assert.equal(svc.baseUrl(), "http://d:4", "a supervisor-less change skips the dispose");
    (svc as unknown as { resetForTests: () => void }).resetForTests();
  });
  it("the settings provider takes over the live source (inject fires once provided)", async () => {
    const ctx = new Context();
    await ctx.plugin(comfyuiHostProvider, { url: "http://ctor:1" });
    const svc = needComfyUI(ctx, "test");
    live.push(svc);
    assert.equal(svc.baseUrl(), "http://ctor:1");
    ctx.provide("settings", {
      installSection: (
        _c: unknown, _ns: unknown, _schema: unknown, _entry: unknown,
        hooks: { setSource: (s: () => Record<string, unknown>) => void; onChange: () => void },
      ): void => {
        hooks.setSource(() => ({ url: "http://hooked:7" }));
        hooks.onChange();
      },
    });
    await sleep(100);
    assert.equal(
      (svc as unknown as { pin: string }).pin,
      "http://hooked:7",
      "setSource + onChange re-resolve the pin live (no restart)",
    );
  });
  it("resetForTests re-arms the ctor source", async () => {
    const { svc } = await boot({ url: "http://ctor:1" });
    svc.setSource(() => ({ url: "http://live:2" }));
    (svc as unknown as { resetForTests: () => void }).resetForTests();
    svc.repoint();
    assert.equal(svc.baseUrl(), "http://ctor:1", "reset drops the live source");
    (svc as unknown as { resetForTests: () => void }).resetForTests();
  });
  it("a timed-out first probe warns; the re-probe recovery logs info", async () => {
    const cfg = stub({ delayMs: 6000 });
    const srv = await startStub(cfg);
    try {
      const { svc } = await boot({ url: srv.url });
      svc.baseUrl();
      const peek = svc as unknown as { supervisor: { state: string } | null };
      assert.ok(peek.supervisor !== null);
      await sleep(5600);
      assert.equal(peek.supervisor!.state, "down", "the 5s probe fuse fires against the stalled stub");
      cfg.delayMs = 0;
      let state = "down";
      for (let i = 0; i < 100 && state !== "up"; i++) {
        await sleep(200);
        state = peek.supervisor!.state;
      }
      assert.equal(state, "up", "the backoff re-probe lands and voices reachable");
    } finally { await srv.close(); }
  }, 30000);
  it("executes supervised (success reports; HTTP failures rethrow bare; transport marks down)", async () => {
    const cfg = stub({ history: [doneEntry()] });
    const s = await startStub(cfg);
    try {
      const { svc } = await boot({ url: s.url });
      const out = await svc.executeSingle(tmpRoot(), wfParams(), {}, {});
      assert.ok(out.promptId.length > 0);
      const flow = await svc.executeFlow(
        [{ stageId: "a", workflow: { "1": { class_type: "K", inputs: {} } }, outputs: {}, outputNodes: {}, params: {} }],
        tmpRoot(), {}, {},
      );
      assert.ok(flow.promptId.length > 0);
      await svc.stopForRunDir("ghost-dir");
      await svc.unloadModels();
      assert.equal(cfg.seen.frees, 1);
    } finally { await s.close(); }
    const bad = stub({ promptStatus: 500, promptBody: "down" });
    const bs = await startStub(bad);
    try {
      const { svc } = await boot({ url: bs.url });
      await assert.rejects(svc.executeSingle(tmpRoot(), wfParams(), {}, {}), (e: unknown) => e instanceof ComfyError);
      const peekBad = svc as unknown as { supervisor: { state: string } | null };
      assert.notEqual(peekBad.supervisor?.state, "down", "HTTP failures stay neutral (no down-mark — timeouts/statuses prove liveness)");
    } finally { await bs.close(); }
    const { svc: dark } = await boot({ url: "http://127.0.0.1:1" });
    await assert.rejects(dark.executeSingle(tmpRoot(), wfParams(), {}, {}), /ECONNREFUSED|EADDR/);
    (dark as unknown as { resetForTests: () => void }).resetForTests();
  }, 60000);
  it("service executeSingle deregisters the fiber map (stroke-82 fix a)", async () => {
    const cfg = stub({ history: [doneEntry()] });
    const s = await startStub(cfg);
    try {
      const { svc } = await boot({ url: s.url });
      const runDir = tmpRoot();
      const out = await svc.executeSingle(runDir, wfParams(), {}, {});
      assert.ok(out.promptId.length > 0);
      assert.equal((svc as unknown as { prompts: Map<string, unknown> }).prompts.size, 0, "the finally deletes the service handle");
      await svc.stopForRunDir(runDir);
      assert.equal(cfg.seen.interrupt, 0, "no phantom interrupt after completion");
    } finally { await s.close(); }
  });
  it("supervised fast-fail: known-down refuses without touching /prompt", async () => {
    const cfg = stub({ history: [doneEntry()] });
    const s = await startStub(cfg);
    try {
      const { svc } = await boot({ url: s.url });
      svc.baseUrl();
      const peek = svc as unknown as { supervisor: { state: string; lastError: unknown } | null };
      for (let i = 0; i < 50 && peek.supervisor?.state !== "up"; i++) await sleep(100);
      assert.equal(peek.supervisor?.state, "up");
      peek.supervisor!.state = "down";
      peek.supervisor!.lastError = new Error("ECONNREFUSED mock down");
      await assert.rejects(
        svc.executeSingle(tmpRoot(), wfParams(), {}, {}),
        /unreachable|down|unavailable/,
      );
      assert.equal(cfg.seen.prompts.length, 0, "fast-fail never submits");
    } finally { await s.close(); }
  });
  it("service live stop interrupts but the run still lands (interrupt ≠ cancel)", async () => {
    const cfg = stub({ history: [pendingEntry(), pendingEntry(), pendingEntry(), pendingEntry(), doneEntry()] });
    const s = await startStub(cfg);
    try {
      const { svc } = await boot({ url: s.url });
      const runDir = tmpRoot();
      const p = svc.executeSingle(runDir, wfParams(), {}, {});
      while ((svc as unknown as { prompts: Map<string, unknown> }).prompts.size === 0) await sleep(50);
      await svc.stopForRunDir(runDir);
      const out = await p;
      assert.ok(out.promptId.length > 0, "interrupt ≠ cancel — the terminal entry still resolves");
      assert.ok(cfg.seen.interrupt >= 1, "the live stop posted the interrupt");
      assert.equal((svc as unknown as { prompts: Map<string, unknown> }).prompts.size, 0);
    } finally { await s.close(); }
  }, 30000);
  it("service unloadModels failure arms (500 → ComfyError; dead port → rejects)", async () => {
    const bad = stub({ freeStatus: 500 });
    const bs = await startStub(bad);
    try {
      const { svc } = await boot({ url: bs.url });
      await assert.rejects(svc.unloadModels(), /\/free status 500/);
    } finally { await bs.close(); }
    const { svc: dark } = await boot({ url: "http://127.0.0.1:1" });
    await assert.rejects(dark.unloadModels(), /ECONNREFUSED|EADDR|refused|timed out|failed/);
  });
});
