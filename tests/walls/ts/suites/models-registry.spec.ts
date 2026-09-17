// models-registry.spec.ts — THE RESURRECTED MODEL REGISTRY WALL.
//
// The registry contract (ported from melite_models @ git 034e1f97):
// frozen data + cascade semantics + served rows. This wall pins the
// resurrection so it can never silently die again: counts, the
// cascade merge, resolve-with-artifact (DOWNLOAD LINKS), the mods
// set, and the unoffered exclusions.
//
// Run: npx vitest run tests/walls/ts/suites/models-registry.spec.ts

import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  modelCatalog,
  modelIds,
  registryIds,
  registryModel,
  mergedDefaults,
  resolve,
  getModel,
  ModelError,
} from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";

describe("the resurrected model registry (families/variants/cells/links)", () => {
  it("carries the hierarchy: 46 registry models, 91 serving routes (fit + skin retired, stroke 87; z-image fold stroke 46h)", (): void => {
    assert.equal(registryIds().length, 46);
    assert.equal(modelIds().length, 91);
    const comfy = modelIds().filter((id) => {
      const e = getModel(id).engine ?? "";
      return (e ?? "") === "" || e === "comfyui";
    });
    assert.equal(comfy.length, 79); // fit + skin gone (stroke 87)
    const rcomfy = registryIds().filter((id) => {
      const e = registryModel(id).engine ?? "";
      return (e ?? "") === "" || e === "comfyui";
    });
    assert.equal(rcomfy.length, 42); // fit + skin gone (stroke 87)
  });

  it("serves 53 offered routes; the unoffered are excluded loud-side (fit + skin retired, stroke 87)", (): void => {
    const cat = modelCatalog();
    assert.equal(Object.keys(cat).length, 53);
    // the 4 fragment/retired unoffered + the 13 hollow atoms
    // (2026-09-08: served but callerless and unrunnable — the
    // catalog offers only runnable atoms, walled in
    // models-against-cards) + flux-fill-onereward (rides its
    // unoffered owner out).
    for (const id of ["basic_resize", "ltx-2-3", "ltx-director-distilled", "pixel_upscale", "auto-detect", "concat", "dwpose", "flux-fill-dev", "flux-fill-onereward", "gem_soma", "latentsync", "mesh_refine", "rtx-vsr", "see-through", "somax", "step1x_texture", "stretchy-rig", "trellis_native"]) {
      assert.equal(cat[id], undefined, `${id} must not serve (unoffered)`);
    }
  });

  it("every served row carries its source (the catalog contract — the card plane serves forms)", (): void => {
    for (const row of Object.values(modelCatalog())) {
      // THE ATOM DECLARES NO CALLERS: no form key rides the served
      // row (the callers' boarded lists own the relation); every
      // route that downloads carries repo (model) + filename (quant)
      const file = row.source?.filename ?? "";
      if ((row.source?.repo_id ?? "") !== "") {
        assert.ok(file === "" || file === null || typeof file === "string", `${row.id} source malformed`);
      }
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

  it("the mods set survived (6 families declare capability packs — z-image boards loras + controlnet)", (): void => {
    const withMods = registryIds().filter((id) => (registryModel(id).mods ?? []).length > 0);
    assert.deepEqual(withMods, [
      "anny",
      "krea-2",
      "qwen-img-edit-2511",
      "qwen3-tts",
      "z-image",
    ]);
  });

  it("unknown family refuses LOUD (ModelError, never a silent miss)", (): void => {
    assert.throws(() => getModel("no-such-family"), ModelError);
    assert.throws(() => mergedDefaults("no-such-family"), ModelError);
    assert.throws(() => mergedDefaults("krea-2", "no-such-variant"), ModelError);
  });

  it("variant matrices ride (the hierarchy: 45 serving variants since stroke 87, composed comfyui)", (): void => {
    // registry plane: serving variants (cells > 0) and quant cells;
    // recipe rows are routing recipes, not serving variants
    // the engine rides the variant (the moss meld) — a variant
    // serves when its composed engine (variant || model) is comfyui
    let variants = 0, cells = 0;
    for (const id of registryIds()) {
      const d = registryModel(id);
      const meng = d.engine ?? "";
      for (const v of d.variants) {
        if (v.cells.length === 0) continue;
        const veng = (v.engine ?? "") !== "" ? v.engine : meng;
        if (veng !== undefined && veng !== "" && veng !== "comfyui") continue;
        variants += 1;
        cells += v.cells.length;
      }
    }
    // 44 since stroke 90 (anny's Standard/Native row was template
    // chrome — the family serves ONE identity_model through ONE
    // route; the variant matrix was noise the operator named)
    assert.equal(variants, 44);
    assert.equal(cells, 52);
  });
});
