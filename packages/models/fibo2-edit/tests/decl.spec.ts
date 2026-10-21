// @melite/models-fibo2-edit — the model-plugin data pins.
//
// A MODEL PLUGIN carries its WHOLE truth (the operator's law). These
// pins hold the PLUGIN SHAPE + identity + the Fibo 2.0 EDIT lane
// contract (the encoder-emitted latent, the BF16-encoder rule, the
// scoped no-Recipe axis); registration is proven engine-side (the
// walls' registry count, the boot gates).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the fibo2-edit model plugin (BRIA's Fibo 2.0 edit lane, the Comfy-Org repack)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers through ctx.effect", () => {
    assert.equal(family.name, "family-fibo2-edit");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
    // THE DISCHARGE STROKE, executed: registration rides ctx.effect
    // inside apply — the stub proves the call shape (a family that
    // registers outside an effect is a boot-transaction bug).
    let registered: unknown = null;
    let effects = 0;
    (family as { apply: (ctx: unknown) => void }).apply({
      effect(fn: () => void) { effects++; fn(); },
      models: { registerFamily(decl: unknown) { registered = decl; } },
    });
    assert.equal(effects, 1, "apply wraps registration in exactly one effect");
    assert.equal(registered, DECL, "apply registers THIS declaration");
  });

  it("declares the carrier — the third image-edit family, distinct from both qwen lanes", () => {
    assert.equal(DECL.id, "fibo2-edit");
    assert.equal(DECL.genre, "image");
    assert.equal(DECL.form, "form_edit");
    assert.equal(DECL.engine, "comfyui");
    assert.equal(DECL.label, "Fibo 2.0 Edit");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
    assert.deepEqual(ids, ["dev", "edit-turbo"]);
  });

  it("carries the FIBO lane contract: the TextEncodeFibo2 branch key + the BF16-encoder rule", () => {
    const lane = (DECL.lane_inputs ?? {} as Record<string, unknown>);
    assert.equal(lane.text_encode_node, "TextEncodeFibo2", "the facts door refuses any other encoder class");
    assert.equal(lane.clip_type, "fibo2", "the CLIPLoader combo value — the engine's own spelling");
    assert.equal(lane.max_images, 16, "the node's own autogrow capacity (anchor + references)");
    assert.equal(lane.text_encoder, "qwen3vl_4b_bf16.safetensors", "every edit encodes through the BF16 Qwen3-VL — the int8 tower's vision path is the open upstream bug");
    assert.equal(lane.unet, "fibo2_dev_int8_convrot.safetensors", "the family pin is the dev int8 checkpoint");
    assert.equal(lane.latent_node, undefined, "the ACTION owns the encoder-emitted latent — no separate latent node row");
  });

  it("declares NO stated size and NO batch face — the latent law; the solver span stays live", () => {
    const d = DECL.defaults ?? {} as Record<string, unknown>;
    assert.equal(d.width, undefined, "width has no default — the lane takes no stated size");
    assert.equal(d.height, undefined, "height has no default — the lane takes no stated size");
    for (const banned of ["width", "height", "batch_size", "use_stock_nodes", "double_reference"]) {
      assert.ok(!(DECL.params ?? []).includes(banned), `${banned} is off the surface`);
    }
    assert.ok((DECL.params ?? []).includes("match_input_resolution"), "the match toggle stays admitted — the declared no-op, draft compatibility");
    assert.deepEqual(DECL.bounds, { steps: { min: 1, max: 50 } }, "bounds carries ONLY the solver span");
  });

  it("defaults own the numeric zone: the dev lane's official pair (30/5, Euler/simple)", () => {
    assert.deepEqual(DECL.defaults, { steps: 30, sampler: "euler", scheduler: "simple", cfg: 5 });
    const req = DECL.required_defaults ?? [];
    assert.deepEqual(req, [
      { name: "steps", class: "variant" },
      { name: "cfg", class: "variant" },
      { name: "input_images", class: "user" },
      { name: "prompt", class: "user" },
    ], "the required-defaults contract: variants own their sampler pair, the user owns image + instruction");
  });

  it("provisions the two shared weights — the BF16 encoder and the flux2-family VAE; the int8 encoder is NOT offered", () => {
    const provs = DECL.provisions ?? [];
    assert.equal(provs.length, 2);
    const [enc, vae] = provs;
    assert.equal(enc!.name, "qwen3vl_4b_bf16.safetensors");
    assert.ok(enc!.url.startsWith("https://huggingface.co/Comfy-Org/Fibo-2.0/"));
    assert.match(enc!.sha256 ?? "", /^[0-9a-f]{64}$/);
    assert.equal(vae!.name, "flux2-vae.safetensors", "the flux2-family VAE — byte-identical to flux-klein's row, one download serves both lanes");
    assert.ok(!provs.some((p) => p.name.includes("int8")), "the int8 encoder's seat is text-only/FLUX-shared — the edit lane refuses to provision it (issue 17248)");
  });

  it("declares the SCOPED axis: Variant + Quant, NO Recipe group (the recorded judgment)", () => {
    // recipe-rows LAW A refuses a stamp-less Recipe group; this
    // family launches with none — a half-added group would need a
    // stamping row and re-open the census.
    const groups = (DECL.variant_groups ?? []).map((g) => g.id);
    assert.deepEqual(groups, ["Variant", "Quant"]);
    assert.ok(!DECL.variants.some((v) => v.group === "Recipe"), "no Recipe rows either");
    assert.ok(DECL.variants.every((v) => v.sampler_envelope !== undefined), "every offered Variant lane declares its sampler envelope (the envelope law)");
  });

  it("the honest record: the upstream bug and its cure are stated in the DECL's own voice", () => {
    assert.match(DECL.description ?? "", /17248/, "the open upstream issue number rides the description");
    assert.match(DECL.description ?? "", /bf16/i);
    assert.ok(!/non[- ]commercial/i.test(DECL.description ?? ""), "the licence law: BRIA's licensed model, named without the banned phrase");
    assert.match(DECL.variants[1]!.hint ?? "", /4-step/, "the community 4-step report is recorded as deliberately unpinned");
  });
});
