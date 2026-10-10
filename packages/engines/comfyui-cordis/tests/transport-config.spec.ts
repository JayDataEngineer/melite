// @melite/comfyui-cordis — host/config transport battery (split from comfyui-transport.spec.ts).
// The host triple, the pin law, the threading gate, and the endpoint SSOT read.
// Env keys are snapshotted per test (this file owns COMFYUI_URL/COMFYUI_ENDPOINT_CONFIG/
// INFERENCE_TEST_SANDBOX/MELITE_REPO_ROOT while it runs).
import { afterEach, beforeEach, describe, it, onTestFinished } from "vitest";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Context } from "@deepseek-ai/cordis";
import {
  ComfyError, ComfyUIHostService, activeCount, comfyuiHostProvider,
  endpointConfigPath, loadEndpointConfig, needComfyUI, packageRoot,
  packageRootFrom, parseComfyUIHostConfig, resolveEngineBaseUrl, resolveRepoRoot
} from "../src/comfyui.ts";
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

const tmpRoot = (): string => mintRoot();

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
  it("a fixture repo root no longer isolates package data — the anchor split (2026-10-18)", () => {
    // Population 2 (estate roots) still follows the env seam; the
    // endpoint default (population 1, package-shipped data) follows
    // the package, so a fixture root WITHOUT the file still finds
    // the real one. Fixture isolation is the sandbox gate's or the
    // env path's job — never the repo anchor's accident.
    process.env["MELITE_REPO_ROOT"] = tmpRoot();
    assert.deepEqual(Object.keys(loadEndpointConfig()).length > 0, true,
      "package-anchored default finds the shipped endpoint under a fixture repo root");
    assert.equal(typeof resolveRepoRoot(), "string");
    delete process.env["MELITE_REPO_ROOT"];
    assert.ok(resolveRepoRoot().endsWith("inference.cpp"), "the default climbs four hops to the repo");
  });
  it("packageRoot anchors the shipped data on the source plane", () => {
    assert.ok(packageRoot().endsWith("comfyui-cordis"), "two hops from src land on the package");
    assert.ok(existsSync(join(packageRoot(), "data", "comfyui_endpoint.json")), "the endpoint default candidate exists");
    assert.ok(existsSync(join(packageRoot(), "data", "model-facts.json")), "the facts file exists");
    assert.equal(endpointConfigPath(), join(packageRoot(), "data", "comfyui_endpoint.json"));
  });
  it("THE CONSUMER RECEIPT: the built lib finds shipped data with no env pin (install shape, artifact plane)", () => {
    // The four-copy consumer's contract: an install with NO
    // MELITE_REPO_ROOT still resolves the shipped endpoint — the
    // sweep stops being load-bearing. Runs the BUILT lib under
    // plain node from a COPY shaped like an install (lib/ + data/ +
    // package.json in a temp root): in the dev checkout both anchor
    // spellings name the same file, so only the install shape makes
    // the receipt bite — the old 4-up default would resolve to the
    // temp root's nonexistent parent and miss.
    const built = join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "src", "comfyui-config.js");
    assert.ok(existsSync(built), "built artifact present (run pnpm run build)");
    const pkgDir = dirname(dirname(dirname(built))); // <pkg>/lib/src → <pkg>
    const install = mkdtempSync(join(tmpdir(), "melite-install-"));
    onTestFinished(() => rmSync(install, { recursive: true, force: true }));
    cpSync(join(pkgDir, "lib"), join(install, "lib"), { recursive: true });
    cpSync(join(pkgDir, "data"), join(install, "data"), { recursive: true });
    cpSync(join(pkgDir, "package.json"), join(install, "package.json"));
    const childEnv: Record<string, string | undefined> = { ...process.env };
    for (const k of ENV_KEYS) delete childEnv[k];
    const out = execFileSync("node", ["-e",
      "import(process.argv[1]).then(m => process.stdout.write(m.endpointConfigPath()))",
      join(install, "lib", "src", "comfyui-config.js")], { encoding: "utf8", env: childEnv });
    assert.equal(out, join(install, "data", "comfyui_endpoint.json"),
      "the installed copy anchored on its own package root");
    assert.ok(existsSync(out), "the installed copy's candidate exists on disk");
  });
  it("packageRootFrom climbs past a foreign package.json and refuses a rootless tree loud", () => {
    // The pure core, driven in-process from shaped start dirs (the
    // live seat is packageRoot — same core, never two truths):
    // (a) an intermediate package.json with a FOREIGN name is
    //     climbed past to the real marker above it;
    // (b) no matching marker anywhere -> the loud refusal, never a
    //     silent wrong root.
    const shapeA = mkdtempSync(join(tmpdir(), "melite-walk-a-"));
    onTestFinished(() => rmSync(shapeA, { recursive: true, force: true }));
    mkdirSync(join(shapeA, "lib", "src"), { recursive: true });
    writeFileSync(join(shapeA, "lib", "package.json"), JSON.stringify({ name: "not-melite" }));
    writeFileSync(join(shapeA, "package.json"), JSON.stringify({ name: "@melite/comfyui-cordis" }));
    assert.equal(packageRootFrom(join(shapeA, "lib", "src")), shapeA,
      "the walk climbs past the foreign name to the real marker");
    const shapeB = mkdtempSync(join(tmpdir(), "melite-walk-b-"));
    onTestFinished(() => rmSync(shapeB, { recursive: true, force: true }));
    assert.throws(() => packageRootFrom(shapeB),
      /no ancestor carries @melite\/comfyui-cordis's package\.json/);
  });
  it("activeCount starts empty; ComfyError names itself", () => {
    assert.equal(activeCount(), 0);
    assert.equal(new ComfyError("x").name, "ComfyError");
  });
});

