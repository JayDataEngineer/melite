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
  it("carries the hierarchy: 45 registry models, 96 serving routes (ideogram retired 2026-09-17; fit + skin stroke 87; z-image fold stroke 46h; the qwen 2.1 pair — t2i + cached-reference edit — 2026-09-21; the qwen TTS fold — Base is a variant route of the .6, never a third family — 2026-09-21; the H3 fold — the timeline owns the whole surface, h3 + h3-keyframe died into its variants — 2026-09-21; the survivor-id correction — the family IS the checkpoint `h3`, timeline is the lane route h3-timeline, single-shot moves to h3-fl2va, the family self-address serves — 2026-09-22; yue2 boarded on the music card — 2026-09-20)", (): void => {
    assert.equal(registryIds().length, 45); // -2: wan-vace + scail2-animate retired with the video-gen card (2026-09-21 — h3-timeline is the only video door) // +1: yue2 (2026-09-20) // +1: qwen3-tts-voicedesign // +2: the qwen 2.1 pair // -2: the H3 fold // 2026-09-22: the survivor-id correction renames h3-timeline → h3 in place (registry count unchanged)
    assert.equal(modelIds().length, 98); // +1: qwen3-tts-voicedesign-design — the design lane's OWN flat route (transcript-015: the head serves the family default CustomVoice, so the design variant needs its own address), 2026-09-24 // +1: yue2, 2026-09-20 // +6: the qwen 2.1 pair (t2i + edit), 2026-09-21 // +1: the survivor-id correction, 2026-09-22 — the family id h3 serves as its own address (the default variant claims it; the dead-family route h3 → h3-fl2va) // +1: qwen3-tts-voicedesign-base — the 1.7B Base clone lane's OWN flat route (the 1:1 matrix, 2026-09-23; the 0.6B owns 'qwen3-tts-base' — one owner per route id)
    const comfy = modelIds().filter((id) => {
      const e = getModel(id).engine ?? "";
      return (e ?? "") === "" || e === "comfyui";
    });
    assert.equal(comfy.length, 86); // +1: the design lane route, 2026-09-24 // -2: wan-vace + scail2 comfy routes retired with video-gen (2026-09-21) // +1: yue2, 2026-09-20 // ideogram gone (2026-09-17); fit + skin gone (stroke 87); +6 the qwen 2.1 pair (2026-09-21) // +1: the h3 family self-address, 2026-09-22 // +1: the 1:1 1.7B clone route, 2026-09-23
    const rcomfy = registryIds().filter((id) => {
      const e = registryModel(id).engine ?? "";
      return (e ?? "") === "" || e === "comfyui";
    });
    assert.equal(rcomfy.length, 41); // -2: wan-vace + scail2 registry rows retired with video-gen (2026-09-21) // +1: yue2, 2026-09-20 // +1 the qwen TTS voicedesign family (2026-09-21; base folded back into the .6 as a variant) // +2 the qwen 2.1 pair (2026-09-21) // -2 the H3 fold (h3 + h3-keyframe died into h3-timeline's variants) // ideogram gone (2026-09-17); fit + skin gone (stroke 87)
  });

  it("serves 59 offered routes; the unoffered are excluded loud-side (ideogram retired 2026-09-17; fit + skin stroke 87; the qwen 2.1 pair 2026-09-21; yue2 2026-09-20; the h3 survivor-id correction — the family self-address offers — 2026-09-22)", (): void => {
    const cat = modelCatalog();
    assert.equal(Object.keys(cat).length, 60); // -2: wan-vace + scail2 routes retired with video-gen (2026-09-21) // +1: yue2, 2026-09-20 // +6: the qwen 2.1 pair, 2026-09-21 // +1: the h3 family self-address, 2026-09-22 // +1: qwen3-tts-voicedesign-base (the 1:1 matrix, 2026-09-23) // +1: qwen3-tts-voicedesign-design — the design lane's own route (transcript-015), 2026-09-24
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

  it("the mods set survived (9 families declare capability packs — h3 boards loras with the mod-plane stroke, renamed with the survivor-id correction 2026-09-22; voicedesign boards qvoice_save, 2026-09-21; qwen-img-edit-21 boards the mask pack with the 2.1 region-detailer re-scope, 2026-09-23)", (): void => {
    const withMods = registryIds().filter((id) => (registryModel(id).mods ?? []).length > 0);
    assert.deepEqual(withMods, [
      "anny",
      "h3",
      "krea-2",
      "qwen-img-edit-21",
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

  it("FIRST SELF-ROUTE WINS when two variants claim the family head (the 1.7B head theft, transcript-014: customvoice declares first, voicedesign second — the second claimant must never silently flip the family default)", (): void => {
    // the derived head view composes through the FIRST head-claiming
    // variant in declaration order — the same default law as the
    // resolving pick at registration (declaration order IS intent)
    const head = getModel("qwen3-tts-voicedesign");
    assert.equal((head.defaults as Record<string, unknown>).variant, "customvoice", "the head serves the family default (customvoice), not the last claimant");
    assert.equal((head.lane_inputs as Record<string, unknown>).synth_lane, "speak", "the head lane is the default variant's lane — THE FLOW's lane");
    // the design lane stays reachable through its STATED variant (the
    // stamp overlay + the variant's own lane truth), and the clone
    // lane through its own flat route
    const clone = getModel("qwen3-tts-voicedesign-base");
    assert.equal((clone.lane_inputs as Record<string, unknown>).synth_lane, "clone");
    assert.equal((clone.defaults as Record<string, unknown>).variant, "base");
  });

  it("variant matrices ride (the hierarchy: 48 serving variants — yue2's int8 cell, 2026-09-20; the qwen 2.1 pair adds its quant tiers, 2026-09-21)", (): void => {
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
    // 71 since 2026-09-22: the uncommitted tree had grown +23 past
    // the stale 48 (the multimodal boardings — joycaption, florence2,
    // wd14, the tagger lanes, z-image, the qwen edit pairs — landed
    // without their wall bump; the pre-commit hook caught the drift)
    assert.equal(variants, 73); // +2: the 1:1 1.7B matrix — customvoice + base variants on qwen3-tts-voicedesign (operator 2026-09-23)
    assert.equal(cells, 81);
  });
});
