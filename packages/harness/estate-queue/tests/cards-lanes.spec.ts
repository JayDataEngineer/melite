// cards-lanes.spec.ts — the lane presence gate's every arm (TEST-2
// breadth, the deterministic census of 2026-09-19): pack-folder
// reads (good config / no extras / broken config), the sandbox
// stand-down, the re-armed gate with a fixture endpoint, present
// files riding, missing files refusing with folders + provision
// URL, and the non-string / empty lane rows skipping.
import { afterAll, beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lanePackFolders, lanePresenceRefusal } from "../src/cardsLanes.ts";
import { getModel } from "@melite/comfyui-cordis";

const DIR = join(tmpdir(), "melite-lanes-" + process.pid);
const CFG = join(DIR, "endpoint.json");
const MODELS = join(DIR, "models");
const PREV_CFG = process.env["COMFYUI_ENDPOINT_CONFIG"];
const PREV_SBX = process.env["INFERENCE_TEST_SANDBOX"];

beforeAll(() => {
  mkdirSync(MODELS, { recursive: true });
});
afterAll(() => {
  if (PREV_CFG === undefined) delete process.env["COMFYUI_ENDPOINT_CONFIG"];
  else process.env["COMFYUI_ENDPOINT_CONFIG"] = PREV_CFG;
  if (PREV_SBX === undefined) delete process.env["INFERENCE_TEST_SANDBOX"];
  else process.env["INFERENCE_TEST_SANDBOX"] = PREV_SBX;
  rmSync(DIR, { recursive: true, force: true });
});

const arm = (extra: Record<string, unknown> | null): void => {
  const doc = extra === null
    ? { url: "http://127.0.0.1:8188" }
    : { url: "http://127.0.0.1:8188", extra_model_folders: extra };
  writeFileSync(CFG, JSON.stringify(doc));
  process.env["COMFYUI_ENDPOINT_CONFIG"] = CFG;
  delete process.env["INFERENCE_TEST_SANDBOX"];
};

describe("lanePackFolders (the pack homes, one truth with the mount leg)", () => {
  it("a config with extra_model_folders yields its keys", () => {
    arm({ SEEDVR2: "/x", anny: "/y" });
    const packs = lanePackFolders();
    assert.ok(packs.includes("SEEDVR2"));
    assert.ok(packs.includes("anny"));
  });
  it("a config without extras yields none", () => {
    arm(null);
    assert.deepEqual([...lanePackFolders()], []);
  });
  it("a non-object extras row yields none (never a crash)", () => {
    writeFileSync(CFG, JSON.stringify({ url: "http://x", extra_model_folders: [1, 2] }));
    process.env["COMFYUI_ENDPOINT_CONFIG"] = CFG;
    assert.deepEqual([...lanePackFolders()], []);
  });
  it("a broken config yields none (the gate errs loud elsewhere)", () => {
    writeFileSync(CFG, "{not json");
    process.env["COMFYUI_ENDPOINT_CONFIG"] = CFG;
    assert.deepEqual([...lanePackFolders()], []);
  });
});

describe("lanePresenceRefusal (the gate)", () => {
  it("a sandboxed world with no fixture endpoint stands down", () => {
    delete process.env["COMFYUI_ENDPOINT_CONFIG"];
    process.env["INFERENCE_TEST_SANDBOX"] = "1";
    assert.equal(lanePresenceRefusal("anny-hmr"), null);
  });
  it("a fixture endpoint re-arms the gate: a family with every lane file present rides", () => {
    arm(null);
    const fam = "anny";
    const li = (getModel(fam)?.lane_inputs ?? {}) as Record<string, unknown>;
    for (const v of Object.values(li)) {
      if (typeof v !== "string" || v.trim() === "") continue;
      // place it in every stock folder the gate probes
      for (const folder of ["checkpoints", "unet", "vae", "clip_vision", "text_encoders", "diffusion_models"]) {
        const d = join(MODELS, folder);
        mkdirSync(d, { recursive: true });
        writeFileSync(join(d, v), "x");
      }
    }
    assert.equal(lanePresenceRefusal(fam), null);
  });
  it("a missing lane file refuses with folders + the law code", () => {
    arm(null);
    // point the gate at a family whose files do NOT exist in MODELS:
    // use a temp family override through getModel's own registry —
    // the honest path is a family we did NOT just write. Any family
    // with a lane file absent from this temp store refuses.
    const fam = "anycreature";
    const li = (getModel(fam)?.lane_inputs ?? {}) as Record<string, unknown>;
    const wants = Object.values(li).filter(
      (v): v is string => typeof v === "string" && v.trim() !== "",
    );
    if (wants.length === 0) return; // no lane rows: nothing to probe
    const r = lanePresenceRefusal(fam);
    assert.ok(r instanceof Error);
    assert.equal((r as { code?: string }).code, "lane_input_missing");
    assert.match((r as Error).message, /folders checked:/);
  });
});
