// @contract models-mask-lane-seat
//
// THE RUN-GATE SEAT (ROADMAP 2026-10-26, the lane-seat debt —
// burn a's UNSERVED-arm scoping found it): mask's three lane
// weights were loaded by BUILD CONSTANTS (actions.ts MASK_WEIGHTS)
// while the DECL declared NO lane_inputs seat — h3's old crime
// shape ("the one lane whose loader filenames lived in the card as
// constants while its DECL declared no lane_inputs", cured for h3
// 2026-10-10). The run gate walks lane_inputs; a weight with no
// seat is a weight whose absence the gate cannot see — the press
// dies mid-graph at the engine instead of refusing at the door
// with a URL (the anchor-at-the-door law, 2026-10-26).
//
// The cure keeps the constants as the LOADER truth (lane-laws
// pins: a row value never reaches a loader) and seats the SAME
// names as DECL lane_inputs — the gate probes presence, each miss
// anchors to its provisions row. This wall judges both halves:
//   ARM 1 SEAT PARITY — every weight the action's facts carry is
//        seated at a key the gate walks (LANE_FOLDERS or a
//        declared lane_home), and every seated value has a
//        provisions row (the anchor's truth).
//   ARM 2 THE DOOR — over an empty store the run gate refuses
//        naming ALL THREE weights, each row carrying its fetch
//        URL (the provisions anchor, one spelling with the gate's
//        own resolver).
import "../../../../tests/helpers/boot-models.ts";
import { afterAll, beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DECL as MASK_DECL } from "../src/index.ts";
import { MASK_WEIGHTS } from "../src/actions.ts";
import { LANE_FOLDERS, laneFetchAnchor, lanePresenceMiss } from "../../../../packages/harness/estate-queue/src/cardsLanes.ts";

// ARM 2's store truth: a scratch endpoint over an EMPTY models
// tree — the same sandbox shape lane-presence-miss-all rides (the
// estate half), so the door's refusal is judged at the door, never
// against the developer's live store.
const DIR = join(tmpdir(), "melite-mask-lane-seat-" + process.pid);
const CFG = join(DIR, "endpoint.json");
const MODELS = join(DIR, "models");
const PREV_CFG = process.env["COMFYUI_ENDPOINT_CONFIG"];
const PREV_SBX = process.env["INFERENCE_TEST_SANDBOX"];
const PREV_ROOT = process.env["MELITE_REPO_ROOT"];

describe("models-mask-lane-seat — the run gate sees every lane weight the loaders read", () => {
  beforeAll(() => {
    mkdirSync(MODELS, { recursive: true });
    writeFileSync(CFG, JSON.stringify({ url: "http://127.0.0.1:8188", model_base_path: MODELS }));
    process.env["COMFYUI_ENDPOINT_CONFIG"] = CFG;
    delete process.env["INFERENCE_TEST_SANDBOX"];
    process.env["MELITE_REPO_ROOT"] = DIR;
  });

  afterAll(() => {
    if (PREV_CFG === undefined) delete process.env["COMFYUI_ENDPOINT_CONFIG"];
    else process.env["COMFYUI_ENDPOINT_CONFIG"] = PREV_CFG;
    if (PREV_SBX === undefined) delete process.env["INFERENCE_TEST_SANDBOX"];
    else process.env["INFERENCE_TEST_SANDBOX"] = PREV_SBX;
    if (PREV_ROOT === undefined) delete process.env["MELITE_REPO_ROOT"];
    else process.env["MELITE_REPO_ROOT"] = PREV_ROOT;
    rmSync(DIR, { recursive: true, force: true });
  });

  it("ARM 1 — every loader weight is seated at a gate-walked key with a provisions row", () => {
    const seats = MASK_DECL.lane_inputs ?? {};
    const homes = MASK_DECL.lane_homes ?? {};
    const walkable = new Set<string>([...Object.keys(LANE_FOLDERS), ...Object.keys(homes)]);
    // a key the gate never walks is a seat in name only — the
    // presence probe skips it and the crime survives the cure
    for (const key of Object.keys(seats)) {
      assert.ok(walkable.has(key), `lane_inputs key '${key}' is walked by no gate leg (LANE_FOLDERS has no such key and lane_homes does not declare it)`);
    }
    const provisions = new Set((MASK_DECL.provisions ?? []).map((r) => r.name));
    for (const weight of [MASK_WEIGHTS.checkpoint, MASK_WEIGHTS.unet, MASK_WEIGHTS.sam2]) {
      const seated = Object.values(seats).includes(weight);
      assert.ok(seated, `loader weight '${weight}' carries no lane_inputs seat — the gate cannot see its absence (h3's crime shape)`);
      assert.ok(provisions.has(weight), `seated weight '${weight}' has no provisions row — a miss would refuse with no URL to fetch`);
    }
  });

  it("ARM 2 — over an empty store the door refuses naming all three, each with its fetch URL", () => {
    const arm = lanePresenceMiss("mask-select");
    assert.ok(arm !== null, "the gate refused nothing over an empty store — the seats are invisible to the door");
    const rows = Array.isArray(arm.lane?.missingAll) ? (arm.lane.missingAll as Array<Record<string, unknown>>) : [];
    const names = new Set(rows.map((r) => String(r["name"])));
    for (const weight of [MASK_WEIGHTS.checkpoint, MASK_WEIGHTS.unet, MASK_WEIGHTS.sam2]) {
      assert.ok(names.has(weight), `the refusal does not name '${weight}' — one wedged run later, the moss burn's face`);
      // the anchor, judged by the gate's own resolver (one
      // spelling): every named miss carries its URL
      const anchor = laneFetchAnchor(MASK_DECL, [], weight);
      const row = rows.find((r) => String(r["name"]) === weight);
      assert.ok(anchor !== undefined, `no channel anchors '${weight}' — the provisions row is missing`);
      assert.equal(row?.["fetchUrl"], anchor.url, `the miss row for '${weight}' carries the provisions URL`);
      assert.ok(String(arm.message).includes(weight), `the refusal voice names '${weight}'`);
    }
  });
});
