/**
 * Body Studio presets - one-click starting points for common archetypes.
 *
 * These are the LABELED body types surfaced as one-click buttons in the
 * Body Studio tab AND in a body card's drill-down (the "labels for any
 * body type"). Each preset is a full Character (coeffs + localChanges)
 * ready to drop into the editing slice via ``patchEditing(preset)``.
 *
 * Male and female archetypes are SEPARATE presets because they start
 * from different phenotype baselines (gender dimorphism in the Anny
 * model significantly affects jaw width, shoulder breadth, hip ratio,
 * and limb proportions).
 *
 * Anime presets were REMOVED (2026-08-08) when the Body Studio was
 * shrunk to a flow card — the card surface keeps a lean, realist
 * archetype set. The ``customTargets`` FIELD remains on Character so
 * the Style tab can still expose community .target blends for power
 * users, but no shipped preset leans on it.
 */
import type { Character } from "@melite/contracts";
export interface BodyPreset extends Character {
    id: string;
    name: string;
    /** One-line description shown as a tooltip. */
    description: string;
}
export declare const BODY_PRESETS: BodyPreset[];
/**
 * Find a preset by id (returns undefined if not found).
 *
 * Used by tests and any future "load preset by URL hash" affordances.
 */
export declare function getPresetById(id: string): BodyPreset | undefined;
/**
 * Default preset (the one applied to the very first Body Studio mount).
 * Returns null so we DON'T clobber the user's saved edits on subsequent
 * loads - the default is the un-morphed Anny.
 */
export declare const DEFAULT_PRESET_ID: string | null;
//# sourceMappingURL=bodyPresets.d.ts.map
