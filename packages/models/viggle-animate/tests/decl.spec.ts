// @melite/models-viggle-animate — the model-plugin data pins.
//
// A MODEL PLUGIN carries its WHOLE truth (the operator's law): the
// variants, their quant cells, the mods boarding, the lane inputs,
// the defaults. These pins hold the PLUGIN SHAPE + identity; the
// full carrier (every HF link, sha256, lane weight, variant
// matrix) is the declaration itself, and registration is proven
// engine-side (the walls' registry count, the flavor↔DECL.mods
// interlock, the boot gates). Family-specific truth pins land here
// hand-written when a fact needs pinning — never generated guesses.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";
import { animate, dmd2Sigmas, marriedSteps } from "../src/actions.ts";
import { VIGGLE_LORA_ROWS } from "../mods/loras.ts";

describe("the viggle-animate model plugin (the whole model, one package)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-viggle-animate");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — the id matches the package, variants named", () => {
    assert.equal(DECL.id, "viggle-animate");
    assert.ok(DECL.variants.length > 0, "a family declares at least one variant");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
  });

  it("boards the loras pack and declares the animate action", () => {
    assert.ok(
      (DECL.mods ?? []).some((m) => (typeof m === "string" ? m === "loras" : m.pack === "loras")),
      "the loras pack is boarded — the DMD accelerator + the drift cure ride the mod plane",
    );
    assert.ok(
      (DECL.actions ?? []).some((a) => a.id === "animate"),
      "the animate action is declared — the openjutsu card binds it",
    );
  });

  it("pins the licence row — the H3 Community License with commercial use inside the permitted territories", () => {
    assert.ok(DECL.licence, "the licence is ONE named row, never a free-text hint");
    assert.equal(DECL.licence!.id, "MiniMax H3 Community License Agreement");
    assert.equal(DECL.licence!.commercial_use, true);
  });

  it("pins the lane's text surface — the frozen embed, declared AND downloaded, probed at press", () => {
    assert.equal(DECL.lane_inputs?.text_cond, "fixed_embed_fwd_anyframe.safetensors");
    assert.deepEqual(DECL.lane_homes, { text_cond: "text_cond" },
      "the run gate probes the text_cond home and refuses loud with the fetch hint");
    const embed = (DECL.provisions ?? []).find((r) => r.name === "fixed_embed_fwd_anyframe.safetensors");
    assert.ok(embed, "the frozen embed owns a download channel — a lane weight with no row is a ghost (the audit's fix 3)");
    assert.equal(embed!.folder, "text_cond", "the embed lands where ViggleTextCondLoader reads it");
  });

  it("stamps the DMD accelerator onto the birth recipe (standard, first-declared)", () => {
    const recipe = DECL.variants.find((v) => v.id === "standard");
    assert.ok(recipe, "the standard recipe row exists");
    const loras = (recipe.wire_defaults?.loras ?? []) as Array<{ id: string }>;
    assert.deepEqual(loras.map((l) => l.id), ["viggle_dmd_r64"],
      "every fresh card is born with the DMD accelerator on — the upstream baseline requires it");
  });

  it("requires both media seats of the user class", () => {
    assert.deepEqual(
      (DECL.required_defaults ?? []).map((r) => [r.name, r.class]),
      [["clip", "user"], ["ref_image", "user"]],
    );
  });
});

// THE VERBATIM CONTENT LAW: every declared provision row's digest, url
// and size are literals in the table below — a substituted sha, a wrong
// path inside the right repo, or a drifted size fails this block. A new
// row is a deliberate edit of this table.
const PROVISION_PINS: ReadonlyArray<
  readonly [name: string, sha256: string, url: string, size_bytes: number]
> = [
  ["minimax_h3_ref2va_viggle_pruned_int8_convrot.safetensors", "c16db9a453461261b7270ed6fd9e435dde0524234ba4184253ba3876bc3d3540", "https://huggingface.co/drbaph/Viggle-Animate-ComfyUI/resolve/main/diffusion_models/minimax_h3_ref2va_viggle_pruned_int8_convrot.safetensors", 21033720080],
  ["viggle_animate_dmd_lora_r64.safetensors", "8dc50f293c50c9466ac0ae907fd9f904a9a56ceb81f727fb3df02fbadec54446", "https://huggingface.co/drbaph/Viggle-Animate-ComfyUI/resolve/main/loras/viggle_animate_dmd_lora_r64.safetensors", 941893032],
  ["h3_character_swap_v1.5.safetensors", "8f2c3c3eba161df8d0c6099598b4730f641f5ce01e04cd16d2427cff8a35218f", "https://huggingface.co/akatz-ai/MiniMax-H3-Character-Swap-LoRA/resolve/main/h3_character_swap_v1.5.safetensors", 155110792],
  ["minimax_h3_fun_controlnet_union_2.0_pruned_bf16.safetensors", "cd48bdc11b1f1a3b934746c898d25123754b335c13d37d5c421f8373079282b4", "https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/model_patches/minimax_h3_fun_controlnet_union_2.0_pruned_bf16.safetensors", 8382288792],
  ["video_depth_anything_vits.pth", "13379300b739e659f076a59d52e9801bd8d38c541a7e71f73bbca4dcfb013609", "https://huggingface.co/depth-anything/Video-Depth-Anything-Small/resolve/main/video_depth_anything_vits.pth", 116440756],
  ["minimax_h3_video_vae_int8_convrot.safetensors", "52a2c8c73583c86e4f41cdcce3a6ad0ea562987bc0bf3d60a0cef5f5c8e60c0e", "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_video_vae_int8_convrot.safetensors", 2811065184],
  ["fixed_embed_fwd_anyframe.safetensors", "86ae5987dda844cb80fa4d35d04dddc959f463d04259fbe727b41e80a07e0fde", "https://huggingface.co/drbaph/Viggle-Animate-ComfyUI/resolve/main/text_cond/fixed_embed_fwd_anyframe.safetensors", 3713456],
];

