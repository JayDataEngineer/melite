// the wire is pinned to a COMMITTED GOLDEN — recorded while the kit's legacy
// musicT1 still existed and this spec compared the two arms byte-for-byte.
// That arm is deleted (the families own their lanes now), so the golden
// carries the compatibility law. The DECL's lane_inputs are the facts door
// (the MiniMax trio rail); a missing weight refuses field-named, never
// composes with an empty filename. GATE S rides the declared seed-sentinel
// param (the interpreter mints before the factory runs).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { join } from "node:path";
import { DECL } from "../src/index.ts";
import { compose, parseMusicFacts } from "../src/actions.ts";

// The REAL resolved shape the service hands compose: the family row
// with the DECL's own lane_inputs (the registry owns lane truth).
const packs = (m: Array<string | { pack: string }>): string[] => m.map((x) => (typeof x === "string" ? x : x.pack));
const FACTS: ModelFacts = {
  id: DECL.id,
  card: "music",
  defaults: {},
  lane_inputs: (DECL as { lane_inputs?: Record<string, unknown> }).lane_inputs ?? {},
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: DECL.mods === undefined ? undefined : packs(DECL.mods),
};

const PARAMS = {
  prompt: "funk, pop, soul, guitar, 105 BPM",
  lyrics: "[verse]shine a light",
  duration: 30,
  guidance_scale: 1.7,
  n_diffusion_steps: 30,
  lm_cfg_scale: 1.7,
  seed: 42,
};

const samplerOf = (g: GraphBuilder): { inputs: Record<string, unknown> } =>
  Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
    (n) => n.class_type === "KSampler",
  )!;

const encodeOf = (g: GraphBuilder): { inputs: Record<string, unknown> } =>
  Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
    (n) => n.class_type === "MiniMaxMusic3TextEncode",
  )!;

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

