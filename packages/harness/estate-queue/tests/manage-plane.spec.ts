// manage-plane.spec.ts — the management plane through dispatchManage:
// the parse law, the lifecycle guard, every handler's happy + refusal
// arms, and the envelope mapping. Fetch is routed per test, systemctl
// / journalctl ride a tmpbin, state roots are temp dirs.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx } from "../src/managePlane.ts";

const realFetch = globalThis.fetch;
const realPath = process.env.PATH ?? "";
afterEach(() => {
  globalThis.fetch = realFetch;
  process.env.PATH = realPath;
  delete process.env.COMFYUI_ENDPOINT_CONFIG;
});

const json = (v: unknown, status = 200): Response =>
  new Response(JSON.stringify(v), { status });
const text = (v: string, status = 200): Response =>
  new Response(v, { status });

// ── harness ─────────────────────────────────────────────────────────
let ROOT = "";
const seenTimeouts: number[] = [];
const fakeModels = {
  rows: [] as Array<{ url: string; relative_path: string; filename?: string; name: string }>,
  poison: null as null | string | Error,
  present: new Set<string>(),
  resolveCatalogArtifact: (..._a: unknown[]) => {
    if (fakeModels.poison instanceof Error) throw fakeModels.poison;
    if (fakeModels.poison !== null) throw new Error(fakeModels.poison);
    return fakeModels.rows;
  },
  checkModelPresent: (rel: string, name: string) =>
    fakeModels.present.has(rel + "/" + name) ? "/hit" : null,
};
const CTX = (over: Record<string, unknown> = {}): ManageCtx =>
  ({
    repoRoot: ROOT,
    endpoint: () => ({ provision: "managed", url: "http://engine:8188" }),
    models: fakeModels,
    timeout: (cb: () => void, ms: number): (() => void) => {
      seenTimeouts.push(ms);
      cb();
      return () => {};
    },
    ...over,
  }) as unknown as ManageCtx;

const runFlow = (name: string, status: string | null, pad = ""): void => {
  const dir = join(ROOT, "data", "runs", "output", name);
  mkdirSync(dir, { recursive: true });
  if (status !== null) writeFileSync(join(dir, "_flow.json"), pad + JSON.stringify({ status }));
};
const mkRoot = (): string => {
  ROOT = mkdtempSync(join(tmpdir(), "manage-"));
  return ROOT;
};
const rmRoot = (): void => {
  rmSync(ROOT, { recursive: true, force: true });
};

type Route = (url: string, init: RequestInit | undefined) => Response | Promise<Response>;
let ROUTE: Route = () => text("unused", 500);
const route = (fn: Route): void => {
  ROUTE = fn;
  globalThis.fetch = (async (url: unknown, init: RequestInit | undefined) =>
    ROUTE(String(url), init)) as typeof fetch;
};

const manage = (doc: unknown, ctx?: ManageCtx): Promise<[number, { ok: boolean; detail: string; action: string; data?: unknown }]> =>
  dispatchManage(doc, ctx ?? CTX()) as unknown as Promise<
    [number, { ok: boolean; detail: string; action: string; data?: unknown }]
  >;

const fakeBin = (scripts: Record<string, { out: string; err?: string; code: number }>): void => {
  const bin = mkdtempSync(join(tmpdir(), "fakebin-"));
  for (const [name, s] of Object.entries(scripts)) {
    writeFileSync(
      join(bin, name),
      "#!/bin/sh\n" +
        (s.err ? `echo '${s.err}' >&2\n` : "") +
        (s.out ? `printf '%s' '${s.out}'\n` : "") +
        `exit ${s.code}\n`,
    );
    chmodSync(join(bin, name), 0o755);
  }
  process.env.PATH = bin + ":" + realPath;
};

describe("parse law", () => {
  it("non-dicts, missing and unknown actions refuse (action rides)", async () => {
    assert.deepEqual((await manage([]))[0], 422);
    const [code, env] = await manage({ action: "bogus" });
    assert.equal(code, 422);
    assert.equal(env.action, "bogus");
    assert.equal((await manage({ action: 5 }))[1].action, "5");
    // a scalar (non-object) doc labels the action "?" through the
    // envelope's left conjunct
    assert.equal((await manage("flat"))[1].action, "?");
    // a MISSING action refuses with the required voice; a nullish
    // action key tolls the envelope's "?" fallback
    const [mc, me] = await manage({});
    assert.equal(mc, 422);
    assert.equal(me.detail, "Field required: action");
    assert.equal(me.action, "?");
    const [nc, ne] = await manage({ action: null });
    assert.equal(nc, 422);
    assert.equal(ne.action, "?");
  });

  it("junk shapes coerce (nodes map/filter, wait/nulls, numbers, target)", async () => {
    mkRoot();
    try {
      route(() => json({ system: {}, devices: [] }));
      const [code, env] = await manage({
        action: "status",
        wait: "x",
        timeout_seconds: Number.NaN,
        tail: "x",
        target: "",
        extra_args: [1],
        force: 0,
        nodes: "x",
      });
      assert.equal(code, 200);
      assert.equal(env.action, "status");
      const [code2, env2] = await manage({ action: "install_extension", nodes: [0, "", 5] });
      assert.equal(code2, 404);
      assert.match(env2.detail, /not found in registry cache: 0/);
    } finally {
      rmRoot();
    }
  });
});

