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
 * shrunk to a pipeline card — the card surface keeps a lean, realist
 * archetype set. The ``customTargets`` FIELD remains on Character so
 * the Style tab can still expose community .target blends for power
 * users, but no shipped preset leans on it.
 */
import type { Character } from "@melite/contracts"

export interface BodyPreset extends Character {
  id: string
  name: string
  /** One-line description shown as a tooltip. */
  description: string
}

// Anny's 11 phenotype dims in order:
//   [gender, age, muscle, weight, height, proportions, cupsize, firmness,
//    african, asian, caucasian]
// gender: 0.0 = masculine, 1.0 = feminine (verified against the live mesh:
// gender=0 widens jaw and shoulders; gender=1 narrows them and widens hips).
// age/muscle/weight: 0.5 = average adult. height/proportions: 0.5 = standard.
// race dims are left at neutral 0.5 so race-specific features stay default.
const NEUTRAL_RACE = [0.5, 0.5, 0.5]  // african, asian, caucasian

/**
 * Neutral - reset to the Anny default with no stylization.
 *
 * Provides a quick "back to neutral" affordance in the preset bar without
 * the user having to hit the Reset button. Coeffs all 0.5 = Anny's neutral
 * adult, no local changes, no custom target blends.
 */
const NEUTRAL: BodyPreset = {
  id: "neutral",
  name: "Neutral",
  description: "Default Anny - no stylization, no morphs",
  identityModel: "anny",
  coeffs: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, ...NEUTRAL_RACE],
  localChanges: null,
  customTargets: null,
}

/**
 * Male - basic masculine baseline with no stylization.
 *
 * Gender 0.0 (fully masculine → wider jaw, broader shoulders, narrower
 * hips). Age/muscle/weight tuned to a healthy adult male build. No
 * local_changes — this is a clean starting point the user can sculpt
 * further. Height slightly above average.
 */
const MALE: BodyPreset = {
  id: "male",
  name: "Male",
  description: "Basic masculine baseline - no stylization",
  identityModel: "anny",
  coeffs: [0.0, 0.45, 0.55, 0.50, 0.55, 0.50, 0.40, 0.55, ...NEUTRAL_RACE],
  //          gen  age   mus   wt    ht    prop  cup  firm
  localChanges: null,
  customTargets: null,
}

/**
 * Female - basic feminine baseline with no stylization.
 *
 * Gender 1.0 (fully feminine → narrower jaw, defined waist, wider hips).
 * Age/muscle/weight tuned to a healthy adult female build. No
 * local_changes — clean starting point for further sculpting.
 */
const FEMALE: BodyPreset = {
  id: "female",
  name: "Female",
  description: "Basic feminine baseline - no stylization",
  identityModel: "anny",
  coeffs: [1.0, 0.40, 0.35, 0.38, 0.52, 0.52, 0.45, 0.55, ...NEUTRAL_RACE],
  //          gen  age   mus   wt    ht    prop  cup  firm
  localChanges: null,
  customTargets: null,
}

// Anime F/M - RESTORED 2026-08-27 from git history (482e89c5) after the
// 2026-08-08 removal shrank the studio to a lean realist set. Community
// .target stylization + eye-enlargement topup (hand-tuned, honest caveat
// preserved from the original).
const ANIME_FEMALE: BodyPreset = {
  id: "anime_female",
  name: "Anime F",
  description: "Female anime stylization - feminine baseline + community target",
  identityModel: "anny",
  coeffs: [0.85, 0.40, 0.30, 0.32, 0.60, 0.55, 0.40, 0.55, ...NEUTRAL_RACE],
  localChanges: { "eye-scale-incr": 0.7, "eye-height1-incr": 0.5 },
  customTargets: { anime_stylized_enhanced: 0.6 },
}

const ANIME_MALE: BodyPreset = {
  id: "anime_male",
  name: "Anime M",
  description: "Male anime stylization - masculine baseline + community target",
  identityModel: "anny",
  coeffs: [0.15, 0.40, 0.45, 0.35, 0.62, 0.55, 0.40, 0.55, ...NEUTRAL_RACE],
  localChanges: { "eye-scale-incr": 0.7, "eye-height1-incr": 0.5 },
  customTargets: { anime_stylized_enhanced: 0.6 },
}

export const BODY_PRESETS: BodyPreset[] = [
  NEUTRAL, MALE, FEMALE, ANIME_FEMALE, ANIME_MALE,
]

/**
 * Find a preset by id (returns undefined if not found).
 *
 * Used by tests and any future "load preset by URL hash" affordances.
 */
export function getPresetById(id: string): BodyPreset | undefined {
  return BODY_PRESETS.find((p) => p.id === id)
}

/**
 * Default preset (the one applied to the very first Body Studio mount).
 * Returns null so we DON'T clobber the user's saved edits on subsequent
 * loads - the default is the un-morphed Anny.
 */
export const DEFAULT_PRESET_ID: string | null = null
