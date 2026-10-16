// card-wtype-judge.spec.ts — EVERY FIELD'S WTYPE AGREES WITH ITS ZOD SHAPE.
//
// envelope-laws.ts refuses a wtype outside WTYPE_SET, but nothing
// pinned WHICH member a field uses — a select→text regression on
// any card but input-prep rendered a freeform box all-green (arm 1
// of the input-prep scale report pinned input-prep's seven doors;
// this wall is the estate-wide judge the report left open).
//
// THE DERIVATION (never a hand-list): the walk boots the live card
// set (loadCardDefs over the SSOT composition list cardPackages)
// and judges every field of every served schema dict — the judged
// set IS the served set. A card that hides its dict reds (a wall
// judging a copy of the truth passes while the truth burns).
//
// THE LAWFUL MAPPING (derived from the LIVE tree 2026-10-12, 14
// cards / 411 fields — the census below; not decreed):
// - union-of-consts (vocabulary(), SAMPLERS/SCHEDULERS, every
//   card-local closed set incl. numeric-member sets like 512|1024
//   and true|false) → wtype MUST be 'select'. No exceptions live.
//   THIS is the select→text regression's seat: a dropdown that
//   stops declaring select renders a freeform box.
// - z.number → 'number' | 'slider' | absent. slider is the bounded
//   knob face (music duration, sfx steps, anny morphs); absent is
//   the sampling-extra face (image-gen seed/steps/cfg ride
//   samplingExtra, anny resolution/framing) — the form falls back
//   to the native number arm.
// - z.string → 'textarea' | 'text' | 'image' | 'file' | 'mesh' |
//   absent. textarea is the prose face, image/file/mesh the square
//   provider faces, absent the bare-text fallback (tagger's tag
//   verbs, motion's motion_npz). 'text' is lawful-but-unlanded (no
//   live row; the atom seat renders a single-line input —
//   textarea→text is cosmetic, never a contract break). 'select'
//   on a string is lawful ONLY with an option source
//   (optionsFrom|options in the bag): h3-timeline's refine_lora is
//   the receipt — a server-fed dropdown (optionsFrom 'loras', the
//   catalog's refiner rows; the compose door refuses unknown ids
//   loud). A string+select with NO source is an empty menu — the
//   dropdown-shape lie in the other direction — and reds.
// - z.boolean → absent | 'boolean'. Live: ALL TEN boolean fields
//   carry NO wtype (the native checkbox face); 'boolean' is
//   lawful-but-unlanded (the packs' mod face uses it, the atom
//   seat exists).
// - z.array of strings → 'image_list', the input signature's stack
//   face. z.array of OBJECTS (h3-timeline's ref_video_trims, the
//   only live row — index-paired trim rows) → NO wtype: the served
//   plane projects it as an unconstrained json node (params-emit.ts:
//   object/array knobs project as `json`) and the card's own studio
//   owns the editor (h3's studio-contract-wall pins that surface).
//   A wtype on a json-projected field is unowned surface and reds.
// - hidden === true → NO wtype (the image-edit legacy aliases:
//   four strings + one array, validation-only, dropped by the
//   emitter — a wtype on a never-rendered field is dead surface).
// - any other zod shape → RED naming card+field+shape (a new shape
//   forces an explicit rule here; never a silent pass).
//
// A violation reds naming card + field + carried wtype + expected
// set. The judged-field count is equality-pinned (the CURE-1 law:
// a silent census shrink cannot pass — deleting anny's morph
// spread drops the count and reds here).

import { describe, it } from "vitest";
import assert from "node:assert/strict";
import "../../../helpers/boot-models.ts";
import { cardPackages, loadCardDefs } from "@melite/comfyui-cordis";

// THE FROZEN ROSTER (derived 2026-10-12: 14 cards, 466 schema
// fields — anny's morph spread owns the bulk, h3-timeline's 55 ride
// its schemaCarrier paramSchema, read off the service's own door).
// A conscious addition forces these literals up; a silent shrink
// reds. (KILL-sweep note: model-package deletions never move these
// — cards are their own packages.)
// 466 -> 467 (2026-10-13, the match toggle): the image-edit card's
// match_input_resolution seat — a boolean params field, judged
// boolean/boolean against the ParamSpec pair on both edit lanes.
// 467 -> 466 (2026-10-31, the template-fidelity cure): the
// img-to-mesh card's bg_removal seat leaves with birefnet — the
// select knob judged select/select on the mesh lane, now gone. A
// deliberate shrink, argued here per this arm's own law.
// 466 -> 465 (2026-11-05, c7bc662b7 storm cures wave 6): the h3
// card's film-level prompt field GONE — calls own their prompts
// (the textarea judged string/textarea, schema+UI walled at its
// own seat, toJSON judge red-proofed there). A deliberate shrink,
// argued here per this arm's own law.
const CARD_ROSTER = 14;
// 466 (2026-11-06): input-prep's crop-studio field joined the estate.
const FIELD_ROSTER = 466;

