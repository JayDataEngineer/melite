// capabilityCards — the ONE capability→card derivation path.
//
// A capability tile (Generate / Edit / Upscale / ...) resolves to a card
// descriptor: the backend-precomputed default model route + merged params
// (capabilities.<id>.resolved). This module is the single implementation —
// the ServicePicker dialog AND the Library's right sidebar (LibrarySidebar)
// both derive their "what lands on the canvas" from these helpers, so a
// catalog or schema change cannot make the two surfaces drift.
//
// Seeding rules (2026-08-07, #73 regression):
//   • an empty prompt is seeded ONLY when the model's form actually serves
//     a prompt field (prompt_in_form — backend-computed from the builder
//     schema); a prompt-less card (upscale) must never carry one
//   • a null input slot is seeded when the model's schema has an input
//     (the card modal renders the attach control for it)
import { familyGenre, narrowGenre } from "@melite/catalog";
/**
 * Seed params for a route: the backend-computed defaults + an empty prompt
 * ONLY when the model's form actually serves a prompt field
 * (prompt_in_form — backend-computed from the builder schema) + a null
 * seed for EVERY input slot the model declares (input_slots — multi-slot
 * forms like edit's three images / video's two frames get one null per
 * slot, so the card renders all its squares from the start). Unknown
 * prompt_in_form → seed (old behavior).
 */
export function seededParams(cat, route, base = {}) {
    const model = cat?.models[route];
    const slots = model?.input_slots?.length
        ? model.input_slots
        : (model?.input ? [model.input] : []);
    const hasPrompt = model?.prompt_in_form ?? true; // unknown → seed (old behavior)
    return {
        ...base,
        ...(hasPrompt ? { prompt: "" } : {}),
        ...(slots.length ? Object.fromEntries(slots.map((k) => [k, null])) : {}),
    };
}
/**
 * Resolve a capability tile (+ optional route override) to a card. The
 * default tile click uses cap.resolved; the tile's model switcher passes a
 * different CapabilityRoute — same capability intent, model switched
 * underneath. The route's params are backend-precomputed (capability
 * default_params as fallback, model's own defaults winning), so switching
 * the model correctly swaps the per-model recipe (steps / cfg / sampler).
 */
export function capabilityToCard(cat, cap, route) {
    // Model-less capabilities (kind:"input") carry their params VERBATIM — no
    // prompt/slot seeding. Those are generation-form concerns (prompt_in_form,
    // input_slots); input's editor is the fixed-field InputCardEditor, which
    // owns crop/scale/trim/volume/mask. Seeding a prompt here would give the
    // input card a field its family rejects at run time (the 2026-08-07
    // regression, generalized). The kind rides through to PickedCard so the
    // canvas routes the stage through executeInput, not executeGeneration.
    const isModelLess = cap.kind !== undefined && cap.kind !== "generation";
    return {
        service: route.model,
        title: cap.label,
        genre: genreForRoute(cat, route.model),
        params: isModelLess ? { ...route.params } : seededParams(cat, route.model, route.params),
        ...(isModelLess ? { kind: cap.kind } : {}),
    };
}
/** Resolve a specific family entry (the "All models" list) to a card. */
export function familyEntryToCard(cat, familyId, fam) {
    // Route resolution — the SAME chain the backend's capability resolver
    // and familiesForForm use: the catalog-declared ``default_model`` (when
    // it is a member), else the member whose key equals the family id, else
    // the FIRST member. NEVER the bare familyId: mask_studio's family id
    // and model key differ (mask_studio vs mask-studio), and a family-id
    // service is a PHANTOM ROUTE — no models[] entry, no familyGenre, and
    // no studio registry match (the "mask studio does not appear" bug,
    // 2026-08-16: the add-card picker minted service "mask_studio" and the
    // card zoomed as a plain form card). The catalog now declares
    // default_model for every id-divergent family; this chain is the
    // backstop for the next one.
    const declared = fam.default_model;
    const members = Object.entries(cat?.models ?? {})
        .filter(([, m]) => m.family === familyId)
        .map(([k]) => k);
    const route = (declared && members.includes(declared) ? declared : undefined) ??
        members.find((k) => k === familyId) ??
        members[0] ??
        familyId;
    return {
        service: route,
        title: fam.label ?? familyId,
        genre: narrowGenre(fam.genre) ?? genreForRoute(cat, route),
        params: seededParams(cat, route, cat?.models[route]?.defaults ?? {}),
    };
}
/** Genre for a model route — the catalog's familyGenre derivation. */
function genreForRoute(cat, route) {
    return cat ? familyGenre(route, cat) : undefined;
}
// ── Sidebar → card drag (2026-08-08) ──────────────────────────────────────
// A capability tile in the LibrarySidebar is DRAGGABLE onto a card in the
// canvas — "clicking and dragging from the right sidebar onto the middle
// part should populate the card". The drop REPURPOSES the target card: its
// service + params + title become the dragged capability's resolved card
// (the same shape a click would `addStage`, applied to an EXISTING stage).
//
// The MIME is deliberately distinct from `application/tech-noir-asset`
// (AppSidebar's asset drag) so a card's drop handler can tell "populate
// this card's identity" (capability) from "attach an asset to a slot"
// (asset) — one drop target, two contracts, no ambiguity.
export const CAPABILITY_DRAG_MIME = "application/tech-noir-capability";
/** Serialize a picked card onto the drag data store. */
export function capabilityDragPayload(capId, card) {
    return JSON.stringify({ ...card, capId });
}
/** Parse the capability MIME off a drop event. null = absent or malformed
 *  (the drop target falls through to the asset/file path). */
export function parseCapabilityDrop(raw) {
    if (!raw)
        return null;
    try {
        const p = JSON.parse(raw);
        if (typeof p.service === "string" && typeof p.title === "string" && p.params && typeof p.params === "object") {
            return p;
        }
        return null;
    }
    catch { /* not our payload — the JSON probe answers absent (row 28) */
        return null;
    }
}
//# sourceMappingURL=capabilityCards.js.map
