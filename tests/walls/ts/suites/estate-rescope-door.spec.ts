// estate-rescope-door.spec.ts — THE ESTATE-LANE SERVER-SIDE RESCOPE
// WALL (journey-closure plan §D3; the axis-unification audit's
// estate-lane residue, 071f8c7a1's recorded finding).
//
// The lesion: the one-switch law lived client-side only. A model
// GESTURE (the drill's Model rail, the schema-knob onSet) re-derives
// the frame through modelSwitchPatch — axes clear, the departing
// envelope vocabulary nulls, the mod bags die. But a doc whose model
// key was re-pointed WITHOUT a gesture (the card's semantic-model
// knob, a tool face patch, an agent write, a stage copy) reaches the
// compose door with every departed-family value still carried, and
// no server-side seat judged them: the foreign quant refused only
// where a lane judge happened to sit, and the foreign bag rode PAST
// the door — the compose walk's boarded-family catalog fallback
// (service.ts modCatalogForCompose) serves another boarded family's
// rows when the arrival family serves none, so a krea-2 lora on an
// anima run resolved, stacked, and fired. The operator's burn was
// exactly this shape, and every wall stayed green because the door's
// stamp/overlay seam had no carry judge at all.
//
// The pinned invariant, one sentence: A DOC WHOSE MODEL KEY WAS
// RE-POINTED SERVER-SIDE GETS ITS FOREIGN CARRY JUDGED BY THE DOOR
// BEFORE THE WALK — an option-mode bag entry naming a row the
// arrival family's own catalog does not serve refuses loud in the
// variant voice, a row the family serves rides, the coordinate
// clauses keep their teeth, and the arrival lane's own stamps
// re-derive once the foreign carry dies.
//
// ONE LAW, TWO PLANES: the client half nulls the bag at the gesture
// (card-base spec.ts modelSwitchPatch's cross-model arm — the seat
// that knows the departure); the door half judges the carry loudly
// at the seam that only sees the arrival (cardsVariant.ts bagRefusal,
// riding the same route→atom fold the stamp surface scopes). The
// judge reads the arrival atom's DIRECT catalog — deliberately NOT
// the walk's boarded fallback, whose fallback IS the absorption.
//
// Seats, each its own firing arm (the split-brain lesson):
//   1. THE DECLARATIONS (depth): the booted catalogs — anima serves
//      no loras rows, krea-2 serves the row the burn carried;
//      derived off the REAL boot (prime + loadCardDefs — the mod
//      plane flavors register LOUD), never a hand copy.
//   2. THE RE-POINT, AXIS HALF: the burn's doc refuses at selection
//      with the shared unknown-quant voice (the departed spelling
//      names no cell of the arrival lane).
//   3. THE CARRY, BAG HALF (the D3 arm): the same doc with the
//      coordinate repaired — the foreign lora refuses AT THE DOOR,
//      in the door's own voice, before any walk.
//   4. THE X-SCOPED RIDE: the same bag on the family that serves it
//      composes — the judge reads counterparts, never blanket-refuses.
//   5. THE FOREIGN-IN-FAMILY: the judge is per-family, not
//      anima-specific — a foreign id on a serving family refuses
//      with that family's known rows.
//   6. THE ENVELOPE HALF: the departed lane's numerics outside the
//      arrival lane's declared envelope refuse (the marriage clause).
//   7. THE STAMP (the constructive half): the repaired doc composes
//      and the arrival lane's own marriage stamps re-derive — the
//      empty bag rides as the operator's no-loras word (J1).
//   8. THE DATA-SOURCE TOGGLE (in-wall firing proof): register the
//      foreign row on the arrival family's flavor and the SAME body
//      composes — the wall's green rides the live catalog.
//   9. THE FOLD WALKS EVERY ABSORBED PACK: a family absorbing
//      mixed-field packs (controlnet's array + its scalar floor)
//      composes clean with no bags — the fold walk false-positives
//      on nothing.
//
// Toggles: bagRefusal's call gutted → arms 3 and 5 red (the foreign
// bag rides through the door silently — the burn's estate-lane
// shape); restored → green. The resolver_defaults merge-line toggle
// (stampCardOverlay's Object.entries(sel.resolverDefaults) loop, the
// OWED receipt from 4441ffa92) reds arm 7 here beside the
// resolver-defaults-door-stamp suite's own arms — the merge feeds
// every stamp the door lands.
//
// Run: npx vitest run tests/walls/ts/suites/estate-rescope-door.spec.ts
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CardRegistryService, CardArmError } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { prepareCardParams } from "../../../../packages/harness/estate-queue/src/cardsCompose.ts";
import { EnvelopeRefusal } from "../../../../packages/harness/estate-queue/src/cardsArmError.ts";
import type { ModelFactsRow } from "../../../../packages/harness/estate-queue/src/cardsFacts.ts";
import { loadCardDefs, theService } from "@melite/comfyui-cordis";

