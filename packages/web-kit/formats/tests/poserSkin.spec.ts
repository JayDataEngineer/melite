// poserSkin.spec.ts — bind-mesh fetch paths (GET vs POST), the
// per-signature cache, identity-space, and the flat-positions math.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  buildFlatPositions,
  fetchBindMesh,
  fetchIdentitySpace,
} from "../src/poserSkin.ts";
import type { SkinMeshData } from "../src/poserSkin.ts";

const realFetch = globalThis.fetch;
let calls: Array<{ url: string; init?: RequestInit }> = [];

function stubFetch(handler: (url: string, init?: RequestInit) => Response): void {
  calls = [];
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status });
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

const MESH: SkinMeshData = { vertices: [[0, 200, 0]], faces: [[0, 0, 0]] };

describe("fetchBindMesh", () => {
  it("GETs the default anny mesh and caches by signature", async () => {
    stubFetch(() => json(MESH));
    const a = await fetchBindMesh({});
    assert.deepEqual(a, MESH);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/v1\/poser\/mesh\?identity_model=anny/);
    // Same signature hits the cache — no second fetch.
    const b = await fetchBindMesh({ identityModel: undefined });
    assert.deepEqual(b, MESH);
    assert.equal(calls.length, 1);
  });

  it("the cache is BOUNDED — LRU at 16, the oldest signature re-fetches", async () => {
    // The registry-growth law: a slider drag mints a signature per
    // stop and each entry is a full mesh, so the module Map must
    // prune — the 17th signature evicts the first, which re-fetches.
    stubFetch(() => json(MESH));
    // THE DRAIN (audit Z-S2): the cache is module state no test
    // resets, so this wall flushes any earlier test's entries with
    // 16 throwaway signatures first — the sweep below then runs on
    // a deterministic 16-full cache of its own signatures, and the
    // eviction asserts judge the sweep, not the file's test order.
    for (let i = 0; i < 16; i++) {
      await fetchBindMesh({ identityCoeffs: [-1 - i, 0] });
    }
    stubFetch(() => json(MESH)); // fresh call ledger for the sweep
    for (let i = 0; i < 17; i++) {
      await fetchBindMesh({ identityCoeffs: [i, 0] });
    }
    assert.equal(calls.length, 17, "17 distinct signatures, 17 fetches");
    // The first signature was evicted; reading it fetches again.
    await fetchBindMesh({ identityCoeffs: [0, 0] });
    assert.equal(calls.length, 18);
    // The LAST signature survived (LRU, not FIFO-of-birth on read).
    await fetchBindMesh({ identityCoeffs: [16, 0] });
    assert.equal(calls.length, 18, "the newest signature stays cached");

    // THE PROMOTION ARM (audit Y-S3): a hit must REFRESH recency —
    // a wall without this arm passes on a plain insertion-order
    // queue too. Cache is {[2,0]..[16,0],[0,0]}: re-read [2,0]
    // (oldest survivor, a hit) then mint one fresh signature. A
    // recency-refreshing cache evicts [3,0] and [2,0] stays; an
    // insertion-order cache evicts [2,0] itself and it re-fetches.
    await fetchBindMesh({ identityCoeffs: [2, 0] });
    assert.equal(calls.length, 18, "[2,0] was cached — the re-read promotes, not fetches");
    await fetchBindMesh({ identityCoeffs: [17, 0] });
    assert.equal(calls.length, 19, "the fresh signature fetches");
    await fetchBindMesh({ identityCoeffs: [2, 0] });
    assert.equal(calls.length, 19, "THE PROMOTION: the re-read [2,0] outlived [3,0]");
    await fetchBindMesh({ identityCoeffs: [3, 0] });
    assert.equal(calls.length, 20, "[3,0] — the never-re-read elder — was the evicted one");
  });

  it("throws on GET failure", async () => {
    stubFetch(() => json({ detail: "nope" }, 404));
    await assert.rejects(fetchBindMesh({ identityModel: "ghost-get" }), /Failed to fetch mesh \(ghost-get\): 404/);
  });

  it("POSTs shaped queries and always sends custom_targets for anny", async () => {
    stubFetch(() => json(MESH));
    const data = await fetchBindMesh({
      identityModel: "anny",
      identityCoeffs: [0.51, 0.44],
      localChanges: { jaw: 0.5, chin: -0.25 },
      customTargets: { zeta: 0.5, alpha: 0.1, mid: 0.3 },
      previewPose: "arms_down",
    });
    assert.deepEqual(data, MESH);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init?.method, "POST");
    const body = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>;
    assert.deepEqual(body, {
      identity_model: "anny",
      preview_pose: "arms_down",
      identity_coeffs: [0.51, 0.44],
      local_changes: { jaw: 0.5, chin: -0.25 },
      custom_targets: { zeta: 0.5, alpha: 0.1, mid: 0.3 },
    });
  });

  it("sends empty custom_targets when anny has none (explicit clear)", async () => {
    stubFetch(() => json(MESH));
    await fetchBindMesh({ identityCoeffs: [0.5] });
    const body = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>;
    assert.deepEqual(body.custom_targets, {});
    assert.equal(body.identity_model, "anny");
  });

  it("omits custom_targets for non-anny models", async () => {
    stubFetch(() => json(MESH));
    await fetchBindMesh({ identityModel: "mhr", identityCoeffs: [0.5], previewPose: "tpose" });
    const body = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>;
    assert.equal("custom_targets" in body, false);
    assert.equal("preview_pose" in body, false);
  });

  it("POSTs localChanges-only queries without identity_coeffs", async () => {
    stubFetch(() => json(MESH));
    await fetchBindMesh({ identityModel: "lc-only", localChanges: { alpha: 1, beta: 2 } });
    const body = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>;
    assert.equal("identity_coeffs" in body, false);
    assert.deepEqual(body.local_changes, { alpha: 1, beta: 2 });
  });

  it("throws on POST failure", async () => {
    stubFetch(() => json({ detail: "bad" }, 400));
    await assert.rejects(
      fetchBindMesh({ identityModel: "anny-fail", identityCoeffs: [1] }),
      /Failed to fetch shaped mesh \(anny-fail\): 400/,
    );
  });

  it("empty coeffs/localChanges take the GET path with pose query", async () => {
    stubFetch(() => json(MESH));
    await fetchBindMesh({
      identityModel: "soma",
      identityCoeffs: [],
      localChanges: {},
      customTargets: {},
      previewPose: "arms_down",
    });
    assert.equal(calls[0].init?.method ?? "GET", "GET");
    assert.match(calls[0].url, /preview_pose=arms_down/);
  });
});

