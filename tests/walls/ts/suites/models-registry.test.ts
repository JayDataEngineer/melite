// models-registry.test.ts — THE RESURRECTED MODEL REGISTRY WALL.
//
// The registry contract (ported from melite_models @ git 034e1f97):
// frozen data + cascade semantics + served rows. This wall pins the
// resurrection so it can never silently die again: counts, the
// cascade merge, resolve-with-artifact (DOWNLOAD LINKS), the mods
// set, and the unoffered exclusions.
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/models-registry.test.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MODEL_REGISTRY,
  modelCatalog,
  modelIds,
  mergedDefaults,
  resolve,
  getModel,
  ModelError,
} from "../../../../packages/engines/comfyui/src/models/models.ts";

describe("the resurrected model registry (families/variants/cells/links)", () => {
  it("carries all 59 families (47 comfyui + 12 retired, engine-marked)", (): void => {
    assert.equal(modelIds().length, 59);
    const comfy = modelIds().filter((id) => {
      const e = getModel(id).engine ?? "";
      return e === "" || e === "comfyui";
    });
    assert.equal(comfy.length, 47);
  });

  it("serves 43 offered rows; the 4 unoffered families are excluded loud-side", (): void => {
    const cat = modelCatalog();
    assert.equal(Object.keys(cat).length, 43);
    for (const id of ["basic_resize", "ltx-2-3", "ltx-director-distilled", "pixel_upscale"]) {
      assert.equal(cat[id], undefined, `${id} must not serve (unoffered)`);
    }
  });

  it("every served row carries a non-empty form (the catalog contract)", (): void => {
    for (const row of Object.values(modelCatalog())) {
      assert.ok(row.form.length > 0, `${row.id} formless`);
    }
  });

  it("the cascade merge: family defaults ← variant stamps (krea-2 raw)", (): void => {
    const merged = mergedDefaults("krea-2", "raw");
    // family layer
    assert.equal(merged["width"], 1024);
    assert.equal(merged["sampler"], "euler");
    // variant layer wins
    assert.equal(merged["steps"], 52);
    assert.equal(merged["cfg"], 3.5);
    assert.equal(merged["model"], "krea-2-raw");
  });

  it("resolve returns the DOWNLOAD ARTIFACT (url + sha256 + size)", (): void => {
    const r = resolve("krea-2");
    assert.equal(r.route, "krea-2");
    assert.equal(r.engine, "comfyui");
    const art = r.cell?.artifact;
    assert.ok(art !== undefined && art !== null, "krea-2 default cell must download");
    assert.ok(art.source_url.startsWith("https://huggingface.co/Comfy-Org/Krea-2/"));
    assert.equal(art.size_bytes, 13492686496);
    assert.match(art.sha256, /^[0-9a-f]{64}$/);
    assert.equal(art.dest_sub, "diffusion_models");
  });

  it("the mods set survived (5 families declare capability packs)", (): void => {
    const withMods = modelIds().filter((id) => getModel(id).mods.length > 0);
    assert.deepEqual(withMods, [
      "anny",
      "krea-2",
      "qwen-img-edit-2511",
      "qwen3-tts",
      "qwen3-tts-base",
    ]);
  });

  it("unknown family refuses LOUD (ModelError, never a silent miss)", (): void => {
    assert.throws(() => getModel("no-such-family"), ModelError);
    assert.throws(() => mergedDefaults("no-such-family"), ModelError);
    assert.throws(() => mergedDefaults("krea-2", "no-such-variant"), ModelError);
  });

  it("variant matrices ride (comfyui estate: 116 variants)", (): void => {
    const total = Object.values(MODEL_REGISTRY)
      .filter((d) => d.engine === undefined || d.engine === "" || d.engine === "comfyui")
      .map((d) => d.variants.length)
      .reduce((a, b) => a + b, 0);
    assert.equal(total, 116);
  });
});
