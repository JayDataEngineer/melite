// tts-mod-surface.spec.ts — THE TTS MOD-SURFACE WALL (the audit
// quartet's F50 + F52 estate arms, 2026-11-01).
//
// F52 — TWO-KIND SEPARATION AT THE SERVE SEAM: the tts card absorbs
// exactly two mod packs and they stay hermetic — the qvoice PERFORM
// pack's fields are {qvoice, voice_strength}; the qvoice_save
// DESIGN/SAVE pack's fields are {save_qvoice, voice_name} (the
// card's own law, card.ts — the audit brief's F52 row spells the
// same pair); no field
// crosses. The audit's F52 burn (save controls rendered INSIDE the
// perform mod) is impossible while this holds: the packs are absorbed
// as separate Schemastery contracts and the serve seam projects them
// verbatim (specBody → specModifiers → mod_schemas; the client
// derives rows off the same absorbed contract — no merge plane
// exists anywhere on the serve path).
//
// F50 — NO PHANTOM SPEAKER ON THE SERVED SURFACE: the tts envelope
// (the card schema's own toJSON — the whole served form) and every
// absorbed mod field name no speaker knob. The card declares the
// voice seat; compose never sends speaker_name; the engine's own
// node face carries it OPTIONAL only (the pack-side wall,
// melite-audio-nodes tests/test_identity_steering.py, pins the
// required block ⊆ {model, prompt} — live-verified against :8188
// 2026-11-01: required = [model, prompt], studio takes run clean).
//
// Run: npx vitest run tests/walls/ts/suites/tts-mod-surface.spec.ts

import assert from "node:assert/strict";
import "../../../helpers/boot-models.ts";
import { test } from "vitest";
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/index.ts";

/** field names of one absorbed mod contract (the dict is the table). */
const names = (a: { fields: { dict?: Record<string, unknown> } }): string[] =>
  Object.keys(a.fields.dict ?? {});

await loadCardDefs();
const svc = theService();

const QVOICE_PERFORM = ["qvoice", "voice_strength"];
const QVOICE_SAVE = ["save_qvoice", "voice_name"];

test("F52: the tts card absorbs exactly the qvoice pair, as separate packs", () => {
  const tts = svc.cardModFields("tts");
  const packs = tts.map((a) => a.pack).sort();
  assert.deepEqual(packs, ["qvoice", "qvoice_save"],
    "the tts card absorbs exactly two packs — the perform voice and the design/save kind");
});

test("F52: the perform pack carries only {qvoice, voice_strength}", () => {
  const perform = svc.cardModFields("tts").find((a) => a.pack === "qvoice");
  assert.ok(perform, "the qvoice pack is absorbed on tts");
  assert.deepEqual(names(perform).sort(), QVOICE_PERFORM);
  for (const saveField of QVOICE_SAVE) {
    assert.ok(!names(perform).includes(saveField),
      `F52: the save knob '${saveField}' never rides the perform pack`);
  }
});

test("F52: the save pack carries only the design/save pair", () => {
  const save = svc.cardModFields("tts").find((a) => a.pack === "qvoice_save");
  assert.ok(save, "the qvoice_save pack is absorbed on tts");
  assert.deepEqual(names(save).sort(), QVOICE_SAVE);
  for (const performField of QVOICE_PERFORM) {
    assert.ok(!names(save).includes(performField),
      `F52: the perform knob '${performField}' never rides the save pack`);
  }
});

test("F52 depth: the two contracts are separate objects, not one shared dict", () => {
  const tts = svc.cardModFields("tts");
  const perform = tts.find((a) => a.pack === "qvoice");
  const save = tts.find((a) => a.pack === "qvoice_save");
  assert.ok(perform && save);
  assert.notEqual(perform.fields, save.fields,
    "the perform and save kinds ride distinct Schemastery contracts — a save control inside the perform mod would BE this object");
});

/** the served envelope's flat knob names (the card schema's own toJSON). */
const envelopeNames = (): string[] => {
  const out = svc.formSchemas("tts", "qwen3-tts");
  assert.ok(out && out.schema, "the tts envelope serves");
  const env = out.schema as { refs: Record<string, { type?: string; dict?: Record<string, unknown> }> };
  const root = Object.values(env.refs).find((n) => n.type === "object" && n.dict !== undefined);
  return Object.keys(root?.dict ?? {});
};

test("F50: the served tts envelope names no speaker knob", () => {
  const knobs = envelopeNames();
  assert.ok(knobs.length > 0, "the envelope walk found the card's fields");
  for (const knob of knobs) {
    assert.ok(!/speaker/i.test(knob),
      `F50: the served tts surface declares '${knob}' — no speaker knob may exist on the card's form`);
  }
  assert.ok(knobs.includes("voice"),
    "the card's own voice seat stays declared (the speaker-shaped need is the voice knob)");
});

test("F50 depth: no absorbed mod field names a speaker either", () => {
  for (const a of svc.cardModFields("tts")) {
    for (const field of names(a)) {
      assert.ok(!/speaker/i.test(field),
        `F50: mod pack '${a.pack}' field '${field}' — the phantom speaker never leaks through the mods bar`);
    }
  }
});