interface DictField {
  readonly type?: string;
  readonly list?: ReadonlyArray<{ value?: unknown }>;
  readonly inner?: { readonly type?: string };
  readonly meta?: { readonly extra?: Record<string, unknown> };
}

type Shape = "vocabulary" | "number" | "string" | "boolean" | "array-strings" | "array-objects";

/** The zod shape the agreement rules switch on. Unions of consts
 *  are the estate's vocabulary spelling (vocab.ts: one union row =
 *  the dropdown AND the refusal); every other union form is
 *  unknown — forcing the explicit rule, never a silent pass.
 *  Arrays split on their member (the node's `.inner.type`): string
 *  stacks ride image_list, object rows ride the json face. */
function shapeOf(field: DictField): Shape | `unknown:${string}` {
  if (field.type === "union" && Array.isArray(field.list)) return "vocabulary";
  if (field.type === "number" || field.type === "string" || field.type === "boolean") {
    return field.type;
  }
  if (field.type === "array") {
    return field.inner?.type === "string" ? "array-strings" : "array-objects";
  }
  return `unknown:${String(field.type)}`;
}

/** The lawful wtype set per shape (undefined = the bag carries no
 *  wtype — lawful where the form's native face owns the field). */
function lawful(shape: Shape): ReadonlyArray<string | undefined> {
  switch (shape) {
    case "vocabulary": return ["select"];
    case "number": return ["number", "slider", undefined];
    case "string": return ["textarea", "text", "image", "file", "mesh", "select", undefined];
    case "boolean": return ["boolean", undefined];
    case "array-strings": return ["image_list"];
    case "array-objects": return [undefined];
  }
}

describe("the estate-wide per-field wtype judge", () => {
  it("every card serves its schema dict, and the judged set IS the composed set", async () => {
    const defs = await loadCardDefs();
    assert.equal(defs.size, cardPackages.length, `the boot serves ${defs.size} cards for ${cardPackages.length} composed packages — the judged set must BE the served set`);
    assert.equal(cardPackages.length, CARD_ROSTER, `the composition roster moved (now ${cardPackages.length}) — a conscious addition forces this literal up; a silent drop reds`);
    const dictless: string[] = [];
    for (const [id, def] of defs) {
      const dict = ((def.schemaCarrier ?? def.schema) as unknown as { dict?: Record<string, DictField> }).dict;
      if (dict === undefined) dictless.push(id);
    }
    assert.deepEqual(dictless, [], "cards hiding their schema dict (read off schemaCarrier ?? schema, the service's own door — a wall judging a copy of the truth passes while the truth burns)");
  });

  it("every field's wtype agrees with its zod shape, and the judged count is pinned", async () => {
    const defs = await loadCardDefs();
    const violations: string[] = [];
    let judged = 0;
    for (const [id, def] of defs) {
      const dict = ((def.schemaCarrier ?? def.schema) as unknown as { dict?: Record<string, DictField> }).dict;
      assert.ok(dict !== undefined, `card '${id}' hides its schema dict`);
      for (const [name, field] of Object.entries(dict)) {
        judged += 1;
        const bag = field.meta?.extra ?? {};
        const wtype = bag["wtype"] as string | undefined;
        const hidden = bag["hidden"] === true;
        const shape = shapeOf(field);
        if (typeof shape === "string" && shape.startsWith("unknown:")) {
          violations.push(`card '${id}' field '${name}': ${shape} — no agreement rule seats this shape (add one deliberately, never a silent pass)`);
          continue;
        }
        if (hidden) {
          if (wtype !== undefined) {
            violations.push(`card '${id}' field '${name}': hidden yet carries wtype '${wtype}' — a never-rendered field's wtype is dead surface`);
          }
          continue;
        }
        const ok = (lawful(shape as Shape) as ReadonlyArray<string | undefined>).includes(wtype);
        if (!ok) {
          violations.push(`card '${id}' field '${name}': ${shape} carries wtype '${String(wtype)}' — expected ${lawful(shape as Shape).map((w) => w ?? "(absent)").join(" | ")}`);
          continue;
        }
        // THE SOURCED-DROPDOWN RULE (h3-timeline refine_lora is the
        // receipt): a string rendered as select must name its option
        // source (optionsFrom|options) — a sourceless string+select
        // is an empty menu, the dropdown-shape lie in the other
        // direction.
        if (shape === "string" && wtype === "select" && bag["optionsFrom"] === undefined && bag["options"] === undefined) {
          violations.push(`card '${id}' field '${name}': string carries wtype 'select' with no option source (optionsFrom|options) — a sourceless dropdown is an empty menu`);
        }
      }
    }
    assert.deepEqual(violations, [], "fields whose wtype disagrees with their zod shape");
    assert.equal(judged, FIELD_ROSTER, `the judged field census moved (now ${judged}) — a conscious addition forces this literal up; a silent shrink reds`);
  });
});
