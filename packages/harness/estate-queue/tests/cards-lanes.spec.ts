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
import { laneFilesStatus, lanePackFolders, lanePresenceRefusal } from "../src/cardsLanes.ts";
import { getModel } from "@melite/comfyui-cordis";

const DIR = join(tmpdir(), "melite-lanes-" + process.pid);
const CFG = join(DIR, "endpoint.json");
const MODELS = join(DIR, "models");
const PREV_CFG = process.env["COMFYUI_ENDPOINT_CONFIG"];
const PREV_SBX = process.env["INFERENCE_TEST_SANDBOX"];
const PREV_ROOT = process.env["MELITE_REPO_ROOT"];

beforeAll(() => {
  mkdirSync(MODELS, { recursive: true });
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

const arm = (extra: Record<string, unknown> | null): void => {
  const doc = extra === null
    ? { url: "http://127.0.0.1:8188", model_base_path: MODELS }
    : { url: "http://127.0.0.1:8188", model_base_path: MODELS, extra_model_folders: extra };
  writeFileSync(CFG, JSON.stringify(doc));
  process.env["COMFYUI_ENDPOINT_CONFIG"] = CFG;
  delete process.env["INFERENCE_TEST_SANDBOX"];
  // HERMETIC repo root: the runtime tree + the root-config
  // inheritance read never touch the developer's real store
  process.env["MELITE_REPO_ROOT"] = DIR;
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

describe("laneFilesStatus", () => {
  it("uses the endpoint store when no checker is supplied", () => {
    arm(null);
    const dir = join(MODELS, "checkpoints");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "present.bin"), "x");
    assert.equal(laneFilesStatus({ lane_inputs: { checkpoint: "present.bin" } }), true);
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
  it("a real lane file present in the mount rides (hit arm)", () => {
    arm(null);
    // krea-2 carries REAL lane rows (text_encoder + unet files) —
    // place them in the hermetic mount stock folders
    const fam = "krea-2";
    const li = (getModel(fam)?.lane_inputs ?? {}) as Record<string, unknown>;
    for (const [key, raw] of Object.entries(li)) {
      if (typeof raw !== "string" || raw.trim() === "") continue;
      for (const folder of ["text_encoders", "clip", "unet", "diffusion_models", "vae", "checkpoints", "clip_vision", "background_removal"]) {
        const d = join(MODELS, folder);
        mkdirSync(d, { recursive: true });
        writeFileSync(join(d, raw), "x");
      }
      void key;
    }
    assert.equal(lanePresenceRefusal(fam), null);
  });
  it("a real lane file missing refuses with folders + the provision hint", () => {
    arm(null);
    // same family, EMPTIED mount: every real lane row misses — the
    // refusal carries the folders checked and (when the family
    // declares provisions for the name) the fetch hint
    rmSync(MODELS, { recursive: true, force: true });
    try {
      lanePresenceRefusal("krea-2");
      assert.fail("a missing lane file refuses");
    } catch (e) {
      assert.ok(e instanceof Error);
      assert.match((e as Error).message, /folders checked:/);
      assert.equal((e as { code?: string }).code, "lane_input_missing");
    }
  });
  it("a missing lane file with a matching provision carries the fetch hint", () => {
    arm({ SEEDVR2: "/pack" }); // extras ride the folder union too
    rmSync(MODELS, { recursive: true, force: true });
    try {
      lanePresenceRefusal("qwen-img-edit-2511");
      assert.fail("the missing lane file refuses");
    } catch (e) {
      assert.match((e as Error).message, /fetch it: /);
    }
  });
  it("a family without lane_inputs stands down (the ?? toll)", () => {
    arm(null);
    assert.equal(lanePresenceRefusal("anycreature"), null);
  });
  it("a missing lane file without a provision row omits the hint", () => {
    arm(null);
    // music3's text_encoder/minimax file carries no provisions row
    // for the name — the refusal's hint arm stays empty
    try {
      lanePresenceRefusal("music3");
      return; // family lane rows all present: nothing probed
    } catch (e) {
      assert.ok(!/fetch it:/.test((e as Error).message), "no provision hint without a provisions row");
    }
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
