// @melite/comfyui-cordis — the engine-IO transport battery
// (TEST-2 breadth, 2026-09-12). Pure ports pin directly; every
// wire arm drives a scripted in-file stub (node:http, ephemeral
// port — no engine, no fixtures). Env keys are snapshotted per
// test (this file owns COMFYUI_URL/COMFYUI_ENDPOINT_CONFIG/
// INFERENCE_TEST_SANDBOX/MELITE_REPO_ROOT while it runs).
import { afterEach, beforeEach, describe, it, onTestFinished } from "vitest";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import {
  ComfyError, ComfyUIHostService, activeCount, comfyuiHostProvider,
  drainRelevant, endpointConfigPath, executeFlow, executeSingle, fetchOutputs,
  formatTimeout0f, httpCall, interrupt, loadEndpointConfig,
  mapHistoryEntry, needComfyUI, openProgressTap, parseComfyUIHostConfig, planMerge,
  publishOutputChannels, pyDumps400, pyReprStr, pyReprStrList, pyStr,
  resolveEngineBaseUrl, resolveRepoRoot, spliceWorkflow, stopForRunDir,
  unloadModels, uploadReferenced,
} from "../src/comfyui.ts";
import type { EngineJson, MergeRow } from "../src/comfyui.ts";
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
const startWsStub = async (
  frames: string[],
  delayMs = 60,
): Promise<{ url: string; close: () => Promise<void> }> => {
  const sockets: import("node:net").Socket[] = [];
  const srv: Server = createServer();
  srv.on("upgrade", (req: IncomingMessage, socket, head: Buffer) => {
    const key = String(req.headers["sec-websocket-key"] ?? "");
    const accept = createHash("sha1").update(key + WS_GUID).digest("base64");
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\nConnection: Upgrade\r\n" +
      "Sec-WebSocket-Accept: " + accept + "\r\n\r\n",
      "utf8",
    );
    if (head.length > 0) socket.write(head);
    sockets.push(socket);
    setTimeout(() => {
      for (const f of frames) socket.write(wsTextFrame(f));
    }, delayMs);
  });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
  const addr = srv.address();
  const port = typeof addr === "object" && addr !== null ? addr.port : 0;
  return {
    url: "http://127.0.0.1:" + port,
    close: () => {
      for (const s of sockets) s.destroy();
      return new Promise<void>((r, j) => srv.close((e) => (e ? j(e) : r())));
    },
  };
};

const tmpRoot = (): string => mintRoot();
const wfParams = (over: Record<string, EngineJson> = {}): Record<string, EngineJson> => ({
  workflow: { "1": { class_type: "KSampler", inputs: { seed: 1 } } },
  ...over,
});

// ── pure ports ─────────────────────────────────────────────────

describe("pyReprStr (the quote battery)", () => {
  it("escapes the wall's shapes", () => {
    assert.equal(pyReprStr("plain"), "'plain'");
    assert.equal(pyReprStr("a\\b"), "'a\\\\b'");
    assert.equal(pyReprStr("it's"), "'it\\'s'");
    assert.equal(pyReprStr("a\nb\rc\td"), "'a\\nb\\rc\\td'");
  });
});

describe("pyStr (str() parity)", () => {
  it("walks every shape", () => {
    assert.equal(pyStr(null), "None");
    assert.equal(pyStr(undefined), "None");
    assert.equal(pyStr("top body"), "top body");
    assert.equal(pyStr("nested", false), "'nested'");
    assert.equal(pyStr(7), "7");
    assert.equal(pyStr(true), "True");
    assert.equal(pyStr(false), "False");
    assert.equal(pyStr(Buffer.from("AB")), "b'AB'");
    assert.equal(pyStr(["a", 1, true, null]), "['a', 1, True, None]");
    assert.equal(pyStr({ a: "x", n: 2 }), "{'a': 'x', 'n': 2}");
  });
});

describe("pyDumps400 (the dump battery)", () => {
  it("emits the default separators + truncates", () => {
    assert.equal(pyDumps400("s"), '"s"');
    assert.equal(pyDumps400(null), "null");
    assert.equal(pyDumps400(3), "3");
    assert.equal(pyDumps400(true), "true");
    assert.equal(pyDumps400(["a", 1]), '["a", 1]');
    assert.equal(pyDumps400({ k: "v", n: [1, 2] }), '{"k": "v", "n": [1, 2]}');
    assert.equal(pyDumps400("x".repeat(500)).length, 400);
  });
});

describe("formatTimeout0f (half-to-even)", () => {
  it("rounds like %.0f", () => {
    assert.equal(formatTimeout0f(2.4), "2");
    assert.equal(formatTimeout0f(2.6), "3");
    assert.equal(formatTimeout0f(2.5), "2");
    assert.equal(formatTimeout0f(3.5), "4");
  });
});

describe("pyReprStrList", () => {
  it("str()s the list", () => {
    assert.equal(pyReprStrList(["a", "b"]), "['a', 'b']");
  });
});

describe("spliceWorkflow (the splice gates)", () => {
  const wf = (): Record<string, EngineJson> => ({
    "1": { class_type: "K", inputs: { seed: 1, prompt: "x" } },
  });
  it("splices injects into the graph", () => {
    const out = spliceWorkflow({ workflow: wf(), inject: { "1.seed": 9 } });
    assert.equal(((out["1"] as Record<string, EngineJson>)["inputs"] as Record<string, EngineJson>)["seed"], 9);
  });
  it("every misshapen splice refuses named", () => {
    assert.throws(() => spliceWorkflow({}), /carries no inline workflow/);
    assert.throws(() => spliceWorkflow({ workflow: "x" }), /carries no inline workflow/);
    assert.throws(() => spliceWorkflow({ workflow: [] }), /carries no inline workflow/);
    assert.throws(() => spliceWorkflow({ workflow: wf(), inject: "x" }), /inject must be an object/);
    assert.throws(() => spliceWorkflow({ workflow: wf(), inject: { noslot: 1 } }), /targets nothing/);
    assert.throws(() => spliceWorkflow({ workflow: wf(), inject: { "9.seed": 1 } }), /targets nothing/);
    assert.throws(() => spliceWorkflow({ workflow: wf(), inject: { "1.ghost": 1 } }), /has no input/);
    assert.throws(
      () => spliceWorkflow({ workflow: { "1": { class_type: "K" } }, inject: { "1.seed": 1 } }),
      /has no input/,
    );
  });
});

