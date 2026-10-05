/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 *
 * THE LAYER A/B LAW REWORK (2026-09-17): hydration + serialization
 * speak the CARD's wire names only. Legacy retired spellings migrate
 * through LEGACY_LAYERA_KEY / LEGACY_KNOB_KEY (a legacy lora knob
 * pair maps into the mod bag when its filename matches the family
 * catalog, else drops — it was never read). Serialization writes
 * ONLY keys the compose reads: fps is document-local and
 * never ride the wire.
 */
import type { LayerA } from "./docModel.js";
export declare function hydrateLayerA(rawDoc: Record<string, unknown> | undefined): LayerA;
/** Layer A → the persisted doc shape: ONLY card wire keys, ONLY
 * non-undefined (undefined = absent = the family default rides — the
 * engine default must never be pinned by a control never touched).
 * THE CONTRACT (pinned by the studio-contract wall test): every key
 * here ∈ the h3-timeline card's declared surface and READ by
 * compose. fps is document-local and never serializes. */
export declare function serializeLayerA(a: LayerA): Record<string, unknown>;
//# sourceMappingURL=docHydrate.d.ts.map
