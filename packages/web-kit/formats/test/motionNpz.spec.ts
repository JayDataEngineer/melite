// motionNpz.spec.ts — the Motion Card's client-side motion engine.
// Node-runnable: THREE is headless math here (Quaternion/Vector3/Matrix4),
// persistence is fetch (mocked) + CompressionStream/Blob/Response (Node
// ships all three). Covers loadMotionNpz (ok/shape/fps arms), the LBS
// precompute pair (incl. chunked yield + cm arms), the cm boundary,
// azimuth ring, SOMA→COCO projection (+degenerate), crc32, the NPZ writer
// (stored/deflated/empty arms + parseNpz round-trip), and patchFrame
// (identity/collapsed/90°/180°-X/180°-Y/leaf/clamp arms).
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  AZIMUTH_PRESETS,
  azimuthCameraPos,
  COCO_TO_SOMA_IDX,
  crc32,
  jointsFromCm,
  jointsToCm,
  loadMotionNpz,
  loadSomaSkin,
  npzToDataUrl,
  patchFrame,
  precomputeDeformedVerts,
  precomputeDeformedVertsChunked,
  scaledArray,
  soma77ToCoco18,
  stepAzimuth,
  vertsToB64,
  writeNpz,
} from "../src/motionNpz.ts";
import type {
  MotionAzimuth,
  MotionNpz,
  NpzEntry,
  SomaSkin,
} from "../src/motionNpz.ts";
import { parseNpz } from "../src/npz.ts";

const realFetch = globalThis.fetch;
const realCS = globalThis.CompressionStream;

afterEach(() => {
  globalThis.fetch = realFetch;
  globalThis.CompressionStream = realCS;
});

const J = 77;

// ── Fixtures ───────────────────────────────────────────────────────────────

function identityRots(T: number): Float32Array {
  const rots = new Float32Array(T * J * 9);
  for (let t = 0; t < T; t++) {
    for (let j = 0; j < J; j++) {
      const b = (t * J + j) * 9;
      rots[b] = 1;
      rots[b + 4] = 1;
      rots[b + 8] = 1;
    }
  }
  return rots;
}

async function motionBytes(
  T = 2,
  fps: number | "empty" | null = 30,
  marker = 1.5,
): Promise<Uint8Array> {
  const joints = new Float32Array(T * J * 3);
  joints[0] = marker;
  const entries: Record<string, NpzEntry> = {
    posed_joints: { data: joints, shape: [T, J, 3] },
    global_rot_mats: { data: identityRots(T), shape: [T, J, 9] },
  };
  if (fps === "empty") entries.fps = { data: new Float32Array(0), shape: [0] };
  else if (fps !== null) entries.fps = { data: new Float32Array([fps]), shape: [1] };
  return writeNpz(entries);
}

function mockFetch(bytes: Uint8Array, status = 200): void {
  globalThis.fetch = (async () =>
    new Response(bytes, { status })) as typeof fetch;
}

/** Two-joint, two-vertex skin with identity binds (deform is pure math). */
function miniSkin(): SomaSkin {
  const bindRigInv = new Float32Array(2 * 16);
  bindRigInv[0] = 1;
  bindRigInv[5] = 1;
  bindRigInv[10] = 1;
  bindRigInv[15] = 1;
  bindRigInv[16] = 1;
  bindRigInv[21] = 1;
  bindRigInv[26] = 1;
  bindRigInv[31] = 1;
  return {
    bindVertices: new Float32Array([0, 0, 0, 1, 0, 0]),
    faces: new Uint32Array(0),
    lbsIndices: new Uint32Array([0, 1, 1, 0]),
    lbsWeights: new Float32Array([1, 0, 0.5, 0.5]),
    bindRigInv,
    restJoints: new Float32Array(6),
    restRots: new Float32Array(18),
    vertexCount: 2,
    faceCount: 0,
    jointCount: 2,
    influences: 2,
  };
}