describe("hStatus", () => {
  it("down engines answer not-reachable (byo, unpinned, empty)", async () => {
    mkRoot();
    try {
      route(() => {
        throw new TypeError("fetch failed");
      });
      const [code, env] = await manage(
        { action: "status" },
        CTX({ endpoint: () => ({}) }),
      );
      assert.equal(code, 200);
      assert.equal(env.detail, "server not reachable");
      const data = env.data as {
        endpoint: { reachable: boolean; reason: string };
        manager: { reachable: boolean; reason: string; security: string };
        active_runs: unknown[];
        routing: { mode: string };
      };
      assert.equal(data.endpoint.reachable, false);
      assert.equal(data.manager.reason, "endpoint not reachable");
      assert.match(data.manager.security, /unpinned/);
      assert.deepEqual(data.active_runs, []);
      assert.equal(data.routing.mode, "byo");
    } finally {
      rmRoot();
    }
  });

  it("up engines serve version, queue, devices (sliced, named) and security", async () => {
    mkRoot();
    try {
      mkdirSync(join(ROOT, "data", "runtime", "comfyui", "user", "__manager"), { recursive: true });
      writeFileSync(
        join(ROOT, "data", "runtime", "comfyui", "user", "__manager", "config.ini"),
        "security_level = normal+\nallow_git_url_install = true\n",
      );
      runFlow("run-b", "queued");
      runFlow("run-a", "running");
      runFlow("run-c", "done");
      runFlow("nodash", "running");
      mkdirSync(join(ROOT, "data", "runs", "output", "run-d"), { recursive: true });
      runFlow("run-e", null);
      writeFileSync(join(ROOT, "data", "runs", "output", "run-e", "_flow.json"), "no status here");
      route((url) => {
        if (url.endsWith("/system_stats")) {
          return json({
            system: { comfyui_version: "9.9" },
            devices: [
              { name: "cuda:0", vram_total: 1, vram_free: 2 },
              { vram_total: 3 },
              {},
              { name: "x" },
              { name: "cut" },
            ],
          });
        }
        if (url.endsWith("/manager/version")) return json({ v: 1 });
        return json({ is_processing: false, in_progress_count: 0, total_count: 0, done_count: 0 });
      });
      const [code, env] = await manage({ action: "status" });
      assert.equal(code, 200);
      assert.equal(env.detail, "server up");
      const data = env.data as {
        endpoint: { reachable: boolean; url: string; comfyui_version: string; devices: Array<{ name: string }> };
        manager: { version: unknown; security: string; unit: string };
        active_runs: string[];
        routing: { mode: string };
      };
      assert.equal(data.endpoint.comfyui_version, "9.9");
      assert.deepEqual(data.endpoint.devices.map((d) => d.name), ["cuda:0", "?", "?", "x"]);
      assert.deepEqual(data.manager.version, { v: 1 });
      assert.match(data.manager.security, /security_level=normal\+ \+git_url/);
      assert.deepEqual(data.active_runs, ["run-a", "run-b"]);
      assert.equal(data.routing.mode, "managed");
    } finally {
      rmRoot();
    }
  });

  it("a manager failure softens (legacy ini, default level)", async () => {
    mkRoot();
    try {
      mkdirSync(join(ROOT, "data", "runtime", "comfyui", "user", "default", "ComfyUI-Manager"), {
        recursive: true,
      });
      writeFileSync(
        join(ROOT, "data", "runtime", "comfyui", "user", "default", "ComfyUI-Manager", "config.ini"),
        "[manager]\n",
      );
      route((url) => {
        if (url.endsWith("/system_stats")) return json({});
        throw new TypeError("boom");
      });
      const [, env] = await manage({ action: "status" });
      const data = env.data as { manager: { reachable: boolean; reason: string; security: string } };
      assert.equal(data.manager.reachable, false);
      assert.match(data.manager.reason, /boom/);
      assert.match(data.manager.security, /normal \(default\)/);
    } finally {
      rmRoot();
    }
  });
});

