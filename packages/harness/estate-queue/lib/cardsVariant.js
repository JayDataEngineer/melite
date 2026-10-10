import { samplerEnvelopeCure } from "@melite/contracts/laneRelations";
import { EnvelopeRefusal, phaseRefusal } from "./cardsArmError.js";
import { judgeSamplerEnvelope, unknownQuantVoice, unknownVariantVoice } from "@melite/contracts/laneRelations";
import { CARD_ENVELOPE_KEYS } from "./cardsRegistry.js";
/** Normalize a facts variant's sampler_envelope declaration (the
 *  DECL authors it as {steps?: [min,max], cfg?: [min,max]}); junk
 *  shapes contribute nothing (never a crash). */
function normalizeEnvelope(raw) {
    if (raw === null || typeof raw !== "object")
        return null;
    const r = raw;
    const bound = (v) => {
        if (!Array.isArray(v) || v.length !== 2)
            return undefined;
        const [a, b] = v;
        return typeof a === "number" && typeof b === "number" && b >= a ? [a, b] : undefined;
    };
    const steps = bound(r.steps);
    const cfg = bound(r.cfg);
    return steps === undefined && cfg === undefined ? null : { steps, cfg };
}
function knownVariantIds(row) {
    return (row.variants ?? []).map((v) => v.id);
}
/** Select the matrix cell (R1 wire contract): explicit body
 *  variant/quant keys win when stated (matched against facts
 *  variant id/route + cell quant); unstated coordinates fall to
 *  the FIRST non-Recipe variant / first cell (Model.resolve —
 *  the family default). Unknown coordinates refuse LOUD (never a
 *  silent neighbor cell). */
export function selectCardVariant(mid, famRow, body, phase) {
    const variants = famRow.variants ?? [];
    const offered = variants.filter((v) => v.hide_from_dropdown !== true);
    const hiddenRoute = variants.find((v) => v.hide_from_dropdown === true && (v.route === mid || v.id === mid || (v.cells ?? []).some((c) => c.route === mid)));
    const hiddenCellRoute = variants.some((v) => (v.cells ?? []).some((c) => c.hide_from_dropdown === true && c.route === mid));
    if (hiddenRoute !== undefined || hiddenCellRoute) {
        throw phaseRefusal(phase, "model " + JSON.stringify(mid) +
            " is not offered (the variant route is hidden from the dropdown)");
    }
    const configured = offered.filter((v) => v.group !== "Recipe");
    const pool = configured.length > 0 ? configured : offered;
    if (pool.length === 0 && variants.length > 0) {
        throw phaseRefusal(phase, "model " + JSON.stringify(mid) + " has no offered variants");
    }
    const rawVariant = body["variant"];
    const rawQuant = body["quant"];
    let variant;
    if (rawVariant === undefined || rawVariant === null) {
        variant = pool[0];
    }
    else {
        if (typeof rawVariant !== "string") {
            throw phaseRefusal(phase, "variant must be a string (got " +
                (Array.isArray(rawVariant) ? "list" : typeof rawVariant) + ")");
        }
        const requested = variants.find((v) => v.id === rawVariant || v.route === rawVariant);
        if (requested?.hide_from_dropdown === true) {
            throw phaseRefusal(phase, "variant " + JSON.stringify(rawVariant) +
                " is not offered for model " + JSON.stringify(mid));
        }
        variant = offered.find((v) => v.id === rawVariant || v.route === rawVariant);
        if (variant === undefined) {
            throw phaseRefusal(phase, unknownVariantVoice(rawVariant, mid, knownVariantIds(famRow)));
        }
    }
    let quant = "";
    if (rawQuant !== undefined && rawQuant !== null) {
        if (typeof rawQuant !== "string") {
            throw phaseRefusal(phase, "quant must be a string (got " +
                (Array.isArray(rawQuant) ? "list" : typeof rawQuant) + ")");
        }
        const cells = variant !== undefined
            ? (variant.cells ?? []).filter((c) => c.hide_from_dropdown !== true)
            : [];
        const hit = cells.find((c) => c.quant === rawQuant);
        if (hit === undefined) {
            throw phaseRefusal(phase, unknownQuantVoice(rawQuant, mid, variant !== undefined ? variant.id : "", cells.map((c) => c.quant)));
        }
        quant = hit.quant;
    }
    else if (variant !== undefined) {
        const cells = (variant.cells ?? []).filter((c) => c.hide_from_dropdown !== true);
        if (cells.length > 0)
            quant = String(cells[0]?.quant ?? "");
    }
    return {
        variantId: variant !== undefined ? variant.id : "",
        variantRoute: variant !== undefined ? String(variant.route ?? "") : "",
        quant,
        resolverDefaults: variant !== undefined ? { ...(variant.resolver_defaults ?? {}) } : {},
        samplerEnvelope: variant !== undefined
            ? normalizeEnvelope(variant.sampler_envelope)
            : null,
    };
}
/** The route-lens stamp overlay (_route_stamp_overlay 705-751):
 *  family defaults + the selected variant's resolver_defaults,
 *  injected ONLY for absent keys, filtered to the owning card's
 *  field surface (schema keys + admits, exact or trailing-*
 *  prefix). None/"" stamps never ride (UNSET markers — riding
 *  them would refuse the str fields the row leaves open).
 *  variant/quant contract keys are CONSUMED (never ride compose —
 *  no card declares them). Returns the STAMPED body (a copy). */