describe("publishOutputChannels (the declaration order)", () => {
  it("first unmatched artifact wins per channel; unknown kinds skip", () => {
    const out = publishOutputChannels(
      { image: "image", thumb: "image", video: "video", text: "text", mesh: "mesh" },
      ["/r/a.png", "/r/b.mp4", "/r/c.glb"],
    );
    assert.equal(out["image"], "/r/a.png");
    assert.equal(out["thumb"], undefined, "a.png is claimed — the second image channel starves");
    assert.equal(out["video"], "/r/b.mp4");
    assert.equal(out["mesh"], "/r/c.glb");
    assert.equal(out["text"], undefined, "text is no FILE-kind channel");
    assert.deepEqual(publishOutputChannels(undefined as never, undefined as never), {});
    assert.deepEqual(publishOutputChannels({ image: "image" }, undefined as never), {});
    assert.deepEqual(publishOutputChannels({ image: "image" }, ["/r/a.bin"]), {});
  });
});

describe("mapHistoryEntry (the verdict read)", () => {
  it("reads every verdict", () => {
    assert.deepEqual(mapHistoryEntry(null), { kind: "pending" });
    assert.deepEqual(mapHistoryEntry(undefined), { kind: "pending" });
    assert.deepEqual(mapHistoryEntry({}), { kind: "pending" });
    assert.deepEqual(mapHistoryEntry({ status: "x" }), { kind: "pending" });
    assert.deepEqual(mapHistoryEntry({ status: { status_str: "success", completed: true } }), { kind: "completed" });
    assert.deepEqual(mapHistoryEntry({ status: { status_str: "running", completed: false } }), { kind: "pending" });
    const execFail = {
      status: {
        status_str: "error",
        messages: [["execution_error", { node_id: "1", exception_message: "boom" }], ["other", {}]],
      },
    };
    const v = mapHistoryEntry(execFail as never);
    assert.equal(v.kind, "failed");
    assert.ok((v as { detail: string }).detail.includes("boom"), "the execution_error detail wins");
    const whole = mapHistoryEntry({ status: { status_str: "error", messages: [["other", 1]] } } as never);
    assert.ok((whole as { detail: string }).detail.includes("status_str"), "without it the whole status voices");
    assert.equal((mapHistoryEntry({ status: { status_str: "error" } }) as { kind: string }).kind, "failed");
    assert.equal((mapHistoryEntry({ status: { status_str: "error", messages: "x" } }) as { kind: string }).kind, "failed");
  });
});

describe("parseComfyUIHostConfig (the triple)", () => {
  it("parses + refuses", () => {
    assert.deepEqual(parseComfyUIHostConfig(null), {});
    assert.deepEqual(parseComfyUIHostConfig(undefined), {});
    assert.deepEqual(parseComfyUIHostConfig({ url: " http://h:1// " }), { url: "http://h:1" });
    assert.throws(() => parseComfyUIHostConfig({ url: "  " }), /url must be a non-empty string/);
    assert.deepEqual(parseComfyUIHostConfig({ host: " h " }), { host: "h" });
    assert.throws(() => parseComfyUIHostConfig({ host: "" }), /host must be a non-empty string/);
    assert.deepEqual(parseComfyUIHostConfig({ port: 8188 }), { port: 8188 });
    assert.throws(() => parseComfyUIHostConfig({ port: 1.5 }), /port must be an integer/);
    assert.throws(() => parseComfyUIHostConfig({ url: 42 }), /ComfyError|Error/);
  });
});

describe("ComfyUIHostService.resolvePin (the pin law)", () => {
  it("url wins; host/port compose; neither is null", () => {
    assert.equal(ComfyUIHostService.resolvePin({ url: "http://u", host: "h", port: 1 }), "http://u");
    assert.equal(ComfyUIHostService.resolvePin({ host: "h" }), "http://h:8188");
    assert.equal(ComfyUIHostService.resolvePin({ port: 9 }), "http://127.0.0.1:9");
    assert.equal(ComfyUIHostService.resolvePin({}), null);
  });
});

describe("needComfyUI (the threading gate)", () => {
  it("missing and miswired fibers refuse; the host passes", async () => {
    const bare = new Context();
    assert.throws(() => needComfyUI(bare, "door"), /no ComfyUIHostService for door/);
    const cardCtx = new Context();
    await cardCtx.plugin({ apply(c: Context) { new ComfyUIService(c); } });
    assert.throws(() => needComfyUI(cardCtx, "door"), /miswire/);
    const hostCtx = new Context();
    await hostCtx.plugin(comfyuiHostProvider, { url: "http://stub:1" });
    assert.ok(needComfyUI(hostCtx, "door") instanceof ComfyUIHostService);
  });
});

