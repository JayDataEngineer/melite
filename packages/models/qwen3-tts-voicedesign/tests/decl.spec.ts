// @melite/models-qwen3-tts-voicedesign — the model-plugin data pins.
//
// THE 1.7B MODEL (the operator's table: SIZES are models — this is
// "the bigger TTS"; FLAVORS are variants). THE 1:1 LAW (operator
// 2026-09-23: match QwenLM/Qwen3-TTS exactly): upstream releases
// THREE 1.7B checkpoints — CustomVoice, VoiceDesign, Base — all
// three ride here as variants, each naming its own upstream
// artifact (autoprovision downloads on resolve; the VoiceDesign
// receipt 2026-09-23 proved the path). Sibling: models-qwen3-tts
// (the 0.6B model: CustomVoice + Base variants).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family, LANE_TOPOLOGY } from "../src/index.ts";

describe("the qwen3-tts-voicedesign model plugin (1.7B, the full 1:1 flavor matrix)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-qwen3-tts-voicedesign");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("MODEL names the checkpoint family — no flavor in the Model seat", () => {
    assert.equal(DECL.id, "qwen3-tts-voicedesign");
    assert.equal(DECL.label, "Qwen3-TTS 1.7B");
    assert.ok((DECL.mods as string[]).includes("qvoice_save"), "design exports through the save mod");
    assert.ok((DECL.mods as string[]).includes("qvoice"), "the qvoice carry boards the family (across ALL qwen3-tts — the operator's law)");
  });

  it("THE 1:1 MATRIX: all three upstream 1.7B checkpoints ride as variants, each naming its own artifact", () => {
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
    const byId = Object.fromEntries(DECL.variants.map((v) => [v.id, v]));
    assert.deepEqual([...ids].sort(), ["base", "customvoice", "voicedesign"], "upstream's three 1.7B flavors, nothing invented");
    const cv = byId["customvoice"]!;
    // THE SNAPSHOT LAW (transcript-014): the 1.7B CustomVoice weights ship only as the
    // HF cache snapshot — the lane names the real, loadable address, never the phantom dir.
    assert.equal((cv.lane_inputs as Record<string, unknown>)["model_path"], "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged");
    assert.equal(LANE_TOPOLOGY.customvoice?.synth_lane, "speak");
    const vd = byId["voicedesign"]!;
    assert.equal((vd.lane_inputs as Record<string, unknown>)["model_path"], "Qwen3-TTS-12Hz-1.7B-VoiceDesign");
    assert.equal(LANE_TOPOLOGY.voicedesign?.synth_lane, "design");
    assert.equal(vd.route, "qwen3-tts-voicedesign-design", "the design lane's OWN flat route (transcript-015: the head serves the family default CustomVoice — the design variant re-keys only through its own address)");
    const base = byId["base"]!;
    assert.equal((base.lane_inputs as Record<string, unknown>)["model_path"], "Qwen3-TTS-12Hz-1.7B-Base-merged");
    assert.equal(LANE_TOPOLOGY.base?.synth_lane, "clone");
    assert.equal(LANE_TOPOLOGY.base?.instruction_control, false);
    assert.equal(base.route, "qwen3-tts-voicedesign-base", "the clone lane's OWN flat route (the 0.6B family owns 'qwen3-tts-base' — one owner per route id)");
    assert.deepEqual(base.resolver_defaults, { model: "qwen3-tts-voicedesign", variant: "base", voice: null }, "the clone pick nulls the persona stamp");
  });

  it("THE LARGE DEFAULT: the family's default variant is the everyday CustomVoice lane (the operator's large-model default)", () => {
    const vg = (DECL.variant_groups ?? []).find((g) => g.id === "Variant")!;
    assert.equal(vg.default, "customvoice");
    const d = DECL.defaults ?? {};
    assert.equal(d.variant, "customvoice");
    assert.equal(d.mode, "tts");
    assert.equal((DECL.lane_inputs as Record<string, unknown>)["model_path"], "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged", "the family-level artifact is the default lane's own");
    assert.equal(LANE_TOPOLOGY.customvoice?.instruction_control, true);
  });

  // THE DIRECTORY PROVISION (the model-families audit fix 8): the
  // fetchable VoiceDesign tree pins its upstream snapshot (repo +
  // revision + patterns).
  // The two operator merges pin nothing (no upstream exists for a
  // merge — stating one would be a lie).
  it("snapshot_provisions pins the fetchable VoiceDesign tree and nothing else", () => {
    const rows = DECL.snapshot_provisions ?? [];
    assert.equal(rows.length, 1, "exactly one snapshot row — the fetchable tree, never a merge");
    const row = rows[0]!;
    assert.equal(row.name, "Qwen3-TTS-12Hz-1.7B-VoiceDesign");
    assert.equal(row.folder, "audio/qwen3-tts/hf");
    assert.equal(row.repo_id, "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign");
    assert.match(row.revision, /^[0-9a-f]{40}$/, "the revision is a pinned commit, never a branch");
    for (const need of ["config.json", "model.safetensors"]) {
      assert.ok(row.allow_patterns.includes(need), `patterns cover ${need}`);
    }
    assert.ok(
      row.allow_patterns.some((p) => p.startsWith("speech_tokenizer/")),
      "patterns cover the speech tokenizer subtree",
    );
    const placed = DECL.hand_placed_weights ?? [];
    assert.ok(placed.some((w) => w.endsWith(row.name)), "the fetchable tree stays dual-declared in hand_placed_weights");
    for (const merged of ["Qwen3-TTS-12Hz-1.7B-CustomVoice-merged", "Qwen3-TTS-12Hz-1.7B-Base-merged"]) {
      assert.ok(placed.some((w) => w.endsWith(merged)), `${merged} stays hand-placed`);
    }
  });
});
