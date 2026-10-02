// param-bounds-parity.spec.ts — THE TWO HOMES ARE ONE (the
// atom-vocabulary attainment audit's F3, 2026-10-12).
//
// Every knob's type AND bounds are declared twice: in the action's
// ParamSpec (enforced for family/DECL write rows by
// validateWriteRowsAgainstActions) and in the card's z.object
// (enforced on the USER's card write). The two agree today —
// measured here — and nothing kept them agreeing. A bounds edit on
// one side that missed the other would compose a graph the user's
// own card schema forbids, or reject a value the engine accepts.
//
// This wall reads both homes and asserts they are EQUAL, per
// (card, action, param): the numeric envelope (min, max), the
// declared type, and the enum's options against the vocabulary the
// action cites. A card field the action does not declare, or an
// action row the card does not expose, is named too — the two
// surfaces must be the same set, not a subset relationship.
//
// It also pins the mechanism: the bounds come from the SHARED
// factories (diffusion rows for the six diffusion families), so a
// family narrowing is a parameter, not a second hand-typed copy.

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
import { edit as edit21 } from "../../../../packages/models/qwen-img-edit-21/src/actions.ts";
import { edit as edit2511 } from "../../../../packages/models/qwen-img-edit-2511/src/actions.ts";

type ParamRow = { name: string; type: string; bounds?: readonly [number, number]; options?: readonly string[] };
type Action = { id: string; params: readonly ParamRow[] };

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
    { name: "image-gen", schema: imageGenSchema, boarded: ["krea-2", "z-image", "anima", "qwen-img-21"], actions: T2I_ACTIONS },
    { name: "image-edit", schema: imageEditSchema, boarded: ["qwen-img-edit-21", "qwen-img-edit-2511"], actions: EDIT_ACTIONS },
  ] as const) {
    it(`${card.name}: every field the actions declare carries the SAME envelope and options on the card`, () => {
      const served = serveCard(card.schema, card.boarded);
      const judged: string[] = [];
      for (const [family, raw] of card.actions) {
        const action = raw as unknown as Action;
        for (const row of action.params) {
          const field = served.get(row.name);
          if (field === undefined) continue;
          judged.push(`${family}/${action.id}:${row.name}`);
          if (row.type === "number") {
            const fromCard = [field.min, field.max];
            const fromAction = row.bounds === undefined ? [null, null] : [...row.bounds];
            assert.deepEqual(
              fromCard,
              fromAction,
              `${card.name} ${family}/${action.id} "${row.name}": the card's served envelope ${JSON.stringify(fromCard)} does not EQUAL the action's ParamSpec bounds ${JSON.stringify(fromAction)} — the two homes are ONE (F3): edit BOTH, or bound neither`,
            );
          } else if (row.type === "enum") {
            assert.deepEqual(
              [...(field.options ?? [])].sort(),
              [...(row.options ?? [])].sort(),
              `${card.name} ${family}/${action.id} "${row.name}": the card's served enum options must EQUAL the action's cited vocabulary`,
            );
          }
        }
      }
      assert.ok(judged.length >= 9, `${card.name}: the parity arm judged the surface (saw ${judged.length} fields — a surface that empties an arm is a hole, not a pass)`);
    });
  }

  it("the six families' rows ARE the shared factory's output (the mechanism, pinned)", () => {
    // If a family hand-copied the rows, the parity above would still
    // pass while the two homes drift together; this arm pins that
    // the bounds come from the ONE factory with the family's
    // narrowing as a parameter.
    const defaults = diffusionParamRows();
    const edits = diffusionParamRows(EDIT_DIFFUSION_BOUNDS);
    const names = (rows: readonly ParamRow[]): string => rows.map((r) => r.name).join(",");
    assert.equal(
      names((qwenImg21T2I as Action).params),
      names(defaults),
      "qwen-img-21's rows are the factory's defaults in served order",
    );
    assert.equal(
      names((zImageT2I as Action).params),
      names(defaults),
      "z-image's rows are the factory's defaults in served order",
    );
    assert.equal(
      names((animaT2I as Action).params),
      names(defaults),
      "anima's rows are the factory's defaults in served order",
    );
    assert.equal(
      names((krea2T2I as Action).params),
      names(defaults),
      "krea-2's rows are the factory's defaults in served order",
    );
    const editCore = (family: string, action: unknown): string => {
      const rows = (action as Action).params;
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