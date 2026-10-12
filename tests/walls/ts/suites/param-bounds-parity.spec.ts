// param-bounds-parity.spec.ts — THE TWO HOMES ARE ONE (the
// atom-vocabulary-attainment audit's F3, 2026-10-12; defects
// D1-D5 cured 2026-10-12 after the F3 verification receipt).
//
// Every knob's type AND bounds are declared twice: in the action's
// ParamSpec (enforced for family/DECL write rows by
// validateWriteRowsAgainstActions) and in the card's schema
// (enforced on the USER's card write). The two agree today —
// measured here — and nothing kept them agreeing. A bounds edit on
// one side that missed the other would compose a graph the user's
// own card schema forbids, or reject a value the engine accepts.
//
// WHAT THIS WALL ASSERTS, per (card, family, action, param):
// (1) the SERVED numeric envelope (minimum/maximum) EQUALS the
//     action's `bounds`; (2) the served TYPE matches the action
//     row's type (number → number; enum/string → string, the
//     emitter's wire-coerced spelling); (3) the served enum
//     options EQUAL the action's cited vocabulary IN SERVED ORDER
//     (the card's dropdown order is the user's menu order);
// (4) SET EQUALITY both ways: every served knob is declared by an
//     action row, except the named card-owned set below; every
//     action row is served, except that same named set. A rename
//     on either side turns this red.
// (5) the shared-factory mechanism: the seven families' diffusion
//     rows ride `diffusionParamRows()` (the F2 wall deep-equals
//     the rows themselves; this arm pins the SERVED ORDER and the
//     edit families' narrowed core).
//
// The named card-owned set is the image-edit card's four hidden
// legacy aliases (`image1`/`image2`/`image3`/`reference_images`,
// declared `extra.hidden` at image-edit/src/card.ts and dropped by
// the emitter as validation-only), plus the synthesized `model`
// picker on multi-family cards. Every skip is NAMED and counted —
// a silent skip is a hole, not a pass.

import { describe, it } from "vitest";
import assert from "node:assert/strict";
// THE CARD TIER, BOOTED THE CARD SPEC'S WAY (the card-compose-liveness
// precedent): the MIN_DIM arm below composes the real input-prep def,
// so the registry boots first — the pure schema/action arms above
// never touch it.
import "../../../helpers/boot-models.ts";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { diffusionParamRows, EDIT_DIFFUSION_BOUNDS, type DiffusionParamBounds } from "../../../../packages/engines/comfyui-card-kit/src/paramRows.ts";
import { emitParamsSchema } from "../../../../packages/engines/comfyui-cordis/src/params-emit.ts";
import { schema as imageGenSchema } from "../../../../packages/image/image-gen/src/card.ts";
import { schema as imageEditSchema } from "../../../../packages/image/image-edit/src/card.ts";
import { t2i as qwenImg21T2I } from "../../../../packages/models/qwen-img-21/src/actions.ts";
import { t2i as zImageT2I } from "../../../../packages/models/z-image/src/actions.ts";
import { t2i as animaT2I } from "../../../../packages/models/anima/src/actions.ts";
import { t2i as krea2T2I } from "../../../../packages/models/krea-2/src/actions.ts";
// FLUX-KLEIN RIDES THIS WALL (hunt-walls-tier finding 6, cured
// 2026-10-26): the family boarded image-gen but the judged set
// below named four families — a bounds drift on flux-klein passed
// all-green. It is judged, and the routing census at the bottom
// names the next gap.
import { t2i as fluxKleinT2I } from "../../../../packages/models/flux-klein/src/actions.ts";
import { edit as edit21 } from "../../../../packages/models/qwen-img-edit-21/src/actions.ts";
import { edit as edit2511 } from "../../../../packages/models/qwen-img-edit-2511/src/actions.ts";
// THE ROUTING SEAM'S OWNER (the census arm's live end): the judged
// family set must EQUAL the cards' own boarded rosters — the board
// is the routing key, and a boarded-but-unjudged family is the
// exact hole flux-klein fell through.
import { BOARDED as IMAGE_GEN_BOARDED } from "../../../../packages/image/image-gen/src/card.ts";
import { BOARDED as IMAGE_EDIT_BOARDED } from "../../../../packages/image/image-edit/src/card.ts";
// THE INPUT-PREP PAIR (estate-tier gap closure, 2026-10-26): the
// input-prep card's schema and the input family's prep ParamSpec.
// Judged by nobody estate-side while both planes held package-local
// pins (packages/image/input-prep, packages/models/input).
import { schema as inputPrepSchema } from "../../../../packages/image/input-prep/src/card.ts";
import { prep as inputPrepAction, SCALE_METHODS as INPUT_SCALE_METHODS, MIN_DIM as INPUT_MIN_DIM } from "../../../../packages/models/input/src/actions.ts";
import { DECL as inputDecl } from "../../../../packages/models/input/src/index.ts";