function miniMotionNpz(T = 2): MotionNpz {
  return {
    posedJoints: new Float32Array(T * J * 3),
    globalRotMats: identityRots(T),
    fps: 30,
    T,
  };
}

// ── loadMotionNpz ──────────────────────────────────────────────────────────

describe("loadMotionNpz", () => {
  it("parses joints, rotmats, fps and frame count", async () => {
    mockFetch(await motionBytes(2, 24));
    const m = await loadMotionNpz("https://example.com/m.npz");
    assert.equal(m.T, 2);
    assert.equal(m.fps, 24);
    assert.equal(m.posedJoints.length, 2 * J * 3);
    assert.equal(m.globalRotMats.length, 2 * J * 9);
    assert.equal(m.posedJoints[0], 1.5);
  });

  it("defaults fps to 30 when the entry is missing or empty", async () => {
    mockFetch(await motionBytes(1, null));
    assert.equal((await loadMotionNpz("u")).fps, 30);
    mockFetch(await motionBytes(1, "empty"));
    assert.equal((await loadMotionNpz("u")).fps, 30);
  });

  it("throws on fetch failure", async () => {
    mockFetch(new Uint8Array(0), 404);
    await assert.rejects(loadMotionNpz("u"), /Failed to fetch motion asset: 404/);
  });

  it("names the empty archive in the missing-joints error", async () => {
    mockFetch(await writeNpz({}));
    await assert.rejects(loadMotionNpz("u"), /missing 'posed_joints' \(got: empty\)/);
  });

  it("throws when posed_joints is missing or not >= 2-D", async () => {
    const rots = { data: identityRots(1), shape: [1, J, 9] } as NpzEntry;
    mockFetch(await writeNpz({ global_rot_mats: rots }));
    await assert.rejects(loadMotionNpz("u"), /missing 'posed_joints'/);
    mockFetch(
      await writeNpz({
        posed_joints: { data: new Float32Array(10), shape: [10] },
        global_rot_mats: rots,
      }),
    );
    await assert.rejects(loadMotionNpz("u"), /missing 'posed_joints'/);
  });

  it("throws when global_rot_mats is missing or not >= 3-D", async () => {
    const joints = { data: new Float32Array(J * 3), shape: [1, J, 3] } as NpzEntry;
    mockFetch(await writeNpz({ posed_joints: joints }));
    await assert.rejects(loadMotionNpz("u"), /missing 'global_rot_mats'/);
    mockFetch(
      await writeNpz({
        posed_joints: joints,
        global_rot_mats: { data: new Float32Array(20), shape: [4, 5] },
      }),
    );
    await assert.rejects(loadMotionNpz("u"), /missing 'global_rot_mats'/);
  });

  it("throws on wrong joint counts", async () => {
    const rots = { data: identityRots(2), shape: [2, J, 9] } as NpzEntry;
    mockFetch(
      await writeNpz({
        posed_joints: { data: new Float32Array(2 * 5 * 3), shape: [2, 5, 3] },
        global_rot_mats: rots,
      }),
    );
    await assert.rejects(loadMotionNpz("u"), /Unexpected posed_joints shape/);
    mockFetch(
      await writeNpz({
        posed_joints: { data: new Float32Array(2 * J * 2), shape: [2, J, 2] },
        global_rot_mats: rots,
      }),
    );
    await assert.rejects(loadMotionNpz("u"), /Unexpected posed_joints shape/);
  });
});

// ── LBS precompute ─────────────────────────────────────────────────────────

