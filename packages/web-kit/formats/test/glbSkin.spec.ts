// glbSkin.spec.ts — the SOMAX-rigged GLB → SomaSkin adapter.
// The three.js parse step is mocked (parsing is three's job); every
// branch of OUR adapter runs in node: rig discovery (skip/error arms),
// the column-major → row-major bind extraction, and the multi-mesh
// merge with index-base offsets. Fetch is stubbed (no network).
import { describe, it, vi, afterEach } from "vitest";
import assert from "node:assert/strict";
import * as THREE from "three";

const parseMock = vi.hoisted(() => vi.fn());

vi.mock("../src/glbLoad.ts", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../src/glbLoad.ts")>();
  return { ...orig, makeGLTFLoader: () => ({ parse: parseMock }) };
});

import { loadGlbSkin, NotSomaxGlbError } from "../src/glbSkin.ts";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  parseMock.mockReset();
});

function mockFetchBytes(bytes: Uint8Array, status = 200): void {
  globalThis.fetch = (async () => ({
    ok: status >= 200 && status < 300,
    status,
    arrayBuffer: async () => bytes.slice().buffer as ArrayBuffer,
  })) as unknown as typeof fetch;
}

interface MeshOpts {
  verts?: number;
  indexed?: boolean;
  skin?: "full" | "none" | "index-only" | "small-index" | "small-weight";
  bones?: number;
  skeleton?: "ok" | "none" | "bare";
  nulledGeometry?: boolean;
}

function somaxMesh(opts: MeshOpts = {}): THREE.SkinnedMesh {
  const n = opts.verts ?? 2;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos[i * 3] = i * 10;
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  if (opts.indexed !== false) {
    geo.setIndex(n >= 3 ? [0, 1, 2] : [0, 1, 0]);
  }
  const skin = opts.skin ?? "full";
  const put = (name: string, size: number): void => {
    const arr = new Float32Array(n * size);
    if (name === "skinWeight" && n > 0) arr[0] = 1;
    geo.setAttribute(name, new THREE.BufferAttribute(arr, size));
  };
  if (skin === "full" || skin === "small-weight") put("skinIndex", 4);
  if (skin === "small-index") put("skinIndex", 3);
  if (skin === "full" || skin === "small-index" || skin === "index-only") {
    if (skin !== "index-only") put("skinWeight", skin === "small-index" ? 4 : 4);
  }
  if (skin === "small-weight") put("skinWeight", 3);
  if (skin === "index-only") put("skinIndex", 4);
  const mesh = new THREE.SkinnedMesh(geo, new THREE.MeshBasicMaterial());
  mesh.name = "body";
  if (opts.skeleton === "none") {
    (mesh as unknown as { skeleton?: unknown }).skeleton = undefined;
  } else if (opts.skeleton === "bare") {
    (mesh as unknown as { skeleton?: unknown }).skeleton = {};
  } else {
    const bones: THREE.Bone[] = [];
    for (let i = 0; i < (opts.bones ?? 77); i++) bones.push(new THREE.Bone());
    mesh.skeleton = new THREE.Skeleton(bones);
  }
  if (opts.nulledGeometry) {
    (mesh as unknown as { geometry: null }).geometry = null;
  }
  return mesh;
}

function resolveScene(...objs: THREE.Object3D[]): void {
  const group = new THREE.Group();
  for (const o of objs) group.add(o);
  parseMock.mockImplementation(
    (
      _buf: unknown,
      _path: unknown,
      onLoad: (gltf: unknown) => void,
    ) => {
      onLoad({ scene: group });
    },
  );
}

async function loadWith(...objs: THREE.Object3D[]) {
  mockFetchBytes(new Uint8Array([1, 2, 3, 4]));
  resolveScene(...objs);
  return loadGlbSkin("https://example.com/c.glb");
}

