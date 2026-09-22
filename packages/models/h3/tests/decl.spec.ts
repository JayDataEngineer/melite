// @melite/models-h3 — the model-plugin data pins.
//
// THE ONE-MODEL LAW (roadmap §8, the operator's catch: "HOW IS
// MINIMAX H3 AND H3 TIMELINE TWO DIFFERENT MODELS?"): ONE family
// owns the whole H3 surface — the multi-window timeline films, the
// single-shot FL2VA/Ref2VA lanes, and the keyframe lane.
//
// THE SURVIVOR-ID CORRECTION (operator, 2026-09-22: "every folder
// in models IS the upstream model — anima isn't anima-generate"):
// the fold's first cut kept `h3-timeline` as the family id — a
// LANE flavor in the MODEL seat, against this spec's own first
// assertion. The family id is the checkpoint: `h3`. The old family
// address `h3-timeline` survives as the timeline lane's variant
// route (drafts, skills, tool enums resolve migration-free); the
// single-shot lane's route moves to the explicit `h3-fl2va`
// (the pre-correction route `h3` now names the family itself —
// the one deliberate behavior shift, ledgered).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the h3 model plugin (the ONE H3 family — timeline + single-shot + keyframe)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-h3");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("MODEL names the checkpoint — the family id carries NO lane flavor (anima isn't anima-generate)", () => {
    assert.equal(DECL.id, "h3", "the checkpoint id — never a usecase/lane suffix");
    assert.equal(DECL.label, "MiniMax H3");
    assert.ok(!DECL.label.includes("Timeline"), "the multi-window lane is a VARIANT, never a second model");
  });

  it("VARIANTS name the lanes — every historical address survives as a variant route", () => {
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
    const byId = new Map(DECL.variants.map((v) => [v.id, v]));
    // the timeline native lane — its route IS the pre-correction
    // family address (the migration promise)
    assert.equal(byId.get("timeline")?.route, "h3-timeline");
    // the single-shot lanes: explicit route, family id reserved
    assert.equal(byId.get("fl2va")?.route, "h3-fl2va", "no lane squats on the family's own address");
    assert.equal(byId.get("ref2va")?.route, "h3-ref2va");
    assert.equal(byId.get("timeline-ref2va")?.route, "h3-timeline-ref", "the legacy identity-locked lane survives");
    // the keyframe lane from the dead h3-keyframe family
    assert.equal(byId.get("keyframe")?.route, "h3-keyframe", "the keyframe family's address survives");
  });

  it("the folded variants carry the dead families' default stamps (byte-identical derived views)", () => {
    const byId = new Map(DECL.variants.map((v) => [v.id, v]));
    const single = byId.get("fl2va")?.resolver_defaults as Record<string, unknown>;
    assert.deepEqual(single, {
      width: 1344, height: 768, length: 124, steps: 30, shift_video: 12, shift_audio: 3,
    }, "the single-shot geometry, verbatim from the dead h3 family's defaults");
    const keyframe = byId.get("keyframe")?.resolver_defaults as Record<string, unknown>;
    assert.deepEqual(keyframe, {
      width: 768, height: 448, length: 56, steps: 12,
    }, "the keyframe draft geometry, verbatim from the dead h3-keyframe family's defaults");
  });

  it("the provisions union — the single-shot weights ride the ONE family", () => {
    const names = new Set((DECL.provisions ?? []).map((p) => p.name));
    assert.ok(names.has("minimax_h3_fl2va_pruned_int8_convrot.safetensors"), "the single-shot FL2VA UNET rides");
    assert.ok(names.has("minimax_h3_ref2va_pruned_int8_convrot.safetensors"), "the single-shot Ref2VA UNET rides");
    assert.ok(names.has("minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors"), "the timeline hybrid UNET stays");
  });

  it("the loras mod stays family-level — the bag serves every lane", () => {
    const packs = (DECL.mods ?? []).map((m) => (typeof m === "string" ? m : m.pack));
    assert.deepEqual(packs, ["loras"], "the distill adapters ride all variants (the turbo lanes ARE single-shot lanes)");
  });
});
