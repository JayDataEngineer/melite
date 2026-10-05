import { type CapabilityEntry, type CapabilityRoute, type Catalog, type FamilyEntry } from "@melite/catalog";
import type { CardGenre } from "@melite/contracts";
/** A card ready to land on the canvas (what onPick hands the store).
 *
 *  ``kind`` is optional — capabilities/families always produce
 *  ``"generation"`` (the default), so the existing helpers don't set it
 *  and the canvas defaults to "generation". The Input / Media Prep tile
 *  sets ``kind: "input"`` so the canvas routes the stage through the
 *  doc-driven input family (POST /v1/flows/start, 1-step inline
 *  doc) — NOT the generation wire. This is rule 4: the shape carries
 *  the kind, so pick → addStage never silently misroutes. */
export interface PickedCard {
    service: string;
    title: string;
    genre?: CardGenre;
    params: Record<string, unknown>;
    kind?: string;
}
/**
 * Seed params for a route: the backend-computed defaults + an empty prompt
 * ONLY when the model's form actually serves a prompt field
 * (prompt_in_form — backend-computed from the builder schema) + a null
 * seed for EVERY input slot the model declares (input_slots — multi-slot
 * forms like edit's three images / video's two frames get one null per
 * slot, so the card renders all its squares from the start). Unknown
 * prompt_in_form → seed (old behavior).
 */
export declare function seededParams(cat: Catalog | null, route: string, base?: Record<string, unknown>): Record<string, unknown>;
/**
 * Resolve a capability tile (+ optional route override) to a card. The
 * default tile click uses cap.resolved; the tile's model switcher passes a
 * different CapabilityRoute — same capability intent, model switched
 * underneath. The route's params are backend-precomputed (capability
 * default_params as fallback, model's own defaults winning), so switching
 * the model correctly swaps the per-model recipe (steps / cfg / sampler).
 */
export declare function capabilityToCard(cat: Catalog | null, cap: CapabilityEntry, route: CapabilityRoute): PickedCard;
/** Resolve a specific family entry (the "All models" list) to a card. */
export declare function familyEntryToCard(cat: Catalog | null, familyId: string, fam: FamilyEntry): PickedCard;
export declare const CAPABILITY_DRAG_MIME = "application/tech-noir-capability";
/** What a capability tile writes to the drag data store. Carries the fully
 *  resolved card (service + title + params + kind) so the drop target can
 *  apply it WITHOUT a catalog lookup — the sidebar already paid that cost
 *  via capabilityToCard. ``capId`` is diagnostics-only (not read by the
 *  drop target; useful for e2e traces). */
export type CapabilityDropPayload = PickedCard & {
    capId?: string;
};
/** Serialize a picked card onto the drag data store. */
export declare function capabilityDragPayload(capId: string, card: PickedCard): string;
/** Parse the capability MIME off a drop event. null = absent or malformed
 *  (the drop target falls through to the asset/file path). */
export declare function parseCapabilityDrop(raw: string): CapabilityDropPayload | null;
//# sourceMappingURL=capabilityCards.d.ts.map