describe("fetchIdentitySpace", () => {
  it("returns the parsed space", async () => {
    stubFetch(() => json({ identity_model: "anny", dims: 3 }));
    const space = await fetchIdentitySpace("anny");
    assert.equal((space as unknown as Record<string, unknown>).dims, 3);
  });

  it("throws on failure", async () => {
    stubFetch(() => json({}, 404));
    await assert.rejects(fetchIdentitySpace("ghost"), /Failed to fetch identity-space \(ghost\): 404/);
  });
});

describe("buildFlatPositions", () => {
  it("converts cm to meters with the floor lift", () => {
    const out = buildFlatPositions({
      vertices: [[100, 170, -50], [0, 160, 0], [5, 180, 5]],
      faces: [],
    });
    // minY = 1.6 → y' = y - 1.6 + 0.02 (Float32 rounding applies).
    const got = Array.from(out);
    const want = [1, 0.12, -0.5, 0, 0.02, 0, 0.05, 0.22, 0.05];
    assert.equal(got.length, want.length);
    for (let i = 0; i < want.length; i++) {
      assert.ok(Math.abs(got[i] - want[i]) < 1e-6, `index ${i}: ${got[i]} ≈ ${want[i]}`);
    }
  });

  it("handles the empty mesh (non-finite minY → 0)", () => {
    assert.equal(buildFlatPositions({ vertices: [], faces: [] }).length, 0);
  });
});
