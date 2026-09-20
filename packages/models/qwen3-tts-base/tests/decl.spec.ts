// @melite/models-qwen3-tts-base — the model-plugin data pins.
//
// THE 0.6B BASE FAMILY (2026-09-21): a CLONER — reference audio +
// transcript in, the speaker's voice out. Never an embedding
// loader, never a persona picker: mods [].
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the qwen3-tts-base model plugin (0.6B Base, the cloner)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-qwen3-tts-base");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the cloner — clone description, base checkpoint, no mods", () => {
    assert.equal(DECL.id, "qwen3-tts-base");
    assert.equal(DECL.label, "Qwen3-TTS 0.6B Base");
    assert.match(DECL.description ?? "", /clone/i, "base clones — 'plain TTS, no persona' was fiction");
    assert.equal((DECL.lane_inputs as Record<string, unknown>)["model_path"], "qwen3-tts");
    assert.deepEqual(DECL.mods, [], "base boards no mod: no voice knobs, no embeddings, no design");
    assert.ok(DECL.variants.length > 0, "a family declares at least one variant");
  });
});
