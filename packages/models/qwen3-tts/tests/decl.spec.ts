// @melite/models-qwen3-tts — the model-plugin data pins.
//
// THE 0.6B FAMILY (the operator's table: SIZES are models, FLAVORS
// are variants — "for models there is .6B or 1.7B; for the variants
// there is Base, CustomVoice, VoiceDesign"). This package owns the
// .6 checkpoint with TWO variant lanes: CustomVoice synthesis
// (personas + style control) and the Base 3-second clone. The old
// qwen3-tts-base FAMILY is dead — Base is a variant route
// ('qwen3-tts-base'), so old drafts keep resolving to the clone
// lane. Sibling: models-qwen3-tts-voicedesign (the 1.7B model).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the qwen3-tts model plugin (0.6B, two variants)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-qwen3-tts");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("MODEL names the checkpoint — no flavor in the Model seat", () => {
    assert.equal(DECL.id, "qwen3-tts");
    assert.equal(DECL.label, "Qwen3-TTS 0.6B");
    assert.equal((DECL.lane_inputs as Record<string, unknown>)["model_path"], "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged");
    assert.ok((DECL.mods as string[]).includes("qvoice"), "the family loads embeddings (the CustomVoice lane)");
    // QVOICE SAVES AND LOADS ACROSS ALL qwen3-tts (operator
    // 2026-09-23, the full law): the save pack boards here too — the
    // studio exporter fires from any lane (it loads its own
    // variants), while the checkpoint matrix keeps the 1:1 upstream
    // table (no VoiceDesign variant rides the 0.6B — that lane
    // alone stays unclaimed below).
    assert.ok((DECL.mods as string[]).includes("qvoice_save"), "the save fires from any lane (the studio exporter)");
    assert.ok(
      !DECL.variants.some((v) => v.id === "voicedesign"),
      "design-export boards as a MOD, never a 0.6B variant lane (the 1:1 upstream released-models table holds)",
    );
  });

  it("VARIANTS name the submodels — CustomVoice first (the head), Base second (the clone)", () => {
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
    const custom = DECL.variants[0]!;
    assert.equal(custom.id, "customvoice", "the head variant is CustomVoice (the family address resolves here)");
    assert.equal(custom.route, "qwen3-tts");
    assert.equal(custom.group, "Variant");
    const base = DECL.variants.find((v) => v.id === "base")!;
    assert.ok(base, "Base rides as a variant, never a family");
    assert.equal(base.label, "Base");
    assert.equal(base.route, "qwen3-tts-base", "the dead family's address survives as the variant route — old drafts keep resolving");
  });

  it("the Base variant carries the clone lane — byte-identical to the dead family's truth", () => {
    const base = DECL.variants.find((v) => v.id === "base")!;
    const li = base.lane_inputs as Record<string, unknown>;
    assert.equal(li["synth_lane"], "clone", "the lane branch reads data, never the family id");
    assert.equal(li["model_path"], "qwen3-tts", "the clone checkpoint address, verbatim from the dead family");
    const resolver = base.resolver_defaults as Record<string, unknown>;
    assert.equal(resolver["model"], "qwen3-tts-base", "the re-point stamp (krea-2-raw precedent) resolves variant picks server-side");
    assert.equal(resolver["voice"], null, "the NULL stamp unsets the inherited persona (the clone takes no voice)");
  });
});
