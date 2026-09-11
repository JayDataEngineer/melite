// poseTransforms.spec.ts — COCO-18 keypoint math (crouch / shift /
// lean / tilt / arm / elbow / 3D projection) + the poser fetch helpers.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  DEFAULT_ADJUSTMENTS,
  FLAT_LENGTH,
  KP,
  NUM_KEYPOINTS,
  applyAdjustments,
  blobToDataUrl,
  fetchPosePresets,
  flatTo3D,
  renderCustomPose,
} from "../src/poseTransforms.ts";
import type { Keypoints, PoseAdjustments } from "../src/poseTransforms.ts";

const realFetch = globalThis.fetch;
const realFileReader = (globalThis as Record<string, unknown>).FileReader;

afterEach(() => {
  globalThis.fetch = realFetch;
  if (realFileReader === undefined) {
    delete (globalThis as Record<string, unknown>).FileReader;
  } else {
    (globalThis as Record<string, unknown>).FileReader = realFileReader;
  }
});

/** A deterministic base pose: joint i at (100 + i*10, 200 + i*5, c=1). */
function basePose(): Keypoints {
  const kp: number[] = [];
  for (let i = 0; i < NUM_KEYPOINTS; i++) kp.push(100 + i * 10, 200 + i * 5, 1);
  return kp;
}

function adj(over: Partial<PoseAdjustments> = {}): PoseAdjustments {
  return { ...DEFAULT_ADJUSTMENTS, ...over };
}

function approx(actual: number, want: number, msg: string): void {
  assert.ok(Math.abs(actual - want) < 1e-9, `${msg}: ${actual} ≈ ${want}`);
}

describe("pose constants", () => {
  it("pins the COCO-18 layout", () => {
    assert.equal(NUM_KEYPOINTS, 18);
    assert.equal(FLAT_LENGTH, 54);
    assert.equal(KP.NOSE, 0);
    assert.equal(KP.L_ANKLE, 13);
    assert.equal(KP.R_EAR, 16);
    assert.deepEqual(DEFAULT_ADJUSTMENTS, {
      leftArmRaise: 0, rightArmRaise: 0, leftElbowBend: 0, rightElbowBend: 0,
      weightShift: 0, crouch: 0, headTilt: 0, spineLean: 0,
    });
  });
});

describe("applyAdjustments", () => {
  it("returns a clone untouched for zero adjustments", () => {
    const base = basePose();
    const out = applyAdjustments(base, adj());
    assert.deepEqual(out, base);
    assert.ok(out !== base);
  });

  it("crouches around the hip pivot", () => {
    const base = basePose();
    const hipY = base[KP.R_HIP * 3 + 1];
    const out = applyAdjustments(base, adj({ crouch: 1 }));
    // scale = 0.7; hip itself unmoved.
    approx(out[KP.R_HIP * 3 + 1], hipY, "hip");
    approx(out[KP.NOSE * 3 + 1], hipY + (base[KP.NOSE * 3 + 1] - hipY) * 0.7, "nose");
    // X untouched.
    assert.equal(out[KP.NOSE * 3], base[KP.NOSE * 3]);
  });

  it("shifts weight horizontally", () => {
    const base = basePose();
    const out = applyAdjustments(base, adj({ weightShift: 0.5 }));
    assert.equal(out[KP.NECK * 3], base[KP.NECK * 3] + 40);
    assert.equal(out[KP.NECK * 3 + 1], base[KP.NECK * 3 + 1]);
  });

  it("leans the spine with trailing arms", () => {
    const base = basePose();
    const out = applyAdjustments(base, adj({ spineLean: 1 }));
    assert.equal(out[KP.NOSE * 3 + 1], base[KP.NOSE * 3 + 1] + 60);
    assert.equal(out[KP.R_ELBOW * 3 + 1], base[KP.R_ELBOW * 3 + 1] + 30);
    assert.equal(out[KP.L_WRIST * 3 + 1], base[KP.L_WRIST * 3 + 1] + 18);
  });

  it("tilts the head cluster around the neck", () => {
    const base = basePose();
    const out = applyAdjustments(base, adj({ headTilt: 1 }));
    const nx = base[KP.NECK * 3];
    const ny = base[KP.NECK * 3 + 1];
    const angle = 0.35;
    const dx = base[KP.NOSE * 3] - nx;
    const dy = base[KP.NOSE * 3 + 1] - ny;
    approx(out[KP.NOSE * 3], nx + dx * Math.cos(angle) - dy * Math.sin(angle), "nose x");
    approx(out[KP.NOSE * 3 + 1], ny + dx * Math.sin(angle) + dy * Math.cos(angle), "nose y");
    // Non-head joints untouched.
    assert.equal(out[KP.R_HIP * 3], base[KP.R_HIP * 3]);
  });

  it("raises arms toward the overhead target (negative is a no-op)", () => {
    const base = basePose();
    const raised = applyAdjustments(base, adj({ leftArmRaise: 1, rightArmRaise: 0.5 }));
    // Full raise parks the wrist above the shoulder at y=80.
    assert.equal(raised[KP.L_WRIST * 3], base[KP.L_SHOULDER * 3]);
    assert.equal(raised[KP.L_WRIST * 3 + 1], 80);
    // Half raise lerps halfway.
    approx(raised[KP.R_WRIST * 3 + 1], (base[KP.R_WRIST * 3 + 1] + 80) / 2, "half wrist");
    // Negative raise leaves the arm alone.
    const low = applyAdjustments(base, adj({ leftArmRaise: -1 }));
    assert.equal(low[KP.L_WRIST * 3], base[KP.L_WRIST * 3]);
  });

  it("bends elbows toward the neck midline", () => {
    const base = basePose();
    const out = applyAdjustments(base, adj({ leftElbowBend: 1 }));
    const tx = base[KP.L_WRIST * 3] + (base[KP.NECK * 3] - base[KP.L_WRIST * 3]) * 0.65;
    approx(out[KP.L_WRIST * 3], tx, "bent wrist x");
    // Zero bend is a no-op.
    const straight = applyAdjustments(base, adj({}));
    assert.equal(straight[KP.R_WRIST * 3], base[KP.R_WRIST * 3]);
  });
});

