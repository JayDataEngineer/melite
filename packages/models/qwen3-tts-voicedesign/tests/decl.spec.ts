// @melite/models-qwen3-tts-voicedesign — the model-plugin data pins.
//
// THE 1.7B MODEL (the operator's table: SIZES are models — this is
// "the bigger TTS"; FLAVORS are variants — this model carries
// VoiceDesign). Instruction-following voice design with .qvoice
// export through the qvoice_save mod. Sibling: models-qwen3-tts
// (the 0.6B model: CustomVoice + Base variants).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the qwen3-tts-voicedesign model plugin (1.7B, the VoiceDesign variant)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-qwen3-tts-voicedesign");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("MODEL names the checkpoint — no flavor in the Model seat", () => {
    assert.equal(DECL.id, "qwen3-tts-voicedesign");
    assert.equal(DECL.label, "Qwen3-TTS 1.7B");
    assert.equal((DECL.lane_inputs as Record<string, unknown>)["model_path"], "Qwen3-TTS-12Hz-1.7B-VoiceDesign");
    assert.ok((DECL.mods as string[]).includes("qvoice_save"), "design exports through the save mod");
    assert.ok(DECL.variants.length > 0, "a family declares at least one variant");
  });

  it("VARIANT names the submodel — VoiceDesign, route kept (no draft migration)", () => {
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
    const design = DECL.variants.find((v) => v.group === "Variant")!;
    assert.equal(design.id, "voicedesign");
    assert.equal(design.label, "VoiceDesign");
    assert.equal(design.route, "qwen3-tts-voicedesign", "the address never moves");
  });
});