describe("loadGlbSkin failures", () => {
  it("throws on fetch failure", async () => {
    mockFetchBytes(new Uint8Array(0), 404);
    await assert.rejects(loadGlbSkin("u"), /Failed to fetch character GLB: 404/);
  });

  it("propagates loader parse errors", async () => {
    mockFetchBytes(new Uint8Array([9]));
    parseMock.mockImplementation(
      (_b: unknown, _p: unknown, _ok: unknown, bad: (e: unknown) => void) => {
        bad(new Error("truncated glb"));
      },
    );
    await assert.rejects(loadGlbSkin("u"), /truncated glb/);
  });

  it("rejects scenes with no 77-joint skinned mesh", async () => {
    // Static mesh (skips the isSkinnedMesh arm) + nulled-geometry skinned
    // mesh (skips the geometry arm) + short rig + skeletonless + bare.
    const plain = new THREE.Mesh(new THREE.BufferGeometry());
    await assert.rejects(
      loadWith(plain, somaxMesh({ nulledGeometry: true })),
      /no skinned mesh with 77 joints found/,
    );
    await assert.rejects(loadWith(somaxMesh({ bones: 3 })), NotSomaxGlbError);
    await assert.rejects(loadWith(somaxMesh({ skeleton: "none" })), NotSomaxGlbError);
    await assert.rejects(loadWith(somaxMesh({ skeleton: "bare" })), NotSomaxGlbError);
  });

  it("rejects non-triangulated meshes", async () => {
    await assert.rejects(
      loadWith(somaxMesh({ indexed: false })),
      /is not triangulated/,
    );
  });

  it("rejects meshes without skin attributes", async () => {
    await assert.rejects(loadWith(somaxMesh({ skin: "none" })), /no skinIndex/);
    await assert.rejects(loadWith(somaxMesh({ skin: "index-only" })), /no skinIndex/);
  });

  it("rejects non-VEC4 skin attributes", async () => {
    await assert.rejects(loadWith(somaxMesh({ skin: "small-index" })), /3-wide/);
    // The message reports the skinIndex width (4 here, weight is 3).
    await assert.rejects(loadWith(somaxMesh({ skin: "small-weight" })), /4-wide/);
  });

  it("shapes the NotSomaxGlbError contract", () => {
    const err = new NotSomaxGlbError("demo");
    assert.equal(err.name, "NotSomaxGlbError");
    assert.match(err.message, /77-joint SOMA skeleton required.*demo/);
  });
});

describe("loadGlbSkin success", () => {
  it("converts one 77-joint mesh to a SomaSkin", async () => {
    const skin = await loadWith(somaxMesh());
    assert.equal(skin.vertexCount, 2);
    assert.equal(skin.faceCount, 1);
    assert.equal(skin.jointCount, 77);
    assert.equal(skin.influences, 4);
    assert.deepEqual(Array.from(skin.bindVertices), [0, 0, 0, 10, 0, 0]);
    assert.deepEqual(Array.from(skin.faces), [0, 1, 0]);
    assert.equal(skin.lbsIndices.length, 8);
    assert.equal(skin.lbsWeights[0], 1);
    // Identity bone inverses → zero rest joints, identity rest rotations.
    assert.deepEqual(Array.from(skin.restJoints), new Array(77 * 3).fill(0));
    assert.equal(skin.restRots[0], 1);
    assert.equal(skin.restRots[4], 1);
    assert.equal(skin.restRots[8], 1);
    assert.equal(skin.bindRigInv.length, 77 * 16);
    // Fetched bytes reach the loader's parse as-is with an empty path.
    const [buf, path] = parseMock.mock.calls[0] as unknown as [ArrayBuffer, string];
    assert.deepEqual(Array.from(new Uint8Array(buf)), [1, 2, 3, 4]);
    assert.equal(path, "");
  });

  it("merges layered meshes with index-base offsets", async () => {
    const a = somaxMesh({ verts: 2 });
    a.name = "body";
    const b = somaxMesh({ verts: 3 });
    b.name = "outfit";
    const skin = await loadWith(a, b);
    assert.equal(skin.vertexCount, 5);
    assert.equal(skin.faceCount, 2);
    // Second mesh's faces shift by the first mesh's vertex count.
    assert.deepEqual(Array.from(skin.faces), [0, 1, 0, 2, 3, 4]);
    assert.deepEqual(Array.from(skin.bindVertices.subarray(6, 9)), [0, 0, 0]);
    assert.deepEqual(Array.from(skin.bindVertices.subarray(9, 12)), [10, 0, 0]);
  });
});
