// @melite/comfyui-cordis — THE FACE-LANE UNITY WALL (operator order,
// 2026-10-11: "UI MATCHING THE BACKEND TRUTH MUST BE TESTED FOR ...
// the worst thing is not knowing something is broken").
//
// For EVERY registered card and EVERY boarded family, the card's
// served knob set must sit inside the family's DECLARED lane surface
// (the DECL `params` row — the one facts door, the same list the
// compose door's judgeLaneSurface refuses against). The UI may never
// render a slot the model does not have.
//
// Variants only ADD to the family base (the cascade law,
// laneSurfaceOf), so the base check is the strong form: a knob inside
// the base is inside every variant's surface.
//
// Divergences that predate the wall are REGISTERED below, by name,
// in the operator's voice. The register has no slack in EITHER
// direction: a new divergence reds instantly, and a registered entry
// whose divergence disappeared reds too (dead debt is deleted, never
// parked). Adding a register row requires a roadmap row naming the
// cure.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { cascadeInit, getModel } from "../src/models/models.ts";
import { loadCardDefs } from "../src/cardDefs.ts";

await cascadeInit();

/** The registered divergences: (card, family, knob) triples the
 *  served face renders past a declared surface, each with its cure.
 *  EMPTY is the only steady state; every row here is a crime the
 *  operator can see in the product today. */
const FACE_FILTER_CURE =
  "the served face must derive from the resolved lane surface (the card-base spec builder's fieldOnLane seat, family- and variant-scoped)";
const TTS_CURE =
  "the DECLs already declare the per-lane truth as VARIANT-scoped params (voice + style_instruction on the 1.7B customvoice lane; ref_audio + ref_text on the base-clone variant) — the cure is the variant-scoped face filter: when the lane carrying the capability is selected its extra params appear, on the other lanes they hide. NO knob is deleted (operator order, 2026-10-11) — roadmap UNITY-2";
const REGISTERED_DIVERGENCES: ReadonlyArray<{
  card: string;
  family: string;
  knob: string;
  cure: string;
}> = [
  // THE EDIT PAIR (the paste that ordered this wall): the edit card
  // serves width/height to the 2511 lane whose DECL refuses them —
  // "a lane the family does not have".
  { card: "image-edit", family: "qwen-img-edit-2511", knob: "width", cure: FACE_FILTER_CURE },
  { card: "image-edit", family: "qwen-img-edit-2511", knob: "height", cure: FACE_FILTER_CURE },
  // The mirror half: the 2511-only edit-tuning pair served to the 21
  // lane, whose params (and actions) have neither.
  { card: "image-edit", family: "qwen-img-edit-21", knob: "use_stock_nodes", cure: FACE_FILTER_CURE },
  { card: "image-edit", family: "qwen-img-edit-21", knob: "double_reference", cure: FACE_FILTER_CURE },
  // THE TTS BLOCK (found by this wall on its first run, recut for
  // THE QWEN FOLD — qwen3-tts + qwen3-tts-voicedesign merged into ONE
  // family qwen3-tts, operator 2026-10-26: VARIANT=flavor
  // customvoice/voicedesign/base, QUANT=size 1_7b/0_6b): the tts
  // card's boarded is now BOARDED + VARIANT_ADDRESSES in
  // packages/audio/tts/src/card.ts — [qwen3-tts,
  // qwen3-tts-voicedesign, qwen3-tts-voicedesign-design,
  // qwen3-tts-voicedesign-base, qwen3-tts-base] — five cell routes
  // under the one family; the served knob set now includes
  // design_prompt (Voice Persona & Timbre — the voicedesign
  // variant's declared input, its lane surface params
  // ["design_prompt","voice_name"]). Five knobs served family-blind;
  // `voice` + `style_instruction` + `design_prompt` + `ref_audio` +
  // `ref_text` are each declared only on variant/cell rows (or the
  // voicedesign lane), never on the family base — the cure stays the
  // variant-scoped face filter (UNITY-2).
  ...["qwen3-tts", "qwen3-tts-voicedesign", "qwen3-tts-voicedesign-design", "qwen3-tts-voicedesign-base", "qwen3-tts-base"].flatMap((family) =>
    ["voice", "style_instruction", "ref_audio", "ref_text", "design_prompt"].map((knob) => ({
      card: "tts",
      family,
      knob,
      // design_prompt's row is the voicedesign lane's declared input
      // (voicedesign variant params) — the same variant-scoped cure:
      // it appears on the voicedesign lane, hides elsewhere.
      cure: TTS_CURE,
    })),
  ),
  // THE REFERENCE SEAT (C4, c5f03df9 — supersedes c8ea293f's
  // no-seat ruling): the seat is qwen-img-21-scoped at the card's
  // gate (a stated list refuses on every other family — the
  // encoder lane owns the port), but the shared schema dict serves
  // the knob on every boarding family so the frozen form_spec
  // field order holds. These five DECLs deliberately declare no
  // reference port (flux-klein's lane-surface comment names the
  // law; moss-image joins 2026-11-07 with the klein shape). Cure
  // rides UNITY-1's face filter.
  ...["krea-2", "z-image", "anima", "flux-klein", "moss-image"].map((family) => ({
    card: "image-gen",
    family,
    knob: "reference_images",
    cure: FACE_FILTER_CURE,
  })),
  // THE STATED-SIZE LAW (2026-11-08): the 21 lane's DECL dropped
  // width/height (both edit lanes edit at the source's own frame; a
  // stated axis refuses field-named). The dict keeps the two hidden
  // legacy seats (hidden: true, the tooltip names the law) so legacy
  // drafts deserialize; the UI never renders them. Same frozen
  // form_spec contract as the reference seat above; the face filter
  // (UNITY-1, landed in card-base form.tsx) owns the visible face.
  { card: "image-edit", family: "qwen-img-edit-21", knob: "width", cure: FACE_FILTER_CURE },
  { card: "image-edit", family: "qwen-img-edit-21", knob: "height", cure: FACE_FILTER_CURE },
  // THE MUSIC MODE CURE (2026-11-08): music3's DECL dropped mode (the
  // door refuses non-"full" loudly — music3 has no symbolic planner);
  // the dict's mode seat is yue2-scoped at the face (visible_when:
  // model=yue2) but serves family-blind in the frozen form_spec.
  { card: "music", family: "music3", knob: "mode", cure: FACE_FILTER_CURE },
];

