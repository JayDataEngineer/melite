// decode-tier.spec.ts — THE VRAM-AWARE DECODE TIER (audit 014 C3).
//
// THE BURN: the official template wires VAEDecodeAudioTiled with a
// hardcoded true — and its own model note seats int8_convrot as the
// low-VRAM body. Our compose hardcoded the plain decode: on a small
// box a long track OOMs the VAE decode, and no knob could flip it
// without re-composing the lane.
//
// THE LAW, three faces:
//   1. DERIVATION — the strategy derives from the lane's own signal
//      (the resolved cell's DECL-declared vram_peak_gb + the track's
//      duration cap): a low-VRAM cell or a long track tiles; a
//      measured roomy cell at a short track decodes plain. Absence
//      of a knob IS the derivation's seat (no second default home).
//   2. SEATS — the tiled node's tile/overlap are the template's own
//      (1536/64), inside the engine's declared bounds.
//   3. OVERRIDE — a stated knob wins over the derivation, either way.
//
// Run: npx vitest run packages/models/music3/tests/decode-tier.spec.ts
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL, compose } from "../src/index.ts";
import {
  TILED_DECODE_SEATS,
  TILED_DURATION_CEIL_S,
  TILED_VRAM_FLOOR_GB,
  deriveDecodeTier,
} from "../src/decode.ts";

const BASE = {
  prompt: "funk, pop, soul, guitar, 105 BPM",
  lyrics: "[verse]shine a light",
  duration: 30,
  guidance_scale: 1.7,
  n_diffusion_steps: 30,
  lm_cfg_scale: 1.7,
  seed: 42,
};

/** The facts door's shape with the DECL's atom lanes; variants hand-set per arm. */
const factsWith = (variants: ModelFacts["variants"]): ModelFacts => ({
  id: DECL.id,
  card: "music",
  defaults: {},
  lane_inputs: (DECL as { lane_inputs?: Record<string, unknown> }).lane_inputs ?? {},
  variants,
  variant_groups: [],
  outputs: [],
});

/** A complete variant row (the facts type's required face — label,
 *  route, resolver stamps, defaults) with the arm's cells. */
const variantRow = (
  id: string,
  group: string,
  cells: ModelFacts["variants"][number]["cells"],
): ModelFacts["variants"][number] => ({
  id,
  label: id,
  group,
  route: id === "standard" ? "music3" : id,
  resolver_defaults: {},
  defaults: {},
  cells,
});

/** A complete matrix cell (the facts type's required face) with the arm's peak. */
const cell = (
  quant: string,
  route: string,
  vram_peak_gb: number | null,
  hide_from_dropdown?: boolean,
): ModelFacts["variants"][number]["cells"][number] => ({
  quant,
  label: quant,
  route,
  ...(hide_from_dropdown === true ? { hide_from_dropdown: true as const } : {}),
  artifact: "",
  vram_peak_gb,
});

const classesOf = (g: GraphBuilder): string[] =>
  Object.values(g.toJSON() as Record<string, { class_type: string }>).map((n) => n.class_type);

const tiledNodeOf = (g: GraphBuilder): { inputs: Record<string, unknown> } =>
  Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>)
    .find((n) => n.class_type === "VAEDecodeAudioTiled")!;

describe("the decode derivation (audit 014 C3)", () => {
  it("the box cut is the audit's: floor 16 GB, ceiling 90 s", () => {
    assert.equal(TILED_VRAM_FLOOR_GB, 16);
    assert.equal(TILED_DURATION_CEIL_S, 90);
  });

  it("a measured roomy cell at a short track decodes plain", () => {
    assert.equal(deriveDecodeTier(20, 30), "plain");
    assert.equal(deriveDecodeTier(null, 30), "plain",
      "an unmeasured body is never called low-VRAM (the audition-gated peak class)");
  });

  it("past the size ceiling the decode tiles regardless of the peak", () => {
    assert.equal(deriveDecodeTier(20, 91), "tiled");
    assert.equal(deriveDecodeTier(null, 360), "tiled",
      "a matrix-less hand fixture still tiles a full-length track");
    assert.equal(deriveDecodeTier(20, 90), "plain", "the ceiling itself rides plain");
  });

  it("under the VRAM floor the decode tiles at any short track", () => {
    assert.equal(deriveDecodeTier(12, 30), "tiled");
    assert.equal(deriveDecodeTier(16, 30), "plain", "the floor itself rides plain");
  });

  it("the tiled seats are the template's own, inside the engine's bounds", () => {
    assert.deepEqual({ ...TILED_DECODE_SEATS }, { tile_size: 1536, overlap: 64 });
    assert.ok(1536 >= 32 && 1536 <= 8192, "tile_size inside the engine's [32, 8192]");
    assert.ok(64 >= 0 && 64 <= 1024, "overlap inside the engine's [0, 1024]");
  });
});

