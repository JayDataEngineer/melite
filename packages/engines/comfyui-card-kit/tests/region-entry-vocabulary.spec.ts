// @contract cards-region-entry-vocabulary
// region-entry-vocabulary.spec.ts — THE REGION ENTRY-VOCABULARY WALL
// (the D11 edit-suite burn, 2026-11-04: "the `mask` mod on the
// image-gen card advertises inpaint and cannot do it").
//
// The burn's shape: an agent composed `mask: [{ mask: <source photo>,
// input_mask: <sam3 mask>, mask_mode: 'crop_stitch', ... }]` on the
// image-gen card. The entry's `mask` field reached NO node — the bag
// key declares the mod, an entry's fields are the region vocabulary —
// so the card composed a fresh GENERATION, detailed it, and reported
// done: a silent drop wearing a success badge (the same class as the
// h3 lane dead-letter burn the same week: a stated key that fires
// nothing while every door stays quiet).
//
// The cure: refuseRegionEntryFields (lanes-image.ts, ONE spelling) —
// a bag entry key outside REGION_ENTRY_FIELDS refuses LOUD at every
// region door: the image-edit firing gate, the image-gen serve gate
// and statedRegion itself (the gen builds read it directly, so no
// build arm can read a doc a gate refused). These arms pin the door,
// the voice, the lawful pass-through, and the vocabulary's one home.
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { REGION_ENTRY_FIELDS, MaskFields } from "../src/pack-fields.ts";
import { refuseImageEditFiring, refuseRegionEntryFields, statedRegion } from "../src/lanes-image.ts";

/** The burn's exact entry (the edit-suite press, verbatim shape). */
const BURN_ENTRY = {
  mask: "/melite-media/runs/run-demo/generate/SaveImage.0_gen_00001_.png",
  input_mask: "/melite-media/runs/run-demo/mask/mask_combined.png",
  mask_mode: "crop_stitch",
  mask_denoise: 0.6,
  mask_grow: 8,
  mask_feather: 10,
};

describe("the region entry-vocabulary door (a stated field that fires nothing never composes)", () => {
  test("THE BURN SHAPE refuses at the edit gate, naming both lawful seats", () => {
    assert.throws(
      () => refuseImageEditFiring({ image1: "in.png", prompt: "fix the region", mask: [{ ...BURN_ENTRY }] }),
      (err: Error) => {
        assert.match(err.message, /'mask' fires on the mask bag/);
        assert.match(err.message, /reaches no node/);
        // the voice TEACHES: the painted region rides input_mask, a
        // photograph rides the EDIT card's anchor — the two lawful
        // seats for the two things the burn confused.
        assert.match(err.message, /input_mask/);
        assert.match(err.message, /image-edit/);
        return true;
      },
      "the entry's own 'mask' field is the burn's silent drop — the door refuses it loud",
    );
  });

  test("THE BURN SHAPE refuses at the gen spelling too (the build arms read the same door)", () => {
    // statedRegion is what the image-gen card gate AND the served t2i
    // builds (krea-2, qwen-img-21) call — a throw HERE means no build
    // arm can ever read the dead field, on any card, at any door.
    assert.throws(
      () => statedRegion({ prompt: "p", mask: [{ ...BURN_ENTRY }] }),
      /'mask' fires on the mask bag .* reaches no node/,
      "the ONE spelling refuses the burn shape before any region read",
    );
  });

  test("an unknown entry field outside the vocabulary refuses named", () => {
    assert.throws(
      () => refuseImageEditFiring({ image1: "in.png", mask: [{ input_mask: "m.png", mask_strength: 0.9 }] }),
      (err: Error) => {
        assert.match(err.message, /'mask_strength' fires on the mask bag/);
        assert.match(err.message, /unknown region field/);
        return true;
      },
      "a typo'd or invented knob inside the entry refuses — it would silently drop otherwise",
    );
  });

  test("a LAWFUL entry passes the gate whole (the cure refuses nothing the vocabulary declares)", () => {
    const doc = {
      image1: "in.png",
      mask: [{ input_mask: "m.png", mask_mode: "crop_stitch", mask_denoise: 0.6, mask_grow: 8 }],
    };
    assert.doesNotThrow(() => refuseImageEditFiring(doc), "the lawful region entry composes");
    const region = statedRegion(doc as unknown as Record<string, unknown>);
    assert.ok(region, "the lawful entry still states a region");
    assert.equal(region!.maskPath, "m.png");
  });

  test("the vocabulary's one home: REGION_ENTRY_FIELDS carries every declared mask knob and NOT the bag key", () => {
    // the declared entry fields are the MaskFields knobs minus the
    // bag seat itself ('mask' declares the bag, never an entry field)
    // plus image-edit's own mask_detector_threshold rider.
    const declared = Object.keys((MaskFields as unknown as { dict: Record<string, unknown> }).dict);
    for (const k of declared) {
      if (k === "mask") continue;
      assert.ok(REGION_ENTRY_FIELDS.includes(k), `${k} is declared on the pack — the entry vocabulary must carry it`);
    }
    assert.ok(!REGION_ENTRY_FIELDS.includes("mask"), "the bag key itself is never entry vocabulary");
    assert.ok(REGION_ENTRY_FIELDS.includes("mask_detector_threshold"), "image-edit's own rider rides the vocabulary");
    // the door reads THIS list — one truth, no second spelling
    assert.equal(typeof refuseRegionEntryFields, "function");
  });

  // ── THE PAIR (operator 2026-11-15: "IMPACT PACK PASSES IN A MASK
  // AND THE IMAGE TO BE INPAINTED ON" — the mod had no seat for the
  // base image, which is WHY the burn stuffed a photograph into a
  // dead field). input_image is that seat; these arms pin the pair's
  // two halves and the edit card's refusal of the gen seat. ──
  test("THE PAIR: input_image is entry vocabulary — the stated base reaches statedRegion's read", () => {
    const region = statedRegion({
      prompt: "p",
      mask: [{ input_image: "photo.png", input_mask: "m.png", mask_mode: "crop_stitch" }],
    });
    assert.ok(region, "the pair states a region");
    assert.equal(region!.basePath, "photo.png", "the base half of the pair is read");
    assert.equal(region!.maskPath, "m.png", "the region half of the pair is read");
    // FLAT input_image alone states a region too — never a silent
    // plain-generate under a stated base (the burn's other face).
    const flat = statedRegion({ prompt: "p", input_image: "photo.png" });
    assert.ok(flat, "a flat-stated base is a stated region — the gate judges the pair");
    assert.equal(flat!.basePath, "photo.png");
  });

  test("THE PAIR on the edit card: input_image refuses — the edit base is its own anchor", () => {
    assert.throws(
      () => refuseImageEditFiring({ image1: "in.png", mask: [{ input_image: "photo.png", input_mask: "m.png", mask_mode: "crop_stitch" }] }),
      (err: Error) => {
        assert.match(err.message, /'input_image' fires on the image-edit card/);
        assert.match(err.message, /image1/);
        assert.match(err.message, /image-gen region mod's base seat/);
        return true;
      },
      "two bases never ride the edit card — its anchor already is one",
    );
  });
});
