// provisions.spec.ts — the models provisions door's own laws.
//
// OUR packages, owned bytes: family DECL provision files served
// same-origin from the imported model packages + the weights mount,
// materialized direct from the DECL's pinned distribution on a miss
// (fetch → temp → sha gate → rename). No remotes, no proxies, no
// manager — every response is estate-owned bytes verified against
// the DECL. Every refusal voice (bad-shape / unknown-family /
// unknown-provision / bad-folder / unpinned / acquire-refused /
// sha-mismatch / store-root config), every serve arm (miss →
// acquire, present-hit, drift-heal, verified-cache, HEAD,
// stampede-share), and the apply mount halves (no-webServer log,
// live register).
import { describe, test, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { ProvisionRow } from "@melite/comfyui-cordis/model-contract";
import type {
  ProvisionResult,
  ProvisioningServiceDefinition,
} from "@melite/estate-provisioning";
import {
  apply,
  artifactBasename,
  createHandler,
  createVerifyCache,
  findRepoRoot,
  liveFetchDirect,
  loadStoreRoot,
  MODELS_PREFIX,
  ModelsDoorError,
  name,
  parseTarget,
  provisionsForFamily,
  resolveDest,
  sha256OfFile,
  type DoorDeps,
  type DoorRequest,
  type DoorResponse,
  type FetchFn,
} from "../src/index.ts";

const GOOD_BYTES = Buffer.from("estate-models-provision-fixture-bytes-v1");
const GOOD_SHA = createHash("sha256").update(GOOD_BYTES).digest("hex");
const BAD_BYTES = Buffer.from("tampered-bytes-that-miss-the-decl-sha");

/** The checkout's live store root (the tracked endpoint pins the
 *  explicit download_path — the placement law's ground truth). */
// the machine-local overlay names this box's store (data/inference.local.json,
// untracked); virgin clones resolve the repo-relative default — the
// anchoring test below pins that half
const LIVE_STORE = "/mnt/data/models/image-gen/comfyui";

function row(over: Partial<ProvisionRow> = {}): ProvisionRow {
  return {
    name: "skin_standard.npz",
    url: "https://example.invalid/models/skin_standard.npz",
    folder: "somaskel77",
    sha256: GOOD_SHA,
    ...over,
  };
}

function webBody(bytes: Buffer): ReadableStream<Uint8Array> {
  return Readable.toWeb(Readable.from([bytes]));
}

function fetchOk(bytes: Buffer = GOOD_BYTES): FetchFn {
  return async () => ({ status: 200, body: webBody(bytes) });
}

function fakeProvisioning(deps: Pick<DoorDeps, "cache" | "storeRoot" | "provisions" | "fetchFn">): ProvisioningServiceDefinition {
  return {
    inspect: async (ref): Promise<never> => {
      throw new Error(`unexpected inspect ${ref.kind}`);
    },
    plan: async (ref): Promise<never> => {
      throw new Error(`unexpected plan ${ref.kind}`);
    },
    ensure: async (ref, options): Promise<ProvisionResult> => {
      const rows = await deps.provisions(ref.id);
      const requested = new Set(options?.items ?? []);
      const selected = rows.filter((entry) => requested.size === 0 || requested.has(entry.name));
      try {
        for (const entry of selected) {
          const destination = resolveDest(deps.storeRoot(), entry.folder, entry.name);
          if (existsSync(destination)) rmSync(destination, { force: true });
          await deps.cache.acquireRow(entry, destination, deps.fetchFn as FetchFn);
        }
        return {
          operationId: "test-model-operation",
          ref,
          state: "active",
          outcome: "active",
          operationState: "active",
          items: selected.map((entry) => ({
            key: `model:family:${ref.id}:${entry.name}`,
            kind: "model",
            state: "active",
            outcome: "active",
          })),
          restartRequired: false,
        };
      } catch (error: unknown) {
        throw error;
      }
    },
    activate: async (ref): Promise<ProvisionResult> => {
      throw new Error(`unexpected activate ${ref.kind}`);
    },
    acquireExternal: async (): Promise<ProvisionResult> => {
      throw new Error("unexpected external acquisition");
    },
    reconcile: async (): Promise<never> => {
      throw new Error("unexpected reconcile");
    },
    stateOf: () => "unknown",
    operationOf: () => undefined,
    isLocked: () => false,
  };
}

/** A provisioning service whose ensure always throws — the door
 *  must map the fault at its boundary, never surface a 500. */
function throwingProvisioning(): ProvisioningServiceDefinition {
  const refuse = async (): Promise<never> => {
    throw new Error("the wiring is faulted on purpose");
  };
  const svc: ProvisioningServiceDefinition = {
    inspect: refuse,
    plan: refuse,
    ensure: refuse,
    activate: refuse,
    acquireExternal: refuse,
    reconcile: refuse,
    stateOf: () => "unknown",
    operationOf: () => undefined,
    isLocked: () => false,
  };
  return svc;
}

interface Captured {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  ended: boolean;
  destroyed: boolean;
}

function fakeRes(headersSent = false): DoorResponse & { seen: Captured } {
  const seen: Captured = {
    status: 0,
    headers: {},
    body: Buffer.alloc(0),
    ended: false,
    destroyed: false,
  };
  const parts: Buffer[] = [];
  return {
    headersSent,
    writeHead(status: number, headers: Record<string, string>): void {
      seen.status = status;
      seen.headers = headers;
    },
    write(chunk: Uint8Array): boolean {
      parts.push(Buffer.from(chunk));
      return true;
    },
    drain(): Promise<void> {
      return Promise.resolve();
    },
    end(body?: unknown): void {
      seen.ended = true;
      if (body !== undefined)
        parts.push(Buffer.isBuffer(body) ? body : Buffer.from(String(body)));
      seen.body = Buffer.concat(parts);
    },
    destroy(): void {
      seen.destroyed = true;
    },
    seen,
  };
}

function fakeReq(method: string, path?: string): DoorRequest {
  return path === undefined ? { method } : { method, url: path };
}

function deps(over: Partial<DoorDeps> = {}): DoorDeps {
  const base = {
    cache: over.cache ?? createVerifyCache(),
    storeRoot: over.storeRoot ?? (() => {
      throw new Error("storeRoot not stubbed");
    }),
    fetchFn: over.fetchFn ?? fetchOk(),
    provisions: over.provisions ?? (async () => [row()]),
  };
  return {
    ...base,
    ...over,
    provisioning: over.provisioning ?? fakeProvisioning(base),
  };
}

function tmpRoot(): string {
  return mkdtempSync(join(tmpdir(), "estate-models-"));
}

/** A checkout-shaped dir (endpoint + root configs) for the store
 *  resolution walls — the caller owns cleanup. */
function repoDir(ep: unknown, root: unknown): string {
  const dir = tmpRoot();
  mkdirSync(join(dir, "packages", "engines", "comfyui-cordis", "data"), {
    recursive: true,
  });
  writeFileSync(
    join(
      dir,
      "packages",
      "engines",
      "comfyui-cordis",
      "data",
      "comfyui_endpoint.json",
    ),
    JSON.stringify(ep),
  );
  writeFileSync(join(dir, "inference.config.json"), JSON.stringify(root));
  return dir;
}

async function get(
  h: (req: DoorRequest, res: DoorResponse) => Promise<void>,
  path: string,
): Promise<Captured> {
  const res = fakeRes();
  await h(fakeReq("GET", path), res);
  return res.seen;
}

describe("parseTarget", () => {
  test("parses the family/provisions/name shape", () => {
    assert.deepEqual(parseTarget("/kimodo/provisions/skin_standard.npz"), {
      family: "kimodo",
      name: "skin_standard.npz",
    });
  });
  test("refuses a short path", () => {
    assert.equal(parseTarget("/kimodo/provisions"), null);
  });
  test("refuses a long path", () => {
    assert.equal(parseTarget("/a/provisions/b/c"), null);
  });
  test("refuses a wrong middle literal", () => {
    assert.equal(parseTarget("/kimodo/artifacts/skin_standard.npz"), null);
  });
  test("refuses a hostile family segment", () => {
    assert.equal(parseTarget("/../provisions/skin_standard.npz"), null);
  });
  test("refuses a dots-only name", () => {
    assert.equal(parseTarget("/kimodo/provisions/.."), null);
  });
});

describe("findRepoRoot", () => {
  test("ascends to the checkout carrying inference.config.json", () => {
    const root = findRepoRoot(
      join(process.cwd(), "packages", "estate", "models", "src"),
    );
    assert.equal(root, process.cwd());
    assert.equal(existsSync(join(root, "inference.config.json")), true);
  });
  test("refuses LOUD past the filesystem root", () => {
    const dir = mkdtempSync(join(tmpdir(), "estate-models-noroot-"));
    try {
      findRepoRoot(dir);
      assert.fail("must throw");
    } catch (err) {
      assert.ok(err instanceof ModelsDoorError);
      assert.equal(err.code, "models/no-repo-root");
      assert.equal(err.status, 502);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("loadStoreRoot (the config-file plane)", () => {
  test("the door's JSDoc does not claim the whole provision law (the F-17 class: a 'verbatim' that names a law it does not reproduce)", () => {
    // The door derives the DOWNLOAD arm only; the read arm and the
    // folder map belong to boundModelFolders. The JSDoc must say
    // which value it serves and that the others are not derived —
    // never "verbatim" over a three-valued law. Pinned as a spec
    // because prose drift is exactly what audits cannot see.
    const src = readFileSync(
      new URL("../src/index.ts", import.meta.url), "utf8",
    );
    const m = /\/\*\* Resolve the weights store[^]*?\*\//.exec(src);
    assert.ok(m, "the loadStoreRoot JSDoc exists");
    const doc = m[0];
    assert.ok(!/verbatim/.test(doc), "the JSDoc must not claim verbatim over a law it partially derives");
    assert.ok(/DOWNLOAD arm/.test(doc), "the JSDoc names the one arm it derives");
    assert.ok(/NOT derived here/.test(doc), "the JSDoc names the arms it does not derive");
  });
  test("the tracked checkout resolves the endpoint download_path", () => {
    assert.equal(loadStoreRoot(findRepoRoot(process.cwd())), LIVE_STORE);
  });
  test("endpoint base_path wins when download_path is absent", () => {
    const dir = repoDir(
      { model_base_path: "/b" },
      { models: { read_root: "/r" } },
    );
    try {
      assert.equal(loadStoreRoot(dir), "/b");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("absent endpoint keys derive from the root (explicit repoDir)", () => {
    const dir = repoDir(
      {},
      {
        models: { read_root: "/r", download_root: "/d" },
        engines: { comfyui: { base: "eng" } },
      },
    );
    try {
      assert.equal(loadStoreRoot(dir), "/d/eng");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("a RELATIVE tracked store anchors to the repo dir (the virgin-clone law: no machine inherits another box's /mnt)", () => {
    // the tracked defaults, verbatim: read_root "data/models",
    // engines.comfyui.base "image-gen/comfyui" — repo-relative, so a
    // fresh clone resolves its store INSIDE the checkout
    const dir = repoDir(
      {},
      {
        models: { read_root: "data/models", download_root: "data/models" },
        engines: { comfyui: { base: "image-gen/comfyui" } },
      },
    );
    try {
      assert.equal(
        loadStoreRoot(dir),
        join(dir, "data/models/image-gen/comfyui"),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("the root base alone derives", () => {
    const dir = repoDir(
      {},
      { models: { read_root: "/r" }, engines: { comfyui: { base: "eng" } } },
    );
    try {
      // relative bases anchor to the repo dir (portable-defaults law)
      assert.equal(loadStoreRoot(dir), join(dir, "eng"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("a download_root without a base stays bare (the merge law never invents a base)", () => {
    const dir = repoDir(
      {},
      { models: { read_root: "/r", download_root: "/d" }, engines: { comfyui: {} } },
    );
    try {
      assert.equal(loadStoreRoot(dir), "/d");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("an overlay with NO tracked root stands alone (the machines without a checkout seam)", () => {
    const dir = tmpRoot();
    try {
      mkdirSync(join(dir, "packages", "engines", "comfyui-cordis", "data"), {
        recursive: true,
      });
      writeFileSync(
        join(dir, "packages", "engines", "comfyui-cordis", "data", "comfyui_endpoint.json"),
        JSON.stringify({}),
      );
      mkdirSync(join(dir, "data"), { recursive: true });
      writeFileSync(
        join(dir, "data", "inference.local.json"),
        JSON.stringify({
          models: { read_root: "/ro", download_root: "/do" },
          engines: { comfyui: { base: "eng" } },
        }),
      );
      assert.equal(loadStoreRoot(dir), "/do/eng");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("THE MERGE LAW: an overlay pinning one key keeps the tracked defaults (the fresh-clone receipt)", () => {
    // pass-4 of the fresh-clone probe (2026-10-15): a stranger's
    // minimal overlay — a private port, nothing else — erased
    // models.read_root under replacement semantics; the door blamed
    // the tracked file that still carried it
    const dir = repoDir(
      {},
      {
        models: { read_root: "data/models", download_root: "data/models" },
        engines: { comfyui: { base: "image-gen/comfyui", port: 8188 } },
      },
    );
    try {
      mkdirSync(join(dir, "data"), { recursive: true });
      writeFileSync(
        join(dir, "data", "inference.local.json"),
        JSON.stringify({ engines: { comfyui: { port: 42323 } } }),
      );
      assert.equal(
        loadStoreRoot(dir),
        join(dir, "data/models/image-gen/comfyui"),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("null endpoint keys inherit the root", () => {
    const dir = repoDir(
      { model_download_path: null, model_base_path: null },
      {
        models: { read_root: "/r", download_root: "/d" },
        engines: { comfyui: { base: "e" } },
      },
    );
    try {
      assert.equal(loadStoreRoot(dir), "/d/e");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("all-unset refuses no-store-root", () => {
    const dir = repoDir({}, { models: { read_root: "/r" } });
    try {
      loadStoreRoot(dir);
      assert.fail("must throw");
    } catch (err) {
      assert.ok(err instanceof ModelsDoorError);
      assert.equal(err.code, "models/no-store-root");
      assert.equal(err.status, 502);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("a present-but-empty endpoint key refuses LOUD", () => {
    const dir = repoDir(
      { model_download_path: "" },
      { models: { read_root: "/r", download_root: "/d" } },
    );
    try {
      loadStoreRoot(dir);
      assert.fail("must throw");
    } catch (err) {
      assert.ok(err instanceof ModelsDoorError);
      assert.equal(err.code, "models/empty-endpoint-key");
      assert.equal(err.status, 502);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("an unset read_root refuses LOUD", () => {
    const dir = repoDir({}, {});
    try {
      loadStoreRoot(dir);
      assert.fail("must throw");
    } catch (err) {
      assert.ok(err instanceof ModelsDoorError);
      assert.equal(err.code, "models/no-read-root");
      assert.equal(err.status, 502);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("the checkout configs resolve with no env seam (V8: the pin is the apply-time config read)", () => {
    assert.equal(loadStoreRoot(findRepoRoot(process.cwd())), LIVE_STORE);
  });
});

describe("provisionsForFamily (the live table)", () => {
  test("an unknown family refuses 404", async () => {
    try {
      await provisionsForFamily("no-such-family");
      assert.fail("must throw");
    } catch (err) {
      assert.ok(err instanceof ModelsDoorError);
      assert.equal(err.code, "models/unknown-family");
      assert.equal(err.status, 404);
    }
  });
  test("a provision-less family reads absent ≡ empty", async () => {
    // 2026-10-12 ghost-debt: anima and seedvr2_ema now provision
    // their lane weights; florence2 still declares none (the
    // pack-supplied weights ride the vendored pack's own contract)
    assert.deepEqual(await provisionsForFamily("florence2"), []);
  });
  test("kimodo carries the skin row", async () => {
    const rows = await provisionsForFamily("kimodo");
    const skin = rows.find((r) => r.name === "skin_standard.npz");
    assert.ok(skin !== undefined);
    assert.equal(skin.folder, "somaskel77");
    assert.equal(
      skin.sha256,
      "90ee2cdf50f168382a7dd7e9c88b118298aba0aca4b72022080c89c4bab0ceb2",
    );
  });
  test("a family's cell artifacts join its provisions (krea-2's UNET rows)", async () => {
    // the union loop's live arm (da89924c landed it with no cell
    // that carried an artifact under any spec's read — the audit
    // of 2026-10-13 pins the real table's own row)
    const rows = await provisionsForFamily("krea-2");
    const unet = rows.find((r) => r.name === "krea2_turbo_int8_convrot.safetensors");
    assert.ok(unet !== undefined);
    assert.equal(unet.folder, "diffusion_models");
    assert.equal(
      unet.url,
      "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/diffusion_models/krea2_turbo_int8_convrot.safetensors",
    );
    assert.equal(unet.sha256, "8e4eeda70dd5037ab1ba2bef6b417f9f901e26093117cf397f741fc1fdaaf3f1");
    assert.equal(unet.size_bytes, 13492686496);
    // the provisions channel rides first (the union's order)
    assert.equal(rows[0]!.name, "qwen3vl_4b_fp8_scaled.safetensors");
  });
  test("the union loop dedupes shared cells and strips the query off the basename", async () => {
    // a probe family on the real singleton: the dedupe hit (two
    // cells sharing url+dest_sub) and the C5 basename cut (a url
    // whose ? precedes the filename) — both arms the live table
    // never rides. The recipe↔weights law makes every cell legal:
    // the atom lane_inputs spell both loaded names.
    const { modelsService } = await import("@melite/comfyui-cordis/models-service");
    const svc = modelsService();
    const { actions: _a, defaults: _d, ...base } =
      svc.getModel("krea-2") as unknown as Record<string, unknown>;
    const probe = structuredClone(base) as Record<string, unknown>;
    const hex = "1".repeat(64);
    probe["id"] = "probe-union-family";
    probe["label"] = "Union Probe";
    probe["provisions"] = [];
    probe["lane_inputs"] = { unet: "dup.safetensors", vae: "a?b.safetensors" };
    probe["variants"] = [
      { id: "v1", label: "", description: "", hint: "", group: "Variant", route: "", engine: "", order: 0, resolver_defaults: {}, lane_inputs: {}, wire_defaults: null,
        cells: [{ quant: "q8", label: "", source: null, description: "", route: "", engine: "", vram_peak_gb: 0, resolver_defaults: {}, hide_from_dropdown: false, artifact: null }] },
      { id: "v2", label: "", description: "", hint: "", group: "Variant", route: "", engine: "", order: 1, resolver_defaults: {}, lane_inputs: {}, wire_defaults: null,
        cells: [
          { quant: "q8", label: "", source: null, description: "", route: "", engine: "", vram_peak_gb: 0, resolver_defaults: {}, hide_from_dropdown: false,
            artifact: { source_url: "https://host/dup.safetensors", dest_sub: "unet", dest_root: "COMFYUI_ROOT", size_bytes: 1024, sha256: hex } },
          { quant: "q8", label: "", source: null, description: "", route: "", engine: "", vram_peak_gb: 0, resolver_defaults: {}, hide_from_dropdown: false,
            artifact: { source_url: "https://host/dup.safetensors", dest_sub: "unet", dest_root: "COMFYUI_ROOT", size_bytes: 1024, sha256: hex } },
        ] },
      { id: "v3", label: "", description: "", hint: "", group: "Variant", route: "", engine: "", order: 2, resolver_defaults: {}, lane_inputs: {}, wire_defaults: null,
        cells: [
          { quant: "q8", label: "", source: null, description: "", route: "", engine: "", vram_peak_gb: 0, resolver_defaults: {}, hide_from_dropdown: false,
            artifact: { source_url: "https://host/a?b.safetensors", dest_sub: "unet", dest_root: "COMFYUI_ROOT", size_bytes: 1024, sha256: hex } },
        ] },
    ];
    const off = svc.registerFamily(probe as never);
    try {
      assert.deepEqual(await provisionsForFamily("probe-union-family"), [
        { name: "dup.safetensors", url: "https://host/dup.safetensors", folder: "unet", sha256: hex, size_bytes: 1024 },
        { name: "a", url: "https://host/a?b.safetensors", folder: "unet", sha256: hex, size_bytes: 1024 },
      ]);
    } finally {
      off();
    }
  });
});

describe("resolveDest + sha256OfFile", () => {
  test("joins the DECL place (the provision layout)", () => {
    assert.equal(
      resolveDest(LIVE_STORE, "somaskel77", "skin_standard.npz"),
      `${LIVE_STORE}/somaskel77/skin_standard.npz`,
    );
  });
  test("an empty folder serves the root", () => {
    assert.equal(resolveDest("/r", "", "f.npz"), "/r/f.npz");
  });
  test("a hostile folder refuses LOUD", () => {
    try {
      resolveDest("/r", "a/../../x", "f.npz");
      assert.fail("must throw");
    } catch (err) {
      assert.ok(err instanceof ModelsDoorError);
      assert.equal(err.code, "models/bad-provision-folder");
      assert.equal(err.status, 502);
    }
  });
  test("sha256OfFile hashes the bytes on disk", () => {
    const dir = tmpRoot();
    const file = join(dir, "b.bin");
    writeFileSync(file, GOOD_BYTES);
    try {
      assert.equal(sha256OfFile(file), GOOD_SHA);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("THE SINGLE-OPEN LAW (round-13 audits U-E1..U-E8)", () => {
  test("a same-dest row with a DIFFERENT sha never rides another row's mark", async () => {
    // U-E1: the verified cache keyed dest only — two DECL rows
    // resolving to one dest with different shas made the second
    // serve the first's bytes as immutable. The mark keys dest+sha.
    const root = tmpRoot();
    const dest = join(root, "somaskel77", "skin_standard.npz");
    mkdirSync(join(root, "somaskel77"), { recursive: true });
    writeFileSync(dest, GOOD_BYTES);
    const cache = createVerifyCache();
    try {
      const h = createHandler(deps({ cache, storeRoot: () => root }));
      const first = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(first.status, 200);
      assert.equal(cache.isVerified(dest, GOOD_SHA), true);
      // A second DECL row names the same dest with a different sha:
      // its mark must MISS (never the first row's hit), and the
      // heal arm must refuse — the bytes on disk are the wrong sha.
      const otherSha = createHash("sha256").update(Buffer.from("other-bytes")).digest("hex");
      assert.equal(cache.isVerified(dest, otherSha), false);
      const rows: ProvisionRow[] = [row({ sha256: otherSha })];
      const provisioning = throwingProvisioning();
      const h2 = createHandler(
        deps({ cache, storeRoot: () => root, provisions: async () => rows, provisioning }),
      );
      const second = await get(h2, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(second.status, 503);
      assert.ok(second.body.includes("models/provision-fault"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a symlink at the dest refuses (never the linked bytes)", async () => {
    // U-E4: openSync follows symlinks — a link someone placed at
    // the dest served whatever it pointed at. O_NOFOLLOW refuses.
    const root = tmpRoot();
    const elsewhere = join(root, "outside.bin");
    const dest = join(root, "somaskel77", "skin_standard.npz");
    mkdirSync(join(root, "somaskel77"), { recursive: true });
    writeFileSync(elsewhere, GOOD_BYTES);
    symlinkSync(elsewhere, dest);
    try {
      const h = createHandler(deps({ storeRoot: () => root }));
      const out = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      // O_NOFOLLOW refuses at the open: 502 models/symlink-refused,
      // the door's own voice (never the linked bytes, never a heal)
      assert.equal(out.status, 502);
      assert.ok(out.body.includes("models/symlink-refused"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a DECL name that escapes the mount refuses", () => {
    // U-E5: the folder was confined while the name rode unchecked.
    for (const hostile of ["..", "a/b", "", "."]) {
      assert.throws(
        () => resolveDest("/store", "somaskel77", hostile),
        (err: unknown) =>
          err instanceof ModelsDoorError && err.code === "models/bad-provision-name",
      );
    }
  });

  test("a thrown provisioning.ensure maps to models/provision-fault, never an opaque 500", async () => {
    // U-E8: the ensure call sat outside the door's error mapping —
    // a thrown fault surfaced as the last-ditch 500.
    const root = tmpRoot();
    const provisioning = throwingProvisioning();
    try {
      const h = createHandler(deps({ storeRoot: () => root, provisioning }));
      const out = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(out.status, 503);
      assert.ok(out.body.includes("models/provision-fault"));
      assert.ok(out.body.includes("the wiring is faulted on purpose"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("the serve streams in chunks off one open handle", async () => {
    // U-E3: the whole-file readFileSync OOMs on multi-GB rows; the
    // serve must stream chunk-by-chunk off the SAME handle the hash
    // judged (content-length rides the verified fstat size).
    const root = tmpRoot();
    const folder = join(root, "somaskel77");
    mkdirSync(folder, { recursive: true });
    const big = Buffer.concat([
      GOOD_BYTES,
      Buffer.alloc(5 * 1024 * 1024, 7),
      Buffer.from("tail-marker"),
    ]);
    const bigSha = createHash("sha256").update(big).digest("hex");
    writeFileSync(join(folder, "big.bin"), big);
    const rows: ProvisionRow[] = [row({ name: "big.bin", sha256: bigSha })];
    try {
      const h = createHandler(deps({ storeRoot: () => root, provisions: async () => rows }));
      const res = fakeRes();
      let writes = 0;
      const streaming = {
        ...res,
        write(chunk: Uint8Array): boolean {
          writes += 1;
          return res.write(chunk);
        },
      };
      await h(fakeReq("GET", "/v1/models/k/provisions/big.bin"), streaming);
      assert.equal(res.seen.status, 200);
      assert.equal(res.seen.headers["content-length"], String(big.length));
      assert.deepEqual(res.seen.body, big);
      assert.ok(writes > 1, "a 5MB row rides multiple chunks, never one Buffer");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a url with both markers cuts at the FIRST (no phantom ?query name)", () => {
    // U-E6: Math.max kept "?token=1" inside the derived name when
    // both ? and # rode one url — a phantom row keyed by a name the
    // serve path could never answer.
    assert.equal(artifactBasename("https://example.invalid/skin.npz?token=1#frag"), "skin.npz");
    assert.equal(artifactBasename("https://example.invalid/skin.npz"), "skin.npz");
    assert.equal(artifactBasename("https://example.invalid/skin.npz#frag"), "skin.npz");
  });
});

describe("VerifyCache.isVerified", () => {
  test("an uncached dest is unverified", () => {
    assert.equal(
      createVerifyCache().isVerified(join(tmpdir(), "estate-models-never-here.bin"), GOOD_SHA),
      false,
    );
  });
  test("a directory at the dest drops the cache row", async () => {
    const root = tmpRoot();
    const dest = join(root, "somaskel77", "skin_standard.npz");
    mkdirSync(join(root, "somaskel77"), { recursive: true });
    writeFileSync(dest, GOOD_BYTES);
    try {
      const cache = createVerifyCache();
      const h = createHandler(deps({ cache, storeRoot: () => root }));
      const first = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(first.status, 200);
      assert.equal(cache.isVerified(dest, GOOD_SHA), true);
      rmSync(dest);
      mkdirSync(dest);
      assert.equal(cache.isVerified(dest, GOOD_SHA), false);
      // Row dropped: the no-cache arm answers the same.
      assert.equal(cache.isVerified(dest, GOOD_SHA), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("VerifyCache.acquireRow", () => {
  test("an unpinned row refuses before the wire", async () => {
    let calls = 0;
    try {
      await createVerifyCache().acquireRow(
        row({ sha256: undefined }),
        join(tmpRoot(), "f.npz"),
        async () => {
          calls += 1;
          return { status: 200, body: webBody(GOOD_BYTES) };
        },
      );
      assert.fail("must throw");
    } catch (err) {
      assert.ok(err instanceof ModelsDoorError);
      assert.equal(err.code, "models/unpinned-provision");
      assert.equal(err.status, 502);
      assert.equal(calls, 0);
    }
  });
});

describe("createHandler", () => {
  test("non-GET/HEAD is 405", async () => {
    const res = fakeRes();
    await createHandler(deps())(fakeReq("POST", "/v1/models/k/provisions/f"), res);
    assert.equal(res.seen.status, 405);
    assert.equal(res.seen.headers["allow"], "GET, HEAD");
  });
  test("a bad path is 404", async () => {
    const seen = await get(createHandler(deps()), "/v1/models/nope");
    assert.equal(seen.status, 404);
    // one refusal shape (audit U-S): the body carries the message
    // beside the code, never a bare {"error"} ad-hoc body
    assert.deepEqual(JSON.parse(seen.body.toString()), {
      error: "models/not-found",
      message: "the route is /v1/models/<family>/provisions/<name>",
    });
  });
  test("a missing url degrades to / (404, never a throw)", async () => {
    const res = fakeRes();
    await createHandler(deps())(fakeReq("GET"), res);
    assert.equal(res.seen.status, 404);
  });
  test("an unknown family voices the DECL catalog", async () => {
    const h = createHandler(
      deps({
        provisions: async () => {
          throw new ModelsDoorError(404, "models/unknown-family", "nope");
        },
      }),
    );
    const seen = await get(h, "/v1/models/ghost/provisions/f.npz");
    assert.equal(seen.status, 404);
    assert.equal(JSON.parse(seen.body.toString()).error, "models/unknown-family");
  });
  test("an unknown provision voices the family catalog", async () => {
    const seen = await get(
      createHandler(deps()),
      "/v1/models/kimodo/provisions/ghost.npz",
    );
    assert.equal(seen.status, 404);
    assert.equal(
      JSON.parse(seen.body.toString()).error,
      "models/unknown-provision",
    );
  });
  test("a hostile DECL folder refuses LOUD", async () => {
    const root = tmpRoot();
    try {
      const h = createHandler(
        deps({
          storeRoot: () => root,
          provisions: async () => [row({ folder: "../escape" })],
        }),
      );
      const seen = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(seen.status, 502);
      assert.equal(
        JSON.parse(seen.body.toString()).error,
        "models/bad-provision-folder",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  test("an unpinned row refuses before mount and wire", async () => {
    let calls = 0;
    const root = tmpRoot();
    try {
      const h = createHandler(
        deps({
          storeRoot: () => root,
          provisions: async () => [row({ sha256: undefined })],
          fetchFn: async () => {
            calls += 1;
            return { status: 200, body: webBody(GOOD_BYTES) };
          },
        }),
      );
      const seen = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(seen.status, 502);
      assert.equal(
        JSON.parse(seen.body.toString()).error,
        "models/unpinned-provision",
      );
      assert.equal(calls, 0);
      assert.equal(
        existsSync(join(root, "somaskel77", "skin_standard.npz")),
        false,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  test("a throwing storeRoot voices its code", async () => {
    const h = createHandler(
      deps({
        storeRoot: () => {
          throw new ModelsDoorError(502, "models/no-store-root", "unset");
        },
      }),
    );
    const seen = await get(h, "/v1/models/k/provisions/skin_standard.npz");
    assert.equal(seen.status, 502);
    assert.equal(JSON.parse(seen.body.toString()).error, "models/no-store-root");
  });
  test("a foreign seam throw is a LOUD 500", async () => {
    const h = createHandler(
      deps({
        storeRoot: () => {
          throw new Error("disk exploded");
        },
      }),
    );
    const seen = await get(h, "/v1/models/k/provisions/skin_standard.npz");
    assert.equal(seen.status, 500);
    // the last-ditch 500 rides the unified refusal shape with the
    // fault's own message (audit U-S) — loud, named, never bare
    assert.deepEqual(JSON.parse(seen.body.toString()), {
      error: "models/internal",
      message: "disk exploded",
    });
  });
  test("a foreign throw past committed headers destroys", async () => {
    const h = createHandler(
      deps({
        storeRoot: () => {
          throw new Error("disk exploded");
        },
      }),
    );
    const res = fakeRes(true);
    await h(fakeReq("GET", "/v1/models/k/provisions/skin_standard.npz"), res);
    assert.equal(res.seen.destroyed, true);
    assert.equal(res.seen.ended, false);
  });

  test("miss + download raise is 502 (nothing lands)", async () => {
    const root = tmpRoot();
    try {
      const h = createHandler(
        deps({
          storeRoot: () => root,
          fetchFn: async () => {
            throw new Error("net down");
          },
        }),
      );
      const seen = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(seen.status, 502);
      assert.equal(JSON.parse(seen.body.toString()).error, "models/acquire-refused");
      assert.equal(
        existsSync(join(root, "somaskel77", "skin_standard.npz")),
        false,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  const refusalCases: Array<{ label: string; stub: FetchFn }> = [
    {
      label: "http-150",
      stub: async () => ({ status: 150, body: webBody(GOOD_BYTES) }),
    },
    {
      label: "http-404",
      stub: async () => ({ status: 404, body: webBody(GOOD_BYTES) }),
    },
    {
      label: "null-body",
      stub: async () => ({ status: 200, body: null }),
    },
  ];
  for (const { label, stub } of refusalCases) {
    test(`miss + ${label} is 502 acquire-refused`, async () => {
      const root = tmpRoot();
      try {
        const h = createHandler(deps({ storeRoot: () => root, fetchFn: stub }));
        const seen = await get(h, "/v1/models/k/provisions/skin_standard.npz");
        assert.equal(seen.status, 502);
        assert.equal(
          JSON.parse(seen.body.toString()).error,
          "models/acquire-refused",
        );
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  }

  test("miss + bad bytes is 502 sha-mismatch (nothing lands)", async () => {
    const root = tmpRoot();
    try {
      const h = createHandler(
        deps({ storeRoot: () => root, fetchFn: fetchOk(BAD_BYTES) }),
      );
      const seen = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(seen.status, 502);
      assert.equal(JSON.parse(seen.body.toString()).error, "models/sha-mismatch");
      assert.equal(
        existsSync(join(root, "somaskel77", "skin_standard.npz")),
        false,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("drift + bad distribution is 502 sha-mismatch (nothing lands)", async () => {
    const root = tmpRoot();
    const dest = join(root, "somaskel77", "skin_standard.npz");
    mkdirSync(join(root, "somaskel77"), { recursive: true });
    writeFileSync(dest, BAD_BYTES);
    try {
      const h = createHandler(
        deps({ storeRoot: () => root, fetchFn: fetchOk(BAD_BYTES) }),
      );
      const seen = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(seen.status, 502);
      assert.equal(JSON.parse(seen.body.toString()).error, "models/sha-mismatch");
      // The drift was dropped and the bad re-land refused: bare place.
      assert.equal(existsSync(dest), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("miss + good bytes acquires then serves immutable", async () => {
    const root = tmpRoot();
    let calls = 0;
    const counting: FetchFn = async () => {
      calls += 1;
      return { status: 200, body: webBody(GOOD_BYTES) };
    };
    const cache = createVerifyCache();
    try {
      const h = createHandler(deps({ cache, storeRoot: () => root, fetchFn: counting }));
      const seen = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(seen.status, 200);
      assert.deepEqual(seen.body, GOOD_BYTES);
      assert.equal(seen.headers["content-type"], "application/octet-stream");
      assert.equal(seen.headers["content-length"], String(GOOD_BYTES.length));
      assert.equal(
        seen.headers["cache-control"],
        "public, max-age=31536000, immutable",
      );
      // One materialization (the heal re-check hits the verified
      // cache, never the wire twice).
      assert.equal(calls, 1);
      // The verified cache holds: the second request serves hit.
      const again = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(again.status, 200);
      assert.deepEqual(again.body, GOOD_BYTES);
      assert.equal(calls, 1);
      assert.equal(
        cache.isVerified(join(root, "somaskel77", "skin_standard.npz"), GOOD_SHA),
        true,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a stampede for one missing file downloads ONCE", async () => {
    const root = tmpRoot();
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const slow: FetchFn = async () => {
      calls += 1;
      await gate;
      return { status: 200, body: webBody(GOOD_BYTES) };
    };
    try {
      const h = createHandler(deps({ storeRoot: () => root, fetchFn: slow }));
      const a = fakeRes();
      const b = fakeRes();
      const pa = h(fakeReq("GET", "/v1/models/k/provisions/skin_standard.npz"), a);
      const pb = h(fakeReq("GET", "/v1/models/k/provisions/skin_standard.npz"), b);
      await new Promise((r) => setTimeout(r, 10));
      release();
      await pa;
      await pb;
      assert.equal(calls, 1);
      assert.equal(a.seen.status, 200);
      assert.equal(b.seen.status, 200);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a seeded file serves without touching fetch", async () => {
    const root = tmpRoot();
    const dest = join(root, "somaskel77", "skin_standard.npz");
    mkdirSync(join(root, "somaskel77"), { recursive: true });
    writeFileSync(dest, GOOD_BYTES);
    try {
      let calls = 0;
      const h = createHandler(
        deps({
          storeRoot: () => root,
          fetchFn: async () => {
            calls += 1;
            return { status: 200, body: webBody(GOOD_BYTES) };
          },
        }),
      );
      const seen = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(seen.status, 200);
      assert.deepEqual(seen.body, GOOD_BYTES);
      assert.equal(calls, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a stale mount heals via re-acquire", async () => {
    const root = tmpRoot();
    const dest = join(root, "somaskel77", "skin_standard.npz");
    mkdirSync(join(root, "somaskel77"), { recursive: true });
    writeFileSync(dest, BAD_BYTES);
    try {
      const h = createHandler(deps({ storeRoot: () => root, fetchFn: fetchOk() }));
      const seen = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(seen.status, 200);
      assert.deepEqual(seen.body, GOOD_BYTES);
      assert.deepEqual(readFileSync(dest), GOOD_BYTES);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a deleted file drops its cache row and re-acquires", async () => {
    const root = tmpRoot();
    const dest = join(root, "somaskel77", "skin_standard.npz");
    mkdirSync(join(root, "somaskel77"), { recursive: true });
    writeFileSync(dest, GOOD_BYTES);
    const cache = createVerifyCache();
    try {
      const h = createHandler(deps({ cache, storeRoot: () => root, fetchFn: fetchOk() }));
      const first = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(first.status, 200);
      rmSync(dest);
      // The cache row drops on the missing stat (never a stale hit).
      assert.equal(cache.isVerified(dest, GOOD_SHA), false);
      const second = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(second.status, 200);
      assert.deepEqual(second.body, GOOD_BYTES);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("stat drift drops the verified row", async () => {
    const root = tmpRoot();
    const dest = join(root, "somaskel77", "skin_standard.npz");
    mkdirSync(join(root, "somaskel77"), { recursive: true });
    writeFileSync(dest, GOOD_BYTES);
    const cache = createVerifyCache();
    try {
      const h = createHandler(deps({ cache, storeRoot: () => root, fetchFn: fetchOk() }));
      const first = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(first.status, 200);
      assert.equal(cache.isVerified(dest, GOOD_SHA), true);
      // Drift the bytes in place (same name, new identity): the
      // cache row must drop.
      writeFileSync(dest, Buffer.concat([GOOD_BYTES, Buffer.from("x")]));
      assert.equal(cache.isVerified(dest, GOOD_SHA), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("HEAD serves the head only", async () => {
    const root = tmpRoot();
    try {
      const h = createHandler(deps({ storeRoot: () => root, fetchFn: fetchOk() }));
      const res = fakeRes();
      await h(fakeReq("HEAD", "/v1/models/k/provisions/skin_standard.npz"), res);
      assert.equal(res.seen.status, 200);
      assert.equal(res.seen.body.length, 0);
      assert.equal(res.seen.headers["content-length"], String(GOOD_BYTES.length));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("live seams", () => {
  test("liveFetchDirect narrows a real response", async () => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/octet-stream" });
      res.end(GOOD_BYTES);
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    try {
      const port = (server.address() as AddressInfo).port;
      const out = await liveFetchDirect(
        `http://127.0.0.1:${String(port)}/skin.npz`,
      );
      assert.equal(out.status, 200);
      assert.ok(out.body !== null);
      assert.deepEqual(
        Buffer.from(await new Response(out.body).arrayBuffer()),
        GOOD_BYTES,
      );
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});

describe("apply", () => {
  test("the plugin is named and prefixed", () => {
    assert.equal(name, "estate-models");
    assert.equal(MODELS_PREFIX, "/v1/models");
  });
  test("a headless mount logs and stays unmounted", () => {
    const lines: string[] = [];
    const fakeCtx = {
      get: (_key: string, _optional: boolean) => undefined,
      effect: (_fn: () => void) => {
        assert.fail("no effect without a seat");
      },
      logger: {
        info: (msg: string) => {
          lines.push(msg);
        },
      },
    };
    apply(fakeCtx as never);
    assert.equal(lines.length, 1);
    assert.ok(lines[0].includes("stays unmounted"));
  });
  test("a web mount registers the prefix route", async () => {
    type Handler = (req: DoorRequest, res: DoorResponse) => Promise<void>;
    const rows: Array<{ kind: string; path: string; handler: Handler }> = [];
    const lines: Array<Array<unknown>> = [];
    const fakeCtx = {
      get: (_key: string, _optional: boolean) => ({
        register: (row: { kind: string; path: string; handler: Handler }) => {
          rows.push(row);
          return () => undefined;
        },
      }),
      effect: (fn: () => () => void) => fn(),
      logger: {
        info: (...args: Array<unknown>) => {
          lines.push(args);
        },
      },
    };
    apply(fakeCtx as never);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].kind, "prefix");
    assert.equal(rows[0].path, "/v1/models");
    assert.equal(typeof rows[0].handler, "function");
    assert.equal(lines.length, 1);
    assert.ok(String(lines[0][0]).includes("estate-models: serving"));
    assert.equal(lines[0][1], "/v1/models");
    // The wired handler voices the live table (unknown family 404).
    const seen = await get(rows[0].handler, "/v1/models/ghost/provisions/f.npz");
    assert.equal(seen.status, 404);
  });
});