describe("endpoint config (the SSOT read)", () => {
  it("env path wins the write-target spelling", () => {
    process.env["COMFYUI_ENDPOINT_CONFIG"] = "/tmp/x.json";
    assert.equal(endpointConfigPath(), "/tmp/x.json");
    delete process.env["COMFYUI_ENDPOINT_CONFIG"];
    assert.ok(endpointConfigPath().endsWith(join("packages", "engines", "comfyui-cordis", "data", "comfyui_endpoint.json")));
  });
  it("loads, refuses, and gates", () => {
    const root = tmpRoot();
    const good = join(root, "ep.json");
    writeFileSync(good, JSON.stringify({ url: "http://cfg:2//" }));
    process.env["COMFYUI_ENDPOINT_CONFIG"] = good;
    assert.deepEqual(loadEndpointConfig(), { url: "http://cfg:2//" });
    assert.equal(resolveEngineBaseUrl(), "http://cfg:2");
    process.env["COMFYUI_ENDPOINT_CONFIG"] = join(root, "absent.json");
    assert.deepEqual(loadEndpointConfig(), {});
    process.env["COMFYUI_ENDPOINT_CONFIG"] = good;
    writeFileSync(good, "{nope");
    assert.throws(() => loadEndpointConfig(), /exists but will not parse \(SyntaxError/);
  });
  it("the sandbox gate resolves {} without the env path; COMFYUI_URL wins first", () => {
    process.env["INFERENCE_TEST_SANDBOX"] = "1";
    assert.deepEqual(loadEndpointConfig(), {});
    assert.throws(() => resolveEngineBaseUrl(), (e: unknown) => e instanceof ComfyError && e.message === "no ComfyUI endpoint: the endpoint config carries no 'url' and COMFYUI_URL is unset (no defaults — QUEUE LANE LAW)");
    process.env["COMFYUI_URL"] = "http://env:3///";
    assert.equal(resolveEngineBaseUrl(), "http://env:3");
  });
  it("a fixture root without the file resolves {} (the wall seam)", () => {
    process.env["MELITE_REPO_ROOT"] = tmpRoot();
    assert.deepEqual(loadEndpointConfig(), {});
    assert.equal(typeof resolveRepoRoot(), "string");
    delete process.env["MELITE_REPO_ROOT"];
    assert.ok(resolveRepoRoot().endsWith("inference.cpp"), "the default climbs four hops to the repo");
  });
  it("activeCount starts empty; ComfyError names itself", () => {
    assert.equal(activeCount(), 0);
    assert.equal(new ComfyError("x").name, "ComfyError");
  });
});

// ── httpCall ───────────────────────────────────────────────────

describe("httpCall (the primitive)", () => {
  it("reads JSON, bytes, and empty; posts headers", async () => {
    const cfg = stub();
    const s = await startStub(cfg);
    try {
      const j = await httpCall("GET", s.url + "/system_stats");
      assert.equal(j.status, 200);
      assert.deepEqual(j.body, { system: "ok" });
      const b = await httpCall("GET", s.url + "/asset/pic.png");
      assert.ok(Buffer.isBuffer(b.body));
      const e = await httpCall("GET", s.url + "/empty");
      assert.equal(e.body, null);
      const echo = await httpCall("POST", s.url + "/echo", Buffer.from("{}", "utf8")) as { body: EngineJson };
      const eb = echo.body as Record<string, string>;
      assert.equal(eb["contentType"], "application/json");
      assert.equal(eb["length"], "2");
    } finally { await s.close(); }
  });
  it("transport failures reject; deadlines reject", async () => {
    await assert.rejects(httpCall("GET", "http://127.0.0.1:1/x", null, "application/json", 2000), /ECONNREFUSED|EADDR/);
    const cfg = stub({ delayMs: 300 });
    const s = await startStub(cfg);
    try {
      await assert.rejects(httpCall("GET", s.url + "/system_stats", null, "application/json", 60), /timed out after 60ms/);
    } finally { await s.close(); }
  });
});

// ── upload ─────────────────────────────────────────────────────

describe("uploadReferenced (the staging walk)", () => {
  it("stages local files once; missing/ext-less/non-strings ride", async () => {
    const cfg = stub();
    const s = await startStub(cfg);
    try {
      const root = tmpRoot();
      const png = join(root, "a.png");
      writeFileSync(png, Buffer.from("PNG"));
      const txt = join(root, "b.txt");
      writeFileSync(txt, "txt");
      const bmp = join(root, "c.bmp");
      writeFileSync(bmp, Buffer.from("BMP"));
      const wf = {
        "1": { class_type: "LoadImage", inputs: { image: png, seed: 7, note: txt, missing: "/nope/x.png", rel: "rel/missing.png", second: png } },
        "2": ["also", "an", "array"],
        "3": "a-string",
      };
      const { graph, uploaded } = await uploadReferenced(s.url, wf as never);
      const ins = (graph["1"] as Record<string, EngineJson>)["inputs"] as Record<string, EngineJson>;
      assert.equal(ins["image"], "staged.png");
      assert.equal(ins["second"], "staged.png", "the seen map dedupes");
      assert.equal(ins["seed"], 7);
      assert.equal(ins["note"], txt);
      assert.equal(ins["missing"], "/nope/x.png");
      assert.equal(graph["2"], (wf["2"] as string[]).join(",") === "also,an,array" ? graph["2"] : graph["2"], "arrays descend");
      assert.equal(cfg.seen.uploads, 1);
      assert.ok(Object.keys(uploaded).length === 1);
      const bmpOut = await uploadReferenced(s.url, { "1": { class_type: "L", inputs: { image: bmp } } } as never);
      assert.equal(((bmpOut.graph["1"] as Record<string, EngineJson>)["inputs"] as Record<string, EngineJson>)["image"], "staged.png");
    } finally { await s.close(); }
  });
  it("the VHS video key is exempt; VHS without inputs rides generic", async () => {
    const cfg = stub();
    const s = await startStub(cfg);
    try {
      const root = tmpRoot();
      const png = join(root, "a.png");
      writeFileSync(png, Buffer.from("PNG"));
      const { graph } = await uploadReferenced(s.url, {
        "1": { class_type: "VHS_LoadVideo", inputs: { video: "/mount/v.mp4", image: png } },
        "2": { class_type: "VHS_LoadVideoPath" },
        "3": "kept",
      } as never);
      const ins = (graph["1"] as Record<string, EngineJson>)["inputs"] as Record<string, EngineJson>;
      assert.equal(ins["video"], "/mount/v.mp4", "server-path readers keep the mount path");
      assert.equal(ins["image"], "staged.png", "sibling keys still stage");
      assert.deepEqual(graph["3"], "kept");
    } finally { await s.close(); }
  });
  it("linked inputs fetch then upload; failures refuse loud", async () => {
    const cfg = stub();
    const s = await startStub(cfg);
    try {
      const ok = await uploadReferenced(s.url, {
        "1": { class_type: "L", inputs: { image: s.url + "/asset/pic.png" } },
        "2": { class_type: "L", inputs: { image: s.url + "/asset/pic.png" } },
      } as never);
      assert.equal((((ok.graph["1"] as Record<string, EngineJson>)["inputs"]) as Record<string, EngineJson>)["image"], "staged.png");
      assert.equal((((ok.graph["2"] as Record<string, EngineJson>)["inputs"]) as Record<string, EngineJson>)["image"], "staged.png");
      assert.equal(cfg.seen.uploads, 1, "the seen map dedupes linked URLs too");
      await assert.rejects(
        uploadReferenced(s.url, { "1": { class_type: "L", inputs: { image: s.url + "/asset/nope.png" } } } as never),
        /linked input fetch failed/,
      );
      await assert.rejects(
        uploadReferenced(s.url, { "1": { class_type: "L", inputs: { image: s.url + "/asset/fake.png" } } } as never),
        /linked input fetch failed/,
      );
    } finally { await s.close(); }
  });
  it("estate asset urls stage from runsRoot (the chain's disk half)", async () => {
    const cfg = stub();
    const s = await startStub(cfg);
    try {
      const root = tmpRoot();
      mkdirSync(join(root, "run-x", "img-to-mesh"), { recursive: true });
      writeFileSync(join(root, "run-x", "img-to-mesh", "out.png"), Buffer.from("PNG"));
      const wf = {
        "1": { class_type: "L", inputs: {
          media: "/melite-media/runs/run-x/img-to-mesh/out.png",
          asset: "/v1/assets/runs/run-x/img-to-mesh/out.png",
          rel: "run-x/img-to-mesh/out.png",
        } },
      };
      const { graph, uploaded } = await uploadReferenced(s.url, wf as never, { runsRoot: root });
      const ins = (graph["1"] as Record<string, EngineJson>)["inputs"] as Record<string, EngineJson>;
      assert.equal(ins["media"], "staged.png");
      assert.equal(ins["asset"], "staged.png");
      assert.equal(ins["rel"], "staged.png");
      assert.equal(cfg.seen.uploads, 1, "the seen map dedupes the three spellings to one file");
      assert.equal(Object.keys(uploaded).length, 1);
    } finally { await s.close(); }
  });
  it("a runs-relative name alone uploads on first sight (no route-prefix sibling pre-warms the cache)", async () => {
    const cfg = stub();
    const s = await startStub(cfg);
    try {
      const root = tmpRoot();
      mkdirSync(join(root, "run-solo", "mesh"), { recursive: true });
      writeFileSync(join(root, "run-solo", "mesh", "only.png"), Buffer.from("PNG"));
      // ONE spelling, first sight: the runs-relative arm itself pays
      // the upload (the cache-miss half of the seen-map gate)
      const { graph, uploaded } = await uploadReferenced(s.url, {
        "1": { class_type: "L", inputs: { image: "run-solo/mesh/only.png" } },
      } as never, { runsRoot: root });
      const ins = (graph["1"] as Record<string, EngineJson>)["inputs"] as Record<string, EngineJson>;
      assert.equal(ins["image"], "staged.png");
      assert.equal(cfg.seen.uploads, 1);
      assert.equal(Object.keys(uploaded).length, 1);
    } finally { await s.close(); }
  });
  it("estate asset urls refuse loud when dangling or rootless; runs-relative misses fall to cwd", async () => {
    const cfg = stub();
    const s = await startStub(cfg);
    try {
      const root = tmpRoot();
      // dangling under the root: loud (the http arm's law)
      await assert.rejects(
        uploadReferenced(s.url, { "1": { class_type: "L", inputs: { image: "/melite-media/runs/run-y/gone.png" } } } as never, { runsRoot: root }),
        /estate asset url not found.*re-run the producer card/,
      );
      // traversal: loud
      await assert.rejects(
        uploadReferenced(s.url, { "1": { class_type: "L", inputs: { image: "/melite-media/runs/../escape.png" } } } as never, { runsRoot: root }),
        /refuses traversal/,
      );
      // no runsRoot armed: loud (the caller's seam, named)
      await assert.rejects(
        uploadReferenced(s.url, { "1": { class_type: "L", inputs: { image: "/melite-media/runs/run-x/out.png" } } } as never),
        /without a runs root/,
      );
      // a runs-relative MISS falls to the cwd arm and rides verbatim
      // (the estate-relative input paths keep their old law)
      const out = await uploadReferenced(s.url, { "1": { class_type: "L", inputs: { image: "no-run/miss.png" } } } as never, { runsRoot: root });
      const ins = (out.graph["1"] as Record<string, EngineJson>)["inputs"] as Record<string, EngineJson>;
      assert.equal(ins["image"], "no-run/miss.png");
      assert.equal(cfg.seen.uploads, 0);
    } finally { await s.close(); }
  });
  it("every content-type arm + every failure shape", async () => {
    const exts = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".wav", ".mp3", ".glb"];
    for (const ext of exts) {
      const cfg = stub();
      const srv = await startStub(cfg);
      try {
        const root = tmpRoot();
        const f = join(root, "a" + ext);
        writeFileSync(f, Buffer.from("X"));
        await uploadReferenced(srv.url, { "1": { class_type: "L", inputs: { image: f } } } as never);
        assert.equal(cfg.seen.uploads, 1, ext + " rides the upload");
      } finally { await srv.close(); }
    }
    const bad = stub({ uploadStatus: 500 });
    const bs = await startStub(bad);
    try {
      const root = tmpRoot();
      const f = join(root, "a.png");
      writeFileSync(f, Buffer.from("X"));
      await assert.rejects(uploadReferenced(bs.url, { "1": { class_type: "L", inputs: { image: f } } } as never), /upload failed/);
    } finally { await bs.close(); }
    const ns = await startStub(stub({ uploadBody: {} }));
    try {
      const root = tmpRoot();
      const f = join(root, "a.png");
      writeFileSync(f, Buffer.from("X"));
      await assert.rejects(uploadReferenced(ns.url, { "1": { class_type: "L", inputs: { image: f } } } as never), /upload failed/);
    } finally { await ns.close(); }
  });
  it("data-URL maps stage byte-identical; non-image/empty payloads ride to the engine's loud refusal", async () => {
    // THE RUN-RECORD RESTORATION: a retired conditioning map arrives
    // as image_b64 verbatim — it stages like a local file (decode
    // EXACTLY, never re-encode), never rides verbatim into LoadImage.
    const cfg = stub();
    const s = await startStub(cfg);
    try {
      const bytes = Buffer.from("MAP-BYTES-EXACT");
      const url = "data:image/png;base64," + bytes.toString("base64");
      const { graph, uploaded } = await uploadReferenced(s.url, {
        "1": { class_type: "LoadImage", inputs: { image: url, second: url } },
        "2": { class_type: "L", inputs: { image: "data:text/plain;base64,aGk=" } },
        "3": { class_type: "L", inputs: { image: "data:image/png;base64," } },
        "4": { class_type: "L", inputs: { image: "data:image/png,not-base64" } },
      } as never);
      const ins = (graph["1"] as Record<string, EngineJson>)["inputs"] as Record<string, EngineJson>;
      assert.equal(ins["image"], "staged.png");
      assert.equal(ins["second"], "staged.png", "the seen map dedupes data URLs too");
      assert.equal(cfg.seen.uploads, 1);
      assert.equal(Object.keys(uploaded).length, 1);
      assert.ok(
        (cfg.uploadBodies ?? []).some((b) => b.includes(bytes)),
        "the staged bytes ride the wire byte-identical (no re-encode)",
      );
      // a non-image mime, an empty payload, and a non-base64 shape
      // are not stageable maps — they ride through untouched for the
      // engine's loud refusal, never a silent empty stage.
      for (const nid of ["2", "3", "4"]) {
        const peer = (graph[nid] as Record<string, EngineJson>)["inputs"] as Record<string, EngineJson>;
        assert.ok(typeof peer["image"] === "string" && (peer["image"] as string).startsWith("data:"));
      }
    } finally { await s.close(); }
  });
});

