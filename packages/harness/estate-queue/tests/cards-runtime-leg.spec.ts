// @contract cards-anny-runtime-presence
// cards-runtime-leg.spec.ts — THE RUNTIME LEG (E2-2 Piece A,
// operator 2026-10-20): a photo-stated anny run whose estimator
// runtime is absent refuses AT PRESS with the engine-voiced
// runtime sentence — never composes into the engine's
// RuntimeError. The leg sleeps unless ALL hold: the DECL
// declares a runtime row, the consuming param is stated, and the
// endpoint names its engine root (without the root the estate
// cannot see the BYO tree and stands down — today's behavior).
import "../../../../tests/helpers/boot-models.ts";
import { afterAll, beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lanePresenceMiss } from "../src/cardsLanes.ts";
import type { LaneInputMiss } from "../src/cardsArmError.ts";

const DIR = join(tmpdir(), "melite-runtime-leg-" + process.pid);
const CFG = join(DIR, "endpoint.json");
const MODELS = join(DIR, "models");
const ENGINE = join(DIR, "engine");
const OUTPUT = join(ENGINE, "output");
const PREV_CFG = process.env["COMFYUI_ENDPOINT_CONFIG"];
const PREV_SBX = process.env["INFERENCE_TEST_SANDBOX"];
const PREV_ROOT = process.env["MELITE_REPO_ROOT"];
const PREV_ENV = process.env["ANNY_ESTIMATOR_ROOT"];

const SAM = "sam_vit_b_01ec64.pth";
const SENTINELS = [
  "estimator_chain.py",
  join(".venv", "bin", "python"),
  join("SOMA-X", "tools", "mhr2soma.py"),
];

beforeAll(() => {
  mkdirSync(OUTPUT, { recursive: true });
  mkdirSync(MODELS, { recursive: true });
});
afterAll(() => {
  if (PREV_CFG === undefined) delete process.env["COMFYUI_ENDPOINT_CONFIG"];
  else process.env["COMFYUI_ENDPOINT_CONFIG"] = PREV_CFG;
  if (PREV_SBX === undefined) delete process.env["INFERENCE_TEST_SANDBOX"];
  else process.env["INFERENCE_TEST_SANDBOX"] = PREV_SBX;
  if (PREV_ROOT === undefined) delete process.env["MELITE_REPO_ROOT"];
  else process.env["MELITE_REPO_ROOT"] = PREV_ROOT;
  if (PREV_ENV === undefined) delete process.env["ANNY_ESTIMATOR_ROOT"];
  else process.env["ANNY_ESTIMATOR_ROOT"] = PREV_ENV;
  rmSync(DIR, { recursive: true, force: true });
});

// The endpoint machine statement: the hermetic store plus the
// DECLARED engine root. engineRoot null = a deployment that never
// declared where its engine lives — the leg cannot see that tree.
const arm = (engineRoot: string | null): void => {
  const doc: Record<string, unknown> = { url: "http://127.0.0.1:8188", model_base_path: MODELS };
  if (engineRoot !== null) doc["engine_root"] = engineRoot;
  writeFileSync(CFG, JSON.stringify(doc));
  process.env["COMFYUI_ENDPOINT_CONFIG"] = CFG;
  delete process.env["INFERENCE_TEST_SANDBOX"];
  process.env["MELITE_REPO_ROOT"] = DIR;
  delete process.env["ANNY_ESTIMATOR_ROOT"];
};

// The store's sam stands (the burn's shape: weights present, the
// runtime absent — the model probe passes, the runtime leg judges).
const placeSam = (): void => {
  const d = join(MODELS, "sams");
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, SAM), "x");
};

// A valid provisioned copy under a root: rel + every sentinel.
const placeRuntime = (root: string): string => {
  const home = join(root, "data", "runtime", "anny-estimator");
  for (const s of SENTINELS) {
    const f = join(home, s);
    mkdirSync(join(f, ".."), { recursive: true });
    writeFileSync(f, "x");
  }
  return home;
};

