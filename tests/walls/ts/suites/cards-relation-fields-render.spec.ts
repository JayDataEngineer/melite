// cards-relation-fields-render.spec.ts — THE GHOST-NAME WALL (the
// generic card-level law, operator 2026-11-10: "ALL THE REDS WE SAW
// WITH QWEN SHOULD BE IMPOSSIBLE, NOT AT THE QWEN LEVEL, BUT AT THE
// GENERIC CARD LEVEL").
//
// The lesion it kills — the qwen voice_name burn generalized: a
// family DECL may name a field its card's form cannot state. The
// qwen3-tts required-together row named voice_name + design_prompt
// while the schema carried only design_prompt — the pair was
// uncompletable from the UI, every half-pair write refused and
// unlanded, and the studio bricked. The tts card's own spec walls
// exactly that one card; nothing stopped the SAME defect landing on
// any of the other 30 boarded families. This wall judges EVERY
// family a card boards, over EVERY name its declaration utters:
//
//   family params ∪ family relation words (requires/conflicts/
//   together/either_or/at_most_one/required) ∪ each variant's
//   params ∪ relations ∪ each cell's params
//
// against the REAL form-spec emission (formSpecArm — the same body
// the /v1/form-spec door serves and the studio renders; never a
// re-derived copy). A name is stateable when it is a schema leaf of
// the doc's envelope root OR a MOD PARAM_KEY (a bag the lane judge
// reads top-level — the blank law admits a non-empty object: the
// either_or source `qvoice` is the bag's param_key). A name that is
// ONLY a knob INSIDE a mod envelope does NOT count: relations judge
// top-level lane params, so a relation half with no root leaf is
// exactly the voice_name brick, whatever the mod system renders
// inside its modal.
//
// Run: npx vitest run tests/walls/ts/suites/cards-relation-fields-render.spec.ts
import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { getModel, modelIds } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { formSpecArm } from "../../../../packages/harness/melite-tools/src/discovery.ts";

// The wall judges the REAL checkout's declarations — never a
// fixture root a sibling spec may have left in the env.
process.env["MELITE_REPO_ROOT"] = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
);

/** One relation block's named fields — every word the vocabulary
 *  serves (RELATION_WORDS' own keys, read shape-for-shape off the
 *  ParamRelationWords interface so a seventh word added to the
 *  grammar without a walk arm here is a visible gap, not a silent
 *  pass). */
function relationFields(rel: unknown): string[] {
  if (rel == null) return [];
  const r = rel as Record<string, unknown>;
  const out: string[] = [];
  for (const row of (r.requires as { field: string; needs: string[] }[] | undefined) ?? []) out.push(row.field, ...row.needs);
  for (const row of (r.conflicts as { a: string; b: string }[] | undefined) ?? []) out.push(row.a, row.b);
  for (const row of (r.together as { fields: string[] }[] | undefined) ?? []) out.push(...row.fields);
  for (const row of (r.either_or as { groups: string[][] }[] | undefined) ?? []) for (const g of row.groups) out.push(...g);
  for (const row of (r.at_most_one as { fields: string[] }[] | undefined) ?? []) out.push(...row.fields);
  for (const row of (r.required as { fields: string[] }[] | undefined) ?? []) out.push(...row.fields);
  return out;
}

/** Every field name one family's declaration utters: the base
 *  surface, the relation words at family scope, and every variant
 *  (params + relations) with every cell's params — the add-never-
 *  subtract union the lane surface resolves (laneSurfaceOf's own
 *  inputs). */
function declaredFieldNames(decl: unknown): Set<string> {
  const d = decl as Record<string, unknown>;
  const named = new Set<string>();
  for (const p of (d.params as string[] | undefined) ?? []) named.add(p);
  for (const f of relationFields(d.relations)) named.add(f);
  for (const v of (d.variants as Record<string, unknown>[] | undefined) ?? []) {
    for (const p of (v.params as string[] | undefined) ?? []) named.add(p);
    for (const f of relationFields(v.relations)) named.add(f);
    for (const c of (v.cells as Record<string, unknown>[] | undefined) ?? []) {
      for (const p of (c.params as string[] | undefined) ?? []) named.add(p);
    }
  }
  return named;
}

describe("THE GHOST-NAME WALL — every DECL-named field is stateable on the card that boards it (the qwen voice_name class, judged at the generic card level)", () => {
  it("every family a card boards names only fields its REAL form-spec can state (schema leaf or mod-owned)", async () => {
    const defs = await loadCardDefs();
    // THE FAMILY→CARD EDGE (resolveSpecKey's own join): a card
    // boards families; the boarded map is the only seat this wall
    // accepts. Route atoms that board nothing are their owner's
    // variant/cell addresses — the owner's judgment covers them.
    const boarded = new Map<string, string>();
    for (const [cardId, def] of defs) {
      for (const fam of def.boarded ?? []) {
        if (!boarded.has(fam)) boarded.set(fam, cardId);
      }
    }
    assert.ok(boarded.size >= 25, `the boarded edge serves a real roster (got ${boarded.size})`);
    const misses: string[] = [];
    let judged = 0;
    for (const fam of modelIds()) {
      const cardId = boarded.get(fam);
      if (cardId === undefined) continue;
      const named = declaredFieldNames(getModel(fam));
      if (named.size === 0) continue;
      judged += 1;
      const doc = await formSpecArm(fam, undefined, []);
      if (doc === null) {
        misses.push(`${fam} (${cardId}): form-spec resolves null — the studio cannot open this family at all`);
        continue;
      }
      const owned = new Set<string>((doc.features?.modifiers ?? []).map((k) => k.param_key));
      const env = doc.schema as { uid?: number; refs: Record<number, { dict?: Record<string, number> }> };
      const root = env.uid !== undefined ? env.refs[env.uid] : undefined;
      const dict = root?.dict;
      if (dict === undefined) {
        misses.push(`${fam} (${cardId}): the emitted schema envelope carries no root object`);
        continue;
      }
      for (const name of [...named].sort()) {
        if (dict[name] !== undefined) continue;
        if (owned.has(name)) continue;
        misses.push(`${fam} (${cardId}): '${name}' is named by the declaration (params or a relation word) but is neither a schema leaf of the form's root nor a mod bag's param_key — a relation judging it cannot be completed from the form, the exact voice_name brick`);
      }
    }
    assert.ok(judged >= 25, `the walk judged a real roster of families (got ${judged})`);
    assert.deepEqual(misses, [], `every DECL-named field renders (the voice_name class is impossible at the card level)`);
  });
});