describe("liveObjectInfo (the closed-body refusal + the cache)", () => {
  it("a non-object /object_info body refuses closed; object bodies cache per server", async () => {
    const { createServer } = await import("node:http");
    const { liveObjectInfo } = await import("../src/comfyui-transport.ts");
    let mode: "array" | "object" = "array";
    let served = 0;
    const srv = createServer((req, res) => {
      served += 1;
      if (String(req.url).includes("object_info")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(mode === "array" ? "[1,2]" : JSON.stringify({ Node: {} }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
    });
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const addr = srv.address();
    const base = "http://127.0.0.1:" + String(typeof addr === "object" && addr !== null ? addr.port : 0);
    onTestFinished(() => new Promise<void>((resolve) => srv.close(() => resolve())));
    try {
      // the refusal: first serve is a JSON array (non-object)
      await assert.rejects(
        () => liveObjectInfo(base),
        (e: unknown) => e instanceof Error && /non-object body/.test(e.message),
      );
      // the object body rides and then CACHES (one serve per server)
      mode = "object";
      served = 0;
      const doc = await liveObjectInfo(base);
      assert.ok(typeof doc === "object" && doc !== null);
      const again = await liveObjectInfo(base);
      assert.equal(again, doc, "the per-server cache returns the identical record");
      assert.equal(served, 1);
    } finally {
      srv.close();
    }
  });

  // THE REFRESH DOOR (2026-10-15): the engine reboots under systemd
  // while the harness process lives, so "a restart means a new
  // process" is false for the long-lived seat — the cached doc must
  // not outlive the node set it describes. invalidateObjectInfo is
  // the explicit drop; the restart and lora doors call it.
  it("invalidateObjectInfo drops the entry — the next read re-fetches the changed doc", async () => {
    const { createServer } = await import("node:http");
    const { invalidateObjectInfo, liveObjectInfo } = await import("../src/comfyui-transport.ts");
    let generation = 1;
    let served = 0;
    const srv = createServer((req, res) => {
      served += 1;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ generation, url: String(req.url) }));
    });
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const addr = srv.address();
    const base = "http://127.0.0.1:" + String(typeof addr === "object" && addr !== null ? addr.port : 0);
    onTestFinished(() => new Promise<void>((resolve) => srv.close(() => resolve())));
    try {
      const first = await liveObjectInfo(base);
      assert.equal(first["generation"], 1);
      const cached = await liveObjectInfo(base);
      assert.equal(cached["generation"], 1);
      assert.equal(served, 1, "cached: one fetch for two reads");
      // the engine reboots: the node set changes under the same url
      generation = 2;
      invalidateObjectInfo(base);
      const fresh = await liveObjectInfo(base);
      assert.equal(fresh["generation"], 2, "the re-fetch sees the post-restart doc");
      assert.equal(served, 2);
    } finally {
      srv.close();
    }
  });

  it("an invalidation during an in-flight fetch discards the pre-drop doc (never re-poisons the cache)", async () => {
    const { createServer } = await import("node:http");
    const { invalidateObjectInfo, liveObjectInfo } = await import("../src/comfyui-transport.ts");
    let generation = 1;
    let served = 0;
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const srv = createServer((req, res) => {
      served += 1;
      if (served === 1) {
        // Freeze the body at REQUEST arrival: the discarded doc must
        // be genuinely stale (generation 1), not a release-time read
        // that already sees the post-drop value.
        const frozen = generation;
        // hold the first response so the invalidation can land mid-fetch
        void firstGate.then(() => {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ generation: frozen }));
        });
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ generation }));
    });
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const addr = srv.address();
    const base = "http://127.0.0.1:" + String(typeof addr === "object" && addr !== null ? addr.port : 0);
    try {
      const pending = liveObjectInfo(base);
      // the engine's node set changes while the first fetch is on the wire
      generation = 2;
      invalidateObjectInfo(base);
      releaseFirst();
      const resolved = await pending;
      assert.equal(resolved["generation"], 2, "the in-flight doc is discarded; the served doc is post-drop");
      assert.equal(served, 2, "exactly one re-fetch");
      const cached = await liveObjectInfo(base);
      assert.equal(cached, resolved, "the post-drop doc is what got cached");
      assert.equal(served, 2, "the poisoned doc never entered the cache");
    } finally {
      srv.close();
    }
  });

  // THE OI FUSE (audit I-E5, 2026-10-22): the read carries the
  // caller's signal and an optional deadline — a hung engine
  // answers loud inside the bound instead of hanging the door;
  // an aborted caller is released at once; the cache caps so a
  // many-server seat is a bounded heap.
  it("a never-answering engine rejects on the deadline (never hangs past it)", async () => {
    const { createServer } = await import("node:http");
    const { liveObjectInfo } = await import("../src/comfyui-transport.ts");
    const srv = createServer(() => { /* never answers — the body is the hang */ });
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const addr = srv.address();
    const base = "http://127.0.0.1:" + String(typeof addr === "object" && addr !== null ? addr.port : 0);
    // the never-answered socket stays open — close it with the
    // server or the finisher hangs on the SDK's in-flight fetch
    onTestFinished(() => new Promise<void>((resolve) => {
      srv.closeAllConnections();
      srv.close(() => resolve());
    }));
    await assert.rejects(
      () => liveObjectInfo(base, undefined, 120),
      (e: unknown) => e instanceof Error && /did not answer within its deadline/.test(e.message),
    );
  });

  it("an aborted caller rejects at once with the caller's reason (never a landing past the abort)", async () => {
    const { createServer } = await import("node:http");
    const { liveObjectInfo } = await import("../src/comfyui-transport.ts");
    let releases: Array<() => void> = [];
    const srv = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
    });
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const addr = srv.address();
    const base = "http://127.0.0.1:" + String(typeof addr === "object" && addr !== null ? addr.port : 0);
    onTestFinished(() => new Promise<void>((resolve) => srv.close(() => resolve())));
    // pre-aborted: rejects before any fetch
    const pre = new AbortController();
    pre.abort();
    await assert.rejects(() => liveObjectInfo(base, pre.signal), /aborted|AbortError/);
    // mid-flight: the abort releases while the SDK fetch runs
    const mid = new AbortController();
    const flight = liveObjectInfo(base, mid.signal);
    assert.ok(releases.length === 0);
    mid.abort(new Error("the door closed"));
    await assert.rejects(() => flight, (e: unknown) => e instanceof Error && /the door closed/.test(e.message));
  });

  it("the oiCache caps at its bound — the least-recently-used server evicts (a bounded heap)", async () => {
    const { createServer } = await import("node:http");
    const { liveObjectInfo, invalidateObjectInfo } = await import("../src/comfyui-transport.ts");
    let served = 0;
    const srv = createServer((_req, res) => {
      served += 1;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ served }));
    });
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const addr = srv.address();
    const port = String(typeof addr === "object" && addr !== null ? addr.port : 0);
    const baseAt = (n: number): string => "http://127.0.0.1:" + port + "/" + n;
    onTestFinished(() => new Promise<void>((resolve) => srv.close(() => resolve())));
    try {
      // fill past the cap: url /1..N are cache KEYS only, one shared
      // server answers them all
      const first = await liveObjectInfo(baseAt(1));
      for (let n = 2; n <= 10; n++) await liveObjectInfo(baseAt(n));
      // /1 was evicted by the cap — its next read re-fetches
      const reread = await liveObjectInfo(baseAt(1));
      assert.notEqual(reread, first, "the evicted entry re-fetched");
      // the most-recent entry still caches (no fetch between)
      const servedBefore = served;
      const hot = await liveObjectInfo(baseAt(10));
      assert.equal(served, servedBefore, "the newest entry survived the eviction");
      assert.equal(hot["served"], 10, "the hot doc is the original cached body");
      // a dropped server re-fetches regardless of recency (the
      // invalidation law stands beside the cap)
      invalidateObjectInfo(baseAt(10));
      await liveObjectInfo(baseAt(10));
      assert.equal(served, servedBefore + 1);
    } finally {
      srv.close();
    }
  });
});
