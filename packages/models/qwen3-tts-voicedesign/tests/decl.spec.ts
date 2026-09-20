// @melite/models-qwen3-tts-voicedesign — the model-plugin data pins.
//
// THE 1.7B VOICEDESIGN FAMILY (2026-09-21 — "the larger version"):
// instruction-following voice design with .qvoice export through
// the qvoice_save mod.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the qwen3-tts-voicedesign model plugin (1.7B VoiceDesign, the designer)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-qwen3-tts-voicedesign");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the designer — the larger checkpoint, the save mod", () => {
    assert.equal(DECL.id, "qwen3-tts-voicedesign");
    assert.equal(DECL.label, "Qwen3-TTS 1.7B VoiceDesign");
    assert.equal((DECL.lane_inputs as Record<string, unknown>)["model_path"], "Qwen3-TTS-12Hz-1.7B-VoiceDesign");
    assert.ok((DECL.mods as string[]).includes("qvoice_save"), "design exports through the save mod");
    assert.ok(DECL.variants.length > 0, "a family declares at least one variant");
  });
});