describe("flatTo3D", () => {
  it("projects confident joints into SOMA space", () => {
    const flat = new Array(FLAT_LENGTH).fill(0);
    flat[KP.NOSE * 3] = 512;
    flat[KP.NOSE * 3 + 1] = 563.2;
    flat[KP.NOSE * 3 + 2] = 1;
    const out = flatTo3D(flat);
    assert.equal(out.length, 18);
    approx(out[KP.NOSE][0], 0, "nose x centered");
    approx(out[KP.NOSE][1], 0, "nose y centered");
    assert.equal(out[KP.NOSE][2], 0.1);
  });

  it("parks low-confidence and missing joints at neutral", () => {
    const flat = new Array(FLAT_LENGTH).fill(0);
    flat[KP.NECK * 3 + 2] = 0.05;
    const out = flatTo3D(flat);
    assert.deepEqual(out[KP.NECK], [0, 0, 0]);
    // Short arrays default missing components to 0 (low confidence → neutral).
    assert.deepEqual(flatTo3D([])[KP.R_WRIST], [0, 0, 0]);
  });

  it("falls back to z=0 for joints outside the depth table", () => {
    const flat = new Array(FLAT_LENGTH).fill(0);
    for (let i = 0; i < NUM_KEYPOINTS; i++) flat[i * 3 + 2] = 1;
    const out = flatTo3D(flat);
    for (const p of out) assert.equal(p.length, 3);
  });
});

describe("poser fetch helpers", () => {
  it("fetchPosePresets returns parsed presets / throws on failure", async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify([{ id: "a" }]))) as typeof fetch;
    const presets = await fetchPosePresets();
    assert.deepEqual(presets, [{ id: "a" }]);
    globalThis.fetch = (async () => new Response("no", { status: 404 })) as typeof fetch;
    await assert.rejects(fetchPosePresets(), /Failed to fetch pose presets: 404/);
  });

  it("renderCustomPose posts keypoints with default dims / throws with text", async () => {
    const seen: RequestInit[] = [];
    globalThis.fetch = (async (_u: unknown, init?: RequestInit) => {
      seen.push(init ?? {});
      return new Response(new Uint8Array([1, 2, 3]));
    }) as typeof fetch;
    const blob = await renderCustomPose(basePose());
    assert.ok(blob instanceof Blob);
    const body = JSON.parse(String(seen[0].body)) as Record<string, unknown>;
    assert.equal(body.width, 1024);
    assert.equal(body.height, 1024);
    assert.equal((body.keypoints as number[]).length, FLAT_LENGTH);
    // Custom dims ride through.
    await renderCustomPose(basePose(), { width: 512, height: 256 });
    const body2 = JSON.parse(String(seen[1].body)) as Record<string, unknown>;
    assert.equal(body2.width, 512);
    assert.equal(body2.height, 256);
    // Failure surfaces status + text.
    globalThis.fetch = (async () =>
      new Response("bad skeleton", { status: 422 })) as typeof fetch;
    await assert.rejects(renderCustomPose(basePose()), /Pose render failed: 422 bad skeleton/);
  });

  it("blobToDataUrl delegates to the shared FileReader path", async () => {
    let captured: Blob | null = null;
    (globalThis as Record<string, unknown>).FileReader = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      result: string | null = null;
      error: Error | null = null;
      readAsDataURL(file: Blob): void {
        captured = file;
        this.result = "data:ok";
        this.onload?.();
      }
    };
    const blob = new Blob(["x"]);
    assert.equal(await blobToDataUrl(blob), "data:ok");
    assert.equal(captured, blob);
  });

  it("blobToDataUrl rejects when reading fails", async () => {
    (globalThis as Record<string, unknown>).FileReader = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      result: string | null = null;
      error: Error | null = new Error("denied");
      readAsDataURL(_file: Blob): void {
        this.onerror?.();
      }
    };
    await assert.rejects(blobToDataUrl(new Blob(["x"])), /denied/);
  });
});
