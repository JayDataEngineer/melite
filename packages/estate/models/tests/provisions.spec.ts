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
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { ProvisionRow } from "@melite/comfyui-cordis/model-contract";
import {
  acquireRow,
  apply,
  createHandler,
  findRepoRoot,
  isVerified,
  liveFetchDirect,
  liveStoreRoot,
  loadStoreRoot,
  MODELS_PREFIX,
  ModelsDoorError,
  name,
  parseTarget,
  provisionsForFamily,
  resetInflightForTests,
  resetVerifiedForTests,
  resolveDest,
  resolveStoreRoot,
  sha256OfFile,
  STORE_ROOT_ENV,
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
  return {
    headersSent,
    writeHead(status: number, headers: Record<string, string>): void {
      seen.status = status;
      seen.headers = headers;
    },
    end(body?: unknown): void {
      seen.ended = true;
      if (body !== undefined)
        seen.body = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
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
  return {
    storeRoot: () => {
      throw new Error("storeRoot not stubbed");
    },
    fetchFn: fetchOk(),
    provisions: async () => [row()],
    ...over,
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

let savedEnv: string | undefined;

beforeEach(() => {
  savedEnv = process.env[STORE_ROOT_ENV];
  delete process.env[STORE_ROOT_ENV];
  resetVerifiedForTests();
  resetInflightForTests();
});

afterEach(() => {
  if (savedEnv !== undefined) process.env[STORE_ROOT_ENV] = savedEnv;
  else delete process.env[STORE_ROOT_ENV];
  resetVerifiedForTests();
  resetInflightForTests();
});

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

describe("loadStoreRoot + resolveStoreRoot", () => {
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
      assert.equal(resolveStoreRoot(dir), "/d/eng");
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
      assert.equal(loadStoreRoot(dir), "eng");
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
  test("the env override wins (trimmed)", () => {
    process.env[STORE_ROOT_ENV] = "  /tmp/override-root  ";
    assert.equal(resolveStoreRoot(), "/tmp/override-root");
  });
  test("empty env falls through to the configs", () => {
    process.env[STORE_ROOT_ENV] = "";
    assert.equal(resolveStoreRoot(), LIVE_STORE);
  });
  test("unset env resolves the repo configs", () => {
    assert.equal(resolveStoreRoot(), LIVE_STORE);
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
    assert.deepEqual(await provisionsForFamily("anima"), []);
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

describe("isVerified", () => {
  test("an uncached dest is unverified", () => {
    assert.equal(
      isVerified(join(tmpdir(), "estate-models-never-here.bin")),
      false,
    );
  });
  test("a directory at the dest drops the cache row", async () => {
    const root = tmpRoot();
    const dest = join(root, "somaskel77", "skin_standard.npz");
    mkdirSync(join(root, "somaskel77"), { recursive: true });
    writeFileSync(dest, GOOD_BYTES);
    try {
      const h = createHandler(deps({ storeRoot: () => root }));
      const first = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(first.status, 200);
      assert.equal(isVerified(dest), true);
      rmSync(dest);
      mkdirSync(dest);
      assert.equal(isVerified(dest), false);
      // Row dropped: the no-cache arm answers the same.
      assert.equal(isVerified(dest), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("acquireRow", () => {
  test("an unpinned row refuses before the wire", async () => {
    let calls = 0;
    try {
      await acquireRow(
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
    assert.deepEqual(JSON.parse(seen.body.toString()), {
      error: "models/not-found",
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
    assert.deepEqual(JSON.parse(seen.body.toString()), {
      error: "models/internal",
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
    try {
      const h = createHandler(deps({ storeRoot: () => root, fetchFn: counting }));
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
      assert.equal(isVerified(join(root, "somaskel77", "skin_standard.npz")), true);
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
    try {
      const h = createHandler(deps({ storeRoot: () => root, fetchFn: fetchOk() }));
      const first = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(first.status, 200);
      rmSync(dest);
      // The cache row drops on the missing stat (never a stale hit).
      assert.equal(isVerified(dest), false);
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
    try {
      const h = createHandler(deps({ storeRoot: () => root, fetchFn: fetchOk() }));
      const first = await get(h, "/v1/models/k/provisions/skin_standard.npz");
      assert.equal(first.status, 200);
      assert.equal(isVerified(dest), true);
      // Drift the bytes in place (same name, new identity): the
      // cache row must drop.
      writeFileSync(dest, Buffer.concat([GOOD_BYTES, Buffer.from("x")]));
      assert.equal(isVerified(dest), false);
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
  test("liveStoreRoot resolves the endpoint download_path", () => {
    assert.equal(liveStoreRoot(), LIVE_STORE);
  });
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
