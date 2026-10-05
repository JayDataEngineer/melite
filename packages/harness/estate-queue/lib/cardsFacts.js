// cardsFacts.ts — the frozen data paths + the decl projection.
// Extracted from cardsRegistry (the god-file cut, 2026-09-18): the
// facts/decl plane owns model-facts.json reads and the pure
// defs+facts->rows derivation. No Service state — module truth.
import { join } from "node:path";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
export function factsPath() {
    // Merged 2026-09-08 (reversed: the models plane folds into the
    // cordis package): the compose plane lives in
    // packages/engines/comfyui-cordis/src, its card-owned fact slices
    // in packages/engines/comfyui-cordis/data (Decl x Facts
    // unification — loadFacts derives model-owned rows from the
    // registry at load).
    return join(resolveRepoRoot(), "packages", "engines", "comfyui-cordis", "data", "model-facts.json");
}
// ── the decl projection (pure: defs + facts in, rows out) ─────────
// (Was loadCardDecls' body; the cache it fed is service state now.)
export function deriveDecls(defs, facts) {
    const out = {};
    for (const [id, def] of defs) {
        // The emitter's carrier line (toolsEmit.ts mirror): normal cards
        // carry the Schemastery object as .schema; wrapped cards (h3)
        // project .schemaCarrier. schemaNames = the knob surface.
        // Schemastery schemas are CALLABLE (def types .schema as a
        // function) — typeof is 'function', not 'object'.
        const carrier = def.schemaCarrier ?? def.schema;
        // (every real carrier projects .dict — the emitter's contract.)
        const dict = (typeof carrier === "object" || typeof carrier === "function") && carrier !== null
            ? carrier.dict
            : /* v8 ignore next */ {};
        const names = Object.keys(dict);
        // The admits rule (the retired exporter's gathering, inlined —
        // purge S-decls: the exporter is deleted, this projection is the
        // rule's home): admits = class-attr extras (def.admits) ∪ the
        // families' studio writes (trailing-* ride verbatim — the
        // admission gate matches them as prefixes). Schema knobs are
        // NOT admits members — the gate checks knobs separately.
        const seen = new Set();
        const admits = [];
        const take = (v) => {
            if (typeof v === "string" && !seen.has(v)) {
                seen.add(v);
                admits.push(v);
            }
        };
        for (const a of def.admits ?? [])
            take(a);
        for (const fam of def.boarded) {
            const writes = facts[fam]?.studio?.writes;
            if (Array.isArray(writes))
                for (const w of writes)
                    take(w);
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
//# sourceMappingURL=cardsFacts.js.map