// ── interrupt / stop / unload ──────────────────────────────────

describe("interrupt + stopForRunDir + unloadModels", () => {
  it("interrupts best-effort (happy posts; dead servers swallow)", async () => {
    const cfg = stub();
    const s = await startStub(cfg);
    try {
      await interrupt(s.url, "p1");
      assert.equal(cfg.seen.queue, 1);
      assert.equal(cfg.seen.interrupt, 1);
    } finally { await s.close(); }
    await interrupt("http://127.0.0.1:1", "p1");
  });
  it("unknown run dirs are a silent no-op", async () => {
    const cfg = stub();
    const s = await startStub(cfg);
    try {
      await stopForRunDir(join(tmpRoot(), "ghost"));
      assert.equal(cfg.seen.queue, 0);
    } finally { await s.close(); }
  });
  it("unloads loud on non-2xx, silent on 2xx, env-resolved without override", async () => {
    const cfg = stub();
    const s = await startStub(cfg);
    try {
      await unloadModels(s.url);
      assert.equal(cfg.seen.frees, 1);
    } finally { await s.close(); }
    const bad = stub({ freeStatus: 500 });
    const bs = await startStub(bad);
    try {
      await assert.rejects(unloadModels(bs.url), /\/free status 500/);
    } finally { await bs.close(); }
    const env = stub();
    const es = await startStub(env);
    try {
      process.env["COMFYUI_URL"] = es.url;
      await unloadModels();
      assert.equal(env.seen.frees, 1);
    } finally { await es.close(); }
  });
});

