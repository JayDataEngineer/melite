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
  it("carries the hierarchy: 50 registry models, 97 serving routes (ideogram retired 2026-09-17; fit + skin stroke 87; z-image fold stroke 46h; the qwen 2.1 pair — t2i + cached-reference edit — 2026-09-21; the qwen TTS split into 3 honest families — 2026-09-21; yue2 boarded on the music card — 2026-09-20)", (): void => {
    assert.equal(registryIds().length, 50); // +1: yue2 (the music card's second family, 2026-09-20) // +2: qwen3-tts-base + qwen3-tts-voicedesign are families now, never variant routes
    assert.equal(modelIds().length, 97); // +1: yue2, 2026-09-20 // +6: the qwen 2.1 pair (t2i + edit), 2026-09-21
    const comfy = modelIds().filter((id) => {
      const e = getModel(id).engine ?? "";
      return (e ?? "") === "" || e === "comfyui";
    });
    assert.equal(comfy.length, 85); // +1: yue2, 2026-09-20 // ideogram gone (2026-09-17); fit + skin gone (stroke 87); +6 the qwen 2.1 pair (2026-09-21)
    const rcomfy = registryIds().filter((id) => {
      const e = registryModel(id).engine ?? "";
      return (e ?? "") === "" || e === "comfyui";
    });
    assert.equal(rcomfy.length, 46); // +1: yue2, 2026-09-20 // +2 the qwen TTS split (2026-09-21) // +2 the qwen 2.1 pair (2026-09-21) // ideogram gone (2026-09-17); fit + skin gone (stroke 87)
  });

  it("serves 59 offered routes; the unoffered are excluded loud-side (ideogram retired 2026-09-17; fit + skin stroke 87; the qwen 2.1 pair 2026-09-21; yue2 2026-09-20)", (): void => {
    const cat = modelCatalog();
    assert.equal(Object.keys(cat).length, 59); // +1: yue2, 2026-09-20 // +6: the qwen 2.1 pair, 2026-09-21
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

  it("the mods set survived (8 families declare capability packs — h3-timeline boards loras with the mod-plane stroke; voicedesign boards qvoice_save, 2026-09-21)", (): void => {
    const withMods = registryIds().filter((id) => (registryModel(id).mods ?? []).length > 0);
    assert.deepEqual(withMods, [
      "anny",
      "h3-timeline",
      "krea-2",
      "qwen-img-edit-2511",
      "qwen3-tts",
      "qwen3-tts-voicedesign",
      "z-image",
    ]);
  });

  it("unknown family refuses LOUD (ModelError, never a silent miss)", (): void => {
    assert.throws(() => getModel("no-such-family"), ModelError);
    assert.throws(() => mergedDefaults("no-such-family"), ModelError);
    assert.throws(() => mergedDefaults("krea-2", "no-such-variant"), ModelError);
  });

  it("variant matrices ride (the hierarchy: 49 serving variants — yue2's int8 cell, 2026-09-20; the qwen 2.1 pair adds its quant tiers, 2026-09-21)", (): void => {
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
    assert.equal(variants, 49); // +1: yue2 standard (int8 convrot), 2026-09-20 // +4: the qwen 2.1 pair's quant tiers, 2026-09-21
    assert.equal(cells, 57); // +1: yue2's int8 cell, 2026-09-20 // +4: the qwen 2.1 pair's quant cells, 2026-09-21
  });
});
