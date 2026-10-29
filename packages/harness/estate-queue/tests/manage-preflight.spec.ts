// manage-preflight.spec.ts — audit 019 C3's wall: the first-boot
// preflight through the REAL dispatch door, one arm per axis miss,
// plus the never-degraded-green law (a probe that throws is a named
// miss — the answer can never read all-green over an unchecked
// axis). The manifest rides the MELITE_EXTENSION_MANIFEST fixture
// seam (the module's own override); the engine wire is routed per
// test (the manage-plane.spec harness pattern).
import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx, ManageEnvelope } from "../src/managePlane.ts";
import { loadShippedExtensionManifest } from "@melite/comfyui-cordis/provisioning-manifest";

const realFetch = globalThis.fetch;

// The fixture manifest: three rows, two required (the landed-pack
// census judges required only), one optional — the honest shape the
// shipped file carries.
const MANIFEST = [
  { name: "pack-a", url: "https://example.invalid/a.git", ref: "aa", required: true, desc: "a", pip: [] },
  { name: "pack-b", url: "https://example.invalid/b.git", ref: "bb", required: true, desc: "b", pip: [] },
  { name: "pack-opt", url: "https://example.invalid/o.git", ref: "oo", required: false, desc: "o", pip: [] },
];

let ROOT = "";
let MANIFEST_PATH = "";

beforeEach(() => {
  ROOT = mkdtempSync(join(tmpdir(), "preflight-"));
  MANIFEST_PATH = join(ROOT, "extension-manifest.json");
  writeFileSync(MANIFEST_PATH, JSON.stringify(MANIFEST));
  process.env.MELITE_EXTENSION_MANIFEST = MANIFEST_PATH;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.MELITE_EXTENSION_MANIFEST;
  rmSync(ROOT, { recursive: true, force: true });
});

type Route = (url: string) => Response | Promise<Response>;
const route = (fn: Route): void => {
  globalThis.fetch = (async (url: unknown) => fn(String(url))) as typeof fetch;
};

const CTX = (over: Record<string, unknown> = {}): ManageCtx =>
  ({
    repoRoot: ROOT,
    stateRoots: [ROOT],
    endpoint: () => ({ provision: "byo", url: "http://engine:8188" }),
    autoProvision: false,
    models: { allDecls: () => [] },
    provisioning: undefined,
    timeout: (cb: () => void, ms: number): (() => void) => {
      const timer = setTimeout(cb, ms);
      return () => { clearTimeout(timer); };
    },
    ...over,
  }) as unknown as ManageCtx;

interface Answer {
  code: number;
  env: ManageEnvelope;
  rows: string[];
  misses: string[];
  axes: Array<{ axis: string; state: string; detail: string; door?: string }>;
}

async function preflight(ctx?: ManageCtx): Promise<Answer> {
  const [code, env] = (await dispatchManage({ action: "preflight" }, ctx ?? CTX())) as
    [number, ManageEnvelope];
  return {
    code,
    env,
    rows: (env.rows ?? []) as string[],
    misses: (env.misses ?? []) as string[],
    axes: ((env.data as { axes?: unknown } | undefined)?.axes ?? []) as Answer["axes"],
  };
}

/** The all-up wire: every probe 200, every required pack landed. */
const greenRoute = (installed: Record<string, string>, foldersOk = true): Route => (url) => {
  if (url.endsWith("/system_stats")) {
    return new Response(JSON.stringify({ system: { comfyui_version: "0.3.99" }, devices: [] }), { status: 200 });
  }
  if (url.endsWith("/customnode/installed")) {
    return new Response(JSON.stringify(installed), { status: 200 });
  }
  if (url.includes("/models/")) {
    return new Response(JSON.stringify([]), { status: foldersOk ? 200 : 404 });
  }
  return new Response("unused", { status: 500 });
};