// ── fetchOutputs ───────────────────────────────────────────────

describe("fetchOutputs (the harvest matrix)", () => {
  const matrixEntry = (): Record<string, EngineJson> => ({
    "1": {
      images: [
        { filename: "a.png", subfolder: "", type: "output" },
        { filename: "s/b.png", subfolder: "s", type: "output" },
        { filename: "bare.png" },
        { foo: 1 },
        { filename: "m.missing", subfolder: "", type: "output" },
      ],
      gifs: { not: "a-list" },
      audio: [{ filename: "a.wav", subfolder: "", type: "output" }],
      video: [["v.mp4", "s", "output"], ["nosub.png"]],
      "3d": [],
      three_model: [{ filename: "m.glb", subfolder: "", type: "output" }],
      result: ["r.png", "rs", "output"],
      files: [["f.bin", "", ""], ["", "x", "y"], [42], "junk", ["s.txt", "", "output"], ["a.json", "", "output"], ["n.num", "", "output"]],
    },
    "2": "not-an-object",
  });
  it("harvests every row shape; skips every misshape", async () => {
    const cfg = stub({
      view: (name: string) => {
        if (name.endsWith(".missing")) return { status: 404, body: { error: "no" } };
        if (name.endsWith(".txt")) return { status: 200, body: '"quoted-text"' };
        if (name.endsWith(".json")) return { status: 200, body: { echoed: true } };
        if (name.endsWith(".num")) return { status: 200, body: 42 };
        return { status: 200, body: Buffer.from("BYTES:" + name) };
      },
    });
    const s = await startStub(cfg);
    try {
      const runDir = tmpRoot();
      const arts = await fetchOutputs(s.url, runDir, { outputs: matrixEntry() });
      const names = arts.map((a) => a.slice(runDir.length + 1)).sort();
      assert.ok(names.includes("a.png"), "dict row");
      assert.ok(names.includes("1_b.png"), "subfolder prefixes the node");
      assert.ok(names.includes("a.wav"), "audio kind");
      assert.ok(names.includes("1_v.mp4"), "tuple row");
      assert.ok(names.includes("m.glb"), "three_model kind");
      assert.ok(names.includes("1_r.png"), "the flat tuple-row result arm");
      assert.ok(names.includes("f.bin"), "empty type falls back to output");
      assert.ok(names.includes("s.txt"), "string bodies write raw");
      assert.ok(names.includes("a.json"), "JSON artifacts re-serialize");
      assert.ok(names.includes("bare.png"), "dict rows default subfolder/type");
      assert.ok(names.includes("nosub.png"), "subless tuple rows land flat");
      assert.ok(!names.some((n) => n.includes("missing")), "non-200 views skip");
      assert.ok(!names.some((n) => n.includes("num")), "non-blob JSON scalars skip");
      assert.equal(readFileSync(join(runDir, "a.png"), "utf8"), "BYTES:a.png");
      assert.equal(readFileSync(join(runDir, "s.txt"), "utf8"), "quoted-text");
      assert.deepEqual(JSON.parse(readFileSync(join(runDir, "a.json"), "utf8")), { echoed: true });
    } finally { await s.close(); }
  });
  it("non-object outputs serve []", async () => {
    const cfg = stub();
    const s = await startStub(cfg);
    try {
      assert.deepEqual(await fetchOutputs(s.url, tmpRoot(), { outputs: "x" }), []);
    } finally { await s.close(); }
  });
});

// ── executeSingle ──────────────────────────────────────────────

