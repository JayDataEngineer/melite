// handPose.spec.ts — SOMA-77 finger-pose capture/apply/encode/decode.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  FINGER_JOINTS,
  WRIST_INDEX,
  applyHandPose,
  captureHandPose,
  decodeHandPose,
  encodeHandPose,
} from "../src/handPose.ts";

/** Flat 77x3 joints where joint j sits at (j, 10+j, 100+j). */
const demoJoints = (): number[] => {
  const out = new Array(77 * 3).fill(0);
  for (let j = 0; j < 77; j++) {
    out[j * 3] = j;
    out[j * 3 + 1] = 10 + j;
    out[j * 3 + 2] = 100 + j;
  }
  return out;
};

describe("topology constants", () => {
  it("exposes wrist anchors and 24 finger joints per side", () => {
    assert.equal(WRIST_INDEX.left, 14);
    assert.equal(WRIST_INDEX.right, 42);
    assert.equal(FINGER_JOINTS.left.length, 24);
    assert.equal(FINGER_JOINTS.right.length, 24);
    assert.ok(!FINGER_JOINTS.left.includes(14));
    assert.ok(!FINGER_JOINTS.right.includes(42));
  });
});

describe("captureHandPose", () => {
  it("captures wrist-relative offsets for every finger joint", () => {
    const joints = demoJoints();
    const pose = captureHandPose("left", joints);
    assert.equal(Object.keys(pose).length, 24);
    // Joint 15 sits at (15,25,115), wrist 14 at (14,24,114) → offset (1,1,1).
    assert.deepEqual(pose[15], [1, 1, 1]);
    assert.deepEqual(pose[38], [24, 24, 24]);
  });

  it("accepts a Float32Array and captures the right side", () => {
    const pose = captureHandPose("right", new Float32Array(demoJoints()));
    assert.equal(Object.keys(pose).length, 24);
    assert.deepEqual(pose[43], [1, 1, 1]);
    assert.deepEqual(pose[66], [24, 24, 24]);
  });
});

describe("applyHandPose", () => {
  it("re-bases offsets onto the current wrist without mutating input", () => {
    const joints = demoJoints();
    const before = [...joints];
    const pose = captureHandPose("left", joints);
    // Move the wrist far away, keep the offsets.
    const moved = [...joints];
    moved[14 * 3] = 1000;
    moved[14 * 3 + 1] = 2000;
    moved[14 * 3 + 2] = 3000;
    const out = applyHandPose("left", moved, pose);
    assert.ok(out instanceof Float32Array);
    assert.deepEqual([out[15 * 3], out[15 * 3 + 1], out[15 * 3 + 2]], [1001, 2001, 3001]);
    // Untouched joints (incl. the wrist) keep the moved values.
    assert.equal(out[14 * 3], 1000);
    assert.equal(out[0], before[0]);
    // Input not mutated.
    assert.deepEqual(moved, [...joints].map((v, i) =>
      i >= 14 * 3 && i < 14 * 3 + 3 ? [1000, 2000, 3000][i - 14 * 3]! : v,
    ));
  });

  it("accepts a Float32Array input and skips missing offsets", () => {
    const joints = new Float32Array(demoJoints());
    const partial: Record<number, [number, number, number]> = { 15: [1, 2, 3] };
    const out = applyHandPose("left", joints, partial);
    assert.deepEqual([out[15 * 3], out[15 * 3 + 1], out[15 * 3 + 2]], [15, 26, 117]);
    // Joint 16 had no offset entry → left at its original position.
    assert.deepEqual([out[16 * 3], out[16 * 3 + 1], out[16 * 3 + 2]], [16, 26, 116]);
  });

  it("round-trips capture → apply at the same wrist", () => {
    const joints = demoJoints();
    const pose = captureHandPose("right", joints);
    const out = applyHandPose("right", joints, pose);
    assert.deepEqual(Array.from(out), joints);
  });
});

describe("encodeHandPose / decodeHandPose", () => {
  it("round-trips offsets through the 77x3 carrier", () => {
    const pose = captureHandPose("left", demoJoints());
    const arr = encodeHandPose("left", pose);
    assert.equal(arr.length, 77 * 3);
    assert.deepEqual(arr.slice(15 * 3, 15 * 3 + 3), [1, 1, 1]);
    // Non-finger slots stay zero.
    assert.deepEqual(arr.slice(0, 3), [0, 0, 0]);
    const back = decodeHandPose(arr);
    assert.deepEqual(back, pose);
  });

  it("skips missing offsets on encode", () => {
    const arr = encodeHandPose("right", { 47: [4, 5, 6] });
    assert.deepEqual(arr.slice(47 * 3, 47 * 3 + 3), [4, 5, 6]);
    assert.deepEqual(arr.slice(48 * 3, 48 * 3 + 3), [0, 0, 0]);
    assert.deepEqual(decodeHandPose(arr), { 47: [4, 5, 6] });
  });

  it("decodes an all-zero carrier to an empty map", () => {
    assert.deepEqual(decodeHandPose(new Array(77 * 3).fill(0)), {});
  });
});
