// @melite/comfyui-cordis — execution transport battery (split from comfyui-transport.spec.ts).
// executeSingle + planMerge + the merged executeFlow run. Scripted stub, no engine.
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
import {
  activeCount, executeFlow, executeSingle, interrupt, mapHistoryEntry,
  planMerge, stopForRunDir
} from "../src/comfyui.ts";
import type { EngineJson, MergeRow } from "../src/comfyui.ts";

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
  it("a report consumer opens the tap while /history stays terminal (the per-stage fold)", async () => {
    const cfg = stub({
      history: [pendingEntry(), doneEntry()],
      wsFrames: ['{"type":"progress","data":{"value":1,"max":4,"node":"1"}}'],
    });
    const s = await startStub(cfg);
    try {
      const updates: Record<string, EngineJson>[] = [];
      const out = await executeSingle(tmpRoot(), wfParams(), {}, {
        report: (u) => { updates.push(u); },
      }, s.url);
      assert.ok(out.promptId.length > 0);
      const progress = updates.filter((u) => u["progress"] !== undefined);
      assert.equal(progress.length, 1, "the tap frame reached the fold");
      assert.deepEqual(progress[0], {
        progress: { value: 1, max: 4, node: "1" },
        activity: "sampling 1/4",
      });
      assert.equal(activeCount(), 0, "the finally always deregisters");
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
  it("200 Buffer/empty/scalar prompt bodies refuse LOUD (no acceptance = no poll)", async () => {
    // stroke 82: proceeding with the random promptId polled a
    // never-queued prompt to the deadline. The audit's verdict:
    // refuse at the door.
    for (const body of [Buffer.from("raw"), "", 42] as const) {
      const cfg = stub({ history: [doneEntry()], promptBody: body });
      const srv = await startStub(cfg);
      try {
        await assert.rejects(
          executeSingle(tmpRoot(), wfParams(), {}, {}, srv.url),
          /no prompt acceptance/,
        );
        assert.equal(cfg.calls?.size ?? 0, 0, "the never-queued prompt is never polled");
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
  it("a throwing report interrupts the prompt before rethrowing (stroke-82 fix d)", async () => {
    const cfg = stub({
      history: [pendingEntry(), doneEntry()],
      wsFrames: ['{"type":"progress","data":{"value":1,"max":4,"node":"1"}}'],
    });
    const s = await startStub(cfg);
    try {
      await assert.rejects(
        executeSingle(tmpRoot(), wfParams(), {}, { report: () => { throw new Error("report boom"); } }, s.url),
        /report boom/,
      );
      assert.equal(cfg.seen.interrupt, 1, "the throwing consumer interrupts the live prompt");
      assert.equal(activeCount(), 0);
    } finally { await s.close(); }
  });
  it("non-200 history fails fast with the wire's voice (stroke-82 fix c)", async () => {
    const cfg = stub({ historyRaw: { status: 500, body: '{"error":"boom"}' } });
    const s = await startStub(cfg);
    try {
      await assert.rejects(
        executeSingle(tmpRoot(), wfParams({ timeout_s: 2 }), {}, {}, s.url),
        /GET \/history\/.* 500/,
      );
    } finally { await s.close(); }
  });
  it("mid-poll transport death rejects before the deadline (no hang)", async () => {
    const cfg = stub({ history: [pendingEntry()] });
    const s = await startStub(cfg);
    const started = Date.now();
    const p = executeSingle(tmpRoot(), wfParams({ timeout_s: 10 }), {}, {}, s.url);
    await sleep(600);
    await s.close();
    await assert.rejects(p, (e: unknown) => {
      assert.ok(e instanceof Error);
      assert.ok(!/exceeded 10s/.test((e as Error).message), "the deadline must not be the exit");
      return true;
    });
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 8000, "rejects fast, not at the 10s deadline (took " + elapsed + "ms)");
    assert.equal(activeCount(), 0);
  });
  it("timeout_s garbage rides the 2400 fallback (stroke-82 normalization)", async () => {
    // The single path's old `Number(...) || 2400` kept truthy
    // Infinity/negatives; the shared normalizeTimeoutS (finite &&
    // > 0 ? value : 2400) retires that. Each garbage value must
    // complete a fast run — never an instant "exceeded -5s".
    for (const bad of [0, Number.NaN, Number.POSITIVE_INFINITY, -5, "abc"]) {
      const cfg = stub({ history: [pendingEntry(), doneEntry()] });
      const srv = await startStub(cfg);
      try {
        const out = await executeSingle(tmpRoot(), wfParams({ timeout_s: bad as never }), {}, {}, srv.url);
        assert.ok(out.promptId.length > 0, "timeout_s " + String(bad) + " completes (no instant exceeded)");
        assert.equal(activeCount(), 0);
      } finally { await srv.close(); }
    }
    const fast = stub({ history: [doneEntry()] });
    const fs = await startStub(fast);
    try {
      const out = await executeSingle(tmpRoot(), wfParams({ timeout_s: 5 }), {}, {}, fs.url);
      assert.ok(out.promptId.length > 0, "a short deadline still completes a fast run");
    } finally { await fs.close(); }
  });
  it("pins CURRENT: {status:{status:'success'}} without completed reads as pending (deliberate)", async () => {
    // DELIBERATE: only success+completed is terminal — a success
    // status without the completed flag is still pending (the
    // mapHistoryEntry law: completed !== true → pending). Do not
    // "fix" this to treat status:'success' alone as terminal.
    const cfg = stub({ history: [{ status: { status: "success" } } as unknown as Record<string, unknown>] });
    const s = await startStub(cfg);
    try {
      await assert.rejects(
        executeSingle(tmpRoot(), wfParams({ timeout_s: 1 }), {}, {}, s.url),
        /ComfyUI run exceeded 1s/,
      );
    } finally { await s.close(); }
  });
  it("pins CURRENT: per-entry unshaped history reads as pending (deliberate)", async () => {
    // DELIBERATE: a per-entry scalar ("weird") is not a shaped
    // entry — the poll reads it as entry-absent/pending, never a
    // crash (the shape gate's law).
    const cfg = stub({ history: ["weird" as unknown as Record<string, unknown>] });
    const s = await startStub(cfg);
    try {
      await assert.rejects(
        executeSingle(tmpRoot(), wfParams({ timeout_s: 1 }), {}, {}, s.url),
        /ComfyUI run exceeded 1s/,
      );
    } finally { await s.close(); }
  });
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
