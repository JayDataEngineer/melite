// THE NO-DEFAULT-VOICE LAW (operator ruling 2026-11-10, verbatim:
// "Make sure it DEFAULTS to no voice, instead of VIVIAN."): the
// family defaults carry NO voice value — the resting lane
// (variant:'customvoice') stays, the persona picker OFFERS the
// presets, and a fresh card seats the voice UNSTATED. The compose
// seat then omits the voice input entirely (the none-voice law,
// tts-segments.ts: "the voice key is omitted entirely so the engine
// node's own default resolution runs"), and the resurrect class dies
// at the root: with no family default there is nothing for prepare
// to re-inject after laneMigrate drops a stated carry. The
// voicedesign/base null stamps STAY by name (the ruling: "KEEP the
// null stamps for the real switches") — they drop a USER-STATED
// voice on a lane whose surface does not declare it; the drop walls
// themselves live in melite-card-view's tts-gate-surface-merge
// (ARM 6/8: the quant and variant pick seams).
// ENGINE TRUTH RECEIPT (live read-only probe, 2026-11-09, :8188/
// object_info): AudiocoreTTS declares `voice` among its OPTIONAL
// inputs — an omitted key is a legal compose, resolved by the node's
// own default (qwen3_tts.py kwargs.get("voice", <default>)).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL, PRESET_SPEAKERS } from "../src/index.ts";
import { speak } from "../src/actions.ts";

// THE FRESH CARD'S RESOLVED ROW: the served facts carry the DECL's
// own defaults verbatim — no hand-added voice anywhere.
const FRESH_FACTS: ModelFacts = {
  id: DECL.id,
  card: "tts",
  defaults: { ...(DECL.defaults as Record<string, string | number | boolean | null>) },
  lane_inputs: (DECL as { lane_inputs?: Record<string, unknown> }).lane_inputs ?? {},
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: (DECL.mods as string[]),
};

const nodeOf = (g: GraphBuilder, classType: string): { inputs: Record<string, unknown> } | undefined =>
  Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
    (n) => n.class_type === classType,
  );

describe("the no-default-voice law (operator ruling 2026-11-10: 'DEFAULTS to no voice, instead of VIVIAN')", () => {
  it("ARM A (THE RED) — the family defaults seat NO voice key; the resting lane and mode stay", () => {
    const defaults = DECL.defaults as Record<string, unknown>;
    assert.equal(
      Object.prototype.hasOwnProperty.call(defaults, "voice"), false,
      "the family defaults must not seed a persona — the fresh card's voice is UNSTATED (red pre-cure: 'vivian' rode the defaults)",
    );
    assert.equal(defaults["variant"], "customvoice", "the resting lane stamp is not the charge — it stays");
    assert.equal(defaults["mode"], "tts", "the lane mode stays");
  });

  it("ARM B (THE COMPOSE TRUTH) — an unstated voice composes with NO persona value (the engine's own default resolution); a stated pick rides", () => {
    const unstated = new GraphBuilder({});
    instantiateAction(speak, { text: "bare words", seed: 7 }, FRESH_FACTS, unstated, "probe-no-voice");
    const synth = nodeOf(unstated, "AudiocoreTTS")!;
    const voice = synth.inputs.voice;
    assert.ok(
      voice === undefined || voice === '',
      `the unstated doc voice must ride NO persona value (red pre-cure: the family default filled 'vivian' in — got ${JSON.stringify(voice)}) — AudiocoreTTS.voice is an OPTIONAL input whose own default resolves it; the '' seat, when present, is the object_info pin's autofill (AUDIACORE_TTS_AUTOFILL), not a persona`,
    );
    const stated = new GraphBuilder({});
    instantiateAction(speak, { text: "bare words", seed: 7, voice: "ryan" }, FRESH_FACTS, stated, "probe-stated-voice");
    assert.equal(nodeOf(stated, "AudiocoreTTS")!.inputs.voice, "ryan", "a stated persona pick rides verbatim");
  });

  it("ARM C (THE STAMPS STAY) — the voicedesign/base null stamps and the preset OFFER survive the ruling", () => {
    const rows = DECL.variants ?? [];
    for (const id of ["voicedesign", "base"]) {
      const row = rows.find((v) => v.id === id);
      assert.equal(
        (row?.resolver_defaults as Record<string, unknown> | undefined)?.voice, null,
        `the ${id} lane keeps its null stamp — a USER-STATED carry still drops on the real switch`,
      );
    }
    assert.ok(PRESET_SPEAKERS.includes("vivian"), "vivian stays an OFFERED pick — the ruling kills the seed, never the choice");
  });

  it("ARM D (THE NO-NON-SPEAKER LAW, operator 2026-11-12 told ten times: 'Custom Voice has no non-speaker') — 'none' is not in the offer", () => {
    assert.ok(
      !PRESET_SPEAKERS.includes("none"),
      "the offer carries no 'none' — it fired nothing on any path (bare: engine refuse; qvoice loaded: the branch fires before this row is read)",
    );
    assert.ok(
      PRESET_SPEAKERS.length > 0 && PRESET_SPEAKERS.every((s) => s !== ""),
      "every offered pick is a real speaker",
    );
  });
});