type ParamRow = { name: string; type: string; bounds?: readonly [number, number]; options?: readonly string[] };
type Action = { id: string; params: readonly ParamRow[] };

/** The action row type → the served params_schema spellings the
 *  emitter can produce for it (params-emit.ts:117 for the integer
 *  narrowing of a step-1 number; its header for the pass-through
 *  families). A row type absent here is one the wire cannot express
 *  differently, and the wall asserts nothing about it. */
const SERVED_TYPES: Record<string, readonly string[]> = {
  number: ["number", "integer"],
  string: ["string"],
  enum: ["string"],
  boolean: ["boolean"],
  image_list: ["array"],
};

/** The six families' actions under the wall's own row shape. The
 *  families' actions are plain object literals whose params are
 *  `readonly ParamSpec[]` — structurally this row type, so the
 *  identity is a widening, not an assertion to unknown. */
const asAction = (action: { id: string; params: readonly { name: string; type: string; bounds?: readonly [number, number]; options?: readonly string[] }[] }): Action => action;

/** One field as the SERVED params_schema projects it (the emitter
 *  every door ships — the tools door and the discovery door read the
 *  same projection), so the wall compares what the user actually
 *  gets against what the action declares. */
interface Served {
  readonly type: string;
  readonly min: number | null;
  readonly max: number | null;
  readonly options: readonly string[] | null;
}

const serveCard = (schema: unknown, boarded: readonly string[]): Map<string, Served> => {
  const emitted = emitParamsSchema(schema as never, boarded);
  const out = new Map<string, Served>();
  for (const [name, raw] of Object.entries(emitted.properties ?? {})) {
    const knob = raw as { type?: string; minimum?: number; maximum?: number; enum?: unknown[] };
    out.set(name, {
      type: knob.type ?? "unknown",
      min: typeof knob.minimum === "number" ? knob.minimum : null,
      max: typeof knob.maximum === "number" ? knob.maximum : null,
      options: Array.isArray(knob.enum) ? knob.enum.map((o) => String(o)) : null,
    });
  }
  return out;
};