describe("precomputeDeformedVerts", () => {
  it("deforms identity binds to bind verts + joint offsets", () => {
    const skin = miniSkin();
    const npz = miniMotionNpz(2);
    // Frame 1: joint 0 sits at (10,0,0); v0 is fully on joint 0.
    npz.posedJoints[J * 3] = 10;
    const out = precomputeDeformedVerts(npz, skin);
    assert.equal(out.length, 2 * 2 * 3);
    // Frame 0: v0 = bind + 0, v1 = half/half blend of the same bind vert.
    assert.deepEqual(Array.from(out.subarray(0, 6)), [0, 0, 0, 1, 0, 0]);
    // Frame 1: v0 follows joint 0, v1 blends joint-0 offset + joint-1 rest.
    assert.deepEqual(Array.from(out.subarray(6, 12)), [10, 0, 0, 6, 0, 0]);
  });

  it("chunked matches sync, in meters or centimeters", async () => {
    const skin = miniSkin();
    const npz = miniMotionNpz(5);
    for (let t = 0; t < 5; t++) npz.posedJoints[t * J * 3] = t;
    const sync = precomputeDeformedVerts(npz, skin);
    const chunked = await precomputeDeformedVertsChunked(npz, skin, false, 2);
    assert.deepEqual(Array.from(chunked), Array.from(sync));
    const cm = await precomputeDeformedVertsChunked(npz, skin, true, 10);
    assert.equal(cm.length, sync.length);
    for (let i = 0; i < cm.length; i++) {
      assert.ok(Math.abs(cm[i] - sync[i] * 100) < 1e-3);
    }
  });
});

// ── cm boundary ────────────────────────────────────────────────────────────

describe("unit boundary", () => {
  it("scales arrays and round-trips cm", () => {
    const src = new Float32Array([1, -2, 0.5]);
    assert.deepEqual(Array.from(scaledArray(src, 100)), [100, -200, 50]);
    assert.deepEqual(Array.from(jointsToCm(src)), [100, -200, 50]);
    assert.deepEqual(Array.from(jointsFromCm(new Float32Array([100, -200, 50]))), [1, -2, 0.5]);
  });

  it("encodes verts to base64, optionally in cm", () => {
    const verts = new Float32Array([1, 0, 0]);
    const m = vertsToB64(verts);
    assert.deepEqual(
      Array.from(Buffer.from(m, "base64")),
      Array.from(new Uint8Array(verts.buffer)),
    );
    const cm = vertsToB64(verts, true);
    assert.deepEqual(
      Array.from(new Float32Array(Uint8Array.from(Buffer.from(cm, "base64")).buffer)),
      [100, 0, 0],
    );
  });
});

// ── Azimuth ring ───────────────────────────────────────────────────────────

describe("azimuth presets", () => {
  it("has eight presets on one ring", () => {
    assert.equal(AZIMUTH_PRESETS.length, 8);
    const front = azimuthCameraPos("az-0");
    assert.ok(Math.abs(front[0]) < 1e-9 && Math.abs(front[2] - 3.4) < 1e-9);
    const right = azimuthCameraPos("az-90");
    assert.ok(Math.abs(right[0] - 3.4) < 1e-9 && Math.abs(right[2]) < 1e-9);
  });

  it("falls back to front for unknown views", () => {
    assert.deepEqual(
      azimuthCameraPos("bogus" as MotionAzimuth),
      azimuthCameraPos("az-0"),
    );
  });

  it("steps around the ring with wrap-around", () => {
    assert.equal(stepAzimuth("az-0", 1), "az-45");
    assert.equal(stepAzimuth("az-315", 1), "az-0");
    assert.equal(stepAzimuth("az-0", -1), "az-315");
    assert.equal(stepAzimuth("bogus" as MotionAzimuth, -1), "az-315");
  });
});

// ── SOMA-77 → COCO-18 ──────────────────────────────────────────────────────

