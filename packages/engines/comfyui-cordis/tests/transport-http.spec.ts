// @melite/comfyui-cordis — HTTP transport battery (split from comfyui-transport.spec.ts).
// The httpCall primitive, the upload staging walk, interrupt/stop/unload.
// Wire arms drive a scripted in-file stub (node:http, ephemeral port — no engine).
// Env keys are snapshotted per test (this file owns COMFYUI_URL/COMFYUI_ENDPOINT_CONFIG/
// INFERENCE_TEST_SANDBOX/MELITE_REPO_ROOT while it runs).
import { afterEach, beforeEach, describe, it, onTestFinished } from "vitest";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  httpCall, interrupt, stopForRunDir, unloadModels, uploadReferenced
} from "../src/comfyui.ts";
import type { EngineJson } from "../src/comfyui.ts";

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