/** THE ROUTE ENVELOPE gate (the skill-system rework wave 2,
 *  2026-09-21): a caller-STATED steps/cfg outside the selected
 *  variant's closed envelope refuses LOUD at the stamp gate — the
 *  distilled-lane marriage (turbo's 8-step/cfg-1) is declared, not
 *  negotiated. Inside the envelope is caller agency; an unstated
 *  knob never refuses (the rail's stamps own it); a variant with no
 *  envelope declares nothing (opt-in per route). */
function envelopeRefusal(body, sel, phase) {
    // THE ONE JUDGE (the voice audit, 2026-10-11): the body composes
    // in @melite/contracts beside the lane judges; the door adds what
    // its seat knows — the phase-consistent frame, the marriage
    // clause, the lane-read tail.
    const off = judgeSamplerEnvelope(body, sel.samplerEnvelope, {
        id: sel.variantId,
        route: sel.variantRoute,
    });
    if (off === null)
        return;
    const married = sel.resolverDefaults[off.knob] ?? "";
    throw new EnvelopeRefusal(400, "card_compose phase " + phase + ": " + off.voice +
        (married !== "" ? " and the lane is married to " + off.knob + " " + String(married) : "") +
        ". " + samplerEnvelopeCure() +
        " (Read the family lane: melite_skill_read model:<family>.)", "card_compose");
}
export function stampCardOverlay(body, famRow, decl, sel, phase) {
    envelopeRefusal(body, sel, phase);
    const stamps = { ...(famRow.defaults ?? {}) };
    for (const [k, v] of Object.entries(sel.resolverDefaults))
        stamps[k] = v;
    const names = new Set(decl.schemaNames);
    const admits = decl.admits;
    const onSurface = (k) => {
        if (names.has(k))
            return true;
        return admits.some((a) => a === k || (a.endsWith("*") && k.startsWith(a.slice(0, -1))));
    };
    const out = { ...body };
    for (const [k, v] of Object.entries(stamps)) {
        if (v === null || v === undefined || v === "")
            continue;
        if (!onSurface(k))
            continue;
        if (k in out)
            continue;
        if (CARD_ENVELOPE_KEYS.includes(k))
            continue;
        out[k] = v;
    }
    return out;
}
/** The card-compose lift (card_compose_body 363-372): the run body
 *  minus the gateway envelope, restaged as the ONE params stanza.
 *  variant/quant ride the R1 contract (consumed at selection, never
 *  params — no card declares knobs by those names). */
export function liftCardParams(body) {
    const params = {};
    for (const [k, v] of Object.entries(body)) {
        if (CARD_ENVELOPE_KEYS.includes(k))
            continue;
        if (k === "variant" || k === "quant")
            continue;
        // THE STAZZA UNWRAP, ONE SPELLING (2026-10-10, the audit's
        // BROKEN-B follow-on): the run body's `params` dict IS the stanza
        // (liftStanza merges it over its siblings at compose), so the
        // lane's view must unwrap it the same way — it did not, and a
        // `{model, params:{…}}` body reached the undeclared-key gate
        // still carrying a `params` key. Two lifts of one shape is how
        // the bench and the compose disagreed about what a card sees.
        if (k === "params" && typeof v === "object" && v !== null && !Array.isArray(v)) {
            // SIBLINGS WIN — the stanza fills what they leave out
            // (2026-10-10, the work audit's R3: this unwrap wrote the stanza
            // LAST, so `{text: "sibling", params: {text: "inner"}}` resolved
            // by key ORDER — the inner text won on one lift and the sibling
            // on the other. liftStanza is explicit that siblings override the
            // stanza; the "ONE SPELLING" claim is only true once this
            // matches it.)
            for (const [ik, iv] of Object.entries(v)) {
                if (!(ik in params))
                    params[ik] = iv;
            }
            continue;
        }
        params[k] = v;
    }
    return params;
}
//# sourceMappingURL=cardsVariant.js.map