describe("executeSingle (the per-stage run)", () => {
  it("submits, polls, harvests, publishes (timeout_s 0 rides the 2400 fallback)", async () => {
    const cfg = stub({ history: [pendingEntry(), doneEntry({ "1": { images: [{ filename: "a.png", subfolder: "", type: "output" }] } })] });
    const s = await startStub(cfg);
    try {
      const runDir = tmpRoot();
      const out = await executeSingle(runDir, wfParams({ timeout_s: 0 }), { image: "image", text: "text" }, {}, s.url);
      assert.ok(out.promptId.length > 0);
      assert.equal(out.outputs["prompt_id"], out.promptId);
      assert.equal(out.outputs["image"], join(runDir, "a.png"));
      assert.equal(out.outputs["text"], undefined);
      assert.equal(out.artifacts.length, 1);
      assert.equal(activeCount(), 0, "the finally always deregisters");
      const sent = JSON.parse(cfg.seen.prompts[0] as string) as Record<string, unknown>;
      assert.ok(typeof sent["prompt_id"] === "string" && typeof sent["client_id"] === "string");
    } finally { await s.close(); }
  });
  it("the node_errors matrix (absent/null/empty ride; shapes refuse)", async () => {
    for (const body of [undefined, null, [], {}]) {
      const cfg = stub({ history: [doneEntry()] });
      const srv = await startStub(cfg);
      try {
        if (body !== undefined) cfg.promptBody = { prompt_id: "s", number: 1, node_errors: body };
        await executeSingle(tmpRoot(), wfParams(), {}, {}, srv.url);
      } finally { await srv.close(); }
    }
    for (const [body, want] of [
      [{ a: { e: 1 } }, /refused the graph: /],
      [["e"], /refused the graph: /],
      ["oops", /refused the graph: /],
    ] as const) {
      const cfg = stub({ promptBody: { prompt_id: "s", number: 1, node_errors: body } });
      const srv = await startStub(cfg);
      try {
        await assert.rejects(executeSingle(tmpRoot(), wfParams(), {}, {}, srv.url), want);
      } finally { await srv.close(); }
    }
  });
  it("200 Buffer/empty prompt bodies carry no node_errors", async () => {
    for (const body of [Buffer.from("raw"), ""] as const) {
      const cfg = stub({ history: [doneEntry()], promptBody: body });
      const srv = await startStub(cfg);
      try {
        const out = await executeSingle(tmpRoot(), wfParams(), {}, {}, srv.url);
        assert.ok(out.promptId.length > 0);
      } finally { await srv.close(); }
    }
  });
  it("non-200 submits refuse with the py-shaped text", async () => {
    const cfg = stub({ promptStatus: 500, promptBody: { error: "down" } });
    const s = await startStub(cfg);
    try {
      await assert.rejects(executeSingle(tmpRoot(), wfParams(), {}, {}, s.url), /POST \/prompt 500: \{'error': 'down'\}/);
    } finally { await s.close(); }
  });
  it("deadlines interrupt + voice the budget (entry-absent, null, and pending halves)", async () => {
    const absent = stub({ history: [undefined] });
    const a = await startStub(absent);
    try {
      await assert.rejects(
        executeSingle(tmpRoot(), wfParams({ timeout_s: 1 }), {}, {}, a.url),
        /ComfyUI run exceeded 1s \(interrupt delivered\)/,
      );
      assert.equal(absent.seen.interrupt, 1, "the deadline interrupts");
    } finally { await a.close(); }
    const nul = stub({ history: [null] });
    const n = await startStub(nul);
    try {
      await assert.rejects(
        executeSingle(tmpRoot(), wfParams({ timeout_s: 1 }), {}, {}, n.url),
        /ComfyUI run exceeded 1s/,
      );
    } finally { await n.close(); }
    const pend = stub({ history: [pendingEntry()] });
    const p = await startStub(pend);
    try {
      await assert.rejects(
        executeSingle(tmpRoot(), wfParams({ timeout_s: 1 }), {}, {}, p.url),
        /ComfyUI run exceeded 1s/,
      );
    } finally { await p.close(); }
  });
  it("unshaped history bodies read as entry-absent", async () => {
    for (const raw of [Buffer.from("nope"), 42] as const) {
      const cfg = stub({ historyRaw: { status: 200, body: raw } });
      const srv = await startStub(cfg);
      try {
        let polls = 0;
        await assert.rejects(
          executeSingle(tmpRoot(), wfParams(), {}, { shouldStop: () => ++polls >= 2 }, srv.url),
          /stopped \(interrupt delivered\)/,
          "the first poll reads the unshaped body past the shape gate; the second stops",
        );
      } finally { await srv.close(); }
    }
  });
  it("failures voice the detail; the stop flag interrupts", async () => {
    const fail = stub({
      history: [pendingEntry(), {
        status: { status_str: "error", completed: false, messages: [["execution_error", { exception_message: "kaboom" }]] },
        outputs: {},
      }],
    });
    const f = await startStub(fail);
    try {
      await assert.rejects(executeSingle(tmpRoot(), wfParams(), {}, {}, f.url), /ComfyUI run failed: .*kaboom/);
    } finally { await f.close(); }
    const stop = stub({ history: [pendingEntry(), pendingEntry(), doneEntry()] });
    const t = await startStub(stop);
    try {
      let polls = 0;
      await assert.rejects(
        executeSingle(tmpRoot(), wfParams(), {}, { shouldStop: () => ++polls >= 2 }, t.url),
        /stopped \(interrupt delivered\)/,
      );
      assert.equal(stop.seen.interrupt, 1);
    } finally { await t.close(); }
  });
  it("an empty override resolves the server from the env seam", async () => {
    const cfg = stub({ history: [doneEntry()] });
    const srv = await startStub(cfg);
    try {
      process.env["COMFYUI_URL"] = srv.url;
      const out = await executeSingle(tmpRoot(), wfParams(), {}, {}, "");
      assert.ok(out.promptId.length > 0);
      const flow = await executeFlow(
        [{ stageId: "a", workflow: { "1": { class_type: "K", inputs: {} } }, outputs: {}, outputNodes: {}, params: {} }],
        tmpRoot(), {}, {},
      );
      assert.deepEqual(Object.keys(flow.stages), ["a"]);
    } finally { await srv.close(); }
  });
  it("a live stop interrupts but the run still lands", async () => {
    const cfg = stub({ history: [pendingEntry(), pendingEntry(), pendingEntry(), pendingEntry(), doneEntry()] });
    const s = await startStub(cfg);
    try {
      const runDir = tmpRoot();
      const p = executeSingle(runDir, wfParams(), {}, {}, s.url);
      while (activeCount() === 0) await sleep(50);
      await stopForRunDir(runDir);
      const out = await p;
      assert.ok(out.promptId.length > 0, "interrupt ≠ cancel — the terminal entry still resolves");
      assert.ok(cfg.seen.interrupt >= 1);
      assert.equal(activeCount(), 0);
    } finally { await s.close(); }
  }, 30000);
});

// ── planMerge ──────────────────────────────────────────────────