describe("lifecycle guard + orchestration", () => {
  it("live runs refuse without force (even force=1)", async () => {
    mkRoot();
    try {
      runFlow("run-a", "running");
      route(() => json({}));
      const [, env] = await manage({ action: "restart" });
      assert.match(env.detail, /1 active run\(s\) \(run-a\)/);
      const [, env2] = await manage({ action: "restart", force: 1 });
      assert.match(env2.detail, /active run/);
    } finally {
      rmRoot();
    }
  });

  it("stop/launch ride systemctl (ok + failed + missing)", async () => {
    mkRoot();
    try {
      fakeBin({ systemctl: { out: "", code: 0 } });
      route(() => json({}));
      const [c1, e1] = await manage({ action: "stop", force: true });
      assert.equal(c1, 200);
      assert.match(e1.detail, /stop issued/);
      const [c2] = await manage({ action: "launch", force: true });
      assert.equal(c2, 200);
      fakeBin({ systemctl: { out: "", err: "no bus", code: 3 } });
      const [c3, e3] = await manage({ action: "stop", force: true });
      assert.equal(c3, 500);
      assert.match(e3.detail, /systemctl stop .* failed: no bus/);
      process.env.PATH = mkdtempSync(join(tmpdir(), "emptybin-"));
      const [c4, e4] = await manage({ action: "launch", force: true });
      assert.equal(c4, 500);
      assert.match(e4.detail, /failed: /);
    } finally {
      rmRoot();
    }
  });
});

