// @melite/comfyui-cordis — progress-tap transport battery (split from comfyui-transport.spec.ts).
// openProgressTap + drainRelevant + the executeFlow tap fold. Hand-rolled WS fixtures, no engine.
import { describe, it, onTestFinished } from "vitest";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  drainRelevant, executeFlow, openProgressTap
} from "../src/comfyui.ts";
import type { EngineJson, MergeRow } from "../src/comfyui.ts";

/** Mint a tree owned by the CURRENT test (disposed with it). */
function mintRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "comfyui-t-"));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

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
/** Binary server→client frames (the preview-image arm): FIN + binary
 *  opcode 0x82, unmasked — the tap must skip these (text only). */
const wsBinaryFrame = (payload: Buffer): Buffer => {
  if (payload.length < 126) return Buffer.concat([Buffer.from([0x82, payload.length]), payload]);
  const head = Buffer.alloc(4);
  head[0] = 0x82; head[1] = 126; head.writeUInt16BE(payload.length, 2);
  return Buffer.concat([head, payload]);
};
const startWsStub = async (
  frames: string[],
  delayMs = 60,
  binary: Buffer[] = [],
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
      for (const b of binary) socket.write(wsBinaryFrame(b));
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
  it("binary preview frames are skipped (text only, py parity)", async () => {
    const s = await startWsStub(
      ['{"type":"progress","data":{"value":1,"max":2,"prompt_id":"p1"}}'],
      60,
      [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
    );
    try {
      const tap = openProgressTap(s.url, "melite-bin-1");
      await sleep(400); // frames land at ~60ms
      const events = tap.drain();
      tap.close();
      assert.deepEqual(events, [
        { type: "progress", data: { value: 1, max: 2, prompt_id: "p1" } },
      ], "the binary preview never queues — only the text frame rides");
    } finally { await s.close(); }
  });
  it("non-object data queues as the empty map (never the raw scalar)", async () => {
    const s = await startWsStub([
      '{"type":"custom","data":7}',
      '{"type":"custom2","data":null}',
      '{"type":"custom3","data":[1,2]}',
    ]);
    try {
      const tap = openProgressTap(s.url, "melite-raw-1");
      await sleep(400); // frames land at ~60ms
      const events = tap.drain();
      tap.close();
      assert.deepEqual(events, [
        { type: "custom", data: {} },
        { type: "custom2", data: {} },
        { type: "custom3", data: {} },
      ], "scalar, null, and array data all fold to the empty map");
    } finally { await s.close(); }
  });
  it("a max-less progress folds max 0 with the unknown-budget voice", () => {
    const seen: Record<string, EngineJson>[] = [];
    const err = drainRelevant(
      [
        { type: "progress", data: { value: 2, node: "7", prompt_id: "p1" } },
        { type: "progress", data: { value: 3, max: "many", node: "7", prompt_id: "p1" } },
      ],
      "p1",
      (u) => { seen.push(u); },
    );
    assert.deepEqual(seen, [
      { progress: { value: 2, max: 0, node: "7" }, activity: "sampling 2/?" },
      { progress: { value: 3, max: 0, node: "7" }, activity: "sampling 3/?" },
    ], "a missing or unshaped max seeds 0 and voices '?' — never NaN, never a throw");
    assert.equal(err, null);
  });
  it("foreign event types fold to nothing (the tap never voices what it does not know)", () => {
    const seen: Record<string, EngineJson>[] = [];
    const err = drainRelevant(
      [
        { type: "status", data: { prompt_id: "p1", queue_remaining: 2 } },
        { type: "executing", data: { prompt_id: "p1" } },
      ],
      "p1",
      (u) => { seen.push(u); },
    );
    assert.deepEqual(seen, [], "an unknown type and a nodeless executing fold to silence");
    assert.equal(err, null);
  });
  it("a refused socket yields no events and never throws (progress is additive)", async () => {
    const tap = openProgressTap("http://127.0.0.1:1", "melite-dead");
    await sleep(50);
    assert.deepEqual(tap.drain(), []);
    tap.close(); // idempotent
    tap.close();
  });
});