describe("the declared provisions are pinned verbatim", () => {
  it("every row carries its pinned sha256, url and size_bytes", () => {
    const rows = DECL.provisions ?? [];
    assert.deepEqual(rows.map((r) => r.name), PROVISION_PINS.map((p) => p[0]),
      "the pin table IS the declared table — a row added, dropped or renamed is a deliberate edit");
    for (const [name, sha256, url, size_bytes] of PROVISION_PINS) {
      const row = rows.find((r) => r.name === name)!;
      assert.equal(row.sha256, sha256, `${name}: the digest is pinned verbatim — a substituted sha fails here`);
      assert.equal(row.url, url, `${name}: the url is pinned verbatim — a wrong path inside the right repo fails here`);
      assert.equal(row.size_bytes, size_bytes, `${name}: the declared size is pinned verbatim`);
    }
  });

  it("the loras catalog carries the same files as the provisions rows (one truth per file)", () => {
    for (const row of VIGGLE_LORA_ROWS) {
      const provision = (DECL.provisions ?? []).find((p) => p.name === row.filename.split("/").pop());
      assert.ok(provision, `${row.id}: the catalog row's file is declared as a provision (the fetch truth)`);
      assert.equal(provision!.url, row.source_url, `${row.id}: the catalog's provenance url is the provision's url`);
    }
  });
});

// THE SCHEDULE LAW: the emitted sigma string IS the upstream DMD2
// grid — steps 3 reproduces the README baseline verbatim, longer
// schedules ride sigma = 3t/(1+2t) with t evenly spaced 1→0.
describe("the DMD2 sigma schedule computes from the stated step count", () => {
  it("three updates emit the upstream baseline string verbatim", () => {
    assert.equal(dmd2Sigmas(3), "1, 0.8571428571428571, 0.6, 0");
  });

  it("four updates emit the five-point sibling; the schedule always ends at 0", () => {
    assert.equal(dmd2Sigmas(4), "1, 0.9, 0.75, 0.5, 0");
    for (const n of [1, 2, 3, 4, 5, 8]) {
      const points = dmd2Sigmas(n).split(",").map((s) => Number(s.trim()));
      assert.equal(points.length, n + 1, `steps ${n}: n updates ride n+1 sigma points`);
      assert.equal(points[0], 1, "the grid starts at sigma 1");
      assert.equal(points[points.length - 1], 0, "the grid ends at sigma 0");
    }
  });

  it("the married steps consult: the bag's counting row resolves unstated steps, fictional filenames marry nothing, no bag is null", () => {
    assert.equal(
      marriedSteps({ loras: [{ name: "h3/viggle_animate_dmd_lora_r64.safetensors", strength: 1 }] }),
      3,
      "the DMD row's catalog column owns unstated steps",
    );
    assert.equal(marriedSteps({}), null, "no bag, no marriage — the schema default owns");
    assert.equal(
      marriedSteps({ loras: [{ name: "h3/not-a-real-file.safetensors", strength: 1 }] }),
      null,
      "fictional filenames marry nothing (the door-spec's walk-default law)",
    );
  });

  it("the layering law is the card spec's to pin: stated steps beat the marriage in the composed graph", () => {
    // the consult alone is bag-only; the stated-vs-married layering
    // (the doc's own steps > the bag's counting row > the schema
    // default) rides the composed graph — pinned at
    // packages/video/openjutsu/tests/card.spec.ts ("the stated steps
    // re-derives the schedule" over the DMD bag).
    assert.equal(marriedSteps({}), null);
  });

  it("the animate action is a declared spec with the seeded rule and closed facts", () => {
    assert.equal(animate.id, "animate");
    assert.ok(animate.params.some((p) => p.name === "seed" && p.rule === "seed-sentinel"),
      "the seed mints through the ONE sentinel rule");
    const facts = animate.facts({
      unet: "a.safetensors", vae: "b.safetensors",
      text_cond: "c.safetensors", loras: "d.safetensors",
    });
    assert.deepEqual(facts, { unet: "a.safetensors", vae: "b.safetensors", text_cond: "c.safetensors", loras: "d.safetensors" });
    assert.throws(() => animate.facts({ unet: "a.safetensors", vae: "b.safetensors", loras: "d.safetensors" }), /lane_inputs\.text_cond/,
      "a missing lane weight refuses field-named, never composes with an empty filename");
  });
});