// The E2 anchors (run-rescue-core.ts, THE RUNTIME-MISS VOICE): the
// refusal's sentence must parse to kind runtime with the command
// and the env override — the banner keys on these, never on new
// wire. The literals are pinned here (the producer side); the
// consumer side is walled in the web package's own suite.
const E2_RUNTIME = /anny-estimator runtime not found at \S+/;
const E2_PROVISION = /Provision it: pnpm run provision -- estimator/;
const E2_ENV = /Or point ANNY_ESTIMATOR_ROOT at an existing runtime/;

describe("THE RUNTIME LEG (photo-stated runs refuse at press, E2-2 Piece A)", () => {
  it("a photo-stated anny run with no runtime anywhere refuses lane_input_missing with the E2-voiced runtime miss", () => {
    arm(ENGINE);
    placeSam();
    const miss = lanePresenceMiss("anny", { body_image: "person.jpg" });
    assert.ok(miss !== null, "the absent estimator refuses at press (today: null — the silent pass into the engine burn)");
    assert.equal(miss.code, "lane_input_missing");
    assert.match(miss.message, E2_RUNTIME, "the engine-voiced sentence the banner parses");
    assert.match(miss.message, E2_PROVISION, "the provision command rides the refusal");
    assert.match(miss.message, E2_ENV, "the env override rides the refusal");
    const lane = (miss as { lane?: LaneInputMiss }).lane;
    assert.ok(lane !== undefined, "the structured artifact rides beside the prose (the fold's law)");
    assert.equal(lane.family, "anny");
    assert.equal(lane.slot, "body_image", "the consuming param is the slot");
    assert.equal(lane.missing, "anny-estimator");
    assert.equal(lane.kind, "runtime");
  });

  it("a GLB-only run never touches the estimator — the leg sleeps", () => {
    arm(ENGINE);
    placeSam();
    assert.equal(lanePresenceMiss("anny", { body_glb: "body.glb" }), null);
    assert.equal(lanePresenceMiss("anny", {}), null);
    assert.equal(lanePresenceMiss("anny"), null);
  });

  it("a valid env override satisfies the leg — the override wins, estate-side too", () => {
    arm(ENGINE);
    placeSam();
    const home = placeRuntime(DIR);
    process.env["ANNY_ESTIMATOR_ROOT"] = home;
    assert.equal(lanePresenceMiss("anny", { body_image: "person.jpg" }), null);
  });

  it("a walk-up copy under the declared engine tree satisfies the leg", () => {
    arm(ENGINE);
    placeSam();
    placeRuntime(ENGINE);
    assert.equal(lanePresenceMiss("anny", { body_image: "person.jpg" }), null);
  });

  it("a partial copy still refuses — every sentinel must stand", () => {
    arm(ENGINE);
    placeSam();
    const home = placeRuntime(ENGINE);
    rmSync(join(home, SENTINELS[0]!), { force: true });
    const miss = lanePresenceMiss("anny", { body_image: "person.jpg" });
    assert.ok(miss !== null, "a chipped runtime is an absent runtime");
    assert.match(miss.message, E2_RUNTIME);
  });

  it("no declared engine root stands the leg down — the estate cannot see that tree", () => {
    arm(null);
    placeSam();
    assert.equal(
      lanePresenceMiss("anny", { body_image: "person.jpg" }),
      null,
      "without engine_root the probe would guess — it refuses to guess",
    );
  });

  it("a family with no runtime declaration sleeps the leg — the model probe still judges", () => {
    arm(ENGINE);
    rmSync(MODELS, { recursive: true, force: true });
    const miss = lanePresenceMiss("krea-2", { body_image: "person.jpg" });
    assert.ok(miss !== null, "the model leg still fires without a store");
    assert.ok(!E2_RUNTIME.test(miss.message), "but no runtime voice without a runtime row");
  });
});
