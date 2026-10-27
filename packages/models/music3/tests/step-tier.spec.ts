// step-tier.spec.ts — THE STEP↔CHECKPOINT TIER (audit 014 C4).
//
// THE BURN: the template marries a checkpoint to its step count —
// the official bodies (fp16 + int8_convrot) sample 30 steps, and a
// distilled body is the ONLY tier allowed below. A future distilled
// row landing without its own bound (or a hand stamp drifting the
// envelope from the derivation) would compose a divergent pairing
// the engine answers with garbage — every suite green, the same
// class as the D1 latent drift.
//
// THE LAW, three faces:
//   1. DERIVATION — the unet filename IS the tier (distilled marks
//      only; everything else is full-schedule).
//   2. PAIRING — a stated steps rides only inside its checkpoint's
//      domain, else the compose refuses loud naming the pairing.
//   3. STAMPS — the DECL's variant rows spread FROM this module: the
//      envelope steps span IS the tier's domain and the resolver
//      default IS the tier's default, derived over the real variant
//      cells (a roster no hand maintains) — a distilled row without
//      its bound reds here, at DECL time.
//
// Run: npx vitest run packages/models/music3/tests/step-tier.spec.ts
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL, compose } from "../src/index.ts";
import {
  MUSIC3_DISTILLED_STEPS,
  MUSIC3_FULL_STEPS,
  assertMusic3StepsInTier,
  music3StepTier,
  music3StepsEnvelope,
} from "../src/tier.ts";

describe("the step tier derives from the checkpoint filename (audit 014 C4)", () => {
  it("the template's own bodies are full-schedule", () => {
    assert.equal(music3StepTier("minimax_music3_dit_fp16.safetensors").tier, "full");
    assert.equal(music3StepTier("minimax_music3_dit_int8_convrot.safetensors").tier, "full");
  });

  it("only a distilled mark unlocks the distilled tier", () => {
    for (const name of [
      "minimax_music3_dit_turbo.safetensors",
      "minimax_music3_dit_lightning_int8.safetensors",
      "MINIMAX_MUSIC3_DIT_Distill_fp16.safetensors",
    ]) {
      assert.equal(music3StepTier(name).tier, "distilled", `${name} reads distilled`);
    }
    assert.equal(music3StepTier("minimax_music3_dit_fp16.safetensors").tier, "full",
      "the atom never reads distilled — the mark, not the quant, unlocks the tier");
  });

  it("the domains are the audit's windows (full 30–200, distilled 8–12)", () => {
    assert.deepEqual(
      [MUSIC3_FULL_STEPS.min, MUSIC3_FULL_STEPS.max, MUSIC3_FULL_STEPS.default],
      [30, 200, 30]);
    assert.deepEqual(
      [MUSIC3_DISTILLED_STEPS.min, MUSIC3_DISTILLED_STEPS.max, MUSIC3_DISTILLED_STEPS.default],
      [8, 12, 10]);
  });

  it("the envelope spreads the tier's steps beside the family's cfg domain", () => {
    assert.deepEqual(music3StepsEnvelope(MUSIC3_FULL_STEPS, [0.1, 10]), { steps: [30, 200], cfg: [0.1, 10] });
    assert.deepEqual(music3StepsEnvelope(MUSIC3_DISTILLED_STEPS, [0.1, 10]), { steps: [8, 12], cfg: [0.1, 10] });
  });
});

describe("the compose-side pairing judge (audit 014 C4)", () => {
  it("a stated steps rides inside its checkpoint's domain", () => {
    assert.equal(
      assertMusic3StepsInTier("minimax_music3_dit_fp16.safetensors", 30).tier, "full");
    assert.equal(
      assertMusic3StepsInTier("minimax_music3_dit_fp16.safetensors", 200).tier, "full",
      "the ceiling rides");
    assert.equal(
      assertMusic3StepsInTier("minimax_music3_dit_turbo.safetensors", 8).tier, "distilled",
      "the distilled floor rides on a distilled body");
  });

  it("a stated steps outside its checkpoint's domain refuses loud, naming the pairing", () => {
    assert.throws(
      () => assertMusic3StepsInTier("minimax_music3_dit_fp16.safetensors", 29),
      /n_diffusion_steps 29 is outside the full tier's \[30, 200\] window for checkpoint 'minimax_music3_dit_fp16\.safetensors'/,
      "one step under the full floor refuses with the checkpoint, tier, and domain named");
    assert.throws(
      () => assertMusic3StepsInTier("minimax_music3_dit_fp16.safetensors", 201),
      /outside the full tier's \[30, 200\] window/,
      "one step past the ceiling refuses");
    assert.throws(
      () => assertMusic3StepsInTier("minimax_music3_dit_turbo.safetensors", 30),
      /outside the distilled tier's \[8, 12\] window/,
      "a full-schedule stamp on a distilled body refuses — the stamp follows the checkpoint, never the habit");
    assert.throws(
      () => assertMusic3StepsInTier("minimax_music3_dit_fp16.safetensors", 7.5),
      /outside the full tier/,
      "a fractional steps refuses — the domain is integers");
  });
});