// ── the tap's live-socket walls (stroke 83 — the first
//    single-purpose pins; the mixed-shape battery above already
//    exercises these arms together, these isolate each one) ──────

describe("openProgressTap (live-socket walls)", () => {
  it("queues text events; drain snapshots and clears", async () => {
    const s = await startWsStub([
      '{"type":"progress","data":{"value":1,"max":2,"prompt_id":"p1"}}',
      '{"type":"executing","data":{"node":"5","prompt_id":"p1"}}',
    ]);
    try {
      const tap = openProgressTap(s.url, "melite-snap-1");
      await sleep(400); // frames land at ~60ms
      const first = tap.drain();
      assert.equal(first.length, 2, "both text frames queued");
      assert.deepEqual(tap.drain(), [], "drain clears — the second snapshot is empty");
      tap.close();
      assert.deepEqual(tap.drain(), [], "still empty after close");
    } finally { await s.close(); }
  });
  it("non-JSON text frames are skipped", async () => {
    const s = await startWsStub(["not json {{{", "plain text"]);
    try {
      const tap = openProgressTap(s.url, "melite-nonjson-1");
      await sleep(400);
      assert.deepEqual(tap.drain(), [], "no JSON — nothing queues");
      tap.close();
    } finally { await s.close(); }
  });
  it("a binary-only server queues nothing (text only)", async () => {
    const s = await startWsStub([], 60, [Buffer.from([0x89, 0x50, 0x4e, 0x47])]);
    try {
      const tap = openProgressTap(s.url, "melite-binonly-1");
      await sleep(400);
      assert.deepEqual(tap.drain(), [], "the binary preview never queues");
      tap.close();
    } finally { await s.close(); }
  });
  it("malformed JSON shapes are skipped (array, no-type, scalars, wrong-typed type)", async () => {
    const s = await startWsStub([
      "[1,2]",
      '{"no_type":true}',
      "null",
      "42",
      '"just a string"',
      '{"type":42,"data":{}}',
    ]);
    try {
      const tap = openProgressTap(s.url, "melite-malformed-1");
      await sleep(400);
      assert.deepEqual(tap.drain(), [], "no well-typed object frame — nothing queues");
      tap.close();
    } finally { await s.close(); }
  });
  it("close is idempotent; drain-after-close keeps what was queued", async () => {
    const s = await startWsStub([
      '{"type":"progress","data":{"value":2,"max":4,"prompt_id":"p1"}}',
      '{"type":"executing","data":{"node":"9","prompt_id":"p1"}}',
    ]);
    try {
      const tap = openProgressTap(s.url, "melite-close-1");
      await sleep(400);
      tap.close();
      tap.close();
      tap.close();
      const after = tap.drain();
      assert.equal(after.length, 2, "close never drops what was queued before it");
      assert.deepEqual(after[0], { type: "progress", data: { value: 2, max: 4, prompt_id: "p1" } });
      assert.deepEqual(tap.drain(), [], "drain still clears after close");
    } finally { await s.close(); }
  });
  it("drainRelevant folds progress-with-node and records execution_error (direct)", () => {
    // The mixed-shape battery pins these through the live tap;
    // this pins the fold itself with no socket in the loop.
    const seen: Record<string, EngineJson>[] = [];
    const err = drainRelevant(
      [
        { type: "progress", data: { value: 7, max: 10, node: "3" } },
        { type: "execution_error", data: { node_id: "3", prompt_id: "p1", exception_message: "boom" } },
      ],
      "p1",
      (u) => { seen.push(u); },
    );
    assert.deepEqual(seen, [
      { progress: { value: 7, max: 10, node: "3" }, activity: "sampling 7/10" },
    ], "prompt-less progress passes the filter and voices sampling v/m");
    assert.match(String(err), /execution_error/, "the executor's failure is recorded, never thrown");
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