describe("hLogs", () => {
  it("tails the journal (clamped) and degrades without it", async () => {
    mkRoot();
    try {
      fakeBin({ journalctl: { out: "l1\n\nl2\n", code: 0 } });
      const [code, env] = await manage({ action: "logs", tail: 9999 });
      assert.equal(code, 200);
      assert.match(env.detail, /2 log line\(s\)/);
      assert.deepEqual(env.data, ["l1", "l2"]);
      process.env.PATH = mkdtempSync(join(tmpdir(), "emptybin-"));
      const [c2, e2] = await manage({ action: "logs" });
      assert.equal(c2, 503);
      assert.match(e2.detail, /need the estate deployment's journal/);
    } finally {
      rmRoot();
    }
  });
});

describe("hSearch", () => {
  it("needs a query, refuses byo, maps refusals, rethrows transports", async () => {
    mkRoot();
    try {
      const [, e0] = await manage({ action: "search_models" });
      assert.match(e0.detail, /search_models requires: query/);
      const [, e1] = await manage({ action: "search_models", query: "x" }, CTX({ endpoint: () => ({}) }));
      assert.match(e1.detail, /byo endpoint/);
      route(() => text("denied", 403));
      const [c2, e2] = await manage({ action: "search_models", query: "x" });
      assert.equal(c2, 403);
      assert.match(e2.detail, /manager refused search_models/);
      route(() => {
        throw new TypeError("down");
      });
      const [c3, e3] = await manage({ action: "search_models", query: "x" });
      assert.equal(c3, 503);
      assert.match(e3.detail, /management plane unavailable/);
      route(() => json({ models: 5 }));
      const [c4, e4] = await manage({ action: "search_models", query: "x" });
      assert.equal(c4, 500);
      assert.match(e4.detail, /TypeError/);
    } finally {
      rmRoot();
    }
  });

  it("filters the cache rows (case-folded, capped)", async () => {
    mkRoot();
    try {
      route(() => json({}));
      const [, e0] = await manage({ action: "search_models", query: "q" });
      assert.match(e0.detail, /0 hit\(s\)/);
      route(() =>
        json({
          models: [
            { name: "Fast Art", type: "ckpt", base: "sdxl", filename: "fast.safetensors" },
            { name: "Slow Photo", type: "lora" },
          ],
        }),
      );
      const [, e1] = await manage({ action: "search_models", query: "FAST ART" });
      assert.match(e1.detail, /1 hit\(s\)/);
    } finally {
      rmRoot();
    }
  });
});

describe("hInstallExtension", () => {
  const LIST = {
    custom_nodes: [
      { title: "Pack", cnr_id: "c1", version: "v1", ver: "1.0" },
      { title: "Second", id: "s2" },
      { ver: "3.0" },
      { title: "NoTitle" },
    ],
  };

  it("needs nodes and the estate (misses 404)", async () => {
    mkRoot();
    try {
      const [, e0] = await manage({ action: "install_extension", nodes: [] });
      assert.match(e0.detail, /install_extension requires: nodes/);
      const [, e1] = await manage({ action: "install_extension", nodes: ["x"] }, CTX({ endpoint: () => ({}) }));
      assert.match(e1.detail, /byo endpoint/);
      route(() => json({ custom_nodes: [] }));
      const [c2, e2] = await manage({ action: "install_extension", nodes: ["ghost"] });
      assert.equal(c2, 404);
      assert.match(e2.detail, /not found in registry cache: ghost/);
    } finally {
      rmRoot();
    }
  });

  it("matches title/cnr/ver/prefix, queues, drains, reports misses", async () => {
    mkRoot();
    try {
      let polls = 0;
      route((url) => {
        if (url.includes("/customnode/getlist")) return json(LIST);
        if (url.includes("/manager/queue/status")) {
          polls++;
          return json(polls > 1
            ? { is_processing: false, in_progress_count: 0, total_count: 2, done_count: 2 }
            : { is_processing: true, in_progress_count: 1, total_count: 2, done_count: 0 });
        }
        return json({});
      });
      const [code, env] = await manage({ action: "install_extension", nodes: ["PACK", "3.0", "ghost"] });
      assert.equal(code, 200);
      assert.match(env.detail, /queued 2 pack\(s\).*not in cache: ghost/);
      const data = env.data as { queued: string[]; misses: string[]; restart_required: boolean };
      assert.equal(data.restart_required, true);
      assert.deepEqual(data.misses, ["ghost"]);
    } finally {
      rmRoot();
    }
  });

  it("install refusals map; queue-start transports 500", async () => {
    mkRoot();
    try {
      route((url) => {
        if (url.includes("/customnode/getlist")) return json(LIST);
        if (url.includes("/queue/install")) return text("sec", 403);
        return json({});
      });
      const [c1, e1] = await manage({ action: "install_extension", nodes: ["pack"] });
      assert.equal(c1, 403);
      assert.match(e1.detail, /manager refused install_extension/);
      route((url) => {
        if (url.includes("/customnode/getlist")) return json(LIST);
        if (url.includes("/queue/start")) {
          throw new TypeError("cut");
        }
        return json({});
      });
      const [c2, e2] = await manage({ action: "install_extension", nodes: ["pack"] });
      assert.equal(c2, 503);
      assert.match(e2.detail, /management plane unavailable/);
    } finally {
      rmRoot();
    }
  });
});

describe("hInstallExtensionUrl", () => {
  it("needs a url; posts the git route; maps refusals", async () => {
    mkRoot();
    try {
      const [, e0] = await manage({ action: "install_extension_url" });
      assert.match(e0.detail, /install_extension_url requires: url/);
      const [, e1] = await manage({ action: "install_extension_url", url: 5 });
      assert.match(e1.detail, /install_extension_url requires: url/);
      route(() => json({}));
      const [c2, e2] = await manage({ action: "install_extension_url", url: "https://x/y" });
      assert.equal(c2, 200);
      assert.match(e2.detail, /git-url installed/);
      route(() => text("gone", 404));
      const [c3, e3] = await manage({ action: "install_extension_url", url: "https://x/y" });
      assert.equal(c3, 404);
      assert.match(e3.detail, /no such target/);
    } finally {
      rmRoot();
    }
  });
});

describe("hDownloadModel", () => {
  it("guards paths; lands bytes; maps fetch arms", async () => {
    mkRoot();
    try {
      const [, e0] = await manage({ action: "download_model" });
      assert.match(e0.detail, /download_model requires: url/);
      const [, e1] = await manage({ action: "download_model", url: "http://h/f", relative_path: "../x" });
      assert.match(e1.detail, /must stay under the models root/);
      const [, e1b] = await manage({ action: "download_model", url: "http://h/f", relative_path: "/abs" });
      assert.match(e1b.detail, /must stay under the models root/);
      const [, e2] = await manage({ action: "download_model", url: "http://h/f", filename: "a/b" });
      assert.match(e2.detail, /must be a bare name/);
      const [, e2b] = await manage({ action: "download_model", url: "http://h/" });
      assert.match(e2b.detail, /must be a bare name/);
      route(() => text("no", 500));
      const [c3, e3] = await manage({ action: "download_model", url: "http://h/f", filename: "m.bin" });
      assert.equal(c3, 502);
      assert.match(e3.detail, /download refused: HTTP 500/);
      route(() => new Response(null, { status: 200 }));
      const [c4, e4] = await manage({ action: "download_model", url: "http://h/f", filename: "m.bin" });
      assert.equal(c4, 502);
      assert.match(e4.detail, /no body/);
      route(() => {
        throw new TypeError("cut");
      });
      const [c5, e5] = await manage({ action: "download_model", url: "http://h/f", filename: "m.bin" });
      assert.equal(c5, 502);
      assert.match(e5.detail, /download failed: cut/);
      seenTimeouts.length = 0;
      route(() => new Response("BYTES"));
      const [c6, e6] = await manage({
        action: "download_model",
        url: "http://h/dir/f.bin",
        relative_path: "models/ckpt",
        timeout_seconds: 9999,
      });
      assert.equal(c6, 200);
      assert.match(e6.detail, /f\.bin → /);
      assert.equal(readFileSync(join(ROOT, "data", "runtime", "comfyui", "models", "ckpt", "f.bin"), "utf8"), "BYTES");
      assert.ok(seenTimeouts.includes(850 * 1000));
      assert.ok(seenTimeouts.includes(1000) === false);
    } finally {
      rmRoot();
    }
  });
});

describe("hProvisionModel", () => {
  const ROW = (over: Record<string, unknown> = {}) => ({
    url: "http://h/m.bin",
    relative_path: "checkpoints",
    name: "m.bin",
    ...over,
  });

  it("needs a model; catalog misses 404", async () => {
    mkRoot();
    try {
      const [, e0] = await manage({ action: "provision_model" });
      assert.match(e0.detail, /provision_model requires: model/);
      fakeModels.poison = "no such model";
      const [c1, e1] = await manage({ action: "provision_model", model: "x" });
      assert.equal(c1, 404);
      assert.match(e1.detail, /no such model/);
    } finally {
      fakeModels.poison = null;
      rmRoot();
    }
  });

  it("a catalog miss re-resolves against CARD-owned DECL rows (the mask-form SAM2 law)", async () => {
    const { CatalogMiss } = await import("@melite/comfyui-cordis");
    mkRoot();
    try {
      fakeModels.poison = new CatalogMiss('model "mask-form" not found in catalog');
      route(() => new Response("BYTES"));
      const [c1, e1] = await manage({ action: "provision_model", model: "mask-form" });
      assert.equal(c1, 200);
      assert.match(e1.detail, /downloaded: sam2\.1_hiera_large\.pt, yolo11m\.pt/);
      assert.equal(readFileSync(join(ROOT, "data", "runtime", "comfyui", "models", "sams", "sam2.1_hiera_large.pt"), "utf8"), "BYTES");
      assert.equal(readFileSync(join(ROOT, "data", "runtime", "comfyui", "models", "ultralytics", "bbox", "yolo11m.pt"), "utf8"), "BYTES");
      assert.equal((e1.data as { model: string }).model, "mask-form");
      // an unknown id stays a 404 (never a wrong install)
      fakeModels.poison = new CatalogMiss('model "ghost" not found in catalog');
      const [c2, e2] = await manage({ action: "provision_model", model: "ghost" });
      assert.equal(c2, 404);
      assert.match(e2.detail, /not found in catalog/);
      // a KNOWN card with no provisions stays a 404 (nothing declared, nothing fetched)
      fakeModels.poison = new CatalogMiss('model "tts" not found in catalog');
      const [c3, e3] = await manage({ action: "provision_model", model: "tts" });
      assert.equal(c3, 404);
      assert.match(e3.detail, /not found in catalog/);
    } finally {
      fakeModels.poison = null;
      rmRoot();
    }
  });

  it("present, downloaded, failed and empty rows shape the envelope", async () => {
    mkRoot();
    try {
      fakeModels.rows = [ROW(), ROW({ name: "n.bin" })];
      fakeModels.present = new Set(["checkpoints/m.bin"]);
      route(() => text("x", 500));
      const [c1, e1] = await manage({ action: "provision_model", model: "m" });
      assert.equal(c1, 200);
      assert.match(e1.detail, /present: 1; errors: 1/);
      assert.deepEqual((e1.data as { present: string[] }).present, ["m.bin"]);
      assert.ok((e1.data as { errors: unknown }).errors !== null);
      route(() => new Response("BYTES"));
      const [c2, e2] = await manage({ action: "provision_model", model: "m" });
      assert.equal(c2, 200);
      assert.match(e2.detail, /present: 1; downloaded: n\.bin/);
      assert.equal(readFileSync(join(ROOT, "data", "runtime", "comfyui", "models", "checkpoints", "n.bin"), "utf8"), "BYTES");
      fakeModels.present = new Set();
      const [c3, e3] = await manage({ action: "provision_model", model: "m" });
      assert.equal(c3, 200);
      assert.equal((e3.data as { errors: unknown }).errors, null);
      fakeModels.rows = [];
      const [c4, e4] = await manage({ action: "provision_model", model: "m" });
      assert.equal(c4, 500);
      assert.match(e4.detail, /no files landed/);
    } finally {
      fakeModels.rows = [];
      fakeModels.present = new Set();
      rmRoot();
    }
  });
});

describe("hRestart", () => {
  it("reboots, honors the dropped-connection voice, maps the rest", async () => {
    mkRoot();
    try {
      route(() => json({}));
      const [c1, e1] = await manage({ action: "restart", force: true });
      assert.equal(c1, 200);
      assert.match(e1.detail, /reboot issued \(systemd/);
      route(() => text("boom fetch failed", 503));
      const [c2, e2] = await manage({ action: "restart", force: true });
      assert.equal(c2, 200);
      assert.match(e2.detail, /connection closed by restart/);
      route(() => text("overhaul", 503));
      const [c3, e3] = await manage({ action: "restart", force: true });
      assert.equal(c3, 503);
      assert.match(e3.detail, /overhaul/);
      route(() => text("gone", 404));
      const [c4] = await manage({ action: "restart", force: true });
      assert.equal(c4, 404);
      route(() => {
        throw new Error("boom");
      });
      const [c5, e5] = await manage({ action: "restart", force: true });
      assert.equal(c5, 503);
      assert.match(e5.detail, /management plane unavailable/);
      const [, e6] = await manage({ action: "restart", force: true }, CTX({ endpoint: () => ({}) }));
      assert.match(e6.detail, /byo endpoint/);
    } finally {
      rmRoot();
    }
  });
});

describe("hUpdate + hSwitchVersion", () => {
  it("update guards the target, queues through the vendor", async () => {
    mkRoot();
    try {
      const [, e0] = await manage({ action: "update", target: "manager" });
      assert.match(e0.detail, /update target must be comfy/);
      let polls = 0;
      route((url) => {
        if (url.includes("/manager/queue/status")) {
          polls++;
          return json(polls > 1
            ? { is_processing: false, in_progress_count: 0, total_count: 0, done_count: 0 }
            : { is_processing: true, in_progress_count: 1, total_count: 0, done_count: 0 });
        }
        return json({});
      });
      const [c1, e1] = await manage({ action: "update", force: true });
      assert.equal(c1, 200);
      assert.match(e1.detail, /update\(comfy\) queued/);
      route(() => text("bad", 500));
      const [c2, e2] = await manage({ action: "update", force: true });
      assert.equal(c2, 502);
      assert.match(e2.detail, /manager api error 500/);
    } finally {
      rmRoot();
    }
  });

  it("switch_version pins to the vendor list", async () => {
    mkRoot();
    try {
      const [, e0] = await manage({ action: "switch_version" });
      assert.match(e0.detail, /switch_version requires: version/);
      route(() => json({ versions: ["a", "b"] }));
      const [c1, e1] = await manage({ action: "switch_version", version: "z", force: true });
      assert.equal(c1, 404);
      assert.match(e1.detail, /not available \(have: a, b/);
      route((url) => (url.includes("comfyui_versions") ? json({ versions: ["a"] }) : json({})));
      const [c2, e2] = await manage({ action: "switch_version", version: "a", force: true });
      assert.equal(c2, 200);
      assert.match(e2.detail, /switch to a issued/);
      assert.deepEqual((e2.data as { restart_required: boolean }).restart_required, true);
      route(() => {
        throw new TypeError("cut");
      });
      const [c3] = await manage({ action: "switch_version", version: "a", force: true });
      assert.equal(c3, 503);
    } finally {
      rmRoot();
    }
  });

  it("a string throw softens through the generic envelope", async () => {
    mkRoot();
    const realCheck = fakeModels.checkModelPresent;
    fakeModels.checkModelPresent = () => {
      throw "plain-string-fail";
    };
    try {
      fakeModels.rows = [{ url: "http://h/m.bin", relative_path: "checkpoints", name: "m.bin" }];
      const [code, env] = await manage({ action: "provision_model", model: "m" });
      assert.equal(code, 500);
      assert.equal(env.detail, "plain-string-fail");
    } finally {
      fakeModels.checkModelPresent = realCheck;
      fakeModels.rows = [];
      rmRoot();
    }
  });
});

describe("hFree", () => {
  it("needs the endpoint url; frees; maps", async () => {
    mkRoot();
    try {
      const [c0, e0] = await manage({ action: "free" }, CTX({ endpoint: () => ({}) }));
      assert.equal(c0, 503);
      assert.match(e0.detail, /management plane unavailable/);
      route(() => json({}));
      const [c1, e1] = await manage({ action: "free" });
      assert.equal(c1, 200);
      assert.match(e1.detail, /free issued/);
      route(() => text("sec", 403));
      const [c2] = await manage({ action: "free" });
      assert.equal(c2, 403);
    } finally {
      rmRoot();
    }
  });
});

describe("hEndpointSet", () => {
  const cfgFile = (): string => {
    const f = join(mkdtempSync(join(tmpdir(), "epcfg-")), "endpoint.json");
    process.env.COMFYUI_ENDPOINT_CONFIG = f;
    return f;
  };

  it("validates, probes, writes (other fields preserved)", async () => {
    mkRoot();
    try {
      const [, e0] = await manage({ action: "endpoint_set" });
      assert.match(e0.detail, /endpoint_set requires: url/);
      const [, e1] = await manage({ action: "endpoint_set", url: "ftp://h" });
      assert.match(e1.detail, /must be http/);
      route(() => {
        throw new TypeError("down");
      });
      const [c2, e2] = await manage({ action: "endpoint_set", url: "http://h:8188/" });
      assert.equal(c2, 502);
      assert.match(e2.detail, /did not answer/);
      route(() => text("bad", 500));
      const [c3] = await manage({ action: "endpoint_set", url: "http://h:8188" });
      assert.equal(c3, 502);
      const f = cfgFile();
      writeFileSync(f, JSON.stringify({ url: "http://old:8188", provision: "managed" }));
      route(() => json({ system: { comfyui_version: "3.0" } }));
      const [c4, e4] = await manage({ action: "endpoint_set", url: "http://new:8188///" });
      assert.equal(c4, 200);
      assert.match(e4.detail, /endpoint set to http:\/\/new:8188 \(ComfyUI 3\.0 answered\)/);
      const saved = JSON.parse(readFileSync(f, "utf8")) as Record<string, unknown>;
      assert.equal(saved["url"], "http://new:8188");
      assert.equal(saved["provision"], "managed");
      assert.deepEqual((e4.data as { url: string }).url, "http://new:8188");
      route(() => json({}));
      const [c5, e5] = await manage({ action: "endpoint_set", url: "http://new:8188" });
      assert.equal(c5, 200);
      assert.match(e5.detail, /ComfyUI \? answered/);
    } finally {
      rmRoot();
    }
  });

  it("write failures refuse (endpoint unchanged)", async () => {
    mkRoot();
    try {
      process.env.COMFYUI_ENDPOINT_CONFIG = join(tmpdir(), "no-such-dir-zzz", "endpoint.json");
      route(() => json({ system: {} }));
      const [code, env] = await manage({ action: "endpoint_set", url: "http://h:8188" });
      assert.equal(code, 500);
      assert.match(env.detail, /config write failed/);
    } finally {
      rmRoot();
    }
  });
});

describe("lists + snapshots", () => {
  it("list_extensions versions (version/ver/?) and null docs", async () => {
    mkRoot();
    try {
      const [, e0] = await manage({ action: "list_extensions" }, CTX({ endpoint: () => ({}) }));
      assert.match(e0.detail, /byo endpoint/);
      route(() => json({ a: { version: "1" }, b: { ver: "2" }, c: {} }));
      const [c1, e1] = await manage({ action: "list_extensions" });
      assert.equal(c1, 200);
      assert.match(e1.detail, /3 installed pack\(s\)/);
      assert.deepEqual(
        (e1.data as Array<{ name: string; version: string }>).map((r) => r.version),
        ["1", "2", "?"],
      );
      route(() => json(null));
      const [, e2] = await manage({ action: "list_extensions" });
      assert.match(e2.detail, /0 installed pack\(s\)/);
    } finally {
      rmRoot();
    }
  });

  it("snapshot_list/save/restore", async () => {
    mkRoot();
    try {
      route(() => json({ items: ["s1", "s2"] }));
      const [c1, e1] = await manage({ action: "snapshot_list" });
      assert.equal(c1, 200);
      assert.deepEqual(e1.data, ["s1", "s2"]);
      route(() => json({}));
      const [, e1b] = await manage({ action: "snapshot_list" });
      assert.deepEqual(e1b.data, []);
      route((url) => (url.includes("/snapshot/save") ? json({}) : json({ items: ["fresh"] })));
      const [c2, e2] = await manage({ action: "snapshot_save" });
      assert.equal(c2, 200);
      assert.match(e2.detail, /snapshot saved: fresh/);
      route((url) => (url.includes("/snapshot/save") ? json({}) : json({ items: [] })));
      const [, e2b] = await manage({ action: "snapshot_save" });
      assert.match(e2b.detail, /snapshot saved: \?/);
      route(() => text("bad", 500));
      const [c2c] = await manage({ action: "snapshot_save" });
      assert.equal(c2c, 502);
      const [, e3] = await manage({ action: "snapshot_restore" });
      assert.match(e3.detail, /snapshot_restore requires: snapshot/);
      route(() => json({}));
      const [c4, e4] = await manage({ action: "snapshot_restore", snapshot: "s1", force: true });
      assert.equal(c4, 200);
      assert.match(e4.detail, /restore of s1 scheduled/);
    } finally {
      rmRoot();
    }
  });

  it("the drain deadline returns the stuck state", async () => {
    mkRoot();
    try {
      route(() => json({ is_processing: true, in_progress_count: 1, total_count: 1, done_count: 0 }));
      const t0 = Date.now();
      const [code, env] = await manage({ action: "update", force: true, timeout_seconds: 0 });
      assert.equal(code, 200);
      assert.ok(Date.now() - t0 >= 900);
      assert.match(env.detail, /update\(comfy\) queued/);
    } finally {
      rmRoot();
    }
  });
});

describe("residual arms", () => {
  it("wait booleans ride; counts default; probe failures name the cause", async () => {
    mkRoot();
    try {
      route(() => json({ system: {}, devices: [] }));
      const [c1, e1] = await manage({ action: "status", wait: true, timeout_seconds: "x" });
      assert.equal(c1, 200);
      assert.equal(e1.action, "status");
      let polls = 0;
      route((url) => {
        if (url.endsWith("/system_stats")) return json({ system: {}, devices: [] });
        if (url.includes("/queue/status")) {
          polls++;
          return json(polls > 1
            ? { is_processing: false, in_progress_count: 0, total_count: 0, done_count: 0 }
            : {});
        }
        return json({});
      });
      const [c2] = await manage({ action: "update", force: true });
      assert.equal(c2, 200);
      route((url) => {
        if (url.endsWith("/system_stats")) throw new TypeError("refused");
        return json({});
      });
      const [, e3] = await manage({ action: "status" });
      const data = e3.data as { endpoint: { reachable: boolean; reason: string } };
      assert.equal(data.endpoint.reachable, false);
      assert.match(data.endpoint.reason, /refused/);
      route((url) => {
        if (url.includes("/manager/version")) throw "str-fail";
        if (url.endsWith("/system_stats")) return json({});
        return json({});
      });
      const [, e4] = await manage({ action: "status" });
      const m = (e4.data as { manager: { reason: string } }).manager;
      assert.match(m.reason, /management plane unavailable.*str-fail/);
    } finally {
      rmRoot();
    }
  });

  it("download string-throws; guard passes empty roots; install covers all matchers", async () => {
    mkRoot();
    try {
      route(() => {
        throw "string-down";
      });
      const [c1, e1] = await manage({ action: "download_model", url: "http://h/f", filename: "m.bin" });
      assert.equal(c1, 502);
      assert.match(e1.detail, /download failed: string-down/);
      fakeBin({ systemctl: { out: "", code: 0 } });
      route(() => json({}));
      const [c2, e2] = await manage({ action: "stop" });
      assert.equal(c2, 200);
      assert.match(e2.detail, /stop issued/);
      let polls = 0;
      route((url) => {
        if (url.includes("/customnode/getlist")) {
          return json({
            custom_nodes: [
              { title: "Pack", cnr_id: "c1", version: "v1", ver: "1.0" },
              { id: "s2" },
              { ver: "3.0" },
            ],
          });
        }
        if (url.includes("/manager/queue/status")) {
          polls++;
          return json(polls > 1
            ? { is_processing: false, in_progress_count: 0, total_count: 0, done_count: 0 }
            : { is_processing: true, in_progress_count: 1, total_count: 0, done_count: 0 });
        }
        return json({});
      });
      const [c3, e3] = await manage({ action: "install_extension", nodes: ["c1", "pa", "3.0"] });
      assert.equal(c3, 200);
      assert.match(e3.detail, /queued 3 pack\(s\): Pack, Pack, 3\.0/);
      const data = e3.data as { queued: string[]; misses: string[] };
      assert.deepEqual(data.misses, []);
      const [c4, e4] = await manage({ action: "install_extension", nodes: ["pack"] });
      assert.equal(c4, 200);
      assert.ok(!e4.detail.includes("not in cache"));
      route(() => json({}));
      const [c5, e5] = await manage({ action: "install_extension", nodes: ["ghost"] });
      assert.equal(c5, 404);
      assert.match(e5.detail, /not found in registry cache: ghost/);
    } finally {
      rmRoot();
    }
  });

  it("rail catches fire on every lane (install/getlist, list, snapshots, restore)", async () => {
    mkRoot();
    try {
      route((url) => {
        if (url.includes("/customnode/getlist")) return text("sec", 403);
        return json({});
      });
      const [c1, e1] = await manage({ action: "install_extension", nodes: ["x"] });
      assert.equal(c1, 403);
      assert.match(e1.detail, /manager refused install_extension/);
      route((url) => {
        if (url.includes("/customnode/installed")) return text("sec", 403);
        return json({});
      });
      const [c2] = await manage({ action: "list_extensions" });
      assert.equal(c2, 403);
      route((url) => {
        if (url.includes("/snapshot/getlist")) return text("gone", 404);
        return json({});
      });
      const [c3, e3] = await manage({ action: "snapshot_list" });
      assert.equal(c3, 404);
      assert.match(e3.detail, /no such target/);
      route((url) => {
        if (url.includes("/snapshot/restore")) return text("bad", 500);
        return json({});
      });
      const [c4] = await manage({ action: "snapshot_restore", snapshot: "s", force: true });
      assert.equal(c4, 502);
    } finally {
      rmRoot();
    }
  });

  it("endpoint string-throws; version lists default; snapshot names default", async () => {
    mkRoot();
    try {
      route(() => {
        throw "probe-cut";
      });
      const [c1, e1] = await manage({ action: "endpoint_set", url: "http://h:8188" });
      assert.equal(c1, 502);
      assert.match(e1.detail, /probe-cut/);
      route((url) => (url.includes("comfyui_versions") ? json({}) : json({})));
      const [c2, e2] = await manage({ action: "switch_version", version: "a", force: true });
      assert.equal(c2, 404);
      assert.match(e2.detail, /have: …/);
      route((url) => (url.includes("/snapshot/save") ? json({}) : json({})));
      const [, e3] = await manage({ action: "snapshot_save" });
      assert.match(e3.detail, /snapshot saved: \?/);
    } finally {
      rmRoot();
    }
  });
});