describe("planMerge (the merge planner)", () => {
  const row = (over: Partial<MergeRow> = {}): MergeRow => ({
    stageId: "a",
    workflow: { "1": { class_type: "KSampler", inputs: { seed: 1 } } },
    outputs: {},
    outputNodes: {},
    params: {},
    ...over,
  });
  it("empty/missing workflows refuse", () => {
    assert.throws(() => planMerge([row({ workflow: {} })], {}, {}), /no workflow to merge/);
    assert.throws(() => planMerge([row({ workflow: "x" as never })], {}, {}), /no workflow to merge/);
  });
  it("producer inference (declared, single-Save, silent multi-Save, silent none)", () => {
    const wf = { "1": { class_type: "SaveImage", inputs: {} } };
    const one = planMerge([row({ workflow: wf, outputs: { image: "image" } })], {}, {});
    assert.ok("a::1" in one.workflow);
    const oneSilent = row({ workflow: wf });
    delete (oneSilent as unknown as Record<string, unknown>)["outputs"];
    const silent = planMerge([oneSilent], {}, {});
    assert.ok("a::1" in silent.workflow, "a lone Save with no outputs infers no channels");
    assert.throws(
      () => planMerge([row({ outputNodes: { image: "ghost" }, workflow: wf })], {}, {}),
      /carries no such node/,
    );
    assert.throws(
      () => planMerge([row({
        workflow: { "1": { class_type: "SaveImage", inputs: {} }, "2": { class_type: "SaveVideo", inputs: {} } },
        outputs: { image: "image" },
      })], {}, {}),
      /ambiguous producers \['1', '2'\]/,
    );
    const bareRow = row({
      workflow: {
        "1": { class_type: "SaveImage", inputs: {} },
        "2": { class_type: "SaveVideo", inputs: {} },
        "3": { inputs: {} },
      },
    });
    delete (bareRow as unknown as Record<string, unknown>)["outputs"];
    delete (bareRow as unknown as Record<string, unknown>)["outputNodes"];
    const quiet = planMerge([bareRow], {}, {});
    assert.ok("a::1" in quiet.workflow && "a::2" in quiet.workflow && "a::3" in quiet.workflow);
    const bareRow2 = row({ workflow: { "1": { class_type: "KSampler", inputs: {} } } });
    delete (bareRow2 as unknown as Record<string, unknown>)["outputs"];
    delete (bareRow2 as unknown as Record<string, unknown>)["outputNodes"];
    const nosave = planMerge([bareRow2], {}, {});
    assert.ok("a::1" in nosave.workflow);
  });
  it("wires rewrite inside the stage; the dangling gate refuses externals", () => {
    const out = planMerge([row({
      workflow: {
        "1": { class_type: "Loader", inputs: {} },
        "2": { class_type: "KSampler", inputs: { model: ["1", 0], pair: ["x", "y"], seed: 3 } },
      },
    })], {}, {});
    const two = (out.workflow["a::2"] as Record<string, EngineJson>)["inputs"] as Record<string, EngineJson>;
    assert.deepEqual(two["model"], ["a::1", 0]);
    assert.deepEqual(two["pair"], ["x", "y"], "non-wire arrays recurse, never rewrite");
    assert.equal(two["seed"], 3);
    assert.throws(
      () => planMerge([row({
        workflow: { "1": { class_type: "K", inputs: { ext: ["999", 0] } } },
      })], {}, {}),
      /wire \["999",0\] targets no node/,
    );
  });
  it("the two-stage happy path (links, initials, __initial__ skip)", () => {
    const rows: MergeRow[] = [
      row({
        stageId: "a",
        workflow: {
          "10": { class_type: "CheckpointLoader", inputs: {} },
          "11": { class_type: "SaveImage", inputs: { images: ["10", 0] } },
          "12": { class_type: "CLIPTextEncode", inputs: { text: "$title" } },
        },
        outputs: { image: "image" },
        outputNodes: { image: "10" },
      }),
      row({
        stageId: "b",
        workflow: { "20": { class_type: "KSampler", inputs: { image: "$pic", seed: "$seed" } } },
        outputs: { image: "image" },
      }),
    ];
    const out = planMerge(rows, { title: "hi", seed: 7 }, { a: { seed: "__initial__.seed" }, b: { pic: "a.image" } });
    const twenty = (out.workflow["b::20"] as Record<string, EngineJson>)["inputs"] as Record<string, EngineJson>;
    assert.deepEqual(twenty["image"], ["a::10", 0], "the FromStage link lands namespaced");
    assert.equal(twenty["seed"], 7, "request initials substitute");
    const twelve = (out.workflow["a::12"] as Record<string, EngineJson>)["inputs"] as Record<string, EngineJson>;
    assert.equal(twelve["text"], "hi");
  });
  it("every link miss refuses named", () => {
    const base = row({
      stageId: "b",
      workflow: { "20": { class_type: "KSampler", inputs: { image: "$pic" } } },
      outputs: { image: "image" },
    });
    assert.throws(
      () => planMerge([row({ stageId: "a", workflow: { "1": { class_type: "K", inputs: {} } } }), { ...base, stageId: "b" }], {}, { b: { pic: "ghost.y" } }),
      /declares no mergeable producer/,
    );
    assert.throws(
      () => planMerge([row({ stageId: "a", workflow: { "1": { class_type: "K", inputs: {} } }, outputs: { image: "image" }, outputNodes: { image: "1" } })], {}, { a: { pic: "a.nope" } }),
      /produces no such channel/,
    );
    assert.throws(
      () => planMerge([row({ stageId: "a", workflow: { "1": { class_type: "K", inputs: {} } }, outputs: { image: "image" }, outputNodes: { image: "1" } })], {}, { a: { pic: "a" } }),
      /produces no such channel/,
    );
    assert.throws(
      () => planMerge([row()], {}, { a: { pic: "a.image" } }),
      /upstream stage 'a' produces no such channel/,
      "a self-wire without outputs is a channel miss (the row always registers)",
    );
  });
  it("duplicate namespaced nodes refuse", () => {
    assert.throws(
      () => planMerge([row(), row()], {}, {}),
      /duplicate namespaced node 'a::1'/,
    );
  });
  it("the file-slot gate + the dangling gate", () => {
    assert.throws(
      () => planMerge([row({
        stageId: "a",
        workflow: {
          "1": { class_type: "SaveImage", inputs: {} },
          "2": { class_type: "LoadImage", inputs: { seed: 1, image: "$pic" } },
        },
        outputs: { image: "image" },
        outputNodes: { image: "1" },
      })], {}, { a: { pic: "a.image" } }),
      /cannot land in a file slot/,
    );
    assert.throws(
      () => planMerge([row({ workflow: { "1": { class_type: "K", inputs: { x: ["ghost", 0] } } } })], {}, {}),
      /wire \["ghost",0\] targets no node/,
    );
    assert.throws(
      () => planMerge([row({ workflow: { "1": { class_type: "K", inputs: { x: "$pic" } } } })], {}, {}),
      /neither a FromStage-wired input name nor a request initial/,
    );
  });
  it("Load nodes with unshaped inputs ride the generic arm", () => {
    const out = planMerge([row({ workflow: { "1": { class_type: "LoadImage", inputs: "x" } } })], {}, {});
    assert.ok("a::1" in out.workflow);
  });
});

// ── executeFlow ────────────────────────────────────────────────

