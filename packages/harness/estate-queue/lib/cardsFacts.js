// cardsFacts.ts — the frozen data paths + the decl projection.
// Extracted from cardsRegistry (the god-file cut, 2026-09-18): the
// facts/decl plane owns model-facts.json reads and the pure
// defs+facts->rows derivation. No Service state — module truth.
import { join } from "node:path";
import { getModel, resolveRepoRoot, STAGE_RESERVED_PARAMS } from "@melite/comfyui-cordis";
/** The window-family lanes a card's boarded families derive — the
 *  vocabulary an agent confuses for a variant (the transcript's
 *  step-8 burn: variant 't4r' read "unknown variant"). Reads the
 *  DECLs' served familyLaw, never a copy; undefined when no boarded
 *  family declares a law (legacy families get the plain voice).
 *
 * @param boarded the card's boarded family ids.
 * @returns the union of their declared lane ids, or undefined. */
export function familyLanesOf(boarded) {
    const lanes = [];
    for (const fam of boarded ?? []) {
        let law;
        try {
            law = getModel(fam).familyLaw;
        }
        catch {
            continue;
        }
        for (const row of law?.lanes ?? [])
            if (!lanes.includes(row.lane))
                lanes.push(row.lane);
    }
    return lanes.length > 0 ? lanes : undefined;
}
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
/** THE SHARED ADMISSION PREDICATE (audit J-E2): knobs ∪ absorbed
 *  mod fields ∪ contract admits (a `prefix*` admit row admits every
 *  key under the prefix). ONE surface for the admission seats —
 *  compose's admission gate, start's params-override door, and the
 *  variant stamp gate (audit Y-S2) — or the seats disagree about
 *  what a card admits. Lives on the leaf: every consumer already
 *  imports these row types, no seat-to-seat cycle. */
export function cardAdmits(decl, modNames, key) {
    if (decl === undefined)
        return false;
    return (decl.schemaNames.includes(key) ||
        modNames.has(key) ||
        decl.admits.some((a) => a === key || (a.endsWith("*") && key.startsWith(a.slice(0, -1)))));
}
/** THE STAGE-RESERVED LIFT PREDICATE (the F41 re-press finding,
 * 2026-11-14): a key in the merge plane's STAGE_RESERVED_PARAMS that
 * the card's own DECLARATION does not admit is STAGE POLICY, not a
 * card param — it lives on the stage row (planMerge's
 * paramsByStage), never on the card surface, so card admission
 * judges it NOWHERE. Both reserved-key seats ride this one
 * spelling: the run compose's carry (runsRegistry.ts THE
 * STAGE-RESERVED CARRY, whose declared-key sparing this mirrors) and
 * the write door's admission (cardsRegistry.admitStageRelations) —
 * before this predicate the knob could be COMPOSED but never
 * AUTHORED (the live trellis re-press died at every bench write door
 * with the unknown-param refusal while the validate walk admitted
 * the same row). A declared reserved key (h3's carrier-declared
 * output_name) is the card's own param: it does NOT lift, and the
 * admission walk keeps judging it.
 * @param decl the card's DECL projection — undefined lifts (no card
 *  admits a policy key by default; cardAdmits's own undefined law).
 * @param key the params key being judged.
 * @returns true when the key is stage policy that admission lifts
 *  out of the card walk. */
export function stageReservedKeyLifts(decl, key) {
    return STAGE_RESERVED_PARAMS.includes(key) && !cardAdmits(decl, new Set(), key);
}
/** THE JUDGED COPY a compose/admission seat hands its card walk when
 * the row carries stage-reserved policy keys (stageReservedKeyLifts
 * above): the reserved set lifts OUT, everything else rides verbatim.
 * The stored row is NEVER this copy's business — the store is its
 * own truth home; only the judged view sheds the policy keys. The
 * seats: the write door's admission (cardsRegistry
 * admitStageRelations) and the validate walk's phase1Card call
 * (runsValidateArms — the pre-mint compose gate's dry walk, the
 * bench add door's second judge). The run compose's own carry
 * (runsRegistry composeCardStageRow) splits its bags on the same
 * predicate.
 * @param decl the card's DECL projection (undefined lifts all
 *  reserved keys — no card admits a policy key by default).
 * @param params the row's params bag.
 * @returns the judged copy (never the caller's record). */
export function liftStageReservedForAdmission(decl, params) {
    const judged = { ...params };
    for (const k of Object.keys(judged)) {
        if (stageReservedKeyLifts(decl, k))
            delete judged[k];
    }
    return judged;
}
//# sourceMappingURL=cardsFacts.js.map
