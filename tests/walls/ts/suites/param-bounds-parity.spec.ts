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
// (5) the shared-factory mechanism: the six families' diffusion
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
import { diffusionParamRows, EDIT_DIFFUSION_BOUNDS, type DiffusionParamBounds } from "../../../../packages/engines/comfyui-card-kit/src/paramRows.ts";
import { emitParamsSchema } from "../../../../packages/engines/comfyui-cordis/src/params-emit.ts";
import { schema as imageGenSchema } from "../../../../packages/image/image-gen/src/card.ts";
import { schema as imageEditSchema } from "../../../../packages/image/image-edit/src/card.ts";
import { t2i as qwenImg21T2I } from "../../../../packages/models/qwen-img-21/src/actions.ts";
import { t2i as zImageT2I } from "../../../../packages/models/z-image/src/actions.ts";
import { t2i as animaT2I } from "../../../../packages/models/anima/src/actions.ts";
import { t2i as krea2T2I } from "../../../../packages/models/krea-2/src/actions.ts";
import { t2i as fluxKleinT2I } from "../../../../packages/models/flux-klein/src/actions.ts";
import { edit as edit21 } from "../../../../packages/models/qwen-img-edit-21/src/actions.ts";
import { edit as edit2511 } from "../../../../packages/models/qwen-img-edit-2511/src/actions.ts";

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

const CARDS = [
  { name: "image-gen", schema: imageGenSchema, actions: [
    { family: "qwen-img-21", action: qwenImg21T2I },
    { family: "z-image", action: zImageT2I },
    { family: "anima", action: animaT2I },
    { family: "krea-2", action: krea2T2I },
    // FLUX-KLEIN (the hunt's admission-run cure 4, 2026-10-12): the
    // family boarded image-gen since its landing but never rode this
    // wall — a bounds drift between its action rows and the served
    // schema moved no needle. Derived roster law: the wall walks the
    // CARD's own boarded list below, so a future family joins only
    // by being boarded AND given a row here — the census arm at the
    // bottom names the gap if the roster and the board drift apart.
    { family: "flux-klein", action: fluxKleinT2I },
  ] },
  { name: "image-edit", schema: imageEditSchema, actions: [
    { family: "qwen-img-edit-21", action: edit21 },
    { family: "qwen-img-edit-2511", action: edit2511 },
  ] },
] as const;

describe("THE PARAM-BOUNDS PARITY WALL — the card's schema and the action's rows are one surface", () => {
  const T2I_ACTIONS = [["qwen-img-21", qwenImg21T2I], ["z-image", zImageT2I], ["anima", animaT2I], ["krea-2", krea2T2I]] as const;
  const EDIT_ACTIONS = [["qwen-img-edit-21", edit21], ["qwen-img-edit-2511", edit2511]] as const;

  for (const card of [
    { name: "image-gen", schema: imageGenSchema, boarded: ["krea-2", "z-image", "anima", "qwen-img-21"], actions: T2I_ACTIONS, cardOwned: ["model"] as readonly string[] },
    {
      name: "image-edit", schema: imageEditSchema, boarded: ["qwen-img-edit-21", "qwen-img-edit-2511"], actions: EDIT_ACTIONS,
      // the card's four hidden legacy aliases (image-edit/src/card.ts declares
      // them extra.hidden — validation-only, dropped by the emitter)
      cardOwned: ["model", "image1", "image2", "image3", "reference_images"] as readonly string[],
    },
  ] as const) {
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

  it("the six families' diffusion rows ride the shared factory IN SERVED ORDER (names; F2 deep-equals the rows)", () => {
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
