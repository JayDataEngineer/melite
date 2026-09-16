// form-spec-parity.spec.ts — THE LIVE/GOLDEN PARITY WALL: for EVERY
// card-carrying served id, the LIVE svc.formSpec (the cards'
// schemastery declarations walked by the comfyui service) is
// BYTE-EQUAL to the golden referee
// (tests/walls/ts/fixtures/form-spec-referee.json).
//
// HISTORY: the referee transcribed the retired python's served
// answers (the discovery-catalog.json export, deleted 2026-09-10 —
// byte parity with legacy python is NOT a goal). 28 of the 29 rows
// still match the py answers verbatim; the qwen3-tts-base row was
// re-baselined to the live derivation (py absorbed the voice-lock
// qvoice group into base's fields; live scopes fields to the
// serving card's surface — the tts card — so the group is gone by
// design, not drift).
//
// THE ENVELOPE PARITY (the parameter audit, 2026-09-14): the flat
// row walk is gone — the live surface is formSchemas (the card's
// own toJSON + the family-scoped mod contracts' toJSONs) and
// presentation (type/label/options/group/...) derives CLIENT-SIDE
// off those envelopes (pinned in card-base + card-view drills).
// The wall's parity claim is now NAME-EXACT on the union: card
// envelope dict names + mod envelope dict names ≡ the referee's
// field names — order on the card half (declaration order), set on
// the union. A field the referee served but no envelope carries (or
// the reverse) is drift, loud.
//
// Run: npx vitest run tests/walls/ts/suites/form-spec-parity.spec.ts
import { readFileSync } from "node:fs";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import { modelIds, registryIds, getModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";

const REFEREE = JSON.parse(
  readFileSync(
    new URL("../fixtures/form-spec-referee.json", import.meta.url),
    "utf8",
  ),
) as Record<string, { caller: string; fields: unknown[]; schema_groups: unknown[] }>;

// THE SPEC PLANE serves (caller, atom) pairs — the card-carrying
// served ids (registry models + boarded ROUTES like moss-sfx: THE
// CARD SELECTS THE ATOMS, and a caller may board a route). Variant
// routes no caller boards serve through the door's family envelope,
// never live-pinned here.
const KNOWN = new Set(modelIds());
const DECLS = new Map(modelIds().map((id) => [id, getModel(id)]));

/** The root object dict's node names from a toJSON envelope. */
function dictNames(envelope: unknown): string[] {
  return [...dictNodes(envelope).keys()];
}

/** The root object dict's nodes from a toJSON envelope (dict
 *  values are REF IDS — resolved here, never the raw number). */
function dictNodes(envelope: unknown): Map<string, Record<string, unknown>> {
  const out = new Map<string, Record<string, unknown>>();
  const env = envelope as { refs?: Record<string, { type?: string; dict?: Record<string, unknown> }> } | null;
  if (env?.refs === undefined) return out;
  const root = Object.values(env.refs).find((n) => n.type === "object" && n.dict !== undefined);
  for (const [name, id] of Object.entries(root?.dict ?? {})) {
    const node = env.refs[id as string | number];
    if (node !== undefined) out.set(name, node as Record<string, unknown>);
  }
  return out;
}

/** Nodes scoped OFF the serving family (extra.families names
 *  families the key is not): legitimately in the envelope, hidden
 *  client-side (fieldsOf passes spec.model as the family). */
function familyHidden(envelope: unknown, family: string): Set<string> {
  const hidden = new Set<string>();
  for (const [name, node] of dictNodes(envelope)) {
    const extra = node["meta"] as { extra?: { families?: unknown } } | undefined;
    const families = extra?.extra?.families;
    if (Array.isArray(families) && !families.includes(family)) hidden.add(name);
  }
  return hidden;
}

/** The caller of an atom (THE CARD SELECTS THE ATOMS — the model
 *  declares nothing about its callers): the card whose boarded
 *  list names it. */
function callerOf(svc: ReturnType<typeof theService>, modelId: string): string | null {
  for (const cardId of svc.cardIds()) {
    const def = svc.getCardDef(cardId);
    if (def !== undefined && def.boarded.includes(modelId)) return cardId;
  }
  return null;
}

function comparedSpecs(): string[] {
  const svc = theService();
  const out: string[] = [];
  for (const modelId of Object.keys(REFEREE).sort()) {
    // retired cells (anny-hmr &c) were never in the referee — the
    // table's families are the live surface
    if (!KNOWN.has(modelId)) continue;
    if (callerOf(svc, modelId) === null) continue;
    out.push(modelId);
  }
  return out;
}

describe("live formSpec ≡ golden referee (the parity wall)", () => {
  it("boots the card plane and covers every card-carrying spec", async (): Promise<void> => {
    await loadCardDefs();
    const specs = comparedSpecs();
    // 27 since stroke 87 (fit + skin specs retired with their
    // cards): 26 registry models + the sfx card's boarded ROUTE
    // moss-sfx (the caller boards the address, not the model) +
    // the qwen3-tts-base fold (the tts card boards the route since
    // the base/voicedesign folds landed — its referee row is the
    // live baseline, see the header).
    // mask-studio boards nothing (pure action card) so it never
    // enters this wall — the door serves its envelope live with
    // variants [].
    assert.equal(specs.length, 27, "the referee carries 27 card-carrying specs");
  });

  it("the union — card envelope + mod envelopes — is name-exact for every spec", async (): Promise<void> => {
    await loadCardDefs();
    const svc = theService();
    for (const modelId of comparedSpecs()) {
      const ref = REFEREE[modelId];
      const caller = callerOf(svc, modelId);
      assert.ok(caller !== null, `${modelId}: no caller boards it`);
      assert.equal(caller, ref.caller, `${modelId}: caller moved ${ref.caller} -> ${caller}`);
      const live = svc.formSchemas(caller, modelId);
      assert.ok(live !== null, `${modelId}: no live schemas`);
      const refNames = (ref.fields as Array<{ name: string }>).map((f) => f.name);
      // the card half: EXACT both ways on the VISIBLE plane (a card
      // field the referee never served — or a lost one — is drift);
      // family-scoped nodes legitimately ride the envelope hidden
      // (extra.families — fieldsOf filters client-side)
      const cardNames = dictNames(live.schema);
      const hidden = familyHidden(live.schema, modelId);
      const visible = cardNames.filter((n) => !hidden.has(n));
      for (const n of visible) {
        assert.ok(refNames.includes(n), `${modelId}: card envelope carries '${n}' the referee never served`);
      }
      assert.deepEqual(
        visible,
        visible.slice().sort((a, b) => refNames.indexOf(a) - refNames.indexOf(b)),
        `${modelId}: card declaration order drifted from the referee`,
      );
      // the mod half (one-way coverage): every referee name the card
      // doesn't carry must live in a family-scoped mod contract —
      // its pack key or one of its columns (the contract's own
      // knobs render through the mod surface, not as card fields)
      const modServed = new Set<string>([
        ...Object.keys(live.mods),
        ...Object.values(live.mods).flatMap((m) => dictNames(m)),
      ]);
      for (const n of refNames) {
        assert.ok(
          cardNames.includes(n) || modServed.has(n),
          `${modelId}: referee field '${n}' rides neither the card envelope nor a mod contract`,
        );
      }
    }
  });

  it("schema_groups member names are covered by the envelopes for every spec", async (): Promise<void> => {
    await loadCardDefs();
    const svc = theService();
    for (const modelId of comparedSpecs()) {
      const ref = REFEREE[modelId];
      const live = svc.formSchemas(REFEREE[modelId].caller, modelId)!;
      const union = new Set<string>([
        ...dictNames(live.schema),
        ...Object.keys(live.mods),
        ...Object.values(live.mods).flatMap((m) => dictNames(m)),
      ]);
      for (const group of ref.schema_groups as Array<{ id: string; fields: Array<{ name: string }> }>) {
        for (const member of group.fields) {
          assert.ok(union.has(member.name), `${modelId}: group ${group.id} member ${member.name} rides no envelope`);
        }
      }
    }
  });

  it("closed vocabularies refuse non-members (the enum union law)", async (): Promise<void> => {
    await loadCardDefs();
    const svc = theService();
    const live = svc.formSchemas("image-gen", "krea-2");
    assert.ok(live !== null, "krea-2 serves schemas");
    const sampler = dictNodes(live.schema).get("sampler");
    assert.ok(sampler !== undefined, "krea-2 carries a sampler knob");
    // list carries REF IDS — resolve before reading the consts
    const env = live.schema as { refs: Record<string | number, { type?: string; value?: unknown }> };
    const ids = (sampler as { list?: Array<string | number> }).list ?? [];
    const opts = ids.map((id) => env.refs[id]).filter((r) => r?.type === "const").map((r) => r!.value);
    assert.equal(opts.length, 45, "the sampler vocabulary is the object_info pin (45)");
    assert.ok(!opts.includes("not_a_sampler"));
  });

  it("the hierarchy: 46 models (fit + skin retired stroke 87), every flat route still serves", (): void => {
    // THE HIERARCHY STROKE (2026-09-08): one model per engine-lane
    // unit (ace-step ×6 flat ids = ONE model: variants × quants);
    // every flat id the runtime has ever addressed still serves.
    assert.equal(registryIds().length, 46);
    for (const flat of ["ace-step", "ace-step-bf16", "ace-step-base", "ace-step-base-bf16", "ace-step-sft", "ace-step-xl", "qwen3-tts", "qwen3-tts-base"]) {
      assert.ok(modelIds().includes(flat), flat + " still serves (the flat ids survive as routes)");
    }
  });
});