describe("THE PARAM-BOUNDS PARITY WALL — the card's schema and the action's rows are one surface", () => {
  const T2I_ACTIONS = [["qwen-img-21", qwenImg21T2I], ["z-image", zImageT2I], ["anima", animaT2I], ["krea-2", krea2T2I], ["flux-klein", fluxKleinT2I]] as const;
  const EDIT_ACTIONS = [["qwen-img-edit-21", edit21], ["qwen-img-edit-2511", edit2511]] as const;

  // THE JUDGED SET, hoisted so the routing census below diffs the
  // SAME array the parity arm walks — one list, never two copies.
  // (The former top-level CARDS const is deleted 2026-10-26: it
  // named flux-klein but no arm ever walked it — a wall narrating
  // coverage it never judged. This array is the only roster.)
  const JUDGED_CARDS = [
    { name: "image-gen", schema: imageGenSchema, boarded: ["krea-2", "z-image", "anima", "qwen-img-21", "flux-klein"], actions: T2I_ACTIONS, cardOwned: ["model"] as readonly string[] },
    {
      name: "image-edit", schema: imageEditSchema, boarded: ["qwen-img-edit-21", "qwen-img-edit-2511"], actions: EDIT_ACTIONS,
      // the card's four hidden legacy aliases (image-edit/src/card.ts declares
      // them extra.hidden — validation-only, dropped by the emitter)
      cardOwned: ["model", "image1", "image2", "image3", "reference_images"] as readonly string[],
    },
  ] as const;

  for (const card of JUDGED_CARDS) {
    it(`${card.name}: every declared row is served with the SAME envelope, type and options — and the two sets are EQUAL`, () => {
      const served = serveCard(card.schema, card.boarded);
      const asserted: string[] = [];
      const declared = new Set<string>();
      for (const [family, raw] of card.actions) {
        const action = asAction(raw);
        for (const row of action.params) {
          declared.add(row.name);
          const field = served.get(row.name);
          if (field === undefined) {
            // NOT a silent skip: the row must be on the named
            // card-owned set, or the two surfaces have drifted.
            assert.ok(
              card.cardOwned.includes(row.name),
              `${card.name} ${family}/${action.id} declares "${row.name}" but the served card does not expose it — the two surfaces must be the same set (F3): add the knob to the card or drop the row`,
            );
            continue;
          }
          const where = `${card.name} ${family}/${action.id} "${row.name}"`;
          if (row.type === "number") {
            const fromCard = [field.min, field.max];
            const fromAction = row.bounds === undefined ? [null, null] : [...row.bounds];
            assert.deepEqual(
              fromCard,
              fromAction,
              `${where}: the card's served envelope ${JSON.stringify(fromCard)} does not EQUAL the action's ParamSpec bounds ${JSON.stringify(fromAction)} — the two homes are ONE (F3): edit BOTH, or bound neither`,
            );
            asserted.push(where);
          } else if (row.type === "enum") {
            // ORDER-SENSITIVE: the card's dropdown order is the
            // user's menu order, so a reordered vocabulary is drift.
            assert.deepEqual(
              [...(field.options ?? [])],
              [...(row.options ?? [])],
              `${where}: the card's served enum options must EQUAL the action's cited vocabulary IN ORDER`,
            );
            asserted.push(where);
          }
          if (SERVED_TYPES[row.type] !== undefined) {
            // The emitter's own wire spellings (params-emit.ts:117
            // serves number+step(1) as integer; :13 the string /
            // boolean / array families pass through as-is, and an
            // enum or a wire-coerced Select serves "string"). The
            // mapping is NAMED, so a new served spelling turns this
            // red instead of silently passing.
            assert.ok(
              SERVED_TYPES[row.type].includes(field.type),
              `${where}: the card serves type "${field.type}" where the action declares "${row.type}" (served spellings: ${JSON.stringify(SERVED_TYPES[row.type])}) — the type is declared twice (F3)`,
            );
            asserted.push(`${where} (type)`);
          }
        }
      }
      // SET EQUALITY, the other direction: every served knob is a
      // declared row or on the named card-owned set. A card-side
      // RENAME lands here.
      for (const name of served.keys()) {
        assert.ok(
          declared.has(name) || card.cardOwned.includes(name),
          `${card.name} serves a knob "${name}" that no boarded action declares and that is not on the named card-owned set ${JSON.stringify(card.cardOwned)} — the two surfaces must be the same set (F3)`,
        );
      }
      assert.ok(asserted.length >= 9, `${card.name}: the parity arm judged the surface (saw ${asserted.length} asserted rows — a surface that empties an arm is a hole, not a pass)`);
    });
  }

  it("the judged set IS the routed set — every boarded family is judged, none extra (the routing seam)", () => {
    // THE ROUTING-KEY SEAM'S JUDGE (hunt-walls-tier finding 6, cured
    // 2026-10-26): the parity arm above walks JUDGED_CARDS, a hand
    // list. The cards' BOARDED rosters are the routing truth — the
    // board is the routing key. flux-klein boarded image-gen and
    // rode NO arm; this census diffs the judged set against the
    // live roster both ways, so the next boarded-but-unjudged
    // family — or a judged-but-unboarded ghost — reds here.
    const live: Record<string, readonly string[]> = {
      "image-gen": IMAGE_GEN_BOARDED,
      "image-edit": IMAGE_EDIT_BOARDED,
    };
    for (const card of JUDGED_CARDS) {
      assert.deepEqual(
        [...card.boarded].sort(),
        [...live[card.name]].sort(),
        `${card.name}: the wall judges exactly the card's boarded roster`,
      );
    }
  });

  // INPUT-PREP RIDES THIS WALL (estate-tier gap closure, 2026-10-26):
  // the judged set above names only image-gen/edit — the input-prep
  // card's schema and the input family's prep ParamSpec are a second
  // two-homes pair (the scale contract d00747371's dropdown + integer
  // law, the blank-image law be2d4dd12's MIN_DIM floor), judged by
  // nobody estate-side. The six transform members are HALF-BOUNDED
  // (the unset sentinel: floor -1 on both planes, no ceiling on
  // either — the card serves no maximum, the action spells "no
  // ceiling" as Number.MAX_SAFE_INTEGER, actions.ts: its ceiling is
  // the card's — none), so the loop's envelope-equality above cannot
  // seat them; this arm names that contract member by member, and the
  // arm below fires the MIN_DIM floor both planes live in NEITHER
  // plane's bounds (a compose-time refusal, not a schema envelope).
  // Neither arm disturbs the loop or the census above: separate its,
  // same serveCard/asAction/SERVED_TYPES grammar.
  it(`input-prep: the card's schema and the input family's prep rows are one surface (incl. the scale_method enum and the sentinel floor)`, () => {
    const served = serveCard(inputPrepSchema, [inputDecl.id]);
    const action = asAction(inputPrepAction);
    // THE ROUTED SET (the census above owns image-gen/edit; this arm
    // owns input-prep's own routing key): the family id IS the input
    // lane's address — a boarded-but-unjudged second family, or a
    // judged-but-unboarded ghost, reds here and in the live-boarded
    // arm below.
    assert.deepEqual([inputDecl.id], ["input"], "the input family's address is the input lane — the judged set's routing key");
    assert.ok(!served.has("model"), "input-prep boards one family — no synthesized model picker is served");
    const declared = new Set(action.params.map((r) => r.name));
    assert.deepEqual(
      [...served.keys()].sort(),
      [...declared].sort(),
      `input-prep serves knobs ${JSON.stringify([...served.keys()].sort())} but the prep action declares ${JSON.stringify([...declared].sort())} — the two surfaces must be the same set (F3)`,
    );
    const asserted: string[] = [];
    const field = (name: string): Served => {
      const f = served.get(name);
      assert.ok(f !== undefined, `input-prep serves no knob "${name}" the prep action declares — the two surfaces must be the same set (F3)`);
      return f as Served;
    };
    // THE STRING SEAT.
    assert.equal(
      field("source").type,
      "string",
      `input-prep input/prep "source": the card serves type "${field("source").type}" where the action declares "string" — the type is declared twice (F3)`,
    );
    asserted.push(`input-prep input/prep "source" (type)`);
    // THE ENUM SEATS, ORDER-SENSITIVE: the card's dropdown order is
    // the user's menu order, so a reordered vocabulary is drift.
    for (const name of ["media_type", "scale_method"] as const) {
      const row = action.params.find((r) => r.name === name);
      assert.ok(row !== undefined, `input-prep's prep action declares no "${name}" row`);
      assert.deepEqual(
        [...(field(name).options ?? [])],
        [...(row.options ?? [])],
        `input-prep input/prep "${name}": the card's served enum options must EQUAL the action's cited vocabulary IN ORDER`,
      );
      asserted.push(`input-prep input/prep "${name}"`);
      assert.equal(
        field(name).type,
        "string",
        `input-prep input/prep "${name}": the card serves type "${field(name).type}" where the action declares "enum" (served spellings: ${JSON.stringify(SERVED_TYPES["enum"])}) — the type is declared twice (F3)`,
      );
      asserted.push(`input-prep input/prep "${name}" (type)`);
    }
    // THE ONE TRUTH (the scale contract d00747371): the served
    // dropdown IS the family's SCALE_METHODS export — imported, never
    // a second copy — so a card-authored hand literal drifting from
    // the family reds here naming input-prep.
    assert.deepEqual(
      [...(field("scale_method").options ?? [])],
      [...INPUT_SCALE_METHODS],
      `input-prep input/prep "scale_method": the served dropdown must EQUAL the family's SCALE_METHODS export — one truth, two consumers (card.ts vocabulary, actions.ts enum options)`,
    );
    // THE HALF-BOUNDED MEMBERS (the unset sentinel): the served floor
    // EQUALS the action's floor (-1, the unset sentinel both planes
    // compose around); the served ceiling is ABSENT (unbounded above)
    // while the action spells "no ceiling" as
    // Number.MAX_SAFE_INTEGER — each side asserted in its own
    // spelling, so breaking one bound on one plane reds here.
    const numberSpellings = SERVED_TYPES["number"];
    for (const name of ["crop_x", "crop_y", "crop_width", "crop_height", "scale_width", "scale_height"] as const) {
      const row = action.params.find((r) => r.name === name);
      assert.ok(row !== undefined, `input-prep's prep action declares no "${name}" row`);
      const f = field(name);
      const where = `input-prep input/prep "${name}"`;
      assert.ok(
        numberSpellings !== undefined && numberSpellings.includes(f.type),
        `${where}: the card serves type "${f.type}" where the action declares "number" (served spellings: ${JSON.stringify(numberSpellings)}) — the type is declared twice (F3)`,
      );
      asserted.push(`${where} (type)`);
      assert.equal(
        f.min,
        -1,
        `${where}: the card's served floor ${JSON.stringify(f.min)} does not EQUAL the sentinel floor -1 — the floor is declared twice (F3): edit BOTH, or floor neither`,
      );
      assert.equal(
        row.bounds?.[0],
        -1,
        `${where}: the action's ParamSpec floor ${JSON.stringify(row.bounds?.[0])} does not EQUAL the sentinel floor -1 — the floor is declared twice (F3): edit BOTH, or floor neither`,
      );
      asserted.push(where);
      assert.equal(
        f.max,
        null,
        `${where}: the card serves a ceiling ${JSON.stringify(f.max)} — the transform members are unbounded above (the unset sentinel has no ceiling)`,
      );
      assert.equal(
        row.bounds?.[1],
        Number.MAX_SAFE_INTEGER,
        `${where}: the action's ParamSpec ceiling ${JSON.stringify(row.bounds?.[1])} is not the "no ceiling" spelling Number.MAX_SAFE_INTEGER — unbounded above is declared twice (F3)`,
      );
      asserted.push(`${where} (ceiling)`);
    }
    assert.ok(asserted.length >= 9, `input-prep: the parity arm judged the surface (saw ${asserted.length} asserted rows — a surface that empties an arm is a hole, not a pass)`);
  });

  it(`input-prep: the MIN_DIM floor fires on BOTH planes (the blank-image law's estate seat)`, async () => {
    // THE FLOOR VALUE (the universal latent divisor — no downstream
    // model in the estate processes a side below 8px): pinned, so a
    // quiet weakening reds here and in each plane's own voice below.
    assert.equal(INPUT_MIN_DIM, 8, "the floor is the universal latent divisor, pinned");
    const defs = await loadCardDefs();
    const def = defs.get("input-prep");
    assert.ok(def, "the composition root serves the input-prep card");
    // THE LIVE ROUTING KEY (the parity arm above pins the static id;
    // this pins the served board): the card boards exactly the input
    // family — the judged set IS the routed set.
    assert.deepEqual([...(def.boarded ?? [])], [inputDecl.id], "input-prep boards exactly the input family — a boarded-but-unjudged second family, or a judged-but-unboarded ghost, reds here");
    const cardFacts = { id: "x", family: "input", card: "x", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;
    // CARD PLANE (the schema gate + compose refusals, card.ts): the
    // 2x1 receipt and the 1x1 crop refuse in the card's voice; the
    // floor member itself still composes.
    assert.throws(
      () => def.compose(def.schema({ source: "upload.png", scale_width: 2, scale_height: 1 }), cardFacts, new GraphBuilder(), "wall-blank-scale"),
      new RegExp(`input-prep scale needs width and height of at least ${INPUT_MIN_DIM}px \\(got 2x1\\)`),
    );
    assert.throws(
      () => def.compose(def.schema({ source: "upload.png", crop_x: 19, crop_y: 20, crop_width: 1, crop_height: 1 }), cardFacts, new GraphBuilder(), "wall-blank-crop"),
      new RegExp(`input-prep crop needs width and height of at least ${INPUT_MIN_DIM}px \\(got 1x1\\)`),
    );
    const floored = new GraphBuilder();
    def.compose(def.schema({ source: "upload.png", scale_width: INPUT_MIN_DIM, scale_height: INPUT_MIN_DIM }), cardFacts, floored, "wall-floor");
    assert.ok(Object.values(floored.toJSON()).some((n) => (n as { class_type?: string }).class_type === "ImageScale"), "the floor member composes on the card plane");
    // FAMILY PLANE (the legacy-object backstop, actions.ts build):
    // the same dims refuse in the family's voice — the path that
    // bypasses the card's gate; the floor member composes.
    const familyFacts = { id: inputDecl.id, card: "input-prep", defaults: {}, lane_inputs: {}, variants: [], variant_groups: [], outputs: [] } as never;
    assert.throws(
      () => instantiateAction(inputPrepAction, { source: "/m/i.png", media_type: "image", scale: { width: 2, height: 1 } }, familyFacts, new GraphBuilder({}), "wall-blank"),
      new RegExp(`scale row refused on the input-prep card: 'width'/'height' must be at least ${INPUT_MIN_DIM}px \\(got 2x1\\)`),
    );
    assert.throws(
      () => instantiateAction(inputPrepAction, { source: "/m/i.png", media_type: "image", crop: { x: 19, y: 20, width: 1, height: 1 } }, familyFacts, new GraphBuilder({}), "wall-blank"),
      new RegExp(`crop row refused on the input-prep card: 'width'/'height' must be at least ${INPUT_MIN_DIM}px \\(got 1x1\\)`),
    );
    const familyFloored = new GraphBuilder({});
    instantiateAction(inputPrepAction, { source: "/m/i.png", media_type: "image", scale: { width: INPUT_MIN_DIM, height: INPUT_MIN_DIM } }, familyFacts, familyFloored, "wall-floor");
    assert.ok(Object.values(familyFloored.toJSON()).some((n) => (n as { class_type?: string }).class_type === "ImageScale"), "the floor member composes on the family plane");
  });

  it("the seven families' diffusion rows ride the shared factory IN SERVED ORDER (names; F2 deep-equals the rows)", () => {
    // WHAT THIS ARM IS: the served ORDER of each family's diffusion
    // surface, and the edit families' narrowed core riding the same
    // factory — NAMES in order. A hand copy whose row NAMES drift
    // reds here and on this wall's parity arm; a copy whose BOUNDS
    // drift alone reds on F2 and on the parity arm, not here; a
    // byte-correct hand copy reds NOWHERE (F2's own header says so: it "passes — dead
    // weight the factory deletes at review"), and this arm does not
    // claim otherwise.
    const defaults = diffusionParamRows();
    const edits = diffusionParamRows(EDIT_DIFFUSION_BOUNDS);
    const names = (rows: readonly ParamRow[]): string => rows.map((r) => r.name).join(",");
    assert.equal(
      names(asAction(qwenImg21T2I).params),
      `${names(defaults)},reference_images`,
      "qwen-img-21's rows are the factory's defaults in served order plus its OWN reference seat (audit 004/C4, 2026-10-22 — the only t2i family whose encoder reads references)",
    );
    assert.equal(
      names(asAction(zImageT2I).params),
      names(defaults),
      "z-image's rows are the factory's defaults in served order",
    );
    assert.equal(
      names(asAction(animaT2I).params),
      names(defaults),
      "anima's rows are the factory's defaults in served order",
    );
    assert.equal(
      names(asAction(krea2T2I).params),
      names(defaults),
      "krea-2's rows are the factory's defaults in served order",
    );
    assert.equal(
      names(asAction(fluxKleinT2I).params),
      `${names(defaults)},reference_images`,
      "flux-klein's rows are the factory's defaults in served order plus its OWN reference seat (same tail shape as qwen-img-21 — its graph takes no references; the row exists for surface parity, and the phantom-port gate refuses a stated list before the action ever sees one)",
    );
    const editCore = (family: string, action: Parameters<typeof asAction>[0]): string => {
      const rows = asAction(action).params;
      const start = rows.findIndex((r) => r.name === "prompt");
      assert.ok(start >= 0, `${family}: the family's surface carries the diffusion core`);
      return names(rows.slice(start, start + edits.length));
    };
    assert.equal(
      editCore("qwen-img-edit-21", edit21),
      names(edits),
      "qwen-img-edit-21's diffusion rows are the factory's EDIT narrowing — the family's own image/reference/boolean rows ride around them",
    );
    assert.equal(
      editCore("qwen-img-edit-2511", edit2511),
      names(edits),
      "qwen-img-edit-2511's diffusion rows are the factory's EDIT narrowing — the family's own rows ride around them",
    );
  });

  it("the edit narrowing and the t2i defaults are the bounds the walls pin (the values, not a range)", () => {
    const bounds = (b: DiffusionParamBounds): unknown => b;
    assert.deepEqual(bounds(EDIT_DIFFUSION_BOUNDS), { steps: [1, 50], cfg: [0.1, 10], size: null });
    const stepRow = diffusionParamRows().find((r) => r.name === "steps");
    const cfgRow = diffusionParamRows().find((r) => r.name === "cfg");
    assert.deepEqual(stepRow?.bounds, [1, 100]);
    assert.deepEqual(cfgRow?.bounds, [1, 20]);
    const widthRow = diffusionParamRows().find((r) => r.name === "width");
    assert.deepEqual(widthRow?.bounds, [256, 2048]);
    const editWidth = diffusionParamRows(EDIT_DIFFUSION_BOUNDS).find((r) => r.name === "width");
    assert.equal(editWidth?.bounds, undefined, "the edit families declare width/height UNBOUNDED (size: null)");
  });
});