/** The declaration-coverage ratchet: every family boarding a card
 *  either declares its `params` surface or is counted here. Bumping
 *  the pin is a conscious, reviewed act — the wall's message prints
 *  the full inventory so nobody bumps blind. 0: the last fifteen
 *  boardings declared their surfaces (the roadmap's "Also owed" row,
 *  closed 2026-10-23) — every boarding family is now judged, so a
 *  NEW boarding without a declared surface reds here. */
const UNDECLARED_SURFACE_FAMILIES_PIN = 0;

describe("THE FACE-LANE UNITY WALL (the served face equals the declared backend)", () => {
  it("every served knob sits inside each boarding family's declared surface", async () => {
    const defs = await loadCardDefs();
    const divergent: { card: string; family: string; knob: string }[] = [];
    const undeclared: string[] = [];
    for (const [cardId, def] of defs) {
      const carrier = (def.schemaCarrier ?? def.schema) as { dict?: Record<string, unknown> };
      const served = Object.keys(carrier.dict ?? {});
      for (const fam of def.boarded) {
        let decl: { params?: unknown };
        try {
          decl = getModel(fam) as { params?: unknown };
        } catch {
          continue; // a retired address contributes nothing (the loadPlane stand-down)
        }
        if (!Array.isArray(decl.params)) {
          undeclared.push(`${cardId} × ${fam}`);
          continue;
        }
        const surface = new Set(decl.params as string[]);
        for (const knob of served) {
          if (!surface.has(knob)) divergent.push({ card: cardId, family: fam, knob });
        }
      }
    }

    assert.equal(
      undeclared.length,
      UNDECLARED_SURFACE_FAMILIES_PIN,
      `families boarding cards WITHOUT a declared lane surface — the face is unjudged for them ` +
      `(declare params in the DECL, then bump the pin):\n${undeclared.join("\n")}`,
    );

    const fresh = divergent.filter(
      (d) => !REGISTERED_DIVERGENCES.some((r) => r.card === d.card && r.family === d.family && r.knob === d.knob),
    );
    assert.equal(
      fresh.length,
      0,
      `THE UI IS RENDERING SLOTS THE MODELS DO NOT HAVE — new face-lane divergences. ` +
      `Fix the face or register the row WITH its cure:\n` +
      fresh.map((d) => `${d.card} × ${d.family} serves '${d.knob}'`).join("\n"),
    );

    const stale = REGISTERED_DIVERGENCES.filter(
      (r) => !divergent.some((d) => d.card === r.card && d.family === r.family && d.knob === r.knob),
    );
    assert.equal(
      stale.length,
      0,
      `REGISTERED DIVERGENCES NO LONGER EXIST — the cure landed; delete the register rows ` +
      `(dead debt is deleted, never parked):\n` +
      stale.map((r) => `${r.card} × ${r.family} × ${r.knob}`).join("\n"),
    );
  });
});