describe("the music3 compose action — byte-stability (the compatibility law)", () => {
  it("the composed prompt is the committed golden (explicit seed — the sentinel passes through)", () => {
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS }, FACTS, action, "probe");
    assertGraphGolden(golden("the-composed-prompt-is-the-committed-golden-explicit-seed-th"), graphOf(action), "the composed prompt is the committed golden (explicit seed — the sentinel passes through)");
    assert.equal(samplerOf(action).inputs.seed, 42, "the explicit seed rides verbatim");
    const save = Object.values(action.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
      (n) => n.class_type === "SaveAudioAdvanced",
    )!;
    assert.equal(save.inputs.filename_prefix, "probe/music", "compose stamps the run prefix");
    assert.equal(save.inputs.format, "mp3", "the mp3 pin rides");
  });

  it("the golden holds with re-stated knobs (duration + steps)", () => {
    const p = { ...PARAMS, seed: 7, duration: 90, n_diffusion_steps: 48, guidance_scale: 3.2 };
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...p }, FACTS, action, "probe-knobs");
    assertGraphGolden(golden("the-golden-holds-with-re-stated-knobs-duration-steps"), graphOf(action), "the golden holds with re-stated knobs (duration + steps)");
    assert.equal(samplerOf(action).inputs.steps, 48, "the restated steps ride");
  });

  it("GATE S — seed -1 mints ONCE per compose; two runs differ (the sentinel law)", () => {
    const a = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS, seed: -1 }, FACTS, a, "probe-mint-a");
    const b = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS, seed: -1 }, FACTS, b, "probe-mint-b");
    const seedA = samplerOf(a).inputs.seed as number;
    const seedB = samplerOf(b).inputs.seed as number;
    assert.ok(seedA >= 0 && seedB >= 0, "the minted sentinel is a concrete seed");
    assert.notEqual(seedA, seedB, "each compose mints its own sentinel");
    // AUDIT 014 C2 — the pairing: the mint lands on BOTH seed seats
    // (the sampler AND the AR encoder read the same seed), never a
    // raw -1 at either consumer (the 2026-09-09 engine-400 burn).
    assert.equal(encodeOf(a).inputs.seed, seedA, "the encoder reads the same mint as the sampler");
    assert.equal(encodeOf(b).inputs.seed, seedB, "the encoder reads the same mint as the sampler");
  });

  it("a stated seed rides VERBATIM at both seed seats (audit 014 C2 — the pairing's second arm)", () => {
    // The split-brain lesson: one arm mints (above), a second arm
    // states — a stated seed pairing that drifted would pass the
    // mint arm while the engine sampled unconditioned noise.
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS, seed: 4242 }, FACTS, action, "probe-stated-seed");
    assert.equal(samplerOf(action).inputs.seed, 4242, "the sampler reads the stated seed");
    assert.equal(encodeOf(action).inputs.seed, 4242, "the encoder reads the same stated seed");
  });

  it("the facts door refuses a missing weight field-named, never composes an empty filename", () => {
    assert.throws(
      () => parseMusicFacts({ unet: "dit.safetensors", text_encoder: "te.safetensors", clip_type: "minimax", vae: "" }),
      /^Error: music3 compose: lane_inputs\.vae = "" — a non-empty string is required$/
    );
    assert.throws(
      () => parseMusicFacts({ text_encoder: "te.safetensors", clip_type: "minimax", vae: "dav.safetensors" }),
      /^Error: music3 compose: lane_inputs\.unet = undefined — a non-empty string is required$/
    );
    // the DECL's own lane_inputs parse clean (the admission gate's
    // proof — registration runs this same parse).
    const facts = parseMusicFacts((DECL as { lane_inputs: Record<string, unknown> }).lane_inputs as Parameters<typeof parseMusicFacts>[0]);
    // audit 014 C5: the atom's unet is the fp16 body the official
    // template composes (the family default); the int8 file moved to
    // its cell's own lane stamp.
    assert.equal(facts.unet, "minimax_music3_dit_fp16.safetensors");
    assert.equal(facts.clip_type, "minimax");
  });

  it("the latent's seconds is the AR's realized-length link — the duration owns ONE seat (audit 014 D1)", () => {
    // The official template derives EmptyMiniMaxMusic3LatentAudio.seconds from
    // MiniMaxMusic3TextEncode's SECOND output (the realized AR length, template
    // link 20). Stamping the user's duration literal there let the seats diverge
    // when the AR ended the song early: the DiT zero-pads the conditioning and
    // the tail generates unconditioned noise — the reported "devolves into
    // garbage". The wall: the link rides slot 1, and the duration literal
    // appears on exactly ONE engine seat (max_duration, the AR's cap).
    const p = { ...PARAMS, duration: 77 };
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...p }, FACTS, action, "probe-ar-len");
    const g = graphOf(action);
    const latent = Object.values(g).find((n) => n.class_type === "EmptyMiniMaxMusic3LatentAudio")!;
    const encodeEntry = Object.entries(g).find(([, n]) => n.class_type === "MiniMaxMusic3TextEncode")!;
    assert.ok(latent, "compose emits the empty latent");
    assert.deepEqual(latent.inputs.seconds, [encodeEntry[0], 1], "seconds rides the encoder's slot-1 AR-length link");
    const literalSeats = Object.values(g).flatMap((n) =>
      Object.entries(n.inputs).filter(([, v]) => v === p.duration).map(([k]) => `${n.class_type}.${k}`)
    );
    assert.deepEqual(literalSeats, ["MiniMaxMusic3TextEncode.max_duration"], "the duration literal lives on exactly one seat");
  });

  it("the prompt routes to the encoder caption, the lyrics to lyrics (the genre IS the caption)", () => {
    // There is no genre knob — the caption text is the genre. A
    // caption/lyrics swap still matches the golden only by luck, so
    // the routing gets its own arm: the doc's prompt lands on
    // MiniMaxMusic3TextEncode.caption VERBATIM and the doc's lyrics
    // on lyrics.
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS }, FACTS, action, "probe-routing");
    const encode = Object.values(graphOf(action)).find((n) => n.class_type === "MiniMaxMusic3TextEncode")!;
    assert.ok(encode, "compose emits the MiniMax text encoder");
    assert.equal(encode.inputs.caption, PARAMS.prompt, "the doc prompt IS the encoder caption");
    assert.equal(encode.inputs.lyrics, PARAMS.lyrics, "the doc lyrics ride lyrics, never the caption");
  });
});
