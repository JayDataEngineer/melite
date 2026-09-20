// @melite/models-qwen3-tts — the model-plugin data pins.
//
// THE 0.6B CUSTOMVOICE FAMILY (2026-09-21 — the operator's README
// stroke: one DECL per checkpoint line). This package owns the
// CustomVoice truth only: 9 preset personas + instruct-text emotion
// control on the merged 0.6B checkpoint, .qvoice embedding load.
// Siblings: models-qwen3-tts-base (the cloner), models-qwen3-tts-
// voicedesign (the 1.7B designer).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the qwen3-tts model plugin (0.6B CustomVoice, one family, one package)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-qwen3-tts");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — personas + instruct on the merged checkpoint, qvoice load only", () => {
    assert.equal(DECL.id, "qwen3-tts");
    assert.equal(DECL.label, "Qwen3-TTS 0.6B CustomVoice");
    assert.equal((DECL.lane_inputs as Record<string, unknown>)["model_path"], "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged");
    assert.ok((DECL.mods as string[]).includes("qvoice"), "customvoice loads embeddings");
    assert.ok(!(DECL.mods as string[]).includes("qvoice_save"), "design-export lives on the design family");
    assert.ok(DECL.variants.length > 0, "a family declares at least one variant");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
  });
});