describe("soma77ToCoco18", () => {
  it("maps the 16 tabled joints and extrapolates ears", () => {
    const joints = new Float32Array(J * 3);
    for (let j = 0; j < J; j++) {
      joints[j * 3] = j;
      joints[j * 3 + 1] = j * 2;
      joints[j * 3 + 2] = j * 3;
    }
    // Eyes apart on X, head above neck on Y.
    joints[9 * 3] = -1;
    joints[10 * 3] = 1;
    joints[6 * 3 + 1] = 10;
    joints[4 * 3 + 1] = 0;
    const out = soma77ToCoco18(joints);
    assert.equal(out.length, 54);
    for (let i = 0; i < 16; i++) {
      const s = COCO_TO_SOMA_IDX[i];
      assert.equal(out[i * 3], joints[s * 3]);
      assert.equal(out[i * 3 + 1], joints[s * 3 + 1]);
      assert.equal(out[i * 3 + 2], joints[s * 3 + 2]);
    }
    for (const v of out) assert.ok(Number.isFinite(v));
    // Ears spread wider than the eyes on X.
    assert.ok(out[16 * 3] > 1 && out[17 * 3] < -1);
  });

  it("stays finite for degenerate (coincident) joints", () => {
    const out = soma77ToCoco18(new Float32Array(J * 3));
    for (const v of out) assert.ok(Number.isFinite(v));
  });
});

// ── NPZ writer ─────────────────────────────────────────────────────────────

describe("crc32", () => {
  it("matches the IEEE vector", () => {
    assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbF43926);
    assert.equal(crc32(new Uint8Array(0)), 0);
  });
});

describe("writeNpz", () => {
  it("round-trips through parseNpz with real deflate", async () => {
    const joints = new Float32Array(2 * J * 3);
    joints[5] = 2.5;
    const bytes = await writeNpz({
      posed_joints: { data: joints, shape: [2, J, 3] },
      fps: { data: new Float32Array([30]), shape: [1] },
    });
    const back = await parseNpz(bytes);
    assert.deepEqual(back.get("posed_joints")?.shape, [2, J, 3]);
    assert.equal((back.get("posed_joints")?.data as Float32Array)[5], 2.5);
    assert.deepEqual(back.get("fps")?.shape, [1]);
  });

  it("stores data uncompressed when deflate would expand it", async () => {
    // An expanding compressor (stubbed): the writer must keep stored
    // (method 0). This pins the selection logic, not zlib — the real
    // compressor's shrinking path is pinned by the round-trip test above.
    globalThis.CompressionStream = class {
      readonly readable: ReadableStream;
      readonly writable: WritableStream;
      constructor() {
        const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, ctl) {
            ctl.enqueue(chunk);
          },
          flush(ctl) {
            ctl.enqueue(new Uint8Array([0]));
          },
        });
        this.readable = readable;
        this.writable = writable;
      }
    } as unknown as typeof CompressionStream;
    const stored = await writeNpz({ zeros: { data: new Float32Array(100) } });
    const view = new DataView(stored.buffer, stored.byteOffset);
    assert.equal(view.getUint16(8, true), 0);
    const back = await parseNpz(stored);
    assert.deepEqual(back.get("zeros")?.shape, [100]);
  });

  it("honors compress:false with stored entries", async () => {
    const forced = await writeNpz({ zeros: { data: new Float32Array(100) } }, false);
    assert.equal(new DataView(forced.buffer, forced.byteOffset).getUint16(8, true), 0);
    const backForced = await parseNpz(forced);
    assert.deepEqual(backForced.get("zeros")?.shape, [100]);
  });

  it("writes an empty archive with a zero-count EOCD", async () => {
    const bytes = await writeNpz({});
    assert.equal(bytes.length, 22);
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    assert.equal(view.getUint32(0, true), 0x06054b50);
    assert.equal(view.getUint16(8, true), 0);
  });

  it("builds data URLs for the artifact slot", () => {
    const url = npzToDataUrl(new Uint8Array([1, 2, 3]));
    assert.ok(url.startsWith("data:application/octet-stream;base64,"));
    assert.deepEqual(Array.from(Buffer.from(url.split(",")[1], "base64")), [1, 2, 3]);
  });
});

// ── patchFrame ─────────────────────────────────────────────────────────────

