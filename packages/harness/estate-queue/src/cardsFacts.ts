// cardsFacts.ts — the frozen data paths + the decl projection.
// Extracted from cardsRegistry (the god-file cut, 2026-09-18): the
// facts/decl plane owns model-facts.json reads and the pure
// defs+facts->rows derivation. No Service state — module truth.
import { join } from "node:path";
import { loadCardDefs, loadFacts, resolveRepoRoot } from "@melite/comfyui-cordis";
import type { CardDefinition } from "@melite/comfyui-cordis";
import type { LaneRelations } from "@melite/contracts/laneRelations";

// ── frozen data paths (facts + pin snapshot) ───────────────────────
// (Stroke 2a, DSH-AS-LANGUAGE LAW: the module-level caches that used
// to live here — factsCache/declsCache/defsCache/oiCache/oiPathCache/
// modelMidsCache — are CardRegistryService instance state below. No
// module-level mutable singleton remains in this file.)

export interface VariantCellRow {
  readonly quant: string;
  readonly route: string;
  readonly hide_from_dropdown?: boolean;
}

export interface VariantRow {
  readonly id: string;
  readonly group: string;
  readonly hide_from_dropdown?: boolean;
  readonly route: string;
  readonly resolver_defaults: Record<string, unknown>;
  /** THE ROUTE ENVELOPE (the compose-side guard): closed bounds a
   *  caller-stated steps/cfg must live inside — the distilled-lane
   *  marriage is declared, never negotiated. */
  readonly sampler_envelope?: {
    steps?: readonly [number, number];
    cfg?: readonly [number, number];
  } | null;
  /** THE LANE SURFACE (2026-10-10, the YOU_ARE_A_LIAR fix shape):
   *  this variant's accepted params IN ADDITION to the family base.
   *  Present only where the DECL declares it. */
  readonly params?: readonly string[];
  /** This lane's relation words (judged in addition to the family's
   *  own). Present only where declared. */
  readonly relations?: LaneRelations;
  /** This lane's numeric bounds (per-field REPLACING the family's
   *  row for the fields it states — the RANGE RULE). Present only
   *  where declared. */
  readonly bounds?: Readonly<Record<string, { min?: number; max?: number }>>;
  readonly cells: VariantCellRow[];
}

export interface ModelFactsRow {
  readonly card: string;
  readonly defaults: Record<string, unknown>;
  readonly variants: VariantRow[];
  /** THE BASE PARAMETER SURFACE (2026-10-10, the fix shape): the
   *  params every lane of this family accepts. Present only where
   *  the DECL declares one — absent ≡ the card's union table
   *  authors the fields (the legacy truth; the lane judge and the
   *  claim law bind nothing). */
  readonly params?: readonly string[];
  /** The family-wide relation words (judged on every lane).
   *  Present only where declared. */
  readonly relations?: LaneRelations;
  /** The family-wide numeric bounds (per-field replaced by a
   *  variant's own row). Present only where declared. */
  readonly bounds?: Readonly<Record<string, { min?: number; max?: number }>>;
  /** The assembly-studio declaration (hand-owned model-facts.json
   *  carries it; the projection unions its writes into admits). */
  readonly studio?: { readonly writes?: readonly unknown[] };
}

export interface CardDeclRow {
  readonly skeleton: string;
  readonly boarded: readonly string[];
  readonly schemaNames: readonly string[];
  readonly admits: readonly string[];
  readonly spells: readonly string[];
}

export function factsPath(): string {
  // Merged 2026-09-08 (reversed: the models plane folds into the
  // cordis package): the compose plane lives in
  // packages/engines/comfyui-cordis/src, its card-owned fact slices
  // in packages/engines/comfyui-cordis/data (Decl x Facts
  // unification — loadFacts derives model-owned rows from the
  // registry at load).
  return join(
    resolveRepoRoot(), "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
  );
}

// ── the decl projection (pure: defs + facts in, rows out) ─────────
// (Was loadCardDecls' body; the cache it fed is service state now.)
export function deriveDecls(
  defs: Map<string, CardDefinition>,
  facts: Record<string, ModelFactsRow>,
): Record<string, CardDeclRow> {
  const out: Record<string, CardDeclRow> = {};
  for (const [id, def] of defs) {
    // The emitter's carrier line (toolsEmit.ts mirror): normal cards
    // carry the Schemastery object as .schema; wrapped cards (h3)
    // project .schemaCarrier. schemaNames = the knob surface.
    // Schemastery schemas are CALLABLE (def types .schema as a
    // function) — typeof is 'function', not 'object'.
    const carrier: unknown =
      (def as { schemaCarrier?: unknown }).schemaCarrier ?? def.schema;
    // (every real carrier projects .dict — the emitter's contract.)
    const dict: Record<string, unknown> =
      (typeof carrier === "object" || typeof carrier === "function") && carrier !== null
        ? ((carrier as { dict?: unknown }).dict as Record<string, unknown>)
        : /* v8 ignore next */ {};
    const names: string[] = Object.keys(dict);
    // The admits rule (the retired exporter's gathering, inlined —
    // purge S-decls: the exporter is deleted, this projection is the
    // rule's home): admits = class-attr extras (def.admits) ∪ the
    // families' studio writes (trailing-* ride verbatim — the
    // admission gate matches them as prefixes). Schema knobs are
    // NOT admits members — the gate checks knobs separately.
    const seen = new Set<string>();
    const admits: string[] = [];
    const take = (v: unknown): void => {
      if (typeof v === "string" && !seen.has(v)) {
        seen.add(v);
        admits.push(v);
      }
    };
    for (const a of def.admits ?? []) take(a);
    for (const fam of def.boarded) {
      const writes: unknown = facts[fam]?.studio?.writes;
      if (Array.isArray(writes)) for (const w of writes) take(w);
    }
    out[id] = {
      skeleton: def.skeleton,
      boarded: [...def.boarded],
      schemaNames: names,
      admits,
      spells: [...(def.spells ?? [])],
    };
  }
  return out;
}