let svc: CardRegistryService;
let facts: Record<string, ModelFactsRow>;

beforeAll(async () => {
  const ctx = new Context();
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "estate-rescope-door-")),
    stateRoots: [] as string[],
  };
  svc = new CardRegistryService(ctx);
  await svc.prime();
  // THE REAL MOD PLANE (not the test fiber's empty fold): the pack
  // contracts + family flavors register here, LOUD on any invalid
  // seed — the carry judge reads the same booted catalog the walk
  // resolves against.
  await loadCardDefs();
  facts = svc.modelFacts() as Record<string, ModelFactsRow>;
}, 90_000);

/** The boot row for a family, derived — never a hand copy (DEPTH). */
function rowOf(fam: string): ModelFactsRow {
  const row = facts[fam];
  expect(row, "the booted facts serve a " + fam + " row").toBeTruthy();
  return row;
}

/** The arrival family's own served loras rows — the judge's truth. */
function servedRows(fam: string): string[] {
  return theService().modCatalog("loras", fam).rows.map((r) => r.id);
}

const FOREIGN_ROW = "krea2_realism_lora";
const PHASE = "d3-rescope";

afterAll(() => {
  // (the in-wall toggle's flavor registration is disposed at its
  // arm; nothing else mutates the shared plane)
});

describe("THE ESTATE-LANE SERVER-SIDE RESCOPE (journey-closure §D3)", () => {
  it("THE DECLARATIONS: the booted anima catalog serves no loras rows and the krea-2 catalog serves the row the burn carried — derived off the real boot", () => {
    const anima = servedRows("anima");
    const krea = servedRows("krea-2");
    // THE BURN'S DISCRIMINATOR: the row is krea-2-scoped — an arm
    // asserting its refusal could never pass on a catalog that
    // serves it, and the ride arm could never pass on one that does
    // not.
    expect(anima).not.toContain(FOREIGN_ROW);
    expect(krea).toContain(FOREIGN_ROW);
    // the arrival lanes compose through the image-gen card
    expect(rowOf("anima").card).toBe("image-gen");
    expect(rowOf("krea-2").card).toBe("image-gen");
  });

  it("THE RE-POINT, AXIS HALF: the burn's re-pointed doc refuses at selection with the shared unknown-quant voice — the departed spelling names no cell of the arrival lane", async () => {
    const { unknownQuantVoice } = await import("@melite/contracts/laneRelations");
    const row = rowOf("anima");
    const turbo = (row.variants ?? []).find((v) => v.id === "turbo");
    expect(turbo, "the anima row serves the turbo lane").toBeTruthy();
    // door order: the cells as the DECL declares them
    const knowns = (turbo!.cells ?? []).map((c) => c.quant);
    let refused = "";
    try {
      prepareCardParams(
        svc,
        { model: "anima", variant: "turbo", quant: "int8", loras: [{ id: FOREIGN_ROW, strength: 0.8 }], prompt: "a cat" },
        "anima",
        PHASE,
      );
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e);
    }
    // the coordinate clause fires FIRST (selection precedes the
    // stamp seam) — the burn's door-side half, walled beside the new one
    expect(refused).toContain(unknownQuantVoice("int8", "anima", "turbo", knowns));
  });

  it("THE CARRY, BAG HALF: the coordinate-repaired doc's foreign lora refuses AT THE DOOR — the door's voice, before any walk", () => {
    expect(servedRows("anima")).not.toContain(FOREIGN_ROW); // the arm's live precondition
    const knowns = servedRows("anima");
    // THE BURN SHAPE, DOOR-DEPTH: model re-pointed (the tool-face
    // write), the krea-2-era bag still carried. The junk and null
    // entries ride their own downstream deaths — the judge reads
    // catalog identity only.
    const body = {
      model: "anima",
      variant: "turbo",
      quant: "int8_convrot",
      loras: [
        { strength: 1 },
        null,
        { id: FOREIGN_ROW, strength: 0.8 },
      ],
      prompt: "a cat",
    };
    let refused = "";
    try {
      prepareCardParams(svc, body, "anima", PHASE);
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e);
    }
    expect(refused).not.toBe("");
    // THE VOICE, VERBATIM (prose pinned, rows derived off the boot):
    // one shape with the shared unknown-quant voice, the law named
    // in the tail — never a silent fix.
    const tail = knowns.length > 0
      ? "(known: " + knowns.join(", ") + ")"
      : "(the family serves no rows)";
    expect(refused).toBe(
      "card_compose phase " + PHASE + ": unknown loras row " +
      JSON.stringify(FOREIGN_ROW) +
      ' for model "anima" variant "turbo" ' + tail +
      " — mods are per model: the bag was picked for another model's weights and refuses here rather than ride to the engine" +
      " (Read the family lane: melite_skill_read model:anima.)",
    );
  });

  it("THE X-SCOPED RIDE: the same bag on the family that serves it composes — catalog counterparts ride, filename entries take the authoring lane", () => {
    const composed = prepareCardParams(
      svc,
      {
        model: "krea-2-raw",
        loras: [
          { id: FOREIGN_ROW, strength: 0.8 },
          { name: "krea-2/krea2_darkbrush.safetensors", strength: 1 },
        ],
        steps: 52,
        cfg: 3.5,
        prompt: "a cat",
      },
      "krea-2-raw",
      PHASE,
    );
    const params = composed.params as Record<string, unknown>;
    // the judged carry rides verbatim — the door rescoped nothing
    // because everything it carried has an X-scoped counterpart
    expect(params["loras"]).toEqual([
      { id: FOREIGN_ROW, strength: 0.8 },
      { name: "krea-2/krea2_darkbrush.safetensors", strength: 1 },
    ]);
    // caller agency holds on the same compose (stamps seed absent
    // keys only — the door-stamp wall's own arm)
    expect(params["steps"]).toBe(52);
  });

  it("THE FOREIGN-IN-FAMILY: the judge is per-family — a foreign id on a serving family refuses with that family's known rows", () => {
    const knowns = servedRows("krea-2");
    expect(knowns.length, "the krea-2 catalog serves rows (the arm's live precondition)").toBeGreaterThan(0);
    expect(knowns).not.toContain("h3_lightx2v_turbo");
    let refused = "";
    try {
      prepareCardParams(
        svc,
        { model: "krea-2-raw", loras: [{ id: "h3_lightx2v_turbo", strength: 1 }], prompt: "a cat" },
        "krea-2-raw",
        PHASE,
      );
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e);
    }
    expect(refused).toBe(
      "card_compose phase " + PHASE + ": unknown loras row \"h3_lightx2v_turbo\"" +
      ' for model "krea-2" variant "raw" (known: ' + knowns.join(", ") + ")" +
      " — mods are per model: the bag was picked for another model's weights and refuses here rather than ride to the engine" +
      " (Read the family lane: melite_skill_read model:krea-2.)",
    );
  });

  it("THE ENVELOPE HALF: the departed lane's numerics outside the arrival lane's declared envelope refuse — the marriage clause at the re-point shape", () => {
    // a raw-era doc (steps 52 / cfg 3.5, raw's own law) re-pointed to
    // the distilled turbo lane: the door refuses — the distilled
    // lane's marriage is declared, not negotiated
    let refused: Error | null = null;
    try {
      prepareCardParams(
        svc,
        { model: "krea-2", variant: "turbo", steps: 52, cfg: 3.5, prompt: "a cat" },
        "krea-2",
        PHASE,
      );
    } catch (e) {
      refused = e instanceof Error ? e : null;
    }
    expect(refused, "the raw-era numerics refuse on the turbo lane").not.toBeNull();
    expect(refused).toBeInstanceOf(EnvelopeRefusal);
    expect(refused).toBeInstanceOf(CardArmError);
    expect(refused!.message).toContain("steps");
  });

  it("THE STAMP: the repaired doc composes and the arrival lane's own marriage re-derives — the empty bag rides as the operator's no-loras word", () => {
    const composed = prepareCardParams(
      svc,
      // the gesture's outcome, authored by hand: the foreign carry
      // GONE (the bag emptied, the coordinate repaired) — what the
      // door then lands is the arrival lane's own law
      { model: "anima", variant: "turbo", quant: "int8_convrot", loras: [], prompt: "a cat" },
      "anima",
      PHASE,
    );
    const params = composed.params as Record<string, unknown>;
    // THE ARRIVAL LANE'S MARRIAGE (turbo's resolver_defaults), never
    // the family's 52/4 — the stamp seam's constructive half
    expect(params["steps"]).toBe(8);
    expect(params["cfg"]).toBe(1);
    // J1 at the door: an explicit empty bag is the no-loras word —
    // it rides, the judge no-ops on it, the family default never
    // re-seeds it
    expect(params["loras"]).toEqual([]);
  });

  it("THE DATA-SOURCE TOGGLE (in-wall firing proof): register the foreign row on the arrival family's flavor — the SAME body composes; the wall's green rides the live catalog", () => {
    const body = {
      model: "anima",
      variant: "turbo",
      quant: "int8_convrot",
      loras: [{ id: FOREIGN_ROW, strength: 0.8 }],
      prompt: "a cat",
    };
    // control: the refusal is live right now
    expect(() => prepareCardParams(svc, body, "anima", PHASE)).toThrow(/unknown loras row/);
    // the catalog grows the counterpart — the judge's data source
    const dispose = theService().registerFlavor({
      pack: "loras",
      families: ["anima"],
      rows: [{ id: FOREIGN_ROW, filename: "krea-2/krea2_realism_lora.safetensors" }],
    });
    try {
      expect(servedRows("anima")).toContain(FOREIGN_ROW);
      const composed = prepareCardParams(svc, body, "anima", PHASE);
      expect((composed.params as Record<string, unknown>)["loras"]).toEqual([
        { id: FOREIGN_ROW, strength: 0.8 },
      ]);
    } finally {
      dispose();
    }
    // retracted: the law is whole again
    expect(servedRows("anima")).not.toContain(FOREIGN_ROW);
  });

  it("THE FOLD WALKS EVERY ABSORBED PACK: a family absorbing mixed-field packs composes clean with no bags — the walk false-positives on nothing", () => {
    // z-image absorbs loras + controlnet + ip_adapter; the controlnet
    // contract carries an array node BESIDE a scalar (the strength
    // floor) — the fold must collect bags without inventing carry
    const composed = prepareCardParams(
      svc,
      { model: "z-image", prompt: "a cat" },
      "z-image",
      PHASE,
    );
    expect(composed.fam).toBe("z-image");
    const params = composed.params as Record<string, unknown>;
    expect(params).not.toHaveProperty("controlnets");
    expect(params).not.toHaveProperty("ip_adapters");
    expect(params).not.toHaveProperty("loras");
  });
});