describe("executeFlow (the merged run)", () => {
  const rows = (): MergeRow[] => [
    {
      stageId: "a",
      workflow: {
        "10": { class_type: "CheckpointLoader", inputs: {} },
        "11": { class_type: "SaveImage", inputs: { images: ["10", 0] } },
      },
      outputs: { image: "image" },
      outputNodes: { image: "10" },
      params: { timeout_s: Number.POSITIVE_INFINITY },
    },
    {
      stageId: "b",
      workflow: { "20": { class_type: "KSampler", inputs: { image: "$pic", seed: 0 } } },
      outputs: { image: "image" },
      outputNodes: {},
      params: { timeout_s: "abc" },
    },
  ];
  const inputNames = { b: { pic: "a.image" } };
  it("plans once, harvests per stage into subdirs", async () => {
    const cfg = stub({
      history: [pendingEntry(), doneEntry({
        "a::11": { images: [{ filename: "a.png", subfolder: "", type: "output" }] },
        "b::20": { images: [{ filename: "b.png", subfolder: "", type: "output" }] },
      })],
    });
    const s = await startStub(cfg);
    try {
      const runDir = tmpRoot();
      const out = await executeFlow(rows(), runDir, inputNames, {}, { shouldStop: () => false }, s.url);
      assert.ok(out.promptId.length > 0);
      assert.equal(out.stages["a"]!.outputs["image"], join(runDir, "a", "a.png"));
      assert.equal(out.stages["b"]!.outputs["image"], join(runDir, "b", "b.png"));
      assert.equal(out.stages["a"]!.artifacts.length, 1);
      assert.equal(cfg.seen.prompts.length, 1, "the merged path submits ONCE");
      assert.equal(activeCount(), 0);
    } finally { await s.close(); }
  });
  it("outputless entries harvest [] per stage; merged refusals voice merged", async () => {
    const cfg = stub({ history: [{ status: { status_str: "success", completed: true, messages: [] } }] });
    const s = await startStub(cfg);
    try {
      const out = await executeFlow(rows(), tmpRoot(), inputNames, {}, {}, s.url);
      assert.deepEqual(out.stages["a"]!.artifacts, []);
    } finally { await s.close(); }
    const bad = stub({ promptBody: { prompt_id: "s", number: 1, node_errors: { "1": "bad" } } });
    const bs = await startStub(bad);
    try {
      await assert.rejects(executeFlow(rows(), tmpRoot(), inputNames, {}, {}, bs.url), /refused the merged graph: /);
    } finally { await bs.close(); }
  });
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
    } finally { await bs.close(); }
    const { svc: dark } = await boot({ url: "http://127.0.0.1:1" });
    await assert.rejects(dark.executeSingle(tmpRoot(), wfParams(), {}, {}), /ECONNREFUSED|EADDR/);
    (dark as unknown as { resetForTests: () => void }).resetForTests();
  }, 60000);
});

// ── the progress tap (the _ws_tap port, 2026-09-13 — the
//    operator's "forward the comfyui progress webhooks like
//    before") ───────────────────────────────────────────────────

describe("openProgressTap + drainRelevant (the tap fold)", () => {
  it("queues JSON events for its client and folds only relevant frames", async () => {
    const s = await startWsStub([
      // OUR prompt: progress folds with the sampling activity
      '{"type":"progress","data":{"value":3,"max":20,"node":"11","prompt_id":"p1"}}',
      // ANOTHER run's prompt: skipped (queue concurrency)
      '{"type":"progress","data":{"value":9,"max":99,"prompt_id":"other"}}',
      // node flip: activity only
      '{"type":"executing","data":{"node":"20","prompt_id":"p1"}}',
      // the executor's failure: recorded, NEVER thrown
      '{"type":"execution_error","data":{"node_id":"20","prompt_id":"p1"}}',
      // non-dict / non-typed / non-JSON frames: skipped silently
      '[1,2]',
      '{"no_type":true}',
      'not json',
      // prompt-less frames pass (py parity: None matches)
      '{"type":"progress","data":{"value":1,"max":2}}',
    ]);
    try {
      const tap = openProgressTap(s.url, "melite-tap-1");
      await sleep(400); // frames land at ~60ms
      const events = tap.drain();
      tap.close();
      assert.equal(events.filter((e) => e.type === "progress").length, 3, "3 progress frames queued (other-run + junk included)");
      const seen: Record<string, EngineJson>[] = [];
      const err = drainRelevant(events, "p1", (u) => { seen.push(u); });
      // the fold: our progress + node activity + the prompt-less frame
      assert.deepEqual(seen[0], {
        progress: { value: 3, max: 20, node: "11" },
        activity: "sampling 3/20",
      });
      assert.deepEqual(seen[1], { activity: "node 20" });
      assert.deepEqual(seen[2], {
        progress: { value: 1, max: 2, node: "" },
        activity: "sampling 1/2",
      });
      assert.match(String(err), /execution_error/, "the executor's failure is recorded");
    } finally { await s.close(); }
  });
  it("a refused socket yields no events and never throws (progress is additive)", async () => {
    const tap = openProgressTap("http://127.0.0.1:1", "melite-dead");
    await sleep(50);
    assert.deepEqual(tap.drain(), []);
    tap.close(); // idempotent
    tap.close();
  });
});

describe("executeFlow forwards the tap's frames to report", () => {
  const rows = (): MergeRow[] => [
    {
      stageId: "a",
      workflow: { "10": { class_type: "CheckpointLoader", inputs: {} } },
      outputs: {},
      outputNodes: {},
      params: { timeout_s: 30 },
    },
  ];
  it("the live fold rides report while /history stays terminal", async () => {
    const cfg = stub({
      history: [pendingEntry(), doneEntry()],
      // the upgrade arm: frames without prompt_id pass the fold's
      // filter (py parity — None matches every prompt)
      wsFrames: [
        '{"type":"progress","data":{"value":1,"max":4,"node":"10"}}',
        '{"type":"progress","data":{"value":4,"max":4,"node":"10"}}',
      ],
    });
    const s = await startStub(cfg);
    try {
      const updates: Record<string, EngineJson>[] = [];
      const out = await executeFlow(rows(), tmpRoot(), {}, {}, {
        report: (u) => { updates.push(u); },
      }, s.url);
      assert.ok(out.promptId.length > 0);
      const progress = updates.filter((u) => u["progress"] !== undefined);
      assert.equal(progress.length, 2, "both tap frames reached the fold");
      assert.deepEqual(progress[0], {
        progress: { value: 1, max: 4, node: "10" },
        activity: "sampling 1/4",
      });
      assert.deepEqual(progress[1], {
        progress: { value: 4, max: 4, node: "10" },
        activity: "sampling 4/4",
      });
    } finally { await s.close(); }
  });
  it("no report consumer = no socket (the tap opens only for a fold)", async () => {
    const cfg = stub({ history: [doneEntry()], trackUpgrades: true });
    const s = await startStub(cfg);
    try {
      const out = await executeFlow(rows(), tmpRoot(), {}, {}, {}, s.url);
      assert.ok(out.promptId.length > 0);
      assert.equal(cfg.seen.upgrades, 0, "no report fold — the tap never connected");
    } finally { await s.close(); }
  });
});