describe("the preflight door (audit 019 C3)", () => {
  it("the verb is seated in the closed vocabulary — an unknown action still 422s naming the list", async () => {
    const [code, env] = await dispatchManage({ action: "preflightt" }, CTX());
    assert.equal(code, 422);
    assert.match(env.detail, /one of: /);
    assert.match(env.detail, /preflight/);
  });

  it("ARM all-green: every axis judged, zero misses, the green rows carry the facts", async () => {
    const storeDir = join(ROOT, "store");
    mkdirSync(storeDir);
    route(greenRoute({ "pack-a": "1", "pack-b": "2", "pack-opt": "3" }));
    const answer = await preflight(CTX({
      endpoint: () => ({
        provision: "byo", url: "http://engine:8188",
        model_download_path: storeDir,
        extra_model_folders: { checkpoints: "checkpoints", taggers: "taggers" },
      }),
    }));
    assert.equal(answer.code, 200);
    assert.equal(answer.env.ok, true);
    assert.deepEqual(answer.misses, []);
    assert.equal(answer.axes.length, 5);
    assert.ok(answer.axes.every((a) => a.state === "green"), "every axis is green");
    assert.match(answer.env.detail ?? "", /5 axis\(es\) checked, all green/);
    // the optional row's absence is not a miss (required-only census)
    assert.ok(answer.axes.filter((a) => a.axis === "packs")[0]?.detail.includes("optional"));
  });

  it("ARM kill engine: the engine miss names endpoint_set and the downstream axes cascade — none reads green", async () => {
    route(() => Promise.reject(new Error("ECONNREFUSED")));
    const answer = await preflight();
    assert.equal(answer.code, 200);
    const engine = answer.axes.filter((a) => a.axis === "engine")[0];
    assert.equal(engine?.state, "miss");
    assert.equal(engine?.door, "endpoint_set");
    assert.match(engine?.detail ?? "", /unreachable at http:\/\/engine:8188/);
    for (const axis of ["manager", "packs", "wiring"]) {
      const row = answer.axes.filter((a) => a.axis === axis)[0];
      assert.equal(row?.state, "miss", axis + " cascades, never green over an unreachable engine");
      assert.match(row?.detail ?? "", /engine axis missed above/);
    }
  });

  it("ARM no url: the engine miss names the missing config, door endpoint_set", async () => {
    route(greenRoute({}));
    const answer = await preflight(CTX({ endpoint: () => ({ provision: "byo" }) }));
    const engine = answer.axes.filter((a) => a.axis === "engine")[0];
    assert.equal(engine?.state, "miss");
    assert.match(engine?.detail ?? "", /no engine url/);
  });

  it("ARM drop manifest row: the packs miss names EVERY missing required row and the install_extension door", async () => {
    const storeDir = join(ROOT, "store");
    mkdirSync(storeDir);
    // pack-b dropped from the installed list; pack-opt optional and absent
    route(greenRoute({ "pack-a": "1" }));
    const answer = await preflight(CTX({
      endpoint: () => ({ provision: "byo", url: "http://engine:8188", model_download_path: storeDir }),
    }));
    const packs = answer.axes.filter((a) => a.axis === "packs")[0];
    assert.equal(packs?.state, "miss");
    assert.match(packs?.detail ?? "", /pack-b/);
    assert.doesNotMatch(packs?.detail ?? "", /pack-opt/, "optional rows are not misses");
    assert.equal(packs?.door, "install_extension");
    assert.ok(answer.misses.some((m) => m.includes("packs") && m.includes("install_extension")));
  });

  it("ARM empty store: a CONFIGURED weights root absent from disk is a named miss", async () => {
    const missing = join(ROOT, "no-such-store");
    route(greenRoute({ "pack-a": "1", "pack-b": "2" }));
    const answer = await preflight(CTX({
      endpoint: () => ({
        provision: "byo", url: "http://engine:8188",
        model_download_path: missing,
        extra_model_folders: { checkpoints: "checkpoints" },
      }),
    }));
    const store = answer.axes.filter((a) => a.axis === "store")[0];
    assert.equal(store?.state, "miss");
    assert.match(store?.detail ?? "", /not on disk/);
    assert.match(store?.door ?? "", /provision_model/);
  });

  it("ARM no configured store is GREEN (BYO — the engine's own folders serve weights)", async () => {
    route(greenRoute({ "pack-a": "1", "pack-b": "2" }));
    const answer = await preflight(CTX({
      endpoint: () => ({ provision: "byo", url: "http://engine:8188", extra_model_folders: { c: "c" } }),
    }));
    const store = answer.axes.filter((a) => a.axis === "store")[0];
    assert.equal(store?.state, "green");
  });

  it("ARM wiring invisible: every declared folder 404s — the miss names the attach door", async () => {
    route(greenRoute({ "pack-a": "1", "pack-b": "2" }, false));
    const answer = await preflight(CTX({
      endpoint: () => ({
        provision: "byo", url: "http://engine:8188",
        extra_model_folders: { checkpoints: "checkpoints", taggers: "taggers" },
      }),
    }));
    const wiring = answer.axes.filter((a) => a.axis === "wiring")[0];
    assert.equal(wiring?.state, "miss");
    assert.match(wiring?.detail ?? "", /2 declared extra-model folder\(s\)/);
    assert.match(wiring?.detail ?? "", /extra_model_paths\.yaml/);
  });

  it("ARM folder-probe transport flake: a throwing GET counts as unregistered and the verb still answers — never a 500", async () => {
    route((url) => {
      if (url.endsWith("/system_stats")) {
        return new Response(JSON.stringify({ system: {}, devices: [] }), { status: 200 });
      }
      if (url.endsWith("/customnode/installed")) {
        return new Response(JSON.stringify({ "pack-a": "1", "pack-b": "2" }), { status: 200 });
      }
      // the folder probes die mid-transport (engine proved up, then
      // the per-folder GETs blackhole) — the axis answers a miss, the
      // verb never crashes over one flaked probe
      return Promise.reject(new Error("ECONNRESET"));
    });
    const answer = await preflight(CTX({
      endpoint: () => ({
        provision: "byo", url: "http://engine:8188",
        extra_model_folders: { checkpoints: "checkpoints" },
      }),
    }));
    assert.equal(answer.code, 200);
    assert.equal(answer.env.ok, true);
    const wiring = answer.axes.filter((a) => a.axis === "wiring")[0];
    assert.equal(wiring?.state, "miss");
    assert.match(wiring?.detail ?? "", /1 declared extra-model folder\(s\)/);
  });

  it("THE NEVER-DEGRADED-GREEN LAW: a probe that throws mid-answer is a NAMED miss — the answer never reads all-green over it", async () => {
    // The engine answers; the manager rail dies mid-read (a route
    // throw, not a refusal) — the manager axis must carry the error
    // as a miss, and packs must cascade, never silently pass.
    route((url) => {
      if (url.endsWith("/system_stats")) {
        return new Response(JSON.stringify({ system: {}, devices: [] }), { status: 200 });
      }
      if (url.endsWith("/customnode/installed")) {
        return Promise.reject(new Error("boom: socket hang up"));
      }
      return new Response("[]", { status: 200 });
    });
    const answer = await preflight();
    const manager = answer.axes.filter((a) => a.axis === "manager")[0];
    assert.equal(manager?.state, "miss");
    assert.match(manager?.detail ?? "", /boom: socket hang up/);
    const packs = answer.axes.filter((a) => a.axis === "packs")[0];
    assert.equal(packs?.state, "miss", "packs cascades over the dead manager axis");
    assert.notEqual(answer.misses.length, 0, "misses are named");
    assert.ok(answer.axes.some((a) => a.state === "miss"), "never all-green");
  });

  it("ARM manifest absent (the 019 F1 shape): the packs miss names the regenerate door — never a silent zero-row census", async () => {
    process.env.MELITE_EXTENSION_MANIFEST = join(ROOT, "absent.json");
    route(greenRoute({}));
    const answer = await preflight(CTX({
      endpoint: () => ({ provision: "byo", url: "http://engine:8188" }),
    }));
    const packs = answer.axes.filter((a) => a.axis === "packs")[0];
    assert.equal(packs?.state, "miss");
    assert.match(packs?.detail ?? "", /REFUSED/);
    assert.match(packs?.detail ?? "", /shipped extension manifest is missing/);
    assert.match(packs?.door ?? "", /regen:extension-manifest/);
    // the real shipped read still parses (the fixture seam, not a
    // broken import): deleting the override serves the real file
    delete process.env.MELITE_EXTENSION_MANIFEST;
    const rows = loadShippedExtensionManifest();
    assert.ok(rows.length > 0, "the shipped manifest carries rows");
  });
});