describe("the composed decode node (audit 014 C3)", () => {
  it("unstated at a short track on the default matrix: plain (the derivation owns the seat)", () => {
    const g = new GraphBuilder({});
    instantiateAction(compose, { ...BASE }, factsWith([]), g, "probe-plain");
    const classes = classesOf(g);
    assert.ok(classes.includes("VAEDecodeAudio"), "the plain decode composes");
    assert.ok(!classes.includes("VAEDecodeAudioTiled"), "no tiled node rides an unstated short compose");
  });

  it("a stated true tiles with the template's seats at the same short track", () => {
    const g = new GraphBuilder({});
    instantiateAction(compose, { ...BASE, tiled_decode: true }, factsWith([]), g, "probe-stated-tiled");
    assert.ok(!classesOf(g).includes("VAEDecodeAudio"), "the stated knob replaces the plain decode");
    assert.deepEqual(
      { tile_size: tiledNodeOf(g).inputs["tile_size"], overlap: tiledNodeOf(g).inputs["overlap"] },
      { tile_size: 1536, overlap: 64 },
      "the tiled seats are the template's own");
  });

  it("a stated false holds plain past the size ceiling (the override wins)", () => {
    const g = new GraphBuilder({});
    instantiateAction(compose, { ...BASE, duration: 360, tiled_decode: false }, factsWith([]), g, "probe-stated-plain");
    assert.ok(classesOf(g).includes("VAEDecodeAudio"), "stated false decodes plain even at 360 s");
  });

  it("unstated past the size ceiling: tiled (the duration cap is the size signal)", () => {
    const g = new GraphBuilder({});
    instantiateAction(compose, { ...BASE, duration: 360 }, factsWith([]), g, "probe-long");
    assert.ok(classesOf(g).includes("VAEDecodeAudioTiled"), "a full-length track tiles without a stated knob");
  });

  it("the resolved cell's own peak drives the derivation (the resolver's coordinate law)", () => {
    // The low-VRAM cell's address claims its own peak (the int8
    // route's DECL-declared number, under the floor): short track,
    // still tiled. The Recipe row rides the same matrix — the
    // coordinate loop skips non-Variant rows.
    const lowVram = [
      variantRow("short-sting", "Recipe", []),
      variantRow("standard", "Variant", [cell("int8_convrot", "music3-int8", 12)]),
    ];
    const a = new GraphBuilder({});
    instantiateAction(compose, { ...BASE }, factsWith(lowVram), a, "probe-cell-low");
    assert.ok(classesOf(a).includes("VAEDecodeAudioTiled"),
      "the int8 address's own peak tiles a 30 s track — the derivation reads the cell, never the atom");
    // The family address claims the default cell (no peak measured):
    // plain at the same short track.
    const roomy = [
      variantRow("standard", "Variant", [cell("fp16", "music3", null)]),
    ];
    const b = new GraphBuilder({});
    instantiateAction(compose, { ...BASE }, factsWith(roomy), b, "probe-cell-roomy");
    assert.ok(classesOf(b).includes("VAEDecodeAudio"), "the default address decodes plain at 30 s");
    // A matrix-less hand fixture (no variants at all) reads null —
    // unmeasured, never low-VRAM.
    const c = new GraphBuilder({});
    instantiateAction(compose, { ...BASE }, factsWith([]), c, "probe-cell-less");
    assert.ok(classesOf(c).includes("VAEDecodeAudio"), "no matrix reads plain at a short track");
  });

  it("an unmatrixed facts row (variants absent) reads null — the defensive fold", () => {
    const g = new GraphBuilder({});
    const bare = factsWith(undefined as unknown as ModelFacts["variants"]);
    instantiateAction(compose, { ...BASE }, bare, g, "probe-no-variants");
    assert.ok(classesOf(g).includes("VAEDecodeAudio"), "absent variants compose plain at a short track");
  });

  it("a variant row with no served cell falls past the matrix — the hidden-cell fold", () => {
    const hidden = [
      variantRow("standard", "Variant", [cell("int8_convrot", "music3-int8", 12, true)]),
    ];
    const g = new GraphBuilder({});
    instantiateAction(compose, { ...BASE }, factsWith(hidden), g, "probe-hidden-cell");
    assert.ok(classesOf(g).includes("VAEDecodeAudio"),
      "a hidden low-VRAM cell is not the derivation's seat — the unstated compose reads plain");
    const cellLess = [{
      ...variantRow("standard", "Variant", []),
      cells: undefined as unknown as ModelFacts["variants"][number]["cells"],
    }];
    const h = new GraphBuilder({});
    instantiateAction(compose, { ...BASE }, factsWith(cellLess), h, "probe-no-cells");
    assert.ok(classesOf(h).includes("VAEDecodeAudio"), "a cell-less row reads plain at a short track");
  });

  it("an omitted duration composes (the size signal reads 0 — never a crash)", () => {
    const { duration: _dropped, ...noDuration } = BASE;
    const g = new GraphBuilder({});
    instantiateAction(compose, { ...noDuration }, factsWith([]), g, "probe-no-duration");
    assert.ok(classesOf(g).includes("VAEDecodeAudio"), "no duration cap tiles nothing");
  });
});