describe("the compose honors the tier (audit 014 C4)", () => {
  const FACTS: ModelFacts = {
    id: DECL.id,
    card: "music",
    defaults: {},
    lane_inputs: (DECL as { lane_inputs?: Record<string, unknown> }).lane_inputs ?? {},
    variants: [],
    variant_groups: [],
    outputs: [],
  };
  const BASE = {
    prompt: "funk, pop, soul, guitar, 105 BPM",
    lyrics: "[verse]shine a light",
    duration: 30,
    guidance_scale: 1.7,
    lm_cfg_scale: 1.7,
    seed: 42,
  };
  const stepsOf = (g: GraphBuilder): unknown =>
    Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>)
      .find((n) => n.class_type === "KSampler")!.inputs.steps;

  it("an unstated steps rides the checkpoint's own default (no second default home)", () => {
    const g = new GraphBuilder({});
    instantiateAction(compose, { ...BASE }, FACTS, g, "probe-tier-default");
    assert.equal(stepsOf(g), MUSIC3_FULL_STEPS.default,
      "the unstated compose samples the fp16 tier's default — the card schema derives the same number");
  });

  it("a stated steps inside the domain rides verbatim", () => {
    const g = new GraphBuilder({});
    instantiateAction(compose, { ...BASE, n_diffusion_steps: 48 }, FACTS, g, "probe-tier-stated");
    assert.equal(stepsOf(g), 48, "the in-tier stamp reaches the sampler");
  });

  it("a stated steps outside the domain refuses before any node composes", () => {
    assert.throws(
      () => {
        const g = new GraphBuilder({});
        instantiateAction(compose, { ...BASE, n_diffusion_steps: 12 }, FACTS, g, "probe-tier-divergent");
      },
      /n_diffusion_steps 12 is outside the full tier's \[30, 200\] window/,
      "a distilled stamp on the full-schedule body refuses — the divergent pairing never composes");
  });
});

describe("the DECL's variant stamps ARE the tier derivation (audit 014 C4)", () => {
  it("every offered Variant row's envelope + resolver default match its cells' tier (the derived roster)", () => {
    // THE ROSTER no hand maintains: every offered Variant row, every
    // offered cell, the cell's load folded the resolver's own way
    // (atom ∪ variant ∪ cell — the cell-lane cascade the compose
    // stamps). A distilled row landing with full stamps (or no
    // stamps) reds here, never composes.
    const offered = DECL.variants.filter((x) => x.group === "Variant" && !x.hide_from_dropdown);
    assert.ok(offered.length >= 1, "the family offers at least one body variant");
    for (const v of offered) {
      const cells = (v.cells ?? []).filter((c) => !c.hide_from_dropdown);
      assert.ok(cells.length >= 1, `variant '${v.id}': the tier wall needs a served cell`);
      for (const c of cells) {
        const unet = (
          (c.lane_inputs as Record<string, unknown> | undefined)?.["unet"]
          ?? (v.lane_inputs as Record<string, unknown> | undefined)?.["unet"]
          ?? (DECL.lane_inputs as Record<string, unknown>)["unet"]
        ) as string;
        const tier = music3StepTier(unet);
        const envelope = (v as { sampler_envelope?: { steps?: readonly number[] } }).sampler_envelope;
        assert.deepEqual(envelope?.steps, [tier.min, tier.max],
          `variant '${v.id}' cell '${String(c.quant)}' (${unet}): the envelope steps span IS the ${tier.tier} tier's domain`);
        const stamped = (v as { resolver_defaults?: Record<string, unknown> }).resolver_defaults?.["n_diffusion_steps"];
        assert.equal(stamped, tier.default,
          `variant '${v.id}' cell '${String(c.quant)}' (${unet}): the resolver default IS the ${tier.tier} tier's default (one home, tier.ts)`);
      }
    }
  });

  it("the card-served default is the full tier's default (the shared face does not drift)", () => {
    assert.equal(MUSIC3_FULL_STEPS.default, 30,
      "the card schema derives its default from here (card.ts) — a drift reds both seats");
  });
});
