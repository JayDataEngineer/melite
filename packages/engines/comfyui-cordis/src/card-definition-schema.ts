// card-definition-schema.ts — THE CARD ENVELOPE SCHEMA GATE (the
// strictness audit's fix 1, T1: registerCard judged duplicate ids,
// flow contracts, envelope vocabularies, families, mods, and model
// lifts — but never the ENVELOPE itself; a hot plugin's
// {...def, boardd: ["flux"]} typo boarded nothing and booted
// silently, its author believing a declaration held).
//
// The registerFamily pattern, third verse (mods-schema.ts is the
// second): a STRICT schemastery resolve — a carried key the strict
// resolve strips is drift and refuses loud, naming the key — plus
// leaf type-truth where the shape can state it. Nested structure
// stays TS-owned and gated by the semantic doors that already walk
// it (assertFlowContract, assertEnvelopeLaws, validateDeclaredMods,
// the family and model gates in service.ts); schemastery drops
// strict inside nested resolves, so this schema does not pretend to
// judge depth — the envelope's own top level is the one home here.
import Schema, { default as z } from "@deepseek-ai/schemastery";
import { ComposeRefusal } from "@melite/comfyui-card-kit/errors";
import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition';

/** The card envelope (the CardDefinition interface's top level —
 * every key the interface declares, so a legitimate card never
 * strips; object-, function-, and row-valued arms are z.any because
 * their depth is typed at this boundary and judged by the semantic
 * doors, never re-judged here). */
const CardDefinitionSchema = z.object({
  id: z.string(),
  skeleton: z.string(),
  boarded: z.array(z.string()),
  tags: z.array(z.string()),
  requiresModel: z.boolean(),
  admits: z.array(z.string()),
  jsonArrayParams: z.array(z.string()),
  spells: z.array(z.string()),
  requires: z.array(z.string()),
  requiresByFamily: z.dict(z.array(z.string())),
  preview: z.any(),
  mods: z.any(),
  schema: z.any(),
  schemaCarrier: z.any(),
  compose: z.any(),
  finalize: z.any(),
  identity: z.any(),
  provisions: z.any(),
  armWeights: z.any(),
  // THE DOWNLOAD OWNER (family-owns-downloads, 2026-10-12): the
  // family id whose DECL provisions the card serves — the
  // missing-weight rescue names it to the ONE download door.
  // z.any() like its sibling rows: the value is a plain string,
  // validated by the type, not this envelope.
  provisionOwner: z.any(),
  sidebar: z.any(),
  surface: z.any(),
  flowKinds: z.any(),
  flowOutputBindings: z.any(),
  primaryFile: z.string(),
});

/** The registerCard envelope gate: strict resolve, then the
 * drift test (a carried key the resolve stripped is a key the
 * interface never declared — it refuses, named). A shape miss
 * (a string leaf carrying a number) refuses in the same breath. */
export function validateCardDefinition(def: CardDefinition): void {
  let strict: Record<string, unknown>;
  try {
    strict = (Schema.resolve(def as unknown as Record<string, unknown>, CardDefinitionSchema, {}, true) as [Record<string, unknown>, unknown])[0];
  } catch (err: unknown) {
    // Schemastery's own resolve is the only thrower and every failure it
    // raises is an Error subclass (ValidationError extends TypeError), so
    // the message read needs no non-Error spelling (the re-audit, 2026-10-16).
    const detail = (err as Error).message;
    throw new ComposeRefusal('card-envelope', `card '${def.id}': envelope schema refused — ${detail}`);
  }
  const carried = Object.keys(def as unknown as Record<string, unknown>);
  const stripped = carried.filter((k) => !(k in strict));
  if (stripped.length > 0) {
    throw new ComposeRefusal(
      'card-envelope',
      `card '${def.id}': unknown key(s) refused (the card envelope is strict; drift refuses): ${stripped.sort().join(", ")}`,
    );
  }
}
