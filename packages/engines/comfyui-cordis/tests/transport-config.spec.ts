// @melite/comfyui-cordis — host/config transport battery (split from comfyui-transport.spec.ts).
// The host triple, the pin law, the threading gate, and the endpoint SSOT read.
// Env keys are snapshotted per test (this file owns COMFYUI_URL/COMFYUI_ENDPOINT_CONFIG/
// INFERENCE_TEST_SANDBOX/MELITE_REPO_ROOT while it runs).
import { afterEach, beforeEach, describe, it, onTestFinished } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import {
  ComfyError, ComfyUIHostService, activeCount, comfyuiHostProvider,
  endpointConfigPath, loadEndpointConfig, needComfyUI, parseComfyUIHostConfig,
  resolveEngineBaseUrl, resolveRepoRoot
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
});
