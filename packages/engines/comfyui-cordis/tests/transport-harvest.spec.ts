// @melite/comfyui-cordis — harvest transport battery (split from comfyui-transport.spec.ts).
// fetchOutputs + the threaded /view budget. Scripted in-file stub, no engine.
import { describe, it, onTestFinished } from "vitest";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  executeFlow, executeSingle, fetchOutputs, viewTimeoutMs
} from "../src/comfyui.ts";
import type { EngineJson } from "../src/comfyui.ts";

/** Mint a tree owned by the CURRENT test (disposed with it). */
function mintRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "comfyui-t-"));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

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
  it("pins CURRENT: same flat filename last-wins, artifacts carry the name twice (deliberate)", async () => {
    // DELIBERATE last-wins: two nodes emitting the same flat
    // filename land on the same path — the second overwrites the
    // first, and the artifacts list carries the path twice
    // (documented, never a dedupe).
    const cfg = stub();
    const s = await startStub(cfg);
    try {
      const runDir = tmpRoot();
      const arts = await fetchOutputs(s.url, runDir, {
        outputs: {
          "1": { images: [{ filename: "a.png", subfolder: "", type: "output" }] },
          "2": { images: [{ filename: "a.png", subfolder: "", type: "output" }] },
        },
      });
      assert.equal(arts.length, 2);
      assert.equal(arts[0], join(runDir, "a.png"));
      assert.equal(arts[1], join(runDir, "a.png"));
      assert.equal(readFileSync(join(runDir, "a.png"), "utf8"), "BYTES:a.png");
    } finally { await s.close(); }
  });
});

// ── the /view budget (stroke 83: the harvest follows the run) ──

describe("viewTimeoutMs + the threaded /view budget", () => {
  it("pins the formula: the 180s py-parity floor holds, larger budgets follow", () => {
    // A >180s /view delay would wall the follow arm end-to-end —
    // too slow. The formula pins it here (exported seam); the slow
    // /view below pins the floor threading end-to-end.
    assert.equal(viewTimeoutMs(undefined), 2400000, "absent rides the 2400 default into the budget arm");
    assert.equal(viewTimeoutMs(0), 2400000, "garbage rides the 2400 fallback");
    assert.equal(viewTimeoutMs(-5), 2400000);
    assert.equal(viewTimeoutMs(Number.NaN), 2400000);
    assert.equal(viewTimeoutMs(Number.POSITIVE_INFINITY), 2400000);
    assert.equal(viewTimeoutMs("abc"), 2400000);
    assert.equal(viewTimeoutMs(5), 180000, "a 5s run keeps the py-parity floor");
    assert.equal(viewTimeoutMs(180), 180000, "the boundary is the floor");
    assert.equal(viewTimeoutMs(181), 181000);
    assert.equal(viewTimeoutMs(300), 300000, "a 300s run harvests on its own budget");
    assert.equal(viewTimeoutMs(2400), 2400000);
  });
  it("a small-budget harvest still serves a slow /view (the floor, not the raw budget)", async () => {
    // timeout_s 2 with a 2.5s /view completes — a naive
    // timeoutS*1000 threading (no Math.max floor) would fuse at 2s.
    const cfg = stub({ delayMs: 2500 });
    const s = await startStub(cfg);
    try {
      const runDir = tmpRoot();
      const arts = await fetchOutputs(s.url, runDir, {
        outputs: { "1": { images: [{ filename: "a.png", subfolder: "", type: "output" }] } },
      }, 2);
      assert.equal(arts.length, 1);
      assert.equal(readFileSync(join(runDir, "a.png"), "utf8"), "BYTES:a.png");
    } finally { await s.close(); }
  });
  it("the single path threads its params timeout into the harvest", async () => {
    // timeout_s 5 with a 1s-per-hop stub (prompt + history + view)
    // lands inside the 5s deadline on the threaded floor budget.
    const cfg = stub({
      delayMs: 1000,
      history: [doneEntry({ "1": { images: [{ filename: "a.png", subfolder: "", type: "output" }] } })],
    });
    const s = await startStub(cfg);
    try {
      const runDir = tmpRoot();
      const out = await executeSingle(runDir, wfParams({ timeout_s: 5 }), { image: "image" }, {}, s.url);
      assert.equal(out.artifacts.length, 1);
      assert.equal(out.outputs["image"], join(runDir, "a.png"));
    } finally { await s.close(); }
  });
  it("the merged path threads each stage's params timeout into its harvest", async () => {
    const cfg = stub({
      delayMs: 1000,
      history: [doneEntry({
        "a::11": { images: [{ filename: "a.png", subfolder: "", type: "output" }] },
      })],
    });
    const s = await startStub(cfg);
    try {
      const out = await executeFlow(
        [{
          stageId: "a",
          workflow: { "11": { class_type: "SaveImage", inputs: {} } },
          outputs: { image: "image" },
          outputNodes: { image: "11" },
          params: { timeout_s: 8 },
        }],
        tmpRoot(), {}, {}, {}, s.url,
      );
      assert.equal(out.stages["a"]!.artifacts.length, 1);
    } finally { await s.close(); }
  });
});
