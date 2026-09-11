// timelineVocab.spec.ts — normalizeSegmentStatus (every arm) plus a touch
// of each timeline constant (SEGMENT_STATUSES, TRACK_COLORS,
// DEFAULT_SEGMENT_PARAMS, DEFAULT_LIPSYNC_FIELDS, FLF_MODES), and the
// provenance vocabulary (isProvenance every arm + PROVENANCE_VALUES).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  DEFAULT_LIPSYNC_FIELDS,
  DEFAULT_SEGMENT_PARAMS,
  FLF_MODES,
  SEGMENT_STATUSES,
  TRACK_COLORS,
  normalizeSegmentStatus,
} from "../src/timelineTypes.ts";
import { PROVENANCE_VALUES, isProvenance } from "../src/vocab.ts";

describe("normalizeSegmentStatus", () => {
  it("passes every canonical status through", () => {
    for (const s of SEGMENT_STATUSES) {
      assert.equal(normalizeSegmentStatus(s), s);
    }
  });

  it("normalizes unknown strings to empty", () => {
    assert.equal(normalizeSegmentStatus("error"), "empty");
    assert.equal(normalizeSegmentStatus(""), "empty");
    assert.equal(normalizeSegmentStatus("READY"), "empty");
  });

  it("normalizes non-strings to empty", () => {
    assert.equal(normalizeSegmentStatus(null), "empty");
    assert.equal(normalizeSegmentStatus(undefined), "empty");
    assert.equal(normalizeSegmentStatus(42), "empty");
    assert.equal(normalizeSegmentStatus({}), "empty");
    assert.equal(normalizeSegmentStatus(["ready"]), "empty");
  });
});

describe("timeline constants", () => {
  it("SEGMENT_STATUSES is the canonical flow order", () => {
    assert.deepEqual([...SEGMENT_STATUSES], [
      "empty",
      "pending",
      "generating",
      "ready",
      "failed",
    ]);
  });

  it("TRACK_COLORS carries the ten auto-assign accents", () => {
    assert.equal(TRACK_COLORS.length, 10);
    assert.ok(TRACK_COLORS.every((c) => c.startsWith("#")));
  });

  it("FLF_MODES names the off/on pair", () => {
    assert.equal(FLF_MODES.length, 2);
    assert.equal(FLF_MODES[0].id, "off");
    assert.equal(FLF_MODES[1].id, "on");
  });

  it("DEFAULT_SEGMENT_PARAMS holds the proven VACE defaults", () => {
    assert.equal(DEFAULT_SEGMENT_PARAMS.seed, 42);
    assert.equal(DEFAULT_SEGMENT_PARAMS.width, 640);
    assert.equal(DEFAULT_SEGMENT_PARAMS.height, 480);
    assert.equal(DEFAULT_SEGMENT_PARAMS.model, "wan-vace");
    assert.deepEqual(DEFAULT_SEGMENT_PARAMS.loras, []);
  });

  it("DEFAULT_LIPSYNC_FIELDS is the no-variant default", () => {
    assert.deepEqual(DEFAULT_LIPSYNC_FIELDS, {
      lipSyncedVideoUrl: null,
      lipSyncPreferOriginal: false,
    });
  });
});

describe("provenance vocabulary", () => {
  it("PROVENANCE_VALUES lists the frozen trio", () => {
    assert.deepEqual([...PROVENANCE_VALUES], ["agent", "user", "imported"]);
  });

  it("accepts every frozen value", () => {
    assert.equal(isProvenance("agent"), true);
    assert.equal(isProvenance("user"), true);
    assert.equal(isProvenance("imported"), true);
  });

  it("rejects unknown strings and non-strings", () => {
    assert.equal(isProvenance("system"), false);
    assert.equal(isProvenance(""), false);
    assert.equal(isProvenance(null), false);
    assert.equal(isProvenance(undefined), false);
    assert.equal(isProvenance(42), false);
    assert.equal(isProvenance({}), false);
  });
});
