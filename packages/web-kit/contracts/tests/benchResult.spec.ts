// benchResult.spec.ts — THE BENCH STAGE RESULT CONTRACT walls.
// The operator's law (2026-09-20): "this can all be validated by
// contract." The result row the run observer patches onto a bench
// stage is a CONTRACTED shape, and `benchResultDefects` is the
// runtime voice of that contract — the WRITER asserts it before
// patching, the READER normalizes through it, and these walls pin
// it against REAL served bytes (the LEGACY ROW below is the exact
// artifact-map shape the live lane served the night of the
// doubled-rowset catch — not an invented fixture).
import { test } from "vitest";
import assert from "node:assert/strict";
import { benchResultDefects } from "../src/benchResult.ts";

/** THE LEGACY LIVE ROW (live lane receipt, 2026-09-20 ~03:00, bench
 * doc rev 404, stage s_0 image-gen): the run observer's terminal
 * patch stamped the SAME image under two keys — the hardcoded
 * 'video' stamp + the gallery name. Every consumer that harvested
 * the map rendered the picture TWICE (hero + phantom rest-thumb
 * row). This is the disease, preserved in bytes. */
const LEGACY_LIVE_ROW: unknown = {
  run_id: "run-2f36ee24c85e-bccac24f",
  url: "/melite-media/runs/run-2f36ee24c85e-bccac24f/generate/SaveImage.0_gen_00001_.png",
  artifacts: {
    video: "/melite-media/runs/run-2f36ee24c85e-bccac24f/generate/SaveImage.0_gen_00001_.png",
    "generate/SaveImage.0_gen_00001_.png": "/melite-media/runs/run-2f36ee24c85e-bccac24f/generate/SaveImage.0_gen_00001_.png",
  },
  assetUrls: [
    "/melite-media/runs/run-2f36ee24c85e-bccac24f/generate/SaveImage.0_gen_00001_.png",
    "/melite-media/runs/run-2f36ee24c85e-bccac24f/generate/SaveImage.0_gen_00001_.png",
  ],
};

test("THE LIVE LEGACY ROW FAILS THE CONTRACT: one file under two keys is named, both keys named", () => {
  const defects = benchResultDefects(LEGACY_LIVE_ROW);
  assert.equal(defects.length, 1, "exactly one defect: the one-file-one-key law");
  assert.match(defects[0]!, /one-file-one-key/);
  assert.match(defects[0]!, /video/);
  assert.match(defects[0]!, /generate\/SaveImage\.0_gen_00001_\.png/);
});

test("THE LAWFUL ROW PASSES CLEAN (the same run, one key, primary url pointing at the same file)", () => {
  const lawful: unknown = {
    run_id: "run-2f36ee24c85e-bccac24f",
    url: "/melite-media/runs/run-2f36ee24c85e-bccac24f/generate/SaveImage.0_gen_00001_.png",
    artifacts: {
      "generate/SaveImage.0_gen_00001_.png": "/melite-media/runs/run-2f36ee24c85e-bccac24f/generate/SaveImage.0_gen_00001_.png",
    },
    assetUrls: ["/melite-media/runs/run-2f36ee24c85e-bccac24f/generate/SaveImage.0_gen_00001_.png"],
  };
  assert.deepEqual(benchResultDefects(lawful), []);
});

test("a multi-file row (the h3 shape: film + windows) passes clean — every file once", () => {
  const multi: unknown = {
    run_id: "run-h3",
    url: "/runs/run-h3/film.mp4",
    artifacts: {
      "film.mp4": "/runs/run-h3/film.mp4",
      "win1.mp4": "/runs/run-h3/win1.mp4",
      "win2.mp4": "/runs/run-h3/win2.mp4",
    },
    assetUrls: ["/runs/run-h3/film.mp4", "/runs/run-h3/win1.mp4", "/runs/run-h3/win2.mp4"],
  };
  assert.deepEqual(benchResultDefects(multi), []);
});

test("degenerate shapes refuse with their own voices", () => {
  assert.deepEqual(benchResultDefects("nope"), ["result: not an object"]);
  assert.deepEqual(benchResultDefects(null), ["result: not an object"]);
  assert.deepEqual(benchResultDefects([1]), ["result: not an object"]);
  assert.deepEqual(benchResultDefects({}), ["run_id: missing or empty (every result names its run)"]);
  assert.deepEqual(
    benchResultDefects({ run_id: "r", url: 42 }),
    ["url: present but not a non-empty string"],
  );
  assert.deepEqual(
    benchResultDefects({ run_id: "r", artifacts: "nope" }),
    ["artifacts: not an object (the name→url map)"],
  );
  assert.deepEqual(
    benchResultDefects({ run_id: "r", artifacts: { a: "", b: 7 } }),
    ["artifacts.a: not a non-empty string url", "artifacts.b: not a non-empty string url"],
  );
  assert.deepEqual(
    benchResultDefects({ run_id: "r", assetUrls: "nope" }),
    ["assetUrls: not an array"],
  );
  assert.deepEqual(
    benchResultDefects({ run_id: "r", assetUrls: {} }),
    ["assetUrls: not an array"],
  );
  assert.deepEqual(
    benchResultDefects({ run_id: "r", assetUrls: ["ok", "", 3] }),
    ["assetUrls[1]: not a non-empty string url", "assetUrls[2]: not a non-empty string url"],
  );
  assert.deepEqual(
    benchResultDefects({ run_id: "r", error: 7 }),
    ["error: present but not a string"],
  );
});
