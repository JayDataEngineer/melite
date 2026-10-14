// card-default-overlap.spec.ts — THE DUAL-FLOOR LAW (the card-ui
// audit's cascade verdict, 2026-11-02): the compose door's overlay
// (`stampCardOverlay`, absent-keys-only) lets a FAMILY's declared
// default fill every param key the request left unstated — but a
// CARD schema `.default()` on the same key wins the fork silently
// (the walk delivers it, the overlay skips present keys). Two
// owners on one key is either dead surface (identical values —
// the family floor can never fire: motion's 8, tagger's booleans)
// or a silenced fork (different values — the card overrides the
// family's calibration with no trace: image-gen's cfg 4.5 over the
// families' calibrated 1, tagger's 0.35 over joytag's 0.2). The
// RANGE RULE's corollary: whoever owns the default owns the floor
// — ONE owner per key, estate-wide.
//
// The judged set is DERIVED, never hand-listed: every card the
// SSOT composes (loadCardDefs) × every boarded family's DECL
// defaults, read off the booted models registry's own door
// (registryModel — the models-against-cards precedent, live
// source through the facade, never a second resolution seat).
// The firing arm proves the predicate on synthetic rows (pure,
// no tree state).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import "../../../helpers/boot-models.ts";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { owningAtom, registryModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";

interface DictField {
  readonly uid?: number;
  readonly type?: string;
  readonly meta?: { readonly default?: unknown } & Record<string, unknown>;
  readonly refs?: Record<string, { readonly meta?: { readonly default?: unknown } }>;
}

type SchemaFace = { dict?: Record<string, DictField> };

/** A field's declared schema default, whichever dict spelling the
 *  walk served (direct meta, or the refs[uid] indirection the
 *  nested object walk emits). */
function declaredDefault(field: DictField): unknown {
  if (field.meta && "default" in field.meta) return field.meta.default;
  if (field.uid !== undefined && field.refs?.[String(field.uid)]?.meta && "default" in (field.refs[String(field.uid)].meta as Record<string, unknown>)) {
    return field.refs[String(field.uid)].meta?.default;
  }
  return undefined;
}

describe("the dual-floor overlap law", () => {
  it("no card schema-defaults a key any boarded family also defaults (one owner per floor)", async () => {
    const defs = await loadCardDefs();
    const violations: string[] = [];
    let judgedCards = 0;
    let judgedKeys = 0;
    for (const [id, def] of defs) {
      const dict = ((def.schemaCarrier ?? def.schema) as unknown as SchemaFace).dict;
      assert.ok(dict !== undefined, `card '${id}' hides its schema dict (read off schemaCarrier ?? schema, the service's own door)`);
      judgedCards += 1;
      const cardDefaults = new Set<string>();
      for (const [name, field] of Object.entries(dict)) {
        judgedKeys += 1;
        if (declaredDefault(field) !== undefined) cardDefaults.add(name);
      }
      for (const famId of def.boarded) {
        // THE ROUTE→ATOM FOLD (owningAtom — the same fold the
        // compose overlay's envelope judges, cardsVariant.ts): a
        // boarded roster names routes too; the registry holds
        // atoms, and registryModel throws loud on the atom when a
        // rotted roster names nothing real
        const fam = (registryModel(owningAtom(famId)) as unknown as { defaults?: Record<string, unknown> }).defaults ?? {};
        for (const key of cardDefaults) {
          if (key in fam) {
            violations.push(`card '${id}' key '${key}': card schema defaults it AND boarded family '${famId}' defaults it (${JSON.stringify(declaredDefault(dict[key]))} vs ${JSON.stringify(fam[key])}) — ONE owner per floor (drop the card's, or the family's)`);
          }
        }
      }
    }
    assert.ok(judgedCards > 0 && judgedKeys > 0, "the walk judged nothing — the derivation itself rotted");
    assert.deepEqual(violations, [], "DUAL FLOORS — card schema defaults riding keys a boarded family also defaults (the overlay is absent-keys-only, so the card default silently wins every fork; dead surface at best, a silenced family calibration at worst):\n" + violations.join("\n"));
  });

  it("the predicate FIRES (synthetic rows: overlap reds, disjoint greens)", () => {
    const overlaps = (card: Set<string>, fam: Record<string, unknown>): string[] => {
      const hits: string[] = [];
      for (const key of card) if (key in fam) hits.push(key);
      return hits;
    };
    assert.deepEqual(overlaps(new Set(["seed", "cfg"]), { seed: 0 }), ["seed"], "an overlapped key reds");
    assert.deepEqual(overlaps(new Set(["seed"]), { cfg: 1 }), [], "disjoint keys green — a card may keep defaults its families do not carry (image-gen/upscale seed -1, the random-UX single owner)");
  });
});