describe("patchFrame", () => {
  function frame(edit?: (e: Float32Array) => void): {
    posed: Float32Array;
    rots: Float32Array;
    edited: Float32Array;
  } {
    const posed = new Float32Array(J * 3);
    posed[4 * 3 + 1] = 0; // Neck1 stays home
    posed[1 * 3 + 1] = 2; // joint 1 two meters above joint 0
    const rots = identityRots(1);
    const edited = new Float32Array(posed);
    edit?.(edited);
    return { posed, rots, edited };
  }

  it("keeps rotations for an identical edit and never mutates inputs", () => {
    const { posed, rots, edited } = frame();
    const posedCopy = new Float32Array(posed);
    const rotsCopy = new Float32Array(rots);
    const out = patchFrame(posed, rots, edited, 0);
    assert.deepEqual(Array.from(out.posedJoints), Array.from(edited));
    assert.deepEqual(Array.from(out.globalRotMats), Array.from(rots));
    assert.deepEqual(Array.from(posed), Array.from(posedCopy));
    assert.deepEqual(Array.from(rots), Array.from(rotsCopy));
  });

  it("skips joints whose edited child collapses onto them", () => {
    const { posed, rots, edited } = frame((e) => {
      e[1 * 3] = 0;
      e[1 * 3 + 1] = 0;
      e[1 * 3 + 2] = 0;
    });
    const out = patchFrame(posed, rots, edited, 0);
    assert.deepEqual(Array.from(out.globalRotMats), Array.from(rots));
    assert.deepEqual(Array.from(out.posedJoints), Array.from(edited));
  });

  it("recomputes rotation for a 90° edit", () => {
    const { posed, rots, edited } = frame((e) => {
      e[1 * 3] = 2;
      e[1 * 3 + 1] = 0;
    });
    const out = patchFrame(posed, rots, edited, 0);
    // Joint 0's block changed from identity; everything stays finite.
    assert.ok(Math.abs(out.globalRotMats[0] - 1) > 1e-3);
    for (const v of out.globalRotMats) assert.ok(Number.isFinite(v));
    assert.equal(out.posedJoints[1 * 3], 2);
  });

  it("takes the 180° X-axis flip arm", () => {
    const posed = new Float32Array(J * 3);
    posed[1 * 3] = 2; // d0 = +X
    const edited = new Float32Array(posed);
    edited[1 * 3] = -2; // d1 = −X (exact flip)
    const out = patchFrame(posed, identityRots(1), edited, 0);
    for (const v of out.globalRotMats) assert.ok(Number.isFinite(v));
    assert.ok(Math.abs(out.globalRotMats[0] - 1) > 1e-3);
  });

  it("takes the 180° non-X flip arm", () => {
    const { posed, rots, edited } = frame((e) => {
      e[1 * 3 + 1] = -2; // d1 = −Y (exact flip of +Y)
    });
    const out = patchFrame(posed, rots, edited, 0);
    for (const v of out.globalRotMats) assert.ok(Number.isFinite(v));
    assert.ok(Math.abs(out.globalRotMats[0] - 1) > 1e-3);
  });

  it("leaves leaf joints untouched and clamps the frame index", () => {
    const T = 2;
    const posed = new Float32Array(T * J * 3);
    posed[1 * 3 + 1] = 2;
    const rots = identityRots(T);
    const edited = new Float32Array(posed.subarray(0, J * 3));
    edited[1 * 3] = 2;
    edited[1 * 3 + 1] = 0;
    const hi = patchFrame(posed, rots, edited, 99);
    // Frame 0 untouched, frame 1 carries the edit.
    assert.deepEqual(Array.from(hi.posedJoints.subarray(0, J * 3)), Array.from(posed.subarray(0, J * 3)));
    assert.equal(hi.posedJoints[J * 3 + 1 * 3], 2);
    // Leaf joint 7 (HeadEnd) keeps identity rotation.
    assert.deepEqual(Array.from(hi.globalRotMats.subarray(7 * 9, 7 * 9 + 9)), [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const lo = patchFrame(posed, rots, edited, -3);
    assert.equal(lo.posedJoints[1 * 3], 2);
  });
});

// ── Re-exports ─────────────────────────────────────────────────────────────

describe("re-exports", () => {
  it("forwards the skin loader", () => {
    assert.equal(typeof loadSomaSkin, "function");
  });
});
